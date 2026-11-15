// Render the deck as a presenter sees it, one PDF page for every tap: the
// state where the deck rests after each key press, holds inside a beat
// included. Writes ../slides.pdf. The live demo is left out.
//
//   pnpm dev          (in another terminal)
//   node scripts/pdf.mjs
//
// Uses an installed Chrome or Chromium; set CHROME to its path if needed.
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const site = process.env.SITE ?? 'http://localhost:5173/'
const chrome =
  process.env.CHROME ??
  ['/opt/google/chrome/chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
if (!chrome) throw new Error('No Chrome found; set CHROME to its path.')
const target = new URL('../../slides.pdf', import.meta.url).pathname

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const browser = await puppeteer.launch({ executablePath: chrome, headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080 })
await page.goto(site, { waitUntil: 'networkidle0' })
await page.waitForSelector('.ov-card', { timeout: 30000 })
// The live-demo setup control is for the presenter only.
await page.addStyleTag({ content: '#setup { display: none !important; }' })

// The demo's beat id, from its card in the overview (its ref is "Demo").
const demo = await page.evaluate(() => Array.from(document.querySelectorAll('.ov-card')).find((card) => card.querySelector('.ov-meta span')?.textContent === 'Demo')?.dataset.id)
const last = await page.evaluate(() => document.querySelectorAll('.ov-card').length + 1)

/** Wait until the deck rests at a new position, then return it. */
async function settle(before) {
  await page.waitForFunction((b) => document.documentElement.dataset.rest && document.documentElement.dataset.rest !== b, { timeout: 120000, polling: 100 }, before)
  await wait(400)
  return page.evaluate(() => document.documentElement.dataset.rest)
}

// Start on the title page, then press the right arrow until the end.
await page.evaluate(() => (location.hash = 'b=0'))
await page.reload({ waitUntil: 'networkidle0' })
await page.addStyleTag({ content: '#setup { display: none !important; }' })
let rest = await settle('')
const shots = []
for (;;) {
  const id = await page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('b'))
  if (id !== demo) {
    shots.push(await page.screenshot({ type: 'jpeg', quality: 92, encoding: 'base64' }))
    console.log('captured', id, 'at', rest)
  }
  if (Number(rest) >= last - 1e-3) break
  // The demo's prompt field takes the keys while it has focus.
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('ArrowRight')
  rest = await settle(rest)
}

const sheet = await browser.newPage()
// A tap can end where the one before it rested (a beat that returns to its
// first state). Such a page looks the same as the page before it, so leave it out.
const diffs = await sheet.evaluate(async (all) => {
  const small = async (data) => {
    const img = new Image()
    img.src = `data:image/jpeg;base64,${data}`
    await img.decode()
    const canvas = new OffscreenCanvas(192, 108)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, 192, 108)
    return ctx.getImageData(0, 0, 192, 108).data
  }
  const pixels = await Promise.all(all.map(small))
  return pixels.map((p, i) => {
    if (i === 0) return 1e9
    let sum = 0
    for (let k = 0; k < p.length; k++) sum += Math.abs(p[k] - pixels[i - 1][k])
    return sum / p.length
  })
}, shots)
const SAME = 0.5
const kept = shots.filter((_, i) => diffs[i] > SAME)
console.log('left out', shots.length - kept.length, 'repeated pages; smallest differences', [...diffs].sort((a, b) => a - b).slice(0, 6).map((d) => d.toFixed(2)).join(' '))
await sheet.setContent(
  `<style>@page{size:1920px 1080px;margin:0}body{margin:0}img{display:block;width:1920px;height:1080px;break-after:page}</style>` +
    kept.map((data) => `<img src="data:image/jpeg;base64,${data}">`).join(''),
  { waitUntil: 'load' },
)
await sheet.pdf({ path: target, width: '1920px', height: '1080px', printBackground: true })
await browser.close()
console.log('wrote', target, `(${kept.length} pages)`)
