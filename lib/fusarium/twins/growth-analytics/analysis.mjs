const MAX_RECORDS = 500
const MAX_BYTES = 256 * 1024

function finite(value) {
  return typeof value === "number" && Number.isFinite(value)
}

function quantile(sorted, p) {
  const index = (sorted.length - 1) * p
  const low = Math.floor(index)
  const high = Math.ceil(index)
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low)
}

export function validateGrowthSeries(input) {
  const errors = []
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Import must be a JSON object."], records: [] }
  }
  if (JSON.stringify(input).length > MAX_BYTES) errors.push("Import exceeds the 256 KiB limit.")
  const source = typeof input.source === "string" ? input.source.trim() : ""
  const metric = typeof input.metric === "string" ? input.metric.trim() : ""
  const unit = typeof input.unit === "string" ? input.unit.trim() : ""
  if (!source) errors.push("source is required.")
  if (!metric) errors.push("metric is required.")
  if (!unit) errors.push("unit is required.")
  if (!Array.isArray(input.records)) errors.push("records must be an array.")
  const rows = Array.isArray(input.records) ? input.records : []
  if (rows.length < 2) errors.push("At least two observations are required.")
  if (rows.length > MAX_RECORDS) errors.push(`At most ${MAX_RECORDS} observations are accepted.`)

  const records = []
  const timestamps = new Set()
  for (let index = 0; index < Math.min(rows.length, MAX_RECORDS); index += 1) {
    const row = rows[index]
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(`records[${index}] must be an object.`)
      continue
    }
    const observedAt = typeof row.observedAt === "string" ? row.observedAt : ""
    const ms = Date.parse(observedAt)
    if (!observedAt || !Number.isFinite(ms)) {
      errors.push(`records[${index}].observedAt must be an ISO timestamp.`)
      continue
    }
    if (!finite(row.value)) {
      errors.push(`records[${index}].value must be a finite number.`)
      continue
    }
    if (timestamps.has(ms)) {
      errors.push(`records[${index}] duplicates a timestamp.`)
      continue
    }
    timestamps.add(ms)
    records.push({ observedAt: new Date(ms).toISOString(), timestampMs: ms, value: row.value })
  }
  records.sort((a, b) => a.timestampMs - b.timestampMs)
  return { ok: errors.length === 0, errors, records, source, metric, unit }
}

export function analyzeGrowthSeries(input, nowMs = Date.now()) {
  const validated = validateGrowthSeries(input)
  if (!validated.ok) return { contract: "fusarium-growth-analysis/v1", state: "invalid", ...validated }

  const { records, source, metric, unit } = validated
  const values = records.map((row) => row.value)
  const sorted = [...values].sort((a, b) => a - b)
  const count = values.length
  const mean = values.reduce((sum, value) => sum + value, 0) / count
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count
  const firstMs = records[0].timestampMs
  const lastMs = records[count - 1].timestampMs
  const durationHours = (lastMs - firstMs) / 3_600_000
  const xs = records.map((row) => (row.timestampMs - firstMs) / 3_600_000)
  const xMean = xs.reduce((sum, value) => sum + value, 0) / count
  const covariance = xs.reduce((sum, x, index) => sum + (x - xMean) * (values[index] - mean), 0)
  const xVariance = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0)
  const slopePerHour = xVariance === 0 ? null : covariance / xVariance
  const intercept = slopePerHour === null ? null : mean - slopePerHour * xMean
  const totalVariance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0)
  const residual = slopePerHour === null
    ? null
    : values.reduce((sum, value, index) => sum + (value - (intercept + slopePerHour * xs[index])) ** 2, 0)
  const rSquared = residual === null || totalVariance === 0 ? null : Math.max(0, Math.min(1, 1 - residual / totalVariance))
  const freshnessThresholdHours = finite(input.freshnessThresholdHours)
    ? Math.min(24 * 365, Math.max(1 / 60, input.freshnessThresholdHours))
    : 24
  const ageHours = Math.max(0, (nowMs - lastMs) / 3_600_000)
  const state = ageHours > freshnessThresholdHours ? "stale" : "available"

  const requestedHorizon = finite(input.projectionHorizonHours) ? input.projectionHorizonHours : null
  const maxHorizon = Math.min(24, durationHours * 0.25)
  const eligible = count >= 6 && durationHours >= 6 && slopePerHour !== null && rSquared !== null && rSquared >= 0.8
  const horizonHours = requestedHorizon === null ? null : Math.min(maxHorizon, Math.max(0, requestedHorizon))
  const projection = eligible && horizonHours && horizonHours > 0
    ? {
        method: "bounded-linear-trend-extrapolation",
        label: "Descriptive linear trend; not a biological growth model or measured future value.",
        horizonHours,
        projectedValue: values[count - 1] + slopePerHour * horizonHours,
        fitRSquared: rSquared,
      }
    : null

  return {
    contract: "fusarium-growth-analysis/v1",
    state,
    provenance: { source, metric, unit, firstObservedAt: records[0].observedAt, lastObservedAt: records[count - 1].observedAt },
    freshness: { ageHours, thresholdHours: freshnessThresholdHours },
    descriptive: {
      count,
      durationHours,
      first: values[0],
      last: values[count - 1],
      change: values[count - 1] - values[0],
      min: sorted[0],
      max: sorted[count - 1],
      mean,
      median: quantile(sorted, 0.5),
      standardDeviation: Math.sqrt(variance),
      slopePerHour,
      fitRSquared: rSquared,
    },
    projection,
    projectionGate: projection
      ? { eligible: true, reason: "Six or more observations, six or more hours, and linear fit R² at least 0.80." }
      : { eligible: false, reason: eligible ? "Request a positive horizon within 25% of the observed duration and no more than 24 hours." : "Projection requires at least six observations across six hours with linear fit R² at least 0.80." },
  }
}

export function normalizeGrowthSourceResult(sourceId, httpOk, payload) {
  const body = payload && typeof payload === "object" ? payload : {}
  const explicitlyUnavailable = body.available === false || body.mindex_available === false || body.error === true || typeof body.error === "string"
  if (!httpOk || explicitlyUnavailable) {
    return { sourceId, state: "unavailable", detail: typeof body.detail === "string" ? body.detail : "Source did not return authoritative data." }
  }
  if (sourceId === "mas-instrument") {
    const result = body.result && typeof body.result === "object" ? body.result : body
    const hasData = result.has_instrument_data === true || (Array.isArray(result.instruments) && result.instruments.length > 0)
    return hasData
      ? { sourceId, state: "available", detail: "Instrument observations are present." }
      : { sourceId, state: "empty", detail: "The authorized query returned no instrument observations." }
  }
  if (sourceId === "mindex-stats") {
    const taxa = Number(body.total_taxa ?? body.taxa)
    const observations = Number(body.total_observations ?? body.observations)
    return Number.isFinite(taxa) || Number.isFinite(observations)
      ? { sourceId, state: "available", detail: "MINDEX aggregate statistics are present.", taxa: Number.isFinite(taxa) ? taxa : null, observations: Number.isFinite(observations) ? observations : null }
      : { sourceId, state: "unavailable", detail: "MINDEX returned no recognized aggregate statistics." }
  }
  return { sourceId, state: "available", detail: "Source contract is reachable." }
}
