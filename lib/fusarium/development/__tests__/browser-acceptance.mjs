import assert from "node:assert/strict"
import { chromium } from "playwright-core"

const base = process.env.FUSARIUM_BROWSER_BASE ?? "http://127.0.0.1:8012"
const executablePath = process.env.FUSARIUM_BROWSER_EXECUTABLE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const browser = await chromium.launch({ executablePath, headless: true })
const evidence = []

try {
  for (const viewport of [{ width: 1600, height: 900, name: "desktop" }, { width: 390, height: 844, name: "narrow" }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()) })

    for (const route of ["api", "functions", "sdk", "shell"]) {
      const response = await page.goto(`${base}/fusarium/${route}`, { waitUntil: "networkidle", timeout: 30_000 })
      assert.equal(response?.status(), 200, `${route} should return HTTP 200`)
      assert.equal(await page.locator("body").evaluate((body) => body.scrollWidth <= document.documentElement.clientWidth + 1), true, `${route} should not overflow horizontally at ${viewport.name}`)
    }

    await page.goto(`${base}/fusarium/api`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Check fixed GET contracts" }).click()
    await page.waitForFunction(() => !document.body.innerText.toLowerCase().includes("not probed"), undefined, { timeout: 10_000 })
    assert.equal(await page.locator('[aria-labelledby="contract-health-title"] article').count(), 4)
    assert.equal(await page.getByText("not probed", { exact: true }).count(), 0)

    await page.goto(`${base}/fusarium/functions`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Validate locally" }).click()
    await page.getByText("Shape compatible", { exact: true }).waitFor()
    await page.locator("textarea").fill('{"schema":"wrong"}')
    await page.getByRole("button", { name: "Validate locally" }).click()
    await page.getByText("Validation issues", { exact: true }).waitFor()

    await page.goto(`${base}/fusarium/sdk`, { waitUntil: "networkidle" })
    assert.match(await page.locator("pre").innerText(), /Generated from lib\/fusarium\/sensing-scope\/contracts\.ts/)
    await page.locator("select").nth(1).selectOption("json")
    assert.match(await page.locator("pre").innerText(), /fusarium-sensing-scope\/v1/)

    await page.goto(`${base}/fusarium/shell`, { waitUntil: "networkidle" })
    await page.getByText("LOCKED / UNAVAILABLE", { exact: false }).first().waitFor()
    assert.equal(await page.locator("textarea").count(), 0)
    assert.equal(await page.locator('input[placeholder*="command" i]').count(), 0)

    const knownRouterWarnings = errors.filter((message) => message.includes('OuterLayoutRouter') && message.includes('unique "key" prop'))
    const ownedErrors = errors.filter((message) => !knownRouterWarnings.includes(message))
    assert.deepEqual(ownedErrors, [], `owned browser errors at ${viewport.name}: ${ownedErrors.join(" | ")}`)
    evidence.push({ viewport: viewport.name, routes: 4, healthContracts: 4, functionsValidAndInvalid: true, sdkGenerated: true, shellLocked: true, inheritedOuterLayoutRouterWarnings: knownRouterWarnings.length })
    await context.close()
  }
  console.log(JSON.stringify({ ok: true, evidence }, null, 2))
} finally {
  await browser.close()
}
