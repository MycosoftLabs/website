import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "registry.ts"), "utf8").replace('from "./contracts"', 'from "./contracts.mjs"')
const contractsSource = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-device-registry-"))
for (const [name, text] of [["contracts.mjs", contractsSource], ["registry.mjs", source]]) writeFileSync(join(compiledDir, name), ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const registry = await import(pathToFileURL(join(compiledDir, "registry.mjs")).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

test("maps only explicit capabilities and never infers from the device type", () => {
  const manifest = registry.manifestFromRegistryRecord({ id: "node-1", name: "Camera Gas Drone", type: "camera-gas-drone", capabilities: ["microphone", "PM2.5", "BME690", "LiDAR"], location_id: "site-1" }, "/api/registry", 0)
  assert.deepEqual(manifest.sensors.map((sensor) => sensor.modality), ["microphone", "particulate", "gas-voc", "lidar"])
  const noCaps = registry.manifestFromRegistryRecord({ id: "node-2", type: "camera-gas-drone" }, "/api/registry", 1)
  assert.equal(noCaps.sensors.length, 0)
})

test("preserves Earth Simulator devices and exact coordinate-backed locations without inventing sensors", () => {
  const manifest = registry.manifestFromRegistryRecord({
    id: "hyphae-1",
    name: "Hyphae 1",
    type: "hyphae1",
    status: "connected",
    location: { lat: 32.640278, lon: -117.085833 },
    location_label: "Southwestern College, Chula Vista, CA",
  }, "/api/earth-simulator/devices", 0)
  assert.equal(manifest.device.id, "hyphae-1")
  assert.equal(manifest.location.id, "geo:32.640278,-117.085833")
  assert.equal(manifest.location.label, "Southwestern College, Chula Vista, CA")
  assert.deepEqual(manifest.sensors, [])
})

test("merges two passive sources by stable device identity", () => {
  const snapshot = registry.snapshotFromSourceResults([
    { sourceRef: "/api/registry", state: "available", rows: [{ id: "node-1", capabilities: ["camera"] }], message: "ok" },
    { sourceRef: "/api/fci/devices", state: "available", rows: [{ id: "node-1", capabilities: ["fci"] }], message: "ok" },
  ], "2026-09-01T20:00:00Z")
  assert.equal(snapshot.state, "available")
  assert.equal(snapshot.devices.length, 1)
  assert.deepEqual(snapshot.devices[0].sensors.map((sensor) => sensor.modality), ["camera", "bioelectric"])
})

test("collapses an operator record only when an explicit registry alias proves physical identity", () => {
  const snapshot = registry.snapshotFromSourceResults([
    { sourceRef: "/api/devices/network", state: "available", rows: [{ id: "hyphae-1", name: "Hyphae 1", status: "offline", capabilities: ["camera"] }], message: "declared" },
    { sourceRef: "/api/mycobrain/devices", state: "available", rows: [{ id: "mycobrain-sidea-10b41d", registry_id: "hyphae-1", name: "Hyphae 1 operator", status: "connected", capabilities: ["BME690"] }], message: "live" },
  ], "2026-09-01T20:00:00Z")

  assert.equal(snapshot.devices.length, 1)
  assert.equal(snapshot.devices[0].device.id, "hyphae-1")
  assert.equal(snapshot.devices[0].device.status, "connected")
  assert.deepEqual(snapshot.devices[0].provenance.sourceRefs, ["/api/devices/network", "/api/mycobrain/devices"])
  assert.deepEqual(snapshot.devices[0].sensors.map((sensor) => sensor.modality), ["camera", "gas-voc"])
})

test("does not collapse matching names, types, locations, or network-like identifiers without an explicit identity alias", () => {
  const snapshot = registry.snapshotFromSourceResults([
    { sourceRef: "/api/earth-simulator/devices", state: "available", rows: [{ id: "earth-node", name: "Hyphae 1", type: "hyphae", location_id: "lab-a", ip: "192.168.0.228" }], message: "earth" },
    { sourceRef: "/api/mycobrain/devices", state: "available", rows: [{ id: "operator-node", name: "Hyphae 1", type: "hyphae", location_id: "lab-a", ip: "192.168.0.228" }], message: "operator" },
  ], "2026-09-01T20:00:00Z")

  assert.equal(snapshot.devices.length, 2)
})

test("withholds empty service placeholders from the physical sensing-device selector", () => {
  const physical = registry.manifestFromRegistryRecord({ id: "hyphae-1", name: "Hyphae 1" }, "/api/earth-simulator/devices", 0)
  const placeholder = registry.manifestFromRegistryRecord({ id: "mycobrain-service-192-168-0-228", name: "Hyphae service" }, "/api/mycobrain/devices", 1)
  const selectable = registry.selectableSensingDeviceManifests([physical, placeholder])
  assert.deepEqual(selectable.map((manifest) => manifest.device.id), ["hyphae-1"])
})

test("partial registry failure does not become a verified empty fleet", () => {
  const snapshot = registry.snapshotFromSourceResults([{ sourceRef: "/api/registry", state: "unavailable", rows: [], message: "timeout" }], "2026-09-01T20:00:00Z")
  assert.equal(snapshot.state, "unavailable")
  assert.match(snapshot.message, /No device manifest/)
})

test("passive source list includes Device Network without discovery or command paths", () => {
  assert.equal(registry.PASSIVE_DEVICE_REGISTRY_SOURCES[0], "/api/devices/network?include_offline=true")
  assert.ok(registry.PASSIVE_DEVICE_REGISTRY_SOURCES.every((source) => !/discover|command|control/.test(source)))
})

test("operator MycoBrain sensor_data keys are explicit capability evidence", () => {
  const manifest = registry.manifestFromRegistryRecord({ id: "operator-node", sensor_data: { bme688_amb: { temperature: 21 } } }, "/api/mycobrain", 0)
  assert.equal(manifest.sensors.length, 1)
  assert.equal(manifest.sensors[0].modality, "gas-voc")
  assert.match(manifest.sensors[0].model, /bme688_amb/)
})
