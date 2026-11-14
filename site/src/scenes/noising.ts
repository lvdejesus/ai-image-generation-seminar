// Section II, beats 5-7: an image as numbers (red, green and blue for each
// pixel), noise as random numbers added to them, and the levels of noise
// from the original to almost pure noise.
//
// The noisy frames are the model's own noisy input at each level, recorded
// by tools/assets.py and shown as they are.
import gsap from 'gsap'
import { assets, el, fade, headline, label, place, rise, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { gaussian, NoisyImage } from '../noise'

// The strip: the original, then five noised frames. PERCENT is the share of
// noise in each (the schedule's sigma at NOISED_AT in tools/assets.py).
const PERCENT = [0, 32, 56, 72, 86, 96]
const SLOT = 252
const PITCH = 292
const X = 104
const Y = 440

// Beats 5 and 6: the portrait, its numbers plus noise, and the noisy portrait, in a row.
// Each cell holds a pixel's red, green and blue values, one per line.
const PAIR = { y: 420, size: 300, noisyX: 1516 }
const NUMBERS = { x: 484, y: 456, columns: 4, rows: 3, cell: { w: 68, h: 70 }, pitch: 360 }
// The patch that pixelNumbers reads, on the 24x24 copy of the portrait.
const PATCH = { x: 10, y: 7, of: 24 }

/** A small 4x3 grid of pixels, each cell its red, green and blue values, optionally tinted with a colour. */
function numberGrid(values: string[][], colours?: string[]) {
  const grid = el('div', colours ? 'number-grid' : 'number-grid plain')
  grid.style.gridTemplateColumns = `repeat(${NUMBERS.columns}, ${NUMBERS.cell.w}px)`
  grid.style.gridAutoRows = `${NUMBERS.cell.h}px`
  values.forEach((rgb, i) => {
    const cell = el('span')
    rgb.forEach((value, c) => cell.append(el('span', ['r', 'g', 'b'][c], value)))
    if (colours) {
      cell.style.background = colours[i]
      // Dark text on light cells, light text on dark ones.
      const [r, g, b] = rgb.map(Number)
      cell.style.color = 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#0b0c0f' : '#f3f0e9'
    }
    grid.append(cell)
  })
  return grid
}

/** A patch of the portrait's real pixels, their noise, and the sum: three grids of numbers. */
function pixelNumbers() {
  const canvas = el('canvas')
  canvas.width = canvas.height = PATCH.of
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(assets.portrait, 0, 0, PATCH.of, PATCH.of)
  // A patch across the face and collar, where the values vary.
  const pixels = ctx.getImageData(PATCH.x, PATCH.y, NUMBERS.columns, NUMBERS.rows).data
  const count = NUMBERS.columns * NUMBERS.rows
  // One random number for each red, green and blue value.
  const noise = gaussian(count * 3, 4)
  const image = { values: [] as string[][], colours: [] as string[] }
  const added = [] as string[][]
  const noisy = { values: [] as string[][], colours: [] as string[] }
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n).replace('-', '−'))
  for (let i = 0; i < count; i++) {
    const rgb = [pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]]
    const n = [0, 1, 2].map((c) => Math.round(noise[i * 3 + c] * 45))
    const sum = rgb.map((v, c) => clamp(v + n[c]))
    image.values.push(rgb.map(String))
    image.colours.push(`rgb(${rgb.join(', ')})`)
    added.push(n.map(signed))
    noisy.values.push(sum.map(String))
    noisy.colours.push(`rgb(${sum.join(', ')})`)
  }
  return [numberGrid(image.values, image.colours), numberGrid(added), numberGrid(noisy.values, noisy.colours)]
}

export function noising(root: HTMLElement) {
  const numbers = headline(root, title('5'))
  const noiseTitle = headline(root, title('6'))
  const levelsTitle = headline(root, title('7'))

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
  const gridLabels = ['the image: red, green, blue', 'noise: random numbers', 'the sum'].map((text, i) => {
    const caption = place(el('span', 'caption left', text), NUMBERS.x + i * NUMBERS.pitch, NUMBERS.y + NUMBERS.rows * NUMBERS.cell.h + 12, 350)
    root.append(caption)
    return caption
  })
  const gridSigns = ['+', '='].map((sign, i) => label(root, sign, NUMBERS.x + i * NUMBERS.pitch + (width + NUMBERS.pitch) / 2, NUMBERS.y + (NUMBERS.rows * NUMBERS.cell.h) / 2 - 18, 'symbol small', 80))

  // Where the numbers come from, marked on the portrait.
  const cell = SLOT / PATCH.of
  const patch = place(el('div', 'patch'), PATCH.x * cell, PATCH.y * cell, NUMBERS.columns * cell, NUMBERS.rows * cell)
  frames[0].el.append(patch)

  // In beats 5 and 6 the first two frames of the strip stand larger, at either end of the sum.
  const pairCaptions = [
    label(root, 'the image', X + PAIR.size / 2, PAIR.y + PAIR.size + 20),
    label(root, 'the noisy image', PAIR.noisyX + PAIR.size / 2, PAIR.y + PAIR.size + 20),
  ]
  const scale = PAIR.size / SLOT
  gsap.set(frames[0].el, { transformOrigin: '0 0', x: 0, y: PAIR.y - Y, scale })
  gsap.set(frames[1].el, { transformOrigin: '0 0', x: PAIR.noisyX - (X + PITCH), y: PAIR.y - Y, scale })

  // ---- Beat 5: the portrait, and a patch of it as numbers.
  const beat5 = gsap.timeline()
  wordsIn(beat5, numbers, 0)
  beat5.fromTo(frames[0].el, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.out' }, 0.3)
  rise(beat5, pairCaptions[0], 0.8)
  beat5.fromTo(patch, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 1.1)
  rise(beat5, [grids[0], gridLabels[0]], 1.4)

  // ---- Beat 6: random numbers added to them; the sum is the noisy portrait.
  const beat6 = gsap.timeline()
  wordsOut(beat6, numbers, 0)
  wordsIn(beat6, noiseTitle, 0.4)
  rise(beat6, [gridSigns[0], grids[1], gridLabels[1]], 0.8, 0.08)
  rise(beat6, [gridSigns[1], grids[2], gridLabels[2]], 1.5, 0.08)
  // The sum turns back into a picture: the portrait, gaining the noise.
  beat6
    .fromTo(frames[1].el, { clipPath: 'inset(0% 0% 0% 100% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.6, ease: 'power3.out' }, 2.1)
    .to(frames[1].image, { frame: 1, duration: 0.8, ease: 'power1.out', onUpdate: frames[1].image.render }, 2.5)
  rise(beat6, pairCaptions[1], 2.5)

  // ---- Beat 7: the two frames take their places in the strip; more noise follows.
  const beat7 = gsap.timeline()
  wordsOut(beat7, noiseTitle, 0)
  wordsIn(beat7, levelsTitle, 0.4)
  fade(beat7, [patch, ...grids, ...gridLabels, ...gridSigns, ...pairCaptions], 0)
  beat7
    .to([frames[0].el, frames[1].el], { x: 0, y: 0, scale: 1, duration: 0.9, ease: 'power3.inOut' }, 0.2)
    .fromTo(captions.slice(0, 2), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.0)
    .fromTo(axis, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 1.6, ease: 'none' }, 1.1)
    .fromTo(axisLabel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.1)

  frames.slice(2).forEach(({ el: frame, image }, k) => {
    const at = 1.3 + k * 0.34
    beat7
      .fromTo(frame, { x: -PITCH, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, at)
      .to(image, { frame: 1, duration: 0.6, ease: 'power1.out', onUpdate: image.render }, at)
      .fromTo(captions[k + 2], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at + 0.3)
  })

  return [beat5, beat6, beat7]
}
