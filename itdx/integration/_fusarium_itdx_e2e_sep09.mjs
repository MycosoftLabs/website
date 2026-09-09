import {chromium} from 'playwright'
import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'

const outDir = path.join(import.meta.dirname, '.browser-proof', 'sep09-walkthrough')
await mkdir(outDir, {recursive: true})
const report = {date: '2026-09-09', steps: []}
const browser = await chromium.launch({headless: true})
const page = await browser.newPage({viewport: {width: 1400, height: 900}})
page.setDefaultTimeout(25000)

const session = await page.goto('http://localhost:3010/api/auth/local-dev-session?redirectTo=/fusarium/itdx', {waitUntil: 'domcontentloaded'})
report.steps.push({name: 'local-dev-session', status: session?.status(), url: page.url()})
await page.waitForTimeout(1200)
await page.screenshot({path: path.join(outDir, 'fusarium-itdx-after-session.png'), fullPage: true})
const text = await page.locator('body').innerText()
report.steps.push({
  name: 'fusarium-itdx-after-session',
  url: page.url(),
  text_len: text.length,
  snippet: text.slice(0, 400).replace(/\s+/g, ' '),
  hasWalkthrough: /walkthrough|Form Space|Algorithm lab|Pattern/i.test(text),
  isLogin: /Owner sign-in|Sign in to Fusarium/i.test(text),
})

const views = ['Walkthrough', 'Algorithm lab', 'NLM / Form Space', 'Form Space', 'Documents']
for (const label of views) {
  const btn = page.getByRole('button', {name: new RegExp(label, 'i')})
  if (await btn.count()) {
    await btn.first().click()
    await page.waitForTimeout(600)
    const t = await page.locator('body').innerText()
    report.steps.push({name: 'view-' + label, pass: t.length > 80, text_len: t.length, snippet: t.slice(0, 180).replace(/\s+/g, ' ')})
    await page.screenshot({path: path.join(outDir, `fusarium-view-${label.replace(/\W+/g, '-')}.png`), fullPage: true})
  }
}

// Also complete 8766 algorithm-lab guided walkthrough
await page.goto('http://127.0.0.1:8766/', {waitUntil: 'domcontentloaded'})
await page.waitForTimeout(800)
const guided = page.getByRole('link', {name: /Guided walkthrough/i}).or(page.getByRole('button', {name: /Guided walkthrough/i}))
if (await guided.count()) {
  await guided.first().click()
  await page.waitForTimeout(500)
}
const lab = await page.locator('body').innerText()
report.steps.push({name: '8766-algorithm-lab', text_len: lab.length, snippet: lab.slice(0, 500).replace(/\s+/g, ' ')})
await page.screenshot({path: path.join(outDir, '8766-algorithm-lab-walkthrough.png'), fullPage: true})

let walked = 0
for (let i = 0; i < 10; i++) {
  const n = page.locator('button.primary[data-action="guide"]:not([disabled])')
  if (!(await n.count()) || !(await n.first().isEnabled().catch(() => false))) break
  await n.first().click()
  await page.waitForTimeout(400)
  walked++
  await page.screenshot({path: path.join(outDir, `8766-walk-step-${i + 1}.png`), fullPage: true})
}
const guide = await page.locator('[data-step], .guide, #walkthrough, [id*="walk"]').innerText().catch(() => '')
report.steps.push({name: '8766-walk-next-clicks', walked, guide: guide.slice(0, 400)})

await browser.close()
await writeFile(path.join(outDir, 'fusarium-e2e.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
