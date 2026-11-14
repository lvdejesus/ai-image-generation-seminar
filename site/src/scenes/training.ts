// Section II, beats 8-11: how the model is trained. Collect captioned
// images, make a noisy example, have the model guess the clean image, and
// train it so that the guess comes close to the original.
//
// The trained guess is soft, never the sharp original: from heavy noise the
// details cannot be known, which is what beats 14 and 16 build on.
import gsap from 'gsap'
import { arrow, assets, bend, box, chip, draw, el, fade, headline, label, overlay, place, rise, shot, stroke, wordsIn, wordsOut, type Subject } from '../kit'
import { title } from '../beats'
import { Guess, NoisyImage, seeded } from '../noise'

const Y = 640
/** The noise level the dial lands on. */
const LEVEL = 0.62
/** Seed of the noise added to the example. */
const SEED = 501

// Beat 8: rows of captioned images that scroll past, then pull into the stack.
const COLLECTION = { y: 290, h: 720, card: 170, pitch: 210, rows: [20, 250, 480] }

// Beat 9, left to right: stack, picked image, plus, dial, arrow, noisy example.
const STACK = { x: 254, size: 280 }
const PICK = { x: 660, size: 300 }
const DIAL = { x: 1060, y: Y + 40, r: 100 }
const NOISY = { x: 1500, size: 300 }
// Beat 10, left to right: the example, the model, its guess, the original,
// and the difference between the two. Above: the caption, as numbers.
const INPUT = { x: 254, y: 600 }
const MODEL = { x: 504, y: 520, w: 260, h: 240 }
const GUESS = { x: 979, size: 230 }
const ACTUAL = { x: 1272, size: 200 }
const DIFFERENCE = { x: 1566, size: 230 }
const CAPTION = { y: 395, encoderX: 504, encoderW: 240, numbersX: 800, pitch: 92, count: 6 }
/** How wrong the guess still is once trained, besides being soft (0 would be no noise left in it). */
const FLOOR = 0.18

// Beat 11: training. The examples the model is shown, in turn, each with
// its noise level.
const EXAMPLES: { subject: Subject; level: number; caption: string }[] = [
  { subject: 'cat', level: LEVEL, caption: 'a white cat on a windowsill' },
  { subject: 'girl', level: 0.35, caption: 'a girl in a red scarf, snow' },
  { subject: 'lighthouse', level: 0.8, caption: 'a lighthouse at sunset' },
  { subject: 'cat', level: LEVEL, caption: 'a white cat on a windowsill' },
]
/** How far along the difference curve training has got when each example is done. */
const TRAINED = [0.5, 0.72, 0.92, 1]
// The difference over training, as a small line chart under the comparison.
const CHART = { x: 1184, y: 870, w: 520, h: 92 }

export function training(root: HTMLElement) {
  const collect = headline(root, title('8'))
  const examples = headline(root, title('9'))
  const guesses = headline(root, title('10'))
  const shrinks = headline(root, title('11'))
  const lines = overlay(root)

  // ---- Beat 8 furniture: the collection. Real photographs, paintings and
  // the talk's own images mixed, each with its caption; every row starts at
  // a different place in the list.
  const photo = (k: number, caption: string) => ({ image: assets.collection[k], caption })
  const cards = [
    photo(0, 'a small white dog on a wooden deck'),
    { image: assets.three.cat[6], caption: 'a white cat on a windowsill' },
    photo(1, 'a pizza with tomato and onion'),
    photo(2, 'a green train at a station'),
    { image: assets.found[0], caption: 'a lighthouse' },
    photo(3, 'pink and white tulips'),
    photo(4, 'a mountain lake'),
    { image: assets.three.girl[6], caption: 'a girl in a red scarf, snow' },
    photo(5, 'a cup of coffee with cream'),
    photo(6, 'a castle hotel lit up at night'),
    photo(7, 'a sailboat on a lake'),
    { image: assets.found[1], caption: 'a sunset sky' },
    photo(8, 'a plate of berries'),
    photo(9, 'a horse at a ranch'),
    { image: assets.run[30], caption: 'a girl with an umbrella, rain' },
    photo(10, 'a red and black sports car'),
    photo(11, 'a birthday cake with icing roses'),
    { image: assets.found[6], caption: 'a cliff above the sea' },
    photo(12, 'a dog lying by the sea'),
    photo(13, 'a steam train crossing a bridge'),
    { image: assets.portrait, caption: 'a man in a suit, smiling' },
    photo(14, 'a drawing of tulips'),
    photo(15, 'a bicycle at a bike rack'),
    { image: assets.fallback[8], caption: 'a cat in a wizard hat, reading' },
    photo(16, 'a snowy forest below mountains'),
    { image: assets.found[8], caption: 'waves on the sea' },
    photo(17, 'a blue glass owl'),
    { image: assets.three.lighthouse[6], caption: 'a lighthouse at sunset' },
    photo(18, 'a painting of riders on horses'),
    { image: assets.cand[0], caption: 'a painting of a man' },
  ]
  // Enough cards that a row still fills the stage at the end of its scroll.
  const perRow = Math.ceil((1920 + 900) / COLLECTION.pitch)
  const collection = place(el('div', 'collection'), 0, COLLECTION.y, 1920, COLLECTION.h)
  const rows = COLLECTION.rows.map((top, r) => {
    const row = place(el('div'), 104, top)
    for (let k = 0; k < perRow; k++) {
      const { image, caption } = cards[(k + r * 10) % cards.length]
      const card = place(el('figure', 'card'), k * COLLECTION.pitch, 0, COLLECTION.card)
      card.append(image.cloneNode(), el('figcaption', 'caption left', caption))
      row.append(card)
    }
    collection.append(row)
    return row
  })
  root.append(collection)

  // ---- Beat 9 furniture
  const cat = assets.three.cat[6]
  const pile = [assets.run[30], assets.three.girl[6], assets.three.lighthouse[6], cat].map((source, i) => {
    const image = new NoisyImage(source, 256, 1)
    const card = shot(root, image.canvas, STACK.x, Y, STACK.size)
    gsap.set(card, { rotation: [-7, 5, -3, 0][i], x: [-14, 10, -6, 0][i] })
    return card
  })
  const pileLabel = label(root, 'Training images', STACK.x, Y - STACK.size / 2 - 60, 'tag')

  const picked = new NoisyImage(cat, 384, 1)
  const pick = shot(root, picked.canvas, PICK.x, Y, PICK.size)
  const pickLabel = label(root, 'an image', PICK.x, Y + PICK.size / 2 + 20)
  const plus = label(root, '+', (PICK.x + DIAL.x) / 2 + 20, Y - 56, 'symbol', 100)

  const track = stroke(lines, `M${DIAL.x - DIAL.r} ${DIAL.y} A${DIAL.r} ${DIAL.r} 0 0 1 ${DIAL.x + DIAL.r} ${DIAL.y}`, 'gauge')
  const filled = stroke(lines, `M${DIAL.x - DIAL.r} ${DIAL.y} A${DIAL.r} ${DIAL.r} 0 0 1 ${DIAL.x + DIAL.r} ${DIAL.y}`, 'gauge accent')
  const needle = stroke(lines, `M${DIAL.x} ${DIAL.y} L${DIAL.x} ${DIAL.y - DIAL.r + 18}`, 'needle')
  gsap.set(needle, { strokeDashoffset: 0, svgOrigin: `${DIAL.x} ${DIAL.y}`, rotation: -90 })
  const reading = label(root, '0.00', DIAL.x, DIAL.y + 18, 'reading', 240)
  const dialLabel = label(root, 'a random noise level', DIAL.x, Y + PICK.size / 2 + 20)

  const toNoisy = arrow(lines, DIAL.x + DIAL.r + 50, NOISY.x - NOISY.size / 2 - 24, Y)
  const example = new NoisyImage(EXAMPLES.map((e) => assets.three[e.subject][6]), 384, SEED)
  const noisy = shot(root, example.canvas, NOISY.x, Y, NOISY.size)
  const noisyLabel = label(root, 'a noisy example', NOISY.x, Y + NOISY.size / 2 + 20)

  // ---- Beat 10 furniture
  const levelChip = chip(root, `noise level ${LEVEL}`, INPUT.x, INPUT.y + 230)
  // The caption goes in too: a text encoder turns it into numbers.
  const captionChip = chip(root, EXAMPLES[0].caption, INPUT.x, CAPTION.y, 'accent')
  const toEncoder = arrow(lines, CAPTION.encoderX - 40, CAPTION.encoderX - 10, CAPTION.y)
  const encoder = box(root, 'Text encoder', CAPTION.encoderX, CAPTION.y - 28, CAPTION.encoderW, 56)
  const toNumbers = arrow(lines, CAPTION.encoderX + CAPTION.encoderW + 10, CAPTION.numbersX - 14, CAPTION.y)
  const numberRandom = seeded(23)
  const numberCells = Array.from({ length: CAPTION.count }, (_, i) => {
    const cell = place(el('span', 'number settled', ''), CAPTION.numbersX + i * CAPTION.pitch, CAPTION.y - 20, CAPTION.pitch)
    root.append(cell)
    return cell
  })
  // Each example's caption has its own numbers.
  const numberSets = EXAMPLES.map(() => numberCells.map(() => (numberRandom() * 2 - 1).toFixed(2)))
  const showNumbers = (k: number) => numberCells.forEach((cell, i) => (cell.textContent = numberSets[k][i]))
  showNumbers(0)
  const numbersLabel = place(el('span', 'caption left', 'text as numbers'), CAPTION.numbersX, CAPTION.y - 66, 300)
  root.append(numbersLabel)
  const captionIn = bend(lines, CAPTION.numbersX + 50, CAPTION.y + 30, CAPTION.numbersX + 50, CAPTION.y + 80, MODEL.x + MODEL.w / 2, MODEL.y - 70, MODEL.x + MODEL.w / 2, MODEL.y - 20)
  const model = box(root, 'Model', MODEL.x, MODEL.y, MODEL.w, MODEL.h, 'accent')
  const imageIn = arrow(lines, INPUT.x + 166, MODEL.x - 20, INPUT.y + 20)
  const levelIn = bend(lines, INPUT.x + 150, INPUT.y + 230, 460, INPUT.y + 230, 430, MODEL.y + 190, MODEL.x - 20, MODEL.y + 190)
  const modelOut = arrow(lines, MODEL.x + MODEL.w + 20, GUESS.x - GUESS.size / 2 - 24, Y)

  // The guess starts as nonsense and settles into a soft copy of the original.
  const targets = EXAMPLES.map((e) => assets.three[e.subject][6])
  const guess = new Guess(targets, 384, 777)
  const guessShot = shot(root, guess.canvas, GUESS.x, Y, GUESS.size)
  const guessLabel = label(root, 'the guess', GUESS.x, Y + GUESS.size / 2 + 20)

  // The comparison gets a picture of its own: the difference between the
  // guess and the original, bright where they disagree and black where they agree.
  const original = new NoisyImage(targets, 384, 1)
  const gap = new Guess(targets, 384, 777, true)
  const labelY = Y + GUESS.size / 2 + 20
  const compare = label(root, 'Compare it with the original', (GUESS.x + DIFFERENCE.x) / 2, Y - GUESS.size / 2 - 60, 'tag', 760)
  const minus = label(root, '−', (GUESS.x + GUESS.size / 2 + ACTUAL.x - ACTUAL.size / 2) / 2, Y - 36, 'symbol small', 80)
  const actual = shot(root, original.canvas, ACTUAL.x, Y, ACTUAL.size)
  const actualLabel = label(root, 'the original', ACTUAL.x, labelY, 'caption', 300)
  const equals = label(root, '=', (ACTUAL.x + ACTUAL.size / 2 + DIFFERENCE.x - DIFFERENCE.size / 2) / 2, Y - 36, 'symbol small', 80)
  const differenceShot = shot(root, gap.canvas, DIFFERENCE.x, Y, DIFFERENCE.size, 'outlined')
  const differenceLabel = label(root, 'the difference', DIFFERENCE.x, labelY, 'caption', 300)

  // ---- Beat 11 furniture: the difference over training. The curve is a
  // drawing of the idea (a noisy fall that levels off above zero), not a
  // measurement: no training run is being recorded here.
  const jitter = seeded(10)
  const points = Array.from({ length: 81 }, (_, i) => {
    const t = i / 80
    const fall = 0.12 + 0.88 * Math.exp(-4.2 * t)
    const wobble = (jitter() - 0.5) * 0.16 * (0.35 + fall)
    return { x: CHART.x + t * CHART.w, y: CHART.y + CHART.h - (fall + wobble) * (CHART.h - 10) }
  })
  const axes = stroke(lines, `M${CHART.x} ${CHART.y} V${CHART.y + CHART.h} H${CHART.x + CHART.w}`, 'faint')
  const curve = stroke(lines, 'M' + points.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' L'), 'plot')
  const marker = place(el('i', 'plot-dot'), 0, 0)
  root.append(marker)
  const yLabel = place(el('span', 'caption left', 'difference'), CHART.x, CHART.y - 34, 300)
  const xLabel = place(el('span', 'caption', 'training →'), CHART.x + CHART.w - 300, CHART.y + CHART.h + 10, 300)
  xLabel.style.textAlign = 'right'
  const never = place(el('span', 'caption', 'small, but never zero'), CHART.x + CHART.w - 330, CHART.y + CHART.h - 62, 320)
  never.style.textAlign = 'right'
  root.append(yLabel, xLabel, never)
  const everyTime = label(root, 'a different image, caption and noise level every time', INPUT.x + 130, INPUT.y + 276, 'caption', 560)

  // ---- Beat 9: pick an image, spin the dial, add that much noise.
  const dial = { value: 0 }
  const setDial = () => {
    // Written directly: gsap.set would round this fraction to a whole pixel.
    filled.style.strokeDashoffset = String(1 - dial.value)
    gsap.set(needle, { rotation: -90 + dial.value * 180 })
    reading.textContent = dial.value.toFixed(2)
    example.level = dial.value
    example.render()
  }
  // ---- Beat 8: the collection scrolls past, then pulls together into the stack.
  const beat8 = gsap.timeline()
  wordsIn(beat8, collect, 0)
  beat8.fromTo(collection, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.2)
  rows.forEach((row, r) => {
    beat8.fromTo(row, { x: 0 }, { x: -(560 + r * 160), duration: 3.2, ease: 'none' }, 0.2)
  })
  beat8.to(collection, {
    scale: 0.06,
    autoAlpha: 0,
    transformOrigin: `${STACK.x}px ${Y - COLLECTION.y}px`,
    duration: 0.9,
    ease: 'power3.in',
  }, 2.8)
  beat8.fromTo(pile, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)', stagger: 0.08 }, 3.4)
  rise(beat8, pileLabel, 3.6)

  const beat9 = gsap.timeline()
  wordsOut(beat9, collect, 0)
  wordsIn(beat9, examples, 0.4)
  beat9
    .fromTo(pick, { x: STACK.x - PICK.x, scale: STACK.size / PICK.size, autoAlpha: 0 }, { x: 0, scale: 1, autoAlpha: 1, duration: 0.8, ease: 'power3.inOut' }, 1.0)
  rise(beat9, [pickLabel, plus], 1.6, 0.1)
  draw(beat9, track, 1.7, 0.4)
  beat9.fromTo([needle, reading], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.9)
  rise(beat9, dialLabel, 1.9)
  draw(beat9, toNoisy, 2.1, 0.4)
  beat9.fromTo(noisy, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.3)
  rise(beat9, noisyLabel, 2.6)
  // The dial swings about before it settles: the level is random.
  beat9
    .to(dial, { value: 0.92, duration: 0.6, ease: 'power2.inOut', onUpdate: setDial }, 2.6)
    .to(dial, { value: 0.2, duration: 0.5, ease: 'power2.inOut', onUpdate: setDial }, 3.2)
    .to(dial, { value: LEVEL, duration: 0.6, ease: 'back.out(2)', onUpdate: setDial }, 3.7)

  // ---- Beat 10: the example, its level and its caption go in, a guess comes
  // out, and it is nothing like the original: no training yet.
  const beat10 = gsap.timeline()
  wordsOut(beat10, examples, 0)
  wordsIn(beat10, guesses, 0.4)
  fade(beat10, [...pile, pileLabel, pick, pickLabel, plus, track, filled, needle, reading, dialLabel, toNoisy, noisyLabel], 0)
  beat10.to(noisy, { x: INPUT.x - NOISY.x, y: INPUT.y - Y, duration: 1.1, ease: 'power3.inOut' }, 0.3)
  rise(beat10, levelChip, 1.3)
  beat10.fromTo(captionChip, { autoAlpha: 0, x: -200 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power4.out' }, 1.4)
  beat10.fromTo(model, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 1.7)
  draw(beat10, imageIn, 2.1, 0.5)
  draw(beat10, levelIn, 2.3, 0.6)
  draw(beat10, toEncoder, 1.9, 0.2)
  beat10.fromTo(encoder, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, 2.0)
  draw(beat10, toNumbers, 2.3, 0.2)
  beat10.fromTo(numberCells, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.04 }, 2.4)
  rise(beat10, numbersLabel, 2.5)
  draw(beat10, captionIn, 2.8, 0.4)
  draw(beat10, modelOut, 3.1, 0.5)
  beat10.fromTo(guessShot, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 3.5)
  rise(beat10, guessLabel, 3.9)
  rise(beat10, compare, 4.7)
  rise(beat10, minus, 4.9)
  beat10.fromTo(actual, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 5.0)
  rise(beat10, actualLabel, 5.4)
  rise(beat10, equals, 5.9)
  beat10.fromTo(differenceShot, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 6.0)
  rise(beat10, differenceLabel, 6.4)

  // ---- Beat 11: training. The guess gets closer to the original,
  // on this example and then on others, each with its own noise level.
  const training = { progress: 0, example: 0 }
  const setTraining = () => {
    const at = Math.min(points.length - 1, Math.round(training.progress * (points.length - 1)))
    curve.style.strokeDashoffset = String(1 - training.progress)
    marker.style.left = `${points[at].x}px`
    marker.style.top = `${points[at].y}px`
  }
  const setExample = () => {
    const k = Math.round(training.example)
    example.frame = guess.frame = original.frame = gap.frame = training.example
    levelChip.textContent = `noise level ${EXAMPLES[k].level}`
    captionChip.textContent = EXAMPLES[k].caption
    showNumbers(k)
    example.render()
    guess.render()
    original.render()
    gap.render()
  }
  // How wrong the guess is: 1 is unrelated noise, 0 a soft copy of the original.
  const wrong = { value: 1 }
  const setWrong = () => {
    guess.wrong = gap.wrong = wrong.value
    guess.render()
    gap.render()
  }
  setTraining()
  const beat11 = gsap.timeline()
  wordsOut(beat11, guesses, 0)
  wordsIn(beat11, shrinks, 0.4)
  draw(beat11, axes, 0.6, 0.5)
  rise(beat11, [yLabel, xLabel], 0.8, 0.1)
  beat11.fromTo(marker, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.1)
  // The first example: the guess settles into a soft copy of the original, and
  // the difference picture goes dark.
  beat11
    .to(training, { progress: TRAINED[0], duration: 3, ease: 'power1.out', onUpdate: setTraining }, 1.3)
    .to(wrong, { value: FLOOR, duration: 3, ease: 'power2.inOut', onUpdate: setWrong }, 1.3)
  rise(beat11, everyTime, 4.6)
  // Then other examples, each with its own noise: wrong at first, then corrected.
  EXAMPLES.slice(1).forEach(({ level }, k) => {
    const at = 4.8 + k * 1.5
    beat11
      .to(training, { example: k + 1, duration: 0.4, ease: 'power2.inOut', onUpdate: setExample }, at)
      .to(example, { level, duration: 0.4, onUpdate: example.render }, at)
      .to(wrong, { value: 0.45, duration: 0.3, onUpdate: setWrong }, at)
      .to(wrong, { value: FLOOR, duration: 0.8, ease: 'power2.out', onUpdate: setWrong }, at + 0.4)
      .to(training, { progress: TRAINED[k + 1], duration: 1.2, ease: 'none', onUpdate: setTraining }, at + 0.1)
  })
  rise(beat11, never, 9.0)

  return [beat8, beat9, beat10, beat11]
}
