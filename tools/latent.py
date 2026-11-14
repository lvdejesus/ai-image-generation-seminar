"""Save the real latent of an image as a picture of its 16 channels.

Run with ComfyUI's own Python, since it needs ComfyUI's VAE code:

    ~/Projects/forks/comfy2/.venv/bin/python tools/latent.py

It encodes the lighthouse image with the model's VAE on the CPU and writes
site/public/assets/latent.png: a 4x4 grid of the 64x64 channels, each scaled
to use the full range of grey. It also decodes that latent back into an image
and writes site/public/assets/decoded.png, losslessly, so the only difference
from the original is the one the VAE makes.
"""

import pathlib
import sys

COMFY = pathlib.Path.home() / "Projects" / "forks" / "comfy2"
ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "site" / "public" / "assets"

# This folder has its own comfy.py (the API client); keep it from shadowing ComfyUI's package.
sys.path = [str(COMFY)] + [p for p in sys.path if pathlib.Path(p or ".").resolve() != pathlib.Path(__file__).resolve().parent]
sys.argv = [sys.argv[0], "--cpu"]

import numpy as np  # noqa: E402
import torch  # noqa: E402
from PIL import Image  # noqa: E402

import comfy.sd  # noqa: E402
import comfy.utils  # noqa: E402

image = Image.open(ASSETS / "three" / "lighthouse" / "6.webp").convert("RGB").resize((512, 512))
pixels = torch.from_numpy(np.asarray(image).astype(np.float32) / 255)[None]
vae = comfy.sd.VAE(sd=comfy.utils.load_torch_file(str(COMFY / "models" / "vae" / "qwen_image_vae.safetensors")))
with torch.no_grad():
    latent = vae.encode(pixels).squeeze().float().cpu().numpy()
print("latent shape", latent.shape)

channels, size = latent.shape[0], latent.shape[-1]
side = int(channels**0.5)
grid = np.zeros((side * size, side * size), dtype=np.uint8)
for c in range(channels):
    low, high = np.percentile(latent[c], [1, 99])
    tile = np.clip((latent[c] - low) / (high - low), 0, 1)
    row, column = divmod(c, side)
    grid[row * size:(row + 1) * size, column * size:(column + 1) * size] = (tile * 255).astype(np.uint8)
Image.fromarray(grid).save(ASSETS / "latent.png")
print("wrote", (ASSETS / "latent.png").relative_to(ROOT))

with torch.no_grad():
    decoded = vae.decode(torch.from_numpy(latent)[None, :, None]).squeeze().float().clamp(0, 1).cpu().numpy()
Image.fromarray((decoded.reshape(512, 512, 3) * 255).round().astype(np.uint8)).save(ASSETS / "decoded.png")
print("wrote", (ASSETS / "decoded.png").relative_to(ROOT))
