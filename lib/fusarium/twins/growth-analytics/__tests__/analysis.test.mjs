import test from "node:test"
import assert from "node:assert/strict"
import { analyzeGrowthSeries, normalizeGrowthSourceResult, validateGrowthSeries } from "../analysis.mjs"

const series = {
  source: "lab-export-7",
  metric: "biomass",
  unit: "g",
  freshnessThresholdHours: 24,
  projectionHorizonHours: 2,
  records: Array.from({ length: 7 }, (_, index) => ({
    observedAt: new Date(Date.UTC(2026, 8, 1, index * 2)).toISOString(),
    value: 2 + index * 0.5,
  })),
}

test("validates, sorts, and retains provenance for a bounded imported series", () => {
  const input = { ...series, records: [...series.records].reverse() }
  const result = validateGrowthSeries(input)
  assert.equal(result.ok, true)
  assert.equal(result.records.length, 7)
  assert.equal(result.records[0].value, 2)
  assert.equal(result.source, "lab-export-7")
})

test("rejects missing provenance, duplicate timestamps, non-finite values, and oversized series", () => {
  const result = validateGrowthSeries({
    records: [
      { observedAt: "2026-09-01T00:00:00Z", value: 1 },
      { observedAt: "2026-09-01T00:00:00Z", value: Number.NaN },
    ],
  })
  assert.equal(result.ok, false)
  assert.match(result.errors.join(" "), /source is required/)
  assert.match(result.errors.join(" "), /metric is required/)
  assert.match(result.errors.join(" "), /unit is required/)
})

test("computes deterministic descriptive statistics and only a bounded, labeled linear projection", () => {
  const now = Date.parse("2026-09-01T13:00:00Z")
  const result = analyzeGrowthSeries(series, now)
  assert.equal(result.state, "available")
  assert.equal(result.descriptive.count, 7)
  assert.equal(result.descriptive.change, 3)
  assert.equal(result.descriptive.slopePerHour, 0.25)
  assert.equal(result.projection.method, "bounded-linear-trend-extrapolation")
  assert.match(result.projection.label, /not a biological growth model/)
  assert.equal(result.projection.horizonHours, 2)
})

test("withholds projection when the evidence gate is not met and reports stale observations", () => {
  const input = { ...series, projectionHorizonHours: 4, records: series.records.slice(0, 3), freshnessThresholdHours: 1 }
  const result = analyzeGrowthSeries(input, Date.parse("2026-09-02T00:00:00Z"))
  assert.equal(result.state, "stale")
  assert.equal(result.projection, null)
  assert.equal(result.projectionGate.eligible, false)
})

test("turns success-shaped unavailable upstream responses into unavailable source state", () => {
  assert.equal(normalizeGrowthSourceResult("mas-instrument", true, { available: false, instruments: [], summary: null }).state, "unavailable")
  assert.equal(normalizeGrowthSourceResult("mindex-stats", true, { mindex_available: false }).state, "unavailable")
  assert.equal(normalizeGrowthSourceResult("mas-instrument", true, { result: { has_instrument_data: false, instruments: [] } }).state, "empty")
})

test("recognizes authoritative MINDEX aggregate statistics without inventing missing counts", () => {
  const result = normalizeGrowthSourceResult("mindex-stats", true, { total_taxa: 12, data_source: "mindex" })
  assert.equal(result.state, "available")
  assert.equal(result.taxa, 12)
  assert.equal(result.observations, null)
})
