// Section IV.A and IV.B, the car: generating from pure noise (IV.A): the colour
// wheel's first round, a small step toward the prediction, fewer answers as the
// noise goes (the second round), and the image appearing; then why the result
// depends on the training data (IV.B).
//
// Every car picture is a real model state, result or prediction, recorded by
// tools/assets.py (car() and car_predictions()).
import gsap from 'gsap'
import './generate.css'
import { assets, box, draw, el, fade, headline, hold, label, line, overlay, place, promptChip, rise, shot, stroke, wordsIn, wordsOut, type Timeline } from '../kit'
import { title } from '../beats'
import { NoisyImage } from '../noise'
import { PORTRAIT_PROMPT } from './reverse'

/** The car run's prompt, in short (CAR_PROMPT in tools/assets.py). */
const RUN_PROMPT = 'a sports car parked on a city street'
/** The step the colour wheel's second round branches from (CAR_STEP in tools/assets.py). */
const BRANCH_STEP = 18
const STEPS = 30

// The wheel layout, left to right: the run's frame with a box on the car and
// a step counter under it; the model's prediction; the colour wheel. The box
// is in fractions of the picture: the car's body, which is in about the same
// place in every result.
const SIDE = { x: 324, y: 610, size: 440 }
const OWN = { x: 824, y: 610, size: 440 }
const BOX = { x: 0.25, y: 0.56, w: 0.45, h: 0.2 }
const STEPBAR = { x: 104, y: 846, w: 440 }
const WHEEL = { x: 1540, y: 620, r: 240, dot: 30 }
/** The colourfulness (max - min of the channels, 0-255) that reaches the wheel's edge. */
const CHROMA_EDGE = 128
/** The results show large, three at a time, in the space left of the wheel. Then each one shrinks into its dot. */
const GROUP = { x: 104, y: 640, size: 360, gap: 40, count: 3 }

// IV.A.1: the noise alone.
const FRAME = { x: 960, y: 670, size: 560 }
// IV.A.3: the noise, plus a bit of the prediction, is the next state.
const TERMS = { xs: [430, 960, 1490], y: 660, size: 420 }
// IV.A.5: the run and the prediction side by side, with the counter between them.
const PAIR = { xs: [530, 1390], y: 610, size: 460 }
const MID = { x: 960, y: 560, w: 280 }

// IV.B: one noisy portrait in the middle, a model and its result on each
// side. FAR_INDEX is the frame of the noising strip it starts from (FAR in
// tools/assets.py).
const FAR_INDEX = 3
const SOURCE = { x: 960, y: 660, size: 400 }
const RESULT = { y: 700, size: 440, xs: [324, 1596] }
const MODEL = { y: 390, h: 70 }

const css = (rgb: number[]) => `rgb(${rgb.map(Math.round).join(', ')})`

/** The average colour inside the box. */
function colourOf(image: HTMLImageElement) {
  const canvas = el('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, 128, 128)
  const data = ctx.getImageData(BOX.x * 128, BOX.y * 128, BOX.w * 128, BOX.h * 128).data
  const sum = [0, 0, 0]
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c]
  return sum.map((v) => v / (data.length / 4))
}

/** Where a colour sits on the wheel: the angle is its hue, the distance from the grey middle how colourful it is. */
function onWheel([r, g, b]: number[]) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min
  let hue = 0
  if (chroma > 0) {
    if (max === r) hue = ((g - b) / chroma + 6) % 6
    else if (max === g) hue = (b - r) / chroma + 2
    else hue = (r - g) / chroma + 4
  }
  const angle = (hue / 6) * Math.PI * 2
  // Distance is max - min of the channels. Dividing by max instead would push dark, muddy colours far out.
  const distance = Math.min(1, chroma / CHROMA_EDGE) * (WHEEL.r - WHEEL.dot / 2)
  // Red at the top, then clockwise through yellow, green, cyan, blue and magenta, as the wheel is drawn.
  return { x: WHEEL.x + distance * Math.sin(angle), y: WHEEL.y - distance * Math.cos(angle) }
}

/**
 * The colour wheel and everything on it, built in one scene: the run's frame at
 * the side with its box and step counter, the model's prediction, the twelve
 * results of each round with their dots, and the prediction's mark.
 */
function wheelKit(root: HTMLElement) {
  const run = new NoisyImage(assets.car.run, 384, 1)
  const frame = shot(root, run.canvas, SIDE.x, SIDE.y, SIDE.size)
  const wheel = place(el('div', 'colour-wheel'), WHEEL.x - WHEEL.r, WHEEL.y - WHEEL.r, WHEEL.r * 2, WHEEL.r * 2)
  root.append(wheel)
  const wheelTag = label(root, 'The colour inside the box', WHEEL.x, WHEEL.y - WHEEL.r - 52, 'tag', 640)
  const colourBox = place(el('div', 'colour-box'), SIDE.x - SIDE.size / 2 + BOX.x * SIDE.size, SIDE.y - SIDE.size / 2 + BOX.y * SIDE.size, BOX.w * SIDE.size, BOX.h * SIDE.size)
  root.append(colourBox)
  /** The box, drawn on a picture: a child in fractions of the picture. */
  const boxMark = () => {
    const mark = el('i', 'grid-box')
    Object.assign(mark.style, { left: `${BOX.x * 100}%`, top: `${BOX.y * 100}%`, width: `${BOX.w * 100}%`, height: `${BOX.h * 100}%` })
    return mark
  }

  const stepCount = place(el('div', 'step-count'), STEPBAR.x, STEPBAR.y, STEPBAR.w)
  const stepNumber = el('span', 'count', '0')
  stepCount.append(el('span', 'tag', 'Step'), stepNumber, el('span', 'of', `/ ${STEPS}`))
  const stepTicks = place(el('div', 'ticks'), STEPBAR.x, STEPBAR.y + 74, STEPBAR.w)
  const stepTickList = Array.from({ length: STEPS }, () => stepTicks.appendChild(el('i')))
  root.append(stepCount, stepTicks)

  // The prediction after every step (the last one is the result), its colour, and its place on the wheel.
  const predictions = [...assets.car.pred, assets.car.run[STEPS]]
  const path = predictions.map((image) => onWheel(colourOf(image)))
  const own = new NoisyImage(predictions, 384, 1)
  const ownShot = shot(root, own.canvas, OWN.x, OWN.y, OWN.size, 'own-guess')
  ownShot.append(boxMark())
  const ownLabel = label(root, "the model's prediction", OWN.x, OWN.y + OWN.size / 2 + 22, 'caption', OWN.size)
  const mark = place(el('div', 'wheel-guess'), path[0].x - 12, path[0].y - 12, 24, 24)

  const step = { value: 0 }
  /** Show the run, the prediction and its mark at a step (fractions dissolve between steps). */
  const setStep = () => {
    run.frame = own.frame = step.value
    run.render()
    own.render()
    const k = Math.min(STEPS - 1, Math.floor(step.value))
    const f = step.value - k
    const to = path[Math.min(STEPS, k + 1)]
    gsap.set(mark, { x: path[k].x + (to.x - path[k].x) * f - path[0].x, y: path[k].y + (to.y - path[k].y) * f - path[0].y })
    const whole = Math.round(step.value)
    stepNumber.textContent = String(whole)
    stepTickList.forEach((tick, i) => tick.classList.toggle('on', i < whole))
  }

  // The twelve results of each round: the real pictures, each framed in its
  // colour on the wheel, with the box drawn on it. Each one has a slot in a
  // row of three, and a dot on the wheel.
  const groupTags = [
    place(el('span', 'tag', '12 runs, each from new noise'), GROUP.x, GROUP.y - GROUP.size / 2 - 56),
    place(el('span', 'tag', `12 results from step ${BRANCH_STEP}`), GROUP.x, GROUP.y - GROUP.size / 2 - 56),
  ]
  root.append(...groupTags)
  const rounds = [assets.car.far, assets.car.near].map((images) => {
    const colours = images.map(colourOf)
    const cells = images.map((image, i) => {
      const x = GROUP.x + (i % GROUP.count) * (GROUP.size + GROUP.gap)
      const y = GROUP.y - GROUP.size / 2
      const cell = place(el('div', 'grid-result'), x, y, GROUP.size, GROUP.size)
      cell.style.borderColor = css(colours[i])
      cell.append(image.cloneNode(), boxMark())
      root.append(cell)
      const to = onWheel(colours[i])
      // The move from the slot to the middle of the dot.
      return { cell, dx: to.x - (x + GROUP.size / 2), dy: to.y - GROUP.y }
    })
    const dots = colours.map((colour) => {
      const { x, y } = onWheel(colour)
      const dot = place(el('i', 'wheel-dot'), x - WHEEL.dot / 2, y - WHEEL.dot / 2, WHEEL.dot, WHEEL.dot)
      dot.style.background = css(colour)
      root.append(dot)
      return dot
    })
    const groups = Array.from({ length: images.length / GROUP.count }, (_, g) => {
      const span = [g * GROUP.count, (g + 1) * GROUP.count] as const
      return { cells: cells.slice(...span), dots: dots.slice(...span) }
    })
    return { dots, groups }
  })

  root.append(mark)
  const legend = place(el('div', 'wheel-legend'), WHEEL.x - 400, WHEEL.y + WHEEL.r + 26, 720)
  const legendGuess = el('span', 'legend-guess', 'the prediction')
  legend.append(legendGuess)
  root.append(legend)

  /** Fade nodes back in. Only the opacity changes, so they keep their places. */
  const appear = (tl: Timeline, nodes: HTMLElement[], at: number) => {
    tl.to(nodes, { autoAlpha: 1, duration: 0.4, ease: 'power1.out' }, at)
  }
  /** One round: its groups come in large, three at a time, and each group shrinks into its dots on the next key. Returns the time when the last dot is in. */
  const playRound = (tl: Timeline, r: number, at: number) => {
    const scale = WHEEL.dot / GROUP.size
    let t = at
    rise(tl, groupTags[r], t)
    rounds[r].groups.forEach((group) => {
      tl.fromTo(group.cells.map((c) => c.cell), { autoAlpha: 0, x: 0, y: 0, scale: 0.85 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)', stagger: 0.1 }, t + 0.2)
      t += 0.2 + 0.45 + 0.2 + 0.3
      // Stop before the group shrinks into its dots.
      hold(tl, t)
      group.cells.forEach(({ cell, dx, dy }, i) => {
        const s = t + i * 0.12
        tl.to(cell, { x: dx, y: dy, scale, borderRadius: GROUP.size / 2, duration: 0.75, ease: 'power2.inOut' }, s)
        tl.to(cell, { autoAlpha: 0, duration: 0.15 }, s + 0.65)
        tl.fromTo(group.dots[i], { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, s + 0.6)
      })
      t += (group.cells.length - 1) * 0.12 + 0.85
    })
    fade(tl, groupTags[r], t - 0.4)
    return t
  }

  // Everything starts hidden; each beat shows what it uses.
  gsap.set([wheel, wheelTag, colourBox, stepCount, stepTicks, ownShot, ownLabel, mark, legendGuess, ...groupTags, ...rounds.flatMap((r) => [...r.dots, ...r.groups.flatMap((g) => g.cells.map((c) => c.cell))])], { autoAlpha: 0 })

  return { run, frame, wheel, wheelTag, colourBox, stepCount, stepTicks, own, ownShot, ownLabel, mark, step, setStep, rounds, legend, legendGuess, appear, playRound }
}

/** IV.A and IV.B: generating from pure noise, and what the training data decides. */
export function generate(root: HTMLElement) {
  root.classList.add('generate')
  const fromNoise = headline(root, title('19'))
  const manyCars = headline(root, title('20'))
  const small = headline(root, title('21'))
  const fewer = headline(root, title('22'))
  const appears = headline(root, title('23'))
  const seen = headline(root, title('24'))
  const lines = overlay(root)
  const runPrompt = promptChip(root, RUN_PROMPT)
  const portraitPrompt = promptChip(root, PORTRAIT_PROMPT)
  const w = wheelKit(root)
  // Everything of the wheel starts hidden; the run's frame starts at the centre.
  const toFrame = { x: FRAME.x - SIDE.x, y: FRAME.y - SIDE.y, scale: FRAME.size / SIDE.size }
  gsap.set(w.frame, toFrame)

  // ---- IV.A.1: a frame of pure noise.
  const beat19 = gsap.timeline()
  wordsIn(beat19, fromNoise, 0)
  rise(beat19, runPrompt, 0.3)
  beat19.fromTo(w.frame, { clipPath: 'inset(50% 50% 50% 50% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.inOut' }, 0.4)

  // ---- IV.A.2: the colour wheel's first round. Twelve real results from
  // pure noise land all over the wheel: from pure noise the results vary a
  // lot. The model's prediction is a muddy ghost of a car.
  const round = gsap.timeline()
  wordsOut(round, fromNoise, 0)
  wordsIn(round, manyCars, 0.4)
  round.to(w.frame, { x: 0, y: 0, scale: 1, duration: 0.8, ease: 'power3.inOut' }, 0.3)
  round.fromTo(w.colourBox, { autoAlpha: 0, scale: 1.3 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out' }, 1.1)
  round.fromTo(w.wheel, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.4)' }, 1.1)
  rise(round, w.wheelTag, 1.3)
  // Stop before the noise makes room for the results.
  hold(round, 1.9)
  fade(round, [w.frame, w.colourBox], 1.9)
  let r = w.playRound(round, 0, 2.1)
  // The noise comes back, and the model's prediction lands on the wheel.
  w.appear(round, [w.frame, w.colourBox], r)
  r += 0.6
  round.fromTo(w.ownShot, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, r)
  rise(round, w.ownLabel, r + 0.2)
  round.fromTo(w.mark, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, r + 0.4)
  rise(round, w.legendGuess, r + 0.5)

  // ---- IV.A.3: the noise, plus a bit of the muddy prediction, equals the real
  // state after one step. (One sampler step is exactly that mix:
  // next = (1 - a) * noisy + a * prediction, with a small a.)
  const muddy = shot(root, new NoisyImage([assets.car.pred[0]], 384, 1).canvas, TERMS.xs[1], TERMS.y, TERMS.size)
  const stepped = new NoisyImage([assets.car.run[0], assets.car.run[1]], 384, 1)
  const next = shot(root, stepped.canvas, TERMS.xs[2], TERMS.y, TERMS.size)
  const plus = label(root, '+', (TERMS.xs[0] + TERMS.xs[1]) / 2, TERMS.y - 56, 'symbol', 100)
  const equals = label(root, '=', (TERMS.xs[1] + TERMS.xs[2]) / 2, TERMS.y - 56, 'symbol', 100)
  const termLabels = ['the noisy image', 'a bit of the prediction', 'slightly less noisy'].map((text, i) => label(root, text, TERMS.xs[i], TERMS.y + TERMS.size / 2 + 20, 'caption', TERMS.size + 60))
  const toTerm = { x: TERMS.xs[0] - SIDE.x, y: TERMS.y - SIDE.y, scale: TERMS.size / SIDE.size }
  const beat20 = gsap.timeline()
  wordsOut(beat20, manyCars, 0)
  wordsIn(beat20, small, 0.4)
  fade(beat20, [w.colourBox, w.wheel, w.wheelTag, ...w.rounds[0].dots, w.legendGuess, w.mark, w.ownShot, w.ownLabel], 0)
  beat20.to(w.frame, { ...toTerm, duration: 0.8, ease: 'power3.inOut' }, 0.3)
  rise(beat20, [plus, termLabels[0]], 1.1, 0.1)
  beat20.fromTo(muddy, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.3)
  rise(beat20, termLabels[1], 1.6)
  // Only a bit of the prediction is used, so it dims.
  beat20.to(muddy, { opacity: 0.45, duration: 0.5 }, 2.0)
  rise(beat20, equals, 2.5)
  beat20
    .fromTo(next, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.7)
    .to(stepped, { frame: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: stepped.render }, 3.0)
  rise(beat20, termLabels[2], 3.1)

  // ---- IV.A.4: back to the wheel and the first round. The run goes to the
  // branch step, the prediction follows it step by step, and the second round
  // lands in the red.
  const beat21 = gsap.timeline()
  wordsOut(beat21, small, 0)
  wordsIn(beat21, fewer, 0.4)
  fade(beat21, [muddy, next, plus, equals, ...termLabels], 0)
  beat21.to(w.frame, { x: 0, y: 0, scale: 1, duration: 0.8, ease: 'power3.inOut' }, 0.3)
  beat21.fromTo(w.colourBox, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 1.0)
  rise(beat21, [w.stepCount, w.stepTicks], 1.0, 0.1)
  beat21.fromTo([w.wheel, ...w.rounds[0].dots, w.mark], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 1.0)
  rise(beat21, [w.wheelTag, w.legendGuess], 1.2, 0.1)
  beat21.fromTo(w.ownShot, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.3)
  rise(beat21, w.ownLabel, 1.5)
  let t = 2.4
  beat21.fromTo(w.step, { value: 0 }, { value: BRANCH_STEP, duration: 3.6, ease: 'none', onUpdate: w.setStep, immediateRender: false }, t)
  beat21.fromTo(w.colourBox, { boxShadow: '0 0 0 2px var(--bg)' }, { boxShadow: '0 0 0 8px var(--accent)', duration: 0.3, yoyo: true, repeat: 1, immediateRender: false }, t + 3.6)
  t += 4.4
  // Stop before the run and the prediction make room for the second round.
  hold(beat21, t)
  const runParts = [w.frame, w.colourBox, w.stepCount, w.stepTicks, w.ownShot, w.ownLabel]
  fade(beat21, runParts, t)
  beat21.to(w.rounds[0].dots, { autoAlpha: 0.15, duration: 0.4 }, t)
  t = w.playRound(beat21, 1, t + 0.2)
  w.appear(beat21, runParts, t)

  // ---- IV.A.5: the run and the prediction side by side, to the last step.
  const midCount = place(el('div', 'step-count'), MID.x - MID.w / 2, MID.y, MID.w)
  const midNumber = el('span', 'count', String(BRANCH_STEP))
  midCount.append(el('span', 'tag', 'Step'), midNumber, el('span', 'of', `/ ${STEPS}`))
  const midTicks = place(el('div', 'ticks'), MID.x - MID.w / 2, MID.y + 74, MID.w)
  const midTickList = Array.from({ length: STEPS }, () => midTicks.appendChild(el('i')))
  root.append(midCount, midTicks)
  const runLabel = label(root, 'the current step', PAIR.xs[0], PAIR.y + PAIR.size / 2 + 22, 'caption', PAIR.size)
  const predLabel = label(root, "the model's prediction", PAIR.xs[1], PAIR.y + PAIR.size / 2 + 22, 'caption', PAIR.size)
  const late = { value: BRANCH_STEP }
  const setLate = () => {
    w.step.value = late.value
    w.setStep()
    const whole = Math.round(late.value)
    midNumber.textContent = String(whole)
    midTickList.forEach((tick, i) => tick.classList.toggle('on', i < whole))
  }
  const beat22 = gsap.timeline()
  wordsOut(beat22, fewer, 0)
  wordsIn(beat22, appears, 0.4)
  fade(beat22, [w.wheel, w.wheelTag, ...w.rounds.flatMap((r) => r.dots), w.mark, w.legend, w.colourBox, w.stepCount, w.stepTicks, w.ownLabel, w.ownShot.querySelector('.grid-box') as HTMLElement], 0)
  beat22.to(w.frame, { x: PAIR.xs[0] - SIDE.x, y: PAIR.y - SIDE.y, scale: PAIR.size / SIDE.size, duration: 0.9, ease: 'power3.inOut' }, 0.3)
  beat22.to(w.ownShot, { x: PAIR.xs[1] - OWN.x, y: PAIR.y - OWN.y, scale: PAIR.size / OWN.size, duration: 0.9, ease: 'power3.inOut' }, 0.3)
  rise(beat22, [runLabel, predLabel, midCount, midTicks], 1.0, 0.1)
  beat22.call(setLate, [], 1.0)
  // The run hurries through the early steps and slows down at the end.
  beat22.fromTo(late, { value: BRANCH_STEP }, { value: STEPS, duration: 3.4, ease: 'power2.out', onUpdate: setLate, immediateRender: false }, 1.4)

  // ---- IV.B: the noisy portrait again, through two different models.
  // The portrait at 86% noise, with the same prompt as in III.A. It sits in the
  // middle; each model takes it to one side.
  const input = assets.noised[FAR_INDEX]
  const source = shot(root, new NoisyImage(input, 384, 1).canvas, SOURCE.x, SOURCE.y, SOURCE.size)
  const sourceLabel = label(root, 'the portrait at 86% noise', SOURCE.x, SOURCE.y + SOURCE.size / 2 + 20)
  const branches = [
    { text: 'Trained on anime', image: assets.far.anime },
    { text: 'Trained on photos', image: assets.far.photo },
  ].map(({ text, image }, i) => {
    const x = RESULT.xs[i]
    const half = RESULT.size / 2
    const picture = new NoisyImage([input, image], 384, 1)
    // The arrow runs from the edge of the portrait to the edge of the result.
    const from = SOURCE.x + (i ? 1 : -1) * (SOURCE.size / 2 + 20)
    const to = x + (i ? -1 : 1) * (half + 20)
    return {
      picture,
      model: box(root, text, x - half, MODEL.y, RESULT.size, MODEL.h, i === 0 ? 'accent' : ''),
      out: line(lines, from, RESULT.y, to, RESULT.y),
      result: shot(root, picture.canvas, x, RESULT.y, RESULT.size),
    }
  })
  const beat23 = gsap.timeline()
  wordsOut(beat23, appears, 0)
  wordsIn(beat23, seen, 0.4)
  fade(beat23, [w.frame, w.ownShot, runLabel, predLabel, midCount, midTicks, runPrompt], 0)
  rise(beat23, portraitPrompt, 0.4)
  beat23.fromTo(source, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.5)
  rise(beat23, sourceLabel, 0.8)
  // One model at a time: its name, the arrow, and its result coming out of the noise.
  branches.forEach(({ picture, model, out, result }, i) => {
    const at = 1.4 + i * 1.8
    beat23.fromTo(model, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, at)
    draw(beat23, out, at + 0.2, 0.4)
    beat23
      .fromTo(result, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, at + 0.5)
      .to(picture, { frame: 1, duration: 1.0, ease: 'power1.inOut', onUpdate: picture.render }, at + 0.6)
  })

  return [beat19, round, beat20, beat21, beat22, beat23]
}
