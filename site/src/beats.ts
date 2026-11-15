export interface Beat {
  /** Stable id, used in the URL hash. */
  id: string
  /** Section numeral, a key of `sections`, or '' for the title page and the end (the demo). */
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
  II: 'Teaching a model to remove noise',
  III: 'Why the predictions blur',
  IV: 'Generating from pure noise',
  V: 'Do we need to generate pixel by pixel?',
}

/** A section page: the first beat of a section, which shows its numeral and title large. Its ref is the bare numeral. */
export const isSectionPage = (beat: Beat) => beat.section !== '' && beat.ref === beat.section

/** The three ideas of the talk, in the order the talk adds them. */
export const ideas = ['Remove noise in small steps', 'The text steers every step', 'Work on a compressed image']

export const beats: Beat[] = [
  // Title page: on screen before the talk starts, so it has no time budget.
  {
    id: '0',
    section: '',
    ref: 'Title',
    headline: 'How AI-generated images are *made*',
    say: 'Nothing. This is on screen while the audience sits down.',
    visual: 'The title, the presenter name, and four real steps of the lighthouse run, from pure noise to the image.',
    seconds: 0,
  },
  // I. Introduction
  {
    id: 'sI',
    section: 'I',
    ref: 'I',
    headline: 'Introduction',
    say: 'Nothing; the next beat starts the talk.',
    visual: 'The section page: the numeral I and the section title, large.',
    seconds: 3,
  },
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
    headline: 'How it *works.*',
    say: 'How it works, from start to end. Random noise goes into a model, about 30 times. A decompressor turns the result into the image. The prompt goes through a text encoder, and its numbers steer the model. We start with the model. How does it learn to remove noise?',
    visual: 'The whole system as one diagram, with plain labels and no idea numbers: random noise, the model × 30, the compressed image, the decompressor and the image, which comes out of the noise. Above them, the prompt, the text encoder and its numbers, with a line into the model.',
    seconds: 20,
  },

  // II. Teaching a model to remove noise
  {
    id: 'sII',
    section: 'II',
    ref: 'II',
    headline: 'Teaching a model to remove noise',
    say: 'Teaching a model to remove noise.',
    visual: 'The section page: the numeral II and the section title, large.',
    seconds: 3,
  },
  {
    id: '5',
    section: 'II',
    ref: 'II.A',
    headline: 'Collect *captioned images.*',
    say: 'Training starts with a collection. We look for captioned images: images with text that says what is in them. Millions to billions of them, mostly from the internet.',
    visual: 'Two rows of captioned images scroll past and stop, then pull together into one large stack of training images.',
    seconds: 10,
  },
  {
    id: '6',
    section: 'II',
    ref: 'II.B.1',
    headline: 'To a computer, an image is *numbers.*',
    say: 'Take one of them. To a computer an image is a grid of numbers: three numbers for each pixel, for red, green and blue.',
    visual: 'The stack goes. The cat from the stack, large. Then a 3×3 patch of its real pixels grows out of it as numbers: a red, a green and a blue value for each pixel.',
    seconds: 8,
  },
  {
    id: '7',
    section: 'II',
    ref: 'II.B.2',
    headline: 'The caption becomes *numbers.*',
    say: 'The model computes with numbers, so the caption must become numbers too. A text encoder does this. It is a separate model, trained before. The same caption always gives the same numbers. A real text encoder gives hundreds of numbers for each word. Here we show five.',
    visual: 'The cat and its numbers go. The caption of the image comes in large, goes through the text encoder, and a row of numbers comes out.',
    seconds: 15,
  },
  {
    id: '8',
    section: 'II',
    ref: 'II.C.1',
    headline: 'Noise is *random numbers.*',
    say: 'Now add noise. Noise is random numbers. Add them to the pixel numbers, and we get a noisy image.',
    visual: 'The caption row goes. The pixel numbers come back; random numbers, one for each red, green and blue value, are added to them, and the sum is the noisy pixels. Then the cat and the noisy cat stand side by side, joined by "+ noise".',
    seconds: 12,
  },
  {
    id: '9',
    section: 'II',
    ref: 'II.C.2',
    headline: 'Pick a random *noise level.*',
    say: 'How much noise? We pick a random level. Less noise leaves more of the image, and more noise leaves less of it, up to almost pure noise.',
    visual: 'The stack comes back small, and one image comes out of it. A noise-level dial swings about; the noisy version follows it, from almost clean to almost pure noise, and the dial lands on a random value.',
    seconds: 25,
  },
  {
    id: '10',
    section: 'II',
    ref: 'II.D.1',
    headline: 'The model predicts the *clean image.*',
    say: 'Input: the noisy image, the noise level, and the caption as numbers. Output: a prediction of the clean image. We have the original, so we can compare. Untrained, the prediction is simply wrong.',
    visual: 'The caption row comes back at the top. The noisy image and its noise level go into the model, and the caption numbers go in from above. A large prediction of the clean image comes out. It makes room, and is compared with the original; the difference between the two is large.',
    seconds: 22,
  },
  {
    id: '11',
    section: 'II',
    ref: 'II.D.2',
    headline: 'Training *corrects* the prediction.',
    say: 'Training nudges the model so that its prediction is closer to the original. It does this over millions of images at every noise level, so the difference gets small on average, but never zero: from heavy noise, the best prediction is soft.',
    visual: 'A gear on the model turns while it trains. The prediction settles into a soft version of the original and the difference picture goes dark; then other images, captions and noise levels take their turn.',
    seconds: 13,
  },
  {
    id: '12',
    section: 'II',
    ref: 'II.D.3',
    headline: 'The model keeps *patterns,* not images.',
    say: 'After training, are the images inside the model? Take Stable Diffusion 1.5, a well-known model. It learned from about 2.3 billion images, around 100 terabytes. The model file is about 2 gigabytes: drawn to the same scale, it is this dot. The images are not stored anywhere in it. What the training leaves behind is the numbers of the model, and those numbers encode patterns.',
    visual: 'A block made of tiny training images, labelled with the Stable Diffusion 1.5 figures, and the model drawn to the same scale by area: a dot. The images fade; the dot stays.',
    seconds: 25,
  },
  {
    id: '13',
    section: 'II',
    ref: 'II.D.4',
    headline: 'Can one run make an *image?*',
    say: 'So the model is trained. Can we give it pure noise and a caption, and run it once to get an image? No. From pure noise, the prediction is a blur. Why?',
    visual: 'The block and the dot go. Pure noise goes into the model, with the caption "a man in a suit and tie, smiling" from above. One run, and the real prediction comes out: a blurry man in a dark suit, with no face.',
    seconds: 8,
  },
  // III. Why the predictions blur
  {
    id: 'sIII',
    section: 'III',
    ref: 'III',
    headline: 'Why the predictions blur',
    say: 'Why the predictions blur.',
    visual: 'The section page: the numeral III and the section title, large.',
    seconds: 3,
  },
  {
    id: '14',
    section: 'III',
    ref: 'III.A',
    headline: 'Images can have the *same* caption.',
    say: "Many training images share the same caption. Here are two real photos, and both fit the caption \"a man in a suit and tie, smiling\". Add 100% noise to both, and the two inputs look the same. So in training, the model gets the same input twice, with two different right answers. If it outputs the first man, it is wrong for the second photo. If it outputs the second man, it is wrong for the first. Whichever man it outputs, it is wrong half of the time.",
    visual: "The caption chip and two real photos: two different men. The photos move to the right and become the two originals. The rest of the training diagram pops in: the input at 100% noise, the model with its training gear, and the caption from above; a tag says \"During training\". The output shows the first man: an error bar on each original shows none for the first and a long one for the second, and an overall error bar fills. Then it shows the second man: the bars swap, and the overall error stays the same.",
    seconds: 35,
  },
  {
    id: '15',
    section: 'III',
    ref: 'III.B',
    headline: 'The *average* minimizes the error.',
    say: "And it is not only two photos. Many images fit this caption, and from pure noise, each one of them is a right answer. Whichever man the model outputs, it is wrong for all the others. Training lowers this error. The output with the lowest error over all of them is their average, so training pulls the output there. After training, this is the model's real prediction from pure noise: a blurry man in a dark suit.",
    visual: "The training diagram stays, with its tag and gear. The two originals move into a group of seven official portraits that all fit the caption; each gets an error bar for the second man in the output, and the overall error grows. Then the gear turns: copies of the photos merge into the output one after the other, so the output is the exact average of the photos so far, and the overall error goes down at every step (real errors, measured on the pixels). Then the bars, the tag and the gear go, and the output becomes the model's real prediction after training: a blurry man in a dark suit.",
    seconds: 30,
  },
  {
    id: '16',
    section: 'III',
    ref: 'III.C',
    headline: 'Little noise gives the *right image.*',
    say: "Now the same model, with the same caption, but only 32% noise on the first photo. The input still shows which man it is, so only one image fits. The best output is that image, and the prediction is almost exactly the original photo. The same happens with the second photo.",
    visual: "The same diagram. The input becomes the first photo with 32% noise, the prediction becomes that photo, and the second original dims. Then the same with the second photo.",
    seconds: 20,
  },
  {
    id: '17',
    section: 'III',
    ref: 'III.D',
    headline: 'More noise, *blurrier* predictions.',
    say: "So the more noise, the more images fit, and the blurrier the average. From 72% noise, the noise left the large shapes, so all fitting images share them and the average blurs the fine detail. From pure noise with the caption only, every picture of a man in a suit fits. The average keeps what they share: a dark suit, no face. With no text at all, every image fits. The average of everything it learned from is flat grey-brown.",
    visual: "Four real predictions in a row: from 32% noise, the photo; from 72% noise, a soft man; from pure noise with the caption only, a blurry man in a dark suit; from pure noise with no text, almost flat grey.",
    seconds: 25,
  },
  {
    id: '18',
    section: 'III',
    ref: 'III.E',
    headline: 'How do we get a *sharp* image?',
    say: 'One run from pure noise gives a blur, but from little noise the prediction is sharp. How do we get from pure noise to a sharp image?',
    visual: 'The row of predictions goes, except two: the blur from pure noise and the caption moves to the left, and the sharp prediction from 32% noise moves to the right. An arrow with a question mark joins them.',
    seconds: 8,
  },
  // IV. Generating from pure noise
  {
    id: 'sIV',
    section: 'IV',
    ref: 'IV',
    headline: 'Generating from pure noise',
    say: 'Generating from pure noise.',
    visual: 'The section page: the numeral IV and the section title, large.',
    seconds: 3,
  },
  {
    id: '19',
    section: 'IV',
    ref: 'IV.A.1',
    headline: 'Now start from *pure noise.*',
    say: 'Now generate. Start with pure noise.',
    visual: 'A frame of pure static, the start of the real car run.',
    seconds: 10,
  },
  {
    id: '20',
    section: 'IV',
    ref: 'IV.A.2',
    headline: 'Many cars fit, so the results *vary.*',
    say: "Take pure noise and the prompt: a sports car on a city street. What colour will the car be? Here are twelve cars this model made, each one from different pure noise. Soon we see how. For now, look at their colours: red, black, white, grey, green. All of them fit. Put each on the colour wheel, by the colour inside the box. They land all over the wheel: from pure noise, the results vary a lot. And the model's own prediction is a muddy ghost of a car, the same as the blurry man from pure noise.",
    visual: "The car's pure noise moves aside, with a box on the car, and a colour wheel. The twelve real results from pure noise, labelled \"12 runs, each from new noise\", come in large, three at a time, and each one shrinks into its dot on the wheel, by the colour inside the box. They spread over the wheel. The model's own prediction appears beside the noise, a muddy ghost of a car, and its mark lands on the wheel.",
    seconds: 30,
  },
  {
    id: '21',
    section: 'IV',
    ref: 'IV.A.3',
    headline: 'So take only a *small step* toward it.',
    say: 'From pure noise, the prediction is the muddy blur. So we do not jump all the way to it. We move the noisy image only a small step toward it, and get an image that is slightly less noisy. One step barely changes anything.',
    visual: 'The car\'s pure noise, plus a bit of the model\'s muddy prediction, equals the real state after one step, which looks almost the same.',
    seconds: 20,
  },
  {
    id: '22',
    section: 'IV',
    ref: 'IV.A.4',
    headline: 'With less noise, the results vary *less.*',
    say: 'Then repeat. Back to the colour wheel and its twelve results from pure noise. Let this run go 18 steps, and watch the prediction. A red patch shows through the noise, and the prediction turns into a red car. Twelve results from here: nearly all red. Fewer answers fit, so the results vary much less. It looks nothing up: what is already in the image rules answers out.',
    visual: 'The run\'s frame with the box and a step counter, the model\'s prediction beside it, and the colour wheel with the dots of the first round. The counter runs to step 18; the prediction, recorded at every step, turns from a muddy blur into a red car, and its mark on the wheel follows. Then twelve results from step 18 come in three at a time and land close together in the red, beside the prediction.',
    seconds: 30,
  },
  {
    id: '23',
    section: 'IV',
    ref: 'IV.A.5',
    headline: 'Repeat, and an image *appears.*',
    say: 'Keep going. With every step the noise goes down and the prediction gets sharper. At the last step the two are the same: an image that never existed. Different starting noise, a different image.',
    visual: 'The run and the model\'s prediction side by side, from step 18 to 30, with a step counter: the run loses its noise, the prediction sharpens, and they end as the same image.',
    seconds: 25,
  },
  {
    id: '24',
    section: 'IV',
    ref: 'IV.B',
    headline: 'It fills in with the patterns it *learned.*',
    say: 'From even more noise, this model returns an anime character, because it was trained on anime. A photo-trained model returns a realistic man. Neither is the original, and neither looks anything up. Each fills in with the patterns it learned, and that is where training data bias comes from.',
    visual: 'The portrait at 86% noise in the middle, with the same prompt. The anime model takes it to the left and gives an anime character. The photo model takes it to the right and gives a realistic man.',
    seconds: 20,
  },
  {
    id: '25',
    section: 'IV',
    ref: 'IV.C',
    headline: 'The *first* idea.',
    say: 'The first idea. Start from random noise and remove it in small steps, with the same model about 30 times. The prompt is there too, and it goes into the model at every step. What does it do there?',
    visual: 'The diagram that grows through the talk, first stage: random noise, the model × 30, the image, under idea 1. The prompt chip sits under the headline.',
    seconds: 12,
  },

  {
    id: '26',
    section: 'IV',
    ref: 'IV.D',
    headline: 'The text steers *every step.*',
    say: 'Take one starting noise and add text. Remember the caption input from training. It changes the prediction a little at every step. Same noise, same model, different text: the runs start alike and drift apart.',
    visual: 'One starting noise and three prompts. Each run plays large, one at a time: its prompt, the real states, and the result. Then the three runs shrink into rows side by side, alike at first and then drifting apart.',
    seconds: 30,
  },
  {
    id: '27',
    section: 'IV',
    ref: 'IV.E',
    headline: 'The *second* idea.',
    say: 'The second idea. The prompt goes through the text encoder, and its numbers steer every step.',
    visual: 'The same diagram comes back. The prompt chip moves into a prompt box, and a text row grows above it: the text encoder, the numbers, and a line into the model. Idea 2 appears.',
    seconds: 10,
  },
  {
    id: '28',
    section: 'IV',
    ref: 'IV.F',
    headline: 'Do we need *every pixel?*',
    say: 'At each of the 30 steps, the model works on every pixel. That is 512 × 512 × 3, almost 800,000 numbers. Do we need all of them?',
    visual: 'The diagram stays. The text row dims. Under the noise and under the image, the same label rises: 512 × 512 × 3 numbers.',
    seconds: 8,
  },

  // V. Do we need to generate pixel by pixel?
  {
    id: 'sV',
    section: 'V',
    ref: 'V',
    headline: 'Do we need to generate pixel by pixel?',
    say: 'Do we need to generate pixel by pixel?',
    visual: 'The section page: the numeral V and the section title, large.',
    seconds: 3,
  },
  {
    id: '29',
    section: 'V',
    ref: 'V.A.1',
    headline: 'Spot the *difference.*',
    say: 'Ask the room: what is the difference between these two? Pause.',
    visual: 'The lighthouse twice, side by side, with no labels.',
    seconds: 5,
  },
  {
    id: '30',
    section: 'V',
    ref: 'V.A.2',
    headline: 'Images are full of detail we *cannot see.*',
    say: 'To us, there is no difference. To the model, almost every one of their numbers is different. In pixels, the model spends its work on detail we cannot see.',
    visual: 'First an equals sign between the two pictures; then, on the next key, the two pictures get their labels; the second has a tiny random change on every pixel, too small to see. Both zoom into the same 4×4 patch until the pixels are large squares, and each pixel shows its red, green and blue values. Then every value of the changed picture that differs from the image is marked in the accent colour: almost all of them.',
    seconds: 15,
  },
  {
    id: '31',
    section: 'V',
    ref: 'V.B',
    headline: 'Train a *compressor.*',
    say: 'So we train a model that compresses an image into something much smaller, and decompresses it back. We compare what comes back with the original, judged on how it looks. At first what comes back is only noise. Training adjusts both halves, the same way as the denoising model, until it looks like the original. Differences we cannot see cost almost nothing, so it learns to drop them. A bit like a JPEG, but learned. The two halves are called the encoder and the decoder. Here 512×512×3 becomes 64×64×16, about 12× fewer values. What comes back is not exact, and it does not need to be. This compressed form is called the latent.',
    visual: 'An image, large, moves aside and goes through a compressor into the real latent ("12× fewer values"); a decompressor gives back noise; then an arc back to the original: "Does it look the same?" A gear appears on each funnel, as on the model in training. The gears turn, and what comes back clears from noise into the image (an illustration of training). Then an arrow points up at the compressed tile, with the tag \"the latent\".',
    seconds: 25,
  },
  {
    id: '32',
    section: 'V',
    ref: 'V.C',
    headline: 'The noise goes into the *latent.*',
    say: 'Then we use it. The noise is added to the latent, not to the pixels. Noise added to the pixels looks like fine grain; noise added to the latent and decoded looks like this.',
    visual: 'First the portrait with noise added to the pixels, large and alone (fine grain, the simple version from II.C). It moves aside for the portrait with noise added to the latent and decoded (blotchy colour, what the model works with).',
    seconds: 15,
  },
  {
    id: '33',
    section: 'V',
    ref: 'V.D',
    headline: 'The *third* idea.',
    say: 'The third idea. The model works on the latent, not on pixels, so there is far less computation. The noise is a random latent, the model removes it in small steps, and only the final latent goes through the decompressor, once. That is all three ideas. Now we put it to work.',
    visual: 'The same diagram comes back. The coloured noise turns into a random latent; the long arrow from the model splits, and a clean latent and the decompressor from V.C appear before the image. Idea 3 appears.',
    seconds: 23,
  },

  // The end: the live demo, the last beat. It belongs to no section, so it
  // has no section page and no corner label.
  {
    id: '34',
    section: '',
    ref: 'Demo',
    headline: 'Try it out!',
    say: 'Take a prompt from the audience, type it, and watch it denoise step by step.',
    visual: 'A prompt box and a large frame. 8 steps streamed from the home GPU; a recorded run plays if the connection is down.',
    seconds: 45,
  },
]

/** The on-screen headline of a beat. */
export function title(id: string) {
  return beats.find((beat) => beat.id === id)!.headline
}
