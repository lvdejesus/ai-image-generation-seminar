// Section IV.D, beat 26: one starting noise, steered by three prompts.
import gsap from 'gsap'
import './spine-prompt-pipeline.css'
import { assets, bend, draw, el, fade, headline, hold, label, line, overlay, place, promptChip, rise, shot, wordsIn, wordsOut, type Subject } from '../kit'
import { title } from '../beats'
import { NoisyImage } from '../noise'

// One run is shown large, one at a time: the starting noise on the left, five
// states, and the result. The run's prompt sits in the prompt chip under the
// headline. At the end of the beat the three runs shrink into three compact
// rows, so the audience can compare them column by column.
const LARGE = {
  y: 660,
  noise: { x: 214, size: 220 },
  /** The left edge of the first state, the state size and the pitch. */
  states: { x: 420, size: 180, pitch: 194 },
  result: { x: 1616, size: 400 },
}
/** The compact rows: the prompt chip on top, the strip of six states under it. */
const COMPACT = {
  tops: [284, 514, 744],
  /** From the row top to the top of the states. */
  below: 68,
  size: 146,
  x: 434,
  right: 1816,
  noise: { x: 194, size: 180 },
}
const ROWS: { subject: Subject; prompt: string }[] = [
  { subject: 'cat', prompt: 'a white cat on a windowsill' },
  { subject: 'girl', prompt: 'a girl in a red scarf, snow' },
  { subject: 'lighthouse', prompt: 'a lighthouse at sunset' },
]
/** States per run: five steps on the way, then the result. */
const STATES = 6

/** The centre and size of state k in the large row. */
function large(k: number) {
  if (k === STATES - 1) return { x: LARGE.result.x, y: LARGE.y, size: LARGE.result.size }
  const { x, size, pitch } = LARGE.states
  return { x: x + size / 2 + k * pitch, y: LARGE.y, size }
}

/** The centre and size of state k in compact row r. */
function compact(r: number, k: number) {
  const pitch = (COMPACT.right - COMPACT.x - COMPACT.size) / (STATES - 1)
  return { x: COMPACT.x + COMPACT.size / 2 + k * pitch, y: COMPACT.tops[r] + COMPACT.below + COMPACT.size / 2, size: COMPACT.size }
}

/** The transform that moves a node placed at `from` onto `to`. */
const move = (from: { x: number; y: number; size: number }, to: { x: number; y: number; size: number }) => ({
  x: to.x - from.x,
  y: to.y - from.y,
  scale: to.size / from.size,
})

export function prompt(root: HTMLElement) {
  root.classList.add('spine-prompt-pipeline')
  const steersTitle = headline(root, title('26'))
  const lines = overlay(root)

  // All three runs share their first frame: the very same noise.
  const noiseAt = { x: LARGE.noise.x, y: LARGE.y, size: LARGE.noise.size }
  const noise = shot(root, new NoisyImage(assets.three.cat[0], 256, 1).canvas, noiseAt.x, noiseAt.y, noiseAt.size)
  const noiseTop = LARGE.y - LARGE.noise.size / 2 - 48
  const startLabel = label(root, 'Starting noise', noiseAt.x, noiseTop, 'tag', 360)
  const sameLabel = label(root, 'Same noise', noiseAt.x, noiseTop, 'tag', 360)
  const toRun = line(lines, noiseAt.x + noiseAt.size / 2 + 16, LARGE.y, LARGE.states.x - 16, LARGE.y)

  // Every run is built at its large size. The compact rows are transforms.
  const run = (subject: Subject) =>
    assets.three[subject].slice(1).map((state, k) => {
      const at = large(k)
      return shot(root, new NoisyImage(state, k === STATES - 1 ? 384 : 256, 1).canvas, at.x, at.y, at.size)
    })
  const rows = ROWS.map(({ subject, prompt: text }, r) => {
    const promptAt = promptChip(root, text)
    // The fan from the shared noise to this row, for the compact view.
    const to = compact(r, 0)
    const from = { x: COMPACT.noise.x + COMPACT.noise.size / 2 + 14, y: compact(1, 0).y }
    const fan = bend(lines, from.x, from.y, from.x + 70, from.y, to.x - 150, to.y, to.x - to.size / 2 - 16, to.y)
    return { chip: promptAt, fan, states: run(subject), r }
  })
  const stepsLabel = place(el('span', 'tag', 'Steps →'), COMPACT.right - 200, COMPACT.tops[0] + 14, 200)
  stepsLabel.style.textAlign = 'right'
  root.append(stepsLabel)

  /** States slide in one after the other, from left to right. */
  const play = (tl: gsap.core.Timeline, states: HTMLElement[], at: number) =>
    tl.fromTo(states, { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, duration: 0.45, ease: 'power3.out', stagger: 0.4 }, at)

  // ---- Beat 26: one starting noise with three prompts. Each run plays
  // large, one at a time, and then all three shrink into rows side by side.
  const beat26 = gsap.timeline()
  wordsIn(beat26, steersTitle, 0)
  beat26.fromTo(noise, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.3)
  rise(beat26, startLabel, 0.5)
  draw(beat26, toRun, 0.7, 0.4)
  let at = 1.1
  rows.forEach((row, r) => {
    if (r > 0) {
      // The run before makes room for this one, and the noise stays the same.
      hold(beat26)
      at = beat26.duration() + 0.1
      fade(beat26, [rows[r - 1].chip, ...rows[r - 1].states], at)
      if (r === 1) {
        fade(beat26, startLabel, at)
        rise(beat26, sameLabel, at + 0.2)
      }
      at += 0.3
    }
    rise(beat26, row.chip, at)
    play(beat26, row.states, at + 0.3)
  })
  hold(beat26)

  // All three runs side by side: the last one shrinks into its row, the other
  // two come back in theirs, and the noise moves to the middle of the fan.
  at = beat26.duration() + 0.1
  const last = rows[rows.length - 1]
  const compactNoise = { x: COMPACT.noise.x, y: compact(1, 0).y, size: COMPACT.noise.size }
  const ease = 'power3.inOut'
  fade(beat26, toRun, at, 0.2)
  beat26.to(noise, { ...move(noiseAt, compactNoise), duration: 0.8, ease }, at)
  beat26.to(sameLabel, { x: compactNoise.x - noiseAt.x, y: compactNoise.y - compactNoise.size / 2 - (noiseAt.y - noiseAt.size / 2), duration: 0.8, ease }, at)
  last.states.forEach((state, k) => beat26.to(state, { ...move(large(k), compact(last.r, k)), duration: 0.8, ease }, at))
  beat26.to(last.chip, { left: COMPACT.x, top: COMPACT.tops[last.r] + 29, duration: 0.8, ease }, at)
  for (const row of rows.slice(0, -1)) {
    row.states.forEach((state, k) => beat26.set(state, move(large(k), compact(row.r, k)), at))
    beat26.set(row.chip, { left: COMPACT.x, top: COMPACT.tops[row.r] + 29 }, at)
  }
  rows.forEach(({ fan }, r) => draw(beat26, fan, at + 0.7 + r * 0.1, 0.5))
  // The other two runs come back column by column: alike at first, then apart.
  const others = rows.slice(0, -1)
  beat26.to(others.map((row) => row.chip), { autoAlpha: 1, duration: 0.4 }, at + 0.9)
  for (let k = 0; k < STATES; k++) {
    beat26.to(others.map((row) => row.states[k]), { autoAlpha: 1, duration: 0.35 }, at + 1.0 + k * 0.15)
  }
  rise(beat26, stepsLabel, at + 1.6)

  return [beat26]
}
