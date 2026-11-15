// Section III, why the predictions blur: one caption fits many images, so what
// the model learns to output depends on how much noise is left.
//   III.A  images can have the same caption: two real photos with the same
//           caption go to full noise and become one input to the model,
//           with the two photos as its two originals
//   III.B  the average minimizes the error: more photos with the same
//           caption join the two originals, merge into the output, and
//           become the model's real prediction from pure noise
//   III.C  little noise gives the right image, in the same diagram
//   III.D  more noise, blurrier predictions
//
// Every model picture is a real model state or output, recorded by
// tools/assets.py (portrait(), second() and hedge()) and shown as it is.
// Two exceptions: in III.A the output shows each photo in turn, labelled
// as what the model could output, and in III.B the photos merge into the
// output as an illustration (their stack is their true average), before
// the real prediction replaces them.
import gsap from 'gsap'
import './reverse.css'
import { arrow, assets, box, draw, el, fade, gear, headline, hold, label, line, overlay, place, promptChip, rise, shot, stroke, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { NoisyImage } from '../noise'

/** The prompt the portrait runs were recorded with (PORTRAIT_PROMPT in tools/assets.py). */
export const PORTRAIT_PROMPT = 'a man in a suit and tie, smiling'

/** The centre line of the pictures in every beat of this scene. */
const Y = 640

// The start of III.A: the two photos side by side.
const PHOTOS = { xs: [560, 1360], size: 440 }
// III.A to III.C, left to right: the input, the model (with the caption
// from above), its output, and the two originals.
const INPUT = { x: 290, size: 300 }
const MODEL = { x: 560, w: 220, h: 200 }
const MODEL_CX = MODEL.x + MODEL.w / 2
const CAPTION_Y = 440
const PRED = { x: 1030, size: 280 }
const ORIG = { xs: [1420, 1690], size: 220 }
// III.B: the two originals and five more photos with the same caption, in
// two rows to the right of the output.
const MANY = { size: 140, rows: [[1300, 1450, 1600, 1750], [1375, 1525, 1675]], ys: [Y - 75, Y + 75] }
// III.C: four real predictions, from less and less information.
const LADDER = { xs: [300, 740, 1180, 1620], size: 380 }

/** A picture that dissolves from one recorded image into the next as `frame` goes from 0 to 1. */
function morph(from: CanvasImageSource, to: CanvasImageSource) {
  return new NoisyImage([from, to], 384, 1)
}

/** Shows a picture that grows in. */
const popIn = { autoAlpha: 0, scale: 0.85 }
const popped = { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }

// The error bars of III.A and III.B. Each error is the real mean squared
// difference between the output and a photo, over the red, green and blue
// values of a 96x96 copy (centre-cropped, as the photos are shown). A full
// bar is ERROR_FULL. The overall bar shows the mean over the photos.
const SAMPLE = 96
const ERROR_FULL = 10000
/** The overall error bar, under the originals and under the photos of III.B. */
const OVERALL = { x: 1300, y: 940, w: 520, h: 16 }

/** The red, green and blue values of a picture, centre-cropped to a square. */
function pixels(picture: HTMLImageElement) {
  const canvas = el('canvas')
  canvas.width = canvas.height = SAMPLE
  const ctx = canvas.getContext('2d')!
  const side = Math.min(picture.naturalWidth, picture.naturalHeight)
  ctx.drawImage(picture, (picture.naturalWidth - side) / 2, (picture.naturalHeight - side) / 2, side, side, 0, 0, SAMPLE, SAMPLE)
  return Float32Array.from(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data)
}

/** The mean squared difference between two pictures, over red, green and blue. */
function error(a: Float32Array, b: Float32Array) {
  let sum = 0
  for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) sum += (a[i + c] - b[i + c]) ** 2
  return sum / ((a.length / 4) * 3)
}

/** The exact pixel average of a set of pictures. */
function mean(set: Float32Array[]) {
  const out = new Float32Array(set[0].length)
  set.forEach((p) => p.forEach((v, i) => (out[i] += v / set.length)))
  return out
}

/** An error bar: a track with a fill. The fill's width is set by `fillTo`. */
function errorBar(parent: HTMLElement, x: number, y: number, w: number, h: number, className = '') {
  const bar = place(el('div', `error-bar ${className}`), x, y, w, h)
  bar.append(el('i'))
  parent.append(bar)
  return bar
}

/** A tween target and vars that fill each bar to its error. */
const fillTo = (bars: HTMLElement[], errors: number[], duration = 0.6) => [
  bars.map((bar) => bar.firstElementChild!),
  { width: (i: number) => `${Math.min(100, (errors[i] / ERROR_FULL) * 100)}%`, duration, ease: 'power2.inOut' },
] as const
const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

export function portraits(root: HTMLElement) {
  root.classList.add('reverse')
  const many = headline(root, title('14'))
  const averageTitle = headline(root, title('15'))
  const right = headline(root, title('16'))
  const blurrier = headline(root, title('17'))
  const sharpTitle = headline(root, title('18'))
  const lines = overlay(root)
  const prompt = promptChip(root, PORTRAIT_PROMPT)
  const photos = [assets.portrait, assets.second.photo]

  // ---- III.A furniture. The first photo's picture is also the model's
  // input for the rest of the scene: full noise, then 32% noise of the
  // first photo, then 32% noise of the second.
  const drowning = [
    new NoisyImage([photos[0], assets.second.full[0], assets.noised[0], assets.second.noised], 384, 1),
    morph(photos[1], assets.second.full[1]),
  ]
  const photoShots = drowning.map((picture, i) => shot(root, picture.canvas, PHOTOS.xs[i], Y, PHOTOS.size))

  const below = (x: number, size: number, text: string, width = 420) => label(root, text, x, Y + size / 2 + 20, 'caption', width)
  const inputFull = below(INPUT.x, INPUT.size, '100% noise')
  const inputLight = below(INPUT.x, INPUT.size, '32% noise')
  const model = box(root, 'Model', MODEL.x, Y - MODEL.h / 2, MODEL.w, MODEL.h, 'accent')
  const imageIn = arrow(lines, INPUT.x + INPUT.size / 2 + 20, MODEL.x - 18, Y)
  const captionIn = line(lines, MODEL_CX, CAPTION_Y + 32, MODEL_CX, Y - MODEL.h / 2 - 16)
  const modelOut = arrow(lines, MODEL.x + MODEL.w + 18, PRED.x - PRED.size / 2 - 20, Y)
  // The output: first each photo in turn (what the model could output), then
  // its real predictions: from full noise, and from 32% noise of each photo.
  const output = new NoisyImage([photos[0], photos[1], assets.second.ghost[0], assets.near, assets.second.near], 384, 1)
  const outShot = shot(root, output.canvas, PRED.x, Y, PRED.size)
  const outIf = below(PRED.x, PRED.size, 'if it outputs this man')
  const outReal = below(PRED.x, PRED.size, 'prediction after training', 460)
  const originals = photos.map((photo, i) => shot(root, new NoisyImage(photo, 384, 1).canvas, ORIG.xs[i], Y, ORIG.size))
  const originalsLabel = below((ORIG.xs[0] + ORIG.xs[1]) / 2, ORIG.size, 'the two originals', 500)
  // A ring around the original the output matches, and a cross over the one it misses.
  const pad = 12
  const ring = place(el('div', 'answer-ring'), ORIG.xs[0] - ORIG.size / 2 - pad, Y - ORIG.size / 2 - pad, ORIG.size + 2 * pad, ORIG.size + 2 * pad)
  root.append(ring)
  const toSecond = ORIG.xs[1] - ORIG.xs[0]
  const cross = (cx: number) => {
    const h = ORIG.size / 2 - 24
    return [stroke(lines, `M${cx - h} ${Y - h} L${cx + h} ${Y + h}`, 'strike'), stroke(lines, `M${cx + h} ${Y - h} L${cx - h} ${Y + h}`, 'strike')]
  }
  const crosses = ORIG.xs.map(cross)
  root.append(lines) // keep the crosses above the originals

  // III.A and III.B are training: a tag says so, and the model has the
  // training gear of II.D.2 on its corner.
  const trainingTag = place(el('span', 'tag', 'During training'), 104, 300)
  root.append(trainingTag)
  const modelGear = gear(lines, MODEL.x + MODEL.w, Y - MODEL.h / 2)

  // An error bar on each original, and the overall error under them.
  const twoPixels = photos.map(pixels)
  const manErrors = twoPixels.map((man) => twoPixels.map((photo) => error(man, photo)))
  const originalBars = originals.map((shotNode) => errorBar(shotNode, 16, ORIG.size - 30, ORIG.size - 32, 12))
  const overallBar = errorBar(root, OVERALL.x, OVERALL.y, OVERALL.w, OVERALL.h, 'overall')
  const overallLabel = place(el('span', 'caption left', 'overall error'), OVERALL.x, OVERALL.y - 44)
  root.append(overallLabel)
  // The ring is used again in III.C; until then it is hidden.
  gsap.set([...originalBars, overallBar, overallLabel, ring, trainingTag], { autoAlpha: 0 })
  const step = (picture: NoisyImage, frame: number) => ({ frame, duration: 1.2, ease: 'power1.inOut', onUpdate: picture.render })

  // ---- III.A: two real photos, one caption. The photos move into place as
  // the two originals; the rest of the training diagram pops in around them:
  // the input at full noise, the model and the caption.
  const beat14 = gsap.timeline()
  wordsIn(beat14, many, 0)
  rise(beat14, prompt, 0.3)
  photoShots.forEach((picture, i) => {
    beat14.fromTo(picture, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.out' }, 0.5 + i * 0.4)
  })
  // Stop before the photos leave their places.
  hold(beat14, 1.8)
  photoShots.forEach((picture, i) => {
    beat14.to(picture, { x: ORIG.xs[i] - PHOTOS.xs[i], scale: ORIG.size / PHOTOS.size, duration: 0.9, ease: 'power3.inOut' }, 1.9)
  })
  // The originals take over at the same place, so the swap does not show.
  gsap.set(originals, { autoAlpha: 0 })
  beat14.set(originals, { autoAlpha: 1 }, 2.8)
  beat14.set(photoShots, { autoAlpha: 0 }, 2.8)
  rise(beat14, originalsLabel, 2.9)
  // The first photo's picture becomes the input: full noise, at its own place.
  beat14.set(photoShots[0], { x: INPUT.x - PHOTOS.xs[0], scale: INPUT.size / PHOTOS.size }, 2.85)
  beat14.to(drowning[0], { frame: 1, duration: 0.01, onUpdate: drowning[0].render }, 2.85)
  beat14.fromTo(photoShots[0], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, 3.2)
  rise(beat14, inputFull, 3.4)
  beat14.fromTo(model, popIn, { ...popped }, 3.6)
  beat14.fromTo(modelGear, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, 3.9)
  rise(beat14, trainingTag, 4.6)
  draw(beat14, imageIn, 3.9, 0.4)
  beat14.to(prompt, { left: () => MODEL_CX - prompt.offsetWidth / 2, top: CAPTION_Y, duration: 0.8, ease: 'power3.inOut' }, 3.9)
  draw(beat14, captionIn, 4.7, 0.3)
  // Say it outputs the first man: right for the first photo, wrong for the second.
  draw(beat14, modelOut, 5.3, 0.4)
  beat14.fromTo(outShot, popIn, { ...popped }, 5.6)
  rise(beat14, outIf, 5.9)
  // The error bars: none for the first photo, a full one for the second.
  beat14.to([...originalBars, overallBar, overallLabel], { autoAlpha: 1, duration: 0.4 }, 6.2)
  beat14.to(...fillTo(originalBars, manErrors[0]), 6.5)
  beat14.to(...fillTo([overallBar], [average(manErrors[0])]), 6.5)
  // Stop before the first man leaves the output. Then the second man: the
  // bars swap, and the overall error stays the same.
  hold(beat14, 7.2)
  beat14.to(output, step(output, 1), 7.4)
  beat14.to(...fillTo(originalBars, manErrors[1], 1.2), 7.4)
  beat14.to(...fillTo([overallBar], [average(manErrors[1])], 1.2), 7.4)

  // ---- III.B: the diagram stays. More photos with the same caption join
  // the two originals; every one of them is a right answer. Each photo gets
  // an error bar for the second man in the output. Copies of all the photos
  // then merge into the output: their exact average. Every single error is
  // now medium, and the overall error is lower than for any one man. Then
  // the bars go, and the average becomes the model's real prediction from
  // pure noise: a blurry man in a dark suit.
  const beat15 = gsap.timeline()
  wordsOut(beat15, many, 0)
  wordsIn(beat15, averageTitle, 0.4)
  fade(beat15, [ring, ...crosses.flat()], 0)

  const slots = MANY.rows.flatMap((xs, r) => xs.map((x) => ({ x, y: MANY.ys[r] })))
  const sources = [...photos, ...assets.sameCaption]
  const picture = (photo: HTMLImageElement, i: number) => {
    const node = place(el('img', 'merge-photo'), slots[i].x - MANY.size / 2, slots[i].y - MANY.size / 2, MANY.size, MANY.size)
    node.src = photo.src
    root.append(node)
    return node
  }
  const group = sources.map(picture)
  const groupBars = slots.map(({ x, y }) => errorBar(root, x - MANY.size / 2 + 10, y + MANY.size / 2 - 22, MANY.size - 20, 10))
  // The copies that merge into the output, above everything else.
  const fliers = sources.map(picture)
  gsap.set([...groupBars, ...fliers], { autoAlpha: 0 })
  const manyLabel = label(root, 'all with this caption', 1525, MANY.ys[1] + MANY.size / 2 + 20, 'caption', 500)

  // The real errors: of the second man, and of the exact average of all seven.
  const sevenPixels = sources.map(pixels)
  const secondErrors = sevenPixels.map((photo) => error(sevenPixels[1], photo))
  const meanPixels = mean(sevenPixels)
  const meanErrors = sevenPixels.map((photo) => error(meanPixels, photo))

  // The two originals shrink into the first two places; the others pop in.
  fade(beat15, [...originals, originalsLabel, ...originalBars], 0.6)
  group.slice(0, 2).forEach((node, i) => {
    beat15.fromTo(node, { autoAlpha: 0, x: ORIG.xs[i] - slots[i].x, y: Y - slots[i].y, scale: ORIG.size / MANY.size },
      { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.8, ease: 'power3.inOut' }, 0.6)
  })
  beat15.fromTo(group.slice(2), popIn, { ...popped, stagger: 0.15 }, 1.3)
  rise(beat15, manyLabel, 2.1)
  // Every photo gets its error for the second man; more photos, more error overall.
  beat15.to(groupBars, { autoAlpha: 1, duration: 0.3 }, 2.4)
  beat15.to(...fillTo(groupBars, secondErrors), 2.6)
  beat15.to(...fillTo([overallBar], [average(secondErrors)]), 2.6)
  // Stop before the label of the second man leaves.
  hold(beat15, 3.4)
  fade(beat15, outIf, 3.5)
  // Training: the gear turns, and copies of the photos merge into the output
  // one after the other, the second man first, since he is the output now.
  // The k-th copy in the stack has opacity 1/(k+1), so after each copy the
  // stack shows the exact average of the photos so far. The bars follow:
  // the errors of that average, so the overall error goes down.
  const order = [1, 0, 2, 3, 4, 5, 6]
  const STEP = 0.5
  const start = 3.6
  order.forEach((i, k) => {
    const at = start + k * STEP
    beat15.set(fliers[i], { autoAlpha: 1 }, at)
    beat15.to(fliers[i], { x: PRED.x - slots[i].x, y: Y - slots[i].y, scale: PRED.size / MANY.size, autoAlpha: 1 / (k + 1), duration: 0.6, ease: 'power3.inOut' }, at)
    const sofar = mean(order.slice(0, k + 1).map((j) => sevenPixels[j]))
    const errors = sevenPixels.map((photo) => error(sofar, photo))
    beat15.to(...fillTo(groupBars, errors, 0.4), at + 0.5)
    beat15.to(...fillTo([overallBar], [average(errors)], 0.4), at + 0.5)
  })
  const trained = start + order.length * STEP + 0.6
  beat15.fromTo(modelGear, { rotation: 0 }, { rotation: 540, duration: trained - start, ease: 'none', immediateRender: false }, start)
  // The second man's output goes under the first copy, which is the same picture.
  beat15.set(outShot, { autoAlpha: 0 }, start + 0.6)
  // While it is hidden, the output becomes the model's real prediction.
  beat15.to(output, { frame: 2, duration: 0.1, onUpdate: output.render }, start + 0.7)
  // Stop before the bars and the average leave. After training, the model's
  // real prediction from pure noise.
  hold(beat15, trained + 0.3)
  const real = trained + 0.4
  fade(beat15, [...groupBars, overallBar, overallLabel, trainingTag, modelGear], real)
  beat15.fromTo(outShot, { autoAlpha: 0, scale: 1 }, { autoAlpha: 1, scale: 1, duration: 0.8, immediateRender: false }, real)
  beat15.to(fliers, { autoAlpha: 0, duration: 0.8 }, real)
  rise(beat15, outReal, real + 0.5)

  // ---- III.C: the same diagram from 32% noise. The noise still shows
  // which man it is, so the prediction is the right photo: first for the
  // first photo, then for the second.
  const beat16 = gsap.timeline()
  wordsOut(beat16, averageTitle, 0)
  wordsIn(beat16, right, 0.4)
  // The two originals come back: this beat is about one photo at a time.
  fade(beat16, [...group, manyLabel], 0)
  beat16.to([...originals, originalsLabel], { autoAlpha: 1, duration: 0.5 }, 0.4)
  fade(beat16, inputFull, 0.4)
  beat16.to(drowning[0], step(drowning[0], 2), 0.6)
  rise(beat16, inputLight, 1.2)
  beat16.to(output, step(output, 3), 1.8)
  beat16.fromTo(ring, { autoAlpha: 0, x: 0, scale: 1.1 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.4, ease: 'power2.out', immediateRender: false }, 2.9)
  beat16.to(originals[1], { opacity: 0.3, duration: 0.4 }, 2.9)
  // Stop before the first photo's input leaves.
  hold(beat16, 3.6)
  beat16.to(drowning[0], step(drowning[0], 3), 3.7)
  beat16.to(output, step(output, 4), 4.5)
  beat16.to(ring, { x: toSecond, duration: 0.6, ease: 'power3.inOut' }, 5.5)
  beat16.to(originals[1], { opacity: 1, duration: 0.4 }, 5.5)
  beat16.to(originals[0], { opacity: 0.3, duration: 0.4 }, 5.5)

  // ---- III.D: the prediction moves to the start of a row of four real
  // predictions from less and less information, and becomes the first
  // photo's again, so the row is about one man.
  const guess = shot(root, new NoisyImage(assets.guess, 384, 1).canvas, LADDER.xs[1], Y, LADDER.size)
  const fromCaption = shot(root, new NoisyImage(assets.second.ghost[0], 384, 1).canvas, LADDER.xs[2], Y, LADDER.size)
  const fromNothing = shot(root, new NoisyImage(assets.hedge.none, 384, 1).canvas, LADDER.xs[3], Y, LADDER.size)
  const ladderLabels = ['from 32% noise', 'from 72% noise', 'pure noise and caption', 'pure noise, no text'].map((text, i) => label(root, text, LADDER.xs[i], Y + LADDER.size / 2 + 20, 'caption', LADDER.size + 60))
  const beat17 = gsap.timeline()
  wordsOut(beat17, right, 0)
  wordsIn(beat17, blurrier, 0.4)
  fade(beat17, [photoShots[0], inputLight, model, imageIn, captionIn, modelOut, ...originals, originalsLabel, ring, outReal], 0)
  beat17.to(prompt, { left: 104, top: 310, duration: 0.8, ease: 'power3.inOut' }, 0.3)
  beat17.to(outShot, { x: LADDER.xs[0] - PRED.x, scale: LADDER.size / PRED.size, duration: 0.9, ease: 'power3.inOut' }, 0.3)
  beat17.to(output, { frame: 3, duration: 0.9, ease: 'power1.inOut', onUpdate: output.render }, 0.3)
  rise(beat17, ladderLabels[0], 1.1)
  ;[guess, fromCaption, fromNothing].forEach((picture, i) => {
    beat17.fromTo(picture, popIn, { ...popped }, 1.6 + i * 0.9)
    rise(beat17, ladderLabels[i + 1], 1.9 + i * 0.9)
  })

  // ---- III.E: two predictions stay, the blur from pure noise and the
  // caption on the left, the sharp one from 32% noise on the right, and a
  // question between them: how to get from one to the other.
  const ENDS = { left: 560, right: 1360 }
  const toSharp = arrow(lines, ENDS.left + LADDER.size / 2 + 40, ENDS.right - LADDER.size / 2 - 40, Y)
  const how = label(root, '?', (ENDS.left + ENDS.right) / 2, Y - 110, 'symbol', 120)
  const beat18 = gsap.timeline()
  wordsOut(beat18, blurrier, 0)
  wordsIn(beat18, sharpTitle, 0.4)
  fade(beat18, [guess, fromNothing, ladderLabels[1], ladderLabels[3]], 0)
  beat18.to([fromCaption, ladderLabels[2]], { x: ENDS.left - LADDER.xs[2], duration: 0.9, ease: 'power3.inOut' }, 0.3)
  beat18.to(outShot, { x: ENDS.right - PRED.x, duration: 0.9, ease: 'power3.inOut' }, 0.3)
  beat18.to(ladderLabels[0], { x: ENDS.right - LADDER.xs[0], duration: 0.9, ease: 'power3.inOut' }, 0.3)
  draw(beat18, toSharp, 1.4, 0.5)
  rise(beat18, how, 1.8)

  return [beat14, beat15, beat16, beat17, beat18]
}
