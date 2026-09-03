import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const panel = await readFile(new URL("../MapFiltersPanel.tsx", import.meta.url), "utf8")
const layers = await readFile(new URL("../FieldLayers.tsx", import.meta.url), "utf8")
const catalog = await readFile(new URL("../gcs-wx-catalog.ts", import.meta.url), "utf8")

test("GCS weather labels are not hard-coded live", () => {
  assert.doesNotMatch(panel, /Live radar/)
  assert.doesNotMatch(panel, /wxMrms".*live:\s*true/)
  assert.doesNotMatch(catalog, /live:\s*true/)
  assert.match(panel, /useArraylakeFields/)
  assert.match(panel, /weatherFreshness/)
  assert.match(catalog, /Radar \(MRMS 1 km\)/)
  assert.match(layers, /isDynamicFieldManifestStale/)
  assert.match(layers, /stale \|\| !frames\.length/)
})
