// Section II, beats 5-12: how the model is trained. Collect captioned
// images; an image is numbers, and the caption becomes numbers too; noise is
// random numbers added to the image, at a random level; the model predicts
// the clean image, training brings the prediction close to the original, and
// the images themselves are not stored.
//
// The trained guess is soft, never the sharp original: from heavy noise the
// details cannot be known, which is what Section III builds on.
import './training.css'
import gsap from 'gsap'
import { arrow, assets, bend, box, chip, draw, el, fade, gear, headline, hold, label, line, overlay, place, rise, shot, stroke, wordsIn, wordsOut, type Subject } from '../kit'
import { title } from '../beats'
import { gaussian, Guess, NoisyImage, seeded } from '../noise'

/** The noise level the dial lands on. */
const LEVEL = 0.62
/** Seed of the noise added to the example. */
const SEED = 501

// Beat 5: two rows of captioned images that scroll past, then pull into a
// large stack in the middle of the stage.
const COLLECTION = { y: 296, h: 720, card: 260, pitch: 310, rows: [0, 360] }
const STACK = { x: 960, y: 610, size: 400 }

// Beat 9, left to right: the stack (made small), the picked image, plus, the
// dial, an arrow, and the noisy version.
const Y = 640
const SMALL = { x: 250, scale: 0.5 }
const PICK = { x: 660, size: 400 }
const DIAL = { x: 1090, y: Y + 40, r: 110 }
const NOISY = { x: 1560, size: 400 }

// Beat 10, left to right: the example, the model, its guess, the original,
// and the difference between the two. Above: the caption, the text encoder,
// and the caption as numbers. Below the model: the noise level.
const ROW = 660
const INPUT = { x: 224, size: 240 }
const MODEL = { x: 420, y: ROW - 100, w: 200, h: 200 }
const GUESS = { x: 870, size: 340 }
/** How much larger the guess is while it is the subject. */
const GUESS_BIG = 1.25
const ACTUAL = { x: 1240, size: 220 }
const DIFFERENCE = { x: 1610, size: 340 }
const CAPTION = { y: 340, encoderX: 720, encoderW: 310, numbersY: 440, pitch: 118, count: 5 }
// Beat 7: the caption row, large in the middle of the stage. It scales
// about its own centre, and beat 11 shrinks it back to its place on top.
const CAPTION_CENTRE = { x: 707, y: 380 }
const CAPTION_BIG = { x: 960 - CAPTION_CENTRE.x, y: 600 - CAPTION_CENTRE.y, scale: 1.4 }
const LEVEL_CHIP = { x: MODEL.x + MODEL.w / 2, y: 892 }
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

// Beat 12: the training data of Stable Diffusion 1.5 as a block of tiny
// images, and the model at the same scale by area. Public figures: about
// 2.3 billion images (LAION-2B-en; about 100 TB at 384 px, from the 240 TB
// of all 5.85 billion LAION-5B images), and a model file of about 2 GB at
// half precision.
const DATA = { x: 104, y: 330, w: 840, h: 504, tile: 42 }
/** The model's side at the same scale by area: 2 GB against 100 TB. */
const MODEL_SIDE = Math.sqrt((DATA.w * DATA.h * 2) / 100_000)
const DOT = { x: 1180, y: 520 }

// Beats 6 and 8: the image as numbers, and noise as random numbers. The
// grids are 3x3 pixels, each cell a pixel's red, green and blue values. In
// beat 8 the three grids stand in a row: the pixels, the noise, the sum.
const CELL = { w: 120, h: 130, gap: 4 }
const SIDE = 3
const GRID = { w: SIDE * CELL.w + (SIDE - 1) * CELL.gap, h: SIDE * CELL.h + (SIDE - 1) * CELL.gap }
const NUMS = { y: 380, pitch: GRID.w + 140 }
const NUMS_X = (1920 - (3 * GRID.w + 2 * 140)) / 2
/** Beat 6: the image large on the left (its top-left corner), and its patch as one large grid on the right. */
const FACE = { x: 150, y: 340, size: 500 }
const BIG = { x: 1060, y: 330, scale: 1.3 }
/** Beat 8, last step: the image and the noisy image, side by side (left edges). */
const PAIR = { y: 370, size: 440, left: 268, right: 1212 }
/** The patch that pixelNumbers reads, on a 24x24 copy of the image: across the cat's eyes. */
const PATCH = { x: 9, y: 12, of: 24 }
/** The noise on the noisy image of beat 8: random numbers added to the pixels. */
const PIXEL_NOISE = 0.45

/** A grid of pixels, each cell its red, green and blue values, optionally tinted with a colour. */
function numberGrid(values: string[][], colours?: string[]) {
  const grid = el('div', colours ? 'number-grid' : 'number-grid plain')
  grid.style.gridTemplateColumns = `repeat(${SIDE}, ${CELL.w}px)`
  grid.style.gridAutoRows = `${CELL.h}px`
  grid.style.gap = `${CELL.gap}px`
  values.forEach((rgb, i) => {
    const cell = el('span')
    rgb.forEach((value, c) => cell.append(el('span', ['r', 'g', 'b'][c], value)))
    if (colours) {
      cell.style.background = colours[i]
      // Dark text on light cells, light text on dark ones.
      const [r, g, b] = rgb.map(Number)
      cell.style.color = 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#0b0c0f' : '#f3f0e9'
    }
    grid.append(cell)
  })
  return grid
}

/** A patch of the picture's real pixels, their noise, and the sum: three grids of numbers. */
function pixelNumbers(picture: CanvasImageSource) {
  const canvas = el('canvas')
  canvas.width = canvas.height = PATCH.of
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(picture, 0, 0, PATCH.of, PATCH.of)
  const pixels = ctx.getImageData(PATCH.x, PATCH.y, SIDE, SIDE).data
  const count = SIDE * SIDE
  // One random number for each red, green and blue value.
  const noise = gaussian(count * 3, 4)
  const image = { values: [] as string[][], colours: [] as string[] }
  const added = [] as string[][]
  const noisy = { values: [] as string[][], colours: [] as string[] }
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n).replace('-', '−'))
  for (let i = 0; i < count; i++) {
    const rgb = [pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]]
    const n = [0, 1, 2].map((c) => Math.round(noise[i * 3 + c] * 45))
    const sum = rgb.map((v, c) => clamp(v + n[c]))
    image.values.push(rgb.map(String))
    image.colours.push(`rgb(${rgb.join(', ')})`)
    added.push(n.map(signed))
    noisy.values.push(sum.map(String))
    noisy.colours.push(`rgb(${sum.join(', ')})`)
  }
  return [numberGrid(image.values, image.colours), numberGrid(added), numberGrid(noisy.values, noisy.colours)]
}

export function training(root: HTMLElement) {
  root.classList.add('training')
  const collect = headline(root, title('5'))
  const numbers = headline(root, title('6'))
  const captionTitle = headline(root, title('7'))
  const noiseTitle = headline(root, title('8'))
  const examples = headline(root, title('9'))
  const guesses = headline(root, title('10'))
  const shrinks = headline(root, title('11'), 1712)
  const patterns = headline(root, title('12'))
  const oneRun = headline(root, title('13'))
  const lines = overlay(root)

  // ---- Beat 5 furniture: the collection. Real photographs, paintings and
  // the talk's own images mixed, each with its caption; every row starts at
  // a different place in the list. A caption fits on two lines of a card.
  const photo = (k: number, caption: string) => ({ image: assets.collection[k], caption })
  const cards = [
    photo(0, 'a white dog on a deck'),
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
    photo(11, 'a birthday cake with roses'),
    { image: assets.found[6], caption: 'a cliff above the sea' },
    photo(12, 'a dog lying by the sea'),
    photo(13, 'a steam train on a bridge'),
    { image: assets.portrait, caption: 'a man in a suit, smiling' },
    photo(14, 'a drawing of tulips'),
    photo(15, 'a bicycle at a bike rack'),
    { image: assets.fallback[8], caption: 'a cat in a wizard hat' },
    photo(16, 'a snowy forest, mountains'),
    { image: assets.found[8], caption: 'waves on the sea' },
    photo(17, 'a blue glass owl'),
    { image: assets.three.lighthouse[6], caption: 'a lighthouse at sunset' },
    photo(18, 'a painting of riders on horses'),
    { image: assets.cand[0], caption: 'a painting of a man' },
  ]
  // Enough cards that a row still fills the stage at the end of its scroll.
  const perRow = Math.ceil((1920 + 1200) / COLLECTION.pitch)
  const collection = place(el('div', 'collection'), 0, COLLECTION.y, 1920, COLLECTION.h)
  const rows = COLLECTION.rows.map((top, r) => {
    const row = place(el('div'), 104, top)
    for (let k = 0; k < perRow; k++) {
      const { image, caption } = cards[(k + r * 13) % cards.length]
      const card = place(el('figure', 'card'), k * COLLECTION.pitch, 0, COLLECTION.card)
      card.append(image.cloneNode(), el('figcaption', 'caption left', caption))
      row.append(card)
    }
    collection.append(row)
    return row
  })
  root.append(collection)

  // ---- Beat 5 end and beat 9: the stack of training images. The cards sit in
  // one container, so the whole stack can move and shrink as one.
  const cat = assets.three.cat[6]
  const stack = place(el('div', 'stack'), STACK.x - STACK.size / 2, STACK.y - STACK.size / 2, STACK.size, STACK.size)
  root.append(stack)
  const pile = [assets.run[30], assets.three.girl[6], assets.three.lighthouse[6], cat].map((source, i) => {
    const image = new NoisyImage(source, 512, 1)
    const card = shot(stack, image.canvas, STACK.size / 2, STACK.size / 2, STACK.size)
    gsap.set(card, { rotation: [-7, 5, -3, 0][i], x: [-20, 14, -8, 0][i] })
    return card
  })
  const pileLabel = label(root, 'Training images', STACK.x, STACK.y + STACK.size / 2 + 40, 'tag', 500)
  // Where the stack and its label go in beat 9.
  const small = { x: SMALL.x - STACK.x, y: Y - STACK.y, scale: SMALL.scale }
  const smallLabel = { x: SMALL.x - STACK.x, y: Y + (STACK.size * SMALL.scale) / 2 + 30 - (STACK.y + STACK.size / 2 + 40) }

  // ---- Beat 9 furniture: an image, plus a random noise level, gives a noisy version.
  const picked = new NoisyImage(cat, 512, 1)
  const pick = shot(root, picked.canvas, PICK.x, Y, PICK.size)
  const plus = label(root, '+', (PICK.x + PICK.size / 2 + DIAL.x - DIAL.r) / 2, Y - 56, 'symbol', 100)

  const arc = `M${DIAL.x - DIAL.r} ${DIAL.y} A${DIAL.r} ${DIAL.r} 0 0 1 ${DIAL.x + DIAL.r} ${DIAL.y}`
  const track = stroke(lines, arc, 'gauge')
  const filled = stroke(lines, arc, 'gauge accent')
  const needle = stroke(lines, `M${DIAL.x} ${DIAL.y} L${DIAL.x} ${DIAL.y - DIAL.r + 20}`, 'needle')
  gsap.set(needle, { strokeDashoffset: 0, svgOrigin: `${DIAL.x} ${DIAL.y}`, rotation: -90 })
  const reading = label(root, '0.00', DIAL.x, DIAL.y + 18, 'reading', 240)
  const dialLabel = label(root, 'random noise level', DIAL.x, Y + NOISY.size / 2 + 20, 'caption', 380)

  const toNoisy = arrow(lines, DIAL.x + DIAL.r + 40, NOISY.x - NOISY.size / 2 - 24, Y)
  const example = new NoisyImage(EXAMPLES.map((e) => assets.three[e.subject][6]), 512, SEED)
  const noisy = shot(root, example.canvas, NOISY.x, Y, NOISY.size)
  const noisyLabel = label(root, 'noisy version', NOISY.x, Y + NOISY.size / 2 + 20, 'caption', 380)

  // ---- Beat 10 furniture. The noise level goes into the model from below.
  const levelChip = chip(root, `noise level ${LEVEL}`, LEVEL_CHIP.x, LEVEL_CHIP.y)
  const levelIn = line(lines, LEVEL_CHIP.x, LEVEL_CHIP.y - 40, LEVEL_CHIP.x, MODEL.y + MODEL.h + 14)
  // The caption goes in too: a text encoder turns it into numbers. The chip
  // keeps its left edge on the margin while its text changes. The caption
  // row sits in its own layer, so beat 10 can show it large and beat 11 can
  // shrink it into place as one piece.
  const captionRow = place(el('div'), 0, 0, 1920, 1080)
  root.append(captionRow)
  const captionLines = overlay(captionRow)
  const captionChip = chip(captionRow, EXAMPLES[0].caption, 104, CAPTION.y, 'accent')
  gsap.set(captionChip, { xPercent: 0 })
  const toEncoder = arrow(captionLines, CAPTION.encoderX - 66, CAPTION.encoderX - 14, CAPTION.y)
  const encoder = box(captionRow, 'Text encoder', CAPTION.encoderX, CAPTION.y - 32, CAPTION.encoderW, 64)
  const toNumbers = line(captionLines, CAPTION.encoderX + 60, CAPTION.y + 40, CAPTION.encoderX + 60, CAPTION.numbersY - 30)
  const numberRandom = seeded(23)
  const numberCells = Array.from({ length: CAPTION.count }, (_, i) => {
    const cell = place(el('span', 'number settled', ''), CAPTION.encoderX + i * CAPTION.pitch, CAPTION.numbersY - 20, CAPTION.pitch)
    captionRow.append(cell)
    return cell
  })
  // Each caption has its own numbers. The same caption gets the same numbers.
  const numberSets = EXAMPLES.map(() => numberCells.map(() => (numberRandom() * 2 - 1).toFixed(2)))
  EXAMPLES.forEach((e, k) => (numberSets[k] = numberSets[EXAMPLES.findIndex((f) => f.caption === e.caption)]))
  const showNumbers = (k: number) => numberCells.forEach((cell, i) => (cell.textContent = numberSets[k][i]))
  showNumbers(0)
  const model = box(root, 'Model', MODEL.x, MODEL.y, MODEL.w, MODEL.h, 'accent')
  const captionIn = bend(lines, CAPTION.encoderX - 16, CAPTION.numbersY, MODEL.x + MODEL.w / 2, CAPTION.numbersY, MODEL.x + MODEL.w / 2, MODEL.y - 60, MODEL.x + MODEL.w / 2, MODEL.y - 16)
  const imageIn = arrow(lines, INPUT.x + INPUT.size / 2 + 14, MODEL.x - 14, ROW)
  const modelOut = arrow(lines, MODEL.x + MODEL.w + 14, GUESS.x - GUESS.size / 2 - 16, ROW)

  // The guess starts as nonsense and settles into a soft copy of the original.
  const targets = EXAMPLES.map((e) => assets.three[e.subject][6])
  const guess = new Guess(targets, 512, 777)
  const guessShot = shot(root, guess.canvas, GUESS.x, ROW, GUESS.size)
  // It grows from its top left corner, away from the numbers above it.
  gsap.set(guessShot, { transformOrigin: '0% 0%' })
  const labelY = ROW + GUESS.size / 2 + 16
  const guessLabel = label(root, 'the prediction', GUESS.x, labelY, 'caption', 340)
  /** Where the guess label sits while the guess is large. */
  const bigLabel = { x: (GUESS.size * (GUESS_BIG - 1)) / 2, y: GUESS.size * (GUESS_BIG - 1) }

  // The comparison gets a picture of its own: the difference between the
  // guess and the original, bright where they disagree and black where they agree.
  const original = new NoisyImage(targets, 384, 1)
  const gap = new Guess(targets, 512, 777, true)
  const minus = label(root, '−', (GUESS.x + GUESS.size / 2 + ACTUAL.x - ACTUAL.size / 2) / 2, ROW - 40, 'symbol small', 80)
  const actual = shot(root, original.canvas, ACTUAL.x, ROW, ACTUAL.size)
  const actualLabel = label(root, 'the original', ACTUAL.x, labelY, 'caption', 300)
  const equals = label(root, '=', (ACTUAL.x + ACTUAL.size / 2 + DIFFERENCE.x - DIFFERENCE.size / 2) / 2, ROW - 40, 'symbol small', 80)
  const differenceShot = shot(root, gap.canvas, DIFFERENCE.x, ROW, DIFFERENCE.size, 'outlined')
  const differenceLabel = label(root, 'the difference', DIFFERENCE.x, labelY, 'caption', 340)

  // ---- Beat 11 furniture: a gear on the model, which turns while it trains.
  // It sits on the corner of the model.
  const modelGear = gear(lines, MODEL.x + MODEL.w, MODEL.y)

  // ---- Beat 5: the collection scrolls past and stops, so the captions can be
  // read. Then it pulls together into the stack.
  const beat5 = gsap.timeline()
  wordsIn(beat5, collect, 0)
  beat5.fromTo(collection, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.2)
  rows.forEach((row, r) => {
    beat5.fromTo(row, { x: 0 }, { x: -(620 + r * 310), duration: 3.2, ease: 'power1.out' }, 0.2)
  })
  hold(beat5)
  beat5.to(collection, {
    scale: 0.08,
    autoAlpha: 0,
    transformOrigin: `${STACK.x}px ${STACK.y - COLLECTION.y}px`,
    duration: 0.9,
    ease: 'power3.in',
  }, 3.6)
  beat5.fromTo(pile, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)', stagger: 0.08 }, 4.2)
  rise(beat5, pileLabel, 4.5)

  // ---- Beat 6 furniture: the cat, large, with a patch of it marked, and
  // the patch as a large grid of numbers.
  const face = place(el('div', 'shot'), FACE.x, FACE.y, FACE.size, FACE.size)
  face.append(new NoisyImage(cat, 512, 1).canvas)
  gsap.set(face, { transformOrigin: '0 0' })
  root.append(face)
  const unit = FACE.size / PATCH.of
  const patch = place(el('div', 'patch'), PATCH.x * unit, PATCH.y * unit, SIDE * unit, SIDE * unit)
  face.append(patch)
  const grids = pixelNumbers(cat).map((grid, i) => {
    place(grid, NUMS_X + i * NUMS.pitch, NUMS.y)
    grid.style.transformOrigin = '0 0'
    root.append(grid)
    return grid
  })
  const bigState = { x: BIG.x - NUMS_X, y: BIG.y - NUMS.y, scale: BIG.scale }
  const patchBox = { x: FACE.x + PATCH.x * unit, y: FACE.y + PATCH.y * unit, size: SIDE * unit }
  const bigBox = { w: GRID.w * BIG.scale, h: GRID.h * BIG.scale }
  const from = patchBox.x + patchBox.size + 8
  const zoom = [
    stroke(lines, `M${from} ${patchBox.y} L${BIG.x - 16} ${BIG.y}`, 'zoom'),
    stroke(lines, `M${from} ${patchBox.y + patchBox.size} L${BIG.x - 16} ${BIG.y + bigBox.h}`, 'zoom'),
  ]
  const channels = label(root, 'red, green and blue for each pixel', BIG.x + bigBox.w / 2, BIG.y + bigBox.h + 24, 'caption', 700)

  // ---- Beat 8 furniture: the three grids in a row, then the cat and the
  // noisy cat side by side.
  const gridLabels = ['pixels', 'noise', 'noisy pixels'].map((text, i) => label(root, text, NUMS_X + i * NUMS.pitch + GRID.w / 2, NUMS.y + GRID.h + 24, 'caption', GRID.w + 100))
  const gridSigns = ['+', '='].map((sign, i) => label(root, sign, NUMS_X + i * NUMS.pitch + GRID.w + 70, NUMS.y + GRID.h / 2 - 50, 'symbol', 120))
  const noiseArrow = arrow(lines, PAIR.left + PAIR.size + 40, PAIR.right - 40, PAIR.y + PAIR.size / 2)
  const noiseLabel = label(root, '+ noise', 960, PAIR.y + PAIR.size / 2 - 70, 'caption', 400)
  const noisyCat = new NoisyImage(cat, 512, 77)
  const noisyFace = place(el('div', 'shot'), PAIR.right, PAIR.y, PAIR.size, PAIR.size)
  noisyFace.append(noisyCat.canvas)
  root.append(noisyFace)
  const pairState = { x: PAIR.left - FACE.x, y: PAIR.y - FACE.y, scale: PAIR.size / FACE.size }

  // ---- Beat 6: the stack goes; the cat, then a patch of it as numbers.
  const beat6 = gsap.timeline()
  wordsOut(beat6, collect, 0)
  wordsIn(beat6, numbers, 0.4)
  // The stack moves to its small place as it fades, ready for beat 9.
  beat6.to(stack, { ...small, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0)
  beat6.to(pileLabel, { ...smallLabel, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0)
  beat6.fromTo(face, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.out' }, 0.6)
  beat6.fromTo(patch, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 1.3)
  draw(beat6, zoom[0], 1.8, 0.5)
  draw(beat6, zoom[1], 1.8, 0.5)
  // The grid grows out of the patch.
  beat6.fromTo(
    grids[0],
    { autoAlpha: 0, x: patchBox.x - NUMS_X, y: patchBox.y - NUMS.y, scale: patchBox.size / GRID.w },
    { autoAlpha: 1, ...bigState, duration: 0.8, ease: 'power3.inOut' },
    1.8,
  )
  rise(beat6, channels, 2.5)

  // ---- Beat 7: the caption of the image, large, goes through the text
  // encoder and comes out as a row of numbers.
  gsap.set(captionRow, { transformOrigin: `${CAPTION_CENTRE.x}px ${CAPTION_CENTRE.y}px`, ...CAPTION_BIG })
  const beat7 = gsap.timeline()
  wordsOut(beat7, numbers, 0)
  wordsIn(beat7, captionTitle, 0.4)
  fade(beat7, [face, ...zoom, grids[0], channels], 0)
  beat7.fromTo(captionChip, { autoAlpha: 0, x: -200 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power4.out' }, 0.7)
  draw(beat7, toEncoder, 1.3, 0.3)
  beat7.fromTo(encoder, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, 1.5)
  draw(beat7, toNumbers, 1.9, 0.3)
  beat7.fromTo(numberCells, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.08 }, 2.1)

  // ---- Beat 8: the pixels again, random numbers added to them, the sum;
  // stop; the cat and the noisy cat.
  const beat8 = gsap.timeline()
  wordsOut(beat8, captionTitle, 0)
  wordsIn(beat8, noiseTitle, 0.4)
  fade(beat8, captionRow, 0)
  beat8.set(grids[0], { x: 0, y: 0, scale: 1 }, 0.3)
  beat8.set(patch, { autoAlpha: 0 }, 0.3)
  rise(beat8, [grids[0], gridLabels[0]], 0.5, 0.1)
  rise(beat8, [gridSigns[0], grids[1], gridLabels[1]], 1.2, 0.1)
  rise(beat8, [gridSigns[1], grids[2], gridLabels[2]], 2.0, 0.1)
  hold(beat8)
  // The sum turns back into a picture: the cat, gaining the noise.
  beat8.to([...grids, ...gridLabels, ...gridSigns], { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, 2.8)
  beat8.set(face, pairState, 3.15)
  beat8.to(face, { autoAlpha: 1, duration: 0.4 }, 3.2)
  draw(beat8, noiseArrow, 3.5, 0.5)
  rise(beat8, noiseLabel, 3.6)
  beat8.fromTo(noisyFace, { clipPath: 'inset(0% 0% 0% 100% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.6, ease: 'power3.out' }, 3.9)
  beat8.fromTo(noisyCat, { level: 0 }, { level: PIXEL_NOISE, duration: 0.8, ease: 'power1.out', onUpdate: noisyCat.render }, 4.3)

  // ---- Beat 9: how much noise. The stack comes back small, one image comes
  // out large, a random noise level, and that much noise on the image. The
  // dial swings, and the noisy version follows it: the level is random.
  const beat9 = gsap.timeline()
  wordsOut(beat9, noiseTitle, 0)
  wordsIn(beat9, examples, 0.4)
  fade(beat9, [face, noisyFace, noiseArrow, noiseLabel], 0)
  beat9.to([stack, pileLabel], { autoAlpha: 1, duration: 0.5 }, 0.4)
  beat9.fromTo(pick, { x: SMALL.x - PICK.x, scale: (STACK.size * SMALL.scale) / PICK.size, autoAlpha: 0 }, { x: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'power3.inOut' }, 1.1)
  rise(beat9, plus, 2.2)
  draw(beat9, track, 2.3, 0.4)
  beat9.fromTo([needle, reading], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 2.5)
  rise(beat9, dialLabel, 2.5)
  draw(beat9, toNoisy, 2.7, 0.4)
  beat9.fromTo(noisy, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.9)
  rise(beat9, noisyLabel, 3.2)
  // The dial swings about before it settles: the level is random.
  const dial = { value: 0 }
  const setDial = () => {
    // Written directly: gsap.set would round this fraction to a whole pixel.
    filled.style.strokeDashoffset = String(1 - dial.value)
    gsap.set(needle, { rotation: -90 + dial.value * 180 })
    reading.textContent = dial.value.toFixed(2)
    example.level = dial.value
    example.render()
  }
  beat9
    .to(dial, { value: 0.92, duration: 0.6, ease: 'power2.inOut', onUpdate: setDial }, 3.2)
    .to(dial, { value: 0.2, duration: 0.5, ease: 'power2.inOut', onUpdate: setDial }, 3.8)
    .to(dial, { value: LEVEL, duration: 0.6, ease: 'back.out(2)', onUpdate: setDial }, 4.3)

  // ---- Beat 10, in four steps: the caption row comes back at the top; the
  // noisy version and its noise level go into the model, and the caption
  // numbers too; a prediction comes out, large; it is compared with the
  // original, and it is nothing like it.
  const beat10 = gsap.timeline()
  wordsOut(beat10, examples, 0)
  wordsIn(beat10, guesses, 0.4)
  fade(beat10, [stack, pileLabel, pick, plus, track, filled, needle, reading, dialLabel, toNoisy, noisy, noisyLabel], 0)
  beat10.set(captionRow, { x: 0, y: 0, scale: 1 }, 0.3)
  beat10.to(captionRow, { autoAlpha: 1, duration: 0.5 }, 0.3)
  // The noisy version moves to the input place while it is hidden, then fades in there.
  beat10.set(noisy, { x: INPUT.x - NOISY.x, y: ROW - Y, scale: INPUT.size / NOISY.size }, 0.3)
  beat10.to(noisy, { autoAlpha: 1, duration: 0.5 }, 0.8)
  beat10.fromTo(model, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 1.2)
  draw(beat10, imageIn, 1.5, 0.4)
  rise(beat10, levelChip, 1.7)
  draw(beat10, levelIn, 1.9, 0.3)
  draw(beat10, captionIn, 2.3, 0.5)
  draw(beat10, modelOut, 3.0, 0.4)
  beat10.fromTo(guessShot, { autoAlpha: 0, scale: GUESS_BIG * 0.85 }, { autoAlpha: 1, scale: GUESS_BIG, duration: 0.6, ease: 'back.out(1.6)' }, 3.3)
  beat10.fromTo(guessLabel, { autoAlpha: 0, x: bigLabel.x, y: bigLabel.y + 24 }, { autoAlpha: 1, y: bigLabel.y, duration: 0.5, ease: 'power3.out' }, 3.7)
  // The guess makes room for the comparison.
  beat10.to(guessShot, { scale: 1, duration: 0.7, ease: 'power3.inOut' }, 4.4)
  beat10.to(guessLabel, { x: 0, y: 0, duration: 0.7, ease: 'power3.inOut' }, 4.4)
  rise(beat10, minus, 5.0)
  beat10.fromTo(actual, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 5.1)
  rise(beat10, actualLabel, 5.4)
  rise(beat10, equals, 5.8)
  beat10.fromTo(differenceShot, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 5.9)
  rise(beat10, differenceLabel, 6.3)

  // ---- Beat 11: training. The guess gets closer to the original, on this
  // example first, and then on others, each with its own noise level.
  const training = { example: 0 }
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
  const beat11 = gsap.timeline()
  wordsOut(beat11, guesses, 0)
  wordsIn(beat11, shrinks, 0.4)
  beat11.fromTo(modelGear, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, 0.7)
  // The gear turns for as long as the model trains.
  beat11.fromTo(modelGear, { rotation: 0 }, { rotation: 900, duration: 8.4, ease: 'none', immediateRender: false }, 1.1)
  // The first example: the guess settles into a soft copy of the original, and
  // the difference picture goes dark.
  beat11.to(wrong, { value: FLOOR, duration: 3, ease: 'power2.inOut', onUpdate: setWrong }, 1.3)
  hold(beat11, 4.5)
  // Then other examples, each with its own noise: wrong at first, then corrected.
  EXAMPLES.slice(1).forEach(({ level }, k) => {
    const at = 4.8 + k * 1.5
    beat11
      .to(training, { example: k + 1, duration: 0.4, ease: 'power2.inOut', onUpdate: setExample }, at)
      .to(example, { level, duration: 0.4, onUpdate: example.render }, at)
      .to(wrong, { value: 0.45, duration: 0.3, onUpdate: setWrong }, at)
      .to(wrong, { value: FLOOR, duration: 0.8, ease: 'power2.out', onUpdate: setWrong }, at + 0.4)
  })

  // ---- Beat 12 furniture: a block of training images, drawn as tiles.
  const block = el('canvas', 'data-block')
  block.width = DATA.w
  block.height = DATA.h
  const tiles = [...assets.collection, ...cards.map((c) => c.image)]
  const ctx = block.getContext('2d')!
  for (let row = 0; row < DATA.h / DATA.tile; row++) {
    for (let col = 0; col < DATA.w / DATA.tile; col++) {
      ctx.drawImage(tiles[(row * 7 + col * 3) % tiles.length], col * DATA.tile, row * DATA.tile, DATA.tile - 2, DATA.tile - 2)
    }
  }
  place(block, DATA.x, DATA.y, DATA.w, DATA.h)
  root.append(block)
  const blockOutline = place(el('div', 'data-outline'), DATA.x, DATA.y, DATA.w, DATA.h)
  root.append(blockOutline)
  const blockTag = place(el('span', 'tag', 'Training images for Stable Diffusion 1.5'), DATA.x, DATA.y + DATA.h + 24)
  const blockFigure = place(el('span', 'caption left', '2.3 billion images, about 100 TB in total'), DATA.x, DATA.y + DATA.h + 64, DATA.w)
  root.append(blockTag, blockFigure)

  const dot = place(el('i', 'scale-dot'), DOT.x - MODEL_SIDE / 2, DOT.y - MODEL_SIDE / 2, MODEL_SIDE, MODEL_SIDE)
  root.append(dot)
  const ring = stroke(lines, `M${DOT.x - 26} ${DOT.y} a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0`, 'ring')
  const dotTag = place(el('span', 'tag', 'The model'), DOT.x + 56, DOT.y - 62)
  const dotFigure = place(el('span', 'caption left', 'about 2 GB'), DOT.x + 56, DOT.y - 18, 560)
  root.append(dotTag, dotFigure)

  const notKept = place(el('span', 'tag big', 'The images are not stored'), DATA.x, DATA.y + DATA.h / 2 - 20, DATA.w)
  notKept.style.textAlign = 'center'
  root.append(notKept)

  // ---- Beat 12, in three steps: the training images; the model at the same
  // scale, a dot; the images go, and the model stays.
  const beat12 = gsap.timeline()
  wordsOut(beat12, shrinks, 0)
  wordsIn(beat12, patterns, 0.4)
  fade(beat12, [noisy, levelChip, levelIn, captionRow, captionIn, model, imageIn, modelOut, guessShot, guessLabel, minus, actual, actualLabel, equals, differenceShot, differenceLabel, modelGear], 0)
  beat12.fromTo(block, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ease: 'power2.inOut' }, 0.6)
  beat12.fromTo(blockOutline, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.6)
  rise(beat12, [blockTag, blockFigure], 1.3, 0.1)
  beat12.fromTo(dot, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 2.2)
  draw(beat12, ring, 2.2, 0.5)
  rise(beat12, [dotTag, dotFigure], 2.5, 0.1)
  hold(beat12)
  // The images go; the model stays.
  beat12.to(block, { autoAlpha: 0.08, duration: 1.0, ease: 'power1.inOut' }, 3.4)
  rise(beat12, notKept, 3.9)

  // ---- Beat 13 furniture: one run from pure noise, with a caption, as one
  // row in the middle of the stage. The output is the model's real
  // prediction from there: a blur.
  const RUN = { y: 640, size: 340, input: 520, model: 960, output: 1400 }
  const runLabelY = RUN.y + RUN.size / 2 + 20
  const pureNoise = new NoisyImage([], 512, 909)
  const runInput = shot(root, pureNoise.canvas, RUN.input, RUN.y, RUN.size)
  const runInputLabel = label(root, 'pure noise', RUN.input, runLabelY, 'caption', 300)
  const runModel = box(root, 'Model', RUN.model - MODEL.w / 2, RUN.y - MODEL.h / 2, MODEL.w, MODEL.h, 'accent')
  const runIn = arrow(lines, RUN.input + RUN.size / 2 + 20, RUN.model - MODEL.w / 2 - 20, RUN.y)
  const runOut = arrow(lines, RUN.model + MODEL.w / 2 + 20, RUN.output - RUN.size / 2 - 24, RUN.y)
  const runCaption = chip(root, 'a man in a suit and tie, smiling', RUN.model, RUN.y - MODEL.h / 2 - 130, 'accent')
  const runCaptionIn = line(lines, RUN.model, RUN.y - MODEL.h / 2 - 94, RUN.model, RUN.y - MODEL.h / 2 - 16)
  const blur = shot(root, new NoisyImage(assets.hedge.portrait, 512, 1).canvas, RUN.output, RUN.y, RUN.size)
  const blurLabel = label(root, 'the prediction', RUN.output, runLabelY, 'caption', 340)

  // ---- Beat 13: the trained model, run once from pure noise. The
  // prediction is a blur, which Section III explains.
  const beat13 = gsap.timeline()
  wordsOut(beat13, patterns, 0)
  wordsIn(beat13, oneRun, 0.4)
  fade(beat13, [block, blockOutline, blockTag, blockFigure, dot, ring, dotTag, dotFigure, notKept], 0)
  beat13.fromTo(runInput, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.6)
  rise(beat13, runInputLabel, 0.8)
  draw(beat13, runIn, 0.9, 0.3)
  beat13.fromTo(runModel, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.1)
  rise(beat13, runCaption, 1.4)
  draw(beat13, runCaptionIn, 1.7, 0.3)
  draw(beat13, runOut, 2.0, 0.3)
  beat13.fromTo(blur, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 2.3)
  rise(beat13, blurLabel, 2.7)

  return [beat5, beat6, beat7, beat8, beat9, beat10, beat11, beat12, beat13]
}
