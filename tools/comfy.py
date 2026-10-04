"""Minimal ComfyUI API client and the Anima workflow graphs used by the seminar.

Standard library only, so the asset scripts and the live proxy can share it.
"""

import json
import time
import urllib.parse
import urllib.request
import uuid

HOST = "http://127.0.0.1:8188"

UNET = "anima-base-v1.0.safetensors"
TEXT_ENCODER = "qwen_3_06b_base.safetensors"
VAE = "qwen_image_vae.safetensors"
TURBO_LORA = "anima-turbo-lora.safetensors"

# Quality tags the model was trained with; "safe" is its rating tag.
QUALITY = "masterpiece, best quality, score_9, highres, safe"
NEGATIVE = "worst quality, low quality, bad quality, lowres, blurry, text, logo, signature, watermark, nsfw"


def request(path, data=None, headers=None):
    req = urllib.request.Request(HOST + path, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=600) as response:
        return response.read()


def upload_image(path, name):
    """Upload a local image into ComfyUI's input folder under `name`."""
    boundary = uuid.uuid4().hex
    with open(path, "rb") as f:
        content = f.read()
    body = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + content + (
        f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{boundary}--\r\n'
    ).encode()
    reply = request("/upload/image", body, {"Content-Type": f"multipart/form-data; boundary={boundary}"})
    return json.loads(reply)["name"]


def run(graph, client_id=None):
    """Queue a graph, wait for it, and return {node_id: [image bytes, ...]}."""
    payload = {"prompt": graph, "client_id": client_id or uuid.uuid4().hex}
    reply = json.loads(request("/prompt", json.dumps(payload).encode(), {"Content-Type": "application/json"}))
    prompt_id = reply["prompt_id"]
    while True:
        history = json.loads(request(f"/history/{prompt_id}"))
        if prompt_id in history:
            entry = history[prompt_id]
            break
        time.sleep(0.5)
    status = entry.get("status", {})
    if status.get("status_str") != "success":
        raise RuntimeError(f"ComfyUI job failed: {json.dumps(status)[:2000]}")
    images = {}
    for node_id, output in entry["outputs"].items():
        images[node_id] = [request("/view?" + urllib.parse.urlencode(image)) for image in output.get("images", [])]
    return images


class Graph:
    """Builds a ComfyUI API graph one node at a time."""

    def __init__(self):
        self.nodes = {}

    def add(self, class_type, **inputs):
        node_id = str(len(self.nodes) + 1)
        self.nodes[node_id] = {"class_type": class_type, "inputs": inputs}
        return node_id

    def out(self, node_id, index=0):
        return [node_id, index]


def anima(graph, turbo=False):
    """Add the Anima loaders; returns (model, clip, vae) outputs."""
    model = graph.out(graph.add("UNETLoader", unet_name=UNET, weight_dtype="default"))
    if turbo:
        model = graph.out(graph.add("LoraLoaderModelOnly", model=model, lora_name=TURBO_LORA, strength_model=1.0))
    clip = graph.out(graph.add("CLIPLoader", clip_name=TEXT_ENCODER, type="qwen_image", device="default"))
    vae = graph.out(graph.add("VAELoader", vae_name=VAE))
    return model, clip, vae


def conditioning(graph, clip, prompt, negative=NEGATIVE):
    positive = graph.out(graph.add("CLIPTextEncode", clip=clip, text=prompt))
    negative = graph.out(graph.add("CLIPTextEncode", clip=clip, text=negative))
    return positive, negative


def sample(graph, model, positive, negative, latent, *, seed, steps, cfg, start=0, end=None, add_noise=True, leftover=False, sampler="euler"):
    """One KSamplerAdvanced over steps [start, end) of a `steps`-long schedule."""
    return graph.out(
        graph.add(
            "KSamplerAdvanced",
            model=model,
            positive=positive,
            negative=negative,
            latent_image=latent,
            add_noise="enable" if add_noise else "disable",
            noise_seed=seed,
            steps=steps,
            cfg=cfg,
            sampler_name=sampler,
            scheduler="simple",
            start_at_step=start,
            end_at_step=steps if end is None else end,
            return_with_leftover_noise="enable" if leftover else "disable",
        )
    )


def preview(graph, vae, latent):
    """Decode a latent and return the id of the node whose images come back."""
    image = graph.out(graph.add("VAEDecode", samples=latent, vae=vae))
    return graph.add("PreviewImage", images=image)


def sigma(step, steps, shift=3.0):
    """Noise level at a step of ComfyUI's "simple" schedule for Anima: the share of noise in the mix."""
    t = 1 - int(step * 1000 / steps) / 1000
    return shift * t / (1 + (shift - 1) * t)


def empty_latent(graph, size=512):
    """An empty latent in the shape Anima samples in, so noise made for it matches the sampler's."""
    return graph.out(graph.add("EmptyHunyuanLatentVideo", width=size, height=size, length=1, batch_size=1))


def noise_and_zero(graph, model, latent, seed, steps):
    """The pure noise a sampler adds for `seed`, and the latent that stands for "all zeros".

    Both are needed to show real states: the noise is where a run starts, and
    the zero latent is used by `true_state`.
    """
    schedule = graph.out(graph.add("BasicScheduler", model=model, scheduler="simple", steps=steps, denoise=1.0))
    random = graph.out(graph.add("RandomNoise", noise_seed=seed))
    noise = graph.out(graph.add("AddNoise", model=model, noise=random, sigmas=schedule, latent_image=latent))
    none = graph.out(graph.add("DisableNoise"))
    zero = graph.out(graph.add("AddNoise", model=model, noise=none, sigmas=schedule, latent_image=noise))
    return noise, zero


def true_state(graph, state, zero, level):
    """The model's real noisy input at noise level `level`, from a sampler's leftover-noise output.

    A sampler hands its state on divided by (1 - level). This undoes that in
    the model's normalised latent space, where "zero" is not all zeros.
    """
    scaled = graph.out(graph.add("LatentMultiply", samples=state, multiplier=1 - level))
    offset = graph.out(graph.add("LatentMultiply", samples=zero, multiplier=level))
    return graph.out(graph.add("LatentAdd", samples1=scaled, samples2=offset))


def rollout(graph, model, positive, negative, vae, emit, *, seed, steps, cfg, stops):
    """A run from pure noise, emitting the real state at the start, after each step in `stops`, and at the end.

    `emit(latent)` is called once per recorded state, in order.
    """
    empty = empty_latent(graph)
    noise, zero = noise_and_zero(graph, model, empty, seed, steps)
    emit(noise)
    latent, position = empty, 0
    for stop in stops:
        latent = sample(graph, model, positive, negative, latent, seed=seed, steps=steps, cfg=cfg, start=position, end=stop, add_noise=(position == 0), leftover=True)
        emit(true_state(graph, latent, zero, sigma(stop, steps)))
        position = stop
    emit(sample(graph, model, positive, negative, latent, seed=seed, steps=steps, cfg=cfg, start=position, add_noise=(position == 0)))
