import assert from "node:assert/strict"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright-core"

const here = dirname(fileURLToPath(import.meta.url))
const fixture = join(here, "..", "examples", "hyphae-local-replay.json")
const base = process.env.FUSARIUM_BROWSER_BASE ?? "http://127.0.0.1:8012"
const executablePath = process.env.FUSARIUM_BROWSER_EXECUTABLE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const browser = await chromium.launch({ executablePath, headless: true })
const evidence = []
try {
  for (const viewport of [{ width: 1600, height: 900, name: "desktop" }, { width: 390, height: 844, name: "mobile" }]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    const response = await page.goto(`${base}/fusarium/sensing`, { waitUntil: "networkidle", timeout: 30_000 })
    assert.equal(response?.status(), 200)
    const selfTestButton = page.getByRole("button", { name: "Run instrument self-test" })
    await selfTestButton.click()
    await page.getByRole("button", { name: "Clear instrument self-test" }).waitFor()
    assert.equal(await page.locator('[data-visual-state="ready"]').count(), 13)
    assert.equal(await page.locator("p").filter({ hasText: /^SIMULATED ·/ }).count(), 13)
    const acousticPanel = page.locator('section[aria-label^="Acoustic waveform"]').first()
    const beforePath = await acousticPanel.locator("path").last().getAttribute("d")
    await page.waitForTimeout(600)
    const afterPath = await acousticPanel.locator("path").last().getAttribute("d")
    assert.notEqual(afterPath, beforePath)
    assert.equal(await page.locator('svg[aria-label*="particle sample distribution"] circle').count() > 20, true)
    await page.getByRole("button", { name: "Clear instrument self-test" }).click()
    assert.equal(await page.locator('[data-visual-state="unbound"]').count() >= 11, true)
    await page.getByRole("button", { name: "Device(s)" }).click()
    await page.getByText("Mushroom 1", { exact: true }).first().waitFor({ timeout: 10_000 })
    assert.equal(await page.getByText("Hyphae 1", { exact: true }).count() > 0, true)
    await page.locator('input[type="file"]').setInputFiles(fixture)
    await page.getByText("Local replay accepted with 2 provenance-bearing sample series", { exact: false }).waitFor()
    await page.getByText("Hyphae Replay 1", { exact: true }).first().click()
    await page.getByText("Boards, processors, and sensor instances", { exact: true }).scrollIntoViewIfNeeded()
    await page.getByText(/Acoustic replay/).first().waitFor()
    await page.getByText(/BME690 replay/).first().waitFor()
    assert.equal(await page.getByText(/Acoustic replay spectrum/).count() > 0, true)
    assert.equal(await page.locator("body").evaluate((body) => body.scrollWidth <= document.documentElement.clientWidth + 1), true)
    const owned = errors.filter((message) => !message.includes("OuterLayoutRouter"))
    assert.deepEqual(owned, [])
    evidence.push({ viewport: viewport.name, selfTestPanels: 13, simulatedLabels: 13, animatedWaveform: true, particleScatter: true, earthInventoryVisible: true, importedDevice: true, sensorPanels: 2, waveformAndSpectrum: true, horizontalOverflow: false })
    await page.close()
  }
  console.log(JSON.stringify({ ok: true, evidence }, null, 2))
} finally { await browser.close() }
