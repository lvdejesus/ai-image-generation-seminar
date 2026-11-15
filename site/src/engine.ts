// The deck: one master timeline that the scroll position scrubs through.
//
// Beat i occupies the span [i, i + 1] of the master timeline. The integers
// are the rest points: at position k, beat k - 1 is fully built. Scrolling
// moves the playhead freely inside a span, and when the gesture ends the
// playhead plays on to a rest point, so the deck is stepped underneath.
//
// A beat can also stop inside its span: a scene marks a hold with `hold(tl)`
// from the kit, and the deck rests there until the next key press. The
// overview and the hash still jump by whole beats.
import gsap from 'gsap'
import { beats, isSectionPage, sections } from './beats'
import { el, HOLD, type Timeline } from './kit'

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
  /** Every rest point, in master positions, sorted: the beat ends and the holds inside beats. */
  const stops: number[] = []

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
      // The corner label leaves when the section changes. A section page
      // shows the section large, so the new label comes in on the beat after it.
      // The title page has no section, so it has no label.
      if (i > 0) {
        const before = beats[i - 1]
        const now = beats[i]
        const out = sectionLabels.get(before.section)
        const into = sectionLabels.get(now.section)
        if (out && now.section !== before.section && !isSectionPage(before)) wrap.to(out, { autoAlpha: 0, y: -24, duration: 0.3, ease: 'power2.in' }, 0)
        if (into && !isSectionPage(now) && (now.section !== before.section || isSectionPage(before))) {
          wrap.to(into, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.3)
        }
      }
      wrap.add(timeline, at)
      natural[i] = wrap.duration()
      for (const [name, t] of Object.entries(timeline.labels)) {
        if (name.startsWith(HOLD)) stops.push(i + (at + t) / natural[i])
      }
      stops.push(i + 1)
      wrap.duration(1)
      master.add(wrap, i)
      i++
    })
    previousRoot = root
  }
  if (i !== count) throw new Error(`scenes cover ${i} beats, but there are ${count}`)
  stops.sort((a, b) => a - b)

  /** The first rest point after `pos`, or the last one. */
  const stopAfter = (pos: number) => stops.find((s) => s > pos + EPS) ?? count
  /** The last rest point before `pos`, or the first one. */
  const stopBefore = (pos: number) => [...stops].reverse().find((s) => s < pos - EPS) ?? 1
  /** The nearest rest point to `pos`. */
  const stopNear = (pos: number) => stops.reduce((a, b) => (Math.abs(b - pos) < Math.abs(a - pos) ? b : a))

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
        // For tools that capture each step: the position the deck rests at.
        document.documentElement.dataset.rest = String(state.pos)
        onSettle(index)
      },
    })
  }

  function next() {
    // Pressing again while a beat is still playing skips ahead, quickly.
    if (tween && tweenDest > state.pos) playTo(stopAfter(tweenDest), FAST)
    else playTo(stopAfter(state.pos))
  }

  function prev() {
    if (tween && tweenDest < state.pos) playTo(stopBefore(tweenDest), FAST)
    else playTo(stopBefore(state.pos), FAST)
  }

  function jump(to: number) {
    tween?.kill()
    tween = null
    gesture = null
    state.pos = clamp(to + 1, 1, count)
    render()
    document.documentElement.dataset.rest = String(state.pos)
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
      // trackpad momentum never carries past a hold.
      gesture = { start, lo: stopBefore(start), hi: stopAfter(start), target: start }
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
    if (travelled > COMMIT) playTo(stopAfter(start))
    else if (travelled < -COMMIT) playTo(stopBefore(start), FAST)
    else playTo(stopNear(start), FAST)
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
