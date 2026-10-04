// Capture a thumbnail of every beat's finished state into public/thumbs/,
// for the overview (press O). Run it again after changing a beat's visuals.
//
//   pnpm dev          (in another terminal)
//   pnpm thumbs
//
// Uses an installed Chrome or Chromium; set CHROME to its path if needed.
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const site = process.env.SITE ?? 'http://localhost:5173/'
const chrome =
  process.env.CHROME ??
  ['/opt/google/chrome/chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
if (!chrome) throw new Error('No Chrome found; set CHROME to its path.')

const out = new URL('../public/thumbs/', import.meta.url).pathname
await mkdir(out, { recursive: true })

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const browser = await puppeteer.launch({ executablePath: chrome, headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 960, height: 540 })
await page.goto(site, { waitUntil: 'networkidle0' })
await page.waitForSelector('.ov-card', { timeout: 30000 })

const ids = await page.evaluate(() => Array.from(document.querySelectorAll('.ov-card'), (card) => card.dataset.id))
for (const id of ids) {
  // Changing the hash jumps straight to that beat's finished state.
  await page.evaluate((beat) => (location.hash = `b=${beat}`), id)
  await wait(500)
  await page.screenshot({ path: `${out}${id}.jpg`, type: 'jpeg', quality: 82 })
  console.log('wrote', `public/thumbs/${id}.jpg`)
}
await browser.close()
