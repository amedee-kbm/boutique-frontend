import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const OUT = '.shots'
mkdirSync(OUT, { recursive: true })

const sizes = [
  { name: '375', w: 375, h: 812 },
  { name: '768', w: 768, h: 1024 },
  { name: '1280', w: 1280, h: 900 },
]

const routes = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'category', path: '/category/dresses' },
  { name: 'product', path: '/product/satin-evening-gown' },
  { name: 'selection', path: '/selection' },
  { name: 'chat', path: '/chat' },
]

const browser = await chromium.launch()
for (const s of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  for (const r of routes) {
    try {
      await page.goto(BASE + r.path, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${OUT}/${r.name}-${s.name}.png`, fullPage: true })
      console.log(`ok  ${r.name}-${s.name}`)
    } catch (e) {
      console.log(`ERR ${r.name}-${s.name}: ${e.message.split('\n')[0]}`)
    }
  }
  // Try to open the filter sheet on the category page
  try {
    await page.goto(BASE + '/category/dresses', { waitUntil: 'networkidle', timeout: 60000 })
    const btn = page.getByRole('button', { name: /filter/i }).first()
    if (await btn.count()) {
      await btn.click({ timeout: 4000 })
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${OUT}/filtersheet-${s.name}.png`, fullPage: true })
      console.log(`ok  filtersheet-${s.name}`)
    }
  } catch (e) {
    console.log(`ERR filtersheet-${s.name}: ${e.message.split('\n')[0]}`)
  }
  await ctx.close()
}
await browser.close()
console.log('done')
