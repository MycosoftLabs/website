import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-defensive-analysis-"))
const compiledPath = join(compiledDir, "contracts.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const tools = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const proof = (id, time) => ({ sourceRef: "operator-replay", evidenceId: id, observedAt: time, receivedAt: "2026-09-01T20:01:00Z" })
const observation = (recordId, objectId, time, latitude = 32, longitude = -117) => ({ recordId, objectId, objectClass: "wildlife", latitude, longitude, observedAt: time, confidence: .8, uncertaintyM: 20, provenance: proof(recordId, time) })

test("orders environmental evidence and labels the association as inference", () => {
  const result = tools.analyzeEnvironmentalTracks({ schema: "fusarium-environmental-track-replay/v1", records: [observation("r2", "deer-1", "2026-09-01T20:00:10Z", 32.0001), observation("r1", "deer-1", "2026-09-01T20:00:00Z")] })
  assert.equal(result.ok, true)
  assert.equal(result.value.tracks.length, 1)
  assert.deepEqual(result.value.tracks[0].points.map((item) => item.recordId), ["r1", "r2"])
  assert.equal(result.value.tracks[0].state, "continuous")
  assert.match(result.value.tracks[0].inference.basis, /inference/)
})

test("rejects human and person-identifying scope", () => {
  const result = tools.analyzeEnvironmentalTracks({ schema: "fusarium-environmental-track-replay/v1", records: [{ ...observation("r1", "x", "2026-09-01T20:00:00Z"), objectClass: "human", personName: "withheld" }] })
  assert.equal(result.ok, false)
  assert.match(result.issues.map((item) => item.message).join(" "), /person-identifying|invalid environmental/)
})

test("fuses only exact-scope, bounded-time and bounded-distance evidence", () => {
  const base = { ...observation("r1", "hint-1", "2026-09-01T20:00:00Z"), modality: "camera", scope: { missionId: "mission-1", locationId: "site-1", environmentId: "forest" }, trackHint: "candidate-1" }
  const result = tools.fuseEnvironmentalObservations({ schema: "fusarium-multisensor-fusion-replay/v1", observations: [base, { ...base, recordId: "r2", modality: "radar", observedAt: "2026-09-01T20:00:05Z", latitude: 32.0001, provenance: proof("r2", "2026-09-01T20:00:05Z") }, { ...base, recordId: "r3", modality: "lidar", scope: { ...base.scope, missionId: "mission-2" }, provenance: proof("r3", "2026-09-01T20:00:00Z") }] })
  assert.equal(result.ok, true)
  assert.equal(result.value.tracks.length, 2)
  assert.equal(result.value.tracks[0].state, "correlated-inference")
  assert.equal(result.value.tracks[0].observations.length, 2)
})

test("evaluates local environmental rules without creating alerts or responses", () => {
  const result = tools.evaluateIndicatorWatchlist({ schema: "fusarium-indicator-watchlist/v1", rules: [{ ruleId: "smoke-high", metric: "pm2.5", operator: "gte", threshold: 35 }], evidence: [{ evidenceId: "sample-1", metrics: { "pm2.5": 42 }, provenance: proof("sample-1", "2026-09-01T20:00:00Z") }] })
  assert.equal(result.ok, true)
  assert.equal(result.value.matches.length, 1)
  assert.equal(result.value.matches[0].state, "matched-evidence")
})

test("release checker blocks higher classifications and never authorizes release", () => {
  const blocked = tools.checkReleaseabilityMetadata({ schema: "fusarium-releaseability-metadata/v1", title: "Report", classification: "SECRET", handling: [], sourceRefs: ["evidence-1"], intendedRecipients: ["US_INTERNAL"] })
  assert.equal(blocked.ok, true)
  assert.equal(blocked.value.state, "blocked")
  assert.equal(blocked.value.authorization, false)
  const compatible = tools.checkReleaseabilityMetadata({ schema: "fusarium-releaseability-metadata/v1", title: "Report", classification: "UNCLASSIFIED", handling: ["PUBLIC-REVIEW-REQUIRED"], sourceRefs: ["evidence-1"], intendedRecipients: ["US_INTERNAL"] })
  assert.equal(compatible.value.state, "metadata-compatible")
  assert.equal(compatible.value.authorization, false)
})

test("source layer has no external, device, persistence, credential, command, target, or random seam", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/)
  assert.doesNotMatch(source, /localStorage|indexedDB|process\.env|navigator\.(usb|serial)|serialport|i2c-bus/)
  assert.doesNotMatch(source, /Math\.random\s*\(|dispatch|sendCommand|executeCommand|targetId|weapon/i)
})
