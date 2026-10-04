export interface Beat {
  /** Stable id, used in the URL hash. */
  id: string
  /** Section numeral, a key of `sections`. */
  section: string
  /** Reference into outline.md. */
  ref: string
  /** The text on screen. Words wrapped in asterisks take the accent colour. */
  headline: string
  /** What the presenter says during this beat. */
  say: string
  /** What the beat shows, for the storyboard view. */
  visual: string
  /** Time budget in seconds. Sections sum to the budgets in outline.md. */
  seconds: number
}

export const sections: Record<string, string> = {
  I: 'Introduction',
  II: 'How the denoising process works',
  III: 'Controlling it with a prompt',
  IV: 'Why not generate pixels directly?',
  V: 'Putting the system back together',
}

export const beats: Beat[] = [
  // I. Introduction (0:50)
  {
    id: '1',
    section: 'I',
    ref: 'I.A',
    headline: 'What happens when you type a prompt?',
    say: 'Rhetorical question. Pause for a second, take no answers.',
    visual: 'Title card, then a prompt being typed into a box and an image appearing.',
    seconds: 20,
  },
  {
    id: '2',
    section: 'I',
    ref: 'I.B',
    headline: 'It does *not* search for images and combine them.',
    say: 'The system does not look up existing images and paste them together.',
    visual: 'Real photographs pop in. A lighthouse, a cliff and the sea are cut out of them and stacked on a sunset sky, then the collage is struck out.',
    seconds: 15,
  },
  {
    id: '3',
    section: 'I',
    ref: 'I.C',
    headline: 'It learns to remove *noise.*',
    say: 'The system learns a denoising process. Everything else builds on that.',
    visual: 'The word "denoising" resolving out of static.',
    seconds: 15,
  },

  // II. How the denoising process works (4:20)
  {
    id: '4',
    section: 'II',
    ref: 'II.A',
    headline: 'Take an image. Add *noise.* Repeat.',
    say: 'To a computer an image is a grid of numbers, so adding noise means adding random numbers. We do that repeatedly until it is almost pure noise.',
    visual: 'The Obama portrait noised in steps along a strip. Real Gaussian noise, computed live in a canvas.',
    seconds: 25,
  },
  {
    id: '5',
    section: 'II',
    ref: 'II.B.1',
    headline: 'Training: make noisy *examples.*',
    say: 'Take an image, pick a random noise level, and add that much noise.',
    visual: 'An image, a noise-level dial spinning to a random value, and the noised result.',
    seconds: 25,
  },
  {
    id: '6',
    section: 'II',
    ref: 'II.B.2',
    headline: 'The model predicts the *noise.*',
    say: 'Input: the noisy image and the noise level. Output: the noise that was added. We added that noise ourselves, so we can compare. Untrained, the prediction is simply wrong.',
    visual: 'Noisy image and noise level go into the model, predicted noise comes out. It is compared with the noise that was really added, and the difference between the two is large.',
    seconds: 17,
  },
  {
    id: '7',
    section: 'II',
    ref: 'II.B.3',
    headline: 'Training shrinks the *difference.*',
    say: 'Training nudges the model so that its prediction is closer to the noise that was really added. It does this over millions of images at every noise level, so the difference gets small on average, never zero.',
    visual: 'The difference picture goes dark and a difference curve falls; then other images and noise levels take their turn, and the curve keeps falling.',
    seconds: 13,
  },
  {
    id: '8',
    section: 'II',
    ref: 'II.C.1',
    headline: 'Can we go backwards? With a little noise, *yes.*',
    say: 'Now use the model. With a little noise its prediction is nearly right: subtract it, and we get back almost exactly what we started with.',
    visual: 'The portrait at 32% noise, an arrow, and what the model really gives back: nearly the original.',
    seconds: 20,
  },
  {
    id: '9',
    section: 'II',
    ref: 'II.C.2',
    headline: 'With a lot of noise, *no.*',
    say: 'With a lot of noise, many different images could be underneath, and the model cannot know which. Run it several times and it gives a different person each time.',
    visual: 'The portrait at 72% noise, taken back by the model four times with no prompt: four different men, none of them him.',
    seconds: 30,
  },
  {
    id: '10',
    section: 'II',
    ref: 'II.C.3',
    headline: 'One big guess gives a *blur.*',
    say: 'A single guess from heavy noise is the average of all the images it could be.',
    visual: 'The candidates from the previous beat collapsing into their blurry average.',
    seconds: 25,
  },
  {
    id: '11',
    section: 'II',
    ref: 'II.C.4',
    headline: 'So subtract only *a bit.*',
    say: 'So we do not trust the prediction all the way. We subtract only a bit of it, and get an image that is slightly less noisy. One step barely changes anything.',
    visual: "The noisy portrait, minus a bit of the predicted noise, equals the model's real next state, which looks almost the same.",
    seconds: 20,
  },
  {
    id: '12',
    section: 'II',
    ref: 'II.C.5',
    headline: 'And repeat: *small steps.*',
    say: 'Then we ask the model again from the new image, and again. Each step is small; together they get from noise to a picture.',
    visual: 'The two frames of the equation become the start of a strip, and the rest of the run follows: the real states from the noisy portrait to a result.',
    seconds: 20,
  },
  {
    id: '13',
    section: 'II',
    ref: 'II.D.1',
    headline: 'Now start from *pure noise.*',
    say: 'There is no original image behind it at all.',
    visual: 'A frame of pure static, with "no original image" called out.',
    seconds: 20,
  },
  {
    id: '14',
    section: 'II',
    ref: 'II.D.2',
    headline: 'Repeat, and an image *appears.*',
    say: 'Apply the model again and again, and an image that never existed emerges.',
    visual: 'A recorded denoising run of about 30 steps, with a step counter ticking.',
    seconds: 25,
  },
  {
    id: '15',
    section: 'II',
    ref: 'II.E',
    headline: 'It fills in from what it has *seen.*',
    say: 'From even more noise, this model returns an anime character, because it was trained on anime. A photo-trained model returns a realistic man. Neither is the original. It has learned patterns from its training images, not copies, and that is where training data bias comes from.',
    visual: 'The portrait at 86% noise, with no prompt, through two models side by side: an anime character from the anime model, a realistic man from the photo model.',
    seconds: 20,
  },

  // III. Controlling it with a prompt (1:45)
  {
    id: '16',
    section: 'III',
    ref: 'III.A',
    headline: 'Train with the *caption* too.',
    say: 'The input becomes the noisy image, the noise level and the caption.',
    visual: 'The model box from Section II gains a third input: a caption.',
    seconds: 35,
  },
  {
    id: '17',
    section: 'III',
    ref: 'III.B',
    headline: 'The text steers *every step.*',
    say: 'The caption is an input to the model, so it changes the predicted noise a little at every step. Same noise, same model, different text: the runs start alike and drift apart.',
    visual: 'One starting noise and three prompts. The real states of the three runs appear step by step, alike at first and then drifting apart into three images.',
    seconds: 45,
  },
  {
    id: '18',
    section: 'III',
    ref: 'III.C',
    headline: 'The prompt becomes *numbers.*',
    say: 'One sentence: a text encoder turns the prompt into numbers the model can use, called a text embedding.',
    visual: 'Prompt words turning into a row of numbers that feeds the model box.',
    seconds: 25,
  },

  // IV. Why not generate pixels directly? (0:45)
  {
    id: '19',
    section: 'IV',
    ref: 'IV.A',
    headline: 'Work on a *compressed* image.',
    say: 'An encoder compresses the image into a much smaller latent, and a decoder turns it back. Here 512×512×3 becomes 64×64×16, about 12× fewer values.',
    visual: 'An image squeezed through an encoder into a small latent block and back out through a decoder. "12× fewer values".',
    seconds: 25,
  },
  {
    id: '20',
    section: 'IV',
    ref: 'IV.B',
    headline: 'Denoise the latent, *decode once.*',
    say: 'The denoising happens on the latent, so there is far less computation. The earlier pictures were pixels for intuition.',
    visual: 'The denoising loop running on the small latent, decoded to pixels only at the end.',
    seconds: 20,
  },

  // V. Putting the system back together (1:45)
  {
    id: '21',
    section: 'V',
    ref: 'V.A',
    headline: 'The *whole* system.',
    say: 'Prompt to text embedding. A latent of random noise. Repeated denoising guided by the text. Decode to pixels.',
    visual: 'The full pipeline assembling in four stages.',
    seconds: 45,
  },
  {
    id: '22',
    section: 'V',
    ref: 'V.B',
    headline: 'Live: *your* prompt.',
    say: 'Take a prompt from the audience, type it, and watch it denoise step by step.',
    visual: 'A prompt box and a large frame. 8 steps streamed from the home GPU; a recorded run plays if the connection is down.',
    seconds: 45,
  },
  {
    id: '23',
    section: 'V',
    ref: 'V.C',
    headline: 'Nothing was searched. Nothing was *combined.*',
    say: 'Answer the opening question: the image was denoised out of random noise.',
    visual: 'Callback to the struck-out collage from the introduction, replaced by the denoised image.',
    seconds: 15,
  },
]

/** The on-screen headline of a beat. */
export function title(id: string) {
  return beats.find((beat) => beat.id === id)!.headline
}
