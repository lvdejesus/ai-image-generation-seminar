# Seminar site with live denoising demo

Content source: `outline.md` (32 beats, 9:52 spoken). Status as of 2026-10-04: the site, the recorded images and the live proxy are built and tested locally. The tunnel is set up and tested; publishing is on hold. See "Not done yet".

## What it is

A stepped, scroll-scrubbed site that replaces slides for the 10 minute seminar, plus a live demo in Section V where a prompt is denoised on the home desktop and streamed to the presenting machine.

The talk never depends on the live part: every visual, including the Section V demo, has a recorded version inside the site.

## Running it

```
cd site && pnpm dev                              # the site, on http://localhost:5173
./server/live.sh                                 # builds the site, serves it with the live proxy, and opens a public tunnel
SEMINAR_TOKEN=<secret> uv run server/proxy.py    # the live proxy alone, on localhost:8765
python3 tools/assets.py [group]                  # regenerate recorded images
python3 tools/photos.py                          # re-download the photographs for beats 2 and 8
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
  src/scenes/         one file per group of beats: intro, noising, training, reverse, generate, prompt, latent, pipeline, and spine (the diagram that grows through the talk)
  public/assets/      the portrait and the generated images
server/proxy.py     live proxy
server/live.sh      starts the proxy and a Cloudflare quick tunnel
server/.bin/        cloudflared, downloaded from its GitHub releases (not installed system-wide)
tools/comfy.py      ComfyUI client and the Anima graph
tools/assets.py     generates public/assets through ComfyUI
tools/latent.py     extracts the real latent channels for Section IV
tools/photos.py     downloads the CC0 photographs for beats 2 and 8
```

## Beats

| # | Outline | Scene | What it shows |
|---|---|---|---|
| 1 | I.A | intro | A prompt typed into a box, an arrow, a frame of static with a question mark |
| 2 | I.B | intro | Real photographs pop in; a lighthouse, a cliff and the sea are cut out of them and stacked on a sunset sky, then the collage is crossed out |
| 3 | I.C | intro | The collage clears; the static from beat 1 resolves, real state by real state, into the lighthouse for its prompt |
| 4 | I.D | intro | "How it works, in three ideas." The lighthouse moves aside for the three numbered ideas: remove noise in small steps; the text steers every step; work on a compressed image |
| 5 | II.A.1 | noising | The portrait and a patch of its real pixels as numbers: red, green and blue for each pixel |
| 6 | II.A.2 | noising | "Noise is random numbers." Random numbers, one per red, green and blue value, plus the pixel numbers, equal the noisy pixels, and the noisy portrait |
| 7 | II.A.3 | noising | The two portraits take their places in a strip of noise levels, from the original to 96% noise (the model's real noisy inputs, decoded) |
| 8 | II.B.1 | training | "Training: collect captioned images." Rows of captioned images (CC0 photographs, paintings and the talk's own images) scroll past and pull together into one stack of training images |
| 9 | II.B.2 | training | A training image, a dial landing on a random noise level, the noisy example |
| 10 | II.B.3 | training | Example, level and caption (through a text encoder, as a row of numbers) into the model, a guess of the clean image out, compared with the original; the difference is large, since the model is untrained |
| 11 | II.B.4 | training | The guess settles into a soft copy of the original, the difference picture goes dark and a difference curve falls; then other images, captions and noise levels take their turn |
| 12 | II.C.1 | reverse | "A little noise: the guess is good." The portrait at 32% noise, and the model's real guess: nearly the original |
| 13 | II.C.2 | reverse | "A lot of noise: the guess is bad." The 72% noise frame; four different men appear clean, then all get the same heavy noise and look alike: many images could be under it |
| 14 | II.C.3 | reverse | "Not sure? Play it safe." The four, clean again, piling up into their average, then the model's real one-step guess from the same input; below, one pixel on a number line, dark in one answer and bright in another, and the safe guess sliding to the middle |
| 15 | II.C.4 | reverse | "Less hint, a safer guess." Three real guesses: from 72% noise (a soft man), from pure noise with the caption only (a ghostly man in a dark suit), from pure noise with no text (almost flat grey) |
| 16 | II.C.5 | reverse | The noisy portrait, plus a bit of the guess, equals the model's real next state, which looks almost the same |
| 17 | II.C.6 | reverse | Those two frames become the start of a strip: the real states of the run, back to an image |
| 18 | II.D.1 | generate | A frame of pure noise: no original image behind it |
| 19 | II.D.2 | generate | A recorded 30-step run, real state by real state, hurrying through the early steps that look alike |
| 20 | II.E | generate | The portrait at 86% noise, with the same prompt, through an anime model and a photo model |
| 21 | II.F | spine | "So far: one idea." The diagram, step 1: random noise, the model × 30, the image coming out of the noise; idea 1 under it, the prompt chip at the top right |
| 22 | III.A.1 | prompt | "No text: some image." One starting noise, the chip "no text", and the real states of that run, ending in an anime girl with a red bag: "an image, but not one we chose" |
| 23 | III.A.2 | prompt | The no-prompt row clears; the same noise, three prompts: the real states of the three runs side by side, drifting apart step by step |
| 24 | III.B | spine | "So far: two ideas." The diagram comes back; the prompt chip moves into a prompt box, and the text encoder, its numbers and a line into the model grow above; idea 2 |
| 25 | IV.A.1 | latent | "Spot the difference." The lighthouse twice, side by side, with no labels |
| 26 | IV.A.2 | latent | The two pictures get their labels (the second has a tiny random change on every pixel); the same to the eye, then both zoom into the same 4×4 patch and each pixel shows its red, green and blue values, almost all different |
| 27 | IV.B | latent | "Train a compressor." Image, compressor, the real latent ("12× fewer values"), decompressor, the real decoded image, and an arc back to the original: compare, judged on how it looks; "a bit like a JPEG, but learned" |
| 28 | IV.C | latent | The portrait with noise added to the pixels (fine grain, the simple version) next to noise added to the latent and decoded (blotchy, the model's real input) |
| 29 | IV.D | spine | "Denoise the latent, decode once." The diagram comes back; the coloured noise turns into a random latent, and a clean latent and the decompressor funnel from beat 27 appear before the image; idea 3 |
| 30 | V.A | spine | "The whole system: three ideas." The finished diagram dims, then each idea lights up with its parts |
| 31 | V.B | pipeline | Live demo: prompt field, frame, live or recorded run |
| 32 | V.C | pipeline | The crossed-out photo collage beside the same subject denoised out of noise, and the three ideas |

Beats are numbered in talk order. Section II runs: add noise, train a model to guess the clean image, then use the model to go backwards, so every model output appears after the model has been introduced (reordered 2026-10-05; the outline's II.B and II.C swapped). Beat 3 shows a whole run before Section II explains it (it was beat 4 until the audit of 2026-11-14 merged the two), and beat 4 names the three ideas that Section II to IV explain. II.A is in three beats: an image as numbers (red, green and blue for each pixel), noise as random numbers added to it, then noise levels. It is not a step-by-step procedure, because training adds a random level of noise in one step. On 2026-11-14 training also gained a first beat (collecting captioned images), the model's output became a guess of the clean image instead of the noise, and the caption became an input from beat 10, so the prompt does not go missing for most of Section II; the old III.A beat ("Train with the caption too") was removed. Later the same day the text-encoder beat ("The prompt becomes numbers") was removed too; beat 10 shows the text encoder at the first use of the caption, so Section III is one beat. Section IV gained a first beat ("Pixels are full of detail we cannot see") to motivate the latent before showing the encoder. Then the encoder beat became "Compress it, like a JPEG" (a compressor and a decompressor, trained together; like a JPEG it is smaller and not exact, unlike a JPEG it is learned), followed by a new beat that zooms into the original and its real round trip ("Not exact, but good enough"), a callback to beat 23. Later that day the format "you could have invented it" (naive idea, visible failure, smallest fix) shaped two more changes: a "Caption in, image out?" detour in II.B gave noise a reason to exist (later moved into II.C, see below), and Section IV became: detail we cannot see, train a compressor, not exact but good enough, the noise goes into the latent, denoise the latent and decode once. Experiments on how a change in the latent shows up in the image (one changed number, a recoloured sun) were left out of the talk; they are kept for questions. Every run on screen shows its prompt as a chip at the top right (beats 3, 12 to 23, and the diagram in beats 21 and 24); the portrait runs were re-recorded on 2026-11-14 with the prompt "a man in a suit and tie, smiling" instead of an empty one, since the caption is an input from beat 10. Beat 12's headline became "A little noise: the guess is good" (beat 4 had already shown that a run can go backwards). Beat 13 shows "many images could be under this noise" in the forward direction (four men, the same heavy noise, alike), so the talk never claims that the model gives different answers to the same input; which image a run ends on is decided by the noise ("different starting noise, a different image"), and samplers are not mentioned. Later on 2026-11-14 the "Caption in, image out?" beats left II.B, since they said the same as II.C.3: II.C.3 became "Not sure? Play it safe" (a pixel game: when the answer is 0 or 100, the safe guess is 50, so one guess for many images is their average), and a new beat, "Less hint, a safer guess", shows three real guesses: from 72% noise, from pure noise with the caption only (a ghostly man in a dark suit, which is "caption in, image out"), and from pure noise with no text (grey). All recordings keep CFG 4: at CFG 1 the prompts are followed badly (the cat prompt gives no cat), and CFG 4 is the guess the real runs step toward.

## Recorded images (`tools/assets.py`)

- `portrait.jpg`: Obama's 2012 official portrait by Pete Souza, listed as public domain on Wikimedia Commons.
- `found/`: ten CC0 photographs of lighthouses, cliffs, sunsets and sea from Wikimedia Commons, for the "existing images" in beats 2 and 32, and among the collected images in beat 8. `tools/photos.py` checks each licence before downloading; sources are in `CREDITS.md`.
- `collection/`: nineteen CC0 or public-domain images of everyday subjects (dogs, food, trains, flowers, a sailboat, two paintings and more) from Wikimedia Commons, for the collection of captioned training images in beat 8. Their captions are written in `site/src/scenes/training.ts`. Same tool, licence check and credits as `found/`.
- `cut/`: the lighthouse, cliff and sea cut out of three of those photographs with ComfyUI's RMBG node (`python3 tools/assets.py cutouts`). The node allocates outside ComfyUI's memory manager, so the script unloads ComfyUI's cached models before each one.
- `noised/`: the portrait as the model sees it at five noise levels (32%, 56%, 72%, 86% and 96% noise), decoded. These are the frames of the strip in beat 7; the 32% frame is also the noisy portrait in beat 6.
- `cand/`: four results the model produced from the 72% frame, with the prompt "a man in a suit and tie, smiling". They share that one noisy input; an ancestral sampler adds fresh randomness on the way back, so each seed ends somewhere different.
- `near.webp`: what the model gives back from the 32% frame, nearly the original, for beat 12.
- `guess.webp`: the model's single-step guess from the same 72% frame, the blur in beat 14, and the guess that beat 16 steps toward.
- `back/`: the model's real states along the way from that frame to the first result, for beat 17.
- `far/`: the portrait from 86% noise with the same prompt, taken back by Anima (an anime character) and by FLUX.2 klein, a photo-trained model (a realistic man). FLUX has its own latent space, so its noise is not the same sample as Anima's.
- `run/`: a 30-step text-to-image run: the starting noise and the real state after every step.
- `three/`: one seed with three prompts, and with no text at all (`three/none/`, for the slide before the three prompts: an empty prompt and an empty negative, so nothing steers it): the shared starting noise, five states along the way, and the result. The quality tags alone, as a "no prompt" run, gave an unpresentable image from this seed.
- `fallback/`: the live demo's 8-step workflow, recorded the same way.
- `latent.png`: the real latent of the lighthouse image, its 16 channels as a 4×4 grid of grey maps. Made by `tools/latent.py`, which runs under ComfyUI's Python and encodes on the CPU.
- `decoded.png`: that latent decoded back into an image, saved losslessly, so its only difference from the original is the one the VAE makes (1.8 brightness levels on average). Beat 27. Also made by `tools/latent.py`.

The portrait rollouts use the plain prompt "a man in a suit and tie, smiling" (no quality tags), shown on screen with each run. The negative prompt stays and matters: with only the quality tags as prompt, the same rollouts drifted to unpresentable images.

The portrait pictures in beats 6 and 7, beats 12 to 17 and beat 20 are real model states, shown as they are. That comes with a trade-off that cannot be tuned away: at a noise level where the model returns someone else, the noisy input is not recognisable to the eye either. The decision (2026-10-05) is to keep the rollouts real and accept that. `HEAVY` and `NOISED_AT` in `tools/assets.py` set the levels; at 56% noise or less he stays visible, but the model then gives back something close to the original.

What is still illustrative: the heavy noise on the four men in beat 13 is added by the site (the men themselves are real results the model made from the 72% portrait); the training example in beats 9 to 11 is a clean image with pixel noise added by the site, since no training run is being recorded, and the noise shown on the latent in beats 29 and 30 is likewise added by the site to the real latent channels. The guess, the difference picture, the caption numbers and the difference curve in beats 10 and 11 are drawings of the idea, not measurements. The trained guess is a soft copy of the original, never the sharp one, so the training beats do not suggest that the model goes from noise to a sharp image in one step.

## Live demo behaviour

- Enter in the prompt field sends the prompt to the proxy, which fills one fixed workflow and relays nine frames as they are produced: the starting noise, the real state after each of steps 1 to 7, and the result.
- ComfyUI does not decode them in order, so frames arrive shuffled. The site plays them in order at a steady 2.2 per second, waiting when the next one has not arrived; the waits fall on the early frames, which all look like noise.
- The recording plays instead if there is no connection, if the proxy rejects the prompt or is busy, if ComfyUI fails, or if no frame arrives within 8 seconds.
- The proxy requires the token, runs one job at a time, caps the prompt at 200 characters and rejects a short list of explicit words.

## Not done yet

1. **Publishing to GitHub Pages:** published at https://lvdejesus.github.io/ai-image-generation-seminar/ from the public repository https://github.com/lvdejesus/ai-image-generation-seminar.
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
4. **Training data bias:** shown deliberately in beat 20. With this plain prompt, the results in beat 13 are realistic men rather than anime, so the anime reveal happens only in beat 20.
5. **Model:** Anima 2B through the existing ComfyUI, for recorded images and the live demo.
6. **No U-Net to transformer beat:** removed on request; the talk ends on the answer to the opening question.
7. **Tunnel:** a Cloudflare quick tunnel, not Tailscale Funnel.
