// The title page, shown before the talk starts. It has no section and no
// time budget; the talk clock starts on the next beat.
import gsap from 'gsap'
import { assets, el, headline, label, place, rise, wordsIn } from '../kit'
import { title } from '../beats'

// Geometry on the 1920x1080 stage. The run sits where the image frame of the
// first beat is, so the next beat builds in the same place.
const NAME = { x: 104, y: 720 }
const RUN = { x: 1216, y: 214, size: 290, gap: 20, steps: [0, 2, 4, 6] }

export function titlePage(root: HTMLElement) {
  const heading = headline(root, title('0'), 1040)
  heading.el.classList.add('title-headline')
  heading.el.style.top = '300px'

  const rule = place(el('div', 'title-rule'), NAME.x, NAME.y - 44, 96, 8)
  const name = place(el('div', 'title-name', 'Lance Chrysler V. De Jesus'), NAME.x, NAME.y)
  root.append(rule, name)

  // Four real steps of the lighthouse run from the talk: noise to image.
  const frames = RUN.steps.map((step, k) => {
    const image = assets.three.lighthouse[step].cloneNode() as HTMLImageElement
    image.className = 'title-step'
    place(image, RUN.x + (k % 2) * (RUN.size + RUN.gap), RUN.y + Math.floor(k / 2) * (RUN.size + RUN.gap), RUN.size, RUN.size)
    root.append(image)
    return image
  })
  // The run reads from the top left to the bottom right, so the first
  // label sits above the first frame and the last label below the last frame.
  const span = 2 * RUN.size + RUN.gap
  const from = label(root, 'pure noise', RUN.x + RUN.size / 2, RUN.y - 56, 'caption', RUN.size)
  const to = label(root, 'image', RUN.x + RUN.size + RUN.gap + RUN.size / 2, RUN.y + span + 24, 'caption', RUN.size)

  const beat0 = gsap.timeline()
  wordsIn(beat0, heading, 0)
  beat0.fromTo(rule, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, 0.5)
  rise(beat0, name, 0.6)
  beat0.fromTo(frames, { scale: 0.92, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'power3.out', stagger: 0.12 }, 0.4)
  rise(beat0, [from, to], 0.9)
  return [beat0]
}
