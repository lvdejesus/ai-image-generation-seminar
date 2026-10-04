"""Generate the recorded images for the seminar site through ComfyUI.

    python3 tools/assets.py            # everything
    python3 tools/assets.py portrait   # one group

Needs ComfyUI running on localhost:8188 with the Anima models, and ffmpeg.
Images are written as WebP into site/public/assets/.
"""

import json
import pathlib
import subprocess
import sys
import tempfile

from comfy import QUALITY, Graph, anima, conditioning, preview, request, rollout, run, sample, sigma, true_state, upload_image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "site" / "public" / "assets"
SIZE = 512
STEPS = 30
CFG = 4.0

# The portrait rollouts use no prompt at all: Section II of the talk has
# not introduced text yet. (The negative prompt stays, and it matters: with
# only the quality tags as prompt, the same rollouts drift to unpresentable
# images.)
PORTRAIT_PROMPT = ""
# Steps of the 30-step schedule (0 is pure noise, 30 is clean) at which the
# noised portrait is recorded for the strip, least noisy first.
NOISED_AT = [26, 21, 16, 10, 3]
# The step the rollouts start from: noisy enough that the identity is lost,
# clean enough that the pose and the room survive. It is one of NOISED_AT.
HEAVY = 16
# Steps at which the way back is recorded.
BACK_AT = [18, 20, 22, 24, 27]
# A much noisier starting point, also one of NOISED_AT, for the two-model
# comparison: from here the anime model returns anime characters.
FAR = 10
NOISE_SEED = 7
CANDIDATE_SEEDS = [11, 22, 33, 44]
# Steps at which the three-prompt runs are recorded.
THREE_AT = [10, 16, 20, 23, 26]

RUN_PROMPT = f"{QUALITY}, 1girl, short blue hair, yellow raincoat, holding umbrella, rainy city street at night, neon lights, upper body, looking at viewer"
THREE_PROMPTS = {
    "lighthouse": f"{QUALITY}, no humans, scenery, a lighthouse on a cliff at sunset, ocean, orange sky, clouds",
    "cat": f"{QUALITY}, no humans, a fluffy white cat sitting on a windowsill, potted plant, sunlight",
    "girl": f"{QUALITY}, 1girl, long black hair, red scarf, winter coat, snow, looking at viewer, upper body, smile",
}
FALLBACK_PROMPT = f"{QUALITY}, no humans, a cat wearing a wizard hat, reading a book, library, candlelight"


def save(png, path):
    """Write PNG bytes as a WebP file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        tmp.write(png)
        tmp.flush()
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp.name, "-quality", "84", str(path)], check=True)
    print("wrote", path.relative_to(ROOT))


def execute(graph, outputs):
    """Run a graph and save each {relative path: node id} output."""
    images = run(graph.nodes)
    for path, node in outputs.items():
        save(images[node][0], ASSETS / path)


def portrait():
    """Real rollouts from the portrait: noise it, then let the model take it back.

    Everything shown is an actual model state, decoded: the noised portrait
    at several levels, several results sampled from one of those states, the
    model's single-step guess from it, and the states along one way back.
    """
    name = upload_image(ASSETS / "portrait.jpg", "seminar_portrait.jpg")
    g = Graph()
    model, clip, vae = anima(g)
    positive, negative = conditioning(g, clip, PORTRAIT_PROMPT)
    image = g.out(g.add("LoadImage", image=name))
    image = g.out(g.add("ImageScale", image=image, upscale_method="lanczos", width=SIZE, height=SIZE, crop="disabled"))
    source = g.out(g.add("VAEEncode", pixels=image, vae=vae))
    outputs = {}

    # The forward process: the model's own noisy input at each level.
    schedule = g.out(g.add("BasicScheduler", model=model, scheduler="simple", steps=STEPS, denoise=1.0))
    noise = g.out(g.add("RandomNoise", noise_seed=NOISE_SEED))
    for i, step in enumerate(NOISED_AT):
        rest = g.out(g.add("SplitSigmas", sigmas=schedule, step=step), 1)
        noised = g.out(g.add("AddNoise", model=model, noise=noise, sigmas=rest, latent_image=source))
        outputs[f"noised/{i}.webp"] = preview(g, vae, noised)

    def step(latent, start, end, **options):
        return sample(g, model, positive, negative, latent, seed=NOISE_SEED, steps=STEPS, cfg=CFG, start=start, end=end, **options)

    # From only a little noise, the model gives back nearly the original.
    outputs["near.webp"] = preview(g, vae, step(source, NOISED_AT[0], None))

    # One big guess: a single step from the noisy state straight to a clean image.
    outputs["guess.webp"] = preview(g, vae, step(source, HEAVY, HEAVY + 1))

    # Several results from that one noisy state. After a first shared step,
    # an ancestral sampler adds fresh randomness, so each seed goes its own way.
    state = step(source, HEAVY, HEAVY + 1, leftover=True)
    for i, seed in enumerate(CANDIDATE_SEEDS[1:], start=1):
        result = sample(g, model, positive, negative, state, seed=seed, steps=STEPS, cfg=CFG, start=HEAVY + 1, add_noise=False, sampler="euler_ancestral")
        outputs[f"cand/{i}.webp"] = preview(g, vae, result)

    # The first result again, stopping along the way to record the real state.
    zero = g.out(g.add("AddNoise", model=model, noise=g.out(g.add("DisableNoise")), sigmas=schedule, latent_image=source))
    position = HEAVY + 1
    for i, stop in enumerate(BACK_AT):
        # Each segment needs its own seed: reusing one would add the same
        # "random" noise again and again, and the run would never clean up.
        state = sample(g, model, positive, negative, state, seed=CANDIDATE_SEEDS[0] + i, steps=STEPS, cfg=CFG, start=position, end=stop,
                       add_noise=False, leftover=True, sampler="euler_ancestral")
        outputs[f"back/{i}.webp"] = preview(g, vae, true_state(g, state, zero, sigma(stop, STEPS)))
        position = stop
    final = sample(g, model, positive, negative, state, seed=CANDIDATE_SEEDS[0] + len(BACK_AT), steps=STEPS, cfg=CFG, start=position, add_noise=False, sampler="euler_ancestral")
    outputs["cand/0.webp"] = preview(g, vae, final)

    # From much more noise, for the two-model comparison.
    outputs["far/anime.webp"] = preview(g, vae, step(source, FAR, None))
    execute(g, outputs)


def record(g, vae, outputs, path):
    """An `emit` for `rollout` that saves each state as path(0), path(1), ..."""
    count = iter(range(1000))
    return lambda latent: outputs.__setitem__(path(next(count)), preview(g, vae, latent))


def denoise_run():
    """A full text-to-image run: the real state at the start and after every step."""
    g = Graph()
    model, clip, vae = anima(g)
    positive, negative = conditioning(g, clip, RUN_PROMPT)
    outputs = {}
    rollout(g, model, positive, negative, vae, record(g, vae, outputs, lambda i: f"run/{i:02d}.webp"), seed=2024, steps=STEPS, cfg=CFG, stops=range(1, STEPS))
    execute(g, outputs)


def three():
    """The same starting noise taken to three different prompts, with the states along the way."""
    g = Graph()
    model, clip, vae = anima(g)
    outputs = {}
    for name, prompt in THREE_PROMPTS.items():
        positive, negative = conditioning(g, clip, prompt)
        rollout(g, model, positive, negative, vae, record(g, vae, outputs, lambda i, name=name: f"three/{name}/{i}.webp"), seed=99, steps=STEPS, cfg=CFG, stops=THREE_AT)
    execute(g, outputs)


def fallback():
    """The live demo's workflow, recorded: 8 turbo steps."""
    g = Graph()
    model, clip, vae = anima(g, turbo=True)
    positive, negative = conditioning(g, clip, FALLBACK_PROMPT)
    outputs = {}
    rollout(g, model, positive, negative, vae, record(g, vae, outputs, lambda i: f"fallback/{i}.webp"), seed=5, steps=8, cfg=1.0, stops=range(1, 8))
    execute(g, outputs)


def photo():
    """The heavily noised portrait through a photo-trained model (FLUX.2 klein), for comparison."""
    name = upload_image(ASSETS / "portrait.jpg", "seminar_portrait.jpg")
    g = Graph()
    model = g.out(g.add("UNETLoader", unet_name="flux-2-klein-9b-int8-convrot.safetensors", weight_dtype="default"))
    clip = g.out(g.add("CLIPLoader", clip_name="qwen_3_8b_int8_convrot.safetensors", type="flux2", device="default"))
    vae = g.out(g.add("VAELoader", vae_name="flux2-vae.safetensors"))
    positive = g.out(g.add("CLIPTextEncode", clip=clip, text=PORTRAIT_PROMPT))
    negative = g.out(g.add("ConditioningZeroOut", conditioning=positive))
    image = g.out(g.add("LoadImage", image=name))
    image = g.out(g.add("ImageScale", image=image, upscale_method="lanczos", width=SIZE, height=SIZE, crop="disabled"))
    source = g.out(g.add("VAEEncode", pixels=image, vae=vae))
    # klein is a few-step model: 6 steps, entering after the first, which
    # is about as noisy as FAR is for Anima.
    latent = sample(g, model, positive, negative, source, seed=7, steps=6, cfg=1.0, start=1)
    outputs = {"far/photo.webp": preview(g, vae, latent)}
    execute(g, outputs)


# Photographs to cut out for the collage in beat 2, with the part of each
# mask to discard as (x, y, width, height) fractions of the picture.
CUTOUTS = {
    0: (0, 0, 0.38, 1),  # lighthouse: drop the signpost on the left
    6: (0, 0.6, 1, 0.4),  # cliff: drop the boats and water below it
    8: (0, 0, 0.1, 0.16),  # sea and rocks: drop a sliver of sky in the corner
}


def cutouts():
    """Cut the subject out of some of the photographs with the RMBG node."""
    for index, discard in CUTOUTS.items():
        source = ASSETS / "found" / f"{index}.webp"
        # The node allocates outside ComfyUI's memory manager, so make room first.
        request("/free", json.dumps({"unload_models": True, "free_memory": True}).encode(), {"Content-Type": "application/json"})
        g = Graph()
        image = g.out(g.add("LoadImage", image=upload_image(source, f"seminar_found_{index}.webp")))
        removed = g.add("RMBG", image=image, model="RMBG-2.0", sensitivity=1.0, process_res=1024, mask_blur=0, mask_offset=0,
                        invert_output=False, refine_foreground=False, background="Alpha", background_color="#000000")
        node = g.add("PreviewImage", images=g.out(removed, 2))
        mask = run(g.nodes)[node][0]

        # The mask becomes the alpha channel of the original photograph.
        blank = ""
        if discard:
            x, y, w, h = discard
            blank = f",drawbox=x=iw*{x}:y=ih*{y}:w=iw*{w}:h=ih*{h}:color=black:t=fill"
        path = ASSETS / "cut" / f"{index}.webp"
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
            tmp.write(mask)
            tmp.flush()
            merge = f"[1:v]format=gray{blank}[m];[0:v][m]alphamerge"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-i", tmp.name, "-filter_complex", merge, "-quality", "88", str(path)], check=True)
        print("wrote", path.relative_to(ROOT))


GROUPS = {"portrait": portrait, "run": denoise_run, "three": three, "fallback": fallback, "photo": photo, "cutouts": cutouts}

if __name__ == "__main__":
    for group in sys.argv[1:] or GROUPS:
        GROUPS[group]()
