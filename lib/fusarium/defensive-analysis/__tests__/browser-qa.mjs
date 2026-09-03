import assert from "node:assert/strict"
import { chromium } from "playwright-core"

const base = process.env.FUSARIUM_BROWSER_BASE ?? "http://127.0.0.1:8012"
const executablePath = process.env.FUSARIUM_BROWSER_EXECUTABLE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const proof = (id) => ({ sourceRef: "browser-qa", evidenceId: id, observedAt: "2026-09-01T20:00:00Z", receivedAt: "2026-09-01T20:00:01Z" })
const cases = [
  { route: "environmental-object-tracker", title: "Environmental Object Tracker", payload: { schema: "fusarium-environmental-track-replay/v1", records: [{ recordId: "r1", objectId: "deer-1", objectClass: "wildlife", latitude: 32, longitude: -117, observedAt: "2026-09-01T20:00:00Z", confidence: .8, uncertaintyM: 20, provenance: proof("r1") }] }, result: "1 track" },
  { route: "multisensor-track-fusion", title: "Multi-Sensor Track Fusion", payload: { schema: "fusarium-multisensor-fusion-replay/v1", observations: [{ recordId: "r1", objectId: "deer-1", objectClass: "wildlife", latitude: 32, longitude: -117, observedAt: "2026-09-01T20:00:00Z", confidence: .8, uncertaintyM: 20, provenance: proof("r1"), modality: "camera", scope: { missionId: "m1", locationId: "site1", environmentId: "forest" }, trackHint: null }] }, result: "1 fusion group" },
  { route: "indicator-watchlist", title: "Indicator Watchlist", payload: { schema: "fusarium-indicator-watchlist/v1", rules: [{ ruleId: "pm-high", metric: "pm2.5", operator: "gte", threshold: 35 }], evidence: [{ evidenceId: "e1", metrics: { "pm2.5": 40 }, provenance: proof("e1") }] }, result: "1 evidence match" },
  { route: "classification-release-checker", title: "Classification / Releaseability Checker", payload: { schema: "fusarium-releaseability-metadata/v1", title: "QA", classification: "UNCLASSIFIED", handling: ["INTERNAL-REVIEW"], sourceRefs: ["e1"], intendedRecipients: ["US_INTERNAL"] }, result: "metadata-compatible" },
]

const browser = await chromium.launch({ executablePath, headless: true })
const evidence = []
try {
  for (const viewport of [{ width: 1600, height: 900, name: "desktop" }, { width: 390, height: 844, name: "mobile" }]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    for (const item of cases) {
      const response = await page.goto(`${base}/fusarium/tools/${item.route}`, { waitUntil: "networkidle", timeout: 30_000 })
      assert.equal(response?.status(), 200)
      await page.getByRole("heading", { name: item.title }).waitFor()
      await page.getByRole("button", { name: "Run local analysis" }).click()
      await page.getByText("Empty input is unbound", { exact: false }).waitFor()
      await page.locator("textarea").fill(JSON.stringify(item.payload))
      await page.getByRole("button", { name: "Run local analysis" }).click()
      await page.getByText(item.result, { exact: false }).first().waitFor()
      assert.equal(await page.locator("body").evaluate((body) => body.scrollWidth <= document.documentElement.clientWidth + 1), true)
    }
    const owned = errors.filter((message) => !message.includes("OuterLayoutRouter"))
    assert.deepEqual(owned, [])
    evidence.push({ viewport: viewport.name, routes: cases.length, emptyUnbound: true, localAnalysis: true, horizontalOverflow: false })
    await page.close()
  }
  console.log(JSON.stringify({ ok: true, evidence }, null, 2))
} finally { await browser.close() }
