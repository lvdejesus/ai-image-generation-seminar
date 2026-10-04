// The deck: one master timeline that the scroll position scrubs through.
//
// Beat i occupies the span [i, i + 1] of the master timeline. The integers
// are the rest points: at position k, beat k - 1 is fully built. Scrolling
// moves the playhead freely inside a span, and when the gesture ends the
// playhead plays on to a rest point, so the deck is stepped underneath.
import gsap from 'gsap'
import { beats, sections } from './beats'
import { el, type Timeline } from './kit'

/** Builds a scene's DOM under `root` and returns one timeline per beat it covers, authored in seconds. */
export type SceneBuilder = (root: HTMLElement) => Timeline[]

const EPS = 1e-4
/** Wheel distance, in pixels, that scrubs through one whole beat. */
const WHEEL_PER_BEAT = 900
/** Fraction of a beat a gesture must travel before the deck moves on. */
const COMMIT = 0.04
/** How tightly the playhead follows the scroll target, per second. */
const FOLLOW = 14
/** Playback rate when going backwards, or catching up on a repeated key press. */
const FAST = 2.5

interface Options {
  scenes: HTMLElement
  labels: HTMLElement
  builders: SceneBuilder[]
  /** The beat under the playhead changed. */
  onBeat: (index: number) => void
  /** The playhead came to rest on a beat. */
  onSettle: (index: number) => void
}

export function createDeck({ scenes, labels, builders, onBeat, onSettle }: Options) {
  const count = beats.length
  const master = gsap.timeline({ paused: true })
  /** Authored duration of each beat, in seconds. */
  const natural: number[] = []

  // One label per section, swapped when the section changes.
  const sectionLabels = new Map<string, HTMLElement>()
  for (const [numeral, title] of Object.entries(sections)) {
    const label = el('div', 'section-label')
    label.append(el('span', 'num', numeral), el('span', '', title))
    labels.append(label)
    sectionLabels.set(numeral, label)
    if (numeral !== beats[0].section) gsap.set(label, { autoAlpha: 0, y: 24 })
  }

  let i = 0
  let previousRoot: HTMLElement | null = null
  for (const build of builders) {
    const root = el('section', 'scene')
    scenes.append(root)
    if (previousRoot) gsap.set(root, { autoAlpha: 0 })

    build(root).forEach((timeline, k) => {
      const wrap = gsap.timeline()
      let at = 0
      if (k === 0 && previousRoot) {
        // The outgoing scene recedes while this one starts building.
        wrap.to(previousRoot, { autoAlpha: 0, scale: 0.94, duration: 0.45, ease: 'power2.in' }, 0)
        wrap.set(root, { autoAlpha: 1 }, 0.3)
        at = 0.3
      }
      if (i > 0 && beats[i].section !== beats[i - 1].section) {
        wrap.to(sectionLabels.get(beats[i - 1].section)!, { autoAlpha: 0, y: -24, duration: 0.3, ease: 'power2.in' }, 0)
        wrap.to(sectionLabels.get(beats[i].section)!, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.3)
      }
      wrap.add(timeline, at)
      natural[i] = wrap.duration()
      wrap.duration(1)
      master.add(wrap, i)
      i++
    })
    previousRoot = root
  }
  if (i !== count) throw new Error(`scenes cover ${i} beats, but there are ${count}`)

  // ------------------------------------------------------------ playhead

  const state = { pos: 0 }
  let index = -1
  let tween: gsap.core.Tween | null = null
  let tweenDest = 0
  let gesture: { start: number; lo: number; hi: number; target: number } | null = null
  let quiet = 0

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

  function render() {
    master.time(state.pos, false)
    const now = clamp(Math.ceil(state.pos - EPS) - 1, 0, count - 1)
    if (now !== index) {
      index = now
      onBeat(index)
    }
  }

  /** Seconds needed to travel between two positions at the authored pace. */
  function travelTime(a: number, b: number) {
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    let seconds = 0
    for (let k = Math.floor(lo); k < Math.ceil(hi); k++) {
      seconds += (Math.min(hi, k + 1) - Math.max(lo, k)) * natural[k]
    }
    return seconds
  }

  function playTo(dest: number, rate = 1) {
    dest = clamp(dest, 1, count)
    tween?.kill()
    tweenDest = dest
    tween = gsap.to(state, {
      pos: dest,
      duration: travelTime(state.pos, dest) / rate,
      ease: 'none',
      onUpdate: render,
      onComplete: () => {
        tween = null
        render()
        onSettle(index)
      },
    })
  }

  function next() {
    // Pressing again while a beat is still playing skips ahead, quickly.
    if (tween && tweenDest > state.pos) playTo(tweenDest + 1, FAST)
    else playTo(Math.floor(state.pos + EPS) + 1)
  }

  function prev() {
    if (tween && tweenDest < state.pos) playTo(tweenDest - 1, FAST)
    else playTo(Math.ceil(state.pos - EPS) - 1, FAST)
  }

  function jump(to: number) {
    tween?.kill()
    tween = null
    gesture = null
    state.pos = clamp(to + 1, 1, count)
    render()
    onSettle(index)
  }

  // --------------------------------------------------------------- wheel

  function wheel(e: WheelEvent) {
    const pixels = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 40 : e.deltaY
    if (!gesture) {
      tween?.kill()
      tween = null
      const start = state.pos
      // A gesture can scrub at most to the neighbouring rest points, so
      // trackpad momentum never carries past a beat.
      gesture = {
        start,
        lo: Math.max(1, Math.ceil(start - EPS) - 1),
        hi: Math.min(count, Math.floor(start + EPS) + 1),
        target: start,
      }
    }
    gesture.target = clamp(gesture.target + pixels / WHEEL_PER_BEAT, gesture.lo, gesture.hi)
    window.clearTimeout(quiet)
    quiet = window.setTimeout(release, 140)
  }

  function release() {
    if (!gesture) return
    const { start, target } = gesture
    gesture = null
    const travelled = target - start
    if (travelled > COMMIT) playTo(Math.floor(start + EPS) + 1)
    else if (travelled < -COMMIT) playTo(Math.ceil(start - EPS) - 1, FAST)
    else playTo(Math.round(start), FAST)
  }

  gsap.ticker.add((_time, deltaMs) => {
    if (!gesture) return
    state.pos += (gesture.target - state.pos) * (1 - Math.exp((-deltaMs / 1000) * FOLLOW))
    render()
  })

  return {
    index: () => index,
    next,
    prev,
    jump,
    wheel,
    /** Open on a given beat, or play the first beat in from nothing. */
    start(at: number | null) {
      if (at === null) {
        render()
        playTo(1)
      } else {
        jump(at)
      }
    },
  }
}
