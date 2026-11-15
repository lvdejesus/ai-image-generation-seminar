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
/** The step row is as wide as the prompt box. */
const STEP_W = 760
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
  // The status, as a dot only: green when the home GPU is connected, accent
  // while a recorded run plays, grey when not connected.
  const dot = el('i', 'dot live-dot')
  inputTag.append(dot)
  const input = place(el('input', 'prompt-box live-input'), INPUT.x, INPUT.y, INPUT.w, INPUT.h)
  input.type = 'text'
  input.maxLength = 200
  input.spellcheck = false
  input.placeholder = 'type a prompt, then Enter'
  // The step slider: it follows the run as it plays, and can be dragged
  // (or moved with the arrow keys) to show any step that has arrived.
  const stepRow = place(el('div', 'live-step'), INPUT.x, INPUT.y + INPUT.h + 48, STEP_W)
  const stepText = el('span', '', 'step 0')
  const slider = el('input', 'live-slider')
  slider.type = 'range'
  slider.min = '0'
  slider.max = String(assets.fallback.length - 1)
  slider.step = '1'
  slider.value = '0'
  stepRow.append(stepText, slider)
  root.append(inputTag, input, stepRow)

  // Until a run starts, the frame shows a recorded picture of pure noise.
  const view = new NoisyImage(assets.fallback[0], 384, 1)
  const viewFrame = shot(root, view.canvas, VIEW.x, VIEW.y, VIEW.size)

  // Frames may arrive faster or slower than they are shown; playback runs
  // at its own steady rate over whatever has arrived so far.
  let frames: CanvasImageSource[] = []
  let total = 0
  let shown = 0
  let patience = 0
  /** True while the slider follows the run; false once the presenter moves it. */
  let follow = true
  /** True while the frame shows the recorded run. */
  let recorded = false
  const showStatus = () => {
    dot.dataset.state = recorded ? 'recorded' : live.status() === 'ready' ? 'live' : 'idle'
    dot.title = recorded ? 'Recorded run' : live.status() === 'ready' ? 'Connected' : live.status() === 'connecting' ? 'Connecting' : 'Not connected'
  }

  /** Show step `index` in the frame, the label and the slider. */
  function showStep(index: number) {
    view.frame = index
    view.render()
    const step = Math.round(index)
    stepText.textContent = `step ${step}`
    slider.value = String(step)
  }

  function begin(count: number) {
    frames = []
    total = count
    shown = 0
    view.setFrames([assets.fallback[0]])
    follow = true
    if (count) slider.max = String(count - 1)
    showStep(0)
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
    recorded = true
    showStatus()
    assets.fallback.forEach((frame, i) => add(i, frame))
  }

  function generate() {
    const text = input.value.trim()
    if (!text) return
    input.blur()
    if (live.status() !== 'ready') return playRecorded()

    begin(0)
    recorded = false
    showStatus()
    let arrived = false
    patience = window.setTimeout(() => !arrived && playRecorded(), PATIENCE)
    live.generate(text, {
      onStart: (count) => {
        total = count
        slider.max = String(count - 1)
      },
      onFrame: (index, frame) => {
        arrived = true
        add(index, frame)
      },
      onDone: () => {},
      onError: () => playRecorded(),
    })
  }

  input.addEventListener('keydown', (e) => {
    // Keys typed into the field never reach the deck's navigation.
    e.stopPropagation()
    if (e.key === 'Enter') generate()
    if (e.key === 'Escape') input.blur()
  })
  live.onStatus(showStatus)
  showStatus()
  slider.addEventListener('input', () => {
    // Only steps that have arrived can be shown.
    let ready = 0
    while (frames[ready]) ready++
    const wanted = Math.min(Number(slider.value), Math.max(0, ready - 1))
    follow = false
    shown = wanted
    if (ready) showStep(wanted)
    else slider.value = '0'
  })
  slider.addEventListener('keydown', (e) => {
    // The arrow keys move the slider, not the deck.
    e.stopPropagation()
    if (e.key === 'Escape') slider.blur()
  })
  demo.panic = playRecorded
  demo.typing = () => document.activeElement === input

  gsap.ticker.add((_time, deltaMs) => {
    let ready = 0
    while (frames[ready]) ready++
    if (!total || !follow || shown >= ready - 1) return
    shown = Math.min(ready - 1, shown + (deltaMs / 1000) * RATE)
    showStep(shown)
  })

  // ---- Beat 34: the live demo.
  const beat34 = gsap.timeline()
  wordsIn(beat34, yours, 0)
  beat34
    .fromTo(inputTag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.6)
    .fromTo(input, { autoAlpha: 0, scaleX: 0, transformOrigin: '0 50%' }, { autoAlpha: 1, scaleX: 1, duration: 0.6, ease: 'power4.out' }, 0.6)
    .fromTo(viewFrame, { clipPath: 'inset(50% 50% 50% 50% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.inOut' }, 0.8)
  rise(beat34, stepRow, 1.2)

  return [beat34]
}
