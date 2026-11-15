# How AI-Generated Images are Created

- The original title is "From Convolutional U-Nets to Diffusion Transformers in Latent Diffusion Models".
- The scope of the topic is reduced so that it fits the given time; the background information needed to understand the difference between the U-Net and Diffusion Transformer architectures requires too much time to explain.

Target: 11:04 spoken, 1:04 over a 10:00 slot. IV.B is the first beat to cut if a rehearsal runs over.

The talk keeps to three ideas. I.D shows the whole system as one diagram, with plain labels and no idea names. The ideas are then named one at a time as they join the diagram (IV.C, IV.E, V.D); V.D shows all three together:

1. Remove noise in small steps.
2. The text steers every step.
3. Work on a compressed image.

Each section opens with a section page: its numeral and title, large (0:03 each); the presenter reads the title. Sections II, III and IV end with a bridge beat: a question as the headline, with a picture, that the next section answers. The other bridges are spoken only.

## I. Introduction (1:13)

- A. Rhetorical question: what happens when you type an image generation prompt?
- B. The system does not search for existing images and combine them.
- C. The system learns to remove noise: the prompt from I.A, denoised out of noise into its image.
- D. How it works: the whole system as one diagram, with plain labels. Random noise, the model about 30 times, the compressed image, the decompressor, the image; the prompt, the text encoder and its numbers steer the model. The ideas are not named yet. We start with the model: how does it learn to remove noise?

## II. Teaching a model to remove noise (2:21)

- A. Collect captioned images: images with text that says what is in them. Millions to billions of them, mostly from the internet.
- B. The image and the caption become numbers.
  1. Take one of them. To a computer an image is a grid of numbers: three numbers for each pixel, for red, green and blue.
  2. The caption becomes numbers. The model computes with numbers, so a text encoder (a separate model, trained before) turns the caption into numbers. The same caption always gives the same numbers. A real text encoder gives hundreds of numbers for each word; the slide shows five.
- C. Add noise.
  1. Noise is random numbers. Add them to the pixel numbers, and we get a noisy image.
  2. Pick a random noise level, and add that much noise. Less noise leaves more of the image, and more noise leaves less of it, up to almost pure noise; the noisy version follows the dial.
- D. A model is trained to predict the clean image.
  1. The input is the noisy image, the noise level and the caption as numbers; the output is a prediction of the clean image.
  2. Training nudges the model so that its prediction is closer to the original. It does this over many images at every noise level, so the difference gets small on average, never zero: from heavy noise the best prediction is soft (III.A to III.D show why).
  3. The model keeps patterns, not images. Stable Diffusion 1.5 learned from about 2.3 billion images (about 100 TB); its model file is about 2 GB, a dot at the same scale. The images are not stored anywhere in it; the training leaves behind the numbers of the model, and those numbers encode patterns. (For questions: images that appear many times in the data can be memorized; Carlini et al., 2023, pulled about a thousand out of Stable Diffusion.)
  4. The bridge (0:08): can one run make an image? Pure noise and the caption go into the model, and the real prediction comes out: a blurry man in a dark suit. "From pure noise, the prediction is a blur. Why?"

## III. Why the predictions blur (2:01)

- A. Images can have the same caption. Many images share one caption: two real photos, both "a man in a suit and tie, smiling". With 100% noise the two inputs look the same, so in training the model gets one input with two originals. The training diagram shows it: the two photos move into place as the originals, and the input at 100% noise, the model and the caption pop in. If it outputs the first man, it is wrong for the second photo, and the other way round; whichever man it outputs, it is wrong half of the time. Error bars show it: one bar on each original, and an overall error bar.
- B. The average minimizes the error. Many images fit the caption, not only two: five more official portraits join the two originals, and from pure noise each one is a right answer. Whichever man the model outputs, it is wrong for the others; the output with the smallest error over all of them is their average. This is still training (a "During training" tag, and the gear on the model). Each photo has an error bar for the man in the output. Training lowers the error: as the gear turns, copies of the photos merge into the output one by one, so the output is the exact pixel average of the photos so far, and the overall error goes down at every step, to below its value for any one man. So training pulls the output to the average. The errors are real, measured on the pixels of the photos. Then the average becomes the model's real prediction after training, from pure noise: a blurry man in a dark suit. The bars use the exact average, not the model's prediction: measured on these seven photos, the prediction has a larger error than any single man (its background is white, and theirs are not), since it is the average over every image with this caption in the training data, not over these seven. (For questions: the pixel game, one hair pixel at 62 and 179 with the best single answer 121, shows why a big miss makes the middle the best answer.)
- C. Little noise gives the right image. The same diagram: at 32% noise on the first photo, with the same caption, the input still shows which man it is, so only one image fits, and the prediction is that photo. Then the same with the second photo.
- D. More noise, blurrier predictions, three cases with one cause, explained separately. From 72% noise: the noise left the large shapes, so all fitting images share them and the average blurs the detail. From pure noise with the caption only: every picture of the caption fits, so the average keeps what they share (a dark suit, no face). From pure noise with no text: every image fits, so the average is the mean of the training data, flat grey-brown. These are the model's real predictions from one step.
- E. The bridge (0:08): how do we get a sharp image? The blur from pure noise and the caption on the left, the sharp prediction from 32% noise on the right, and an arrow with a question mark between them.
- Models differ in what they output: the clean image, the noise, or a mix of the two (velocity). Given the noisy image and the level, each one gives the others, since the noisy image is a mix of the image and the noise. "The clean image" is the framing used here; the model really computes it. This is for questions, not for the talk.

## IV. Generating from pure noise (3:18)

- A. Generating a new image, with a car run ("a sports car parked on a city street").
  1. Start with pure noise.
  2. Many cars fit, so the results vary: twelve real results from pure noise in many colours, placed on a colour wheel by the colour inside a box on the car. They spread over the wheel, and the model's prediction is a muddy ghost of a car. These results are the model's own, not training images. They come in as a preview: "here are twelve cars this model made; soon we see how". IV.A.3 to IV.A.5 then show how a run makes one.
  3. So we move the noisy image only a small step toward the prediction, which gives a slightly less noisy image. (One sampler step: next = (1 − a) · noisy + a · prediction, with a small a.)
  4. Repeat. With less noise, the results vary less. Back on the colour wheel: the run goes 18 steps, and its prediction, recorded at every step, turns from a muddy blur into a red car. Twelve results branched from step 18 are all red: they vary much less, and they land next to the prediction. Nothing is looked up: what is already in the image rules answers out.
  5. Repeat, and an image appears: the run and its prediction side by side to step 30. The noise goes down, the prediction sharpens, and they end as the same image.
- B. What comes out depends on what the model was trained on.
  1. From even more noise, this model returns an anime character, because it was trained on anime; a model trained on photos returns a realistic man instead. Neither is the original.
  2. The model fills in from the patterns it learned from its training images, not from copies of them; this is where training data bias comes from.
- C. The first idea (0:12): random noise, the model about 30 times, an image. The first step of the diagram that grows through the talk. It ends with a question: the prompt goes into the model at every step; what does it do there?
- D. The text steers every step. The caption, an input since II.B.2, changes the prediction a little at every step, so the same starting noise drifts towards a different image for each prompt (callback to III.A: many images fit one caption) (0:30).
- E. The second idea (0:10): the prompt, the text encoder and its numbers join the diagram.
- F. The bridge (0:08): do we need every pixel? The diagram stays, the text row dims, and the noise and the image get the label "512 × 512 × 3 numbers": the model works on almost 800,000 numbers, 30 times.

## V. Do we need to generate pixel by pixel? (1:26)

- A. Images are full of detail we cannot see.
  1. Spot the difference: two pictures, no labels. Ask the room, and pause.
  2. They look the same, but they differ in almost every number (each value that differs is marked), so in pixels the model spends its work on detail nobody sees.
- B. So train a compressor and a decompressor (the encoder and the decoder) together: what comes back is compared with the original, judged on how it looks. At first what comes back is noise; training turns both halves (a gear on each, as on the model in II.D.2) until it looks like the original. Differences we cannot see cost almost nothing and it learns to drop them. A bit like a JPEG, but learned. In the model used here, 512×512×3 becomes 64×64×16, about 12× fewer values. What comes back is not exact, and as V.A showed, it does not need to be. At the end, an arrow points at the compressed form, with the name "the latent".
- C. Then we use it: the noise is added to the latent, not to the pixels. Pixel noise is fine grain; latent noise, decoded, is blotchy. The pixel noise in II.C was the simple version.
- D. The third idea. The model is trained and run on the latent, so there is far less computation; only the final latent is decoded into pixels. Idea three joins the diagram: the noise becomes a random latent, and the decompressor runs once at the end.
  - The real training also compares pixel by pixel; the "how it looks" part (a perceptual loss and a discriminator) is what lets it drop invisible detail. For questions.

Bridge to the end: "That is all three ideas. Now we put it to work."

## End (0:45)

The demo belongs to no section: no section page and no corner label. It is the last beat of the talk.

- Live demo (0:45): take a prompt from the audience and watch it denoise step by step.
