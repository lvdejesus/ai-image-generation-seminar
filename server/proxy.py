# /// script
# requires-python = ">=3.11"
# dependencies = ["aiohttp", "pillow"]
# ///
"""Live demo proxy: one websocket endpoint in front of ComfyUI.

    SEMINAR_TOKEN=secret uv run server/proxy.py

The site connects to ws://<host>:8765/ws?token=<token>, sends a prompt, and
receives the model's real state at the start and after each of the 8 turbo
steps as JPEG frames.
ComfyUI itself is never exposed: the only thing a client controls is the
prompt text, which is placed into one fixed workflow.

With SEMINAR_SITE set to a built copy of the site (site/dist), the proxy
also serves it, so one address gives both the site and the live demo.
"""

import asyncio
import io
import json
import os
import pathlib
import random
import secrets
import struct
import sys
import uuid

import aiohttp
from aiohttp import web
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tools"))
from comfy import QUALITY, Graph, anima, conditioning, rollout  # noqa: E402

COMFY = "127.0.0.1:8188"
PORT = int(os.environ.get("SEMINAR_PORT", "8765"))
TOKEN = os.environ.get("SEMINAR_TOKEN") or secrets.token_urlsafe(16)
STEPS = 8
MAX_PROMPT = 200
# The output goes on a projector. This list only catches the obvious; the
# presenter choosing what to type is the real filter.
BLOCKED = (
    "nsfw", "nude", "naked", "explicit", "sex", "porn", "hentai", "breast", "nipple", "pussy", "penis", "ass",
    "panties", "underwear", "lingerie", "bikini", "swimsuit", "topless", "loli", "shota", "gore", "blood",
)

busy = asyncio.Lock()


def rejected(prompt):
    # words = prompt.lower().replace(",", " ").replace("_", " ").split()
    # return any(word.strip(".!?") in BLOCKED for word in words)

    return False


def workflow(prompt, seed):
    """The fixed live workflow: 8 turbo steps, with the real state sent over the websocket at the start and after each step.

    Returns the graph and {node id: frame index}.
    """
    g = Graph()
    model, clip, vae = anima(g, turbo=True)
    positive, negative = conditioning(g, clip, f"{QUALITY}, {prompt}")
    frames = {}

    def emit(latent):
        image = g.out(g.add("VAEDecode", samples=latent, vae=vae))
        frames[g.add("SaveImageWebsocket", images=image)] = len(frames)

    rollout(g, model, positive, negative, vae, emit, seed=seed, steps=STEPS, cfg=1.0, stops=range(1, STEPS))
    return g.nodes, frames


def to_jpeg(png):
    out = io.BytesIO()
    Image.open(io.BytesIO(png)).convert("RGB").save(out, "JPEG", quality=88)
    return out.getvalue()


async def generate(client, prompt):
    """Run one prompt through ComfyUI, relaying each frame to the client as it is produced."""
    graph, frames = workflow(prompt, random.getrandbits(48))
    client_id = uuid.uuid4().hex
    async with aiohttp.ClientSession() as session, session.ws_connect(f"ws://{COMFY}/ws?clientId={client_id}", max_msg_size=0) as comfy:
        async with session.post(f"http://{COMFY}/prompt", json={"prompt": graph, "client_id": client_id}) as reply:
            if reply.status != 200:
                raise RuntimeError(f"ComfyUI refused the workflow: {(await reply.text())[:300]}")
            prompt_id = (await reply.json())["prompt_id"]
        await client.send_json({"type": "start", "total": len(frames)})

        current = None
        async for message in comfy:
            if message.type == aiohttp.WSMsgType.BINARY:
                # 4 bytes event type, 4 bytes image format, then the image.
                event, _format = struct.unpack(">II", message.data[:8])
                if event == 1 and current in frames:
                    await client.send_json({"type": "frame", "index": frames[current]})
                    await client.send_bytes(to_jpeg(message.data[8:]))
            elif message.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(message.data)
                body = data.get("data", {})
                if body.get("prompt_id") != prompt_id:
                    continue
                if data["type"] == "executing":
                    current = body.get("node")
                    if current is None:
                        break
                elif data["type"] == "execution_success":
                    break
                elif data["type"] == "execution_error":
                    raise RuntimeError(body.get("exception_message", "ComfyUI error"))
    await client.send_json({"type": "done"})


async def socket(request):
    if not secrets.compare_digest(request.query.get("token", ""), TOKEN):
        return web.Response(status=403, text="bad token")
    client = web.WebSocketResponse(heartbeat=20)
    await client.prepare(request)
    async for message in client:
        if message.type != aiohttp.WSMsgType.TEXT:
            continue
        try:
            data = json.loads(message.data)
            prompt = " ".join(str(data.get("prompt", "")).split())[:MAX_PROMPT]
        except ValueError:
            continue
        if data.get("type") != "generate" or not prompt:
            continue
        if rejected(prompt):
            await client.send_json({"type": "error", "message": "prompt rejected"})
        elif busy.locked():
            await client.send_json({"type": "error", "message": "busy"})
        else:
            async with busy:
                print("generate:", prompt, flush=True)
                try:
                    await generate(client, prompt)
                except Exception as error:  # report, and keep serving
                    print("failed:", error, flush=True)
                    await client.send_json({"type": "error", "message": str(error)[:200]})
    return client


async def health(_request):
    return web.Response(text="ok")


def serve_site(app, folder):
    """Serve the built site from `folder` at the root of this server."""

    async def index(_request):
        return web.FileResponse(folder / "index.html")

    app.router.add_get("/", index)
    app.router.add_static("/", folder)


if __name__ == "__main__":
    app = web.Application()
    app.add_routes([web.get("/ws", socket), web.get("/health", health)])
    site = os.environ.get("SEMINAR_SITE")
    if site and (pathlib.Path(site) / "index.html").exists():
        serve_site(app, pathlib.Path(site).resolve())
    print(f"token: {TOKEN}", flush=True)
    web.run_app(app, host="127.0.0.1", port=PORT, print=lambda *_: None)
