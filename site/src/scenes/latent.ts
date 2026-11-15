// Section V, beats 29-32: two pictures to tell apart; pixels are full of
// detail we cannot see, so a compressor and a decompressor are trained to keep
// only what we see; what comes back is not exact, and the noise goes into the
// latent.
// Beat 33, the denoising in the latent, is a step of the diagram in spine.ts.
import './latent.css'
import gsap from 'gsap'
import { arrow, assets, bend, draw, el, fade, gear, headline, hold, label, line, overlay, place, rise, shot, stroke, wordsIn, wordsOut, type Timeline } from '../kit'
import { title } from '../beats'
import { gaussian, NoisyImage } from '../noise'

/** Beat 31: the centre line of the compressor diagram. */
const Y = 590

// Beats 29 and 30: the lighthouse and a copy with a change too small to see on
// every pixel. Both zoom into the same patch, until its pixels show their numbers.
const SAME = { leftX: 540, rightX: 1380, y: 600, size: 520 }
/** Size of the change: the standard deviation, in brightness levels out of 255. */
const TINY = 4
/** The top-left pixel of the patch, on the 512-pixel canvases, and its width in pixels. */
const SPOT = { x: 315, y: 200, side: 4 }
const SIDE = 512
const IMAGE = { left: 304, right: 1616, size: 400 }
const LATENT = { x: 960, size: 200 }
const ENCODER = { x1: 544, x2: 724 }
const DECODER = { x1: 1196, x2: 1376 }
/** Beat 32: noise added to the pixels, next to noise added to the latent and decoded. */
const KINDS = { leftX: 560, rightX: 1360, y: 560, size: 440, level: 0.35 }
/** Beat 32: the size of the first picture while it is alone in the centre. */
const ALONE = 500

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

const patch = (picture: HTMLCanvasElement) => picture.getContext('2d')!.getImageData(SPOT.x, SPOT.y, SPOT.side, SPOT.side).data

/**
 * The red, green and blue values of each pixel in the patch, laid out to sit
 * on the zoomed pixels. With `other`, each value that differs from the same
 * value in `other` gets the class "diff", so it can be marked.
 */
function rgbValues(picture: HTMLCanvasElement, other?: HTMLCanvasElement) {
  const pixels = patch(picture)
  const theirs = other ? patch(other) : pixels
  const grid = el('div', 'rgb-grid')
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]
    const cell = el('span')
    ;['R', 'G', 'B'].forEach((name, c) => {
      cell.append(el('div', theirs[i + c] !== pixels[i + c] ? 'value diff' : 'value', `${name} ${pixels[i + c]}`))
    })
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
    // The second picture's values are compared with the first one's.
    const grid = place(rgbValues(canvas, i === 1 ? pictures[0] : undefined), 0, 0, SAME.size, SAME.size)
    frames[i].append(grid)
    return grid
  })
  const diffs = Array.from(values[1].querySelectorAll<HTMLElement>('.diff'))
  return { zooms, frames, labels, values, diffs }
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
  root.classList.add('latent')
  const spot = headline(root, title('29'))
  // This headline is long, so it may use the full stage width.
  const detail = headline(root, title('30'), 1712)
  const trained = headline(root, title('31'))
  const inLatent = headline(root, title('32'))
  const lines = overlay(root)
  const picture = assets.three.lighthouse[6]

  // ---- Beat 30 furniture: the image and a copy with a change too small to see.
  // The verdict sits in one line under the pictures. The sign sits between them.
  const same = zoomPair(root, [changed(picture, 0, 0), changed(picture, TINY, 20)], ['the image', 'a tiny change on every pixel'])
  same.labels.forEach((node) => (node.style.width = '760px'))
  same.labels.forEach((node, i) => (node.style.left = `${(i === 0 ? SAME.leftX : SAME.rightX) - 380}px`))
  const equal = label(root, '=', 960, SAME.y - 56, 'symbol', 100)
  const unequal = label(root, '≠', 960, SAME.y - 56, 'symbol', 100)
  const beat27Items = [...same.frames, ...same.labels, equal, unequal]

  // ---- Beat 31 furniture: the compressor, the latent and the decompressor.
  const original = shot(root, changed(picture, 0, 0), IMAGE.left, Y, IMAGE.size)
  const originalLabel = label(root, '512 × 512 × 3', IMAGE.left, Y + IMAGE.size / 2 + 20)
  const encoder = stroke(lines, funnel(ENCODER.x1, ENCODER.x2))
  const encoderLabel = label(root, 'Compressor', (ENCODER.x1 + ENCODER.x2) / 2, Y + 174, 'tag', 300)
  const toLatent = arrow(lines, ENCODER.x2 + 20, LATENT.x - LATENT.size / 2 - 24, Y)

  // The real latent of this image: its 16 channels as a 4x4 grid of grey
  // maps. Each keeps the layout of the picture, but none is a small copy of it.
  const small = new NoisyImage(assets.latent, 256, 800)
  small.grey = true
  const tile = shot(root, small.canvas, LATENT.x, Y, LATENT.size, 'pixelated')
  const latentLabel = label(root, '64 × 64 × 16', LATENT.x, Y + LATENT.size / 2 + 20)
  const latentNote = label(root, '12× fewer values', LATENT.x, Y + LATENT.size / 2 + 62, 'caption accent', 360)
  // After training: the compressed form gets its name, with an arrow up to it.
  const toName = line(lines, LATENT.x, 890, LATENT.x, 806, 'hot')
  const latentName = label(root, 'the latent', LATENT.x, 904, 'tag', 360)

  const toDecoder = arrow(lines, LATENT.x + LATENT.size / 2 + 24, DECODER.x1 - 20, Y)
  const decoder = stroke(lines, funnel(DECODER.x2, DECODER.x1))
  const decoderLabel = label(root, 'Decompressor', (DECODER.x1 + DECODER.x2) / 2, Y + 174, 'tag', 300)
  // The real decompressed image, not a copy of the original. Before training
  // the two halves give back only noise (an illustration); the image clears
  // while the gears turn.
  const decodedPicture = new NoisyImage(changed(assets.decoded, 0, 0), 384, 5)
  decodedPicture.level = 1
  decodedPicture.render()
  const decoded = shot(root, decodedPicture.canvas, IMAGE.right, Y, IMAGE.size)
  // A gear on the top corner of each funnel, as on the model in training.
  const gears = [gear(lines, (ENCODER.x1 + ENCODER.x2) / 2, Y - 175), gear(lines, (DECODER.x1 + DECODER.x2) / 2, Y - 175)]
  const decodedLabel = label(root, '512 × 512 × 3', IMAGE.right, Y + IMAGE.size / 2 + 20)

  // Training compares what comes back with the original, by how it looks.
  // The question sits under the top of the arc.
  const top = Y - IMAGE.size / 2 - 16
  const compareArc = bend(lines, IMAGE.right, top, IMAGE.right, top - 90, IMAGE.left, top - 90, IMAGE.left, top + 2, 'hot')
  const compareLabel = label(root, 'Does it look the same?', 960, top - 44, 'tag', 900)
  const beat28Items = [...gears, original, originalLabel, encoder, encoderLabel, toLatent, tile, latentLabel, latentNote, toDecoder, decoder, decoderLabel, decoded, decodedLabel, compareArc, compareLabel, toName, latentName]

  // ---- Beat 32 furniture: the same portrait with pixel noise and with latent noise.
  // The left one is the simple version from beat 8; the right one is the
  // model's real noisy input, decoded, as in every run in this talk.
  const pixelNoise = new NoisyImage(assets.portrait, 384, 4)
  pixelNoise.level = KINDS.level
  pixelNoise.render()
  const kinds = [pixelNoise.canvas, new NoisyImage(assets.noised[0], 384, 1).canvas].map((canvas, i) =>
    shot(root, canvas, i === 0 ? KINDS.leftX : KINDS.rightX, KINDS.y, KINDS.size),
  )
  const kindLabels = ['noise added to the pixels', 'noise added to the latent, then decoded'].map((text, i) =>
    label(root, text, i === 0 ? KINDS.leftX : KINDS.rightX, KINDS.y + KINDS.size / 2 + 16, 'caption', 760),
  )
  const modelTag = label(root, 'What the model works with', KINDS.rightX, KINDS.y + KINDS.size / 2 + 62, 'tag', 760)
  const beat29Items = [...kinds, ...kindLabels, modelTag]

  // ---- Beat 29: two pictures, no labels. Can the audience spot the difference?
  const beat29 = gsap.timeline()
  wordsIn(beat29, spot, 0)
  same.frames.forEach((frame, i) => {
    beat29.fromTo(frame, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.3 + i * 0.6)
  })

  // ---- Beat 30: they look the same; zoom in, and their numbers do not.
  // First the labels and "to us: the same". Stop. Then the zoom and the numbers.
  const beat30 = gsap.timeline()
  wordsOut(beat30, spot, 0)
  wordsIn(beat30, detail, 0.4)
  rise(beat30, same.labels, 0.5, 0.3)
  rise(beat30, equal, 1.0)
  hold(beat30, 1.6)
  fade(beat30, equal, 1.7)
  zoomIn(beat30, same, 1.7)
  rise(beat30, unequal, 4.6)
  // Mark every value of the changed picture that differs from the image.
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5b3f9e'
  beat30.fromTo(same.diffs, { backgroundColor: 'rgba(0, 0, 0, 0)', color: 'inherit' }, { backgroundColor: accent, color: '#ffffff', duration: 0.3, stagger: 0.02 }, 4.8)

  // ---- Beat 31: train a compressor and a decompressor, judged on how the result looks.
  // The image goes into the compressor and becomes the latent, the decompressor
  // gives the image back, then the two are compared.
  const beat31 = gsap.timeline()
  wordsOut(beat31, detail, 0)
  fade(beat31, beat27Items, 0)
  const t = 0.4
  wordsIn(beat31, trained, t)
  // The image comes in large in the centre, then moves aside for the diagram.
  const shift = 960 - IMAGE.left
  beat31.fromTo(original, { autoAlpha: 0, x: shift, scale: 1.25 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, t + 0.3)
  beat31.fromTo(originalLabel, { autoAlpha: 0, x: shift, y: 50 }, { autoAlpha: 1, duration: 0.5 }, t + 0.5)
  beat31.to(original, { x: 0, scale: 1, duration: 0.8, ease: 'power3.inOut' }, t + 1.3)
  beat31.to(originalLabel, { x: 0, y: 0, duration: 0.8, ease: 'power3.inOut' }, t + 1.3)
  draw(beat31, encoder, t + 1.9, 0.6)
  rise(beat31, encoderLabel, t + 2.2)
  draw(beat31, toLatent, t + 2.4, 0.3)
  beat31.fromTo(tile, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, t + 2.6)
  rise(beat31, [latentLabel, latentNote], t + 3.1, 0.3)
  draw(beat31, toDecoder, t + 4.0, 0.3)
  draw(beat31, decoder, t + 4.2, 0.6)
  rise(beat31, decoderLabel, t + 4.5)
  beat31.fromTo(decoded, { clipPath: 'inset(0% 100% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: 'power3.out' }, t + 4.7)
  rise(beat31, decodedLabel, t + 5.1)
  draw(beat31, compareArc, t + 6.0, 0.8)
  rise(beat31, compareLabel, t + 6.5)
  // Training: both gears turn, and what comes back clears into the image.
  beat31.fromTo(gears, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, t + 7.1)
  beat31.fromTo(gears, { rotation: 0 }, { rotation: (i) => (i === 0 ? 720 : -720), duration: 4.5, ease: 'none', immediateRender: false }, t + 7.4)
  beat31.fromTo(decodedPicture, { level: 1 }, { level: 0, duration: 4.5, ease: 'power2.in', onUpdate: decodedPicture.render, immediateRender: false }, t + 7.4)
  // The compressed form is the latent.
  draw(beat31, toName, t + 12.2, 0.4)
  rise(beat31, latentName, t + 12.5)

  // ---- Beat 32: the noise goes into the latent, not into the pixels.
  // Pixel noise, large and alone; then it moves aside for latent noise.
  const beat32 = gsap.timeline()
  wordsOut(beat32, trained, 0)
  fade(beat32, beat28Items, 0)
  wordsIn(beat32, inLatent, 0.4)
  const centre = 960 - KINDS.leftX
  const grow = ALONE / KINDS.size
  // Alone, the picture also sits a little lower, clear of the headline.
  const lower = 30
  const drop = (ALONE - KINDS.size) / 2 + lower
  beat32.fromTo(kinds[0], { autoAlpha: 0, x: centre, y: lower, scale: grow * 0.85 }, { autoAlpha: 1, scale: grow, duration: 0.5, ease: 'back.out(1.6)' }, 0.6)
  beat32.fromTo(kindLabels[0], { autoAlpha: 0, x: centre, y: drop + 24 }, { autoAlpha: 1, y: drop, duration: 0.5, ease: 'power3.out' }, 0.9)
  beat32.to(kinds[0], { x: 0, y: 0, scale: 1, duration: 0.8, ease: 'power3.inOut' }, 1.6)
  beat32.to(kindLabels[0], { x: 0, y: 0, duration: 0.8, ease: 'power3.inOut' }, 1.6)
  beat32.fromTo(kinds[1], { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.3)
  rise(beat32, [kindLabels[1], modelTag], 2.6, 0.3)

  return [beat29, beat30, beat31, beat32]
}
