import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-sensing-scope-"))
const compiledPath = join(compiledDir, "contracts.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText)
const scope = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

test("round-trips a single or multi-device scope without changing unrelated query context", () => {
  const original = new URLSearchParams("view=quad&deviceId=stale&missionId=old")
  const written = scope.writeSensingScope(original, scope.normalizeSensingScope({
    kind: "devices",
    deviceIds: ["psathyrella-01", "psathyrella-02", "psathyrella-01"],
  }))

  assert.equal(written.get("view"), "quad")
  assert.deepEqual(written.getAll("deviceId"), ["psathyrella-01", "psathyrella-02"])
  assert.equal(written.has("missionId"), false)
  assert.deepEqual(scope.parseSensingScope(written), {
    schema: "fusarium-sensing-scope/v1",
    kind: "devices",
    deviceIds: ["psathyrella-01", "psathyrella-02"],
    contextId: null,
    contextLabel: null,
  })
})

test("mission, location, and environment identifiers are context only and do not acquire devices", () => {
  for (const kind of ["mission", "location", "environment"]) {
    const value = scope.normalizeSensingScope({ kind, contextId: `${kind}-7`, contextLabel: `Operator ${kind}` })
    assert.equal(scope.sensingScopeIsBound(value), true)
    assert.deepEqual(value.deviceIds, [])
    assert.match(scope.describeSensingScope(value), new RegExp(`^${kind[0].toUpperCase()}${kind.slice(1)}:`))
  }
  assert.equal(scope.sensingScopeIsBound(scope.UNBOUND_SENSING_SCOPE), false)
})

test("scope handoffs stay same-origin and URL-encode identifiers", () => {
  const value = scope.normalizeSensingScope({ kind: "devices", deviceIds: ["buoy a/1"] })
  assert.equal(scope.sensingScopeHref("/fusarium/sine", value), "/fusarium/sine?senseScope=devices&deviceId=buoy+a%2F1")
  assert.throws(() => scope.sensingScopeHref("https://example.invalid/sine", value), /same-origin/)
  assert.throws(() => scope.sensingScopeHref("//example.invalid/sine", value), /same-origin/)
})

test("registry unavailable and authoritative empty remain distinct", () => {
  const unavailable = scope.parseSensingInventoryPayload(
    { devices: [], warning: "MINDEX registry unavailable" },
    200,
    "device-registry",
    "/api/mindex/registry/devices",
  )
  const empty = scope.parseSensingInventoryPayload(
    { devices: [] },
    200,
    "fci-registry",
    "/api/fci/devices",
  )
  assert.equal(unavailable.state, "unavailable")
  assert.equal(empty.state, "empty")
  assert.match(unavailable.message, /no device absence is inferred/i)
  assert.match(empty.message, /authoritative empty/i)
})

test("inventory parser rejects demos, merges duplicate real records, and never adds assumed capabilities", () => {
  const generic = scope.parseSensingInventoryPayload({ devices: [
    { id: "psathyrella-01", name: "Psathyrella Alpha", type: "buoy", capabilities: ["camera", "radar"] },
    { id: "demo-buoy", name: "Demo", capabilities: ["lidar"] },
  ] }, 200, "device-registry", "/api/mindex/registry/devices")
  const fci = scope.parseSensingInventoryPayload({ devices: [
    { device_id: "psathyrella-01", device_name: "Psathyrella Alpha", probe_type: "electrode" },
  ] }, 200, "fci-registry", "/api/fci/devices")
  const merged = scope.combineSensingInventories([generic, fci])

  assert.equal(generic.rejectedRecords, 1)
  assert.equal(merged.devices.length, 1)
  assert.deepEqual(merged.devices[0].declaredCapabilities.sort(), ["camera", "electrode", "radar"])
  assert.deepEqual(merged.devices[0].registryKinds.sort(), ["device-registry", "fci-registry"])
  const bioelectric = scope.SENSING_MODALITIES.find((item) => item.id === "bioelectric")
  const lidar = scope.SENSING_MODALITIES.find((item) => item.id === "lidar")
  assert.equal(scope.deviceSupportsModality(merged.devices[0], bioelectric), true)
  assert.equal(scope.deviceSupportsModality(merged.devices[0], lidar), false)
})

test("location and environment suggestions use only exact registry fields", () => {
  const inventory = scope.parseSensingInventoryPayload({ devices: [
    {
      id: "field-node-7",
      name: "Field node 7",
      type: "mycobrain",
      location: { id: "site.north-7", name: "North Site" },
      metadata: { environment_id: "env.estuary", environment_label: "Estuary" },
    },
    {
      id: "field-node-8",
      name: "Field node 8",
      type: "mycobrain",
      location: { name: "South Bench" },
      capabilities: ["temperature"],
    },
  ] }, 200, "device-registry", "/api/mindex/registry/devices")

  const locations = scope.deriveSensingContextSuggestions(inventory, "location")
  const environments = scope.deriveSensingContextSuggestions(inventory, "environment")
  assert.equal(locations.state, "available")
  assert.deepEqual(locations.suggestions.map(({ id, label, identifierSource, deviceIds }) => ({ id, label, identifierSource, deviceIds })), [
    { id: "site.north-7", label: "North Site", identifierSource: "registry-id", deviceIds: ["field-node-7"] },
    { id: "South Bench", label: "South Bench", identifierSource: "registry-label", deviceIds: ["field-node-8"] },
  ])
  assert.deepEqual(environments.suggestions.map(({ id, label }) => ({ id, label })), [
    { id: "env.estuary", label: "Estuary" },
  ])
  assert.equal(inventory.devices[1].environmentContexts.length, 0, "device type and capabilities must not fabricate an environment")
})

test("location and environment scopes correlate only exact registered context values", () => {
  const inventory = scope.parseSensingInventoryPayload({ devices: [
    { id: "node-a", location: { id: "site-a", name: "Site A" }, environment: { id: "env-a", name: "Air" } },
    { id: "node-b", location: { id: "site-b", name: "Site B" }, environment: { id: "env-b", name: "Water" } },
  ] }, 200, "device-registry", "/api/mindex/registry/devices")

  assert.deepEqual(scope.devicesForSensingScope(scope.normalizeSensingScope({ kind: "location", contextId: "site-a" }), inventory.devices).map((device) => device.id), ["node-a"])
  assert.deepEqual(scope.devicesForSensingScope(scope.normalizeSensingScope({ kind: "environment", contextId: "env-b" }), inventory.devices).map((device) => device.id), ["node-b"])
  assert.deepEqual(scope.devicesForSensingScope(scope.normalizeSensingScope({ kind: "mission", contextId: "mission-a" }), inventory.devices), [])
})

test("current-user mission suggestions fail closed without an authoritative identity bridge", () => {
  const snapshot = scope.UNBOUND_CURRENT_USER_MISSION_SUGGESTIONS
  assert.equal(snapshot.state, "unbound")
  assert.deepEqual(snapshot.suggestions, [])
  assert.match(snapshot.message, /website session.*not authoritatively mapped.*runtime operator identity/i)
})

test("Tactus is the shared mechanical tool label and spelling remains Psathyrella", () => {
  const mechanical = scope.SENSING_MODALITIES.find((item) => item.id === "mechanical")
  assert.equal(mechanical.tool, "Tactus — Mechanical")
  assert.equal(mechanical.href, "/fusarium/mechanical")
  assert.equal(mechanical.id, "mechanical")
  assert.doesNotMatch(source, /Sathirella|Satherella|Psathirella/i)
})

test("scope contracts are pure and contain no connector, command, credential, or generated-data seam", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(source, /process\.env/)
  assert.doesNotMatch(source, /Math\.random\s*\(/)
  assert.doesNotMatch(source, /method:\s*["']POST["']/)
  assert.doesNotMatch(source, /sendCommand|stimulate|actuat/i)
})
