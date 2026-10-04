// Section III, beats 16-18: steering the result with text.
import gsap from 'gsap'
import { arrow, assets, bend, box, chip, draw, el, fade, headline, label, line, overlay, place, rise, shot, wordsIn, wordsOut, type Subject } from '../kit'
import { title } from '../beats'
import { NoiseField, NoisyImage, seeded } from '../noise'

// Beat 16: the training diagram again, with one more input.
const INPUT = { x: 330, y: 480, size: 240 }
const MODEL = { x: 800, y: 520, w: 300, h: 240 }
const OUTPUT = { x: 1460, y: 640, size: 300 }

// Beat 17: one starting noise, three prompts, and the real states of each
// run side by side, so the runs can be seen drifting apart step by step.
const START = { x: 230, y: 663, size: 170 }
const ROWS: { top: number; subject: Subject; prompt: string }[] = [
  { top: 286, subject: 'cat', prompt: 'a white cat on a windowsill' },
  { top: 522, subject: 'girl', prompt: 'a girl in a red scarf, snow' },
  { top: 758, subject: 'lighthouse', prompt: 'a lighthouse at sunset' },
]
/** Each row is a prompt chip with a strip of six states under it. */
const STRIP = { x: 560, size: 166, pitch: 212, below: 62 }

// Beat 18: prompt -> text encoder -> a grid of numbers.
const PROMPT = 'a lighthouse at sunset'
const BOX = { x: 104, y: 596, w: 600, h: 88 }
const ENCODER = { x: 860, y: 560, w: 300, h: 160 }
const GRID = { x: 1290, y: 540, columns: 6, rows: 4, pitchX: 88, pitchY: 54 }

export function prompt(root: HTMLElement) {
  const caption = headline(root, title('16'))
  const steersTitle = headline(root, title('17'))
  const numbers = headline(root, title('18'))
  const lines = overlay(root)

  // ---- Beat 16 furniture
  const example = new NoisyImage(assets.three.cat[6], 384, 501)
  example.level = 0.62
  example.render()
  const input = shot(root, example.canvas, INPUT.x, INPUT.y, INPUT.size)
  const levelChip = chip(root, 'noise level 0.62', INPUT.x, INPUT.y + 200)
  const captionChip = chip(root, 'a white cat on a windowsill', INPUT.x, INPUT.y + 300, 'accent')
  const model = box(root, 'Model', MODEL.x, MODEL.y, MODEL.w, MODEL.h, 'accent')
  const imageIn = line(lines, INPUT.x + 136, INPUT.y + 20, MODEL.x - 20, MODEL.y + 60)
  const levelIn = line(lines, INPUT.x + 150, INPUT.y + 200, MODEL.x - 20, MODEL.y + 130)
  const captionIn = bend(lines, INPUT.x + 230, INPUT.y + 300, 700, INPUT.y + 300, 690, MODEL.y + 200, MODEL.x - 20, MODEL.y + 200, 'hot')
  const modelOut = arrow(lines, MODEL.x + MODEL.w + 20, OUTPUT.x - OUTPUT.size / 2 - 24, OUTPUT.y)
  const output = shot(root, new NoiseField(384, 501, 501).canvas, OUTPUT.x, OUTPUT.y, OUTPUT.size)
  const outputLabel = label(root, 'predicted noise', OUTPUT.x, OUTPUT.y + OUTPUT.size / 2 + 20)
  const newInput = label(root, 'New input: the caption', INPUT.x, INPUT.y + 350, 'tag')

  // ---- Beat 17 furniture
  // The three runs share their first frame: the very same noise.
  const noise = shot(root, new NoisyImage(assets.three.cat[0], 256, 1).canvas, START.x, START.y, START.size)
  const noiseLabel = label(root, 'One starting noise', START.x, START.y - START.size / 2 - 44, 'tag', 300)
  const steers = label(root, 'at every step the text shifts the predicted noise a little', START.x, START.y + START.size / 2 + 20, 'caption', 260)
  const stepsLabel = place(el('span', 'tag', 'Steps →'), STRIP.x + 5 * STRIP.pitch - 20, ROWS[0].top + 12)
  root.append(stepsLabel)
  const rows = ROWS.map(({ top, subject, prompt: text }) => {
    const y = top + STRIP.below + STRIP.size / 2
    const promptChip = chip(root, text, STRIP.x - STRIP.size / 2, top + 23, 'accent')
    gsap.set(promptChip, { xPercent: 0 })
    const fan = bend(lines, START.x + START.size / 2 + 14, START.y, 400, START.y, 380, y, STRIP.x - STRIP.size / 2 - 16, y)
    // The states after steps 10, 16, 20, 23 and 26, then the result.
    const states = assets.three[subject].slice(1).map((state, k) => shot(root, new NoisyImage(state, 256, 1).canvas, STRIP.x + k * STRIP.pitch, y, STRIP.size))
    return { chip: promptChip, fan, states }
  })

  // ---- Beat 18 furniture
  const promptBox = place(el('div', 'prompt-box'), BOX.x, BOX.y, BOX.w, BOX.h)
  const typedText = el('span', 'typed')
  promptBox.append(typedText, el('span', 'caret'))
  const promptTag = place(el('span', 'tag', 'Prompt'), BOX.x, BOX.y - 38)
  root.append(promptTag, promptBox)
  const toEncoder = arrow(lines, BOX.x + BOX.w + 24, ENCODER.x - 20, ENCODER.y + ENCODER.h / 2)
  const encoder = box(root, 'Text encoder', ENCODER.x, ENCODER.y, ENCODER.w, ENCODER.h, 'accent')
  const toGrid = arrow(lines, ENCODER.x + ENCODER.w + 20, GRID.x - 30, ENCODER.y + ENCODER.h / 2)
  const gridTag = place(el('span', 'tag', 'Text embedding'), GRID.x, GRID.y - 50)
  const gridNote = place(el('p', 'caption left', 'numbers the model can use'), GRID.x, GRID.y + GRID.rows * GRID.pitchY + 10, 520)
  root.append(gridTag, gridNote)
  const random = seeded(16)
  const cells = Array.from({ length: GRID.columns * GRID.rows }, (_, i) => {
    const value = (random() * 2 - 1).toFixed(2)
    const cell = place(el('span', 'number', value), GRID.x + (i % GRID.columns) * GRID.pitchX, GRID.y + Math.floor(i / GRID.columns) * GRID.pitchY, GRID.pitchX)
    root.append(cell)
    return { cell, value, settleAt: 0.15 + 0.85 * random() }
  })

  // ---- Beat 16: the familiar diagram, then the caption joins the inputs.
  const beat16 = gsap.timeline()
  wordsIn(beat16, caption, 0)
  beat16.fromTo([input, model, output], { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)', stagger: 0.15 }, 0.3)
  rise(beat16, [levelChip, outputLabel], 0.6, 0.1)
  draw(beat16, imageIn, 0.7, 0.4)
  draw(beat16, levelIn, 0.8, 0.4)
  draw(beat16, modelOut, 0.9, 0.4)
  beat16.fromTo(captionChip, { autoAlpha: 0, x: -260 }, { autoAlpha: 1, x: 0, duration: 0.7, ease: 'power4.out' }, 1.7)
  rise(beat16, newInput, 2.1)
  draw(beat16, captionIn, 2.2, 0.6)
  beat16.fromTo(model, { scale: 1 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, 2.8)

  // ---- Beat 17: the same noise goes three ways. The states appear one step
  // at a time across all three prompts, alike at first and then drifting apart.
  const beat17 = gsap.timeline()
  wordsOut(beat17, caption, 0)
  wordsIn(beat17, steersTitle, 0.4)
  fade(beat17, [input, levelChip, captionChip, newInput, model, imageIn, levelIn, captionIn, modelOut, output, outputLabel], 0)
  beat17.fromTo(noise, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.5)
  rise(beat17, noiseLabel, 0.7)
  rows.forEach(({ chip: promptChip, fan }, i) => {
    draw(beat17, fan, 1.0 + i * 0.2, 0.5)
    rise(beat17, promptChip, 1.2 + i * 0.2)
  })
  rise(beat17, stepsLabel, 1.9)
  for (let k = 0; k < 6; k++) {
    beat17.fromTo(rows.map((row) => row.states[k]), { autoAlpha: 0, x: -50 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 2.0 + k * 0.45)
  }
  rise(beat17, steers, 4.6)

  // ---- Beat 18: the prompt is typed, encoded, and comes out as numbers.
  const typed = { n: 0 }
  const settle = { value: 0 }
  const scramble = seeded(99)
  const setCells = () => {
    for (const { cell, value, settleAt } of cells) {
      cell.textContent = settle.value >= settleAt ? value : (scramble() * 2 - 1).toFixed(2)
      cell.classList.toggle('settled', settle.value >= settleAt)
    }
  }
  const beat18 = gsap.timeline()
  wordsOut(beat18, steersTitle, 0)
  wordsIn(beat18, numbers, 0.4)
  fade(beat18, [noise, noiseLabel, steers, stepsLabel, ...rows.flatMap((row) => [row.fan, row.chip, ...row.states])], 0)
  beat18
    .fromTo(promptTag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.5)
    .fromTo(promptBox, { autoAlpha: 0, scaleX: 0, transformOrigin: '0 50%' }, { autoAlpha: 1, scaleX: 1, duration: 0.6, ease: 'power4.out' }, 0.5)
    .to(typed, { n: PROMPT.length, duration: 0.9, ease: 'none', onUpdate: () => (typedText.textContent = PROMPT.slice(0, Math.round(typed.n))) }, 0.9)
  draw(beat18, toEncoder, 1.8, 0.35)
  beat18.fromTo(encoder, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, 2.0)
  draw(beat18, toGrid, 2.4, 0.35)
  rise(beat18, gridTag, 2.6)
  beat18
    .fromTo(cells.map((c) => c.cell), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.02 }, 2.7)
    .to(settle, { value: 1, duration: 1.3, ease: 'none', onUpdate: setCells }, 2.8)
  rise(beat18, gridNote, 3.8)

  return [beat16, beat17, beat18]
}
