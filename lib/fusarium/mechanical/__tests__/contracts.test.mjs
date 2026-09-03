import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-mechanical-"))
const compiledPath = join(compiledDir, "contracts.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const mechanical = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const sequence = () => ({ schema: "mycosoft.mechanical.sequence.v1", sequenceId: "touch-1", deviceId: "mushroom-1", provenance: { source: "file_import", notes: "tactile bench" }, samples: [{ sampleId: "s1", observedAt: "2026-09-01T20:00:00Z", contacts: [{ x: .25, y: .75, pressureN: 4 }], forceN: { x: 3, y: 4, z: 0 }, jointsDeg: { hip_left: 20 }, label: null }] })

test("validates tactile, force, and joint evidence", () => { const parsed = mechanical.validateMechanicalSequence(sequence()); assert.equal(parsed.ok, true); assert.deepEqual(mechanical.mechanicalSampleSummary(parsed.value.samples[0]), { sampleId: "s1", contactCount: 1, forceMagnitudeN: 5, totalPressureN: 4, peakPressureN: 4, jointCount: 1 }) })
test("stages a local label while provider-gating training", () => { const parsed = mechanical.validateMechanicalSequence(sequence()); const staged = mechanical.stageMechanicalLabel(parsed.value, "s1", "stable tripod"); assert.equal(staged.ok, true); assert.equal(staged.value.samples[0].label, "stable tripod"); assert.deepEqual(mechanical.mechanicalTrainingReadiness(staged.value, false), { canSubmit: false, reasons: ["Bind an approved simulation or training provider."] }) })
test("summarizes and plots only supplied mechanical samples", () => { const value = sequence(); value.samples.push({ sampleId: "s2", observedAt: "2026-09-01T20:00:02Z", contacts: [{ x: .5, y: .5, pressureN: 8 }], forceN: { x: 0, y: 0, z: 10 }, jointsDeg: { hip_left: 25, knee_left: 40 }, label: "loaded" }); const parsed = mechanical.validateMechanicalSequence(value); assert.equal(parsed.ok, true); assert.deepEqual(mechanical.mechanicalSequenceSummary(parsed.value), { sampleCount: 2, durationMs: 2000, peakForceN: 10, peakPressureN: 8, labeledCount: 1, jointNames: ["hip_left", "knee_left"] }); assert.deepEqual(mechanical.mechanicalTrend(parsed.value).map(({ forceMagnitudeN, totalPressureN }) => ({ forceMagnitudeN, totalPressureN })), [{ forceMagnitudeN: 5, totalPressureN: 4 }, { forceMagnitudeN: 10, totalPressureN: 8 }]) })
test("rejects out-of-range contacts instead of normalizing them", () => { const value = sequence(); value.samples[0].contacts[0].x = 2; const parsed = mechanical.validateMechanicalSequence(value); assert.equal(parsed.ok, false); assert.match(parsed.issues.join(" "), /normalized from 0 to 1/) })
test("contract has no connector, credential, or random-data seam", () => { assert.doesNotMatch(source, /Math\.random\s*\(/); assert.doesNotMatch(source, /\bfetch\s*\(/); assert.doesNotMatch(source, /process\.env/) })
