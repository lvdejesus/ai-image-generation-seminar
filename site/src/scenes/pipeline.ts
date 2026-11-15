// The end, beat 34: the live demo, the last beat of the talk. It belongs to no section.
import gsap from 'gsap'
import './spine-prompt-pipeline.css'
import { assets, el, headline, place, rise, shot, wordsIn } from '../kit'
import { title } from '../beats'
import { live } from '../live'
import { NoisyImage } from '../noise'

// Beat 34: the live demo.
const INPUT = { x: 104, y: 500, w: 760, h: 88 }
const VIEW = { x: 1516, y: 640, size: 600 }
/** The status lines may run to the left edge of the frame. */
const STATUS_W = 1040
/** Frames per second the demo plays at, however fast they arrive. */
const RATE = 2.2
/** How long to wait for the first live frame before using the recording. */
const PATIENCE = 8000

/** The live demo's controls, for the keyboard handler and the presenter line. */
export const demo = {
  /** Abandon a live run and show the recording at once. */
  panic() {},
  /** True while the prompt field has focus, so typing does not navigate. */
  typing: () => false,
}

export function pipeline(root: HTMLElement) {
  root.classList.add('spine-prompt-pipeline')
  const yours = headline(root, title('34'))

  // ---- Beat 34 furniture
  const inputTag = place(el('span', 'tag', 'Your prompt'), INPUT.x, INPUT.y - 38)
  const input = place(el('input', 'prompt-box live-input'), INPUT.x, INPUT.y, INPUT.w, INPUT.h)
  input.type = 'text'
  input.maxLength = 200
  input.spellcheck = false
  input.placeholder = 'type a prompt, then Enter'
  const statusLine = place(el('p', 'live-status'), INPUT.x, INPUT.y + INPUT.h + 28, STATUS_W)
  const dot = el('i', 'dot')
  const statusText = el('span')
  statusLine.append(dot, statusText)
  const stepLine = place(el('p', 'live-step'), INPUT.x, INPUT.y + INPUT.h + 90, STATUS_W)
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
  const idle = () => say(live.status() === 'ready' ? 'Connected to the home GPU' : 'Not connected. Enter plays a recorded run.', live.status() === 'ready' ? 'live' : 'idle')

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
    say('Playing a recorded run (a cat in a wizard hat, reading a book)', 'recorded')
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

  // ---- Beat 34: the live demo.
  const beat34 = gsap.timeline()
  wordsIn(beat34, yours, 0)
  beat34
    .fromTo(inputTag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.6)
    .fromTo(input, { autoAlpha: 0, scaleX: 0, transformOrigin: '0 50%' }, { autoAlpha: 1, scaleX: 1, duration: 0.6, ease: 'power4.out' }, 0.6)
    .fromTo(viewFrame, { clipPath: 'inset(50% 50% 50% 50% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.inOut' }, 0.8)
  rise(beat34, [statusLine, stepLine], 1.2, 0.1)

  return [beat34]
}
