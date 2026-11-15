# Seminar site with live denoising demo

Content source: `outline.md` (34 beats and a title page). Status as of 2026-10-04: the site, the recorded images and the live proxy are built and tested locally. The tunnel is set up and tested; publishing is on hold. See "Not done yet".

## What it is

A stepped, scroll-scrubbed site that replaces slides for the 10 minute seminar, plus a live demo at the end where a prompt is denoised on the home desktop and streamed to the presenting machine.

The talk never depends on the live part: every visual, including the demo at the end, has a recorded version inside the site.

## Running it

```
cd site && pnpm dev                              # the site, on http://localhost:5173
./server/live.sh                                 # builds the site, serves it with the live proxy, and opens a public tunnel
SEMINAR_TOKEN=<secret> uv run server/proxy.py    # the live proxy alone, on localhost:8765
python3 tools/assets.py [group]                  # regenerate recorded images
python3 tools/photos.py                          # re-download the photographs for beats 2 and 5
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
- **Live demo:** MOSS-Image (`moss_image_sft_int8_convrot`, with `qwen3.5_9b_int8_convrot` as text encoder and `flux2-vae`) and the `MOSS_Image_SFT_8_steps_dmd_v0.1` LoRA, 768×768, 8 steps, CFG 1, plain prompts with no quality tags. A warm run takes about 20 seconds; the first run after loading takes about 30. `SEMINAR_MODEL=anima` in `server/proxy.py` goes back to Anima turbo (512×512, about 4 seconds). The recorded fallback (`fallback/`) is the same MOSS workflow, seed 2024.
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
tools/photos.py     downloads the CC0 photographs for beats 2 and 5
```

## Beats

| # | Outline | Scene | What it shows |
|---|---|---|---|
| sI | I | section | Section page: "I" and "Introduction", large. The corner label of the section comes in on the next beat |
| 1 | I.A | intro | A prompt typed into a box, an arrow, a frame of static with a question mark |
| 2 | I.B | intro | Real photographs pop in; a lighthouse, a cliff and the sea are cut out of them and stacked on a sunset sky, then the collage is crossed out |
| 3 | I.C | intro | The collage clears; the static from beat 1 resolves, real state by real state, into the lighthouse for its prompt |
| 4 | I.D | spine | "How it works." The whole system as one diagram, with plain labels and no idea numbers: random noise, the model × 30, the compressed image, the decompressor, the lighthouse; above, the prompt, the text encoder and its numbers, with a line into the model |
| sII | II | section | Section page: "II" and "Teaching a model to remove noise", large. The corner label of the section comes in on the next beat |
| 5 | II.A | training | "Collect captioned images." Rows of captioned images (CC0 photographs, paintings and the talk's own images) scroll past and pull together into one stack of training images |
| 6 | II.B.1 | training | "To a computer, an image is numbers." The stack goes; the cat from the stack, large, and a patch of its real pixels as numbers: red, green and blue for each pixel |
| 7 | II.B.2 | training | "The caption becomes numbers." The caption of the image, large, through the text encoder into a row of five numbers |
| 8 | II.C.1 | training | "Noise is random numbers." Random numbers, one per red, green and blue value, plus the pixel numbers, equal the noisy pixels; then the cat and the noisy cat, joined by "+ noise" |
| 9 | II.C.2 | training | "Pick a random noise level." The stack comes back small, a training image comes out of it, a dial swings and lands on a random noise level, and the noisy version follows the dial |
| 10 | II.D.1 | training | The caption row comes back at the top; the noisy version, its level and the caption numbers go into the model, a prediction of the clean image out, compared with the original; the difference is large, since the model is untrained |
| 11 | II.D.2 | training | The prediction settles into a soft copy of the original, a gear on the model turns, the difference picture goes dark; then other images, captions and noise levels take their turn |
| 12 | II.D.3 | training | "The model keeps patterns, not images." Stable Diffusion 1.5's training images as a block of tiny tiles (2.3 billion images, about 100 TB) and the model at the same scale by area, a dot (about 2 GB); the images fade ("The images are not stored"), the dot stays |
| 13 | II.D.4 | training | "Can one run make an image?" The block and the dot go; pure noise and the caption "a man in a suit and tie, smiling" go into the model, and its real prediction from pure noise comes out: a blurry man in a dark suit |
| sIII | III | section | Section page: "III" and "Why the predictions blur", large. The corner label of the section comes in on the next beat |
| 14 | III.A | reverse (portraits) | "Images can have the same caption." Two real photos with the same caption, "a man in a suit and tie, smiling", move to the right and become the two originals; the input at 100% noise, the model and the caption from above pop in. The output shows the first man ("if it outputs this man"): an error bar on each original (none for the first, long for the second) and an overall error bar; then the second man, the bars swap and the overall error stays |
| 15 | III.B | reverse (portraits) | "The average minimizes the error." Still training (a "During training" tag and the gear on the model, both from III.A). The two originals join five more official portraits with the same caption, each with an error bar for the second man; as the gear turns, copies merge into the output one by one (the exact average of the photos so far) and the overall error goes down at every step (real errors on the pixels); then the bars, tag and gear go, and the output becomes the model's real prediction "after training" |
| 16 | III.C | reverse (portraits) | "Little noise gives the right image." The same diagram: the input becomes the first photo at 32% noise, the prediction becomes that photo and the second original dims; then the same with the second photo |
| 17 | III.D | reverse (portraits) | "More noise, blurrier predictions." Four real predictions: from 32% noise (the photo), from 72% noise (a soft man), from pure noise with the caption only (a blurry man in a dark suit), from pure noise with no text (almost flat grey) |
| 18 | III.E | reverse (portraits) | "How do we get a sharp image?" The row of predictions goes except two: the blur from pure noise and the caption on the left, the sharp prediction from 32% noise on the right, an arrow with a question mark between them |
| sIV | IV | section | Section page: "IV" and "Generating from pure noise", large. The corner label of the section comes in on the next beat |
| 19 | IV.A.1 | generate | "Now start from pure noise." The car run's pure noise, centred |
| 20 | IV.A.2 | generate | "Many cars fit, so the results vary." The noise moves aside, with a box on the car, and a colour wheel. Twelve real results from pure noise ("12 runs, each from new noise"), shown as a preview of what a full run makes, come in three at a time and shrink into their dots, all over the wheel, and the model's prediction (a muddy ghost of a car) gets its mark on the wheel |
| 21 | IV.A.3 | generate | "So take only a small step toward it." The car's noise, plus a bit of its muddy prediction, equals the real state after one step |
| 22 | IV.A.4 | generate | "With less noise, the results vary less." The colour wheel with the first round. The run goes to step 18 and its recorded prediction turns into a red car, with its mark on the wheel following; twelve results branched from step 18 land close together in the red |
| 23 | IV.A.5 | generate | "Repeat, and an image appears." The run and its prediction side by side from step 18 to 30, ending as the same image |
| 24 | IV.B | generate | The portrait at 86% noise, with the same prompt, through an anime model and a photo model |
| 25 | IV.C | spine | "The first idea." The diagram, step 1, as one row in the middle of the slide: random noise, the model × 30, the image coming out of the noise; idea 1 under the row, the prompt chip under the headline |
| 26 | IV.D | prompt | "The text steers every step." One starting noise, three prompts: the real states of the three runs side by side, drifting apart step by step |
| 27 | IV.E | spine | "The second idea." The diagram comes back as the row of the first idea and moves into the places of the full diagram; the prompt chip moves into a prompt box, and the text encoder, its numbers and a line into the model grow above; idea 2 |
| 28 | IV.F | spine | "Do we need every pixel?" The diagram stays, the text row dims, and the noise and the image get the label "512 × 512 × 3 numbers" |
| sV | V | section | Section page: "V" and "Do we need to generate pixel by pixel?", large. The corner label of the section comes in on the next beat |
| 29 | V.A.1 | latent | "Spot the difference." The lighthouse twice, side by side, with no labels |
| 30 | V.A.2 | latent | The two pictures get their labels (the second has a tiny random change on every pixel); the same to the eye, then both zoom into the same 4×4 patch and each pixel shows its red, green and blue values, almost all different; every value of the changed picture that differs is then marked in the accent colour |
| 31 | V.B | latent | "Train a compressor." Image, compressor, the real latent ("12× fewer values"), decompressor, the real decoded image, and an arc back to the original: compare, judged on how it looks; at first the decompressor gives back noise, then a gear turns on each funnel, as in the training beat, and what comes back clears into the image; "a bit like a JPEG, but learned"; then an arrow up to the tile names it "the latent" |
| 32 | V.C | latent | The portrait with noise added to the pixels (fine grain, the simple version) next to noise added to the latent and decoded (blotchy, the model's real input) |
| 33 | V.D | spine | "The third idea." The diagram comes back; the coloured noise turns into a random latent, and a clean latent and the decompressor funnel from beat 29 appear before the image; idea 3 |
| 34 | Demo | pipeline | Live demo: prompt field, frame, live or recorded run |

Beats are numbered in talk order. Section II runs: add noise, train a model to guess the clean image, then use the model to go backwards, so every model output appears after the model has been introduced (reordered 2026-10-05; the outline's II.B and II.C swapped). Beat 3 shows a whole run before Section II explains it (it was beat 4 until the audit of 2026-11-14 merged the two), and beat 4 names the three ideas that Section II to IV explain. II.A is in three beats: an image as numbers (red, green and blue for each pixel), noise as random numbers added to it, then noise levels. It is not a step-by-step procedure, because training adds a random level of noise in one step. On 2026-11-14 training also gained a first beat (collecting captioned images), the model's output became a guess of the clean image instead of the noise, and the caption became an input from beat 10, so the prompt does not go missing for most of Section II; the old III.A beat ("Train with the caption too") was removed. Later the same day the text-encoder beat ("The prompt becomes numbers") was removed too; beat 10 shows the text encoder at the first use of the caption, so Section III is one beat. Section IV gained a first beat ("Pixels are full of detail we cannot see") to motivate the latent before showing the encoder. Then the encoder beat became "Compress it, like a JPEG" (a compressor and a decompressor, trained together; like a JPEG it is smaller and not exact, unlike a JPEG it is learned), followed by a new beat that zooms into the original and its real round trip ("Not exact, but good enough"), a callback to beat 25. Later that day the format "you could have invented it" (naive idea, visible failure, smallest fix) shaped two more changes: a "Caption in, image out?" detour in II.B gave noise a reason to exist (later moved into II.C, see below), and Section IV became: detail we cannot see, train a compressor, not exact but good enough, the noise goes into the latent, denoise the latent and decode once. Experiments on how a change in the latent shows up in the image (one changed number, a recoloured sun) were left out of the talk; they are kept for questions. Every run on screen shows its prompt as a chip under the headline (beats 3, 13 to 25, and the diagram in beats 23 and 26); the portrait runs were re-recorded on 2026-11-14 with the prompt "a man in a suit and tie, smiling" instead of an empty one, since the caption is an input from beat 10. Beat 13's headline became "A little noise: the guess is good" (beat 4 had already shown that a run can go backwards). Beat 14 shows "many images could be under this noise" in the forward direction (four men, the same heavy noise, alike), so the talk never claims that the model gives different answers to the same input; which image a run ends on is decided by the noise ("different starting noise, a different image"), and samplers are not mentioned. Later on 2026-11-14 the "Caption in, image out?" beats left II.B, since they said the same as II.C.3: II.C.3 became "Not sure? Play it safe" (a pixel game: when the answer is 0 or 100, the safe guess is 50, so one guess for many images is their average), and a new beat, "Less hint, a safer guess", shows three real guesses: from 72% noise, from pure noise with the caption only (a ghostly man in a dark suit, which is "caption in, image out"), and from pure noise with no text (grey). All recordings keep CFG 4: at CFG 1 the prompts are followed badly (the cat prompt gives no cat), and CFG 4 is the guess the real runs step toward. Six headlines were then made more exact, so each one states what happens: "Unsure, it guesses the average: a blur", "The less it sees, the blurrier the guess", "So step only a little toward the guess", "Repeat, and each guess gets sharper", "No text: an image we did not choose" and "Training pulls the guess to the original". Two beats were added: "The model keeps patterns, not images" (Stable Diffusion 1.5 figures: about 2.3 billion images, about 100 TB, against a model of about 2 GB), so the four men and the "average" are not read as stored training images, and a colour wheel after "Now start from pure noise" ("Less noise, fewer answers: a closer guess"), with a real car run: twelve results from pure noise, then twelve branched from step 18, placed by the colour of the car; the average and the model's own guess move together from the dull middle to red. A second round of the pixel game was tried there first and replaced. The car run (tools/assets.py, car()) also replaced the girl run in "Now start from pure noise" and "Repeat, and an image appears". The difference curve in the training beat became a turning gear on the model, since the curve looked like the difference vanishing. "It fills in from what it has seen" became "It fills in with the patterns it learned", since "seen" suggested looking at the training data. A title page (beat 0, no section, no time) and a cream theme with a deep lavender accent were added the same day. On 2026-11-15 "guess" became "prediction" in headlines, labels and notes, since the model computes its output and does not guess; "sees", "unsure" and "safe" went with it. The same day II.C and II.D were reordered: what the trained model gives (II.C, with the car's first colour-wheel round as the "many images fit, so the average" evidence, then the pixel game and the blur ladder on the portrait), then generation end to end with the car (II.D: pure noise, a small step, the second round, the image appearing beside its prediction). The four men were removed, since they repeated the car's point and showed a wrong "same noise". The car's prediction after every step was recorded (tools/assets.py, car_predictions()), so "it gets sharper" is shown with real predictions. Later on 2026-11-15 the end of training was reframed around one caption for many images: two real photos with the same caption (the second is Biden's official portrait), the pixel game on one real hair pixel of the two, the model's real predictions from both at full noise (almost the same blurry man), the same pairs at 32% noise (each prediction is the right photo), and the blur ladder, all as II.B.6 to II.B.9. The car's first colour-wheel round moved into generation, after "Now start from pure noise", so generation is II.C, the training-data beat is II.D and the diagram is II.E. The cream background was then made a real cream (#f6efdc, with panels #ede3c9, lines #d8cba8 and muted text #6c6455), since the first one (#faf9f5) showed as white. Later on 2026-11-15 (delta.txt): beat 4 became "How it works", the whole system as one diagram with plain labels and no idea names (spine(0), the finished diagram of V.A), so the ideas are named only as they join the diagram; II.E, III.B and IV.D became "The first idea", "The second idea" and "The third idea". "Make noisy examples" became "Make noisy versions". A beat "The caption becomes numbers" came back as II.B.3 (beat 10), so the later II.B beats and every beat after 9 moved up by one. "The images are not kept" became "not stored", and "Only what it learned stays" was removed. II.B.7 became "One input, two right answers" (later "Images can have the same caption"): the two photos go to full noise and become one input in a training diagram, with the two photos as the originals, and the output shows each man in turn (labelled "if it outputs this man", the only picture in the scene that is not a model output). II.B.8 keeps the pixel game and ends with the model's real prediction in that diagram, and II.B.9 uses the same diagram at 32% noise, first photo then second. The callout "No original image behind it" was removed from II.C.1, and the noise frame was centred. Then II.B.7 became "Images can have the same caption" and II.B.8 became "The average minimizes the error": the pixel game left the beat (it is kept for questions), and five more public-domain official portraits join the two originals and merge into the output before the real prediction. The "average of the 12" marker left the colour wheel (II.C.2 and II.C.4): the measured average of the twelve results in the box (71, 75, 85) and the prediction's colour (59, 47, 39) are both near grey but on opposite sides of the wheel, probably from CFG 4, the latent-space average and only twelve samples. So the wheel now says only that the results from pure noise vary a lot, and that those from step 18 vary much less. II.C.2 became "Many cars fit, so the results vary", and II.C.4 "With less noise, the results vary less". The "No text" beat (III.A.1) was removed, since it did not add to the talk; III.A is now one beat, "The text steers every step", and the beats after it moved up by one (thumbnails renamed). The first idea became one centred row (noise, model × 30, image, idea 1 under it); the second idea opens with that row and moves it into the full diagram. In "Pixels are full of detail we cannot see", the "They look the same to us" and "Almost every number is different" lines were removed; instead every differing value of the changed picture is marked. "Train a compressor" gained the training gears: a gear on each funnel turns, and what comes back clears from noise into the image. Later on 2026-11-15 the talk was regrouped from five sections into seven, so no section is much longer than the others: I Introduction; II Teaching a model to remove noise (the old II.A and II.B.1 to II.B.6); III Why the predictions blur (the old II.B.7 to II.B.10, now III.A to III.D); IV Generating from pure noise (the old II.C, II.D and II.E, now IV.A, IV.B and IV.C); V Controlling it with a prompt (the old III); VI Do we need to generate pixel by pixel? (the old IV, first titled "Why not generate pixels directly?", which asked about a point not yet made); VII Putting the system back together (the old V). Each section opens with a section page (ids sI to sVII, 3 seconds each). The refs earlier in this paragraph are the old ones. Then Section II was reordered, so the training data comes first and each idea comes when it is needed: II.A collect captioned images; II.B.1 an image is numbers (now on the cat from the collection, not the portrait); II.B.2 the caption becomes numbers; II.C.1 noise is random numbers, added to the cat; II.C.2 pick a random noise level (the old "Noise has levels" and "Make noisy versions" merged: the noisy version follows the dial, so the levels show there; the strip of six levels was removed); II.D.1 to II.D.3 predict, train, keep patterns. The noising scene was merged into the training scene, and the beats after II.D.3 moved up by one id. Later the same day the short Section V (the text steers every step, and the second idea) was folded into Section IV as IV.D and IV.E, since it continues the car run; its section page went, and VI and VII became V and VI. Then each section got a bridge: the last beat of a section ends with a spoken question that the next section answers (II.D.3, III.D, IV.C, IV.E and V.D; I.D already had one), and the section pages now only read their titles. Then the three bridges that ask a question became beats of their own, each with a picture: II.D.4 "Can one run make an image?", III.E "How do we get a sharp image?" and IV.F "Do we need every pixel?". The beats after each one moved down by one id (thumbnails renamed; 13, 18 and 28 have none yet). Then the recap beat VI.A ("The whole system in three ideas") was removed, since V.D had just shown the same finished diagram with the three ideas; V.D now ends "Now we put it to work", and the live demo and the close became VI.A and VI.B. V.B now ends by naming the compressed form "the latent", with an arrow up to it, so V.C can use the word. Then Section VI and its section page were removed, since the page repeated what V.D had just done; the demo and the close are now the end, with no section and no corner label. Then the close was removed too, so the demo is the last beat.

## Recorded images (`tools/assets.py`)

- `portrait.jpg`: Obama's 2012 official portrait by Pete Souza, listed as public domain on Wikimedia Commons.
- `portrait2.jpg`: Biden's 2021 official portrait by Adam Schultz, public domain on Wikimedia Commons, the second photo with the same caption in II.B.6 to II.B.8 (`tools/photos.py`, `portrait()`).
- `second/`: both portraits at full noise (two different noises), the model's one-step prediction from each, and the second portrait at 32% noise with the prediction from there (`python3 tools/assets.py second`).
- `found/`: ten CC0 photographs of lighthouses, cliffs, sunsets and sea from Wikimedia Commons, for the "existing images" in beats 2 and 34, and among the collected images in beat 5. `tools/photos.py` checks each licence before downloading; sources are in `CREDITS.md`.
- `collection/`: nineteen CC0 or public-domain images of everyday subjects (dogs, food, trains, flowers, a sailboat, two paintings and more) from Wikimedia Commons, for the collection of captioned training images in beat 5. Their captions are written in `site/src/scenes/training.ts`. Same tool, licence check and credits as `found/`.
- `cut/`: the lighthouse, cliff and sea cut out of three of those photographs with ComfyUI's RMBG node (`python3 tools/assets.py cutouts`). The node allocates outside ComfyUI's memory manager, so the script unloads ComfyUI's cached models before each one.
- `noised/`: the portrait as the model sees it at five noise levels (32%, 56%, 72%, 86% and 96% noise), decoded. The 32% frame is the noisy portrait in III.C and the latent-noise portrait in V.C; the 86% frame is the input of IV.B. (The strip of noise levels that showed all five was removed on 2026-11-15.)
- `cand/`: four results the model produced from the 72% frame, with the prompt "a man in a suit and tie, smiling". They share that one noisy input; an ancestral sampler adds fresh randomness on the way back, so each seed ends somewhere different.
- `near.webp`: what the model gives back from the 32% frame, nearly the original, for beat 13.
- `prediction.webp`: the model's single-step prediction from the same 72% frame, the blur in beat 15, and the prediction that beat 17 steps toward.
- `back/`: the model's real states along the way from that frame to the first result, for beat 18.
- `far/`: the portrait from 86% noise with the same prompt, taken back by Anima (an anime character) and by FLUX.2 klein, a photo-trained model (a realistic man). FLUX has its own latent space, so its noise is not the same sample as Anima's.
- `run/`: a 30-step text-to-image run: the starting noise and the real state after every step.
- `three/`: one seed with three prompts, and with no text at all (`three/none/`, recorded for the removed "No text" beat and no longer loaded by the site: an empty prompt and an empty negative, so nothing steers it): the shared starting noise, five states along the way, and the result. The quality tags alone, as a "no prompt" run, gave an unpresentable image from this seed.
- `fallback/`: the live demo's 8-step workflow, recorded the same way.
- `latent.png`: the real latent of the lighthouse image, its 16 channels as a 4×4 grid of grey maps. Made by `tools/latent.py`, which runs under ComfyUI's Python and encodes on the CPU.
- `decoded.png`: that latent decoded back into an image, saved losslessly, so its only difference from the original is the one the VAE makes (1.8 brightness levels on average). Beat 29. Also made by `tools/latent.py`.

The portrait rollouts use the plain prompt "a man in a suit and tie, smiling" (no quality tags), shown on screen with each run. The negative prompt stays and matters: with only the quality tags as prompt, the same rollouts drifted to unpresentable images.

The portrait pictures in beats 6 and 7, beats 13 to 18 and beat 22 are real model states, shown as they are. That comes with a trade-off that cannot be tuned away: at a noise level where the model returns someone else, the noisy input is not recognisable to the eye either. The decision (2026-10-05) is to keep the rollouts real and accept that. `HEAVY` and `NOISED_AT` in `tools/assets.py` set the levels; at 56% noise or less he stays visible, but the model then gives back something close to the original.

What is still illustrative: the heavy noise on the four men in beat 14 is added by the site (the men themselves are real results the model made from the 72% portrait); the training example in beats 9 to 11 is a clean image with pixel noise added by the site, since no training run is being recorded, and the noise shown on the latent in beats 31 and 32 is likewise added by the site to the real latent channels. The guess, the difference picture, the caption numbers and the difference curve in beats 10 and 11 are drawings of the idea, not measurements. The trained guess is a soft copy of the original, never the sharp one, so the training beats do not suggest that the model goes from noise to a sharp image in one step.

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
- Run one live generation to load MOSS-Image and the DMD LoRA, so the next one is warm.
- Stop the desktop from sleeping and run `./server/live.sh`. Send yourself the full site address with the fragment it prints, since the tunnel address is new on every start.
- Open that address on the presenting machine and confirm the presenter line (T) shows `live ready`.
- Keep a screen recording of the whole site as a last-resort fallback.

## Decisions

1. **Source photo:** Obama's public-domain official portrait, used to recreate the "depixelated Obama" effect with our own model.
2. **Hosting:** GitHub Pages from a public repo.
3. **Live prompt:** suggested by the audience, typed by the presenter, who is the content filter. The model has no safety checker and the `safe` tag is not enough: in testing, prompts about women came out suggestive, while animals, places, objects and men were fine.
4. **Training data bias:** shown deliberately in beat 22. With this plain prompt, the results in beat 14 are realistic men rather than anime, so the anime reveal happens only in beat 22.
5. **Model:** Anima 2B through the existing ComfyUI for the recorded images; MOSS-Image with an 8-step DMD LoRA for the live demo.
6. **No U-Net to transformer beat:** removed on request; the talk ends on the answer to the opening question.
7. **Tunnel:** a Cloudflare quick tunnel, not Tailscale Funnel.
