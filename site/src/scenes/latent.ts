// Section IV, beats 19-20: the image is compressed into a small latent,
// and the denoising happens there.
import gsap from 'gsap'
import { arrow, assets, draw, fade, headline, label, overlay, rise, shot, stroke, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { NoisyImage } from '../noise'

const Y = 640
const IMAGE = { left: 300, right: 1620, size: 360 }
const LATENT = { x: 960, size: 200 }
const ENCODER = { x1: 520, x2: 700 }
const DECODER = { x1: 1220, x2: 1400 }

/** A trapezoid between two x positions: tall on the image side, short on the latent side. */
const funnel = (wide: number, narrow: number) => `M${wide} ${Y - 150} L${narrow} ${Y - 60} V${Y + 60} L${wide} ${Y + 150} Z`

export function latent(root: HTMLElement) {
  const compressed = headline(root, title('19'))
  const once = headline(root, title('20'))
  const lines = overlay(root)
  const picture = assets.three.lighthouse[6]

  const original = shot(root, new NoisyImage(picture, 384, 1).canvas, IMAGE.left, Y, IMAGE.size)
  const originalLabel = label(root, '512 × 512 × 3', IMAGE.left, Y + IMAGE.size / 2 + 20)
  const encoder = stroke(lines, funnel(ENCODER.x1, ENCODER.x2))
  const encoderLabel = label(root, 'Encoder', (ENCODER.x1 + ENCODER.x2) / 2, Y - 12, 'tag', 200)
  const toLatent = arrow(lines, ENCODER.x2 + 20, LATENT.x - LATENT.size / 2 - 24, Y)

  // The real latent of this image: its 16 channels as a 4x4 grid of grey
  // maps. Each keeps the layout of the picture, but none is a small copy of it.
  const small = new NoisyImage(assets.latent, 256, 800)
  small.grey = true
  const tile = shot(root, small.canvas, LATENT.x, Y, LATENT.size, 'pixelated')
  const latentLabel = label(root, '64 × 64 × 16', LATENT.x, Y + LATENT.size / 2 + 20)
  const latentNote = label(root, '16 grids of numbers', LATENT.x, Y + LATENT.size / 2 + 50, 'caption', 300)

  const toDecoder = arrow(lines, LATENT.x + LATENT.size / 2 + 24, DECODER.x1 - 20, Y)
  const decoder = stroke(lines, funnel(DECODER.x2, DECODER.x1))
  const decoderLabel = label(root, 'Decoder', (DECODER.x1 + DECODER.x2) / 2, Y - 12, 'tag', 200)
  const decoded = shot(root, new NoisyImage(picture, 384, 1).canvas, IMAGE.right, Y, IMAGE.size)
  const decodedLabel = label(root, '512 × 512 × 3', IMAGE.right, Y + IMAGE.size / 2 + 20)

  const stat = label(root, '12× fewer values', LATENT.x, Y + 240, 'stat', 800)
  const statNote = label(root, '786,432 numbers become 65,536', LATENT.x, Y + 316, 'caption', 800)

  // Beat 20 furniture: a loop around the latent.
  const r = 190
  const loop = stroke(lines, `M${LATENT.x + r} ${Y} A${r} ${r} 0 1 1 ${LATENT.x} ${Y - r} M${LATENT.x - 20} ${Y - r - 14} L${LATENT.x + 2} ${Y - r} L${LATENT.x - 20} ${Y - r + 14}`, 'hot')
  const loopLabel = label(root, 'Denoise × 30, all in here', LATENT.x, Y - r - 70, 'tag', 500)
  const onceLabel = label(root, 'Decode once, at the end', (DECODER.x1 + IMAGE.right) / 2 + 60, Y + IMAGE.size / 2 + 70, 'tag', 500)

  // ---- Beat 19: squeeze the image down to a latent and back.
  const beat19 = gsap.timeline()
  wordsIn(beat19, compressed, 0)
  beat19.fromTo(original, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: 'power3.out' }, 0.3)
  rise(beat19, originalLabel, 0.7)
  draw(beat19, encoder, 0.8, 0.6)
  rise(beat19, encoderLabel, 1.1)
  draw(beat19, toLatent, 1.3, 0.3)
  beat19.fromTo(tile, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 1.4)
  rise(beat19, [latentLabel, latentNote], 1.9, 0.1)
  draw(beat19, toDecoder, 2.2, 0.3)
  draw(beat19, decoder, 2.3, 0.6)
  rise(beat19, decoderLabel, 2.6)
  beat19.fromTo(decoded, { clipPath: 'inset(0% 100% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: 'power3.out' }, 2.8)
  rise(beat19, decodedLabel, 3.2)
  beat19.fromTo(stat, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, 3.4)
  rise(beat19, statNote, 3.7)

  // ---- Beat 20: generation never encodes; it denoises the latent, then decodes.
  const beat20 = gsap.timeline()
  wordsOut(beat20, compressed, 0)
  wordsIn(beat20, once, 0.4)
  fade(beat20, [original, originalLabel, encoder, encoderLabel, toLatent, latentNote, stat, statNote, decoded, decodedLabel], 0)
  beat20.to(small, { level: 1, duration: 0.5, ease: 'power1.in', onUpdate: small.render }, 0.3)
  draw(beat20, loop, 0.9, 0.8)
  rise(beat20, loopLabel, 1.1)
  beat20
    .to(loop, { rotation: 360, svgOrigin: `${LATENT.x} ${Y}`, duration: 1.8, ease: 'none' }, 1.3)
    .to(small, { level: 0, duration: 1.8, ease: 'none', onUpdate: small.render }, 1.3)
    .to(decoder, { stroke: '#ff6b3d', duration: 0.3 }, 3.1)
    .to(decoded, { autoAlpha: 1, duration: 0.01 }, 3.2)
    .fromTo(decoded, { clipPath: 'inset(0% 100% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: 'power3.out', immediateRender: false }, 3.2)
  rise(beat20, onceLabel, 3.6)

  return [beat19, beat20]
}
