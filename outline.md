# How AI-Generated Images are Created

- The original title is "From Convolutional U-Nets to Diffusion Transformers in Latent Diffusion Models".
- The scope of the topic is reduced so that it fits the given time; the background information needed to understand the difference between the U-Net and Diffusion Transformer architectures requires too much time to explain.

Target: 9:52 spoken, 0:08 slack. II.E is the first beat to cut if a rehearsal runs over.

The talk keeps to three ideas, named in I.D, added one at a time to one diagram (II.F, III.B, IV.D) and repeated in V.A and V.C:

1. Remove noise in small steps.
2. The text steers every step.
3. Work on a compressed image.

## I. Introduction (1:00)

- A. Rhetorical question: what happens when you type an image generation prompt?
- B. The system does not search for existing images and combine them.
- C. The system learns to remove noise: the prompt from I.A, denoised out of noise into its image.
- D. How it works, in three ideas. We start with idea one: how does the model learn to remove noise?

## II. How the denoising process works (5:12)

- A. Noise and noise levels.
  1. To a computer an image is a grid of numbers: three numbers for each pixel, for red, green and blue.
  2. Noise is random numbers. Add the two, and we get a noisy image.
  3. Noise has levels: less noise means more of the image is left, and more noise means less of the image is left, up to almost pure noise.
- B. A model is trained to guess the clean image.
  1. Collect captioned images: images with text that says what is in them. Millions to billions of them, mostly from the internet.
  2. Take one image, pick a random noise level, and add that much noise.
  3. The input is the noisy image, the noise level and the caption, which a text encoder turns into numbers the model can use; the output is a guess of the clean image.
  4. Training nudges the model so that its guess is closer to the original. It does this over many images at every noise level, so the difference gets small on average, never zero: from heavy noise the best guess is soft.
  - Models differ in what they output: the clean image, the noise, or a mix of the two (velocity). Given the noisy image and the level, each one gives the others, since the noisy image is a mix of the image and the noise. "The clean image" is the framing used here because II.C builds on it. This is for questions, not for the talk.
- C. Use the trained model.
  1. From a little noise, the guess is good: almost exactly what we started with.
  2. From a lot of noise, the guess is bad: many possible images could be under the same noise. Ask the room which of four men is under it, and pause: nobody can tell.
  3. Not sure, it plays it safe. Ask the room: the answer is 0 or 100, say one number, and a big miss costs a lot more. They say 50: never far off. The model does this for every pixel, so a single guess from heavy noise is the average of all those images, which is a blur.
  4. Less hint, a safer guess. From pure noise there is no hint, only the caption: that is a model that turns a caption straight into an image, and it gives only what all such pictures share (a ghostly man in a dark suit). With no text at all, every pixel plays safe: grey. These are the model's real guesses.
  5. So we move the noisy image only a small step toward the guess, which gives a slightly less noisy image. (One sampler step: next = (1 − a) · noisy + a · guess, with a small a.)
  6. And repeat: many small steps.
- D. Generating a new image.
  1. Start from pure random noise, with no original image behind it.
  2. Apply the model repeatedly, and an image that never existed emerges.
- E. What comes out depends on what the model was trained on.
  1. From even more noise, this model returns an anime character, because it was trained on anime; a model trained on photos returns a realistic man instead. Neither is the original.
  2. The model fills in from the patterns it learned from its training images, not from copies of them; this is where training data bias comes from.
- F. So far, one idea (0:10): random noise, the model about 30 times, an image. The first step of the diagram that grows through the talk.

## III. How can we control what to generate with a prompt? (0:55)

- A. Failure, then fix.
  1. With no text, the same noise still becomes an image, but not one we chose (0:15).
  2. The caption, an input since II.B.3, changes the guess a little at every step, so the same starting noise drifts towards a different image for each prompt (callback to II.C.2: many images were possible) (0:30).
- B. So far, two ideas (0:10): the prompt, the text encoder and its numbers join the diagram.

## IV. Why not generate pixels directly? (1:20)

- A. Pixels are full of detail we cannot see.
  1. Spot the difference: two pictures, no labels. Ask the room, and pause.
  2. They look the same, but they differ in almost every number, so in pixels the model spends its work on detail nobody sees.
- B. So train a compressor and a decompressor (the encoder and the decoder) together: what comes back is compared with the original, judged on how it looks, so differences we cannot see cost almost nothing and it learns to drop them. A bit like a JPEG, but learned. In the model used here, 512×512×3 becomes 64×64×16, about 12× fewer values. What comes back is not exact, and as IV.A showed, it does not need to be.
- C. Then we use it: the noise is added to the latent, not to the pixels. Pixel noise is fine grain; latent noise, decoded, is blotchy. The noisy pictures from the model in this talk were noisy latents, decoded; the pixel noise in II.A was the simple version.
- D. The model is trained and run on the latent, so there is far less computation; only the final latent is decoded into pixels. Idea three joins the diagram: the noise becomes a random latent, and the decompressor runs once at the end.
  - The real training also compares pixel by pixel; the "how it looks" part (a perceptual loss and a discriminator) is what lets it drop invisible detail. For questions.

## V. Putting the system back together (1:25)

- A. Recap (0:25): the finished diagram, one idea at a time.
  1. Remove noise in small steps: a random latent, denoised by the model about 30 times.
  2. The text steers every step: the prompt, through the text encoder, into numbers that guide the model.
  3. Work on a compressed image: the final latent is decoded into the image pixels, once.
- B. Live demo (0:45): take a prompt from the audience and watch it denoise step by step.
- C. Close (0:15): answer the opening question. Nothing was searched or combined; the image was denoised out of random noise, with the three ideas.
