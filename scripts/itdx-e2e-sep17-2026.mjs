/**
 * ITDX 2.0 / Trail AR play-through (17 Sep 2026). Not a score claim.
 * live: false. Does not invent WEKA F1.
 */
import { chromium } from "@playwright/test"
import fs from "fs"
import path from "path"

const OUT = path.join(process.cwd(), "screenshots", "itdx-e2e-sep17-2026")
fs.mkdirSync(OUT, { recursive: true })

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function probeOverlay(page) {
  return page.evaluate(() => {
    const v = document.querySelector("video")
    const overlay = window.__trailOverlay || null
    const tick = window.__trailTick || null
    return {
      href: location.href,
      video: v
        ? {
            src: v.currentSrc || v.src,
            paused: v.paused,
            readyState: v.readyState,
            currentTime: v.currentTime,
            duration: v.duration,
            w: v.videoWidth,
            h: v.videoHeight,
          }
        : null,
      overlay,
      tick,
      embed: Boolean(document.querySelector('[data-testid="bluesight-trail-embed"]')),
      v2player: Boolean(document.querySelector('[data-testid="itdx-v2-trail-player"]')),
      overhead: Boolean(document.querySelector('[data-testid="bluesight-trail-overhead-map"]')),
    }
  })
}

async function playThrough(page, seconds) {
  const errors = []
  const pageErrors = []
  page.on("pageerror", (err) => pageErrors.push(String(err)))
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
  })
  await page.evaluate(async () => {
    const v = document.querySelector("video")
    if (!v) return
    v.muted = true
    try {
      await v.play()
    } catch {
      /* autoplay policy */
    }
  })
  const start = await probeOverlay(page)
  const t0 = Date.now()
  while (Date.now() - t0 < seconds * 1000) {
    await sleep(1000)
    const snap = await probeOverlay(page)
    if (!snap.video) break
  }
  const end = await probeOverlay(page)
  return { start, end, errors, pageErrors }
}

const report = { live: false, routes: {} }

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await context.newPage()
page.setDefaultTimeout(45000)

// v2
await page.goto("http://127.0.0.1:3010/fusarium/itdx/v2", { waitUntil: "domcontentloaded" })
await page.waitForTimeout(2500)
await page.screenshot({ path: path.join(OUT, "01-v2-board.png"), fullPage: true })
const v2probe = await probeOverlay(page)
const v2play = await playThrough(page, 12)
await page.screenshot({ path: path.join(OUT, "02-v2-after-12s.png"), fullPage: true })
let v2clickable = false
try {
  await page.getByRole("button", { name: /Pause|Play/i }).first().click({ timeout: 4000 })
  v2clickable = true
} catch {
  v2clickable = false
}
report.routes["/fusarium/itdx/v2"] = {
  probe: v2probe,
  play: { start: v2play.start.video, end: v2play.end.video, overlayEnd: v2play.end.overlay, tickEnd: v2play.end.tick },
  pageErrors: v2play.pageErrors,
  consoleErrors: v2play.errors.slice(0, 12),
  uiClickableAfterPlay: v2clickable,
}

// collapse / expand trail
try {
  await page.locator('[data-section="trail"] button').first().click({ timeout: 3000 })
  await page.waitForTimeout(400)
  await page.locator('[data-section="trail"] button').first().click({ timeout: 3000 })
  report.routes["/fusarium/itdx/v2"].glassTrailToggle = "ok"
} catch (e) {
  report.routes["/fusarium/itdx/v2"].glassTrailToggle = String(e)
}

// WEKA campaign / local weka sections
for (const id of ["nlm", "clock"]) {
  try {
    await page.locator(`[data-section="${id}"] button`).first().click({ timeout: 2000 })
    report.routes["/fusarium/itdx/v2"][`glass_${id}`] = "clicked"
  } catch (e) {
    report.routes["/fusarium/itdx/v2"][`glass_${id}`] = String(e)
  }
}

// connectivity + local-weka BFFs
const connectivity = await page.request.get("http://127.0.0.1:3010/api/fusarium/itdx/connectivity")
const connectivityOff = await page.request.get("http://127.0.0.1:3010/api/fusarium/itdx/connectivity?force=offline")
const localWeka = await page.request.get("http://127.0.0.1:3010/api/fusarium/itdx/local-weka")
report.bff = {
  connectivity: { status: connectivity.status(), body: await connectivity.json() },
  connectivityForceOffline: { status: connectivityOff.status(), body: await connectivityOff.json() },
  localWeka: { status: localWeka.status(), body: await localWeka.json() },
}

await page.goto("http://127.0.0.1:3010/fusarium/itdx/v2?force=offline", { waitUntil: "domcontentloaded" })
await page.waitForTimeout(2000)
await page.screenshot({ path: path.join(OUT, "03-v2-force-offline.png"), fullPage: true })
report.routes["/fusarium/itdx/v2?force=offline"] = {
  banner: await page.locator("body").innerText().then((t) => t.slice(0, 400)),
}

// ungated Trail AR
const trailPage = await context.newPage()
trailPage.setDefaultTimeout(45000)
await trailPage.goto("http://127.0.0.1:3010/natureos/bluesight-trail", { waitUntil: "domcontentloaded" })
await trailPage.waitForTimeout(2500)
await trailPage.screenshot({ path: path.join(OUT, "04-trail-ungated.png"), fullPage: true })
const trailPlay = await playThrough(trailPage, 12)
await trailPage.screenshot({ path: path.join(OUT, "05-trail-after-12s.png"), fullPage: true })
let trailClickable = false
try {
  await trailPage.getByRole("button", { name: /Pause|Play/i }).first().click({ timeout: 4000 })
  await trailPage.getByRole("button", { name: /Pause|Play/i }).first().click({ timeout: 4000 })
  trailClickable = true
} catch {
  trailClickable = false
}
report.routes["/natureos/bluesight-trail"] = {
  play: {
    start: trailPlay.start.video,
    end: trailPlay.end.video,
    overlayEnd: trailPlay.end.overlay,
    tickEnd: trailPlay.end.tick,
    overhead: trailPlay.end.overhead,
  },
  pageErrors: trailPlay.pageErrors,
  consoleErrors: trailPlay.errors.slice(0, 12),
  uiClickableAfterPlay: trailClickable,
  timeAdvanced:
    (trailPlay.end.video?.currentTime ?? 0) > (trailPlay.start.video?.currentTime ?? 0) + 2,
}

// Fusarium ITDX (may 307)
const itdxResp = await page.request.get("http://127.0.0.1:3010/fusarium/itdx", { maxRedirects: 0 })
report.routes["/fusarium/itdx"] = {
  status: itdxResp.status(),
  location: itdxResp.headers()["location"] || null,
}
await page.goto("http://127.0.0.1:3010/fusarium/itdx", { waitUntil: "domcontentloaded" })
await page.waitForTimeout(1500)
await page.screenshot({ path: path.join(OUT, "06-fusarium-itdx.png"), fullPage: true })
report.routes["/fusarium/itdx"].finalUrl = page.url()

await browser.close()
const outJson = path.join(OUT, "report.json")
fs.writeFileSync(outJson, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
console.log("SCREENSHOTS", OUT)
