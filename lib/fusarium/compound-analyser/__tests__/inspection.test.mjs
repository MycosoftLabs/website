import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { inspectCompound, parseFormula } from "../inspection.ts"

const here = dirname(fileURLToPath(import.meta.url))
const hostRoot = join(here, "..", "..", "..", "..")

test("simple formulas are parsed deterministically", () => {
  assert.deepEqual(parseFormula("C12H17N2O4P"), { C: 12, H: 17, N: 2, O: 4, P: 1 })
  assert.equal(parseFormula("NaCl" )?.Na, 1)
  assert.equal(parseFormula("C6H12O6)"), null)
  assert.equal(parseFormula(""), null)
})

test("inspection derives bounded arithmetic and preserves supplied provenance", () => {
  const result = inspectCompound({
    name: "Water",
    formula: "H2O",
    molecularWeight: 18.015,
    source: "operator lab notebook",
    sourceRecordId: "record-1",
  })
  assert.equal(result.state, "inspection_complete")
  assert.equal(result.deterministicChecks.totalAtoms, 3)
  assert.equal(result.deterministicChecks.formulaDerivedMolarMass, 18.015)
  assert.equal(result.deterministicChecks.weightDifferencePercent, 0)
  assert.equal(result.evidence.provenance.source, "operator lab notebook")
  assert.deepEqual(result.boundaries, {
    simulationRun: false,
    structureValidated: false,
    identityConfirmed: false,
    toxicityAssessed: false,
    writesPerformed: false,
  })
})

test("unsupported or incomplete evidence produces warnings, not scientific claims", () => {
  const unsupported = inspectCompound({ formula: "XeF2" })
  assert.equal(unsupported.deterministicChecks.formulaDerivedMolarMass, null)
  assert.match(unsupported.warnings.join(" "), /Xe/)
  assert.match(unsupported.warnings.join(" "), /provenance/i)
  const blank = inspectCompound({})
  assert.match(blank.warnings.join(" "), /identifier/i)
})

test("legacy simulation and save routes fail closed", () => {
  const simulation = readFileSync(join(hostRoot, "app", "api", "compounds", "simulate", "route.ts"), "utf8")
  const store = readFileSync(join(hostRoot, "app", "api", "compounds", "simulations", "route.ts"), "utf8")
  assert.match(simulation, /state: "unavailable"/)
  assert.match(simulation, /status: 503/)
  assert.doesNotMatch(simulation, /success: true/)
  assert.match(store, /state: "write_disabled"/)
  assert.match(store, /status: 405/)
  assert.doesNotMatch(store, /simulations\.push/)
})

test("Fusarium boundary mounts the evidence workbench while retaining parity import", () => {
  const mount = readFileSync(join(hostRoot, "components", "fusarium", "twins", "compound-analyser", "compound-analyser-mount.tsx"), "utf8")
  const workbench = readFileSync(join(hostRoot, "components", "fusarium", "compound-analyser", "compound-evidence-workbench.tsx"), "utf8")
  assert.match(mount, /CompoundAnalyserPage/)
  assert.match(mount, /CompoundEvidenceWorkbench/)
  assert.match(workbench, /No simulation or write occurs/)
  assert.match(workbench, /Import JSON locally/)
})
