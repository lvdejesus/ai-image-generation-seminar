// Section II, beats 12-17: using the trained model to go backwards. A little
// noise can be undone, a lot cannot; one guess for many images plays it safe
// and gives a blur, the less hint the safer the guess, so the noisy image
// moves only a small step toward the guess, again and again.
//
// The portrait pictures are real model states and outputs, recorded by
// tools/assets.py and shown as they are. At the level where the model
// returns someone else, the noisy input is not recognisable to the eye
// either, and it is left so. The one exception is the noise added to the
// four men in beat 13: it is added by the site, as in beat 6.
import gsap from 'gsap'
import { arrow, assets, bend, draw, el, fade, headline, label, overlay, place, promptChip, rise, shot, wordsIn, wordsOut } from '../kit'
import { title } from '../beats'
import { NoisyImage } from '../noise'

/** The prompt the portrait runs were recorded with (PORTRAIT_PROMPT in tools/assets.py). */
export const PORTRAIT_PROMPT = 'a man in a suit and tie, smiling'

const Y = 640

// Beat 12: the slightly noisy portrait and what the model gives back.
const PAIR = { y: 650, size: 410, noisyX: 520, backX: 1400 }

// Beats 13-14: the heavily noised portrait on the left (72% noise, the frame
// at HEAVY in tools/assets.py), four images that could be under it or one
// big guess on the right.
const HEAVY = { x: 300, size: 330 }
const CAND = { xs: [723, 1039, 1355, 1671], size: 290 }
/** How much noise the four men get in beat 13: enough that they look alike. */
const HIDDEN = 0.7
/** One noise for all four, so the differences that remain are the images' own. */
const HIDDEN_SEED = 12
const GUESS = { x: 1100, size: 362 }
// Beat 14: one pixel on a number line from 0 (dark) to 255 (bright), below.
// It is dark in one answer and bright in another; the safe guess is the middle.
const PIXEL = { x: 640, y: 920, w: 760, dark: 30, bright: 240 }

// Beat 15: three real guesses, from less and less hint.
const LADDER = { xs: [430, 960, 1490], size: 320 }

// Beat 16: the noisy image, plus a bit of the guess, is the next state.
const TERMS = { xs: [430, 960, 1490], size: 320 }

// Beat 17: the way back, as a strip of seven small frames.
const BACK = { x: 104, size: 220, pitch: 248.67 }

/** A picture that dissolves from one recorded image into the next as `frame` goes from 0 to 1. */
function morph(from: CanvasImageSource, to: CanvasImageSource) {
  return new NoisyImage([from, to], 384, 1)
}

export function reverse(root: HTMLElement) {
  const backwards = headline(root, title('12'))
  const tooFar = headline(root, title('13'))
  const blurry = headline(root, title('14'))
  const lessHint = headline(root, title('15'))
  const aBit = headline(root, title('16'))
  const smallSteps = headline(root, title('17'))
  const lines = overlay(root)

  // ---- Beat 12: from a little noise, the model gives back nearly the original.
  const slightly = shot(root, new NoisyImage(assets.noised[0], 384, 1).canvas, PAIR.noisyX, PAIR.y, PAIR.size)
  const slightlyLabel = label(root, '32% noise', PAIR.noisyX, PAIR.y + PAIR.size / 2 + 20)
  const undo = arrow(lines, PAIR.noisyX + PAIR.size / 2 + 30, PAIR.backX - PAIR.size / 2 - 30, PAIR.y)
  const undoLabel = label(root, "The model's guess", (PAIR.noisyX + PAIR.backX) / 2, PAIR.y - 56, 'tag', 440)
  const restored = morph(assets.noised[0], assets.near)
  const near = shot(root, restored.canvas, PAIR.backX, PAIR.y, PAIR.size)
  const nearLabel = label(root, 'what the model gives back: nearly the original', PAIR.backX, PAIR.y + PAIR.size / 2 + 20, 'caption', 620)

  // Every run in this scene uses the same prompt.
  const prompt = promptChip(root, PORTRAIT_PROMPT)
  const beat12 = gsap.timeline()
  wordsIn(beat12, backwards, 0)
  rise(beat12, prompt, 0.3)
  beat12.fromTo(slightly, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.8, ease: 'power3.out' }, 0.4)
  rise(beat12, slightlyLabel, 0.9)
  draw(beat12, undo, 1.3, 0.5)
  rise(beat12, undoLabel, 1.4)
  beat12
    .fromTo(near, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.8)
    .to(restored, { frame: 1, duration: 1.1, ease: 'power1.inOut', onUpdate: restored.render }, 2.1)
  rise(beat12, nearLabel, 2.8)

  // ---- Beat 13: many images could be under heavy noise. Four different men,
  // given the same heavy noise, all look alike, and like the noisy portrait.
  // (The model made these four itself from that noisy portrait, in four runs.)
  const input = assets.noised[2]
  const heavy = shot(root, new NoisyImage(input, 384, 1).canvas, HEAVY.x, Y, HEAVY.size)
  heavy.style.zIndex = '5'
  const heavyLabel = label(root, '72% noise', HEAVY.x, Y + HEAVY.size / 2 + 20)

  const candidates = assets.cand.map((source, i) => {
    const image = new NoisyImage(source, 384, HIDDEN_SEED)
    const frame = shot(root, image.canvas, CAND.xs[i], Y, CAND.size)
    frame.style.zIndex = String(10 + i)
    const arc = bend(lines, CAND.xs[i], Y - CAND.size / 2 - 14, CAND.xs[i] - 130, 330, HEAVY.x + 230, 330, HEAVY.x + 150, Y - 130)
    const caption = label(root, i === 0 ? 'it could be this' : 'or this', CAND.xs[i], Y + CAND.size / 2 + 20)
    return { el: frame, image, arc, caption }
  })
  const alike = label(root, 'The same heavy noise on each: they look alike', (CAND.xs[0] + CAND.xs[3]) / 2, Y + CAND.size / 2 + 64, 'tag', 900)

  const beat13 = gsap.timeline()
  wordsOut(beat13, backwards, 0)
  wordsIn(beat13, tooFar, 0.4)
  fade(beat13, [slightly, slightlyLabel, undo, undoLabel, near, nearLabel], 0)
  beat13.fromTo(heavy, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.5)
  rise(beat13, heavyLabel, 0.9)
  // The four men appear clean, then all get the same heavy noise.
  candidates.forEach(({ el: frame, caption }, i) => {
    const at = 1.2 + i * 0.3
    beat13.fromTo(frame, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, at)
    rise(beat13, caption, at + 0.3)
  })
  candidates.forEach(({ image }) => {
    beat13.to(image, { level: HIDDEN, duration: 1.2, ease: 'power1.inOut', onUpdate: image.render }, 2.8)
  })
  rise(beat13, alike, 3.4)
  candidates.forEach(({ arc }, i) => draw(beat13, arc, 3.8 + i * 0.15, 0.5))

  // ---- Beat 14: the four men, clean again, pile up into their average, next
  // to the model's real single-step guess from the noisy portrait.
  const guess = shot(root, new NoisyImage(assets.guess, 384, 1).canvas, GUESS.x, Y, GUESS.size)
  guess.style.zIndex = '20'
  const guessLabel = label(root, 'the safe guess: the average of everything it could be', GUESS.x, Y + GUESS.size / 2 + 20, 'caption', 760)
  const leap = arrow(lines, HEAVY.x + HEAVY.size / 2 + 24, GUESS.x - GUESS.size / 2 - 24, Y)
  const leapLabel = label(root, 'One big guess', (HEAVY.x + GUESS.x) / 2, Y - 56, 'tag')

  const beat14 = gsap.timeline()
  wordsOut(beat14, tooFar, 0)
  wordsIn(beat14, blurry, 0.4)
  fade(beat14, candidates.map((c) => c.arc), 0)
  fade(beat14, [...candidates.map((c) => c.caption), alike], 0)
  candidates.forEach(({ image }) => {
    beat14.to(image, { level: 0, duration: 0.5, ease: 'power1.out', onUpdate: image.render }, 0)
  })
  candidates.forEach(({ el: frame }, i) => {
    // Stacked at 1, 1/2, 1/3, 1/4 opacity, the pile shows the exact average.
    beat14.to(frame, { x: GUESS.x - CAND.xs[i], scale: GUESS.size / CAND.size, autoAlpha: 1 / (i + 1), duration: 0.9, ease: 'power3.inOut' }, 0.5 + i * 0.06)
  })
  draw(beat14, leap, 0.7, 0.6)
  rise(beat14, leapLabel, 1.0)
  beat14.fromTo(guess, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 1.7)
  fade(beat14, candidates.map((c) => c.el), 2.1)
  rise(beat14, guessLabel, 2.0)

  // Why the average: one pixel, two answers, and the guess that is never far off.
  const pixelX = (value: number) => PIXEL.x + (value / 255) * PIXEL.w
  const pixelLine = place(el('div', 'pixel-line'), PIXEL.x, PIXEL.y, PIXEL.w, 14)
  const pixelEnds = [label(root, '0', PIXEL.x - 30, PIXEL.y - 6, 'caption', 40), label(root, '255', PIXEL.x + PIXEL.w + 36, PIXEL.y - 6, 'caption', 60)]
  const pixelTitle = label(root, 'one pixel', PIXEL.x - 150, PIXEL.y - 6, 'tag', 160)
  const dots = [PIXEL.dark, PIXEL.bright].map((value) => {
    const dot = place(el('div', 'pixel-dot'), pixelX(value) - 14, PIXEL.y - 7, 28, 28)
    dot.style.background = `rgb(${value}, ${value}, ${value})`
    return dot
  })
  const dotLabels = [
    label(root, `one answer: ${PIXEL.dark}`, pixelX(PIXEL.dark), PIXEL.y - 40, 'caption', 220),
    label(root, `another: ${PIXEL.bright}`, pixelX(PIXEL.bright), PIXEL.y - 40, 'caption', 220),
  ]
  const middle = Math.round((PIXEL.dark + PIXEL.bright) / 2)
  const safeMark = place(el('div', 'pixel-guess'), pixelX(middle) - 3, PIXEL.y - 24, 6, 62)
  const safeLabel = label(root, `safe guess: ${middle}`, pixelX(middle), PIXEL.y + 34, 'caption accent', 260)
  root.append(pixelLine, ...dots, safeMark)
  const game = [pixelLine, ...pixelEnds, pixelTitle, ...dots, ...dotLabels, safeMark, safeLabel]
  rise(beat14, [pixelTitle, ...pixelEnds], 2.8, 0.05)
  beat14.fromTo(pixelLine, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 0.6, ease: 'power2.out' }, 2.8)
  beat14.fromTo(dots, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', stagger: 0.3 }, 3.3)
  rise(beat14, dotLabels, 3.4, 0.3)
  // The guess tries one end, then the other, then settles in the middle.
  beat14
    .fromTo(safeMark, { autoAlpha: 0, x: pixelX(PIXEL.dark) - pixelX(middle) }, { autoAlpha: 1, x: pixelX(PIXEL.dark) - pixelX(middle), duration: 0.3 }, 4.2)
    .to(safeMark, { x: pixelX(PIXEL.bright) - pixelX(middle), duration: 0.6, ease: 'power2.inOut' }, 4.6)
    .to(safeMark, { x: 0, duration: 0.6, ease: 'back.out(2)' }, 5.2)
  rise(beat14, safeLabel, 5.6)

  // ---- Beat 15: less hint, a safer guess. The guess from 72% noise, then the
  // model's real guesses from pure noise: with the caption only, and with no text.
  const fromCaption = shot(root, new NoisyImage(assets.hedge.portrait, 384, 1).canvas, LADDER.xs[1], Y, LADDER.size)
  const fromNothing = shot(root, new NoisyImage(assets.hedge.none, 384, 1).canvas, LADDER.xs[2], Y, LADDER.size)
  const ladderLabels = ['hint: 72% noise', 'no hint: the caption only', 'no hint, no text'].map((text, i) => label(root, text, LADDER.xs[i], Y + LADDER.size / 2 + 20, 'caption', 460))
  const ladderAxis = place(el('div', 'axis'), LADDER.xs[0] - LADDER.size / 2, Y + LADDER.size / 2 + 80, LADDER.xs[2] - LADDER.xs[0] + LADDER.size, 2)
  const ladderTag = place(el('span', 'tag', 'Less hint, a safer guess →'), LADDER.xs[0] - LADDER.size / 2, Y + LADDER.size / 2 + 100)
  root.append(ladderAxis, ladderTag)
  const ladder = [fromCaption, fromNothing, ...ladderLabels, ladderAxis, ladderTag]

  const beat15 = gsap.timeline()
  wordsOut(beat15, blurry, 0)
  wordsIn(beat15, lessHint, 0.4)
  fade(beat15, [...game, guessLabel, leap, leapLabel, heavy, heavyLabel], 0)
  beat15.to(guess, { x: LADDER.xs[0] - GUESS.x, scale: LADDER.size / GUESS.size, duration: 0.9, ease: 'power3.inOut' }, 0.3)
  rise(beat15, ladderLabels[0], 1.1)
  beat15.fromTo(fromCaption, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.6)
  rise(beat15, ladderLabels[1], 1.9)
  beat15.fromTo(fromNothing, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.8)
  rise(beat15, ladderLabels[2], 3.1)
  beat15.fromTo(ladderAxis, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 1.2, ease: 'none' }, 1.1)
  beat15.fromTo(ladderTag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.2)

  // ---- Beat 16: so the noisy image moves only a small step toward the guess.
  // The result is the model's real next state, which the eye can hardly
  // tell from the input. (One sampler step is exactly that mix:
  // next = (1 - a) * noisy + a * guess, with a small a.)
  const way = [input, ...assets.back, assets.cand[0]]
  const plus = label(root, '+', (TERMS.xs[0] + TERMS.xs[1]) / 2, Y - 56, 'symbol', 100)
  const equals = label(root, '=', (TERMS.xs[1] + TERMS.xs[2]) / 2, Y - 56, 'symbol', 100)
  const stepped = morph(way[0], way[1])
  const next = shot(root, stepped.canvas, TERMS.xs[2], Y, TERMS.size)
  next.style.zIndex = '4'
  const termLabels = ['the noisy image', 'a bit of the guess', 'slightly less noisy'].map((text, i) => label(root, text, TERMS.xs[i], Y + TERMS.size / 2 + 20))
  const barely = label(root, 'Barely different, so repeat', TERMS.xs[2], Y + TERMS.size / 2 + 64, 'tag', 420)

  const beat16 = gsap.timeline()
  wordsOut(beat16, lessHint, 0)
  wordsIn(beat16, aBit, 0.4)
  fade(beat16, ladder, 0)
  beat16.fromTo(heavy, { autoAlpha: 0 }, { x: TERMS.xs[0] - HEAVY.x, scale: TERMS.size / HEAVY.size, autoAlpha: 1, duration: 0.9, ease: 'power3.inOut', immediateRender: false }, 0.3)
  rise(beat16, [plus, termLabels[0]], 1.1, 0.1)
  // The guess from beat 14 (and 15) takes the middle place, and dims: only a bit of it is used.
  beat16
    .to(guess, { x: TERMS.xs[1] - GUESS.x, scale: TERMS.size / GUESS.size, duration: 0.9, ease: 'power3.inOut' }, 0.3)
    .to(guess, { opacity: 0.45, duration: 0.5 }, 1.9)
  rise(beat16, termLabels[1], 1.6)
  rise(beat16, equals, 2.3)
  beat16
    .fromTo(next, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.5)
    .to(stepped, { frame: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: stepped.render }, 2.8)
  rise(beat16, termLabels[2], 2.9)
  rise(beat16, barely, 3.6)

  // ---- Beat 17: and repeat. The two frames of the equation become the start
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

  const beat17 = gsap.timeline()
  wordsOut(beat17, aBit, 0)
  wordsIn(beat17, smallSteps, 0.4)
  fade(beat17, [plus, equals, guess, ...termLabels, barely], 0)
  beat17
    .to(heavy, { x: backCentre(0) - HEAVY.x, scale: BACK.size / HEAVY.size, duration: 0.8, ease: 'power3.inOut' }, 0.3)
    .to(next, { x: backCentre(1) - TERMS.xs[2], scale: BACK.size / TERMS.size, duration: 0.8, ease: 'power3.inOut' }, 0.35)
    .fromTo(backAxis, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 2.2, ease: 'none' }, 1.1)
    .fromTo(backLabel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.1)
  draw(beat17, hops[0], 1.1, 0.4)
  later.forEach(({ el: frame, image }, i) => {
    const at = 1.45 + i * 0.36
    draw(beat17, hops[i + 1], at, 0.4)
    beat17
      .fromTo(frame, { x: -BACK.pitch, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, at)
      .to(image, { frame: 1, duration: 0.6, ease: 'power1.out', onUpdate: image.render }, at)
  })

  return [beat12, beat13, beat14, beat15, beat16, beat17]
}
