// Section IV, beats 25-28: two pictures to tell apart; pixels are full of
// detail we cannot see, so a compressor and a decompressor are trained to keep
// only what we see; what comes back is not exact, and the noise goes into the
// latent.
// Beat 29, the denoising in the latent, is a step of the diagram in spine.ts.
import gsap from 'gsap'
import { arrow, assets, bend, draw, el, fade, headline, label, overlay, place, rise, shot, stroke, wordsIn, wordsOut, type Timeline } from '../kit'
import { title } from '../beats'
import { gaussian, NoisyImage } from '../noise'

const Y = 560

// Beats 25 and 26: the lighthouse and a copy with a change too small to see on
// every pixel. Both zoom into the same patch, until its pixels show their numbers.
const SAME = { leftX: 540, rightX: 1380, y: 600, size: 480 }
/** Size of the change: the standard deviation, in brightness levels out of 255. */
const TINY = 4
/** The top-left pixel of the patch, on the 512-pixel canvases, and its width in pixels. */
const SPOT = { x: 315, y: 200, side: 4 }
const SIDE = 512
const IMAGE = { left: 300, right: 1620, size: 360 }
const LATENT = { x: 960, size: 200 }
const ENCODER = { x1: 520, x2: 700 }
const DECODER = { x1: 1220, x2: 1400 }
/** Beat 28: noise added to the pixels, next to noise added to the latent and decoded. */
const KINDS = { leftX: 580, rightX: 1340, y: 560, size: 400, level: 0.35 }

/** A trapezoid between two x positions: tall on the image side, short on the latent side. */
const funnel = (wide: number, narrow: number) => `M${wide} ${Y - 150} L${narrow} ${Y - 60} V${Y + 60} L${wide} ${Y + 150} Z`

/** The picture on a canvas, with Gaussian noise of `spread` brightness levels added to every pixel. */
function changed(picture: CanvasImageSource, spread: number, seed: number) {
  const canvas = el('canvas')
  canvas.width = canvas.height = SIDE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(picture, 0, 0, SIDE, SIDE)
  if (spread > 0) {
    const image = ctx.getImageData(0, 0, SIDE, SIDE)
    const noise = gaussian(SIDE * SIDE * 3, seed)
    for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
      for (let c = 0; c < 3; c++) image.data[i + c] += Math.round(noise[j + c] * spread)
    }
    ctx.putImageData(image, 0, 0)
  }
  return canvas
}

/**
 * A view of a picture that zooms from the whole picture (`zoom` 0) into the
 * patch at SPOT (`zoom` 1). The pixels stay sharp squares, and thin lines
 * between them appear once they are large. `mark` is the opacity of the
 * outline around the patch.
 */
class Zoom {
  readonly canvas = el('canvas')
  zoom = 0
  mark = 0
  private ctx: CanvasRenderingContext2D
  private drawn = ''

  constructor(private picture: HTMLCanvasElement) {
    this.canvas.width = this.canvas.height = 2 * SIDE
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.render()
  }

  render = () => {
    const key = `${this.zoom}|${this.mark}`
    if (key === this.drawn) return
    this.drawn = key

    const { ctx, canvas } = this
    // The visible square shrinks at a steady rate, so the zoom feels even.
    const s = SIDE * (SPOT.side / SIDE) ** this.zoom
    const f = (s - SPOT.side) / (SIDE - SPOT.side)
    const sx = SPOT.x * (1 - f)
    const sy = SPOT.y * (1 - f)
    const k = canvas.width / s
    ctx.globalAlpha = 1
    ctx.drawImage(this.picture, sx, sy, s, s, 0, 0, canvas.width, canvas.height)

    const lines = Math.min(1, Math.max(0, (k - 40) / 80))
    if (lines > 0) {
      ctx.globalAlpha = lines * 0.5
      ctx.fillStyle = '#0b0c0f'
      for (let i = Math.ceil(sx); i <= sx + s; i++) ctx.fillRect((i - sx) * k - 1.5, 0, 3, canvas.height)
      for (let j = Math.ceil(sy); j <= sy + s; j++) ctx.fillRect(0, (j - sy) * k - 1.5, canvas.width, 3)
    }
    if (this.mark > 0) {
      ctx.globalAlpha = this.mark
      ctx.strokeStyle = '#f3f0e9'
      ctx.lineWidth = 8
      ctx.strokeRect((SPOT.x - sx) * k - 4, (SPOT.y - sy) * k - 4, SPOT.side * k + 8, SPOT.side * k + 8)
    }
  }
}

/** The red, green and blue values of each pixel in the patch, laid out to sit on the zoomed pixels. */
function rgbValues(picture: HTMLCanvasElement) {
  const pixels = picture.getContext('2d')!.getImageData(SPOT.x, SPOT.y, SPOT.side, SPOT.side).data
  const grid = el('div', 'rgb-grid')
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]
    const cell = el('span', '', `R ${r}\nG ${g}\nB ${b}`)
    // Dark text on light pixels, light text on dark ones.
    cell.style.color = 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#0b0c0f' : '#f3f0e9'
    grid.append(cell)
  }
  return grid
}

/**
 * Two pictures side by side, each in a Zoom view, with a caption under each
 * and the RGB values of the patch laid on top of each, hidden until `zoomIn`.
 */
function zoomPair(root: HTMLElement, pictures: HTMLCanvasElement[], captions: string[]) {
  const zooms = pictures.map((canvas) => new Zoom(canvas))
  const xs = [SAME.leftX, SAME.rightX]
  const frames = zooms.map((zoom, i) => shot(root, zoom.canvas, xs[i], SAME.y, SAME.size))
  const labels = captions.map((text, i) => label(root, text, xs[i], SAME.y + SAME.size / 2 + 16))
  const values = pictures.map((canvas, i) => {
    const grid = place(rgbValues(canvas), 0, 0, SAME.size, SAME.size)
    frames[i].append(grid)
    return grid
  })
  return { zooms, frames, labels, values }
}

/** Mark the patch on both views, zoom into it, then show the RGB values. */
function zoomIn(tl: Timeline, pair: ReturnType<typeof zoomPair>, at: number) {
  pair.zooms.forEach((zoom) => {
    tl.to(zoom, { mark: 1, duration: 0.3, onUpdate: zoom.render }, at)
      .to(zoom, { zoom: 1, duration: 1.8, ease: 'power2.inOut', onUpdate: zoom.render }, at + 0.5)
      .to(zoom, { mark: 0, duration: 0.3, onUpdate: zoom.render }, at + 2.3)
  })
  pair.values.forEach((grid) => tl.fromTo(grid.children, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.04 }, at + 2.4))
}

export function latent(root: HTMLElement) {
  const spot = headline(root, title('25'))
  const detail = headline(root, title('26'))
  const trained = headline(root, title('27'))
  const inLatent = headline(root, title('28'))
  const lines = overlay(root)
  const picture = assets.three.lighthouse[6]

  // ---- Beat 26 furniture: the image and a copy with a change too small to see.
  const same = zoomPair(root, [changed(picture, 0, 0), changed(picture, TINY, 20)], ['the image', 'a tiny change on every pixel'])
  const equal = label(root, '=', 960, SAME.y - 56, 'symbol', 100)
  const toUs = label(root, 'To us: the same', 960, SAME.y + 40, 'tag', 300)
  const unequal = label(root, '≠', 960, SAME.y - 56, 'symbol', 100)
  const toModel = label(root, 'To the model: different numbers', 960, SAME.y + 40, 'tag', 300)
  const beat26Items = [...same.frames, ...same.labels, equal, toUs, unequal, toModel]

  // ---- Beat 27 furniture: the compressor, the latent and the decompressor.
  const original = shot(root, changed(picture, 0, 0), IMAGE.left, Y, IMAGE.size)
  const originalLabel = label(root, '512 × 512 × 3', IMAGE.left, Y + IMAGE.size / 2 + 20)
  const encoder = stroke(lines, funnel(ENCODER.x1, ENCODER.x2))
  const encoderLabel = label(root, 'Compressor', (ENCODER.x1 + ENCODER.x2) / 2, Y - 12, 'tag', 260)
  const toLatent = arrow(lines, ENCODER.x2 + 20, LATENT.x - LATENT.size / 2 - 24, Y)

  // The real latent of this image: its 16 channels as a 4x4 grid of grey
  // maps. Each keeps the layout of the picture, but none is a small copy of it.
  const small = new NoisyImage(assets.latent, 256, 800)
  small.grey = true
  const tile = shot(root, small.canvas, LATENT.x, Y, LATENT.size, 'pixelated')
  const latentLabel = label(root, '64 × 64 × 16', LATENT.x, Y + LATENT.size / 2 + 20)
  const latentNote = label(root, '12× fewer values', LATENT.x, Y + LATENT.size / 2 + 50, 'caption accent', 300)

  const toDecoder = arrow(lines, LATENT.x + LATENT.size / 2 + 24, DECODER.x1 - 20, Y)
  const decoder = stroke(lines, funnel(DECODER.x2, DECODER.x1))
  const decoderLabel = label(root, 'Decompressor', (DECODER.x1 + DECODER.x2) / 2, Y - 12, 'tag', 260)
  // The real decompressed image, not a copy of the original.
  const decoded = shot(root, changed(assets.decoded, 0, 0), IMAGE.right, Y, IMAGE.size)
  const decodedLabel = label(root, '512 × 512 × 3', IMAGE.right, Y + IMAGE.size / 2 + 20)

  // Training compares what comes back with the original, by how it looks.
  const top = Y - IMAGE.size / 2 - 16
  const compareArc = bend(lines, IMAGE.right, top, IMAGE.right, top - 60, IMAGE.left, top - 60, IMAGE.left, top + 2, 'hot')
  const compareLabel = label(root, 'Compare with the original: does it look the same?', 960, 846, 'tag', 900)
  const judged = label(root, 'Differences we cannot see cost almost nothing, so it learns to drop them', 960, 890, 'caption', 1200)
  const jpeg = label(root, 'A bit like a JPEG, but learned', 960, 936, 'tag', 700)
  const beat27Items = [original, originalLabel, encoder, encoderLabel, toLatent, tile, latentLabel, latentNote, toDecoder, decoder, decoderLabel, decoded, decodedLabel, compareArc, compareLabel, judged, jpeg]

  // ---- Beat 28 furniture: the same portrait with pixel noise and with latent noise.
  // The left one is the simple version from beat 6; the right one is the
  // model's real noisy input, decoded, as in every run in this talk.
  const pixelNoise = new NoisyImage(assets.portrait, 384, 4)
  pixelNoise.level = KINDS.level
  pixelNoise.render()
  const kinds = [pixelNoise.canvas, new NoisyImage(assets.noised[0], 384, 1).canvas].map((canvas, i) =>
    shot(root, canvas, i === 0 ? KINDS.leftX : KINDS.rightX, KINDS.y, KINDS.size),
  )
  const kindLabels = ['noise added to the pixels', 'noise added to the latent, then decoded'].map((text, i) =>
    label(root, text, i === 0 ? KINDS.leftX : KINDS.rightX, KINDS.y + KINDS.size / 2 + 16, 'caption', 560),
  )
  const kindTags = ['the simple version', 'what the model works with'].map((text, i) =>
    label(root, text, i === 0 ? KINDS.leftX : KINDS.rightX, KINDS.y + KINDS.size / 2 + 56, i === 0 ? 'caption' : 'tag', 560),
  )
  const allAlong = label(root, 'The noisy pictures from the model in this talk were noisy latents, decoded', 960, 900, 'caption', 1300)
  const beat28Items = [...kinds, ...kindLabels, ...kindTags, allAlong]

  // ---- Beat 25: two pictures, no labels. Can the audience spot the difference?
  const beat25 = gsap.timeline()
  wordsIn(beat25, spot, 0)
  same.frames.forEach((frame, i) => {
    beat25.fromTo(frame, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.3 + i * 0.6)
  })

  // ---- Beat 26: they look the same; zoom in, and their numbers do not.
  const beat26 = gsap.timeline()
  wordsOut(beat26, spot, 0)
  wordsIn(beat26, detail, 0.4)
  rise(beat26, same.labels, 0.5, 0.3)
  rise(beat26, [equal, toUs], 1.0, 0.1)
  zoomIn(beat26, same, 1.7)
  fade(beat26, [equal, toUs], 2.2)
  rise(beat26, [unequal, toModel], 4.8, 0.1)

  // ---- Beat 27: train a compressor and a decompressor, judged on how the result looks.
  const beat27 = gsap.timeline()
  wordsIn(beat27, trained, 0)
  beat27.fromTo(original, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: 'power3.out' }, 0.3)
  rise(beat27, originalLabel, 0.7)
  draw(beat27, encoder, 0.8, 0.6)
  rise(beat27, encoderLabel, 1.1)
  draw(beat27, toLatent, 1.3, 0.3)
  beat27.fromTo(tile, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 1.4)
  rise(beat27, [latentLabel, latentNote], 1.9, 0.1)
  draw(beat27, toDecoder, 2.2, 0.3)
  draw(beat27, decoder, 2.3, 0.6)
  rise(beat27, decoderLabel, 2.6)
  beat27.fromTo(decoded, { clipPath: 'inset(0% 100% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: 'power3.out' }, 2.8)
  rise(beat27, decodedLabel, 3.2)
  draw(beat27, compareArc, 3.6, 0.8)
  rise(beat27, compareLabel, 3.9)
  rise(beat27, judged, 4.8)
  rise(beat27, jpeg, 5.6)
  // Everything above waits until beat 26 has cleared.
  beat27.shiftChildren(0.4)
  wordsOut(beat27, detail, 0)
  fade(beat27, beat26Items, 0)

  // ---- Beat 28: the noise goes into the latent, not into the pixels.
  const beat28 = gsap.timeline()
  wordsOut(beat28, trained, 0)
  fade(beat28, beat27Items, 0)
  wordsIn(beat28, inLatent, 0.4)
  kinds.forEach((frame, i) => {
    beat28.fromTo(frame, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.6 + i * 1.2)
    rise(beat28, [kindLabels[i], kindTags[i]], 0.9 + i * 1.2, 0.15)
  })
  rise(beat28, allAlong, 3.0)

  return [beat25, beat26, beat27, beat28]
}
