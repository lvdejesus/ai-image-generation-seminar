// Section II, beats 18, 19 and 20: generating from pure noise, and why
// the result depends on what the model was trained on.
import gsap from 'gsap'
import { arrow, assets, bend, box, draw, el, fade, headline, label, overlay, place, promptChip, rise, shot, stroke, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { NoisyImage } from '../noise'
import { PORTRAIT_PROMPT } from './reverse'

/** The run's prompt, in short (RUN_PROMPT in tools/assets.py). */
const RUN_PROMPT = 'a girl with an umbrella, rainy city at night'

const STEPS = 30
const FRAME = { x: 700, y: 650, size: 500 }
const COUNTER = { x: 1060, y: 520 }

// Beat 20: one noisy portrait, two models, two results. FAR_INDEX is the
// frame of the noising strip it starts from (FAR in tools/assets.py).
const FAR_INDEX = 3
const SOURCE = { x: 300, y: 650, size: 300 }
const ROWS = [505, 795]
const MODEL = { x: 620, w: 340, h: 100 }
const RESULT = { x: 1330, size: 260 }

export function generate(root: HTMLElement) {
  const fromNoise = headline(root, title('18'))
  const appears = headline(root, title('19'))
  const seen = headline(root, title('20'))
  const lines = overlay(root)

  // The run: the model's real state at the start and after every step.
  const run = new NoisyImage(assets.run, 384, 1)
  const frame = shot(root, run.canvas, FRAME.x, FRAME.y, FRAME.size)

  const pointer = stroke(lines, `M${FRAME.x + FRAME.size / 2 + 20} ${FRAME.y - 60} H${COUNTER.x + 40}`)
  const callout = place(el('p', 'callout', 'No original image behind it.'), COUNTER.x + 64, FRAME.y - 60 - 62, 520)
  const calloutNote = place(el('p', 'caption left', 'just random numbers'), COUNTER.x + 64, FRAME.y + 30, 620)
  root.append(callout, calloutNote)

  const counter = place(el('div', 'counter'), COUNTER.x, COUNTER.y, 700)
  const count = el('span', 'count', '00')
  counter.append(el('span', 'tag', 'Step'), count, el('span', 'of', `/ ${STEPS}`))
  const ticks = place(el('div', 'ticks'), COUNTER.x, COUNTER.y + 150, 680)
  const tickList = Array.from({ length: STEPS }, () => ticks.appendChild(el('i')))
  const counterNote = place(el('p', 'caption left', 'the same model, applied again and again'), COUNTER.x, COUNTER.y + 200, 700)
  root.append(counter, ticks, counterNote)

  const runPrompt = promptChip(root, RUN_PROMPT)
  const portraitPrompt = promptChip(root, PORTRAIT_PROMPT)

  // ---- Beat 18: a frame of noise that came from nowhere.
  const beat18 = gsap.timeline()
  wordsIn(beat18, fromNoise, 0)
  rise(beat18, runPrompt, 0.3)
  beat18.fromTo(frame, { clipPath: 'inset(50% 50% 50% 50% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.inOut' }, 0.4)
  draw(beat18, pointer, 1.2, 0.4)
  rise(beat18, [callout, calloutNote], 1.4, 0.15)

  // ---- Beat 19: the run plays under the scroll, one step per tick.
  const progress = { value: 0 }
  const setProgress = () => {
    const step = Math.round(progress.value * STEPS)
    run.frame = progress.value * STEPS
    run.render()
    count.textContent = String(step).padStart(2, '0')
    tickList.forEach((tick, i) => tick.classList.toggle('on', i < step))
  }
  const beat19 = gsap.timeline()
  wordsOut(beat19, fromNoise, 0)
  wordsIn(beat19, appears, 0.4)
  fade(beat19, [pointer, callout, calloutNote], 0)
  rise(beat19, [counter, ticks, counterNote], 0.5, 0.1)
  // The early steps look alike, so the run hurries through them and slows
  // down where the picture comes through.
  beat19.to(progress, { value: 1, duration: 4.2, ease: 'power3.out', onUpdate: setProgress }, 0.9)

  // ---- Beat 20: the noisy portrait again, through two different models.
  // The portrait at 86% noise: more than in beats 13-17, with the same prompt.
  const input = assets.noised[FAR_INDEX]
  const source = shot(root, new NoisyImage(input, 384, 1).canvas, SOURCE.x, SOURCE.y, SOURCE.size)
  const sourceLabel = label(root, 'the portrait, 86% noise', SOURCE.x, SOURCE.y + SOURCE.size / 2 + 20)
  const verdict = label(root, 'Neither is the original', RESULT.x + 300, SOURCE.y - 14, 'tag', 320)

  const branches = [
    { text: 'Trained on anime', image: assets.far.anime, caption: 'an anime character' },
    { text: 'Trained on photos', image: assets.far.photo, caption: 'a realistic man' },
  ].map(({ text, image, caption }, i) => {
    const y = ROWS[i]
    const picture = new NoisyImage([input, image], 384, 1)
    return {
      picture,
      model: box(root, text, MODEL.x, y - MODEL.h / 2, MODEL.w, MODEL.h, i === 0 ? 'accent' : ''),
      into: bend(lines, SOURCE.x + SOURCE.size / 2 + 16, SOURCE.y + (i ? 40 : -40), 540, SOURCE.y + (i ? 40 : -40), 520, y, MODEL.x - 20, y),
      out: arrow(lines, MODEL.x + MODEL.w + 20, RESULT.x - RESULT.size / 2 - 24, y),
      result: shot(root, picture.canvas, RESULT.x, y, RESULT.size),
      caption: label(root, caption, RESULT.x + 300, y - 14, 'caption', 320),
    }
  })

  const beat20 = gsap.timeline()
  wordsOut(beat20, appears, 0)
  wordsIn(beat20, seen, 0.4)
  fade(beat20, [frame, counter, ticks, counterNote, runPrompt], 0)
  rise(beat20, portraitPrompt, 0.4)
  beat20.fromTo(source, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.5)
  rise(beat20, sourceLabel, 0.8)
  branches.forEach(({ picture, model, into, out, result, caption }, i) => {
    const at = 1.0 + i * 1.2
    draw(beat20, into, at, 0.5)
    beat20.fromTo(model, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, at + 0.3)
    draw(beat20, out, at + 0.6, 0.35)
    beat20
      .fromTo(result, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, at + 0.8)
      .to(picture, { frame: 1, duration: 0.9, ease: 'power1.inOut', onUpdate: picture.render }, at + 0.9)
    rise(beat20, caption, at + 1.5)
  })
  rise(beat20, verdict, 4.0)

  return [beat18, beat19, beat20]
}
