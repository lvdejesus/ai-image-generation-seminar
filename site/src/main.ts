import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './style.css'
import { beats, sections } from './beats'
import { createDeck, type SceneBuilder } from './engine'
import { el, loadAssets } from './kit'
import { live } from './live'
import { generate } from './scenes/generate'
import { intro } from './scenes/intro'
import { latent } from './scenes/latent'
import { noising } from './scenes/noising'
import { demo, pipeline } from './scenes/pipeline'
import { prompt } from './scenes/prompt'
import { reverse } from './scenes/reverse'
import { spine } from './scenes/spine'
import { training } from './scenes/training'

const STAGE_W = 1920
const STAGE_H = 1080

const stage = document.querySelector<HTMLElement>('#stage')!
const progress = document.querySelector<HTMLElement>('#progress')!
const hud = document.querySelector<HTMLElement>('#hud')!
const overview = document.querySelector<HTMLElement>('#overview')!
const tip = document.querySelector<HTMLElement>('#tip')!
const setup = document.querySelector<HTMLElement>('#setup')!

// Scenes in order. A scene covers one or more consecutive beats.
// spine(n) is step n of the diagram that grows through the talk.
const builders: SceneBuilder[] = [intro, noising, training, reverse, generate, spine(1), prompt, spine(2), latent, spine(3), pipeline]

// starts[i] is the time at which beat i should begin if the talk is on budget.
const starts = beats.map((_, i) => beats.slice(0, i).reduce((sum, b) => sum + b.seconds, 0))

// Wall-clock start of the talk, kept across reloads.
let startedAt: number | null = Number(sessionStorage.getItem('startedAt')) || null

function setStartedAt(value: number | null) {
  startedAt = value
  if (value === null) sessionStorage.removeItem('startedAt')
  else sessionStorage.setItem('startedAt', String(value))
}

function clock(seconds: number) {
  const s = Math.round(Math.abs(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ------------------------------------------------------------- url state

// The hash is a parameter list (#b=6) so other values, such as the live
// endpoint, can share it later.
function readHash() {
  const id = new URLSearchParams(location.hash.slice(1)).get('b')
  const i = beats.findIndex((b) => b.id === id)
  return i < 0 ? null : i
}

function writeHash(index: number) {
  const params = new URLSearchParams(location.hash.slice(1))
  params.set('b', beats[index].id)
  history.replaceState(null, '', `#${params}`)
}

// -------------------------------------------------------------- progress

function buildProgress() {
  beats.forEach((beat, i) => {
    const tick = el('div', 'tick')
    tick.style.flexGrow = String(beat.seconds)
    if (i > 0 && beats[i - 1].section !== beat.section) tick.classList.add('section-start')
    // Each tick is also a way to jump straight to its beat, for questions.
    tick.addEventListener('click', () => deck.jump(i))
    tick.addEventListener('mouseenter', () => {
      tip.textContent = `${beat.ref} · ${beat.headline.replaceAll('*', '')}`
      tip.hidden = false
      const centre = progress.offsetLeft + tick.offsetLeft + tick.offsetWidth / 2
      const half = tip.offsetWidth / 2
      tip.style.left = `${Math.max(104 + half, Math.min(STAGE_W - 104 - half, centre))}px`
    })
    tick.addEventListener('mouseleave', () => (tip.hidden = true))
    progress.append(tick)
  })
}

function updateProgress(index: number) {
  Array.from(progress.children).forEach((tick, i) => {
    tick.classList.toggle('done', i < index)
    tick.classList.toggle('current', i === index)
  })
}

// ---------------------------------------------------------- presenter hud

function updateHud() {
  const index = deck.index()
  if (hud.hidden || index < 0) return
  const beat = beats[index]
  const elapsed = startedAt === null ? 0 : (Date.now() - startedAt) / 1000
  const end = starts[index] + beat.seconds

  let pace = 'on time'
  let state = 'ok'
  if (elapsed > end) {
    pace = `${clock(elapsed - end)} behind`
    state = 'behind'
  } else if (elapsed < starts[index]) {
    pace = `${clock(starts[index] - elapsed)} ahead`
  }

  hud.dataset.state = state
  hud.replaceChildren(
    el('span', 'hud-beat', `${index + 1}/${beats.length} · ${beat.ref}`),
    el('span', 'hud-time', clock(elapsed)),
    el('span', 'hud-window', `beat ${clock(starts[index])}–${clock(end)}`),
    el('span', 'hud-pace', pace),
    el('span', 'hud-live', `live ${live.status()}`),
  )
}

// --------------------------------------------------------------- overview

function buildOverview() {
  const total = beats.reduce((sum, b) => sum + b.seconds, 0)
  const top = el('header', 'ov-top')
  top.append(el('h1', '', 'All beats'), el('p', '', `${beats.length} beats · ${clock(total)} · click one to jump to it · O or Esc to close`))
  overview.append(top)

  for (const [numeral, title] of Object.entries(sections)) {
    const group = beats.filter((b) => b.section === numeral)
    const seconds = group.reduce((sum, b) => sum + b.seconds, 0)

    const heading = el('h2', 'ov-section')
    heading.append(el('span', 'num', numeral), el('span', '', title), el('span', 'time', clock(seconds)))

    const grid = el('div', 'ov-grid')
    for (const beat of group) {
      const card = el('button', 'ov-card')
      card.dataset.id = beat.id
      const meta = el('div', 'ov-meta')
      meta.append(el('span', '', beat.ref), el('span', '', clock(beat.seconds)))
      // A picture of the finished beat, made by `pnpm thumbs`; without one the card is text only.
      const thumb = el('img')
      thumb.loading = 'lazy'
      thumb.alt = ''
      thumb.src = `${import.meta.env.BASE_URL}thumbs/${beat.id}.jpg`
      thumb.addEventListener('error', () => thumb.remove())
      card.append(thumb, meta, el('h3', '', beat.headline.replaceAll('*', '')), el('p', 'ov-say', beat.say))
      card.addEventListener('click', () => {
        toggleOverview(false)
        deck.jump(beats.indexOf(beat))
      })
      grid.append(card)
    }
    overview.append(heading, grid)
  }
}

function updateOverview(index: number) {
  for (const card of overview.querySelectorAll<HTMLElement>('.ov-card')) {
    card.classList.toggle('current', card.dataset.id === beats[index].id)
  }
}

function toggleOverview(open = overview.hidden) {
  overview.hidden = !open
  if (open) overview.querySelector('.ov-card.current')?.scrollIntoView({ block: 'center' })
}

// ------------------------------------------------------------- live setup

// On the first slide (or after pressing L), a small control in the corner
// shows whether the live demo is connected and takes a pasted address.
const setupButton = setup.querySelector('button')!
const setupInput = setup.querySelector('input')!
let setupPinned = false
let setupNote = ''

function updateSetup() {
  const state = live.status()
  const host = live.host()
  const text = state === 'ready' ? `Live demo connected · ${host}` : state === 'connecting' ? `Live demo: connecting to ${host}…` : 'Live demo not set up · click to paste its address'
  setup.querySelector<HTMLElement>('.dot')!.dataset.state = state === 'ready' ? 'live' : state === 'connecting' ? 'recorded' : 'idle'
  setup.querySelector('span')!.textContent = setupNote || text
}

function showSetup(index: number) {
  setup.hidden = index !== 0 && !setupPinned
}

setupButton.addEventListener('click', () => {
  setupNote = ''
  setupInput.hidden = false
  setupInput.value = ''
  setupInput.focus()
  updateSetup()
})
setupInput.addEventListener('keydown', (e) => {
  // Keys typed here never reach the deck's navigation.
  e.stopPropagation()
  if (e.key === 'Escape') setupInput.hidden = true
  if (e.key !== 'Enter') return
  const text = setupInput.value.trim()
  if (!text) live.clear()
  setupNote = text && !live.configure(text) ? 'Could not read an address from that · click to try again' : ''
  setupInput.hidden = true
  updateSetup()
})
setupInput.addEventListener('blur', () => (setupInput.hidden = true))
live.onStatus(updateSetup)
updateSetup()

// ------------------------------------------------------------------ stage

function fit() {
  const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`
}

// A static grain texture over the stage, generated once.
function grain() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(256, 256)
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random() * 255
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v
    image.data[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  stage.style.setProperty('--grain', `url(${canvas.toDataURL()})`)
}

// ------------------------------------------------------------------- boot

fit()
grain()
window.addEventListener('resize', fit)

// Canvas text and headline measurements need the real fonts.
await Promise.all([document.fonts.load('700 96px "Space Grotesk Variable"'), loadAssets()])

const deck = createDeck({
  scenes: document.querySelector<HTMLElement>('#scenes')!,
  labels: document.querySelector<HTMLElement>('#labels')!,
  builders,
  onBeat(index) {
    if (index > 0 && startedAt === null) setStartedAt(Date.now())
    updateProgress(index)
    updateOverview(index)
    updateHud()
    showSetup(index)
  },
  onSettle: writeHash,
})

buildProgress()
buildOverview()
deck.start(readHash())
window.setInterval(updateHud, 250)

// ------------------------------------------------------------------ input

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'])
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'])

window.addEventListener('keydown', (e) => {
  // The live demo's prompt field takes the keyboard while it has focus.
  if (e.metaKey || e.ctrlKey || e.altKey || demo.typing()) return
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key

  if (key === 'o') return toggleOverview()
  if (key === 'Escape') return toggleOverview(false)
  if (!overview.hidden) return

  if (NEXT_KEYS.has(key)) {
    e.preventDefault()
    deck.next()
  } else if (PREV_KEYS.has(key)) {
    e.preventDefault()
    deck.prev()
  } else if (key === 'Home') {
    deck.jump(0)
  } else if (key === 'End') {
    deck.jump(beats.length - 1)
  } else if (key === 't') {
    hud.hidden = !hud.hidden
    updateHud()
  } else if (key === 'f') {
    demo.panic()
  } else if (key === 'l') {
    setupPinned = !setupPinned
    showSetup(deck.index())
  } else if (key === 'r') {
    setStartedAt(null)
    updateHud()
  }
})

window.addEventListener(
  'wheel',
  (e) => {
    if (!overview.hidden) return
    e.preventDefault()
    deck.wheel(e)
  },
  { passive: false },
)

window.addEventListener('hashchange', () => {
  const index = readHash()
  if (index !== null && index !== deck.index()) deck.jump(index)
})
