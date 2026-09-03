import assert from "node:assert/strict"
import { chromium } from "playwright-core"

const baseURL = process.env.FUSARIUM_QA_URL ?? "http://127.0.0.1:8012"
const allowedOrigin = new URL(baseURL).origin
const realDeviceId = process.env.FUSARIUM_REAL_DEVICE_ID?.trim() ?? ""
const realDeviceStabilityMs = Math.max(5_000, Number(process.env.FUSARIUM_REAL_DEVICE_STABILITY_MS ?? 35_000))
const executablePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const manifest = {
  schema: "fusarium-device-capability-manifest/v1", classification: "UNCLASSIFIED",
  device: { id: "psathyrella-buoy-com4", registryId: "psathyrella-buoy-com4", name: "Psathyrella QA", type: "edge", status: "online", identityEvidence: "QA registry fixture" },
  boards: [], sensors: [{ id: "amb-0x77", modality: "thermal", model: "BME688", boardRef: null, processorRef: null,
    transport: { kind: "i2c", endpointRef: null, adapterState: "available" },
    calibration: { state: "current", calibratedAt: "2026-09-01T19:00:00Z", expiresAt: null, method: "QA fixture" },
    provenance: { sourceRef: "/api/mycobrain/devices", sourceRecordId: "qa-sensor", observedAt: "2026-09-01T20:00:00Z", receivedAt: "2026-09-01T20:00:01Z" } }],
  mission: null, location: { id: "lab", label: "Lab" }, environment: { id: "indoor", label: "Indoor" },
  provenance: { sourceRef: "/api/mycobrain/devices", sourceRecordId: "qa-device", receivedAt: "2026-09-01T20:00:01Z" },
}
const snapshot = { schema: "fusarium-device-capability-snapshot/v1", state: "available", checkedAt: "2026-09-01T20:00:02Z", devices: [manifest], sources: [{ sourceRef: "/api/mycobrain/devices", state: "available", recordCount: 1, message: "QA fixture" }], rejectedRecords: 0, message: "QA fixture" }
const telemetry = { schema: "fusarium-sensing-telemetry/v1", state: "available", evaluatedAt: "2026-09-01T20:00:03Z", selectedDeviceIds: ["psathyrella-buoy-com4"], sampleSeries: [{ deviceId: "psathyrella-buoy-com4", sensorId: "bme688_1@0x77:temperature", modality: "thermal", unit: "°C", timestamps: ["2026-09-01T20:00:00Z", "2026-09-01T20:00:01Z"], values: [25.4, 25.5], provenance: { sourceId: "/api/psathyrella/bme", evidenceId: "psathyrella-bme-temperature", observedAt: "2026-09-01T20:00:01Z", receivedAt: "2026-09-01T20:00:02Z", mode: "LIVE" }, state: "available" }], sourceRuns: [], message: "1 exact device sensor series passed the selected-device telemetry contract." }

async function establishOwnerSession(context, redirectTo = "/fusarium/sensing") {
  const response = await context.request.post(`${baseURL}/api/auth/local-dev-session`, {
    headers: { Origin: allowedOrigin },
    data: { redirectTo },
    failOnStatusCode: false,
  })
  const body = await response.json().catch(() => null)
  assert.equal(response.status(), 200)
  assert.equal(body?.success, true)
}

async function exerciseRealSelectedDevice(browser, deviceId) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await establishOwnerSession(context, `/fusarium/sensing?senseScope=devices&deviceId=${encodeURIComponent(deviceId)}`)
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  try {
    await page.goto(`${baseURL}/fusarium/sensing?senseScope=devices&deviceId=${encodeURIComponent(deviceId)}`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.getByRole("button", { name: "Enable live sensor reads" }).waitFor({ timeout: 30_000 })
    await page.getByRole("button", { name: "Enable live sensor reads" }).click()
    await page.getByRole("button", { name: "Stop live sensor reads" }).waitFor({ timeout: 30_000 })
    await page.getByText(/\d+ exact device sensor series passed the selected-device telemetry contract\./).waitFor({ timeout: 60_000 })
    const checkpoints = []
    const startedAt = Date.now()
    while (Date.now() - startedAt < realDeviceStabilityMs) {
      await page.waitForTimeout(Math.max(1, Math.min(5_000, realDeviceStabilityMs - (Date.now() - startedAt))))
      const body = await page.locator("body").innerText()
      checkpoints.push({
        elapsedMs: Date.now() - startedAt,
        selected: await page.locator('input[type="checkbox"]:checked').count() > 0,
        liveIntent: await page.getByRole("button", { name: "Stop live sensor reads" }).count() === 1,
        acceptedSeries: /\d+ exact device sensor series passed the selected-device telemetry contract\./.test(body),
        selectedDeviceVisual: body.toLocaleLowerCase().includes(`· ${deviceId.toLocaleLowerCase()}`),
        refreshError: /latest selected-device refresh is unavailable|authentication is required/i.test(body),
      })
    }
    assert.equal(checkpoints.length > 0, true)
    assert.equal(
      checkpoints.every((checkpoint) => checkpoint.selected && checkpoint.liveIntent && checkpoint.acceptedSeries && checkpoint.selectedDeviceVisual && !checkpoint.refreshError),
      true,
      `real-device selection or telemetry did not remain stable: ${JSON.stringify(checkpoints)}`,
    )
    assert.deepEqual(pageErrors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
    return { deviceId, stabilityMs: realDeviceStabilityMs, checkpoints: checkpoints.length, pageErrors }
  } finally {
    await context.close()
  }
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  for (const viewport of [{ width: 1600, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    await establishOwnerSession(context)
    const page = await context.newPage()
    const errors = []
    const telemetryURLs = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.route("**/api/fusarium/device-capabilities", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snapshot) }))
    await page.route("**/api/fusarium/sensing-telemetry?*", (route) => { telemetryURLs.push(route.request().url()); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(telemetry) }) })
    await page.goto(`${baseURL}/fusarium/sensing?senseScope=devices&deviceId=psathyrella-buoy-com4`, { waitUntil: "domcontentloaded", timeout: 30_000 })
    await page.getByText("1 exact device sensor series passed the selected-device telemetry contract.").waitFor({ timeout: 30_000 })
    assert.match(telemetryURLs[0], /deviceId=psathyrella-buoy-com4/)
    assert.doesNotMatch(telemetryURLs[0], /live=1/)
    await page.getByRole("button", { name: "Enable live sensor reads" }).click()
    await page.getByRole("button", { name: "Stop live sensor reads" }).waitFor({ timeout: 30_000 })
    await page.waitForTimeout(250)
    assert.equal(telemetryURLs.some((url) => /live=1/.test(url)), true)
    assert.equal((await page.locator("body").innerText()).includes("LIVE · °C · /api/psathyrella/bme"), true)
    assert.deepEqual(errors, [])
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    assert.equal(overflow, false)
    await context.close()
  }
  const runtimeContext = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const runtimePage = await runtimeContext.newPage()
  const runtimeErrors = []
  runtimePage.on("pageerror", (error) => runtimeErrors.push(error.message))
  await runtimePage.goto(`${baseURL}/fusarium/sensing?senseScope=devices&deviceId=mycobrain-service-192-168-0-241`, { waitUntil: "domcontentloaded", timeout: 30_000 })
  await runtimePage.waitForURL("**/login?**", { timeout: 30_000 })
  assert.match(await runtimePage.title(), /Sign In/i)
  assert.match(await runtimePage.locator("body").innerText(), /Sign in to Mycosoft/i)
  assert.deepEqual(runtimeErrors, [])
  await runtimeContext.close()
  const anonymous = await browser.newContext()
  const deniedPassiveAggregate = await anonymous.request.get(`${baseURL}/api/fusarium/sensing-telemetry?deviceId=psathyrella-buoy-com4`)
  const deniedLiveAggregate = await anonymous.request.get(`${baseURL}/api/fusarium/sensing-telemetry?deviceId=psathyrella-buoy-com4&live=1`)
  const deniedLegacyActive = await anonymous.request.get(`${baseURL}/api/mycobrain/mycobrain-COM3/sensors`)
  const deniedLiveSelected = await anonymous.request.get(`${baseURL}/api/mycobrain/mycobrain-COM3/sensors?live_selected=1`)
  const deniedCache = await anonymous.request.get(`${baseURL}/api/mycobrain/mycobrain-COM3/sensors?cache_only=1`)
  const deniedCapabilities = await anonymous.request.get(`${baseURL}/api/fusarium/device-capabilities`)
  const deniedMindexHistory = await anonymous.request.get(`${baseURL}/api/mindex/telemetry/samples?device_slug=mycobrain-COM3&limit=1`)
  assert.equal(deniedPassiveAggregate.status(), 401)
  assert.equal(deniedLiveAggregate.status(), 401)
  assert.equal(deniedLegacyActive.status(), 401)
  assert.equal(deniedLiveSelected.status(), 401)
  assert.equal(deniedCache.status(), 401)
  assert.equal(deniedCapabilities.status(), 401)
  assert.equal(deniedMindexHistory.status(), 401)
  await anonymous.close()
  if (realDeviceId) {
    const realDeviceResult = await exerciseRealSelectedDevice(browser, realDeviceId)
    console.log(`real-device browser QA: ${JSON.stringify(realDeviceResult)}`)
  }
  console.log("browser QA: authenticated passive-first rendering, affirmative live intent, responsive layout, protected-page sign-in truth, and owner-only inventory/telemetry boundaries passed")
} finally { await browser.close() }
