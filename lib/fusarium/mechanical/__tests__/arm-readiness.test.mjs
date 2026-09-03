import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "arm-readiness.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-mechanical-arm-"))
const compiledPath = join(compiledDir, "arm-readiness.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const arm = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const verified = (message = "Observed and verified.") => ({ state: "verified", message, observedAt: "2026-09-01T22:00:00Z", evidenceRef: "adapter://readiness/evidence" })

test("uses the official 280 Pi reference without claiming it was observed", () => {
  const profile = arm.MYCOBOT_280_PI_2023_PROFILE
  assert.equal(profile.sdkClass, "MyCobot280")
  assert.deepEqual(profile.directSerialReference, { port: "/dev/ttyAMA0", baud: 1_000_000, state: "official_reference_not_observed" })
  assert.deepEqual(profile.jointRangesDeg, [[-168, 168], [-140, 140], [-150, 150], [-150, 150], [-155, 160], [-180, 180]])
})

test("starts unbound with telemetry withheld instead of fabricated zeros", () => {
  const snapshot = arm.createUnboundArmReadiness("lab-arm-candidate")
  assert.equal(snapshot.identity.state, "not_probed")
  assert.equal(snapshot.service.state, "unbound")
  assert.equal(snapshot.serial.state, "not_probed")
  assert.deepEqual(snapshot.telemetry, { state: "withheld", jointsDeg: null, coordinates: null, observedAt: null, provenance: null })
  assert.equal(arm.flexMotionReadiness(snapshot).canMove, false)
})

test("builds a passive request that prohibits every mutating arm action", () => {
  const request = arm.buildPassiveArmSelfCheckRequest("lab-arm-candidate")
  assert.equal(request.action, "passive_readiness_check")
  assert.deepEqual(request.constraints, {
    allowMotion: false,
    allowPowerChange: false,
    allowServoWrite: false,
    allowFirmwareChange: false,
    allowCalibration: false,
  })
})

test("quarantines the local fake-connected placeholder pattern", () => {
  const snapshot = arm.createUnboundArmReadiness("lab-arm-candidate")
  snapshot.identity = verified("Stub reported connected.")
  snapshot.telemetry = { state: "quarantined", jointsDeg: [0, 0, 0, 0, 0, 0], coordinates: [0, 0, 150, 0, 0, 0], observedAt: null, provenance: "placeholder" }
  const result = arm.evaluatePassiveArmSelfCheck(snapshot)
  assert.equal(result.state, "quarantined")
  assert.equal(result.contactedHardware, false)
  assert.match(result.reasons.join(" "), /unsupported|Placeholder/)
})

test("does not treat a provenance-bearing measured zero posture as a placeholder", () => {
  const snapshot = arm.createUnboundArmReadiness("lab-arm-candidate")
  snapshot.identity = verified()
  snapshot.service = verified()
  snapshot.sdk = verified()
  snapshot.serial = verified()
  snapshot.camera = verified()
  snapshot.proprioception = verified()
  snapshot.telemetry = { state: "verified", jointsDeg: [0, 0, 0, 0, 0, 0], coordinates: [0, 0, 0, 0, 0, 0], observedAt: "2026-09-01T22:00:00Z", provenance: "device_read" }
  assert.equal(arm.evaluatePassiveArmSelfCheck(snapshot).state, "ready")
})

test("Flex remains locked until every physical and operator gate is verified", () => {
  const snapshot = arm.createUnboundArmReadiness("lab-arm-candidate")
  const locked = arm.flexMotionReadiness(snapshot)
  assert.equal(locked.canMove, false)
  assert.ok(locked.missing.includes("Independent emergency stop"))
  assert.ok(locked.missing.includes("Operator deadman control"))
  assert.ok(locked.missing.includes("Explicit in-person operator action"))
  for (const gate of Object.keys(snapshot.flexGates)) snapshot.flexGates[gate] = verified()
  assert.deepEqual(arm.flexMotionReadiness(snapshot), { canMove: true, missing: [] })
})

test("readiness contract contains no transport, power, or motion implementation", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(source, /send_(?:angle|angles|coord|coords)\s*\(/i)
  assert.doesNotMatch(source, /power_(?:on|off)\s*\(/i)
  assert.doesNotMatch(source, /\/dev\/ttyUSB0|\b115200\b/)
})
