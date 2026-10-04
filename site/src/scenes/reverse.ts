// Section II, beats 8-12: using the trained model to go backwards. A little
// noise can be undone, a lot cannot, one big guess gives a blur, so the
// model's prediction is taken a bit at a time, again and again.
//
// The portrait pictures are real model states and outputs, recorded by
// tools/assets.py and shown as they are. At the level where the model
// returns someone else, the noisy input is not recognisable to the eye
// either, and it is left so.
import gsap from 'gsap'
import { arrow, assets, bend, draw, el, fade, headline, label, overlay, place, rise, shot, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { NoiseField, NoisyImage } from '../noise'

const Y = 640

// Beat 8: the slightly noisy portrait and what the model gives back.
const PAIR = { y: 650, size: 410, noisyX: 520, backX: 1400 }

// Beats 9-10: the heavily noised portrait on the left (72% noise, the frame
// at HEAVY in tools/assets.py), four results or one big guess on the right.
const HEAVY = { x: 300, size: 330 }
const CAND = { xs: [723, 1039, 1355, 1671], size: 290 }
const GUESS = { x: 1100, size: 362 }

// Beat 11: the noisy image, minus a bit of the predicted noise, is the next state.
const TERMS = { xs: [430, 960, 1490], size: 320 }

// Beat 12: the way back, as a strip of seven small frames.
const BACK = { x: 104, size: 220, pitch: 248.67 }

/** A picture that dissolves from one recorded image into the next as `frame` goes from 0 to 1. */
function morph(from: CanvasImageSource, to: CanvasImageSource) {
  return new NoisyImage([from, to], 384, 1)
}

export function reverse(root: HTMLElement) {
  const backwards = headline(root, title('8'))
  const tooFar = headline(root, title('9'))
  const blurry = headline(root, title('10'))
  const aBit = headline(root, title('11'))
  const smallSteps = headline(root, title('12'))
  const lines = overlay(root)

  // ---- Beat 8: from a little noise, the model gives back nearly the original.
  const slightly = shot(root, new NoisyImage(assets.noised[0], 384, 1).canvas, PAIR.noisyX, PAIR.y, PAIR.size)
  const slightlyLabel = label(root, '32% noise', PAIR.noisyX, PAIR.y + PAIR.size / 2 + 20)
  const undo = arrow(lines, PAIR.noisyX + PAIR.size / 2 + 30, PAIR.backX - PAIR.size / 2 - 30, PAIR.y)
  const undoLabel = label(root, 'Subtract the predicted noise', (PAIR.noisyX + PAIR.backX) / 2, PAIR.y - 56, 'tag', 440)
  const restored = morph(assets.noised[0], assets.near)
  const near = shot(root, restored.canvas, PAIR.backX, PAIR.y, PAIR.size)
  const nearLabel = label(root, 'what the model gives back: nearly the original', PAIR.backX, PAIR.y + PAIR.size / 2 + 20, 'caption', 620)

  const beat8 = gsap.timeline()
  wordsIn(beat8, backwards, 0)
  beat8.fromTo(slightly, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.out' }, 0.4)
  rise(beat8, slightlyLabel, 0.9)
  draw(beat8, undo, 1.3, 0.5)
  rise(beat8, undoLabel, 1.4)
  beat8
    .fromTo(near, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.8)
    .to(restored, { frame: 1, duration: 1.1, ease: 'power1.inOut', onUpdate: restored.render }, 2.1)
  rise(beat8, nearLabel, 2.8)

  // ---- Beat 9: from a lot of noise, the model goes four different ways.
  const input = assets.noised[2]
  const heavy = shot(root, new NoisyImage(input, 384, 1).canvas, HEAVY.x, Y, HEAVY.size)
  heavy.style.zIndex = '5'
  const heavyLabel = label(root, '72% noise', HEAVY.x, Y + HEAVY.size / 2 + 20)

  const candidates = assets.cand.map((source, i) => {
    const image = morph(input, source)
    const frame = shot(root, image.canvas, CAND.xs[i], Y, CAND.size)
    frame.style.zIndex = String(10 + i)
    const arc = bend(lines, HEAVY.x + 150, Y - 130, HEAVY.x + 230, 330, CAND.xs[i] - 130, 330, CAND.xs[i], Y - CAND.size / 2 - 14)
    const caption = label(root, i === 0 ? 'it could be this' : 'or this', CAND.xs[i], Y + CAND.size / 2 + 20)
    return { el: frame, image, arc, caption }
  })

  const beat9 = gsap.timeline()
  wordsOut(beat9, backwards, 0)
  wordsIn(beat9, tooFar, 0.4)
  fade(beat9, [slightly, slightlyLabel, undo, undoLabel, near, nearLabel], 0)
  beat9.fromTo(heavy, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.5)
  rise(beat9, heavyLabel, 0.9)
  candidates.forEach(({ el: frame, image, arc, caption }, i) => {
    const at = 1.2 + i * 0.4
    draw(beat9, arc, at, 0.5)
    beat9
      .fromTo(frame, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, at + 0.25)
      .to(image, { frame: 1, duration: 0.9, ease: 'power1.inOut', onUpdate: image.render }, at + 0.35)
    rise(beat9, caption, at + 0.9)
  })

  // ---- Beat 10: the results pile up into their average, next to the model's
  // real single-step guess from the same input.
  const guess = shot(root, new NoisyImage(assets.guess, 384, 1).canvas, GUESS.x, Y, GUESS.size)
  guess.style.zIndex = '20'
  const guessLabel = label(root, 'the average of everything it could be', GUESS.x, Y + GUESS.size / 2 + 20, 'caption', 600)
  const leap = arrow(lines, HEAVY.x + HEAVY.size / 2 + 24, GUESS.x - GUESS.size / 2 - 24, Y)
  const leapLabel = label(root, 'One big guess', (HEAVY.x + GUESS.x) / 2, Y - 56, 'tag')

  const beat10 = gsap.timeline()
  wordsOut(beat10, tooFar, 0)
  wordsIn(beat10, blurry, 0.4)
  fade(beat10, candidates.map((c) => c.arc), 0)
  fade(beat10, candidates.map((c) => c.caption), 0)
  candidates.forEach(({ el: frame }, i) => {
    // Stacked at 1, 1/2, 1/3, 1/4 opacity, the pile shows the exact average.
    beat10.to(frame, { x: GUESS.x - CAND.xs[i], scale: GUESS.size / CAND.size, autoAlpha: 1 / (i + 1), duration: 0.9, ease: 'power3.inOut' }, 0.5 + i * 0.06)
  })
  draw(beat10, leap, 0.7, 0.6)
  rise(beat10, leapLabel, 1.0)
  beat10.fromTo(guess, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 1.7)
  fade(beat10, candidates.map((c) => c.el), 2.1)
  rise(beat10, guessLabel, 2.0)

  // ---- Beat 11: so only a bit of the prediction is used. The result is the
  // model's real next state, which the eye can hardly tell from the input.
  const way = [input, ...assets.back, assets.cand[0]]
  const minus = label(root, '−', (TERMS.xs[0] + TERMS.xs[1]) / 2, Y - 56, 'symbol', 100)
  const equals = label(root, '=', (TERMS.xs[1] + TERMS.xs[2]) / 2, Y - 56, 'symbol', 100)
  const bit = shot(root, new NoiseField(384, 31, 31).canvas, TERMS.xs[1], Y, TERMS.size)
  const stepped = morph(way[0], way[1])
  const next = shot(root, stepped.canvas, TERMS.xs[2], Y, TERMS.size)
  next.style.zIndex = '4'
  const termLabels = ['the noisy image', 'a bit of the predicted noise', 'slightly less noisy'].map((text, i) => label(root, text, TERMS.xs[i], Y + TERMS.size / 2 + 20))
  const barely = label(root, 'Barely different, so repeat', TERMS.xs[2], Y + TERMS.size / 2 + 64, 'tag', 420)

  const beat11 = gsap.timeline()
  wordsOut(beat11, blurry, 0)
  wordsIn(beat11, aBit, 0.4)
  fade(beat11, [guess, guessLabel, leap, leapLabel, heavyLabel], 0)
  beat11.to(heavy, { x: TERMS.xs[0] - HEAVY.x, scale: TERMS.size / HEAVY.size, duration: 0.9, ease: 'power3.inOut' }, 0.3)
  rise(beat11, [minus, termLabels[0]], 1.1, 0.1)
  beat11
    .fromTo(bit, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.3)
    // Only a bit of the noise is taken away, so the noise picture dims.
    .to(bit, { opacity: 0.45, duration: 0.5 }, 1.9)
  rise(beat11, termLabels[1], 1.6)
  rise(beat11, equals, 2.3)
  beat11
    .fromTo(next, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.5)
    .to(stepped, { frame: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: stepped.render }, 2.8)
  rise(beat11, termLabels[2], 2.9)
  rise(beat11, barely, 3.6)

  // ---- Beat 12: and repeat. The two frames of the equation become the start
  // of a strip, and the rest of the run's recorded states follow.
  const backCentre = (i: number) => BACK.x + BACK.size / 2 + i * BACK.pitch
  const hops = way.slice(1).map((_, i) =>
    bend(lines, backCentre(i) + 40, Y - BACK.size / 2 - 16, backCentre(i) + 70, Y - 190, backCentre(i + 1) - 70, Y - 190, backCentre(i + 1) - 40, Y - BACK.size / 2 - 16),
  )
  const later = way.slice(2).map((state, i) => {
    const image = morph(way[i + 1], state)
    const frame = shot(root, image.canvas, backCentre(i + 2), Y, BACK.size)
    frame.style.zIndex = String(3 - i)
    return { el: frame, image }
  })
  const backAxis = place(el('div', 'axis'), BACK.x, Y + BACK.size / 2 + 40, BACK.pitch * 6 + BACK.size, 2)
  const backLabel = place(el('span', 'tag', 'Less noise →'), BACK.x, Y + BACK.size / 2 + 60)
  root.append(backAxis, backLabel)

  const beat12 = gsap.timeline()
  wordsOut(beat12, aBit, 0)
  wordsIn(beat12, smallSteps, 0.4)
  fade(beat12, [minus, equals, bit, ...termLabels, barely], 0)
  beat12
    .to(heavy, { x: backCentre(0) - HEAVY.x, scale: BACK.size / HEAVY.size, duration: 0.8, ease: 'power3.inOut' }, 0.3)
    .to(next, { x: backCentre(1) - TERMS.xs[2], scale: BACK.size / TERMS.size, duration: 0.8, ease: 'power3.inOut' }, 0.35)
    .fromTo(backAxis, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 2.2, ease: 'none' }, 1.1)
    .fromTo(backLabel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.1)
  draw(beat12, hops[0], 1.1, 0.4)
  later.forEach(({ el: frame, image }, i) => {
    const at = 1.45 + i * 0.36
    draw(beat12, hops[i + 1], at, 0.4)
    beat12
      .fromTo(frame, { x: -BACK.pitch, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, at)
      .to(image, { frame: 1, duration: 0.6, ease: 'power1.out', onUpdate: image.render }, at)
  })

  return [beat8, beat9, beat10, beat11, beat12]
}
