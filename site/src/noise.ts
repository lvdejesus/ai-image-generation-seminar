// Noise primitives: seeded random numbers, real Gaussian noising of an
// image, and flickering static.

/** Small seeded generator, so every reload shows the same noise. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `n` samples from a standard normal distribution (Box-Muller). */
export function gaussian(n: number, seed: number) {
  const random = seeded(seed)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i += 2) {
    const r = Math.sqrt(-2 * Math.log(1 - random()))
    const theta = 2 * Math.PI * random()
    out[i] = r * Math.cos(theta)
    if (i + 1 < n) out[i + 1] = r * Math.sin(theta)
  }
  return out
}

/** Read a drawable into RGB floats in [-1, 1], the range the noise is defined in. */
function toFloats(ctx: CanvasRenderingContext2D, source: CanvasImageSource, size: number) {
  ctx.drawImage(source, 0, 0, size, size)
  const pixels = ctx.getImageData(0, 0, size, size).data
  const out = new Float32Array(size * size * 3)
  for (let i = 0, j = 0; i < pixels.length; i += 4, j += 3) {
    out[j] = pixels[i] / 127.5 - 1
    out[j + 1] = pixels[i + 1] / 127.5 - 1
    out[j + 2] = pixels[i + 2] / 127.5 - 1
  }
  return out
}

/**
 * An image, or a sequence of images, with Gaussian noise mixed in.
 *
 * `level` runs from 0 (clean) to 1 (pure noise) along a variance-preserving
 * path, as in diffusion models:
 *   out = cos(level * 90deg) * image + sin(level * 90deg) * noise.
 * `frame` picks the image from the sequence, blending between neighbours
 * for fractional values.
 */
export class NoisyImage {
  readonly canvas = document.createElement('canvas')
  level = 0
  frame = 0
  /** Use the same noise for all three colours, for greyscale pictures. */
  grey = false

  private ctx: CanvasRenderingContext2D
  private frames: Float32Array[] = []
  private noise: Float32Array
  private out: ImageData
  private drawn = ''

  constructor(source: CanvasImageSource | CanvasImageSource[], private size: number, seed: number) {
    this.canvas.width = this.canvas.height = size
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
    this.noise = gaussian(size * size * 3, seed)
    this.out = this.ctx.createImageData(size, size)
    this.out.data.fill(255)
    this.setFrames(Array.isArray(source) ? source : [source])
  }

  /** Replace the image sequence. With no images the canvas shows pure noise. */
  setFrames(sources: CanvasImageSource[]) {
    this.frames = sources.map((source) => toFloats(this.ctx, source, this.size))
    this.drawn = ''
    this.render()
  }

  render = () => {
    const key = `${this.level}|${this.frame}|${this.grey}`
    if (key === this.drawn) return
    this.drawn = key

    const last = this.frames.length - 1
    const position = Math.max(0, Math.min(last, this.frame))
    const first = this.frames[Math.floor(position)]
    const second = this.frames[Math.min(last, Math.floor(position) + 1)]
    const blend = position - Math.floor(position)

    const a = first ? Math.cos((this.level * Math.PI) / 2) : 0
    const b = first ? Math.sin((this.level * Math.PI) / 2) : 1
    const noise = this.noise
    const data = this.out.data
    for (let i = 0, j = 0; j < noise.length; i += 4, j += 3) {
      for (let c = 0; c < 3; c++) {
        const image = first ? first[j + c] + (second[j + c] - first[j + c]) * blend : 0
        data[i + c] = (a * image + b * noise[this.grey ? j : j + c]) * 127.5 + 127.5
      }
    }
    this.ctx.putImageData(this.out, 0, 0)
  }
}

/**
 * A picture of noise itself. `mix` blends between two noise samples, from
 * the first (0) to the second (1), so a wrong prediction can settle into
 * the true noise. With `difference` set, the picture shows how far the
 * blend is from the first sample instead: bright where they differ, black
 * where they agree.
 */
export class NoiseField {
  readonly canvas = document.createElement('canvas')
  mix = 0

  private ctx: CanvasRenderingContext2D
  private first: Float32Array
  private second: Float32Array
  private out: ImageData
  private drawn = -1

  constructor(size: number, seed: number, otherSeed: number, private difference = false) {
    this.canvas.width = this.canvas.height = size
    this.ctx = this.canvas.getContext('2d')!
    this.first = gaussian(size * size * 3, seed)
    this.second = gaussian(size * size * 3, otherSeed)
    this.out = this.ctx.createImageData(size, size)
    this.out.data.fill(255)
    this.render()
  }

  render = () => {
    if (this.mix === this.drawn) return
    this.drawn = this.mix
    const a = Math.cos((this.mix * Math.PI) / 2)
    const b = Math.sin((this.mix * Math.PI) / 2)
    const { first, second } = this
    const data = this.out.data
    for (let i = 0, j = 0; j < first.length; i += 4, j += 3) {
      for (let c = 0; c < 3; c++) {
        const value = a * first[j + c] + b * second[j + c]
        // The difference is brightened a little, so a small one still shows.
        data[i + c] = this.difference ? Math.abs(value - first[j + c]) * 190 : value * 127.5 + 127.5
      }
    }
    this.ctx.putImageData(this.out, 0, 0)
  }
}

/** Grey television static that changes on every draw. */
export class Static {
  readonly canvas = document.createElement('canvas')
  private ctx: CanvasRenderingContext2D
  private out: ImageData

  constructor(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')!
    this.out = this.ctx.createImageData(width, height)
    this.out.data.fill(255)
    this.draw()
  }

  draw = () => {
    const data = this.out.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + 1] = data[i + 2] = Math.random() * 210
    }
    this.ctx.putImageData(this.out, 0, 0)
  }
}

/**
 * Static that resolves into a word. `reveal` runs from 0 (all static) to
 * 1 (the word). The static is made of `block`-sized cells, and each cell
 * settles at its own random moment into the crisp word underneath.
 */
export class WordStatic {
  readonly canvas = document.createElement('canvas')
  reveal = 0

  private ctx: CanvasRenderingContext2D
  private out: ImageData
  private mask: Uint8ClampedArray
  private settleAt: Float32Array
  private columns: number
  private rows: number
  private finished = false

  constructor(width: number, height: number, private block: number, text: string, font: string) {
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!

    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, width, height)
    this.ctx.fillStyle = '#fff'
    this.ctx.font = font
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(text, width / 2, height / 2)
    const pixels = this.ctx.getImageData(0, 0, width, height).data
    this.mask = new Uint8ClampedArray(width * height)
    for (let p = 0; p < this.mask.length; p++) this.mask[p] = pixels[p * 4]

    this.columns = Math.ceil(width / block)
    this.rows = Math.ceil(height / block)
    this.settleAt = new Float32Array(this.columns * this.rows)
    const random = seeded(7)
    for (let c = 0; c < this.settleAt.length; c++) this.settleAt[c] = random()

    this.out = this.ctx.createImageData(width, height)
    this.out.data.fill(255)
    this.draw()
  }

  draw = () => {
    // Once every cell has settled there is nothing left to flicker.
    if (this.finished && this.reveal >= 1) return
    this.finished = this.reveal >= 1

    const { mask, settleAt, reveal, block, columns, rows } = this
    const { width, height } = this.canvas
    const data = this.out.data
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const settled = settleAt[row * columns + column] < reveal
        const grey = Math.random() * 210
        const right = Math.min((column + 1) * block, width)
        const bottom = Math.min((row + 1) * block, height)
        for (let y = row * block; y < bottom; y++) {
          for (let p = y * width + column * block; p < y * width + right; p++) {
            const i = p * 4
            if (settled) {
              // Background (11, 12, 15) blended towards ink (243, 240, 233).
              const m = mask[p] / 255
              data[i] = 11 + 232 * m
              data[i + 1] = 12 + 228 * m
              data[i + 2] = 15 + 218 * m
            } else {
              data[i] = data[i + 1] = data[i + 2] = grey
            }
          }
        }
      }
    }
    this.ctx.putImageData(this.out, 0, 0)
  }
}
