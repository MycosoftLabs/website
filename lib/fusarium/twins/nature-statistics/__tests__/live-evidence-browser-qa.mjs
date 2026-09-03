import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "../../../../../node_modules/playwright-core/index.mjs"

const baseURL = process.env.FUSARIUM_BASE_URL || "http://127.0.0.1:8012"
const executablePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe"
const evidenceDir = path.resolve(process.cwd(), "../../docs/codex-handoffs/evidence/nature-statistics-live-evidence-sep01-2026")
await fs.mkdir(evidenceDir, { recursive: true })
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const viewport of [{ name: "desktop", width: 1600, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const pageErrors = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    const response = await page.goto(`${baseURL}/fusarium/nature-statistics`, { waitUntil: "domcontentloaded", timeout: 90_000 })
    assert.equal(response?.status(), 200)
    await page.locator("[data-fusarium-nature-statistics-live-evidence]").waitFor({ state: "visible", timeout: 90_000 })
    await page.getByText("Live evidence expansion").waitFor({ state: "visible" })
    await page.getByText("Humans & Population").waitFor({ state: "visible" })
    await page.getByText("Agentic Activity", { exact: true }).waitFor({ state: "visible" })
    assert.equal(await page.locator("[data-fusarium-nature-statistics-live-evidence] input").count() >= 2, true)
    assert.equal(await page.locator("[data-live-state]").count() >= 8, true)
    await page.locator('[data-live-state="live"]').first().waitFor({ state: "visible", timeout: 90_000 })
    assert.equal(await page.getByText("Plants").count() > 0, true)
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
    assert.equal(dimensions.scrollWidth <= dimensions.clientWidth + 1, true, `${viewport.name} has horizontal overflow`)
    assert.deepEqual(pageErrors, [])
    await page.locator("[data-fusarium-nature-statistics-live-evidence]").scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(evidenceDir, `${viewport.name}.png`), fullPage: true })
    results.push({ viewport: viewport.name, status: response?.status(), originalDashboard: true, liveExpansion: true, noHorizontalOverflow: true, pageErrors: 0 })
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({ contract: "fusarium-nature-statistics-live-evidence-browser-qa/v1", results }, null, 2))
