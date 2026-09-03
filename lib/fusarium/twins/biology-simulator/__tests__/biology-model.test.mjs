import test from "node:test"
import assert from "node:assert/strict"
import {
  BIOLOGY_MODEL_SCHEMA,
  DEFAULT_MODEL_PARAMETERS,
  DEFAULT_BIOLOGY_SCENARIO,
  simulateBiologyScenario,
  simulateBiologyPopulation,
  validateBiologyScenario,
} from "../biology-model.mjs"

test("validates bounded biology scenarios", () => {
  assert.equal(validateBiologyScenario(DEFAULT_BIOLOGY_SCENARIO).ok, true)
  const invalid = validateBiologyScenario({ ...DEFAULT_BIOLOGY_SCENARIO, initialPopulation: 0 })
  assert.equal(invalid.ok, false)
  assert.match(invalid.errors.join(" "), /greater than zero/i)
})

test("runs all four supported models deterministically", () => {
  for (const model of ["logistic", "exponential", "competition", "sir"]) {
    const scenario = { ...DEFAULT_BIOLOGY_SCENARIO, model, parameters: { ...DEFAULT_MODEL_PARAMETERS[model] } }
    const first = simulateBiologyScenario(scenario)
    const second = simulateBiologyScenario(scenario)
    assert.equal(first.ok, true, model)
    assert.deepEqual(first, second, model)
    assert.ok(first.series.length >= 1)
    assert.ok(first.summary.pointCount > 1)
    assert.equal(first.provenance.liveTelemetry, false)
    assert.equal(first.provenance.persisted, false)
  }
})

test("competition exposes a phase plane and SIR conserves a closed population", () => {
  const competition = simulateBiologyScenario({ ...DEFAULT_BIOLOGY_SCENARIO, model: "competition", parameters: { ...DEFAULT_MODEL_PARAMETERS.competition } })
  assert.equal(competition.ok, true)
  assert.equal(competition.series.length, 2)
  assert.equal(competition.phase.length, competition.summary.pointCount)

  const sir = simulateBiologyScenario({ ...DEFAULT_BIOLOGY_SCENARIO, model: "sir", parameters: { ...DEFAULT_MODEL_PARAMETERS.sir } })
  assert.equal(sir.ok, true)
  const initial = Object.values(DEFAULT_MODEL_PARAMETERS.sir).slice(0, 3).reduce((sum, value) => sum + value, 0)
  for (let index = 0; index < sir.summary.pointCount; index += 1) {
    const total = sir.series.reduce((sum, series) => sum + series.points[index].value, 0)
    assert.ok(Math.abs(total - initial) < 0.001)
  }
})

test("rejects unsupported, unbounded, and explosive scenarios without output", () => {
  const unsupported = simulateBiologyScenario({ ...DEFAULT_BIOLOGY_SCENARIO, model: "unknown", parameters: {} })
  assert.equal(unsupported.ok, false)
  assert.equal("series" in unsupported, false)
  const explosive = simulateBiologyScenario({ ...DEFAULT_BIOLOGY_SCENARIO, model: "exponential", durationHours: 720, parameters: { initialPopulation: 1e12, ratePerHour: 2 } })
  assert.equal(explosive.ok, false)
  assert.match(explosive.errors.join(" "), /numerical output bound/i)
})

test("runs a deterministic bounded logistic-growth scenario", () => {
  const first = simulateBiologyPopulation(DEFAULT_BIOLOGY_SCENARIO)
  const second = simulateBiologyPopulation(DEFAULT_BIOLOGY_SCENARIO)
  assert.equal(first.ok, true)
  assert.deepEqual(first, second)
  assert.equal(first.schema, BIOLOGY_MODEL_SCHEMA)
  assert.equal(first.points[0].population, DEFAULT_BIOLOGY_SCENARIO.initialPopulation)
  assert.ok(first.summary.finalPopulation > first.summary.initialPopulation)
  assert.ok(first.summary.finalPopulation <= first.summary.carryingCapacity)
  assert.equal(first.provenance.liveTelemetry, false)
  assert.equal(first.provenance.calibrated, false)
})

test("does not invent a result for invalid inputs", () => {
  const result = simulateBiologyPopulation({
    ...DEFAULT_BIOLOGY_SCENARIO,
    carryingCapacity: 10,
  })
  assert.equal(result.ok, false)
  assert.equal("points" in result, false)
})
