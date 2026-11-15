// Small building blocks shared by the scenes.
import gsap from 'gsap'
import { ideas } from './beats'

export type Timeline = gsap.core.Timeline

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Position a node on the 1920x1080 stage. */
export function place<T extends HTMLElement | SVGElement>(node: T, x: number, y: number, w?: number, h?: number) {
  node.style.position = 'absolute'
  node.style.left = `${x}px`
  node.style.top = `${y}px`
  if (w !== undefined) node.style.width = `${w}px`
  if (h !== undefined) node.style.height = `${h}px`
  return node
}

// ------------------------------------------------------------- headlines

export interface Headline {
  el: HTMLElement
  words: HTMLElement[]
}

/**
 * A headline whose words sit inside masks, so they can rise in and leave
 * upwards. Wrap a word or a run of words in asterisks for the accent colour.
 */
export function headline(parent: HTMLElement, text: string, width = 1500): Headline {
  const h = place(el('h1', 'headline'), 104, 168, width)
  let accent = false
  const words = text.split(' ').map((raw) => {
    if (raw.startsWith('*')) accent = true
    const mask = el('span', 'word')
    const inner = el('span', accent ? 'word-in accent' : 'word-in', raw.replaceAll('*', ''))
    if (raw.endsWith('*')) accent = false
    mask.append(inner)
    h.append(mask, ' ')
    return inner
  })
  parent.append(h)
  return { el: h, words }
}

/** Label prefix that marks a hold: the deck stops there until the next key press. */
export const HOLD = 'hold'
let holds = 0

/** Stop the deck at time `at` of this beat (default: the current end), until the next key press. */
export function hold(tl: Timeline, at?: number) {
  tl.addLabel(`${HOLD}-${holds++}`, at ?? tl.duration())
}

export function wordsIn(tl: Timeline, h: Headline, at: number) {
  tl.fromTo(h.words, { yPercent: 120 }, { yPercent: 0, duration: 0.8, ease: 'power4.out', stagger: 0.05 }, at)
}

export function wordsOut(tl: Timeline, h: Headline, at: number) {
  tl.to(h.words, { yPercent: -120, duration: 0.4, ease: 'power3.in', stagger: 0.02 }, at)
}

// ------------------------------------------------------------------- svg

const SVG_NS = 'http://www.w3.org/2000/svg'

/** A full-stage SVG overlay, so strokes can use stage coordinates. */
export function overlay(parent: HTMLElement) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 1920 1080')
  svg.classList.add('overlay')
  parent.append(svg)
  return svg
}

/** A gear centred on (x, y), hidden, ready to turn about its centre. It shows that a model is training. */
export function gear(svg: SVGSVGElement, x: number, y: number, outer = 40) {
  const inner = outer * 0.775
  const hole = outer * 0.3
  const count = 10
  const teeth = Array.from({ length: count * 4 }, (_, i) => {
    const r = i % 4 < 2 ? outer : inner
    const a = ((Math.floor(i / 2) + (i % 2) * 0.6) / (count * 2)) * Math.PI * 2
    return `${(x + r * Math.cos(a)).toFixed(1)} ${(y + r * Math.sin(a)).toFixed(1)}`
  })
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', `M${teeth.join(' L')} Z M${x + hole} ${y} a${hole} ${hole} 0 1 0 ${-2 * hole} 0 a${hole} ${hole} 0 1 0 ${2 * hole} 0 Z`)
  path.setAttribute('class', 'gear')
  svg.append(path)
  gsap.set(path, { svgOrigin: `${x} ${y}`, autoAlpha: 0 })
  return path
}

/** A stroke that starts undrawn; reveal it with `draw`. */
export function stroke(svg: SVGSVGElement, d: string, className = '') {
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', d)
  path.setAttribute('pathLength', '1')
  path.setAttribute('class', `stroke ${className}`)
  svg.append(path)
  return path
}

export function draw(tl: Timeline, path: SVGPathElement, at: number, duration = 0.5) {
  tl.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration, ease: 'power2.inOut' }, at)
}

/** The two short strokes of an arrowhead at (x, y), pointing along `angle`. */
function head(x: number, y: number, angle: number, size = 20) {
  const left = angle + Math.PI - 0.6
  const right = angle + Math.PI + 0.6
  const f = (v: number) => v.toFixed(1)
  return `M${f(x + Math.cos(left) * size)} ${f(y + Math.sin(left) * size)} L${x} ${y} L${f(x + Math.cos(right) * size)} ${f(y + Math.sin(right) * size)}`
}

/** A straight arrow, drawn as one stroke. */
export function line(svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number, className = '') {
  return stroke(svg, `M${x1} ${y1} L${x2} ${y2} ${head(x2, y2, Math.atan2(y2 - y1, x2 - x1))}`, className)
}

/** A horizontal arrow from (x1, y) to (x2, y). */
export function arrow(svg: SVGSVGElement, x1: number, x2: number, y: number) {
  return line(svg, x1, y, x2, y)
}

/** A curved arrow: a cubic from (x1, y1) to (x2, y2) through two control points. */
export function bend(svg: SVGSVGElement, x1: number, y1: number, c1x: number, c1y: number, c2x: number, c2y: number, x2: number, y2: number, className = '') {
  return stroke(svg, `M${x1} ${y1} C${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2} ${head(x2, y2, Math.atan2(y2 - c2y, x2 - c2x))}`, className)
}

// ---------------------------------------------------------------- widgets

/** A square picture frame around a canvas, centred on (cx, cy). */
export function shot(parent: HTMLElement, canvas: HTMLCanvasElement, cx: number, cy: number, size: number, className = '') {
  const frame = place(el('div', `shot ${className}`), cx - size / 2, cy - size / 2, size, size)
  frame.append(canvas)
  parent.append(frame)
  return frame
}

/** A line of text centred on `cx`. */
export function label(parent: HTMLElement, text: string, cx: number, y: number, className = 'caption', width = 480) {
  const node = place(el('span', className, text), cx - width / 2, y, width)
  node.style.textAlign = 'center'
  parent.append(node)
  return node
}

/** A labelled box, such as a model or an encoder. */
export function box(parent: HTMLElement, text: string, x: number, y: number, w: number, h: number, className = '') {
  const node = place(el('div', `box ${className}`), x, y, w, h)
  node.append(el('span', '', text))
  parent.append(node)
  return node
}

/** A small pill of text centred on (cx, cy). */
export function chip(parent: HTMLElement, text: string, cx: number, cy: number, className = '') {
  const node = el('span', `chip ${className}`, text)
  node.style.left = `${cx}px`
  node.style.top = `${cy}px`
  gsap.set(node, { xPercent: -50, yPercent: -50 })
  parent.append(node)
  return node
}

/**
 * The prompt of a recorded run, as an accent chip under the headline, on the
 * left margin: the same place on every beat that shows a generation.
 */
export function promptChip(parent: HTMLElement, text: string) {
  const node = chip(parent, text, 104, 310, 'accent')
  gsap.set(node, { xPercent: 0 })
  return node
}

/**
 * One of the talk's three ideas: its number in a ring, then its text. The
 * node is `width` pixels wide with its left edge at x; add 'centered' to
 * centre the content in that width.
 */
export function idea(parent: HTMLElement, n: number, x: number, y: number, className = '', width = 900) {
  const node = place(el('div', `idea ${className}`), x, y, width)
  node.append(el('span', 'num', String(n)), el('span', '', ideas[n - 1]))
  parent.append(node)
  return node
}

/** Fade and lift a set of nodes in. */
export function rise(tl: Timeline, nodes: gsap.TweenTarget, at: number, stagger = 0) {
  tl.fromTo(nodes, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger }, at)
}

/** Fade a set of nodes out. */
export function fade(tl: Timeline, nodes: gsap.TweenTarget, at: number, duration = 0.3) {
  tl.to(nodes, { autoAlpha: 0, duration, ease: 'power1.in' }, at)
}

// ---------------------------------------------------------- live canvases

// Canvases that redraw on their own clock (flickering static), independent
// of the scroll position. They only draw while actually visible.
const lives: { canvas: HTMLCanvasElement; draw: () => void }[] = []
let lastLive = 0

export function live(canvas: HTMLCanvasElement, drawFrame: () => void) {
  lives.push({ canvas, draw: drawFrame })
}

gsap.ticker.add((time) => {
  if (time - lastLive < 0.05) return
  lastLive = time
  for (const item of lives) {
    if (item.canvas.checkVisibility({ visibilityProperty: true })) item.draw()
  }
})

// ----------------------------------------------------------------- assets

const THREE = ['cat', 'girl', 'lighthouse'] as const
/** Photographs that have a cut-out. */
const CUTS = [0, 6, 8]
export type Subject = (typeof THREE)[number]

/** Every recorded image, decoded before the scenes are built. See tools/assets.py. */
export const assets = {} as {
  /** The original photograph. */
  portrait: HTMLImageElement
  /** Real photographs standing for "existing images". See tools/photos.py. */
  found: HTMLImageElement[]
  /** Everyday photographs for the collection of training images. See tools/photos.py. */
  collection: HTMLImageElement[]
  /** Subjects cut out of some of those photographs, by index into `found`. */
  cut: Record<number, HTMLImageElement>
  /** The portrait as the model sees it at five noise levels, least noisy first. */
  noised: HTMLImageElement[]
  /** What the model gives back from the least noisy of those: nearly the original. */
  near: HTMLImageElement
  /** Four results the model produced from one of those noisy inputs. */
  cand: HTMLImageElement[]
  /** The model's single-step guess from that same input. */
  guess: HTMLImageElement
  /** The model's guess of the clean image at step 1, from pure noise: with no text, and with the portrait prompt. */
  hedge: { none: HTMLImageElement; portrait: HTMLImageElement }
  /** A second photo with the portrait's caption (tools/assets.py, second()): both photos at full noise, the model's prediction from each, and the second photo at 32% noise with the prediction from there. */
  second: { photo: HTMLImageElement; full: HTMLImageElement[]; ghost: HTMLImageElement[]; noised: HTMLImageElement; near: HTMLImageElement }
  /** More official portraits that fit the portrait's caption (tools/photos.py, same_caption()). */
  sameCaption: HTMLImageElement[]
  /** The model's states along the way from that input to cand[0]. */
  back: HTMLImageElement[]
  /** The portrait from much more noise, taken back by the anime model and by a photo-trained one. */
  far: { anime: HTMLImageElement; photo: HTMLImageElement }
  /** A text-to-image run: the real state at the start and after each of 30 steps. */
  run: HTMLImageElement[]
  /** The car (tools/assets.py, car()): a run's 31 states, results from pure noise, results that branch from the run after some steps, the model's prediction at both points, and its prediction after every step (pred: 0 to 29; 29 is the result). */
  car: { run: HTMLImageElement[]; far: HTMLImageElement[]; near: HTMLImageElement[]; guess: HTMLImageElement[]; pred: HTMLImageElement[] }
  /** One starting noise, three prompts and no prompt: the noise, five states along the way, the result. */
  three: Record<Subject, HTMLImageElement[]>
  /** The live demo's 8-step workflow, recorded: the noise, then the state after each step. */
  fallback: HTMLImageElement[]
  /** The real latent of the lighthouse image: its 16 channels as a 4x4 grid. */
  latent: HTMLImageElement
  /** The lighthouse image compressed to that latent and decompressed again, saved losslessly. */
  decoded: HTMLImageElement
}

async function image(path: string) {
  const node = new Image()
  node.src = `${import.meta.env.BASE_URL}assets/${path}`
  await node.decode()
  return node
}

const series = (count: number, path: (i: number) => string) => Promise.all(Array.from({ length: count }, (_, i) => image(path(i))))

export async function loadAssets() {
  const [portrait, found, collection, cuts, noised, near, cand, guess, back, anime, photo, run, fallback, latent, decoded, hedgeNone, hedgePortrait, carRun, carFar, carNear, carGuess, carPred, photo2, full, ghost, noised2, near2, sameCaption, ...three] = await Promise.all([
    image('portrait.jpg'),
    series(10, (i) => `found/${i}.webp`),
    series(19, (i) => `collection/${i}.webp`),
    Promise.all(CUTS.map((k) => image(`cut/${k}.webp`))),
    series(5, (i) => `noised/${i}.webp`),
    image('near.webp'),
    series(4, (i) => `cand/${i}.webp`),
    image('guess.webp'),
    series(5, (i) => `back/${i}.webp`),
    image('far/anime.webp'),
    image('far/photo.webp'),
    series(31, (i) => `run/${String(i).padStart(2, '0')}.webp`),
    series(9, (i) => `fallback/${i}.webp`),
    image('latent.png'),
    image('decoded.png'),
    image('hedge/none.webp'),
    image('hedge/portrait.webp'),
    series(31, (i) => `car/run/${String(i).padStart(2, '0')}.webp`),
    series(12, (i) => `car/far/${i}.webp`),
    series(12, (i) => `car/near/${i}.webp`),
    series(2, (i) => `car/guess/${i}.webp`),
    series(30, (i) => `car/pred/${String(i).padStart(2, '0')}.webp`),
    image('portrait2.jpg'),
    series(2, (i) => `second/full${i}.webp`),
    series(2, (i) => `second/ghost${i}.webp`),
    image('second/noised.webp'),
    image('second/near.webp'),
    series(5, (i) => `caption/${i}.webp`),
    ...THREE.map((name) => series(7, (i) => `three/${name}/${i}.webp`)),
  ])
  Object.assign(assets, { portrait, found, collection, noised, near, cand, guess, back, run, fallback, latent, decoded, far: { anime, photo }, hedge: { none: hedgeNone, portrait: hedgePortrait }, second: { photo: photo2, full, ghost, noised: noised2, near: near2 }, sameCaption, car: { run: carRun, far: carFar, near: carNear, guess: carGuess, pred: carPred } })
  assets.cut = Object.fromEntries(CUTS.map((k, i) => [k, cuts[i]]))
  assets.three = Object.fromEntries(THREE.map((name, i) => [name, three[i]])) as Record<Subject, HTMLImageElement[]>
}
