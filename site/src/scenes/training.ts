// Section II, beats 5-7: how the model is trained. Make a noisy example,
// have the model predict the noise, and train it so that the prediction
// matches the noise that was really added.
//
// No clean image comes out of the model in these beats: going straight to a
// clean image is exactly what the next beats show does not work.
import gsap from 'gsap'
import { arrow, assets, bend, box, chip, draw, el, fade, headline, label, overlay, place, rise, shot, stroke, wordsIn, wordsOut, type Subject } from '../kit'
import { title } from '../beats'
import { NoiseField, NoisyImage, seeded } from '../noise'

const Y = 640
/** The noise level the dial lands on. */
const LEVEL = 0.62
/** Seed of the noise added to the example; the model's prediction settles into this same noise. */
const SEED = 501

// Beat 5, left to right: stack, picked image, plus, dial, arrow, noisy example.
const STACK = { x: 254, size: 280 }
const PICK = { x: 660, size: 300 }
const DIAL = { x: 1060, y: Y + 40, r: 100 }
const NOISY = { x: 1500, size: 300 }

// Beat 6, left to right: the example, the model, its predicted noise, the
// noise that was really added, and the difference between the two.
const INPUT = { x: 254, y: 600 }
const MODEL = { x: 504, y: 520, w: 260, h: 240 }
const PREDICTED = { x: 979, size: 230 }
const ACTUAL = { x: 1272, size: 200 }
const DIFFERENCE = { x: 1566, size: 230 }
/** How wrong the prediction still is once trained (0 would be a perfect match). */
const FLOOR = 0.18

// Beat 7: training. The examples the model is shown, in turn, each with
// its noise level.
const EXAMPLES: { subject: Subject; level: number }[] = [
  { subject: 'cat', level: LEVEL },
  { subject: 'girl', level: 0.35 },
  { subject: 'lighthouse', level: 0.8 },
  { subject: 'cat', level: LEVEL },
]
/** How far along the difference curve training has got when each example is done. */
const TRAINED = [0.5, 0.72, 0.92, 1]
// The difference over training, as a small line chart under the comparison.
const CHART = { x: 1184, y: 870, w: 520, h: 92 }

export function training(root: HTMLElement) {
  const examples = headline(root, title('5'))
  const predicts = headline(root, title('6'))
  const shrinks = headline(root, title('7'))
  const lines = overlay(root)

  // ---- Beat 5 furniture
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

  // ---- Beat 6 furniture
  const levelChip = chip(root, `noise level ${LEVEL}`, INPUT.x, INPUT.y + 230)
  const model = box(root, 'Model', MODEL.x, MODEL.y, MODEL.w, MODEL.h, 'accent')
  const imageIn = arrow(lines, INPUT.x + 166, MODEL.x - 20, INPUT.y + 20)
  const levelIn = bend(lines, INPUT.x + 150, INPUT.y + 230, 460, INPUT.y + 230, 430, MODEL.y + 190, MODEL.x - 20, MODEL.y + 190)
  const modelOut = arrow(lines, MODEL.x + MODEL.w + 20, PREDICTED.x - PREDICTED.size / 2 - 24, Y)

  // The prediction starts as the wrong noise and settles into the right one.
  const prediction = new NoiseField(384, SEED, 777)
  prediction.mix = 1
  prediction.render()
  const predicted = shot(root, prediction.canvas, PREDICTED.x, Y, PREDICTED.size)
  const predictedLabel = label(root, 'predicted noise', PREDICTED.x, Y + PREDICTED.size / 2 + 20)

  // Two pictures of noise look alike whether or not they match, so the
  // comparison gets a picture of its own: the difference between them,
  // bright where they disagree and black where they agree.
  const actualNoise = new NoiseField(384, SEED, SEED)
  const gap = new NoiseField(384, SEED, 777, true)
  gap.mix = 1
  gap.render()
  const labelY = Y + PREDICTED.size / 2 + 20
  const compare = label(root, 'Compare it with the noise we really added', (PREDICTED.x + DIFFERENCE.x) / 2, Y - PREDICTED.size / 2 - 60, 'tag', 760)
  const minusNoise = label(root, '−', (PREDICTED.x + PREDICTED.size / 2 + ACTUAL.x - ACTUAL.size / 2) / 2, Y - 36, 'symbol small', 80)
  const actual = shot(root, actualNoise.canvas, ACTUAL.x, Y, ACTUAL.size)
  const actualLabel = label(root, 'the noise we added', ACTUAL.x, labelY, 'caption', 300)
  const equalsNoise = label(root, '=', (ACTUAL.x + ACTUAL.size / 2 + DIFFERENCE.x - DIFFERENCE.size / 2) / 2, Y - 36, 'symbol small', 80)
  const differenceShot = shot(root, gap.canvas, DIFFERENCE.x, Y, DIFFERENCE.size, 'outlined')
  const differenceLabel = label(root, 'the difference', DIFFERENCE.x, labelY, 'caption', 300)
  const noisePictures = [prediction.canvas, actualNoise.canvas, gap.canvas]

  // ---- Beat 7 furniture: the difference over training. The curve is a
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
  const everyTime = label(root, 'a different image and noise level every time', INPUT.x + 130, INPUT.y + 276, 'caption', 560)

  // ---- Beat 5: pick an image, spin the dial, add that much noise.
  const dial = { value: 0 }
  const setDial = () => {
    // Written directly: gsap.set would round this fraction to a whole pixel.
    filled.style.strokeDashoffset = String(1 - dial.value)
    gsap.set(needle, { rotation: -90 + dial.value * 180 })
    reading.textContent = dial.value.toFixed(2)
    example.level = dial.value
    example.render()
  }
  const beat5 = gsap.timeline()
  wordsIn(beat5, examples, 0)
  rise(beat5, pileLabel, 0.3)
  beat5
    .fromTo(pile, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)', stagger: 0.08 }, 0.3)
    .fromTo(pick, { x: STACK.x - PICK.x, scale: STACK.size / PICK.size, autoAlpha: 0 }, { x: 0, scale: 1, autoAlpha: 1, duration: 0.8, ease: 'power3.inOut' }, 1.0)
  rise(beat5, [pickLabel, plus], 1.6, 0.1)
  draw(beat5, track, 1.7, 0.4)
  beat5.fromTo([needle, reading], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.9)
  rise(beat5, dialLabel, 1.9)
  draw(beat5, toNoisy, 2.1, 0.4)
  beat5.fromTo(noisy, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.3)
  rise(beat5, noisyLabel, 2.6)
  // The dial swings about before it settles: the level is random.
  beat5
    .to(dial, { value: 0.92, duration: 0.6, ease: 'power2.inOut', onUpdate: setDial }, 2.6)
    .to(dial, { value: 0.2, duration: 0.5, ease: 'power2.inOut', onUpdate: setDial }, 3.2)
    .to(dial, { value: LEVEL, duration: 0.6, ease: 'back.out(2)', onUpdate: setDial }, 3.7)

  // ---- Beat 6: the example and its level go in, a noise prediction comes
  // out, and it is nothing like the noise that was added: no training yet.
  const beat6 = gsap.timeline()
  wordsOut(beat6, examples, 0)
  wordsIn(beat6, predicts, 0.4)
  fade(beat6, [...pile, pileLabel, pick, pickLabel, plus, track, filled, needle, reading, dialLabel, toNoisy, noisyLabel], 0)
  beat6.to(noisy, { x: INPUT.x - NOISY.x, y: INPUT.y - Y, duration: 1.1, ease: 'power3.inOut' }, 0.3)
  rise(beat6, levelChip, 1.3)
  beat6.fromTo(model, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 1.7)
  draw(beat6, imageIn, 2.1, 0.5)
  draw(beat6, levelIn, 2.3, 0.6)
  draw(beat6, modelOut, 3.1, 0.5)
  beat6.fromTo(predicted, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 3.5)
  rise(beat6, predictedLabel, 3.9)
  rise(beat6, compare, 4.7)
  rise(beat6, minusNoise, 4.9)
  beat6.fromTo(actual, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 5.0)
  rise(beat6, actualLabel, 5.4)
  rise(beat6, equalsNoise, 5.9)
  beat6.fromTo(differenceShot, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 6.0)
  rise(beat6, differenceLabel, 6.4)

  // ---- Beat 7: training. The prediction gets closer to the real noise,
  // on this example and then on others, each with its own noise level.
  const training = { progress: 0, example: 0 }
  const setTraining = () => {
    const at = Math.min(points.length - 1, Math.round(training.progress * (points.length - 1)))
    curve.style.strokeDashoffset = String(1 - training.progress)
    marker.style.left = `${points[at].x}px`
    marker.style.top = `${points[at].y}px`
  }
  const setExample = () => {
    example.frame = training.example
    levelChip.textContent = `noise level ${EXAMPLES[Math.round(training.example)].level}`
    example.render()
  }
  // How wrong the prediction is: 1 is unrelated noise, 0 a perfect match.
  const wrong = { value: 1 }
  const setWrong = () => {
    prediction.mix = gap.mix = wrong.value
    prediction.render()
    gap.render()
  }
  setTraining()
  const beat7 = gsap.timeline()
  wordsOut(beat7, predicts, 0)
  wordsIn(beat7, shrinks, 0.4)
  draw(beat7, axes, 0.6, 0.5)
  rise(beat7, [yLabel, xLabel], 0.8, 0.1)
  beat7.fromTo(marker, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.1)
  // The first example: the prediction settles towards the real noise, and
  // the difference picture goes dark.
  beat7
    .to(training, { progress: TRAINED[0], duration: 3, ease: 'power1.out', onUpdate: setTraining }, 1.3)
    .to(wrong, { value: FLOOR, duration: 3, ease: 'power2.inOut', onUpdate: setWrong }, 1.3)
  rise(beat7, everyTime, 4.6)
  // Then other examples, each with its own noise: wrong at first, then corrected.
  EXAMPLES.slice(1).forEach(({ level }, k) => {
    const at = 4.8 + k * 1.5
    beat7
      .to(training, { example: k + 1, duration: 0.4, ease: 'power2.inOut', onUpdate: setExample }, at)
      .to(example, { level, duration: 0.4, onUpdate: example.render }, at)
      .to(wrong, { value: 0.45, duration: 0.3, onUpdate: setWrong }, at)
      // A quarter turn stands in for a fresh sample of noise.
      .set(noisePictures, { rotation: 90 * (k + 1) }, at + 0.15)
      .to(wrong, { value: FLOOR, duration: 0.8, ease: 'power2.out', onUpdate: setWrong }, at + 0.4)
      .to(training, { progress: TRAINED[k + 1], duration: 1.2, ease: 'none', onUpdate: setTraining }, at + 0.1)
  })
  rise(beat7, never, 9.0)

  return [beat5, beat6, beat7]
}
