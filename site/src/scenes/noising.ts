// Section II, beat 4: noising an image step by step.
//
// The noisy frames are the model's own noisy input at each level, recorded
// by tools/assets.py and shown as they are.
import gsap from 'gsap'
import { assets, el, headline, label, place, rise, wordsIn } from '../kit'
import { title } from '../beats'
import { gaussian, NoisyImage } from '../noise'

// The strip: the original, then five noised frames. PERCENT is the share of
// noise in each (the schedule's sigma at NOISED_AT in tools/assets.py).
const PERCENT = [0, 32, 56, 72, 86, 96]
const SLOT = 252
const PITCH = 292
const X = 104
const Y = 440

// Beat 4, under the strip: the same thing in numbers.
const NUMBERS = { x: 104, y: 836, columns: 4, rows: 3, cell: { w: 66, h: 36 }, pitch: 360 }

/** A small grid of numbers, each cell optionally tinted with a colour. */
function numberGrid(values: string[], colours?: string[]) {
  const grid = el('div', colours ? 'number-grid' : 'number-grid plain')
  grid.style.gridTemplateColumns = `repeat(${NUMBERS.columns}, ${NUMBERS.cell.w}px)`
  grid.style.gridAutoRows = `${NUMBERS.cell.h}px`
  values.forEach((value, i) => {
    const cell = el('span', '', value)
    if (colours) {
      cell.style.background = colours[i]
      // Dark text on light cells, light text on dark ones.
      cell.style.color = Number(value) > 140 ? '#0b0c0f' : '#f3f0e9'
    }
    grid.append(cell)
  })
  return grid
}

/** A patch of the portrait's real pixels, their noise, and the sum: three grids of numbers. */
function pixelNumbers() {
  const canvas = el('canvas')
  canvas.width = canvas.height = 24
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(assets.portrait, 0, 0, 24, 24)
  // A patch across the face and collar, where the values vary.
  const pixels = ctx.getImageData(10, 7, NUMBERS.columns, NUMBERS.rows).data
  const noise = gaussian(NUMBERS.columns * NUMBERS.rows, 4)
  const image = { values: [] as string[], colours: [] as string[] }
  const added = [] as string[]
  const noisy = { values: [] as string[], colours: [] as string[] }
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  for (let i = 0; i < noise.length; i++) {
    const [r, g, b] = [pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]]
    const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    const n = Math.round(noise[i] * 45)
    image.values.push(String(brightness))
    image.colours.push(`rgb(${r}, ${g}, ${b})`)
    added.push(n > 0 ? `+${n}` : String(n).replace('-', '−'))
    noisy.values.push(String(clamp(brightness + n)))
    noisy.colours.push(`rgb(${clamp(r + n)}, ${clamp(g + n)}, ${clamp(b + n)})`)
  }
  return [numberGrid(image.values, image.colours), numberGrid(added), numberGrid(noisy.values, noisy.colours)]
}

export function noising(root: HTMLElement) {
  const adding = headline(root, title('4'))

  const levels = [assets.portrait, ...assets.noised]
  const frames = levels.map((source, i) => {
    // Each frame starts as the one before it and gains its own noise as it slides out.
    const image = new NoisyImage(i === 0 ? source : [levels[i - 1], source], 384, 1)
    const frame = place(el('div', 'shot'), X + i * PITCH, Y, SLOT, SLOT)
    frame.style.zIndex = String(levels.length - i)
    frame.append(image.canvas)
    root.append(frame)
    return { el: frame, image }
  })

  const captions = PERCENT.map((percent, i) => {
    const caption = place(el('span', 'caption', i === 0 ? 'original' : `${percent}% noise`), X + i * PITCH, Y + SLOT + 20, SLOT)
    root.append(caption)
    return caption
  })

  const axis = place(el('div', 'axis'), X, Y + SLOT + 76, PITCH * (levels.length - 1) + SLOT, 2)
  const axisLabel = place(el('span', 'tag', 'More noise →'), X, Y + SLOT + 96)
  root.append(axis, axisLabel)

  // To a computer the picture is numbers, so noise is random numbers added.
  const width = NUMBERS.columns * NUMBERS.cell.w
  const grids = pixelNumbers().map((grid, i) => place(grid, NUMBERS.x + i * NUMBERS.pitch, NUMBERS.y))
  root.append(...grids)
  const gridLabels = ['the image, as numbers', 'noise: random numbers', 'the noisy image'].map((text, i) => {
    const caption = place(el('span', 'caption left', text), NUMBERS.x + i * NUMBERS.pitch, NUMBERS.y + NUMBERS.rows * NUMBERS.cell.h + 12, 350)
    root.append(caption)
    return caption
  })
  const gridSigns = ['+', '='].map((sign, i) => label(root, sign, NUMBERS.x + i * NUMBERS.pitch + (width + NUMBERS.pitch) / 2, NUMBERS.y + 18, 'symbol small', 80))

  // The original starts large in the middle, then takes its place in the strip.
  const centre = 960 - (X + SLOT / 2)
  gsap.set(frames[0].el, { x: centre, y: -30, scale: 1.7 })

  // The portrait, then one frame after another, each noisier; then the same in numbers.
  const beat4 = gsap.timeline()
  wordsIn(beat4, adding, 0)
  beat4
    .fromTo(frames[0].el, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.out' }, 0.3)
    .to(frames[0].el, { x: 0, y: 0, scale: 1, duration: 0.9, ease: 'power3.inOut' }, 1.2)
    .fromTo(captions[0], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.9)
    .fromTo(axis, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 1.9, ease: 'none' }, 2.1)
    .fromTo(axisLabel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 2.1)

  frames.slice(1).forEach(({ el: frame, image }, k) => {
    const at = 2.1 + k * 0.34
    beat4
      .fromTo(frame, { x: -PITCH, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, at)
      .to(image, { frame: 1, duration: 0.6, ease: 'power1.out', onUpdate: image.render }, at)
      .fromTo(captions[k + 1], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at + 0.3)
  })
  rise(beat4, [grids[0], gridLabels[0]], 4.0)
  rise(beat4, [gridSigns[0], grids[1], gridLabels[1]], 4.5, 0.08)
  rise(beat4, [gridSigns[1], grids[2], gridLabels[2]], 5.0, 0.08)

  return [beat4]
}
