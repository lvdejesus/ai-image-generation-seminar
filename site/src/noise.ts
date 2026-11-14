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
 * The model's guess of the clean image, during training. `wrong` blends
 * from a soft copy of the image (0) to unrelated noise (1): an untrained
 * model guesses nonsense, and a trained one guesses a soft version of the
 * original, since from heavy noise the details cannot be known. `frame`
 * picks the image from the sequence. With `difference` set, the picture
 * shows how far the guess is from the sharp original instead: bright where
 * they differ, black where they agree.
 */
export class Guess {
  readonly canvas = document.createElement('canvas')
  wrong = 1
  frame = 0

  private ctx: CanvasRenderingContext2D
  private sharp: Float32Array[]
  private soft: Float32Array[]
  private noise: Float32Array
  private out: ImageData
  private drawn = ''

  constructor(sources: CanvasImageSource[], size: number, seed: number, private difference = false) {
    this.canvas.width = this.canvas.height = size
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
    // Drawn small and scaled back up, the image loses its fine detail.
    const small = document.createElement('canvas')
    small.width = small.height = Math.round(size / 10)
    const smallCtx = small.getContext('2d')!
    this.soft = sources.map((source) => {
      smallCtx.drawImage(source, 0, 0, small.width, small.height)
      return toFloats(this.ctx, small, size)
    })
    this.sharp = sources.map((source) => toFloats(this.ctx, source, size))
    this.noise = gaussian(size * size * 3, seed)
    this.out = this.ctx.createImageData(size, size)
    this.out.data.fill(255)
    this.render()
  }

  render = () => {
    const key = `${this.wrong}|${this.frame}`
    if (key === this.drawn) return
    this.drawn = key

    const last = this.sharp.length - 1
    const position = Math.max(0, Math.min(last, this.frame))
    const k = Math.floor(position)
    const next = Math.min(last, k + 1)
    const blend = position - k
    const { noise, wrong } = this
    const data = this.out.data
    for (let i = 0, j = 0; j < noise.length; i += 4, j += 3) {
      for (let c = 0; c < 3; c++) {
        const soft = this.soft[k][j + c] + (this.soft[next][j + c] - this.soft[k][j + c]) * blend
        const guess = (1 - wrong) * soft + wrong * 0.6 * noise[j + c]
        if (this.difference) {
          const sharp = this.sharp[k][j + c] + (this.sharp[next][j + c] - this.sharp[k][j + c]) * blend
          // The difference is brightened a little, so a small one still shows.
          data[i + c] = Math.abs(guess - sharp) * 190
        } else {
          data[i + c] = guess * 127.5 + 127.5
        }
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
