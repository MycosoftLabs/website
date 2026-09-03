import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..", "..", "..", "..")
const read = (...parts) => readFileSync(join(root, ...parts), "utf8")

test("FCI is a dedicated registry-backed Fusarium device interface", () => {
  const route = read("app", "fusarium", "(dashboard)", "fci", "page.tsx")
  const dashboard = read("components", "fusarium", "fci", "fci-dashboard.tsx")
  assert.match(route, /FciDashboard/)
  assert.match(dashboard, /\/api\/fci\/devices/)
  assert.match(dashboard, /Open Fungi Compute workbench/)
  assert.doesNotMatch(dashboard, /Math\.random/)
})

test("BlueSight is scope-aware and does not poll the Psathyrella-only view", () => {
  const dashboard = read("components", "fusarium", "sensing", "bluesight-dashboard.tsx")
  assert.match(dashboard, /SensingScopeSelector/)
  assert.match(dashboard, /No device-bound/)
  assert.match(dashboard, /no Psathyrella default is inserted/i)
  assert.doesNotMatch(dashboard, /components\/psathyrella|lib\/psathyrella|\/api\/psathyrella/)
  assert.doesNotMatch(dashboard, /Math\.random/)
})

test("SINE remounts the complete acoustic player without duplicating its logic", () => {
  const dashboard = read("components", "fusarium", "sensing", "sine-dashboard.tsx")
  assert.match(dashboard, /SineAcousticPlayer/)
  assert.match(dashboard, /Back to Fusarium/)
  assert.match(dashboard, /ConnectedSensingScopeSelector/)
  assert.equal((dashboard.match(/SineAcousticPlayer/g) ?? []).length, 2)
})

test("GANDHA imports Bosch evidence, supports local exploratory training, and keeps external training disabled", () => {
  const dashboard = read("components", "fusarium", "sensing", "gandha-dashboard.tsx")
  assert.match(dashboard, /importGandhaDataset/)
  assert.match(dashboard, /stageGandhaLabel/)
  assert.match(dashboard, /trainLocalCentroidModel/)
  assert.match(dashboard, /Train local centroid model/)
  assert.match(dashboard, /Submit external training job/)
  assert.match(dashboard, /disabled>Submit external training job/)
  assert.match(dashboard, /registry-verified model provenance/)
  assert.match(dashboard, /ConnectedSensingScopeSelector/)
  assert.doesNotMatch(dashboard, /Math\.random/)
})

test("every Fusarium sensing dashboard consumes the shared URL scope selector", () => {
  const overview = read("components", "fusarium", "sensing", "sensing-overview.tsx")
  const thermal = read("components", "fusarium", "sensing", "thermal-dashboard.tsx")
  const mechanical = read("components", "fusarium", "sensing", "mechanical-dashboard.tsx")
  const fci = read("components", "fusarium", "fci", "fci-dashboard.tsx")

  assert.match(overview, /SensingScopeSelector/)
  assert.match(overview, /Cross-sensor coverage/)
  assert.match(overview, /Other registered modalities/)
  for (const dashboard of [thermal, mechanical, fci]) {
    assert.match(dashboard, /ConnectedSensingScopeSelector/)
    assert.match(dashboard, /data-sensing-scope/)
  }
})

test("scope inventory uses the normalized passive capability contract and never a catalog fallback", () => {
  const selector = read("components", "fusarium", "sensing", "sensing-scope-selector.tsx")
  assert.match(selector, /\/api\/fusarium\/device-capabilities/)
  assert.match(selector, /parseDeviceCapabilitySnapshot/)
  assert.match(selector, /DEVICE_MANIFEST_MAX_BYTES/)
  assert.doesNotMatch(selector, /\/api\/mindex\/registry\/devices|\/api\/fci\/devices/)
  assert.match(selector, /\/api\/earth-simulator\/devices/)
  assert.doesNotMatch(selector, /KNOWN_DEVICE_CATALOG|Math\.random/)
})
