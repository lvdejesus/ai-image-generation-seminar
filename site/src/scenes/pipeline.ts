// Section V, beats 31 and 32: the live demo and the close. Beat 30, the
// whole system, is the last step of the diagram in spine.ts.
import gsap from 'gsap'
import { assets, chip, draw, el, fade, headline, idea, label, overlay, place, rise, shot, stroke, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { live } from '../live'
import { NoisyImage } from '../noise'
import { collage, LIGHTHOUSE_PROMPT } from './intro'

// Beat 31: the live demo.
const INPUT = { x: 104, y: 500, w: 760, h: 88 }
const VIEW = { x: 1400, y: 640, size: 560 }
/** Frames per second the demo plays at, however fast they arrive. */
const RATE = 2.2
/** How long to wait for the first live frame before using the recording. */
const PATIENCE = 8000

// Beat 32: what did not happen, what did, and the three ideas it took.
const COLLAGE = { x: 300, y: 640, size: 280 }
const FINAL = { x: 760, y: 620, size: 420 }
const IDEAS = { x: 1100, y: 500, pitch: 96 }

/** The live demo's controls, for the keyboard handler and the presenter line. */
export const demo = {
  /** Abandon a live run and show the recording at once. */
  panic() {},
  /** True while the prompt field has focus, so typing does not navigate. */
  typing: () => false,
}

export function pipeline(root: HTMLElement) {
  const yours = headline(root, title('31'))
  const close = headline(root, title('32'))
  const lines = overlay(root)

  // ---- Beat 31 furniture
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

  // ---- Beat 32 furniture
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
  const finalChip = chip(root, LIGHTHOUSE_PROMPT, FINAL.x, FINAL.y + FINAL.size / 2 + 44, 'accent')
  const finalTag = place(el('span', 'tag', 'Denoised out of random noise, with three ideas'), IDEAS.x, IDEAS.y - 70, 720)
  root.append(finalTag)
  const ideaLines = [1, 2, 3].map((n) => idea(root, n, IDEAS.x, IDEAS.y + (n - 1) * IDEAS.pitch))
  root.append(lines) // keep the strokes above the collage

  // ---- Beat 31: the live demo.
  const beat31 = gsap.timeline()
  wordsIn(beat31, yours, 0)
  beat31
    .fromTo(inputTag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.6)
    .fromTo(input, { autoAlpha: 0, scaleX: 0, transformOrigin: '0 50%' }, { autoAlpha: 1, scaleX: 1, duration: 0.6, ease: 'power4.out' }, 0.6)
    .fromTo(viewFrame, { clipPath: 'inset(50% 50% 50% 50% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.inOut' }, 0.8)
  rise(beat31, [statusLine, stepLine], 1.2, 0.1)

  // ---- Beat 32: the collage that never happened, and the image that did.
  const beat32 = gsap.timeline()
  wordsOut(beat32, yours, 0)
  wordsIn(beat32, close, 0.4)
  fade(beat32, [inputTag, input, statusLine, stepLine, viewFrame], 0)
  beat32.fromTo(pasted, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.6)
  draw(beat32, cross[0], 1.1, 0.3)
  draw(beat32, cross[1], 1.3, 0.3)
  rise(beat32, notThis, 1.4)
  beat32
    .fromTo(final, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.6)
    .to(ending, { frame: 6, duration: 2.2, ease: 'none', onUpdate: ending.render }, 1.9)
  rise(beat32, finalChip, 2.2)
  rise(beat32, finalTag, 3.0)
  rise(beat32, ideaLines, 3.3, 0.3)

  return [beat31, beat32]
}
