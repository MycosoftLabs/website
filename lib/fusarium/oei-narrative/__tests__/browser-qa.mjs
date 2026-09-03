/**
 * Live browser audit for the native OEI Narrative route.
 *
 * Run while twins-host is available on 8012:
 *   node lib/fusarium/oei-narrative/__tests__/browser-qa.mjs
 */
import { pathToFileURL } from "node:url"

let chromium
try {
  ;({ chromium } = await import("playwright"))
} catch {
  const fallback = "D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/node_modules/playwright/index.mjs"
  ;({ chromium } = await import(pathToFileURL(fallback).href))
}

const baseURL = process.argv[2] || "http://127.0.0.1:8012"
const browser = await chromium.launch({ headless: true })
const results = []
const problems = []

async function audit(name, viewport, options = {}) {
  const context = await browser.newContext({
    baseURL,
    viewport,
    colorScheme: "dark",
    reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
  })
  const page = await context.newPage()
  const errors = []
  const expectedDegradedConsole = []
  const expectedSharedConsole = []
  const externalRequests = []
  const failedResponses = []
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() !== "error") return
    const location = message.location().url || ""
    if (location.includes("/api/fusarium/v1")) {
      expectedDegradedConsole.push(`console: ${message.text()}`)
      return
    }
    if (message.text().includes('Check the render method of `OuterLayoutRouter`')) {
      expectedSharedConsole.push(`console: ${message.text()}`)
      return
    }
    errors.push(`console: ${message.text()}`)
  })
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url())
  })
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/api/fusarium/v1")) {
      failedResponses.push(`${response.status()} ${response.url()}`)
    }
  })

  const response = await page.goto("/fusarium/oei?mode=simulated&timeWindow=24h", {
    waitUntil: "commit",
    timeout: 120_000,
  })
  await page.getByRole("heading", { name: "OEI Narrative", exact: true }).waitFor({ timeout: 120_000 })
  await page.getByText(/SIMULATED · SANITIZED · EXERCISE ONLY/).waitFor({ timeout: 30_000 })
  await page.getByText("Drainage conductivity change", { exact: true }).first().waitFor({ timeout: 30_000 })
  await page.getByRole("button", { name: "Select Soil-moisture co-change, Land / soil" }).click()
  await page.waitForFunction(() => new URL(location.href).searchParams.get("objectId") === "demo.object.soil-moisture")
  await page.getByRole("heading", { name: "Synthetic soil-moisture observation", level: 3 }).waitFor()
  const selectionFollowsUrl = new URL(page.url()).searchParams.get("evidenceId") === "demo.evidence.soil-01"

  const pageFacts = await page.evaluate(() => {
    const main = document.querySelector("main")
    if (!main) return { missingMain: true }
    const interactive = Array.from(main.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])"))
    const unnamed = interactive.filter((element) => {
      if (element.matches("input,textarea,select") && element.closest("label")) return false
      const aria = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby")
      return !aria && !(element.textContent || "").trim()
    }).length
    const offscreen = Array.from(main.querySelectorAll("section, article, header, nav"))
      .map((element) => element.getBoundingClientRect())
      .filter((box) => box.width > 1 && (box.left < -2 || box.right > document.documentElement.clientWidth + 2))
      .length
    return {
      missingMain: false,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mainOverflow: main.scrollWidth - main.clientWidth,
      unnamed,
      offscreen,
      text: main.innerText,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }
  })

  const previewButton = page.getByRole("button", { name: "Preview package" })
  await page.keyboard.press("Tab")
  await previewButton.focus()
  const focusFacts = await previewButton.evaluate((element) => {
    const style = getComputedStyle(element)
    return { active: document.activeElement === element, outline: style.outlineStyle }
  })
  await page.keyboard.press("Enter")
  const previewDialog = page.getByRole("dialog", { name: /Sanitized environmental continuity brief 002/ })
  await previewDialog.waitFor()
  const closePreviewButton = page.getByRole("button", { name: "Close package preview" })
  const previewAutoFocused = await closePreviewButton.evaluate((element) => document.activeElement === element)
  await page.keyboard.press("Tab")
  const previewFocusTrapped = await closePreviewButton.evaluate((element) => document.activeElement === element)
  const exportDisabled = await page.getByRole("button", { name: "Export unavailable" }).isDisabled()
  await page.keyboard.press("Escape")
  await previewDialog.waitFor({ state: "hidden" })
  const previewFocusRestored = await previewButton.evaluate((element) => document.activeElement === element)

  const unsupported = page.getByLabel("Claim wording for demo.claim.biological-effect")
  await unsupported.click()
  await page.getByRole("button", { name: "Human review" }).click()
  const blockedNotice = await page.getByRole("status").filter({ hasText: /blocked by missing or failed evidence/ }).count()

  await page.getByRole("button", { name: "Save browser-local draft" }).click()
  const saved = await page.getByRole("status").filter({ hasText: /No server persistence occurred/ }).count()
  const localDraftKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("fusarium.oei-narrative.local-draft")))

  const handoffHref = await page
    .locator('main a[href^="/fusarium/situational-awareness?"]')
    .first()
    .getAttribute("href")
  const simulationText = String(pageFacts.text || "")
  const assertions = {
    http200: response?.status() === 200,
    noDocumentOverflow: Number(pageFacts.documentOverflow) <= 4,
    noMainOverflow: Number(pageFacts.mainOverflow) <= 4,
    noOffscreenPanels: Number(pageFacts.offscreen) === 0,
    controlsNamed: Number(pageFacts.unnamed) === 0,
    focusVisible: focusFacts.active && focusFacts.outline !== "none",
    previewKeyboardBoundary: previewAutoFocused && previewFocusTrapped && previewFocusRestored,
    exportDisabled,
    unsupportedBlocked: blockedNotice > 0,
    browserLocalSave: saved > 0 && localDraftKeys.length > 0,
    selectionFollowsUrl,
    handoffPreservesContext:
      Boolean(handoffHref?.includes("mode=simulated")) &&
      Boolean(handoffHref?.includes("missionAreaId=demo.area")) &&
      Boolean(handoffHref?.includes("classification=UNCLASSIFIED")),
    simulationExplicit: /SIMULATED · SANITIZED/.test(simulationText),
    unsupportedExplicit: /BLOCKED/.test(simulationText),
    noDisabledConnectorRequests: !externalRequests.some((url) => /palantir|anduril|lattice|platform.?one|jadc2/i.test(url)),
    noUnexpectedResponses: failedResponses.length === 0,
    noConsoleErrors: errors.length === 0,
    reducedMotionMatches: options.reducedMotion ? pageFacts.reducedMotion === true : true,
  }
  for (const [key, ok] of Object.entries(assertions)) if (!ok) problems.push(`${name}: ${key}`)
  results.push({
    name,
    viewport,
    assertions,
    diagnostics: {
      documentOverflow: pageFacts.documentOverflow,
      mainOverflow: pageFacts.mainOverflow,
      offscreenPanels: pageFacts.offscreen,
      unnamedControls: pageFacts.unnamed,
      errors,
      expectedDegradedConsole,
      expectedSharedConsole,
      failedResponses,
      externalRequests,
      handoffHref,
    },
  })
  await context.close()
}

await audit("desktop-1280x720", { width: 1280, height: 720 })
await audit("narrow-375x812", { width: 375, height: 812 })
await audit("reduced-motion-1280x720", { width: 1280, height: 720 }, { reducedMotion: true })

// The running 8011 process may be the older not-bound build. Verify that LIVE
// remains unavailable and never inherits the scenario fixture.
const liveContext = await browser.newContext({ baseURL, viewport: { width: 1280, height: 720 } })
const livePage = await liveContext.newPage()
await livePage.goto("/fusarium/oei?mode=live", { waitUntil: "commit", timeout: 120_000 })
await livePage.getByRole("heading", { name: "OEI Narrative", exact: true }).waitFor({ timeout: 120_000 })
await livePage.getByText(/running process does not expose a verified Fusarium intelligence v1 contract/i).waitFor({ timeout: 30_000 })
const liveText = await livePage.locator('main[data-mode="live"]').innerText()
const liveAssertions = {
  unavailableVisible: /DEGRADED|UNAVAILABLE/.test(liveText),
  noScenarioObjects: !/Drainage conductivity change|Synthetic conductivity observation/.test(liveText),
  noPublicationHistory: /No publication repository/.test(liveText),
  noOperationalZero: !/Environmental objects\s+0\b/.test(liveText),
}
for (const [key, ok] of Object.entries(liveAssertions)) if (!ok) problems.push(`live-unavailable: ${key}`)
results.push({ name: "live-unavailable", assertions: liveAssertions })
await liveContext.close()

// Shared Fusarium links may carry dataMode without mode. FORECAST must remain
// fail-closed and must round-trip through OEI handoffs without becoming LIVE.
const forecastContext = await browser.newContext({ baseURL, viewport: { width: 1280, height: 720 } })
const forecastPage = await forecastContext.newPage()
await forecastPage.goto(
  "/fusarium/oei?dataMode=forecast&missionId=mission.alpha&missionAreaId=area.alpha&timeWindow=72h",
  { waitUntil: "commit", timeout: 120_000 },
)
await forecastPage.getByRole("heading", { name: "OEI Narrative", exact: true }).waitFor({ timeout: 120_000 })
await forecastPage.locator('main[data-mode="forecast"]').waitFor({ timeout: 30_000 })
const forecastHandoff = await forecastPage
  .locator('main a[href^="/fusarium/data-fusion?"]')
  .first()
  .getAttribute("href")
const forecastAssertions = {
  sharedModePreserved: new URL(forecastPage.url()).searchParams.get("dataMode") === "forecast",
  forecastSelected: await forecastPage.getByRole("button", { name: "FORECAST" }).getAttribute("aria-pressed") === "true",
  liveNotSelected: await forecastPage.getByRole("button", { name: "LIVE" }).getAttribute("aria-pressed") === "false",
  noCurrentOrScenarioObjects: !(await forecastPage.locator('main[data-mode="forecast"]').innerText()).includes("Drainage conductivity change"),
  handoffPreservesForecast:
    Boolean(forecastHandoff?.includes("mode=forecast")) &&
    Boolean(forecastHandoff?.includes("dataMode=forecast")),
}
for (const [key, ok] of Object.entries(forecastAssertions)) if (!ok) problems.push(`shared-forecast: ${key}`)
results.push({ name: "shared-forecast", assertions: forecastAssertions, diagnostics: { forecastHandoff } })
await forecastContext.close()

await browser.close()
console.log(JSON.stringify({ baseURL, results, problems }, null, 2))
if (problems.length) process.exitCode = 1
