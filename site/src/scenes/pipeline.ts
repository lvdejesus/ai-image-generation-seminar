// Section V, beats 21-23: the whole system, the live demo, and the close.
import gsap from 'gsap'
import { arrow, assets, box, chip, draw, el, fade, headline, label, overlay, place, rise, shot, stroke, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { live } from '../live'
import { NoisyImage, seeded } from '../noise'
import { collage } from './intro'

// Beat 21: two rows. Text on top, the image path below.
const TOP = 470
const BOTTOM = 790
const PROMPT = { x: 104, w: 500, h: 72 }
const ENCODER = { x: 760, w: 260, h: 110 }
const EMBED = { x: 1160, cells: 10, size: 38, pitch: 46 }
const NOISE = { x: 190, size: 150 }
const DENOISER = { x: 420, w: 360, h: 150 }
const CLEAN = { x: 960, size: 150 }
const DECODER = { x: 1170, w: 230, h: 110 }
const IMAGE = { x: 1660, size: 300 }

// Beat 22: the live demo.
const INPUT = { x: 104, y: 500, w: 760, h: 88 }
const VIEW = { x: 1400, y: 640, size: 560 }
/** Frames per second the demo plays at, however fast they arrive. */
const RATE = 2.2
/** How long to wait for the first live frame before using the recording. */
const PATIENCE = 8000

// Beat 23: what did not happen, and what did.
const COLLAGE = { x: 360, y: 640, size: 300 }
const FINAL = { x: 1160, y: 620, size: 460 }

/** The live demo's controls, for the keyboard handler and the presenter line. */
export const demo = {
  /** Abandon a live run and show the recording at once. */
  panic() {},
  /** True while the prompt field has focus, so typing does not navigate. */
  typing: () => false,
}

export function pipeline(root: HTMLElement) {
  const whole = headline(root, title('21'))
  const yours = headline(root, title('22'))
  const close = headline(root, title('23'))
  const lines = overlay(root)
  const picture = assets.three.lighthouse[6]

  // ---- Beat 21 furniture, in four stages
  const stageTags = [
    place(el('span', 'tag', '1 · Prompt to text embedding'), PROMPT.x, TOP - 96),
    place(el('span', 'tag', '2 · Random noise'), PROMPT.x, BOTTOM - 150),
    place(el('span', 'tag', '3 · Denoise'), DENOISER.x, BOTTOM - 150),
    place(el('span', 'tag', '4 · Decode to pixels'), DECODER.x, BOTTOM - 150),
  ]
  root.append(...stageTags)

  const promptBox = place(el('div', 'prompt-box small', 'a lighthouse at sunset'), PROMPT.x, TOP - PROMPT.h / 2, PROMPT.w, PROMPT.h)
  root.append(promptBox)
  const toEncoder = arrow(lines, PROMPT.x + PROMPT.w + 20, ENCODER.x - 20, TOP)
  const encoder = box(root, 'Text encoder', ENCODER.x, TOP - ENCODER.h / 2, ENCODER.w, ENCODER.h)
  const toEmbed = arrow(lines, ENCODER.x + ENCODER.w + 20, EMBED.x - 20, TOP)
  const random = seeded(19)
  const embed = Array.from({ length: EMBED.cells }, (_, i) => {
    const cell = place(el('span', 'cell'), EMBED.x + i * EMBED.pitch, TOP - EMBED.size / 2, EMBED.size, EMBED.size)
    cell.style.opacity = String(0.25 + random() * 0.75)
    root.append(cell)
    return cell
  })
  const embedMid = EMBED.x + (EMBED.cells * EMBED.pitch) / 2
  const denoiserMid = DENOISER.x + DENOISER.w / 2
  const guide = stroke(
    lines,
    `M${embedMid} ${TOP + 34} V${TOP + 130} H${denoiserMid} V${BOTTOM - DENOISER.h / 2 - 18} M${denoiserMid - 12} ${BOTTOM - DENOISER.h / 2 - 36} L${denoiserMid} ${BOTTOM - DENOISER.h / 2 - 16} L${denoiserMid + 12} ${BOTTOM - DENOISER.h / 2 - 36}`,
    'hot',
  )

  const guideLabel = place(el('span', 'caption left', 'the text guides every step'), denoiserMid + 28, TOP + 84, 520)
  root.append(guideLabel)

  // The latent is drawn as its 16 channels; the starting one is pure noise.
  const noisy = new NoisyImage([], 256, 800)
  noisy.grey = true
  noisy.render()
  const noise = shot(root, noisy.canvas, NOISE.x, BOTTOM, NOISE.size, 'pixelated')
  const toDenoiser = arrow(lines, NOISE.x + NOISE.size / 2 + 16, DENOISER.x - 20, BOTTOM)
  const denoiser = box(root, 'Denoiser × 30', DENOISER.x, BOTTOM - DENOISER.h / 2, DENOISER.w, DENOISER.h, 'accent')
  const toClean = arrow(lines, DENOISER.x + DENOISER.w + 20, CLEAN.x - CLEAN.size / 2 - 20, BOTTOM)
  const cleaned = new NoisyImage(assets.latent, 256, 800)
  cleaned.grey = true
  cleaned.level = 1
  cleaned.render()
  const clean = shot(root, cleaned.canvas, CLEAN.x, BOTTOM, CLEAN.size, 'pixelated')
  const toDecoder = arrow(lines, CLEAN.x + CLEAN.size / 2 + 16, DECODER.x - 20, BOTTOM)
  const decoder = box(root, 'Decoder', DECODER.x, BOTTOM - DECODER.h / 2, DECODER.w, DECODER.h)
  const toImage = arrow(lines, DECODER.x + DECODER.w + 20, IMAGE.x - IMAGE.size / 2 - 20, BOTTOM)
  const image = shot(root, new NoisyImage(picture, 384, 1).canvas, IMAGE.x, BOTTOM, IMAGE.size)
  const noiseLabel = label(root, 'latent', NOISE.x, BOTTOM + NOISE.size / 2 + 14, 'caption', 200)
  const cleanLabel = label(root, 'latent', CLEAN.x, BOTTOM + CLEAN.size / 2 + 14, 'caption', 200)

  // ---- Beat 22 furniture
  const inputTag = place(el('span', 'tag', 'Your prompt'), INPUT.x, INPUT.y - 38)
  const input = place(el('input', 'prompt-box live-input'), INPUT.x, INPUT.y, INPUT.w, INPUT.h)
  input.type = 'text'
  input.maxLength = 200
  input.spellcheck = false
  input.placeholder = 'type a prompt, then Enter'
  const statusLine = place(el('p', 'live-status'), INPUT.x, INPUT.y + INPUT.h + 28, INPUT.w)
  const dot = el('i', 'dot')
  const statusText = el('span')
  statusLine.append(dot, statusText)
  const stepLine = place(el('p', 'live-step'), INPUT.x, INPUT.y + INPUT.h + 90, INPUT.w)
  root.append(inputTag, input, statusLine, stepLine)

  // Until a run starts, the frame shows a recorded picture of pure noise.
  const view = new NoisyImage(assets.fallback[0], 384, 1)
  const viewFrame = shot(root, view.canvas, VIEW.x, VIEW.y, VIEW.size)

  // Frames may arrive faster or slower than they are shown; playback runs
  // at its own steady rate over whatever has arrived so far.
  let frames: CanvasImageSource[] = []
  let total = 0
  let shown = 0
  let patience = 0

  const say = (text: string, state: 'live' | 'recorded' | 'idle') => {
    statusText.textContent = text
    dot.dataset.state = state
  }
  const idle = () => say(live.status() === 'ready' ? 'Connected to the home GPU' : 'Not connected: Enter plays a recorded run', live.status() === 'ready' ? 'live' : 'idle')

  function begin(count: number) {
    frames = []
    total = count
    shown = 0
    view.setFrames([assets.fallback[0]])
    view.frame = 0
    view.render()
    stepLine.textContent = ''
  }

  function add(index: number, frame: CanvasImageSource) {
    frames[index] = frame
    // Only an unbroken run of frames from the start can be played.
    let ready = 0
    while (frames[ready]) ready++
    view.setFrames(frames.slice(0, ready))
  }

  function playRecorded() {
    window.clearTimeout(patience)
    live.cancel()
    begin(assets.fallback.length)
    assets.fallback.forEach((frame, i) => add(i, frame))
    say('Recorded run: a cat wearing a wizard hat, reading a book', 'recorded')
  }

  function generate() {
    const text = input.value.trim()
    if (!text) return
    input.blur()
    if (live.status() !== 'ready') return playRecorded()

    begin(0)
    say('Generating on the home GPU…', 'live')
    let arrived = false
    patience = window.setTimeout(() => !arrived && playRecorded(), PATIENCE)
    live.generate(text, {
      onStart: (count) => (total = count),
      onFrame: (index, frame) => {
        arrived = true
        add(index, frame)
      },
      onDone: () => say('Generated live on the home GPU', 'live'),
      onError: () => playRecorded(),
    })
  }

  input.addEventListener('keydown', (e) => {
    // Keys typed into the field never reach the deck's navigation.
    e.stopPropagation()
    if (e.key === 'Enter') generate()
    if (e.key === 'Escape') input.blur()
  })
  live.onStatus(() => total === 0 && idle())
  idle()
  demo.panic = playRecorded
  demo.typing = () => document.activeElement === input

  gsap.ticker.add((_time, deltaMs) => {
    let ready = 0
    while (frames[ready]) ready++
    if (!total || shown >= ready - 1) return
    shown = Math.min(ready - 1, shown + (deltaMs / 1000) * RATE)
    view.frame = shown
    view.render()
    stepLine.textContent = `step ${Math.min(total - 1, Math.ceil(shown))} / ${total - 1}`
  })

  // ---- Beat 23 furniture
  const half = COLLAGE.size / 2
  const pasted = place(collage(COLLAGE.size), COLLAGE.x - half, COLLAGE.y - half)
  pasted.classList.add('grey')
  root.append(pasted)
  const cross = [
    stroke(lines, `M${COLLAGE.x - half + 24} ${COLLAGE.y - half + 24} L${COLLAGE.x + half - 24} ${COLLAGE.y + half - 24}`, 'strike'),
    stroke(lines, `M${COLLAGE.x + half - 24} ${COLLAGE.y - half + 24} L${COLLAGE.x - half + 24} ${COLLAGE.y + half - 24}`, 'strike'),
  ]
  const notThis = label(root, 'not searched, not combined', COLLAGE.x, COLLAGE.y + half + 20)
  const ending = new NoisyImage(assets.three.lighthouse, 384, 1)
  const final = shot(root, ending.canvas, FINAL.x, FINAL.y, FINAL.size)
  const finalChip = chip(root, 'a lighthouse on a cliff at sunset', FINAL.x, FINAL.y + FINAL.size / 2 + 44, 'accent')
  const finalTag = label(root, 'Denoised out of random noise', FINAL.x + FINAL.size / 2 + 190, FINAL.y - 30, 'tag', 300)
  root.append(lines) // keep the strokes above the collage

  // ---- Beat 21: the pipeline assembles one stage at a time.
  const beat21 = gsap.timeline()
  wordsIn(beat21, whole, 0)
  rise(beat21, stageTags[0], 0.4)
  beat21.fromTo(promptBox, { autoAlpha: 0, scaleX: 0, transformOrigin: '0 50%' }, { autoAlpha: 1, scaleX: 1, duration: 0.5, ease: 'power4.out' }, 0.5)
  draw(beat21, toEncoder, 0.8, 0.3)
  beat21.fromTo(encoder, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, 1.0)
  draw(beat21, toEmbed, 1.2, 0.3)
  beat21.fromTo(embed, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.04 }, 1.4)

  rise(beat21, stageTags[1], 2.0)
  beat21.fromTo(noise, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.1)
  rise(beat21, noiseLabel, 2.3)

  rise(beat21, stageTags[2], 2.8)
  draw(beat21, toDenoiser, 2.9, 0.3)
  beat21.fromTo(denoiser, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, 3.1)
  draw(beat21, guide, 3.3, 0.7)
  rise(beat21, guideLabel, 3.7)
  draw(beat21, toClean, 3.8, 0.3)
  beat21
    .fromTo(clean, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, 4.0)
    .to(cleaned, { level: 0, duration: 0.9, ease: 'none', onUpdate: cleaned.render }, 4.2)
  rise(beat21, cleanLabel, 4.2)

  rise(beat21, stageTags[3], 5.0)
  draw(beat21, toDecoder, 5.1, 0.3)
  beat21.fromTo(decoder, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, 5.3)
  draw(beat21, toImage, 5.6, 0.3)
  beat21.fromTo(image, { clipPath: 'inset(0% 100% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: 'power3.out' }, 5.8)

  // ---- Beat 22: the pipeline clears for the live demo.
  const beat22 = gsap.timeline()
  wordsOut(beat22, whole, 0)
  wordsIn(beat22, yours, 0.4)
  fade(beat22, [...stageTags, promptBox, toEncoder, encoder, toEmbed, ...embed, guide, guideLabel, noise, noiseLabel, toDenoiser, denoiser, toClean, clean, cleanLabel, toDecoder, decoder, toImage, image], 0)
  beat22
    .fromTo(inputTag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.6)
    .fromTo(input, { autoAlpha: 0, scaleX: 0, transformOrigin: '0 50%' }, { autoAlpha: 1, scaleX: 1, duration: 0.6, ease: 'power4.out' }, 0.6)
    .fromTo(viewFrame, { clipPath: 'inset(50% 50% 50% 50% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.inOut' }, 0.8)
  rise(beat22, [statusLine, stepLine], 1.2, 0.1)

  // ---- Beat 23: the collage that never happened, and the image that did.
  const beat23 = gsap.timeline()
  wordsOut(beat23, yours, 0)
  wordsIn(beat23, close, 0.4)
  fade(beat23, [inputTag, input, statusLine, stepLine, viewFrame], 0)
  beat23.fromTo(pasted, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.6)
  draw(beat23, cross[0], 1.1, 0.3)
  draw(beat23, cross[1], 1.3, 0.3)
  rise(beat23, notThis, 1.4)
  beat23
    .fromTo(final, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.6)
    .to(ending, { frame: 6, duration: 2.2, ease: 'none', onUpdate: ending.render }, 1.9)
  rise(beat23, finalChip, 2.2)
  rise(beat23, finalTag, 3.6)

  return [beat21, beat22, beat23]
}
