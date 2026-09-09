import {chromium} from 'playwright'
import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'

const outDir = path.join(import.meta.dirname, '.browser-proof', 'sep09-walkthrough')
await mkdir(outDir, {recursive: true})
const result = {date: '2026-09-09', steps: [], white_screens: []}

function failWhite(html, name) {
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const white = text.length < 40 || /Something went wrong|Application error/i.test(html)
  if (white) result.white_screens.push(name)
  return {text_len: text.length, white}
}

const browser = await chromium.launch({headless: true})
const page = await browser.newPage({viewport: {width: 1400, height: 900}})
page.setDefaultTimeout(20000)

async function open(url, name) {
  const resp = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 25000})
  await page.waitForTimeout(800)
  const html = await page.content()
  const w = failWhite(html, name)
  const step = {name, url, status: resp?.status() ?? null, ...w}
  result.steps.push(step)
  await page.screenshot({path: path.join(outDir, `${name}.png`), fullPage: true})
  return step
}

await open('http://127.0.0.1:8766/formspace.html', 'fs8766-load')
await page.waitForFunction(() => {
  const s = document.getElementById('status')?.textContent || ''
  return /Bundled recorded|Local completed|model/i.test(s)
}, null, {timeout: 20000}).catch(() => {})
const tabs = [
  ['atlas', 'FormSpace atlas'],
  ['overview', 'Architecture'],
  ['patterns', '12'],
  ['links', '13'],
  ['options', '8'],
  ['map', '14'],
  ['behavior', 'Behav'],
]
for (const [id, label] of tabs) {
  const btn = page.locator(`button[data-tab="${id}"]`)
  const visible = await btn.count()
  if (!visible) {
    result.steps.push({name: `tab-${id}`, pass: false, reason: 'button missing'})
    continue
  }
  await btn.first().click()
  await page.waitForTimeout(400)
  const bodyText = await page.locator('main').innerText()
  const html = await page.content()
  const w = failWhite(html, `tab-${id}`)
  const hasMath = /F1|prediction|PASS|PAUSE|DENY|REVIEW|Borda|conformal|NOT_ESTIMATED|1\.0|atlas|prototype|recovery|form:/i.test(bodyText)
  result.steps.push({
    name: `tab-${id}`,
    label,
    pass: !w.white && bodyText.length > 80,
    hasMath,
    text_len: bodyText.length,
    snippet: bodyText.slice(0, 220).replace(/\s+/g, ' '),
  })
  await page.screenshot({path: path.join(outDir, `tab-${id}.png`), fullPage: true})
}

await open('http://127.0.0.1:8766/', 'fs8766-root')
const walk = page.locator('#walkthrough, [data-tab="walkthrough"], a[href*="walkthrough"]')
if (await walk.count()) {
  await walk.first().click()
  await page.waitForTimeout(400)
  result.steps.push({name: '8766-walkthrough-anchor', pass: true, text: (await page.locator('body').innerText()).slice(0, 200)})
}

try {
  await open('http://127.0.0.1:8765/formspace.html', 'fs8765-formspace')
} catch (e) {
  result.steps.push({name: 'fs8765-formspace', pass: false, reason: String(e.message || e)})
}
try {
  await open('http://127.0.0.1:8765/index.html#walkthrough', 'itdx8765-walkthrough')
} catch (e) {
  result.steps.push({name: 'itdx8765-walkthrough', pass: false, reason: String(e.message || e)})
}

const itdx = await page.goto('http://localhost:3010/fusarium/itdx', {waitUntil: 'domcontentloaded', timeout: 25000}).catch(e => e)
if (itdx && itdx.status) {
  const html = await page.content()
  const w = failWhite(html, 'fusarium-itdx-3010')
  result.steps.push({
    name: 'fusarium-itdx-3010',
    status: itdx.status(),
    url: page.url(),
    ...w,
    snippet: (await page.locator('body').innerText().catch(() => '')).slice(0, 240),
  })
  await page.screenshot({path: path.join(outDir, 'fusarium-itdx-3010.png'), fullPage: true})
} else {
  result.steps.push({name: 'fusarium-itdx-3010', pass: false, reason: String(itdx?.message || itdx)})
}

await browser.close()
result.pass = result.white_screens.length === 0 && result.steps.filter(s => s.pass === false).length === 0
const outFile = path.join(outDir, 'walkthrough.json')
await writeFile(outFile, JSON.stringify(result, null, 2))
console.log(JSON.stringify({outDir, pass: result.pass, white: result.white_screens, steps: result.steps.map(s => ({name: s.name, pass: s.pass, status: s.status, hasMath: s.hasMath, text_len: s.text_len}))}, null, 2))
