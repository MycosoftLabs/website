import { chromium } from "playwright"

const BASE = "http://localhost:3010"

async function mint(context) {
  const page = await context.newPage()
  const res = await page.request.post(`${BASE}/api/auth/local-dev-session`, {
    data: { redirectTo: "/fusarium/earth-simulator" },
  })
  const body = await res.json().catch(() => ({}))
  await page.close()
  return { status: res.status(), body }
}

async function expandOverlay(page) {
  const overlay = page.locator('[data-testid="itdx-earth-sim-overlay"]')
  const toggle = overlay.locator('button[aria-controls="itdx-earth-sim-overlay-body"]')
  if (!(await overlay.count())) return { present: 0, toggleLabel: "" }
  const label = (await toggle.innerText()).trim()
  if (/expand/i.test(label)) await toggle.click()
  await page.waitForTimeout(800)
  return { present: 1, toggleLabel: (await toggle.innerText()).trim() }
}

async function probeEarthSim(page, viewport, shot) {
  await page.setViewportSize(viewport)
  const errors = []
  page.on("pageerror", (err) => errors.push(String(err)))
  await page.goto(`${BASE}/fusarium/earth-simulator`, { waitUntil: "domcontentloaded", timeout: 90000 })
  await page.waitForTimeout(5000)
  const overlayInfo = await expandOverlay(page)
  const banner = page.locator('[data-testid="itdx-synthetic-exercise-banner"]')
  const briefing = page.locator('[data-testid="itdx-synthetic-army-intel-briefing"]')
  await banner.waitFor({ timeout: 10000 }).catch(() => null)
  const bannerText = (await banner.count()) ? await banner.innerText() : ""
  const briefingText = (await briefing.count()) ? await briefing.innerText() : ""
  const play = page.locator('[data-testid="itdx-briefing-play"]')
  if (await play.count()) await play.click()
  await page.waitForTimeout(800)
  const playLabel = (await play.count()) ? await play.innerText() : ""
  const itdxTab = page.locator('[data-crep-left-tab="itdx"]')
  if (await itdxTab.count()) {
    await itdxTab.click()
    await page.waitForTimeout(1200)
  }
  const feedBrief = page.locator('[data-testid="itdx-left-panel"] [data-testid="itdx-synthetic-army-intel-briefing"]')
  const feedBanner = (await feedBrief.count()) ? await feedBrief.locator('[data-testid="itdx-synthetic-exercise-banner"]').innerText() : ""
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
  await page.screenshot({ path: shot, fullPage: false })
  const configuredDump = /not configured/i.test(`${bannerText}\n${briefingText}\n${feedBanner}`)
  return {
    viewport,
    overlay: overlayInfo,
    bannerText: bannerText.slice(0, 280),
    hasSyntheticBanner: /SYNTHETIC EXERCISE/i.test(bannerText),
    hasNotLiveCop: /not a live COP/i.test(bannerText),
    hasOverlayBriefing: (await briefing.count()) > 0,
    hasPirs: /PIR-W|Training \/ synthetic PIRs/i.test(briefingText),
    hasNlmStrip: /NLM \(not Ollama\)/i.test(briefingText),
    configuredDump,
    playLabel,
    hasIntelFeedBriefing: (await feedBrief.count()) > 0,
    feedBanner: feedBanner.slice(0, 200),
    overflow,
    pageErrors: errors.slice(0, 8),
  }
}

const browser = await chromium.launch({ channel: "msedge", headless: true })
const desktopCtx = await browser.newContext()
const ipadCtx = await browser.newContext()
const mintDesktop = await mint(desktopCtx)
const mintIpad = await mint(ipadCtx)
const desktopPage = await desktopCtx.newPage()
const ipadPage = await ipadCtx.newPage()
const desktop = await probeEarthSim(
  desktopPage,
  { width: 1280, height: 800 },
  "D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website-itdx-codex-v13/docs/_itdx_briefing_1280_sep10.png",
)
const ipad = await probeEarthSim(
  ipadPage,
  { width: 768, height: 1024 },
  "D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website-itdx-codex-v13/docs/_itdx_briefing_768_sep10.png",
)
await desktopPage.goto(`${BASE}/fusarium`, { waitUntil: "domcontentloaded", timeout: 60000 })
await desktopPage.waitForTimeout(1200)
const overlayOnOverview = await desktopPage.locator('[data-testid="itdx-earth-sim-overlay"]').count()
await desktopPage.goto(`${BASE}/fusarium/itdx`, { waitUntil: "domcontentloaded", timeout: 60000 })
await desktopPage.waitForTimeout(2000)
const workspaceBrief = await desktopPage.locator('[data-testid="itdx-synthetic-army-intel-briefing"]').count()
const workspaceBanner = workspaceBrief
  ? await desktopPage.locator('[data-testid="itdx-synthetic-exercise-banner"]').innerText()
  : ""
await browser.close()
console.log(
  JSON.stringify(
    {
      mintDesktop: mintDesktop.status,
      mintIpad: mintIpad.status,
      desktop,
      ipad,
      overlayOnOverview,
      workspaceBrief,
      workspaceBanner: workspaceBanner.slice(0, 220),
    },
    null,
    2,
  ),
)
