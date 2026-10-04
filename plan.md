# Seminar site with live denoising demo

Content source: `outline.md` (23 beats, 9:25 spoken). Status as of 2026-10-04: the site, the recorded images and the live proxy are built and tested locally. The tunnel is set up and tested; publishing is on hold. See "Not done yet".

## What it is

A stepped, scroll-scrubbed site that replaces slides for the 10 minute seminar, plus a live demo in Section V where a prompt is denoised on the home desktop and streamed to the presenting machine.

The talk never depends on the live part: every visual, including the Section V demo, has a recorded version inside the site.

## Running it

```
cd site && pnpm dev                              # the site, on http://localhost:5173
./server/live.sh                                 # builds the site, serves it with the live proxy, and opens a public tunnel
SEMINAR_TOKEN=<secret> uv run server/proxy.py    # the live proxy alone, on localhost:8765
python3 tools/assets.py [group]                  # regenerate recorded images
python3 tools/photos.py                          # re-download the photographs for beat 2
cd site && pnpm thumbs                           # re-capture the overview thumbnails (dev server running)
```

- `server/live.sh` prints one address, `https://<random>.trycloudflare.com/#live=…&token=…`, that works on any machine: the proxy serves the built site as well as the live demo. It also prints the fragment alone, for when the site is hosted elsewhere. Without an address the demo plays its recording.
- The address does not have to be in the URL: the first slide has a small setup control in the corner. Click it, paste what `live.sh` printed (the full address or just the fragment), press Enter. The browser remembers it; an empty Enter forgets it.
- For the proxy alone, the fragment is `#live=ws://localhost:8765/ws&token=<secret>`.
- The proxy and the asset script need ComfyUI running on port 8188.
- `pnpm build` writes the static site to `site/dist`.

| Key | What it does |
|---|---|
| Scroll | Scrubs the current beat, then settles on the nearest beat |
| Arrows, PageDown, Space | Play one beat forward or back |
| O | All beats with thumbnails; click one to jump (for questions afterwards) |
| Click the progress bar | Jump to that beat; hovering shows its title |
| T / R | Presenter line (beat, elapsed time, pace, live status) / reset its timer |
| F | Live demo only: abandon the live run and show the recording |
| L | Show the live-demo setup on any slide (it is always on the first slide) |
| Home / End | First or last beat |

## Model

Anima 2B, run through the existing ComfyUI at `~/Projects/forks/comfy2`.

- **Checkpoint:** `anima-base-v1.0`, with `qwen_3_06b_base` as text encoder and `qwen_image_vae`.
- **Recorded runs:** 30 steps, CFG 4, Euler.
- **Live demo:** `anima-turbo-lora`, 512×512, 8 steps, CFG 1. A warm run takes about 4 seconds including the per-step frames; the first run after loading takes longer.
- **It is an anime model**, which is used deliberately as the training data bias demonstration.
- **Latent:** 16 channels at 1/8 resolution, so 512×512×3 becomes 64×64×16, about 12× fewer values.

**How a run is shown.** Every run shows the model's real state: the starting noise, then the noisy image the model is actually working on after each step, decoded. A sampler hands its state on divided by (1 − noise level); `true_state` in `tools/comfy.py` undoes that to get the real input back. A run from pure noise looks like noise for roughly its first half, and the picture comes through in the second half.

## Architecture

```
presenting machine (any browser, nothing installed)
  │  https  ── static site on GitHub Pages (all recorded images inside)
  │  wss    ── Cloudflare tunnel ── home desktop (RTX 3060)
  │                                   └─ server/proxy.py (one websocket endpoint)
  │                                        └─ ComfyUI on localhost:8188
```

- The site and the live backend are separate, so the desktop going offline only disables live mode.
- The page is https, so the socket must be `wss://`. A Cloudflare quick tunnel provides that with no account: `cloudflared` opens an outbound connection and gets a random `trycloudflare.com` address, which changes on every start.
- ComfyUI itself is never exposed: it accepts arbitrary workflows and has the manager enabled. The proxy listens on localhost and accepts only a prompt.
- The endpoint and token travel in the URL fragment, so nothing secret is in the published site.

## Layout

```
outline.md          the talk
plan.md             this file
site/               Vite + TypeScript + GSAP, no framework
  src/beats.ts        every beat: headline, what is said, time budget
  src/engine.ts       master timeline, scroll scrubbing, stepping
  src/kit.ts          shared pieces: headlines, strokes, frames, asset loading
  src/noise.ts        Gaussian noising of images, static
  src/live.ts         websocket client for the proxy
  src/scenes/         one file per group of beats: intro, noising, training, reverse, generate, prompt, latent, pipeline
  public/assets/      the portrait and the generated images
server/proxy.py     live proxy
server/live.sh      starts the proxy and a Cloudflare quick tunnel
server/.bin/        cloudflared, downloaded from its GitHub releases (not installed system-wide)
tools/comfy.py      ComfyUI client and the Anima graph
tools/assets.py     generates public/assets through ComfyUI
tools/latent.py     extracts the real latent channels for Section IV
tools/photos.py     downloads the CC0 photographs for beat 2
```

## Beats

| # | Outline | Scene | What it shows |
|---|---|---|---|
| 1 | I.A | intro | A prompt typed into a box, an arrow, a frame of static with a question mark |
| 2 | I.B | intro | Real photographs pop in; a lighthouse, a cliff and the sea are cut out of them and stacked on a sunset sky, then the collage is crossed out |
| 3 | I.C | intro | Static resolving into the word "denoising" |
| 4 | II.A | noising | The portrait noised in six steps along a strip (the model's real noisy inputs, decoded); underneath, a patch of real pixels as numbers, plus random numbers, equals the noisy pixels |
| 5 | II.B.1 | training | A training image, a dial landing on a random noise level, the noisy example |
| 6 | II.B.2 | training | Example and level into the model, predicted noise out, compared with the noise really added; the difference is large, since the model is untrained |
| 7 | II.B.3 | training | The difference picture goes dark and a difference curve falls; then other images and noise levels take their turn |
| 8 | II.C.1 | reverse | The portrait at 32% noise, and what the model really gives back: nearly the original |
| 9 | II.C.2 | reverse | The 72% noise frame resolving into four different men: real results from that one input, with no prompt |
| 10 | II.C.3 | reverse | The four piling up into their average, then the model's real one-step guess from the same input |
| 11 | II.C.4 | reverse | The noisy portrait, minus a bit of predicted noise, equals the model's real next state, which looks almost the same |
| 12 | II.C.5 | reverse | Those two frames become the start of a strip: the real states of the run, back to an image |
| 13 | II.D.1 | generate | A frame of pure noise: no original image behind it |
| 14 | II.D.2 | generate | A recorded 30-step run, real state by real state, hurrying through the early steps that look alike |
| 15 | II.E | generate | The portrait at 86% noise, with no prompt, through an anime model and a photo model |
| 16 | III.A | prompt | The training diagram gains a caption input |
| 17 | III.B | prompt | One starting noise, three prompts: the real states of the three runs side by side, drifting apart step by step |
| 18 | III.C | prompt | Prompt into a text encoder, out as a grid of numbers |
| 19 | IV.A | latent | Image, encoder, the real latent as 16 grids of numbers, decoder, image; "12× fewer values" |
| 20 | IV.B | latent | A denoising loop on the latent, decoded once at the end |
| 21 | V.A | pipeline | The full pipeline assembling in four stages |
| 22 | V.B | pipeline | Live demo: prompt field, frame, live or recorded run |
| 23 | V.C | pipeline | The crossed-out photo collage beside the same subject denoised out of noise |

Beats are numbered in talk order. Section II runs: add noise, train a model to predict it, then use the model to go backwards, so every model output appears after the model has been introduced (reordered 2026-10-05; the outline's II.B and II.C swapped).

## Recorded images (`tools/assets.py`)

- `portrait.jpg`: Obama's 2012 official portrait by Pete Souza, listed as public domain on Wikimedia Commons.
- `found/`: ten CC0 photographs of lighthouses, cliffs, sunsets and sea from Wikimedia Commons, for the "existing images" in beats 2 and 23. `tools/photos.py` checks each licence before downloading; sources are in `CREDITS.md`.
- `cut/`: the lighthouse, cliff and sea cut out of three of those photographs with ComfyUI's RMBG node (`python3 tools/assets.py cutouts`). The node allocates outside ComfyUI's memory manager, so the script unloads ComfyUI's cached models before each one.
- `noised/`: the portrait as the model sees it at five noise levels (32%, 56%, 72%, 86% and 96% noise), decoded. These are the frames of the strip in beat 4.
- `cand/`: four results the model produced from the 72% frame, with no prompt. They share that one noisy input; an ancestral sampler adds fresh randomness on the way back, so each seed ends somewhere different.
- `near.webp`: what the model gives back from the 32% frame, nearly the original, for beat 8.
- `guess.webp`: the model's single-step guess from the same 72% frame, the blur in beat 10.
- `back/`: the model's real states along the way from that frame to the first result, for beat 12.
- `far/`: the portrait from 86% noise with no prompt, taken back by Anima (an anime character) and by FLUX.2 klein, a photo-trained model (a realistic man). FLUX has its own latent space, so its noise is not the same sample as Anima's.
- `run/`: a 30-step text-to-image run: the starting noise and the real state after every step.
- `three/`: one seed with three prompts: the shared starting noise, five states along the way, and the result.
- `fallback/`: the live demo's 8-step workflow, recorded the same way.
- `latent.png`: the real latent of the lighthouse image, its 16 channels as a 4×4 grid of grey maps. Made by `tools/latent.py`, which runs under ComfyUI's Python and encodes on the CPU.

The portrait rollouts use no prompt at all, since Section II has not introduced text yet. The negative prompt stays and matters: with only the quality tags as prompt, the same rollouts drifted to unpresentable images.

The portrait pictures in beat 4, beats 8 to 12 and beat 15 are real model states, shown as they are. That comes with a trade-off that cannot be tuned away: at a noise level where the model returns someone else, the noisy input is not recognisable to the eye either. The decision (2026-10-05) is to keep the rollouts real and accept that. `HEAVY` and `NOISED_AT` in `tools/assets.py` set the levels; at 56% noise or less he stays visible, but the model then gives back something close to the original.

What is still illustrative: the training example in beats 5 to 7 and 16 is a clean image with pixel noise added by the site, since no training run is being recorded, and the noise shown on the latent in beats 20 and 21 is likewise added by the site to the real latent channels. The noise pictures and the difference curve in beats 6 and 7 are drawings of the idea, not measurements. No clean image comes out of the model in the training beats, so they do not suggest that it goes from noise to a clean image in one step.

## Live demo behaviour

- Enter in the prompt field sends the prompt to the proxy, which fills one fixed workflow and relays nine frames as they are produced: the starting noise, the real state after each of steps 1 to 7, and the result.
- ComfyUI does not decode them in order, so frames arrive shuffled. The site plays them in order at a steady 2.2 per second, waiting when the next one has not arrived; the waits fall on the early frames, which all look like noise.
- The recording plays instead if there is no connection, if the proxy rejects the prompt or is busy, if ComfyUI fails, or if no frame arrives within 8 seconds.
- The proxy requires the token, runs one job at a time, caps the prompt at 200 characters and rejects a short list of explicit words.

## Not done yet

1. **Publishing to GitHub Pages**, on hold by request. `gh` is logged in with the needed scopes; there is no repository yet, and it will be public.
2. **Rehearsal.** A timed run from a second device on another network, and a try with a real trackpad and clicker: the scroll sensitivity constants are at the top of `site/src/engine.ts`.

## Before the talk

- Pause anything else that submits jobs to this ComfyUI (the Discord bot), so the live prompt is not queued behind other work.
- Run one live generation to load Anima and the turbo LoRA, so the next one is warm.
- Stop the desktop from sleeping and run `./server/live.sh`. Send yourself the full site address with the fragment it prints, since the tunnel address is new on every start.
- Open that address on the presenting machine and confirm the presenter line (T) shows `live ready`.
- Keep a screen recording of the whole site as a last-resort fallback.

## Decisions

1. **Source photo:** Obama's public-domain official portrait, used to recreate the "depixelated Obama" effect with our own model.
2. **Hosting:** GitHub Pages from a public repo.
3. **Live prompt:** suggested by the audience, typed by the presenter, who is the content filter. The model has no safety checker and the `safe` tag is not enough: in testing, prompts about women came out suggestive, while animals, places, objects and men were fine.
4. **Training data bias:** shown deliberately in beat 15. With no prompt, the results in beat 9 are painted-looking men rather than anime, so the anime reveal happens only in beat 15.
5. **Model:** Anima 2B through the existing ComfyUI, for recorded images and the live demo.
6. **No U-Net to transformer beat:** removed on request; the talk ends on the answer to the opening question.
7. **Tunnel:** a Cloudflare quick tunnel, not Tailscale Funnel.
