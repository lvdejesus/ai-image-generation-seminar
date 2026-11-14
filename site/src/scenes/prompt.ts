// Section III, beats 22 and 23: the same noise with no text, then steered by
// three prompts.
import gsap from 'gsap'
import { assets, bend, chip, draw, el, fade, headline, label, overlay, place, rise, shot, wordsIn, wordsOut, type Subject } from '../kit'
import { title } from '../beats'
import { NoisyImage } from '../noise'

// Beat 22: one starting noise and no prompt, in the middle row. Beat 23: the
// same noise, three prompts, and the real states of each run side by side,
// so the runs can be seen drifting apart step by step.
const START = { x: 230, y: 663, size: 170 }
const ROWS: { top: number; subject: Subject; prompt: string }[] = [
  { top: 286, subject: 'cat', prompt: 'a white cat on a windowsill' },
  { top: 522, subject: 'girl', prompt: 'a girl in a red scarf, snow' },
  { top: 758, subject: 'lighthouse', prompt: 'a lighthouse at sunset' },
]
/** Each row is a prompt chip with a strip of six states under it. */
const STRIP = { x: 560, size: 166, pitch: 212, below: 62 }

export function prompt(root: HTMLElement) {
  const noTextTitle = headline(root, title('22'))
  const steersTitle = headline(root, title('23'))
  const lines = overlay(root)

  // ---- Beat 22 and 23 furniture
  // All four runs share their first frame: the very same noise.
  const noise = shot(root, new NoisyImage(assets.three.cat[0], 256, 1).canvas, START.x, START.y, START.size)
  const noiseLabel = label(root, 'One starting noise', START.x, START.y - START.size / 2 - 44, 'tag', 300)
  const steers = label(root, 'at every step the text shifts the guess a little', START.x, START.y + START.size / 2 + 20, 'caption', 260)
  const stepsLabel = place(el('span', 'tag', 'Steps →'), STRIP.x + 5 * STRIP.pitch - 20, ROWS[0].top + 12)
  root.append(stepsLabel)
  const rows = [...ROWS, { top: ROWS[1].top, subject: 'none' as const, prompt: 'no text' }].map(({ top, subject, prompt: text }) => {
    const y = top + STRIP.below + STRIP.size / 2
    const promptChip = chip(root, text, STRIP.x - STRIP.size / 2, top + 23, subject === 'none' ? '' : 'accent')
    gsap.set(promptChip, { xPercent: 0 })
    const fan = bend(lines, START.x + START.size / 2 + 14, START.y, 400, START.y, 380, y, STRIP.x - STRIP.size / 2 - 16, y)
    // The states after steps 10, 16, 20, 23 and 26, then the result.
    const states = assets.three[subject].slice(1).map((state, k) => shot(root, new NoisyImage(state, 256, 1).canvas, STRIP.x + k * STRIP.pitch, y, STRIP.size))
    return { chip: promptChip, fan, states }
  })
  // The run with no prompt sits in the middle row until the three prompts take over.
  const none = rows.pop()!
  const notChosen = label(root, 'an image, but not one we chose', STRIP.x + 5 * STRIP.pitch, ROWS[1].top + STRIP.below + STRIP.size + 16, 'tag', 400)

  // ---- Beat 22: with no text, the noise still becomes an image: whichever one.
  const beat22 = gsap.timeline()
  wordsIn(beat22, noTextTitle, 0)
  beat22.fromTo(noise, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.5)
  rise(beat22, noiseLabel, 0.7)
  draw(beat22, none.fan, 1.0, 0.5)
  rise(beat22, none.chip, 1.2)
  beat22.fromTo(none.states, { autoAlpha: 0, x: -50 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.45 }, 1.6)
  rise(beat22, notChosen, 4.2)

  // ---- Beat 23: the same noise goes three ways. The states appear one step
  // at a time across all three prompts, alike at first and then drifting apart.
  const beat23 = gsap.timeline()
  wordsOut(beat23, noTextTitle, 0)
  wordsIn(beat23, steersTitle, 0.4)
  fade(beat23, [none.fan, none.chip, ...none.states, notChosen], 0)
  rise(beat23, stepsLabel, 1.9)
  rows.forEach(({ chip: promptChip, fan }, i) => {
    draw(beat23, fan, 1.0 + i * 0.2, 0.5)
    rise(beat23, promptChip, 1.2 + i * 0.2)
  })
  for (let k = 0; k < 6; k++) {
    beat23.fromTo(rows.map((row) => row.states[k]), { autoAlpha: 0, x: -50 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 2.0 + k * 0.45)
  }
  rise(beat23, steers, 4.6)

  return [beat22, beat23]
}
