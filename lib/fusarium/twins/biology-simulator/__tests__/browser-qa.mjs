import assert from "node:assert/strict"
import { chromium } from "../../../../../node_modules/playwright-core/index.mjs"

const executablePath = process.env.FUSARIUM_BROWSER_EXECUTABLE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const browser = await chromium.launch({ executablePath, headless: true, args: ["--disable-background-networking", "--disable-extensions", "--no-first-run"] })
const results = []

try {
  for (const viewport of [{ name: "desktop", width: 1600, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto("http://127.0.0.1:8012/fusarium/biology-simulator", { waitUntil: "networkidle", timeout: 30000 })
    await page.locator("[data-fusarium-biology-workbench]").waitFor()
    assert.equal(await page.locator("h1").textContent(), "Biology Simulator")
    assert.equal(await page.locator('nav[aria-label="Biology models"] button').count(), 4)
    assert.equal(await page.locator('svg[aria-label="Simulated series over time"]').count(), 1)
    for (const label of ["Exponential growth / decay", "Two-population competition", "SIR compartments", "Logistic growth"]) {
      await page.getByRole("button", { name: new RegExp(label) }).click()
      await page.getByRole("button", { name: "Run deterministic scenario" }).click()
      assert.equal(await page.locator('svg[aria-label="Simulated series over time"]').count(), 1)
    }
    await page.getByRole("button", { name: /Two-population competition/ }).click()
    assert.equal(await page.locator('svg[aria-label="Competition phase plot"]').count(), 1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    assert.equal(overflow, false)
    assert.deepEqual(errors, [])
    results.push({ viewport: viewport.name, title: await page.title(), modelButtons: 4, pageErrors: errors.length, horizontalOverflow: overflow })
    await page.close()
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2))
} finally {
  await browser.close()
}
