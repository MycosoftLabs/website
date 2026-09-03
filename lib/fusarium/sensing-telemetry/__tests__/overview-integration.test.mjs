import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const source = await readFile(new URL("../../../../components/fusarium/sensing/sensing-overview.tsx", import.meta.url), "utf8")
const selectorSource = await readFile(new URL("../../../../components/fusarium/sensing/sensing-scope-selector.tsx", import.meta.url), "utf8")
const capabilityRoute = await readFile(new URL("../../../../app/api/fusarium/device-capabilities/route.ts", import.meta.url), "utf8")

test("Senses Overview polls passive telemetry by default and requires affirmative live-read intent", () => {
  assert.match(source, /scope\.kind === "devices" \? selectedDevices\.map\(\(device\) => device\.id\) : \[\]/)
  assert.match(source, /query\.append\("deviceId", deviceId\)/)
  assert.match(source, /liveReadScopeKey === exactSelectedDeviceKey/)
  assert.match(source, /if \(liveReadEnabled\) query\.set\("live", "1"\)/)
  assert.match(source, /Enable live sensor reads/)
  assert.match(source, /aria-pressed=\{liveReadEnabled\}/)
  assert.match(source, /fetch\("\/api\/auth\/session"/)
  assert.match(source, /fetch\("\/api\/auth\/local-dev-session"/)
  assert.match(source, /credentials: "same-origin"/)
  assert.match(source, /sensingScopeHref\("\/fusarium\/sensing", scope\)/)
  assert.match(source, /Sign in with Mycosoft/)
  assert.match(source, /Owner authentication is required for selected-device telemetry/)
  assert.match(source, /last verified frame is retained/)
  assert.match(source, /if \(authenticationFailed\) setLiveTelemetry\(null\)/)
  assert.match(source, /\/api\/fusarium\/sensing-telemetry\?\$\{query\}/)
  assert.match(source, /method: "GET", cache: "no-store"/)
  assert.match(source, /window\.setTimeout\(\(\) => void read\(\), 15_000\)/)
  assert.doesNotMatch(source, /setInterval\(\(\) => void read/)
})

test("selected-device evidence precedes replay and uses explicit source priority before deterministic self-test evidence", () => {
  const liveSeriesPosition = source.indexOf("...liveSampleSeries.map")
  const replayPosition = source.indexOf("...sampleSeries")
  assert.ok(liveSeriesPosition >= 0 && replayPosition > liveSeriesPosition)
  assert.match(source, /preferredEvidenceSeries/)
  assert.match(source, /sourceId\.includes\("live_selected=1"\)/)
  assert.doesNotMatch(source, /verifiedSampleSeries/)
  assert.match(selectorSource, /provenance: \{ \.\.\.series\.provenance, mode: "REPLAY" \}/)
  assert.match(source, /\?\? selfTestSamples\.find/)
})

test("selected-device instruments preserve strict unbound behavior and do not infer sensors from type", () => {
  assert.match(source, /liveTelemetry\?\.message \?\? \(exactSelectedDeviceKey/)
  assert.match(source, /contract-valid live series/)
  assert.doesNotMatch(source, /verified live series/)
  assert.match(source, /"unbound for selected device"/)
  assert.doesNotMatch(source, /device\.type.*sensor|infer.*device/i)
})

test("device inventory refresh allows the bounded server read to finish and schedules from completion", () => {
  assert.match(capabilityRoute, /setTimeout\(\(\) => controller\.abort\(\), 15_000\)/)
  assert.match(selectorSource, /DEVICE_CAPABILITY_TIMEOUT_MS = 18_000/)
  assert.match(selectorSource, /DEVICE_CAPABILITY_REFRESH_MS = 15_000/)
  assert.match(selectorSource, /\.finally\(\(\) => \{[\s\S]*refreshTimer = window\.setTimeout\(\(\) => setRevision/)
  assert.doesNotMatch(selectorSource, /setInterval/)
  assert.doesNotMatch(selectorSource, /setInventory\(LOADING_INVENTORY\)/)
  assert.match(selectorSource, /last verified registry snapshot is retained/)
})
