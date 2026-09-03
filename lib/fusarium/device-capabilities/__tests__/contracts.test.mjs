import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-device-capabilities-"))
const compiledPath = join(compiledDir, "contracts.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const contracts = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const manifest = () => ({
  schema: "fusarium-device-capability-manifest/v1",
  classification: "UNCLASSIFIED",
  device: { id: "hyphae-1", registryId: "registry/hyphae-1", name: "Hyphae 1", type: "edge-node", status: "registered", identityEvidence: "Explicit registry identifier." },
  boards: [{ id: "mycobrain-1", family: "mycobrain", model: "MycoBrain", revision: "v2", processors: [{ id: "esp32-a", family: "esp32", model: "ESP32", role: "sensor acquisition" }, { id: "jetson-1", family: "jetson", model: "Orin Nano", role: "edge inference" }] }],
  sensors: [
    { id: "hyphae-1/mic-1", modality: "microphone", model: "acoustic array", boardRef: "mycobrain-1", processorRef: "jetson-1", transport: { kind: "usb", endpointRef: null, adapterState: "unbound" }, calibration: { state: "unknown", calibratedAt: null, expiresAt: null, method: null }, provenance: { sourceRef: "local-import", sourceRecordId: "mic-1", observedAt: null, receivedAt: null } },
    { id: "hyphae-1/voc-1", modality: "gas-voc", model: "BME690", boardRef: "mycobrain-1", processorRef: "esp32-a", transport: { kind: "i2c", endpointRef: "i2c-port-1", adapterState: "declared" }, calibration: { state: "unknown", calibratedAt: null, expiresAt: null, method: null }, provenance: { sourceRef: "local-import", sourceRecordId: "voc-1", observedAt: null, receivedAt: null } },
  ],
  mission: { id: "mission-7", label: "Forest survey" }, location: { id: "site-7", label: "North site" }, environment: { id: "forest", label: "Forest" },
  provenance: { sourceRef: "local-import", sourceRecordId: "hyphae-1", receivedAt: null },
})

test("accepts a strict heterogeneous MycoBrain plus Jetson manifest", () => {
  const parsed = contracts.parseDeviceCapabilityManifest(manifest())
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.manifest.sensors.map((sensor) => sensor.modality), ["microphone", "gas-voc"])
  assert.equal(parsed.manifest.boards[0].processors.length, 2)
})

test("rejects unknown sensor modalities and dangling board references", () => {
  const value = manifest()
  value.sensors[0].modality = "telepathy"
  value.sensors[1].boardRef = "missing-board"
  const parsed = contracts.parseDeviceCapabilityManifest(value)
  assert.equal(parsed.ok, false)
  assert.match(parsed.issues.join(" "), /modality is invalid/)
  assert.match(parsed.issues.join(" "), /boardRef is unknown/)
})

test("filters selected devices and modalities without inventing samples", () => {
  const parsed = contracts.parseDeviceCapabilityManifest(manifest())
  const result = contracts.manifestsForModality([parsed.manifest], ["hyphae-1"], "gas-voc")
  assert.equal(result.length, 1)
  assert.equal(result[0].sensors.length, 1)
  assert.equal(result[0].sensors[0].transport.adapterState, "declared")
})

test("contract has no hardware, network, credential, command, or random-data seam", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(source, /Math\.random\s*\(/)
  assert.doesNotMatch(source, /process\.env|serialport|navigator\.usb|navigator\.serial|i2c-bus/)
  assert.doesNotMatch(source, /dispatch|executeCommand|sendCommand/)
})
