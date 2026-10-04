# How AI-Generated Images are Created

- The original title is "From Convolutional U-Nets to Diffusion Transformers in Latent Diffusion Models".
- The scope of the topic is reduced so that it fits the given time; the background information needed to understand the difference between the U-Net and Diffusion Transformer architectures requires too much time to explain.

Target: 9:25 spoken, 0:35 slack. II.E is the first beat to cut if a rehearsal runs over.

## I. Introduction (0:50)

- A. Rhetorical question: what happens when you type an image generation prompt?
- B. The system does not search for existing images and combine them.
- C. The system learns a denoising process.

## II. How the denoising process works (4:20)

- A. Starting from an image, we repeatedly add noise to it until it becomes almost pure noise. To a computer an image is a grid of numbers, so noise is random numbers added.
- B. A model is trained to predict the noise.
  1. Take an image, pick a random noise level, and add that much noise.
  2. The input is the noisy image and the noise level; the output is the noise that was added.
  3. Training nudges the model so that its prediction is closer to the noise that was really added. It does this over many images at every noise level, so the difference gets small on average, never zero.
- C. Can we use it to reverse the noising?
  1. With a little noise, yes: subtract the predicted noise and we get back almost exactly what we started with.
  2. With a lot of noise, no: many possible images could have produced it, and the model gives a different one each time.
  3. A single guess from heavy noise is the average of all those images, which is a blur.
  4. So we subtract only a bit of the predicted noise, which gives a slightly less noisy image.
  5. And repeat: many small steps.
- D. Generating a new image.
  1. Start from pure random noise, with no original image behind it.
  2. Apply the model repeatedly, and an image that never existed emerges.
- E. What comes out depends on what the model was trained on.
  1. From even more noise, this model returns an anime character, because it was trained on anime; a model trained on photos returns a realistic man instead. Neither is the original.
  2. The model fills in from the patterns it learned from its training images, not from copies of them; this is where training data bias comes from.

## III. How can we control what to generate with a prompt? (1:45)

- A. The caption is included in the training, so the input is the noisy image, the noise level and the caption.
- B. The caption changes the predicted noise a little at every step, so the same starting noise drifts towards a different image for each prompt (callback to II.C.2: many images were possible).
- C. One sentence: a text encoder turns the prompt into numbers the model can use, called a text embedding.

## IV. Why not generate pixels directly? (0:45)

- A. An encoder compresses an image into a much smaller latent representation, and a decoder turns it back into an image (in the model used here, 512×512×3 becomes 64×64×16, about 12× fewer values).
- B. The denoising happens on the latent, so there is far less computation; the earlier pictures were shown as pixels for intuition.

## V. Putting the system back together (1:45)

- A. Recap (0:45)
  1. Convert the prompt into a text embedding.
  2. Initialize a latent by sampling random noise.
  3. The model repeatedly denoises the latent while being guided by the text.
  4. The final latent is decoded into the image pixels.
- B. Live demo (0:45): take a prompt from the audience and watch it denoise step by step.
- C. Close (0:15): answer the opening question. Nothing was searched or combined; the image was denoised out of random noise.
