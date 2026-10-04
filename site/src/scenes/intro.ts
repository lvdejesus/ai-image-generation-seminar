// Section I, beats 1-3: the question, the misconception, and the answer.
import gsap from 'gsap'
import { arrow, assets, draw, el, headline, live, overlay, place, stroke, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { Static, WordStatic } from '../noise'

const PROMPT = 'a lighthouse on a cliff at sunset'

// Geometry on the 1920x1080 stage.
const BOX = { x: 104, y: 470, w: 760, h: 88 }
const FRAME = { x: 1216, y: 214, size: 600 }
const TILE = { x: 104, y: 648, size: 136, pitch: 156, columns: 5 }

/** One of the real photographs, as a square canvas. */
function thumbnail(size: number, k: number) {
  const canvas = el('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(assets.found[k], 0, 0, size, size)
  return canvas
}

/**
 * The cut-and-paste collage: a sunset sky, then three subjects cut out of
 * other photographs and stacked on it. A layer is a square picture, placed
 * by its left edge, top edge and size as fractions of the frame.
 */
const LAYERS = [
  { tile: 1, cut: false, x: 0, y: 0, size: 1 }, // sky
  { tile: 6, cut: true, x: -0.02, y: 0.12, size: 1.3 }, // cliff, its cut left edge outside the frame
  { tile: 8, cut: true, x: 0, y: 0.42, size: 1 }, // sea, in front of the foot of the cliff
  { tile: 0, cut: true, x: 0.31, y: 0.06, size: 0.42 }, // lighthouse, standing on the cliff
]
type Layer = (typeof LAYERS)[number]

function layerImage(layer: Layer) {
  return (layer.cut ? assets.cut[layer.tile] : assets.found[layer.tile]).cloneNode() as HTMLImageElement
}

/** The clip that trims a layer to the part of it inside the frame. */
function clip({ x, y, size }: Layer) {
  const outside = (overhang: number) => `${((Math.max(0, overhang) / size) * 100).toFixed(2)}%`
  return `inset(${outside(-y)} ${outside(x + size - 1)} ${outside(y + size - 1)} ${outside(-x)} round 24px)`
}

/** The finished collage as a single element, `size` pixels square. */
export function collage(size: number) {
  const frame = el('div', 'collage')
  frame.style.width = frame.style.height = `${size}px`
  for (const layer of LAYERS) {
    frame.append(place(layerImage(layer), layer.x * size, layer.y * size, layer.size * size, layer.size * size))
  }
  return frame
}

export function intro(root: HTMLElement) {
  const question = headline(root, title('1'), 1040)
  const misconception = headline(root, title('2'), 1040)
  const answer = headline(root, title('3'), 1500)
  const lines = overlay(root)

  // Prompt box, with the prompt typed into it.
  const box = place(el('div', 'prompt-box'), BOX.x, BOX.y, BOX.w, BOX.h)
  const typedText = el('span', 'typed')
  box.append(typedText, el('span', 'caret'))
  const boxTag = place(el('span', 'tag', 'Prompt'), BOX.x, BOX.y - 38)
  root.append(boxTag, box)

  const toFrame = arrow(lines, BOX.x + BOX.w + 24, FRAME.x - 24, BOX.y + BOX.h / 2)

  // The frame the image should appear in: static and a question mark.
  const frame = place(el('div', 'frame'), FRAME.x, FRAME.y, FRAME.size, FRAME.size)
  const fuzz = new Static(150, 150)
  live(fuzz.canvas, fuzz.draw)
  const mark = el('span', 'frame-mark', '?')
  frame.append(fuzz.canvas, mark)
  root.append(frame)

  // Existing images: real photographs.
  const tilesTag = place(el('span', 'tag', 'Existing images'), TILE.x, TILE.y - 38)
  root.append(tilesTag)
  const tiles = assets.found.map((_, k) => {
    const tile = thumbnail(TILE.size * 2, k)
    tile.className = 'tile'
    place(tile, TILE.x + (k % TILE.columns) * TILE.pitch, TILE.y + Math.floor(k / TILE.columns) * TILE.pitch, TILE.size, TILE.size)
    root.append(tile)
    return tile
  })

  // Each layer starts exactly on top of the photograph it was taken from,
  // already cropped to the part of it that the frame will show.
  const pieces = LAYERS.map((layer) => {
    const piece = layerImage(layer)
    piece.className = 'piece'
    const size = layer.size * FRAME.size
    const x = FRAME.x + layer.x * FRAME.size
    const y = FRAME.y + layer.y * FRAME.size
    place(piece, x, y, size, size)
    gsap.set(piece, {
      x: TILE.x + (layer.tile % TILE.columns) * TILE.pitch - x,
      y: TILE.y + Math.floor(layer.tile / TILE.columns) * TILE.pitch - y,
      scale: TILE.size / size,
      clipPath: clip(layer),
      autoAlpha: 0,
      transformOrigin: '0 0',
    })
    root.append(piece)
    return piece
  })

  const inset = 44
  const far = FRAME.size - inset
  const cross = [
    stroke(lines, `M${FRAME.x + inset} ${FRAME.y + inset} L${FRAME.x + far} ${FRAME.y + far}`, 'strike'),
    stroke(lines, `M${FRAME.x + far} ${FRAME.y + inset} L${FRAME.x + inset} ${FRAME.y + far}`, 'strike'),
  ]
  root.append(lines) // keep the strokes above the pieces

  // The word that resolves out of static.
  const word = new WordStatic(1712, 440, 4, 'denoising', '700 288px "Space Grotesk Variable"')
  live(word.canvas, word.draw)
  place(word.canvas, 104, 440, 1712, 440)
  root.append(word.canvas)

  // ---- Beat 1: the question, then a prompt going in and a mystery coming out.
  const typed = { n: 0 }
  const beat1 = gsap.timeline()
  wordsIn(beat1, question, 0)
  beat1
    .fromTo(boxTag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.55)
    .fromTo(box, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 0.6, ease: 'power4.out' }, 0.55)
    .to(typed, { n: PROMPT.length, duration: 1.2, ease: 'none', onUpdate: () => (typedText.textContent = PROMPT.slice(0, Math.round(typed.n))) }, 1.0)
  draw(beat1, toFrame, 2.2, 0.45)
  beat1
    .fromTo(frame, { clipPath: 'inset(0% 100% 0% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 0.7, ease: 'power3.inOut' }, 2.5)
    .fromTo(mark, { scale: 0.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(2)' }, 3.0)

  // ---- Beat 2: search results, pasted together into the frame, struck out.
  const beat2 = gsap.timeline()
  wordsOut(beat2, question, 0)
  wordsIn(beat2, misconception, 0.35)
  beat2
    .to(mark, { scale: 0.4, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0.2)
    .fromTo(tilesTag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.5)
    .fromTo(tiles, { scale: 0.6, y: 24, autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.7)', stagger: 0.05 }, 0.5)
  pieces.forEach((piece, q) => {
    // Lift off the photograph and land in the frame.
    beat2
      .set(piece, { autoAlpha: 1 }, 1.4 + q * 0.35)
      .to(piece, { x: 0, y: 0, scale: 1, duration: 0.8, ease: 'power3.inOut' }, 1.4 + q * 0.35)
  })
  // The finished collage holds for a moment before it is struck out.
  beat2.to([...pieces, ...tiles], { filter: 'grayscale(1) brightness(0.45)', duration: 0.4 }, 4.1)
  draw(beat2, cross[0], 4.05, 0.3)
  draw(beat2, cross[1], 4.25, 0.3)

  // ---- Beat 3: everything clears; static resolves into the word.
  const reveal = { value: 0 }
  const beat3 = gsap.timeline()
  wordsOut(beat3, misconception, 0)
  wordsIn(beat3, answer, 0.4)
  beat3
    .to([...tiles].reverse(), { y: 50, autoAlpha: 0, duration: 0.35, ease: 'power2.in', stagger: 0.025 }, 0)
    .to([tilesTag, boxTag, box, toFrame, ...cross, ...pieces], { autoAlpha: 0, duration: 0.35 }, 0.1)
    .to(frame, { autoAlpha: 0, duration: 0.35 }, 0.1)
    .fromTo(word.canvas, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power3.inOut' }, 0.6)
    .to(reveal, { value: 1, duration: 2, ease: 'power1.inOut', onUpdate: () => ((word.reveal = reveal.value), word.draw()) }, 1.5)

  return [beat1, beat2, beat3]
}
