import { chromium } from "playwright"

const url = "http://localhost:3010/natureos/bluesight-trail"
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(60000)
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })
await page.waitForFunction(() => {
  const v = document.querySelector("video")
  return Boolean(v && v.readyState >= 2)
})
await page.evaluate(async () => {
  const v = document.querySelector("video")
  if (v) {
    v.muted = true
    await v.play().catch(() => undefined)
  }
})
await page.waitForFunction(() => window.__trailLoop && window.__trailLoop.logged > 0, { timeout: 20000 }).catch(() => null)
const mid = await page.evaluate(() => window.__trailLoop ?? null)
await page.evaluate(() => {
  const v = document.querySelector("video")
  if (v && Number.isFinite(v.duration) && v.duration > 1) {
    v.currentTime = Math.max(0.01, v.duration - 0.28)
  }
})
await page.waitForFunction(() => window.__trailLoop && window.__trailLoop.loop >= 1, { timeout: 12000 }).catch(() => null)
await page.waitForTimeout(2500)
const after = await page.evaluate(() => ({
  loop: window.__trailLoop ?? null,
  overlay: window.__trailOverlay
    ? { t: window.__trailOverlay.t, nContours: window.__trailOverlay.nContours, clocks: window.__trailOverlay.clocks }
    : null,
}))
const live = await page.locator("[data-testid=loop-refine-live]").textContent().catch(() => null)
await page.evaluate(async () => {
  if (typeof window.__trailFlushLearn === "function") await window.__trailFlushLearn()
})
await page.waitForTimeout(1200)
const api = await page.evaluate(async () => {
  const res = await fetch("/api/fusarium/bluesight-trail/loop-refine")
  return {
    json: await res.json(),
    flush: window.__trailFlushStatus ?? null,
    pending: window.__trailLoop ?? null,
  }
})
await browser.close()
console.log(JSON.stringify({ mid, after, live, api }, null, 2))
