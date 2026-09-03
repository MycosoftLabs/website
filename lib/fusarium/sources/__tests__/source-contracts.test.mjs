import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = join(dirname(fileURLToPath(import.meta.url)), "..")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-source-contracts-"))

for (const name of ["source-readiness-contract", "nlm-evidence-contract"]) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

const readiness = await import(pathToFileURL(join(compiledDir, "source-readiness-contract.mjs")).href)
const nlm = await import(pathToFileURL(join(compiledDir, "nlm-evidence-contract.mjs")).href)

test.after(() => rmSync(compiledDir, { recursive: true, force: true }))

test("every source keeps five independent readiness axes and does not collapse to connected", () => {
  assert.equal(readiness.SOURCE_READINESS_SCHEMA, "fusarium-source-readiness/v1")
  for (const row of readiness.SOURCE_READINESS_INVENTORY) {
    assert.equal(readiness.readinessAxesAreIndependent(row), true, row.sourceId)
    assert.ok(row.axes.configured)
    assert.ok(row.axes.reachable)
    assert.ok(row.axes.authorized)
    assert.ok(row.axes.schemaFresh)
    assert.ok(row.axes.dataPresent)
    assert.notEqual(row.axes.dataPresent, "yes")
  }
})

test("NAS, MINDEX, and Supabase stay approval-gated and unprobed", () => {
  for (const id of ["nas", "mindex", "supabase"]) {
    assert.equal(readiness.inventoryRequiresApproval(id), true)
    const row = readiness.SOURCE_READINESS_INVENTORY.find((item) => item.sourceId === id)
    assert.equal(row.axes.reachable, "not_probed")
    assert.equal(row.axes.authorized, "not_probed")
  }
})

test("NLM evidence is advice only and empty when unbound", () => {
  assert.equal(nlm.NLM_EVIDENCE_SCHEMA, "fusarium-nlm-evidence/v1")
  assert.equal(nlm.EMPTY_NLM_EVIDENCE.autonomousDecision, false)
  assert.equal(nlm.nlmMayActuate(nlm.EMPTY_NLM_EVIDENCE), false)
  assert.equal(nlm.EMPTY_NLM_EVIDENCE.freshness, "unavailable")
  assert.equal(nlm.NLM_TA_CONSUMER.behavior.includes("Never an automatic release"), true)
  assert.equal(nlm.EMPTY_NLM_EVIDENCE.classification, "UNCLASSIFIED")
})
