import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, "..", "..", "..", "..")
const read = (...parts) => readFileSync(join(appRoot, ...parts), "utf8")
const contracts = read("lib", "fusarium", "device-observations", "contracts.ts")
const registry = read("lib", "fusarium", "device-observations", "registry.ts")
const route = read("app", "api", "fusarium", "device-observations", "route.ts")

test("same-origin route exposes GET only and delegates to the validated registry", () => {
  assert.match(route, /export async function GET/)
  assert.match(route, /parseDeviceObservationScope/)
  assert.match(route, /queryDeviceObservations/)
  assert.match(route, /Cache-Control.*no-store/s)
  assert.doesNotMatch(route, /export async function (?:POST|PUT|PATCH|DELETE)/)
})

test("foundation has no connector, credential, generated-data, or control seam", () => {
  for (const source of [contracts, registry, route]) {
    assert.doesNotMatch(source, /\bfetch\s*\(/)
    assert.doesNotMatch(source, /process\.env/)
    assert.doesNotMatch(source, /Math\.random\s*\(/)
    assert.doesNotMatch(source, /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/)
    assert.doesNotMatch(source, /sendCommand|dispatchCommand|writeServo|moveJoint|stimulateDevice/)
  }
})

test("every required modality and every truth state is explicit in the contract", () => {
  for (const modality of ["camera", "radar", "lidar", "wifi", "audio", "gas-odor", "bioelectric", "thermal", "mechanical"]) {
    assert.match(contracts, new RegExp(`"${modality}"`))
  }
  for (const state of ["unbound", "verified-empty", "available", "stale", "error"]) {
    assert.match(contracts, new RegExp(`"${state}"`))
  }
  for (const field of ["deviceId", "observedAt", "receivedAt", "measurements", "units", "provenance", "freshness", "confidence", "uncertainty", "classification", "state"]) {
    assert.match(contracts, new RegExp(`\\b${field}\\b`))
  }
})

test("fleet registry contains no active Psathyrella adapter", () => {
  assert.match(registry, /REGISTERED_DEVICE_OBSERVATION_ADAPTERS[^=]*= Object\.freeze\(\[\]\)/)
  assert.match(registry, /sourceRef:\s*["']\/api\/psathyrella\/\*["'][\s\S]*disposition:\s*["']excluded["']/)
})
