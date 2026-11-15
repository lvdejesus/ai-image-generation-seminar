// The diagram that grows through the talk, one idea at a time:
//   step 0, beat 4: the whole system at once, with plain labels and no idea
//   numbers, before any of it is explained;
//   step 1, beat 25: random noise, the model × 30, the image (idea 1);
//   step 2, beat 27: the prompt, the text encoder and its numbers (idea 2);
//   step 3, beat 33: the latent and the decompressor (idea 3).
// Each step is its own scene. It opens with the earlier steps already in
// place, and only the new parts build.
import gsap from 'gsap'
import './spine-prompt-pipeline.css'
import { arrow, assets, box, draw, el, fade, headline, hold, idea, label, overlay, place, promptChip, rise, shot, stroke, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import type { SceneBuilder } from '../engine'
import { NoisyImage, seeded } from '../noise'
import { LIGHTHOUSE_PROMPT } from './intro'

// Two rows: the text on top, the image path below. The layout is sized for
// the full diagram, so every step shows the same places.
const TOP = 440
const BOTTOM = 730
const PROMPT = { x: 104, w: 700, h: 80 }
const ENCODER = { x: 904, w: 300, h: 110 }
const EMBED = { x: 1324, cells: 10, size: 40, pitch: 49 }
const NOISE = { x: 204, size: 200 }
const MODEL = { x: 424, w: 340, h: 170 }
const LATENT = { x: 984, size: 200 }
/** The decompressor, drawn as the funnel from beat 31: narrow on the latent side. */
const FUNNEL = { narrow: 1186, wide: 1346, narrowHalf: 50, wideHalf: 120 }
const IMAGE = { x: 1646, size: 340 }
/** The text line runs down from this cell of the numbers, left of the image. */
const GUIDE_CELL = 1
/** The height of the text line between the two rows. */
const GUIDE_Y = 570
const IDEAS_Y = 940
/**
 * Step 1 shows only noise, model and image, so they sit in one row in the
 * middle of the slide. Step 2 opens with this row and moves it into the
 * places of the full diagram. These are the centres in the row.
 */
const ROW = { y: 620, noise: 480, model: 870, image: 1370, idea: 960, ideaY: 850 }

const appear = (tl: gsap.core.Timeline, node: gsap.TweenTarget, at: number) =>
  tl.fromTo(node, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, at)

export function spine(step: 0 | 1 | 2 | 3 | 4): SceneBuilder {
  return (root) => {
    root.classList.add('spine-prompt-pipeline')
    const lines = overlay(root)
    const timelines: gsap.core.Timeline[] = []
    const modelMid = MODEL.x + MODEL.w / 2

    // ---- Idea 1: noise, the model applied again and again, the image.
    // Until step 3 the noise is the coloured noise the audience has seen.
    const start = new NoisyImage(assets.three.lighthouse, 384, 1)
    const noise = shot(root, start.canvas, NOISE.x, BOTTOM, NOISE.size)
    const noiseLabel = label(root, 'random noise', NOISE.x, BOTTOM + NOISE.size / 2 + 14, 'caption', 300)
    const toModel = arrow(lines, NOISE.x + NOISE.size / 2 + 16, MODEL.x - 20, BOTTOM)
    const model = box(root, 'Model × 30', MODEL.x, BOTTOM - MODEL.h / 2, MODEL.w, MODEL.h, 'accent')
    const imageLeft = IMAGE.x - IMAGE.size / 2
    const toImageLong = arrow(lines, MODEL.x + MODEL.w + 20, imageLeft - 24, BOTTOM)
    const result = new NoisyImage(assets.three.lighthouse, 384, 1)
    result.frame = assets.three.lighthouse.length - 1
    result.render()
    const image = shot(root, result.canvas, IMAGE.x, BOTTOM, IMAGE.size)
    const idea1 = idea(root, 1, modelMid - 330, IDEAS_Y, 'centered', 660)

    // The row of step 1: each part is moved from its place in the full
    // diagram by a transform, and its arrows are drawn separately.
    // The label and the idea line rise in, which animates their y, so they
    // move by their left and top instead.
    const inRow = [
      { nodes: [noise], dx: ROW.noise - NOISE.x },
      { nodes: [model], dx: ROW.model - modelMid },
      { nodes: [image], dx: ROW.image - IMAGE.x },
    ]
    const shifted = [
      { node: noiseLabel, dx: ROW.noise - NOISE.x, dy: ROW.y - BOTTOM },
      { node: idea1, dx: ROW.idea - modelMid, dy: ROW.ideaY - IDEAS_Y },
    ].map(({ node, dx, dy }) => {
      const left = parseFloat(node.style.left)
      const top = parseFloat(node.style.top)
      return { node, full: { left, top }, row: { left: left + dx, top: top + dy } }
    })
    const toRow = () => {
      inRow.forEach(({ nodes, dx }) => gsap.set(nodes, { x: dx, y: ROW.y - BOTTOM }))
      shifted.forEach(({ node, row }) => gsap.set(node, row))
    }
    const rowArrows = [
      arrow(lines, ROW.noise + NOISE.size / 2 + 16, ROW.model - MODEL.w / 2 - 20, ROW.y),
      arrow(lines, ROW.model + MODEL.w / 2 + 20, ROW.image - IMAGE.size / 2 - 24, ROW.y),
    ]

    if (step === 1) {
      const chip = promptChip(root, LIGHTHOUSE_PROMPT)
      const beat25 = gsap.timeline()
      wordsIn(beat25, headline(root, title('25')), 0)
      rise(beat25, chip, 0.3)
      toRow()
      appear(beat25, noise, 0.5)
      rise(beat25, noiseLabel, 0.7)
      draw(beat25, rowArrows[0], 0.9, 0.3)
      appear(beat25, model, 1.1)
      draw(beat25, rowArrows[1], 1.5, 0.3)
      // The image comes out of the noise, as in every run so far.
      appear(beat25, image, 1.9)
      beat25.fromTo(result, { frame: 0 }, { frame: result.frame, duration: 1.4, ease: 'power1.inOut', onUpdate: result.render }, 1.9)
      rise(beat25, idea1, 3.4)
      timelines.push(beat25)
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
    const guideX = EMBED.x + GUIDE_CELL * EMBED.pitch + EMBED.size / 2
    const modelTop = BOTTOM - MODEL.h / 2
    const guide = stroke(
      lines,
      `M${guideX} ${TOP + EMBED.size / 2 + 12} V${GUIDE_Y} H${modelMid} V${modelTop - 18} M${modelMid - 12} ${modelTop - 36} L${modelMid} ${modelTop - 16} L${modelMid + 12} ${modelTop - 36}`,
      'hot',
    )
    const idea2 = idea(root, 2, PROMPT.x, TOP - 110)
    if (step === 2) {
      // The diagram opens as the row of step 1, then moves down and apart
      // into its places, which makes room for the text row above.
      toRow()
      gsap.set(rowArrows, { strokeDashoffset: 0 })
      const chip = promptChip(root, LIGHTHOUSE_PROMPT)
      const beat27 = gsap.timeline()
      const headline27 = headline(root, title('27'))
      wordsIn(beat27, headline27, 0)
      fade(beat27, rowArrows, 0.3, 0.2)
      inRow.forEach(({ nodes }) => beat27.to(nodes, { x: 0, y: 0, duration: 0.9, ease: 'power3.inOut' }, 0.4))
      shifted.forEach(({ node, full }) => beat27.to(node, { ...full, duration: 0.9, ease: 'power3.inOut' }, 0.4))
      draw(beat27, toModel, 1.3, 0.3)
      draw(beat27, toImageLong, 1.4, 0.5)
      // The prompt chip from every run moves into the prompt box.
      const after = 1.2
      beat27
        .to(chip, { left: PROMPT.x + PROMPT.w / 2, top: TOP, duration: 0.8, ease: 'power3.inOut' }, after + 0.5)
        .to(chip, { autoAlpha: 0, duration: 0.2 }, after + 1.3)
        .fromTo(promptBox, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, after + 1.3)
      draw(beat27, toEncoder, after + 1.5, 0.3)
      appear(beat27, encoder, after + 1.7)
      draw(beat27, toEmbed, after + 1.9, 0.3)
      beat27.fromTo(cells, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.04 }, after + 2.1)
      // Rest on the numbers, then show that they go into every step.
      draw(beat27, guide, beat27.duration() + 0.1, 0.7)
      rise(beat27, idea2, beat27.duration() + 0.1)
      timelines.push(beat27)

      // ---- Beat 28: the text row dims, and the noise and the image get the
      // same size label: the model works on all of those numbers, 30 times.
      // Under the noise label, and under the image, which has no label yet.
      const sizeLabels = [
        label(root, '512 × 512 × 3 numbers', NOISE.x, BOTTOM + NOISE.size / 2 + 54, 'caption', 340),
        label(root, '512 × 512 × 3 numbers', IMAGE.x, BOTTOM + IMAGE.size / 2 + 14, 'caption', 340),
      ]
      sizeLabels.forEach((node) => {
        node.style.color = 'var(--accent)'
        node.style.whiteSpace = 'nowrap'
      })
      const beat28 = gsap.timeline()
      wordsOut(beat28, headline27, 0)
      wordsIn(beat28, headline(root, title('28')), 0.4)
      beat28.to([promptBox, toEncoder, encoder, toEmbed, embed, guide, idea2, idea1], { autoAlpha: 0.2, duration: 0.5 }, 0.3)
      rise(beat28, sizeLabels, 0.9, 0.2)
      timelines.push(beat28)
      return timelines
    }

    gsap.set([toModel, toImageLong], { strokeDashoffset: 0 })

    // ---- Idea 3: the noise is a latent, and the decompressor runs once at the end.
    const pure = new NoisyImage([], 256, 800)
    pure.grey = true
    pure.render()
    const latentNoise = shot(root, pure.canvas, NOISE.x, BOTTOM, NOISE.size, 'pixelated')
    const latentNoiseLabel = label(root, 'random latent', NOISE.x, BOTTOM + NOISE.size / 2 + 14, 'caption', 300)
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
    const funnelLabel = label(root, 'Decompressor', (narrow + wide) / 2, BOTTOM + wideHalf + 14, 'tag', 300)
    const toImage = arrow(lines, wide + 16, imageLeft - 24, BOTTOM)
    const pixelsLabel = label(root, 'pixels', IMAGE.x, BOTTOM + IMAGE.size / 2 + 14, 'caption', 200)
    const idea3 = idea(root, 3, (LATENT.x + wide) / 2 - 330, IDEAS_Y, 'centered', 660)

    if (step === 0) {
      // ---- Beat 4: the whole system, built in one go. The labels are plain
      // words, since the talk has not explained the parts yet.
      gsap.set([noise, noiseLabel, toImageLong, idea1, idea2, idea3], { autoAlpha: 0 })
      latentNoiseLabel.textContent = 'random noise'
      latentLabel.textContent = 'compressed image'
      pixelsLabel.textContent = 'the image'
      cleaned.level = 0
      cleaned.render()
      const beat4 = gsap.timeline()
      wordsIn(beat4, headline(root, title('4')), 0)
      appear(beat4, latentNoise, 0.5)
      rise(beat4, latentNoiseLabel, 0.7)
      draw(beat4, toModel, 0.9, 0.3)
      appear(beat4, model, 1.1)
      draw(beat4, toLatent, 1.5, 0.3)
      appear(beat4, latent, 1.7)
      rise(beat4, latentLabel, 1.9)
      draw(beat4, toFunnel, 2.2, 0.3)
      draw(beat4, funnel, 2.4, 0.5)
      rise(beat4, funnelLabel, 2.6)
      draw(beat4, toImage, 2.9, 0.3)
      appear(beat4, image, 3.1)
      beat4.fromTo(result, { frame: 0 }, { frame: result.frame, duration: 1.2, ease: 'power1.inOut', onUpdate: result.render }, 3.1)
      rise(beat4, pixelsLabel, 3.5)
      // Then the text row, and its line into the model.
      rise(beat4, promptBox, 4.4)
      draw(beat4, toEncoder, 4.8, 0.3)
      appear(beat4, encoder, 5.0)
      draw(beat4, toEmbed, 5.2, 0.3)
      beat4.fromTo(cells, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.04 }, 5.4)
      draw(beat4, guide, beat4.duration() + 0.1, 0.7)
      timelines.push(beat4)
      return timelines
    }

    gsap.set([toEncoder, toEmbed, guide], { strokeDashoffset: 0 })
    const once = headline(root, title('33'))
    const beat33 = gsap.timeline()
    wordsIn(beat33, once, 0)
    fade(beat33, toImageLong, 0.4)
    beat33
      .fromTo(latentNoise, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.5)
      .to([noise, noiseLabel], { autoAlpha: 0, duration: 0.5 }, 0.5)
      .fromTo(latentNoiseLabel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.6)
    draw(beat33, toLatent, 1.0, 0.3)
    appear(beat33, latent, 1.2)
    beat33.to(cleaned, { level: 0, duration: 0.9, ease: 'none', onUpdate: cleaned.render }, 1.4)
    rise(beat33, latentLabel, 1.6)
    // Rest on the clean latent, then decode it once.
    draw(beat33, toFunnel, 2.5, 0.3)
    draw(beat33, funnel, 2.7, 0.5)
    rise(beat33, funnelLabel, 2.9)
    draw(beat33, toImage, 3.2, 0.3)
    rise(beat33, pixelsLabel, 3.4)
    rise(beat33, idea3, 3.8)
    timelines.push(beat33)
    return timelines
  }
}
