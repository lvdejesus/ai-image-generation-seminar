// A section page: the numeral and the title of a section, large, at the
// start of each section. The corner label of the section comes in on the
// next beat (see engine.ts).
import gsap from 'gsap'
import './section.css'
import { el, headline, place, wordsIn } from '../kit'
import { sections } from '../beats'
import type { SceneBuilder } from '../engine'

export function sectionPage(numeral: string): SceneBuilder {
  return (root) => {
    root.classList.add('section-page')
    const number = place(el('div', 'section-numeral', numeral), 104, 300)
    root.append(number)
    const heading = headline(root, sections[numeral], 1600)
    heading.el.classList.add('section-title')
    heading.el.style.top = '560px'
    const rule = place(el('div', 'title-rule'), 104, 500, 96, 8)
    root.append(rule)

    const page = gsap.timeline()
    page.fromTo(number, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0)
    page.fromTo(rule, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, 0.2)
    wordsIn(page, heading, 0.3)
    return [page]
  }
}
