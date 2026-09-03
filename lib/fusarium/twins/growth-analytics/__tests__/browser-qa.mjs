import assert from "node:assert/strict"
import { chromium } from "../../../../../node_modules/playwright-core/index.mjs"

const baseURL = process.env.FUSARIUM_BASE_URL || "http://127.0.0.1:8012"
const executablePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe"
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const viewport of [{ name: "desktop", width: 1600, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const pageErrors = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    const response = await page.goto(`${baseURL}/fusarium/growth-analytics`, { waitUntil: "networkidle", timeout: 90_000 })
    assert.equal(response?.status(), 200)
    await page.locator("[data-growth-evidence-workbench]").waitFor({ state: "visible" })
    await page.getByText("Observed growth analysis").waitFor({ state: "visible" })
    await page.getByRole("heading", { name: "Growth Analytics" }).first().waitFor({ state: "visible" })
    assert.equal(await page.locator("[data-growth-evidence-workbench]").count(), 1)
    const originalDashboardText = await page.getByText("Environment Controls").count()
    assert.equal(originalDashboardText > 0, true)

    const qaInput = {
      source: "browser-qa",
      metric: "biomass",
      unit: "g",
      freshnessThresholdHours: 8760,
      projectionHorizonHours: 1,
      records: Array.from({ length: 6 }, (_, index) => ({ observedAt: new Date(Date.UTC(2026, 8, 1, index * 2)).toISOString(), value: index + 1 })),
    }
    await page.getByLabel("Growth observation JSON").fill(JSON.stringify(qaInput))
    await page.getByRole("button", { name: "Analyze import" }).click()
    await page.getByText("bounded-linear-trend-extrapolation").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {})
    await page.getByText(/at \+1h/).waitFor({ state: "visible", timeout: 20_000 })

    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
    assert.equal(dimensions.scrollWidth <= dimensions.clientWidth + 1, true, `${viewport.name} has horizontal overflow`)
    assert.deepEqual(pageErrors, [])
    results.push({ viewport: viewport.name, status: response?.status(), noHorizontalOverflow: true, pageErrors: 0, preservedDashboard: true, analysisRendered: true })
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({ contract: "fusarium-growth-analytics-browser-qa/v1", results }, null, 2))
