// The diagram that grows through the talk, one idea at a time:
//   step 1, beat 21: random noise, the model × 30, the image (idea 1);
//   step 2, beat 24: the prompt, the text encoder and its numbers (idea 2);
//   step 3, beats 29 and 30: the latent and the decompressor (idea 3), then
//   the whole system, one idea after the other.
// Each step is its own scene. It opens with the earlier steps already in
// place, and only the new parts build.
import gsap from 'gsap'
import { arrow, assets, box, draw, el, fade, headline, idea, label, overlay, place, promptChip, rise, shot, stroke, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import type { SceneBuilder } from '../engine'
import { NoisyImage, seeded } from '../noise'
import { LIGHTHOUSE_PROMPT } from './intro'

// Two rows: the text on top, the image path below.
const TOP = 450
const BOTTOM = 760
const PROMPT = { x: 104, w: 600, h: 72 }
const ENCODER = { x: 790, w: 260, h: 110 }
const EMBED = { x: 1150, cells: 10, size: 38, pitch: 46 }
const NOISE = { x: 190, size: 150 }
const MODEL = { x: 400, w: 360, h: 150 }
const LATENT = { x: 960, size: 150 }
/** The decompressor, drawn as the funnel from beat 27: narrow on the latent side. */
const FUNNEL = { narrow: 1130, wide: 1290, narrowHalf: 40, wideHalf: 95 }
const IMAGE = { x: 1560, size: 260 }
const IDEAS_Y = 920

const appear = (tl: gsap.core.Timeline, node: gsap.TweenTarget, at: number) =>
  tl.fromTo(node, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, at)

export function spine(step: 1 | 2 | 3): SceneBuilder {
  return (root) => {
    const lines = overlay(root)
    const timelines: gsap.core.Timeline[] = []
    const modelMid = MODEL.x + MODEL.w / 2

    // ---- Idea 1: noise, the model applied again and again, the image.
    // Until step 3 the noise is the coloured noise the audience has seen.
    const start = new NoisyImage(assets.three.lighthouse, 384, 1)
    const noise = shot(root, start.canvas, NOISE.x, BOTTOM, NOISE.size)
    const noiseLabel = label(root, 'random noise', NOISE.x, BOTTOM + NOISE.size / 2 + 14, 'caption', 220)
    const toModel = arrow(lines, NOISE.x + NOISE.size / 2 + 16, MODEL.x - 20, BOTTOM)
    const model = box(root, 'Model × 30', MODEL.x, BOTTOM - MODEL.h / 2, MODEL.w, MODEL.h, 'accent')
    const imageLeft = IMAGE.x - IMAGE.size / 2
    const toImageLong = arrow(lines, MODEL.x + MODEL.w + 20, imageLeft - 24, BOTTOM)
    const result = new NoisyImage(assets.three.lighthouse, 384, 1)
    result.frame = assets.three.lighthouse.length - 1
    result.render()
    const image = shot(root, result.canvas, IMAGE.x, BOTTOM, IMAGE.size)
    const idea1 = idea(root, 1, modelMid - 330, IDEAS_Y, 'centered', 660)

    if (step === 1) {
      const chip = promptChip(root, LIGHTHOUSE_PROMPT)
      const beat21 = gsap.timeline()
      wordsIn(beat21, headline(root, title('21')), 0)
      rise(beat21, chip, 0.3)
      appear(beat21, noise, 0.5)
      rise(beat21, noiseLabel, 0.7)
      draw(beat21, toModel, 0.9, 0.3)
      appear(beat21, model, 1.1)
      draw(beat21, toImageLong, 1.5, 0.5)
      // The image comes out of the noise, as in every run so far.
      appear(beat21, image, 1.9)
      beat21.fromTo(result, { frame: 0 }, { frame: result.frame, duration: 1.4, ease: 'power1.inOut', onUpdate: result.render }, 1.9)
      rise(beat21, idea1, 3.4)
      timelines.push(beat21)
      return timelines
    }

    // ---- Idea 2: the prompt, through the text encoder, steers every step.
    const promptBox = place(el('div', 'prompt-box small', LIGHTHOUSE_PROMPT), PROMPT.x, TOP - PROMPT.h / 2, PROMPT.w, PROMPT.h)
    root.append(promptBox)
    const toEncoder = arrow(lines, PROMPT.x + PROMPT.w + 20, ENCODER.x - 20, TOP)
    const encoder = box(root, 'Text encoder', ENCODER.x, TOP - ENCODER.h / 2, ENCODER.w, ENCODER.h)
    const toEmbed = arrow(lines, ENCODER.x + ENCODER.w + 20, EMBED.x - 20, TOP)
    // The cells sit in one row, so the whole row can dim without losing their shades.
    const embed = place(el('div'), EMBED.x, TOP - EMBED.size / 2, EMBED.cells * EMBED.pitch, EMBED.size)
    const random = seeded(19)
    const cells = Array.from({ length: EMBED.cells }, (_, i) => {
      const cell = place(el('span', 'cell'), i * EMBED.pitch, 0, EMBED.size, EMBED.size)
      cell.style.opacity = String(0.25 + random() * 0.75)
      return embed.appendChild(cell)
    })
    root.append(embed)
    const embedMid = EMBED.x + (EMBED.cells * EMBED.pitch) / 2
    const modelTop = BOTTOM - MODEL.h / 2
    const guide = stroke(
      lines,
      `M${embedMid} ${TOP + 34} V${TOP + 130} H${modelMid} V${modelTop - 18} M${modelMid - 12} ${modelTop - 36} L${modelMid} ${modelTop - 16} L${modelMid + 12} ${modelTop - 36}`,
      'hot',
    )
    const idea2 = idea(root, 2, PROMPT.x, TOP - 110)
    gsap.set([toModel, toImageLong], { strokeDashoffset: 0 })

    if (step === 2) {
      // The prompt chip from every run moves into the prompt box.
      const chip = promptChip(root, LIGHTHOUSE_PROMPT)
      const beat24 = gsap.timeline()
      wordsIn(beat24, headline(root, title('24')), 0)
      beat24
        .to(chip, { left: PROMPT.x + PROMPT.w / 2, top: TOP, duration: 0.8, ease: 'power3.inOut' }, 0.5)
        .to(chip, { autoAlpha: 0, duration: 0.2 }, 1.3)
        .fromTo(promptBox, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 1.3)
      draw(beat24, toEncoder, 1.5, 0.3)
      appear(beat24, encoder, 1.7)
      draw(beat24, toEmbed, 1.9, 0.3)
      beat24.fromTo(cells, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.04 }, 2.1)
      draw(beat24, guide, 2.6, 0.7)
      rise(beat24, idea2, 3.3)
      timelines.push(beat24)
      return timelines
    }

    // ---- Idea 3: the noise is a latent, and the decompressor runs once at the end.
    const pure = new NoisyImage([], 256, 800)
    pure.grey = true
    pure.render()
    const latentNoise = shot(root, pure.canvas, NOISE.x, BOTTOM, NOISE.size, 'pixelated')
    const latentNoiseLabel = label(root, 'random latent', NOISE.x, BOTTOM + NOISE.size / 2 + 14, 'caption', 220)
    const toLatent = arrow(lines, MODEL.x + MODEL.w + 20, LATENT.x - LATENT.size / 2 - 20, BOTTOM)
    const cleaned = new NoisyImage(assets.latent, 256, 800)
    cleaned.grey = true
    cleaned.level = 1
    cleaned.render()
    const latent = shot(root, cleaned.canvas, LATENT.x, BOTTOM, LATENT.size, 'pixelated')
    const latentLabel = label(root, 'latent', LATENT.x, BOTTOM + LATENT.size / 2 + 14, 'caption', 200)
    const toFunnel = arrow(lines, LATENT.x + LATENT.size / 2 + 16, FUNNEL.narrow - 16, BOTTOM)
    const { narrow, wide, narrowHalf, wideHalf } = FUNNEL
    const funnel = stroke(lines, `M${wide} ${BOTTOM - wideHalf} L${narrow} ${BOTTOM - narrowHalf} V${BOTTOM + narrowHalf} L${wide} ${BOTTOM + wideHalf} Z`)
    const funnelLabel = label(root, 'Decompressor', (narrow + wide) / 2, BOTTOM - wideHalf - 44, 'tag', 260)
    const toImage = arrow(lines, wide + 16, imageLeft - 24, BOTTOM)
    const pixelsLabel = label(root, 'pixels', IMAGE.x, BOTTOM + IMAGE.size / 2 + 14, 'caption', 200)
    const idea3 = idea(root, 3, (LATENT.x + wide) / 2 - 330, IDEAS_Y, 'centered', 660)

    gsap.set([toEncoder, toEmbed, guide], { strokeDashoffset: 0 })
    const once = headline(root, title('29'))
    const whole = headline(root, title('30'))
    const beat29 = gsap.timeline()
    wordsIn(beat29, once, 0)
    fade(beat29, toImageLong, 0.4)
    beat29
      .fromTo(latentNoise, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.5)
      .to([noise, noiseLabel], { autoAlpha: 0, duration: 0.5 }, 0.5)
      .fromTo(latentNoiseLabel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.6)
    draw(beat29, toLatent, 1.0, 0.3)
    appear(beat29, latent, 1.2)
    beat29.to(cleaned, { level: 0, duration: 0.9, ease: 'none', onUpdate: cleaned.render }, 1.4)
    rise(beat29, latentLabel, 1.6)
    draw(beat29, toFunnel, 2.4, 0.3)
    draw(beat29, funnel, 2.6, 0.5)
    rise(beat29, funnelLabel, 2.8)
    draw(beat29, toImage, 3.1, 0.3)
    rise(beat29, pixelsLabel, 3.3)
    rise(beat29, idea3, 3.7)

    // ---- Beat 30: the finished diagram, one idea at a time.
    const groups = [
      [latentNoise, latentNoiseLabel, toModel, model, image, idea1],
      [promptBox, toEncoder, encoder, toEmbed, embed, guide, idea2],
      [toLatent, latent, latentLabel, toFunnel, funnel, funnelLabel, toImage, pixelsLabel, idea3],
    ]
    const beat30 = gsap.timeline()
    wordsOut(beat30, once, 0)
    wordsIn(beat30, whole, 0.4)
    beat30.to(groups.flat(), { opacity: 0.2, duration: 0.4 }, 0.4)
    groups.forEach((group, i) => beat30.to(group, { opacity: 1, duration: 0.4 }, 1.2 + i * 1.2))
    timelines.push(beat29, beat30)
    return timelines
  }
}
