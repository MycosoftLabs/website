import { chromium } from "../../../../node_modules/playwright-core/index.mjs"

const baseUrl = process.env.BLUESIGHT_QA_BASE_URL || "http://127.0.0.1:8012"
const browserPath = process.env.BLUESIGHT_QA_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"

const scope = { deviceId: "qa-device", missionId: "qa-mission", locationId: "qa-site", environmentId: "qa-forest" }
const records = ["camera", "radar", "lidar", "wifi"].map((modality, index) => ({
  recordId: `${modality}-qa`, modality, scope,
  observedAt: "2026-09-01T12:00:00.000Z", receivedAt: "2026-09-01T12:00:01.000Z",
  measurements: [{ name: modality === "camera" ? "frame_ref" : "reading", value: modality === "camera" ? "sha256:qa" : index + 1, unit: modality === "camera" ? "uri" : "unit" }],
  provenance: { sourceRef: `file:${modality}`, sourceRecordId: `${modality}-source`, sourceRevision: "qa-v1", collectionId: "qa-collection", deviceIdentityField: "device_id", observedAtField: "observed_at" },
  confidence: { value: null, basis: "QA source does not report confidence." },
  uncertainty: { value: null, unit: null, basis: "QA source does not report uncertainty." },
  classification: "UNCLASSIFIED",
}))
const fixture = JSON.stringify({ schema: "fusarium-bluesight-evidence/v1", mode: "REPLAY", datasetId: "qa-dataset", title: "QA multimodal replay", records })

const results = []
function check(value, label, detail = "") {
  results.push({ pass: Boolean(value), label, detail })
  if (!value) throw new Error(`${label}${detail ? `: ${detail}` : ""}`)
}

const browser = await chromium.launch({ executablePath: browserPath, headless: true, args: ["--disable-background-networking", "--disable-extensions", "--no-first-run"] })
try {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["narrow", { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, serviceWorkers: "block" })
    await context.route("**/api/**", async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === "/api/fusarium/bluesight/evidence") return route.continue()
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ devices: [], available: false }) })
    })
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    const response = await page.goto(`${baseUrl}/fusarium/bluesight`, { waitUntil: "domcontentloaded", timeout: 45_000 })
    check(response?.status() === 200, `${name}: route HTTP 200`, String(response?.status()))
    await page.getByRole("button", { name: /import replay/i }).waitFor({ state: "visible", timeout: 30_000 })
    await page.waitForTimeout(1_000)
    await page.locator('input[type="file"]').setInputFiles({ name: "bluesight-qa.json", mimeType: "application/json", buffer: Buffer.from(fixture) })
    await page.getByText("QA multimodal replay", { exact: true }).waitFor({ state: "visible", timeout: 15_000 })
    check(await page.getByText("4 scoped records", { exact: false }).isVisible(), `${name}: four replay records visible`)
    check(await page.getByText(/not an inferred track or detection/i).isVisible(), `${name}: strict fusion statement visible`)
    await page.getByRole("button", { name: "radar", exact: true }).click()
    check(await page.getByText("1 scoped records", { exact: false }).isVisible(), `${name}: modality filter works`)
    check(await page.getByText("radar-qa", { exact: true }).isVisible(), `${name}: selected record updates`)
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
    check(dimensions.scrollWidth <= dimensions.clientWidth + 1, `${name}: no document overflow`, JSON.stringify(dimensions))
    check(errors.length === 0, `${name}: no page errors`, errors.join(" | "))
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({ assertions: results.length, passed: results.filter((result) => result.pass).length, failed: results.filter((result) => !result.pass).length, results }, null, 2))
