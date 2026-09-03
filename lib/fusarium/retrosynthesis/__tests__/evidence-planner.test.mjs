import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(here, "..", "evidence-planner.ts")
const source = readFileSync(sourcePath, "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-retrosynthesis-"))
const compiledPath = join(compiledDir, "evidence-planner.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const planner = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const validInput = () => ({
  schemaVersion: planner.RETROSYNTHESIS_SCHEMA,
  classification: "UNCLASSIFIED",
  workspaceId: "review-001",
  target: { targetId: "target", label: "Target compound", identifiers: { formula: "C8H10N4O2" } },
  concepts: [
    { conceptId: "target", label: "Target compound", role: "target", evidenceIds: ["ev-target"] },
    { conceptId: "candidate-a", label: "Candidate concept A", role: "precursor-candidate", evidenceIds: ["ev-relation"] },
  ],
  relationships: [{ relationshipId: "rel-1", fromConceptId: "candidate-a", toConceptId: "target", claimType: "documented-precursor-relationship", evidenceIds: ["ev-relation"] }],
  evidence: [
    { evidenceId: "ev-target", sourceLabel: "Operator catalog", sourceRef: "file:catalog.json", sourceRecordId: "record-target", recordedAt: "2026-09-02T12:00:00Z", evidenceClass: "database-record" },
    { evidenceId: "ev-relation", sourceLabel: "Reviewed literature index", sourceRef: "urn:source:literature:1", sourceRecordId: "record-rel", recordedAt: "2026-09-02T12:05:00Z", evidenceClass: "literature" },
  ],
})

test("reviews a provenance-complete concept map without asserting chemical validity", () => {
  const result = planner.reviewRetrosynthesisEvidence(validInput())
  assert.equal(result.ok, true)
  assert.equal(result.value.reviewState, "documented-input")
  assert.equal(result.value.metrics.relationshipEvidenceCoveragePercent, 100)
  assert.equal(result.value.relationships[0].evidenceState, "documented-input")
  assert.equal(result.value.boundaries.noExecution, true)
  assert.equal(result.value.boundaries.noProceduralOutput, true)
  assert.equal(result.value.boundaries.chemicalFeasibilityNotEvaluated, true)
})

test("preserves missing provenance as an explicit partial state", () => {
  const input = validInput()
  input.evidence[1].sourceRecordId = null
  input.evidence[1].recordedAt = null
  const result = planner.reviewRetrosynthesisEvidence(input)
  assert.equal(result.ok, true)
  assert.equal(result.value.reviewState, "partial-input")
  assert.equal(result.value.relationships[0].evidenceState, "partial-provenance")
  assert.equal(result.value.metrics.relationshipEvidenceCoveragePercent, 0)
  assert.match(result.value.gaps.join(" "), /incomplete provenance/)
})

test("rejects operational synthesis fields instead of displaying or processing them", () => {
  const input = { ...validInput(), procedure: ["hidden"] }
  const result = planner.reviewRetrosynthesisEvidence(input)
  assert.equal(result.ok, false)
  assert.match(result.issues.map((issue) => `${issue.path} ${issue.message}`).join(" "), /procedure.*Operational synthesis fields/i)
})

test("rejects instruction-like or condition-bearing display text", () => {
  const input = validInput()
  input.concepts[1].label = "Add 5 mL and heat the candidate"
  const result = planner.reviewRetrosynthesisEvidence(input)
  assert.equal(result.ok, false)
  assert.match(result.issues.map((issue) => issue.message).join(" "), /Instruction-like/)
})

test("does not allow procedural text to hide in a rendered identifier or source reference", () => {
  const sourceInput = validInput()
  sourceInput.evidence[0].sourceRef = "local:Add 5 mL and heat"
  const sourceResult = planner.reviewRetrosynthesisEvidence(sourceInput)
  assert.equal(sourceResult.ok, false)
  assert.match(sourceResult.issues.map((issue) => issue.message).join(" "), /Source reference must be a bounded non-procedural/)
  const identifierInput = validInput()
  identifierInput.target.identifiers.formula = "Mix and heat for 10 minutes"
  const identifierResult = planner.reviewRetrosynthesisEvidence(identifierInput)
  assert.equal(identifierResult.ok, false)
  assert.match(identifierResult.issues.map((issue) => issue.message).join(" "), /bounded non-procedural strings/)
})

test("rejects unknown evidence and concept references", () => {
  const input = validInput()
  input.concepts[1].evidenceIds = ["missing-evidence"]
  input.relationships[0].toConceptId = "missing-target"
  const result = planner.reviewRetrosynthesisEvidence(input)
  assert.equal(result.ok, false)
  const issues = result.issues.map((issue) => issue.message).join(" ")
  assert.match(issues, /Unknown evidence reference/)
  assert.match(issues, /Destination concept does not exist/)
})

test("rejects duplicate identifiers and non-commercial classifications", () => {
  const input = validInput()
  input.classification = "SECRET"
  input.evidence.push({ ...input.evidence[0] })
  const result = planner.reviewRetrosynthesisEvidence(input)
  assert.equal(result.ok, false)
  const issues = result.issues.map((issue) => issue.message).join(" ")
  assert.match(issues, /Only UNCLASSIFIED/)
  assert.match(issues, /Evidence identifiers must be unique/)
})

test("reports a supplied graph cycle but never infers a route order", () => {
  const input = validInput()
  input.relationships.push({ relationshipId: "rel-2", fromConceptId: "target", toConceptId: "candidate-a", claimType: "unknown", evidenceIds: [] })
  const result = planner.reviewRetrosynthesisEvidence(input)
  assert.equal(result.ok, true)
  assert.equal(result.value.reviewState, "partial-input")
  assert.match(result.value.findings.map((finding) => finding.message).join(" "), /cycle; no route order is inferred/)
  assert.equal(result.value.relationships[1].evidenceState, "claim-only")
})

test("enforces bounded arrays without silently certifying a truncated review", () => {
  const input = validInput()
  input.concepts = Array.from({ length: planner.RETROSYNTHESIS_MAX_CONCEPTS + 1 }, (_, index) => ({ conceptId: `c-${index}`, label: `Concept ${index}`, role: index === 0 ? "target" : "reference-only", evidenceIds: [] }))
  input.target.targetId = "c-0"
  const result = planner.reviewRetrosynthesisEvidence(input)
  assert.equal(result.ok, false)
  assert.match(result.issues.map((issue) => issue.message).join(" "), /no truncated review is produced/)
})

test("blank schema is an explicit empty evidence map, not a successful route", () => {
  const result = planner.reviewRetrosynthesisEvidence(JSON.parse(planner.RETROSYNTHESIS_BLANK_TEMPLATE))
  assert.equal(result.ok, true)
  assert.equal(result.value.reviewState, "partial-input")
  assert.equal(result.value.metrics.relationshipCount, 0)
  assert.match(result.value.gaps.join(" "), /No concept relationships/)
})

test("Fusarium route mounts the safe local replacement and catalog advertises only that bounded capability", () => {
  const hostRoot = join(here, "..", "..", "..", "..")
  const route = readFileSync(join(hostRoot, "app", "fusarium", "(dashboard)", "tools", "retrosynthesis", "page.tsx"), "utf8")
  const component = readFileSync(join(hostRoot, "components", "fusarium", "retrosynthesis", "retrosynthesis-evidence-workbench.tsx"), "utf8")
  const catalog = readFileSync(join(hostRoot, "lib", "fusarium", "tools-hub", "catalog.ts"), "utf8")
  const manifest = readFileSync(join(hostRoot, "lib", "fusarium", "twins", "legacy-tools", "manifest.ts"), "utf8")
  assert.match(route, /RetrosynthesisEvidenceWorkbench as FusariumRetrosynthesisMount/)
  assert.doesNotMatch(route, /legacy-tools-mount/)
  assert.match(component, /data-fusarium-retrosynthesis-workbench/)
  assert.match(component, /parseLocalReviewJson/)
  assert.doesNotMatch(component, /\bfetch\s*\(/)
  assert.doesNotMatch(component, /WebSocket|EventSource|navigator\.serial|navigator\.usb|process\.env|Math\.random/)
  assert.match(catalog, /id: "retrosynthesis"[\s\S]*?availability: "available"/)
  assert.match(catalog, /no procedure, provider call, persistence, export, or execution/i)
  assert.match(manifest, /replacementState: "available-local-evidence-review"/)
})

test("planner contains no network, device, credential, random, or execution seam", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(|WebSocket|EventSource|XMLHttpRequest|navigator\.(?:serial|usb|bluetooth)|process\.env|Math\.random|child_process|execSync|spawnSync/)
})
