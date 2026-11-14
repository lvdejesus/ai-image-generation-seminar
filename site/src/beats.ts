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

/** The three ideas of the talk, in the order the talk adds them. */
export const ideas = ['Remove noise in small steps', 'The text steers every step', 'Work on a compressed image']

export const beats: Beat[] = [
  // I. Introduction (1:00)
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
    say: 'It learns to remove noise. The static from the first slide becomes the image for that prompt, step by step. That is what the whole talk explains.',
    visual: 'The collage clears. The static from beat 1 resolves, real state by real state, into the lighthouse for the prompt typed in beat 1.',
    seconds: 15,
  },
  {
    id: '4',
    section: 'I',
    ref: 'I.D',
    headline: 'How it works, in *three ideas.*',
    say: 'How it works, in three ideas. One: remove noise in small steps. Two: the text steers every step. Three: work on a compressed image. We start with idea one: how does the model learn to remove noise?',
    visual: 'The lighthouse moves to the left, and the three ideas appear next to it, numbered.',
    seconds: 10,
  },

  // II. How the denoising process works (5:12)
  {
    id: '5',
    section: 'II',
    ref: 'II.A.1',
    headline: 'To a computer, an image is *numbers.*',
    say: 'To a computer an image is a grid of numbers: three numbers for each pixel, for red, green and blue.',
    visual: 'The Obama portrait, and a patch of its real pixels as numbers: a red, a green and a blue value for each pixel.',
    seconds: 8,
  },
  {
    id: '6',
    section: 'II',
    ref: 'II.A.2',
    headline: 'Noise is *random numbers.*',
    say: 'Noise is random numbers. Add the two, and we get a noisy image.',
    visual: 'Random numbers, one for each red, green and blue value, are added to the pixel numbers. The sum is the noisy pixels, and then the noisy portrait.',
    seconds: 12,
  },
  {
    id: '7',
    section: 'II',
    ref: 'II.A.3',
    headline: 'Noise has *levels.*',
    say: 'Less noise means more of the image is left, and more noise means less of the image is left.',
    visual: "The portrait and the noisy portrait take their places in a strip of noise levels, from the original to 96% noise: the model's real noisy inputs, decoded.",
    seconds: 15,
  },
  {
    id: '8',
    section: 'II',
    ref: 'II.B.1',
    headline: 'Training: collect *captioned images.*',
    say: 'Training starts with a collection. We look for captioned images: images with text that says what is in them. Millions to billions of them, mostly from the internet.',
    visual: 'Rows of images, each with a short caption, scroll past and pull together into one stack of training images.',
    seconds: 10,
  },
  {
    id: '9',
    section: 'II',
    ref: 'II.B.2',
    headline: 'Training: make noisy *examples.*',
    say: 'Take one image, pick a random noise level, and add that much noise.',
    visual: 'An image, a noise-level dial spinning to a random value, and the noised result.',
    seconds: 25,
  },
  {
    id: '10',
    section: 'II',
    ref: 'II.B.3',
    headline: 'The model guesses the *clean image.*',
    say: 'Input: the noisy image, the noise level, and the caption. A text encoder turns the caption into numbers the model can use. Output: a guess of the clean image. We have the original, so we can compare. Untrained, the guess is simply wrong.',
    visual: 'The noisy image, its noise level and its caption go into the model; the caption goes through a text encoder and comes out as a row of numbers. A guess of the clean image comes out. It is compared with the original, and the difference between the two is large.',
    seconds: 22,
  },
  {
    id: '11',
    section: 'II',
    ref: 'II.B.4',
    headline: 'Training shrinks the *difference.*',
    say: 'Training nudges the model so that its guess is closer to the original. It does this over millions of images at every noise level, so the difference gets small on average, but never zero: from heavy noise, the best guess is soft.',
    visual: 'The guess settles into a soft version of the original, the difference picture goes dark and a difference curve falls; then other images, captions and noise levels take their turn, and the curve keeps falling.',
    seconds: 13,
  },
  {
    id: '12',
    section: 'II',
    ref: 'II.C.1',
    headline: 'A little noise: the guess is *good.*',
    say: 'Now use the trained model. From a little noise, its guess is good: we get back almost exactly what we started with.',
    visual: 'The portrait at 32% noise, an arrow, and what the model really gives back: nearly the original.',
    seconds: 20,
  },
  {
    id: '13',
    section: 'II',
    ref: 'II.C.2',
    headline: 'A lot of noise: the guess is *bad.*',
    say: 'From a lot of noise, it cannot be good: many different images could be underneath. Add this much noise to four different men, and they all look the same. Ask the room: which of the four is under the noisy portrait? Pause. Nobody can tell, and the model cannot either.',
    visual: 'The portrait at 72% noise. Four different men appear clean, then all get the same heavy noise and look alike, with arrows to the noisy portrait.',
    seconds: 30,
  },
  {
    id: '14',
    section: 'II',
    ref: 'II.C.3',
    headline: 'Not sure? Play it *safe.*',
    say: 'The model must give one guess for all four. A game: I think of 0 or 100. You say one number, and you pay for how far off you are; a big miss costs a lot more. What do you say? Fifty: never far off. The model plays this game for every pixel, so its guess is the average of everything it could be: a soft face.',
    visual: "The four men, clean again, pile up into their average, then the model's real one-step guess from the noisy portrait. Below, one pixel on a number line from dark to bright: dark in one answer, bright in another; the safe guess slides to the middle.",
    seconds: 30,
  },
  {
    id: '15',
    section: 'II',
    ref: 'II.C.4',
    headline: 'Less hint, a safer *guess.*',
    say: 'Less hint, safer guess. From pure noise there is no hint at all: only the caption. That is a model that turns a caption straight into an image, and all it can give is what every such picture shares: a man in a dark suit, no face. With no text at all, every pixel plays safe: grey.',
    visual: "Three real guesses in a row: from 72% noise, a soft man; from pure noise with the caption only, a ghostly man in a dark suit; from pure noise with no text, almost flat grey.",
    seconds: 12,
  },
  {
    id: '16',
    section: 'II',
    ref: 'II.C.5',
    headline: 'So move only *a bit.*',
    say: 'So we do not trust the guess all the way. We move the noisy image only a small step toward it, and get an image that is slightly less noisy. One step barely changes anything.',
    visual: "The noisy portrait, plus a bit of the guess, equals the model's real next state, which looks almost the same.",
    seconds: 20,
  },
  {
    id: '17',
    section: 'II',
    ref: 'II.C.6',
    headline: 'And repeat: *small steps.*',
    say: 'Then ask again from the new image. With less noise, fewer images fit, so the guess gets sharper. Step by step, the run settles on one image.',
    visual: 'The two frames of the equation become the start of a strip, and the rest of the run follows: the real states from the noisy portrait to a result.',
    seconds: 20,
  },
  {
    id: '18',
    section: 'II',
    ref: 'II.D.1',
    headline: 'Now start from *pure noise.*',
    say: 'There is no original image behind it at all.',
    visual: 'A frame of pure static, with "no original image" called out.',
    seconds: 20,
  },
  {
    id: '19',
    section: 'II',
    ref: 'II.D.2',
    headline: 'Repeat, and an image *appears.*',
    say: 'Apply the model again and again, and an image that never existed emerges. Different starting noise, a different image.',
    visual: 'A recorded denoising run of about 30 steps, with a step counter ticking.',
    seconds: 25,
  },
  {
    id: '20',
    section: 'II',
    ref: 'II.E',
    headline: 'It fills in from what it has *seen.*',
    say: 'From even more noise, this model returns an anime character, because it was trained on anime. A photo-trained model returns a realistic man. Neither is the original. It has learned patterns from its training images, not copies, and that is where training data bias comes from.',
    visual: 'The portrait at 86% noise, with the same prompt, through two models side by side: an anime character from the anime model, a realistic man from the photo model.',
    seconds: 20,
  },
  {
    id: '21',
    section: 'II',
    ref: 'II.F',
    headline: 'So far: *one idea.*',
    say: 'So far, one idea: start from random noise and remove it in small steps, with the same model about 30 times. The prompt is there, but we have not said yet what it does.',
    visual: 'The diagram that grows through the talk, first stage: random noise, the model × 30, the image, under idea 1. The prompt chip stands alone at the top right.',
    seconds: 10,
  },
  {
    id: '22',
    section: 'III',
    ref: 'III.A.1',
    headline: 'No text: *some* image.',
    say: 'First, the same model with no text at all. From this noise it still makes an image, step by step, but not one we chose.',
    visual: 'One starting noise, the chip "no text", and the real states of that run in one row, ending in an anime girl with a red bag. "An image, but not one we chose."',
    seconds: 15,
  },

  // III. Controlling it with a prompt (0:55)
  {
    id: '23',
    section: 'III',
    ref: 'III.A.2',
    headline: 'The text steers *every step.*',
    say: 'Now the same noise with text. Remember the caption input from training. It changes the guess a little at every step. Same noise, same model, different text: the runs start alike and drift apart.',
    visual: 'One starting noise and three prompts. The real states of the three runs appear step by step, alike at first and then drifting apart into three images.',
    seconds: 30,
  },
  {
    id: '24',
    section: 'III',
    ref: 'III.B',
    headline: 'So far: *two ideas.*',
    say: 'Idea two joins the diagram: the prompt goes through the text encoder, and its numbers steer every step.',
    visual: 'The same diagram comes back. The prompt chip moves into a prompt box, and a text row grows above it: the text encoder, the numbers, and a line into the model. Idea 2 appears.',
    seconds: 10,
  },

  // IV. Why not generate pixels directly? (1:20)
  {
    id: '25',
    section: 'IV',
    ref: 'IV.A.1',
    headline: 'Spot the *difference.*',
    say: 'Ask the room: what is the difference between these two? Pause.',
    visual: 'The lighthouse twice, side by side, with no labels.',
    seconds: 5,
  },
  {
    id: '26',
    section: 'IV',
    ref: 'IV.A.2',
    headline: 'Pixels are full of detail we *cannot see.*',
    say: 'To us, there is no difference. To the model, almost every one of their numbers is different. In pixels, the model spends its work on detail we cannot see.',
    visual: 'The two pictures get their labels; the second has a tiny random change on every pixel, too small to see. Both zoom into the same 4×4 patch until the pixels are large squares, and each pixel shows its red, green and blue values: almost every number differs.',
    seconds: 15,
  },
  {
    id: '27',
    section: 'IV',
    ref: 'IV.B',
    headline: 'Train a *compressor.*',
    say: 'So we train a model that compresses an image into something much smaller, and decompresses it back. We compare what comes back with the original, judged on how it looks. Differences we cannot see cost almost nothing, so it learns to drop them. A bit like a JPEG, but learned. The two halves are called the encoder and the decoder. Here 512×512×3 becomes 64×64×16, about 12× fewer values. What comes back is not exact, and it does not need to be.',
    visual: 'An image through a compressor into the real latent ("12× fewer values") and back out through a decompressor, then an arc back to the original: "Compare with the original: does it look the same?" Under it: differences we cannot see cost almost nothing; a bit like a JPEG, but learned.',
    seconds: 25,
  },
  {
    id: '28',
    section: 'IV',
    ref: 'IV.C',
    headline: 'The noise goes into the *latent.*',
    say: 'Then we use it. The noise is added to the latent, not to the pixels. Noise added to the pixels looks like fine grain; noise added to the latent and decoded looks like this. The noisy pictures from the model in this talk were noisy latents, decoded.',
    visual: 'The portrait twice: with noise added to the pixels (fine grain, the simple version from beat 5), and with noise added to the latent and decoded (blotchy colour, the model\'s real input).',
    seconds: 15,
  },
  {
    id: '29',
    section: 'IV',
    ref: 'IV.D',
    headline: 'Denoise the latent, *decode once.*',
    say: 'Idea three joins the diagram. The model works on the latent, not on pixels, so there is far less computation. The noise is a random latent, the model removes it in small steps, and only the final latent goes through the decompressor, once.',
    visual: 'The same diagram comes back. The coloured noise turns into a random latent; the long arrow from the model splits, and a clean latent and the decompressor from beat 27 appear before the image. Idea 3 appears.',
    seconds: 20,
  },

  // V. Putting the system back together (1:25)
  {
    id: '30',
    section: 'V',
    ref: 'V.A',
    headline: 'The *whole* system: *three ideas.*',
    say: 'The whole system, in three ideas. Remove noise in small steps. The text steers every step. Work on a compressed image.',
    visual: 'The finished diagram. Everything dims, then each idea lights up with its parts, one after the other.',
    seconds: 25,
  },
  {
    id: '31',
    section: 'V',
    ref: 'V.B',
    headline: 'Live: *your* prompt.',
    say: 'Take a prompt from the audience, type it, and watch it denoise step by step.',
    visual: 'A prompt box and a large frame. 8 steps streamed from the home GPU; a recorded run plays if the connection is down.',
    seconds: 45,
  },
  {
    id: '32',
    section: 'V',
    ref: 'V.C',
    headline: 'Nothing was searched. Nothing was *combined.*',
    say: 'Answer the opening question: nothing was searched and nothing was combined. The image was denoised out of random noise, with three ideas.',
    visual: 'Callback to the struck-out collage from the introduction, the denoised image next to it, and the three ideas.',
    seconds: 15,
  },
]

/** The on-screen headline of a beat. */
export function title(id: string) {
  return beats.find((beat) => beat.id === id)!.headline
}
