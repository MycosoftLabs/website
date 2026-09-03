/**
 * Fusarium Nature Statistics evidence contract.
 *
 * This module deliberately contains no counter animation, interpolation, demo
 * values, or source fallback. It only normalizes passive, same-origin reads.
 */

export type EvidenceState = "available" | "stale" | "verified-empty" | "unbound" | "error"
export type FreshnessState = "current" | "stale" | "unknown"

export type SourceId =
  | "mindex-stats"
  | "kingdom-stats"
  | "air-quality"
  | "ocean-conditions"
  | "land-transit"
  | "aircraft"
  | "vessels"
  | "drones"
  | "agent-runs"

export interface SourceDefinition {
  id: SourceId
  label: string
  endpoint: string
  source: string
  freshnessMs: number
  emptyIsVerified: boolean
}

export const NATURE_STATISTICS_SOURCES: readonly SourceDefinition[] = [
  {
    id: "mindex-stats",
    label: "MINDEX biodiversity totals",
    endpoint: "/api/natureos/mindex/stats",
    source: "MINDEX core statistics",
    freshnessMs: 15 * 60_000,
    emptyIsVerified: true,
  },
  {
    id: "kingdom-stats",
    label: "Kingdom coverage",
    endpoint: "/api/ancestry/kingdoms",
    source: "MINDEX bio.kingdom_stats",
    freshnessMs: 15 * 60_000,
    emptyIsVerified: true,
  },
  {
    id: "air-quality",
    label: "Air-quality observations",
    endpoint:
      "/api/mindex/environment/air-quality?lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=2000",
    source: "MINDEX atmos.air_quality",
    freshnessMs: 6 * 60 * 60_000,
    emptyIsVerified: true,
  },
  {
    id: "ocean-conditions",
    label: "Ocean physical observations",
    endpoint: "/api/mindex/maritime/ocean-environments?limit=200",
    source: "MINDEX ocean_environments",
    freshnessMs: 24 * 60 * 60_000,
    emptyIsVerified: true,
  },
  {
    id: "land-transit",
    label: "Land transit positions",
    endpoint: "/api/mindex/transit/vehicles?bbox=-180,-85,180,85",
    source: "MINDEX transit.vehicles",
    freshnessMs: 10 * 60_000,
    emptyIsVerified: true,
  },
  {
    id: "aircraft",
    label: "Aircraft observations",
    endpoint:
      "/api/mindex/earth/map/bbox?layer=aircraft&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=2000",
    source: "MINDEX transport.aircraft",
    freshnessMs: 15 * 60_000,
    // earth/map/bbox currently catches missing-table errors and returns [].
    emptyIsVerified: false,
  },
  {
    id: "vessels",
    label: "Vessel observations",
    endpoint:
      "/api/mindex/earth/map/bbox?layer=vessels&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=2000",
    source: "MINDEX transport.vessels",
    freshnessMs: 60 * 60_000,
    // earth/map/bbox currently catches missing-table errors and returns [].
    emptyIsVerified: false,
  },
  {
    id: "drones",
    label: "Drone status",
    endpoint: "/api/mindex/drone/status",
    source: "MINDEX app.v_drone_status",
    freshnessMs: 15 * 60_000,
    emptyIsVerified: true,
  },
  {
    id: "agent-runs",
    label: "MYCA agent runs",
    endpoint: "/api/myca/runs?page=1&pageSize=100",
    source: "MYCA MAS run ledger",
    freshnessMs: 15 * 60_000,
    emptyIsVerified: true,
  },
] as const

export interface RequiredAdapter {
  id: string
  domain: string
  label: string
  endpoint: string
  source: string
  unit: string
  requirement: string
}

export const REQUIRED_NATURE_STATISTICS_ADAPTERS: readonly RequiredAdapter[] = [
  {
    id: "world-population",
    domain: "Demography",
    label: "World population",
    endpoint: "/api/mindex/demography/world",
    source: "Authoritative demography provider via MINDEX",
    unit: "people",
    requirement:
      "Return provider, dataset version, measured or modeled base value, base timestamp, publication timestamp, and uncertainty.",
  },
  {
    id: "births",
    domain: "Demography",
    label: "Births",
    endpoint: "/api/mindex/demography/world",
    source: "Authoritative vital-statistics provider via MINDEX",
    unit: "births",
    requirement:
      "Return a dated observation window. A rate may be returned only with its authority, base timestamp, validity window, and method.",
  },
  {
    id: "deaths",
    domain: "Demography",
    label: "Deaths",
    endpoint: "/api/mindex/demography/world",
    source: "Authoritative vital-statistics provider via MINDEX",
    unit: "deaths",
    requirement:
      "Return a dated observation window; the browser must never synthesize a ticking counter.",
  },
  {
    id: "ai-usage",
    domain: "Agentic activity",
    label: "AI and agent usage",
    endpoint: "/api/agent/usage",
    source: "Verified-user usage ledger",
    unit: "tokens or requests",
    requirement:
      "Existing route requires verified user scope. Add a passive, policy-scoped aggregate suitable for this dashboard or bind an authenticated operator session explicitly.",
  },
  {
    id: "openclaw-activity",
    domain: "Agentic activity",
    label: "OpenClaw activity",
    endpoint: "/api/mindex/agents/openclaw/activity",
    source: "OpenClaw execution ledger via MINDEX",
    unit: "actions",
    requirement:
      "Return windowed execution/action counts, outcomes, agent or device identity, observed_at, updated_at, and source version without message content.",
  },
  {
    id: "x402-transactions",
    domain: "Agentic activity",
    label: "x402 transactions",
    endpoint: "/api/mindex/mycodao/x402/summary",
    source: "MINDEX mycodao.x402_audit_log",
    unit: "transactions",
    requirement:
      "Add a passive GET aggregate over the existing x402 audit ledger. Keep simulated, test, and operational transactions separate and include the observation window.",
  },
  {
    id: "soil-quality",
    domain: "Ground quality",
    label: "Soil and ground quality",
    endpoint: "/api/mindex/environment/soil-quality",
    source: "MINDEX environmental observations",
    unit: "measurements",
    requirement:
      "Return site, parameter, value, unit, location, source, measured_at, quality flag, and collection method for pH, moisture, nutrients, contaminants, and soil condition.",
  },
  {
    id: "water-quality",
    domain: "Water quality",
    label: "Freshwater and marine quality",
    endpoint: "/api/mindex/environment/water-quality",
    source: "MINDEX environmental observations",
    unit: "measurements",
    requirement:
      "Return site, parameter, value, unit, location, source, measured_at, and quality flag for pH, dissolved oxygen, turbidity, conductivity, nutrients, and contaminants.",
  },
  {
    id: "impact-summary",
    domain: "Environmental impact",
    label: "Human and machine impact",
    endpoint: "/api/mindex/impact/summary",
    source: "Audited activity and emissions inventories via MINDEX",
    unit: "source-specific",
    requirement:
      "Return separate human, land, aviation, maritime, UAV, and compute inventories with activity period, method, units, uncertainty, observed_at, published_at, and source.",
  },
] as const

export interface SourceFetchResult {
  id: SourceId
  endpoint: string
  ok: boolean
  status: number
  receivedAt: string
  data: unknown
  error: string | null
}

export interface FreshnessEvidence {
  state: FreshnessState
  ageMs: number | null
  thresholdMs: number | null
  label: string
}

export interface EvidenceMetric {
  id: string
  label: string
  value: number | string | null
  unit: string
  state: EvidenceState
  source: string
  endpoint: string
  observedAt: string | null
  updatedAt: string | null
  freshness: FreshnessEvidence
  detail: string
}

export interface EvidenceRecord {
  id: string
  title: string
  subtitle: string
  facts: Array<{ label: string; value: string; unit: string }>
  state: EvidenceState
  source: string
  endpoint: string
  observedAt: string | null
  updatedAt: string | null
  freshness: FreshnessEvidence
}

export interface SourceEvidence {
  id: SourceId
  label: string
  endpoint: string
  source: string
  state: EvidenceState
  observedAt: string | null
  updatedAt: string | null
  freshness: FreshnessEvidence
  detail: string
}

export interface NatureStatisticsSnapshot {
  generatedAt: string
  headline: EvidenceMetric[]
  agents: EvidenceMetric[]
  kingdoms: EvidenceMetric[]
  air: EvidenceMetric[]
  ground: EvidenceMetric[]
  water: EvidenceMetric[]
  transport: EvidenceMetric[]
  impact: EvidenceMetric[]
  agentRunRecords: EvidenceRecord[]
  airRecords: EvidenceRecord[]
  oceanRecords: EvidenceRecord[]
  landRecords: EvidenceRecord[]
  aircraftRecords: EvidenceRecord[]
  vesselRecords: EvidenceRecord[]
  droneRecords: EvidenceRecord[]
  sources: SourceEvidence[]
  requiredAdapters: readonly RequiredAdapter[]
}

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return fallback
}

function number(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

function iso(value: unknown): string | null {
  const candidate = text(value)
  if (!candidate) return null
  const parsed = Date.parse(candidate)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function latestIso(values: Array<unknown>): string | null {
  let latest: string | null = null
  let latestMs = -Infinity
  for (const value of values) {
    const candidate = iso(value)
    if (!candidate) continue
    const candidateMs = Date.parse(candidate)
    if (candidateMs > latestMs) {
      latest = candidate
      latestMs = candidateMs
    }
  }
  return latest
}

function freshness(
  observedAt: string | null,
  thresholdMs: number | null,
  now: string,
): FreshnessEvidence {
  if (!observedAt || thresholdMs == null) {
    return { state: "unknown", ageMs: null, thresholdMs, label: "Freshness unknown" }
  }
  const observedMs = Date.parse(observedAt)
  const nowMs = Date.parse(now)
  if (!Number.isFinite(observedMs) || !Number.isFinite(nowMs)) {
    return { state: "unknown", ageMs: null, thresholdMs, label: "Freshness unknown" }
  }
  const ageMs = Math.max(0, nowMs - observedMs)
  if (ageMs > thresholdMs) {
    return { state: "stale", ageMs, thresholdMs, label: "Outside freshness window" }
  }
  return { state: "current", ageMs, thresholdMs, label: "Inside freshness window" }
}

function stateWithFreshness(state: EvidenceState, fresh: FreshnessEvidence): EvidenceState {
  return state === "available" && fresh.state === "stale" ? "stale" : state
}

interface MetricInput {
  id: string
  label: string
  value: number | string | null
  unit: string
  state: EvidenceState
  source: string
  endpoint: string
  observedAt: string | null
  updatedAt: string | null
  freshnessMs: number | null
  detail: string
  now: string
}

function metric(input: MetricInput): EvidenceMetric {
  const fresh = freshness(input.observedAt, input.freshnessMs, input.now)
  return {
    id: input.id,
    label: input.label,
    value: input.value,
    unit: input.unit,
    state: stateWithFreshness(input.state, fresh),
    source: input.source,
    endpoint: input.endpoint,
    observedAt: input.observedAt,
    updatedAt: input.updatedAt,
    freshness: fresh,
    detail: input.detail,
  }
}

function unboundMetric(
  adapter: RequiredAdapter,
  now: string,
  detail = adapter.requirement,
): EvidenceMetric {
  return metric({
    id: adapter.id,
    label: adapter.label,
    value: null,
    unit: adapter.unit,
    state: "unbound",
    source: adapter.source,
    endpoint: adapter.endpoint,
    observedAt: null,
    updatedAt: null,
    freshnessMs: null,
    detail,
    now,
  })
}

function definition(id: SourceId): SourceDefinition {
  const found = NATURE_STATISTICS_SOURCES.find((source) => source.id === id)
  if (!found) throw new Error(`Unknown Nature Statistics source: ${id}`)
  return found
}

function resultMap(results: readonly SourceFetchResult[]): Map<SourceId, SourceFetchResult> {
  return new Map(results.map((result) => [result.id, result]))
}

function resultFailureMetric(
  id: string,
  label: string,
  unit: string,
  source: SourceDefinition,
  result: SourceFetchResult | undefined,
  now: string,
): EvidenceMetric {
  return metric({
    id,
    label,
    value: null,
    unit,
    state: result ? "error" : "unbound",
    source: source.source,
    endpoint: source.endpoint,
    observedAt: null,
    updatedAt: result?.receivedAt ?? null,
    freshnessMs: source.freshnessMs,
    detail: result?.error || (result ? `Source returned HTTP ${result.status}.` : "Source has not been queried."),
    now,
  })
}

function resultRecords(
  source: SourceDefinition,
  result: SourceFetchResult | undefined,
  getRows: (payload: JsonRecord) => unknown[],
): unknown[] | null {
  if (!result?.ok) return null
  return getRows(record(result.data))
}

function sourceState(
  source: SourceDefinition,
  result: SourceFetchResult | undefined,
  observedAt: string | null,
  rowCount: number | null,
  now: string,
  detail: string,
): SourceEvidence {
  let state: EvidenceState
  if (!result) state = "unbound"
  else if (!result.ok) state = "error"
  else if (rowCount === 0) state = source.emptyIsVerified ? "verified-empty" : "unbound"
  else state = "available"
  const fresh = freshness(observedAt, source.freshnessMs, now)
  return {
    id: source.id,
    label: source.label,
    endpoint: source.endpoint,
    source: source.source,
    state: stateWithFreshness(state, fresh),
    observedAt,
    updatedAt: result?.receivedAt ?? null,
    freshness: fresh,
    detail: result?.error || detail,
  }
}

function countsBy(rows: unknown[], selector: (row: JsonRecord) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const raw of rows) {
    const key = selector(record(raw)).trim() || "Unspecified"
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}

function topCounts(counts: Map<string, number>, limit = 6): string {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => `${key}: ${count.toLocaleString()}`)
    .join(" · ")
}

function evidenceRecord(
  input: Omit<EvidenceRecord, "state" | "freshness"> & {
    state?: EvidenceState
    freshnessMs: number
    now: string
  },
): EvidenceRecord {
  const fresh = freshness(input.observedAt, input.freshnessMs, input.now)
  return {
    id: input.id,
    title: input.title,
    subtitle: input.subtitle,
    facts: input.facts,
    state: stateWithFreshness(input.state || "available", fresh),
    source: input.source,
    endpoint: input.endpoint,
    observedAt: input.observedAt,
    updatedAt: input.updatedAt,
    freshness: fresh,
  }
}

function initialSourceEvidence(source: SourceDefinition): SourceEvidence {
  return {
    id: source.id,
    label: source.label,
    endpoint: source.endpoint,
    source: source.source,
    state: "unbound",
    observedAt: null,
    updatedAt: null,
    freshness: { state: "unknown", ageMs: null, thresholdMs: source.freshnessMs, label: "Not queried" },
    detail: "Waiting for the first passive read.",
  }
}

export function createInitialNatureStatisticsSnapshot(now = new Date().toISOString()): NatureStatisticsSnapshot {
  const required = new Map(REQUIRED_NATURE_STATISTICS_ADAPTERS.map((adapter) => [adapter.id, adapter]))
  const requiredMetric = (id: string) => unboundMetric(required.get(id)!, now)
  const requiredDimension = (
    adapterId: string,
    id: string,
    label: string,
    unit: string,
    detail: string,
  ) => unboundMetric({ ...required.get(adapterId)!, id, label, unit }, now, detail)
  const pending = (id: SourceId, metricId: string, label: string, unit: string) =>
    resultFailureMetric(metricId, label, unit, definition(id), undefined, now)

  return {
    generatedAt: now,
    headline: [
      pending("mindex-stats", "taxa", "Taxa indexed", "taxa"),
      pending("mindex-stats", "observations", "Biological observations", "observations"),
      requiredMetric("world-population"),
      requiredMetric("births"),
      requiredMetric("deaths"),
    ],
    agents: [
      pending("agent-runs", "agent-runs-total", "Agent runs", "runs"),
      pending("agent-runs", "agent-runs-active", "Runs active", "runs"),
      pending("agent-runs", "agent-runs-failed", "Runs failed in returned window", "runs"),
      requiredMetric("ai-usage"),
      requiredMetric("openclaw-activity"),
      requiredMetric("x402-transactions"),
    ],
    kingdoms: [pending("kingdom-stats", "kingdom-coverage", "Kingdom coverage", "kingdoms")],
    air: [
      pending("air-quality", "air-readings", "Air-quality readings", "readings"),
      pending("air-quality", "air-stations", "Air-quality stations", "stations"),
      pending("air-quality", "air-parameters", "Air-quality parameters", "parameters"),
    ],
    ground: [
      requiredDimension("soil-quality", "soil-sites", "Soil sampling sites", "sites", "Requires geolocated, source-identified soil sampling sites."),
      requiredDimension("soil-quality", "soil-ph", "Soil pH observations", "readings", "Requires measured pH, sampling method, quality flag, and timestamp."),
      requiredDimension("soil-quality", "soil-moisture", "Soil moisture observations", "readings", "Requires measured moisture, units, depth, method, quality flag, and timestamp."),
      requiredDimension("soil-quality", "soil-nutrients", "Soil nutrient observations", "readings", "Requires parameterized nitrogen, phosphorus, potassium, carbon, and related nutrient measurements."),
      requiredDimension("soil-quality", "soil-contaminants", "Soil contaminant observations", "readings", "Requires parameter, concentration, units, detection limit, method, quality flag, and timestamp."),
    ],
    water: [
      requiredDimension("water-quality", "water-sites", "Water sampling sites", "sites", "Requires geolocated freshwater and marine sampling sites with source identity."),
      requiredDimension("water-quality", "water-ph", "Water pH observations", "readings", "Requires measured pH, method, quality flag, waterbody, and timestamp."),
      requiredDimension("water-quality", "water-oxygen", "Dissolved oxygen observations", "readings", "Requires value, units, depth, method, quality flag, and timestamp."),
      requiredDimension("water-quality", "water-turbidity", "Turbidity observations", "readings", "Requires value, units, method, quality flag, and timestamp."),
      requiredDimension("water-quality", "water-conductivity", "Conductivity observations", "readings", "Requires value, units, temperature compensation, method, quality flag, and timestamp."),
      requiredDimension("water-quality", "water-contaminants", "Water nutrient and contaminant observations", "readings", "Requires parameter, concentration, units, detection limit, method, quality flag, and timestamp."),
      pending("ocean-conditions", "ocean-observations", "Ocean physical observations", "observations"),
    ],
    transport: [
      pending("land-transit", "land-vehicles", "Land transit rows returned", "records"),
      pending("aircraft", "aircraft", "Aircraft rows returned", "records"),
      pending("vessels", "vessels", "Vessel rows returned", "records"),
      pending("drones", "drones", "Registered drones", "drones"),
    ],
    impact: [
      requiredDimension("impact-summary", "human-impact", "Human activity impact", "inventory records", "Requires an audited human-activity inventory period, source, method, units, and uncertainty."),
      requiredDimension("impact-summary", "land-impact", "Land-vehicle impact", "inventory records", "Requires land-transport activity and emissions inventory evidence; positions are not converted in the browser."),
      requiredDimension("impact-summary", "aviation-impact", "Aviation impact", "inventory records", "Requires aviation activity and emissions inventory evidence with an explicit period and method."),
      requiredDimension("impact-summary", "maritime-impact", "Maritime impact", "inventory records", "Requires vessel activity and emissions inventory evidence with an explicit period and method."),
      requiredDimension("impact-summary", "uav-impact", "Drone and UAV impact", "inventory records", "Requires measured or audited energy, fuel, payload, and mission-period evidence."),
      requiredDimension("impact-summary", "compute-impact", "Machine and compute impact", "inventory records", "Requires measured energy and water use plus location-aware emissions factors, period, method, and uncertainty."),
    ],
    agentRunRecords: [],
    airRecords: [],
    oceanRecords: [],
    landRecords: [],
    aircraftRecords: [],
    vesselRecords: [],
    droneRecords: [],
    sources: NATURE_STATISTICS_SOURCES.map(initialSourceEvidence),
    requiredAdapters: REQUIRED_NATURE_STATISTICS_ADAPTERS,
  }
}

export function buildNatureStatisticsSnapshot(
  results: readonly SourceFetchResult[],
  now = new Date().toISOString(),
): NatureStatisticsSnapshot {
  const snapshot = createInitialNatureStatisticsSnapshot(now)
  const byId = resultMap(results)
  const sources = new Map<SourceId, SourceEvidence>()

  // Biodiversity totals.
  const statsSource = definition("mindex-stats")
  const statsResult = byId.get("mindex-stats")
  const stats = record(statsResult?.data)
  const statsAvailable = Boolean(statsResult?.ok && stats.data_source === "mindex" && stats.mindex_available !== false)
  if (statsAvailable) {
    const updatedAt = statsResult!.receivedAt
    const observedAt = iso(stats.last_updated) || updatedAt
    const totalTaxa = number(stats.total_taxa) ?? 0
    const totalObservations = number(stats.total_observations) ?? 0
    const observationRange = record(stats.observation_date_range)
    snapshot.headline[0] = metric({
      id: "taxa",
      label: "Taxa indexed",
      value: totalTaxa,
      unit: "taxa",
      state: totalTaxa === 0 ? "verified-empty" : "available",
      source: statsSource.source,
      endpoint: statsSource.endpoint,
      observedAt,
      updatedAt,
      freshnessMs: statsSource.freshnessMs,
      detail: "Database count at query time; it is not an estimated global species total.",
      now,
    })
    snapshot.headline[1] = metric({
      id: "observations",
      label: "Biological observations",
      value: totalObservations,
      unit: "observations",
      state: totalObservations === 0 ? "verified-empty" : "available",
      source: statsSource.source,
      endpoint: statsSource.endpoint,
      observedAt: iso(observationRange.latest) || observedAt,
      updatedAt,
      freshnessMs: statsSource.freshnessMs,
      detail: "MINDEX observation rows; not extrapolated between refreshes.",
      now,
    })
    sources.set(
      "mindex-stats",
      sourceState(statsSource, statsResult, observedAt, totalTaxa + totalObservations, now, "MINDEX count query completed."),
    )
  } else {
    snapshot.headline[0] = resultFailureMetric("taxa", "Taxa indexed", "taxa", statsSource, statsResult, now)
    snapshot.headline[1] = resultFailureMetric(
      "observations",
      "Biological observations",
      "observations",
      statsSource,
      statsResult,
      now,
    )
    const failedStatsResult = statsResult
      ? { ...statsResult, ok: false, error: statsResult.error || text(stats.error, "MINDEX stats unavailable.") }
      : statsResult
    sources.set("mindex-stats", sourceState(statsSource, failedStatsResult, null, null, now, "MINDEX stats unavailable."))
  }

  // Kingdom coverage.
  const kingdomSource = definition("kingdom-stats")
  const kingdomResult = byId.get("kingdom-stats")
  const kingdomRows = resultRecords(kingdomSource, kingdomResult, (payload) => array(payload.kingdoms))
  if (kingdomRows) {
    const observedAt = kingdomResult!.receivedAt
    snapshot.kingdoms = kingdomRows.length
      ? kingdomRows
          .map((raw) => record(raw))
          .map((row, index) => {
            const count = number(row.taxon_count) ?? 0
            const label = text(row.kingdom, "Undesignated")
            return metric({
              id: `kingdom-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || index}`,
              label,
              value: count,
              unit: "taxa",
              state: count === 0 ? "verified-empty" : "available",
              source: kingdomSource.source,
              endpoint: kingdomSource.endpoint,
              observedAt,
              updatedAt: kingdomResult!.receivedAt,
              freshnessMs: kingdomSource.freshnessMs,
              detail: "Count returned by MINDEX bio.kingdom_stats at query time.",
              now,
            })
          })
          .sort((a, b) => Number(b.value) - Number(a.value))
      : [
          metric({
            id: "kingdom-coverage",
            label: "Kingdom coverage",
            value: 0,
            unit: "kingdoms",
            state: "verified-empty",
            source: kingdomSource.source,
            endpoint: kingdomSource.endpoint,
            observedAt,
            updatedAt: kingdomResult!.receivedAt,
            freshnessMs: kingdomSource.freshnessMs,
            detail: "The kingdom view returned no rows and completed successfully.",
            now,
          }),
        ]
    sources.set(
      "kingdom-stats",
      sourceState(kingdomSource, kingdomResult, observedAt, kingdomRows.length, now, "Kingdom count query completed."),
    )
  } else {
    snapshot.kingdoms = [
      resultFailureMetric("kingdom-coverage", "Kingdom coverage", "kingdoms", kingdomSource, kingdomResult, now),
    ]
    sources.set("kingdom-stats", sourceState(kingdomSource, kingdomResult, null, null, now, "Kingdom source unavailable."))
  }

  // MYCA MAS agent runs. The endpoint is a ledger read, not the static agent registry.
  const agentSource = definition("agent-runs")
  const agentResult = byId.get("agent-runs")
  const agentPayload = record(agentResult?.data)
  const agentRows = agentResult?.ok ? array(agentPayload.data) : null
  if (agentRows) {
    const typedRows = agentRows.map(record)
    const meta = record(agentPayload.meta)
    const observedAt = latestIso(
      typedRows.flatMap((row) => [row.completedAt, row.completed_at, row.startedAt, row.started_at]),
    ) || agentResult!.receivedAt
    const total = number(meta.total) ?? typedRows.length
    const running = typedRows.filter((row) => ["running", "pending"].includes(text(row.status).toLowerCase())).length
    const failed = typedRows.filter((row) => text(row.status).toLowerCase() === "failed").length
    const state: EvidenceState = total === 0 ? "verified-empty" : "available"
    snapshot.agents[0] = metric({
      id: "agent-runs-total",
      label: "Agent runs",
      value: total,
      unit: "runs",
      state,
      source: agentSource.source,
      endpoint: agentSource.endpoint,
      observedAt,
      updatedAt: agentResult!.receivedAt,
      freshnessMs: agentSource.freshnessMs,
      detail: "Total reported by the MYCA run ledger for this query scope.",
      now,
    })
    snapshot.agents[1] = metric({
      id: "agent-runs-active",
      label: "Runs active in returned window",
      value: running,
      unit: "runs",
      state: typedRows.length === 0 ? "verified-empty" : "available",
      source: agentSource.source,
      endpoint: agentSource.endpoint,
      observedAt,
      updatedAt: agentResult!.receivedAt,
      freshnessMs: agentSource.freshnessMs,
      detail: "Pending plus running states in the returned ledger page.",
      now,
    })
    snapshot.agents[2] = metric({
      id: "agent-runs-failed",
      label: "Runs failed in returned window",
      value: failed,
      unit: "runs",
      state: typedRows.length === 0 ? "verified-empty" : "available",
      source: agentSource.source,
      endpoint: agentSource.endpoint,
      observedAt,
      updatedAt: agentResult!.receivedAt,
      freshnessMs: agentSource.freshnessMs,
      detail: "Failed states in the returned ledger page; zero is a measured zero for this page only.",
      now,
    })
    snapshot.agentRunRecords = typedRows.slice(0, 10).map((row, index) => {
      const status = text(row.status, "unknown")
      const rowObserved = iso(row.completedAt) || iso(row.completed_at) || iso(row.startedAt) || iso(row.started_at)
      return evidenceRecord({
        id: text(row.id, `agent-run-${index}`),
        title: text(row.agentName, text(row.agent_name, text(row.agentId, text(row.agent_id, "Unnamed agent")))),
        subtitle: status,
        facts: [
          { label: "Run", value: text(row.id, "unknown"), unit: "id" },
          { label: "Agent", value: text(row.agentId, text(row.agent_id, "unknown")), unit: "id" },
        ],
        source: agentSource.source,
        endpoint: agentSource.endpoint,
        observedAt: rowObserved,
        updatedAt: agentResult!.receivedAt,
        freshnessMs: agentSource.freshnessMs,
        now,
      })
    })
    sources.set(
      "agent-runs",
      sourceState(agentSource, agentResult, observedAt, typedRows.length, now, "MYCA run-ledger query completed."),
    )
  } else {
    snapshot.agents[0] = resultFailureMetric("agent-runs-total", "Agent runs", "runs", agentSource, agentResult, now)
    snapshot.agents[1] = resultFailureMetric("agent-runs-active", "Runs active", "runs", agentSource, agentResult, now)
    snapshot.agents[2] = resultFailureMetric(
      "agent-runs-failed",
      "Runs failed in returned window",
      "runs",
      agentSource,
      agentResult,
      now,
    )
    sources.set("agent-runs", sourceState(agentSource, agentResult, null, null, now, "MYCA run ledger unavailable."))
  }

  // Air quality rows retain station, parameter, units, source, and measurement time.
  const airSource = definition("air-quality")
  const airResult = byId.get("air-quality")
  const airRows = resultRecords(airSource, airResult, (payload) => array(payload.items ?? payload.data))
  if (airRows) {
    const typedRows = airRows.map(record)
    const observedAt = latestIso(typedRows.map((row) => row.measured_at ?? row.measuredAt)) || airResult!.receivedAt
    const stationKeys = new Set(
      typedRows.map((row) => text(row.station_name, `${text(row.lat)},${text(row.lng)}`)).filter(Boolean),
    )
    const parameterCounts = countsBy(typedRows, (row) => text(row.parameter, "Unspecified"))
    const state: EvidenceState = typedRows.length === 0 ? "verified-empty" : "available"
    snapshot.air = [
      metric({
        id: "air-readings",
        label: "Air-quality readings",
        value: typedRows.length,
        unit: "readings",
        state,
        source: airSource.source,
        endpoint: airSource.endpoint,
        observedAt,
        updatedAt: airResult!.receivedAt,
        freshnessMs: airSource.freshnessMs,
        detail: typedRows.length ? topCounts(parameterCounts) : "The completed MINDEX query returned no readings.",
        now,
      }),
      metric({
        id: "air-stations",
        label: "Air-quality stations",
        value: stationKeys.size,
        unit: "stations",
        state,
        source: airSource.source,
        endpoint: airSource.endpoint,
        observedAt,
        updatedAt: airResult!.receivedAt,
        freshnessMs: airSource.freshnessMs,
        detail: "Distinct station names or coordinates in the returned observation rows.",
        now,
      }),
      metric({
        id: "air-parameters",
        label: "Air-quality parameters",
        value: parameterCounts.size,
        unit: "parameters",
        state,
        source: airSource.source,
        endpoint: airSource.endpoint,
        observedAt,
        updatedAt: airResult!.receivedAt,
        freshnessMs: airSource.freshnessMs,
        detail: topCounts(parameterCounts) || "No measured parameters returned.",
        now,
      }),
    ]
    snapshot.airRecords = typedRows.slice(0, 12).map((row, index) => {
      const rowObserved = iso(row.measured_at ?? row.measuredAt)
      return evidenceRecord({
        id: text(row.source_id, `air-${index}`),
        title: text(row.station_name, "Unnamed station"),
        subtitle: text(row.parameter, "Unspecified parameter"),
        facts: [
          { label: "Value", value: text(row.value, "unknown"), unit: text(row.unit, "unit not supplied") },
          { label: "Location", value: `${text(row.lat, "?")}, ${text(row.lng, "?")}`, unit: "lat, lng" },
        ],
        source: text(row.source, airSource.source),
        endpoint: airSource.endpoint,
        observedAt: rowObserved,
        updatedAt: airResult!.receivedAt,
        freshnessMs: airSource.freshnessMs,
        now,
      })
    })
    sources.set(
      "air-quality",
      sourceState(airSource, airResult, observedAt, typedRows.length, now, "Air-quality query completed."),
    )
  } else {
    snapshot.air = [
      resultFailureMetric("air-readings", "Air-quality readings", "readings", airSource, airResult, now),
      resultFailureMetric("air-stations", "Air-quality stations", "stations", airSource, airResult, now),
      resultFailureMetric("air-parameters", "Air-quality parameters", "parameters", airSource, airResult, now),
    ]
    sources.set("air-quality", sourceState(airSource, airResult, null, null, now, "Air-quality source unavailable."))
  }

  // Ocean physical conditions are useful evidence but are not mislabeled as water quality.
  const oceanSource = definition("ocean-conditions")
  const oceanResult = byId.get("ocean-conditions")
  const oceanRows = resultRecords(oceanSource, oceanResult, (payload) => array(payload.environments ?? payload.data))
  const oceanMetricIndex = snapshot.water.findIndex((item) => item.id === "ocean-observations")
  if (oceanRows) {
    const typedRows = oceanRows.map(record)
    const observedAt = latestIso(typedRows.map((row) => row.observed_at ?? row.observedAt)) || oceanResult!.receivedAt
    const state: EvidenceState = typedRows.length === 0 ? "verified-empty" : "available"
    snapshot.water[oceanMetricIndex] = metric({
      id: "ocean-observations",
      label: "Ocean physical observations",
      value: typedRows.length,
      unit: "observations returned",
      state,
      source: oceanSource.source,
      endpoint: oceanSource.endpoint,
      observedAt,
      updatedAt: oceanResult!.receivedAt,
      freshnessMs: oceanSource.freshnessMs,
      detail: "Temperature, salinity, sea state, depth, and current observations; not a water-quality substitute.",
      now,
    })
    snapshot.oceanRecords = typedRows.slice(0, 10).map((row, index) =>
      evidenceRecord({
        id: text(row.observation_id, `ocean-${index}`),
        title: `Ocean observation ${index + 1}`,
        subtitle: text(row.sea_state, "Sea state not supplied"),
        facts: [
          { label: "Temperature", value: text(row.temperature_c, "unknown"), unit: "°C" },
          { label: "Salinity", value: text(row.salinity_psu, "unknown"), unit: "PSU" },
          { label: "Current", value: text(row.current_speed, "unknown"), unit: "source unit" },
        ],
        source: text(row.source, oceanSource.source),
        endpoint: oceanSource.endpoint,
        observedAt: iso(row.observed_at ?? row.observedAt),
        updatedAt: oceanResult!.receivedAt,
        freshnessMs: oceanSource.freshnessMs,
        now,
      }),
    )
    sources.set(
      "ocean-conditions",
      sourceState(oceanSource, oceanResult, observedAt, typedRows.length, now, "Ocean observation query completed."),
    )
  } else {
    snapshot.water[oceanMetricIndex] = resultFailureMetric(
      "ocean-observations",
      "Ocean physical observations",
      "observations",
      oceanSource,
      oceanResult,
      now,
    )
    sources.set(
      "ocean-conditions",
      sourceState(oceanSource, oceanResult, null, null, now, "Ocean observation source unavailable."),
    )
  }

  // Transport: each domain reports returned rows and retains operational attributes.
  const landSource = definition("land-transit")
  const landResult = byId.get("land-transit")
  const landPayload = record(landResult?.data)
  const landRows = landResult?.ok && !landPayload.error ? array(landPayload.features) : null
  if (landRows) {
    const typedRows = landRows.map((row) => record(record(row).properties))
    const observedAt = latestIso(typedRows.map((row) => row.updated_at ?? row.updatedAt)) || landResult!.receivedAt
    const agencies = countsBy(typedRows, (row) => text(row.agency, "Unspecified agency"))
    const modes = countsBy(typedRows, (row) => text(row.route_type, "Unspecified mode"))
    const state: EvidenceState = typedRows.length === 0 ? "verified-empty" : "available"
    snapshot.transport[0] = metric({
      id: "land-vehicles",
      label: "Land transit rows returned",
      value: typedRows.length,
      unit: "records",
      state,
      source: landSource.source,
      endpoint: landSource.endpoint,
      observedAt,
      updatedAt: landResult!.receivedAt,
      freshnessMs: landSource.freshnessMs,
      detail: topCounts(agencies) || "Completed query returned no vehicles updated in its ten-minute window.",
      now,
    })
    snapshot.landRecords = typedRows.slice(0, 10).map((row, index) =>
      evidenceRecord({
        id: text(row.id, `land-${index}`),
        title: text(row.route_short_name, text(row.id, "Transit vehicle")),
        subtitle: `${text(row.agency, "Unknown agency")} · ${text(row.current_status, "status unknown")}`,
        facts: [
          { label: "Speed", value: text(row.speed, "unknown"), unit: "source unit" },
          { label: "Mode", value: text(row.route_type, "unknown"), unit: "GTFS route type" },
          { label: "Occupancy", value: text(row.occupancy, "unknown"), unit: "status" },
        ],
        source: landSource.source,
        endpoint: landSource.endpoint,
        observedAt: iso(row.updated_at ?? row.updatedAt),
        updatedAt: landResult!.receivedAt,
        freshnessMs: landSource.freshnessMs,
        now,
      }),
    )
    if (modes.size) snapshot.transport[0].detail += ` · Modes ${topCounts(modes)}`
    sources.set(
      "land-transit",
      sourceState(landSource, landResult, observedAt, typedRows.length, now, "Land-transit query completed."),
    )
  } else {
    snapshot.transport[0] = resultFailureMetric(
      "land-vehicles",
      "Land transit rows returned",
      "records",
      landSource,
      landResult
        ? { ...landResult, ok: false, error: text(landPayload.error, landResult.error || "Transit source unavailable") }
        : landResult,
      now,
    )
    const failedLandResult = landResult
      ? { ...landResult, ok: false, error: text(landPayload.error, landResult.error || "Land transit unavailable.") }
      : landResult
    sources.set(
      "land-transit",
      sourceState(landSource, failedLandResult, null, null, now, text(landPayload.error, "Land transit unavailable.")),
    )
  }

  const normalizeMovingLayer = (
    id: "aircraft" | "vessels",
    metricIndex: 1 | 2,
  ): EvidenceRecord[] => {
    const source = definition(id)
    const result = byId.get(id)
    const payload = record(result?.data)
    const rows = result?.ok ? array(payload.entities ?? payload.features) : null
    const label = id === "aircraft" ? "Aircraft rows returned" : "Vessel rows returned"
    if (!rows) {
      snapshot.transport[metricIndex] = resultFailureMetric(id, label, "records", source, result, now)
      sources.set(id, sourceState(source, result, null, null, now, `${label} source unavailable.`))
      return []
    }
    const typedRows = rows.map(record)
    const observedAt = latestIso(typedRows.map((row) => row.occurred_at ?? row.observed_at)) || result!.receivedAt
    const sourceCounts = countsBy(typedRows, (row) => text(row.source, "Unspecified source"))
    const emptyState: EvidenceState = source.emptyIsVerified ? "verified-empty" : "unbound"
    snapshot.transport[metricIndex] = metric({
      id,
      label,
      value: typedRows.length === 0 ? null : typedRows.length,
      unit: "records",
      state: typedRows.length === 0 ? emptyState : "available",
      source: source.source,
      endpoint: source.endpoint,
      observedAt: typedRows.length ? observedAt : null,
      updatedAt: result!.receivedAt,
      freshnessMs: source.freshnessMs,
      detail: typedRows.length
        ? `${topCounts(sourceCounts)}. This is the returned page, not a proven global total.`
        : "The current earth/map/bbox contract cannot distinguish an empty table from a query failure; zero is not claimed.",
      now,
    })
    sources.set(
      id,
      sourceState(
        source,
        result,
        typedRows.length ? observedAt : null,
        typedRows.length,
        now,
        typedRows.length ? `${label} query completed.` : "Empty result is ambiguous in the current backend contract.",
      ),
    )
    return typedRows.slice(0, 10).map((row, index) => {
      const properties = record(row.properties)
      const isAircraft = id === "aircraft"
      return evidenceRecord({
        id: text(row.id, `${id}-${index}`),
        title: text(row.name, isAircraft ? "Aircraft" : "Vessel"),
        subtitle: text(row.source, "Source not supplied"),
        facts: isAircraft
          ? [
              { label: "Altitude", value: text(properties.altitude_ft, "unknown"), unit: "ft" },
              { label: "Speed", value: text(properties.speed_kts, "unknown"), unit: "kn" },
              { label: "Heading", value: text(properties.heading, "unknown"), unit: "degrees" },
            ]
          : [
              { label: "Type", value: text(properties.type, "unknown"), unit: "class" },
              { label: "Speed", value: text(properties.speed_kts, "unknown"), unit: "kn" },
              { label: "Destination", value: text(properties.destination, "unknown"), unit: "reported" },
            ],
        source: text(row.source, source.source),
        endpoint: source.endpoint,
        observedAt: iso(row.occurred_at ?? row.observed_at),
        updatedAt: result!.receivedAt,
        freshnessMs: source.freshnessMs,
        now,
      })
    })
  }

  snapshot.aircraftRecords = normalizeMovingLayer("aircraft", 1)
  snapshot.vesselRecords = normalizeMovingLayer("vessels", 2)

  const droneSource = definition("drones")
  const droneResult = byId.get("drones")
  const droneRows = droneResult?.ok ? array(droneResult.data) : null
  if (droneRows) {
    const typedRows = droneRows.map(record)
    const observedAt = latestIso(typedRows.map((row) => row.last_telemetry_time ?? row.lastTelemetryTime)) || droneResult!.receivedAt
    const active = typedRows.filter((row) => {
      const mission = text(row.active_mission_status ?? row.mission_state).toLowerCase()
      return mission && !["idle", "completed", "cancelled", "failed"].includes(mission)
    }).length
    const types = countsBy(typedRows, (row) => text(row.drone_type, "Unspecified type"))
    snapshot.transport[3] = metric({
      id: "drones",
      label: "Registered drones",
      value: typedRows.length,
      unit: "drones",
      state: typedRows.length === 0 ? "verified-empty" : "available",
      source: droneSource.source,
      endpoint: droneSource.endpoint,
      observedAt,
      updatedAt: droneResult!.receivedAt,
      freshnessMs: droneSource.freshnessMs,
      detail: typedRows.length ? `${active} with an active mission state · ${topCounts(types)}` : "The status view returned no drones.",
      now,
    })
    snapshot.droneRecords = typedRows.slice(0, 10).map((row, index) =>
      evidenceRecord({
        id: text(row.drone_id, `drone-${index}`),
        title: text(row.drone_name, "Unnamed drone"),
        subtitle: `${text(row.drone_type, "type unknown")} · ${text(row.flight_mode, "flight mode unknown")}`,
        facts: [
          { label: "Battery", value: text(row.battery_percent, "unknown"), unit: "%" },
          { label: "Mission", value: text(row.active_mission_status, text(row.mission_state, "unknown")), unit: "status" },
          { label: "Payload", value: text(row.payload_type, "none reported"), unit: "type" },
        ],
        source: droneSource.source,
        endpoint: droneSource.endpoint,
        observedAt: iso(row.last_telemetry_time ?? row.lastTelemetryTime),
        updatedAt: droneResult!.receivedAt,
        freshnessMs: droneSource.freshnessMs,
        now,
      }),
    )
    sources.set(
      "drones",
      sourceState(droneSource, droneResult, observedAt, typedRows.length, now, "Drone status view query completed."),
    )
  } else {
    snapshot.transport[3] = resultFailureMetric("drones", "Registered drones", "drones", droneSource, droneResult, now)
    sources.set("drones", sourceState(droneSource, droneResult, null, null, now, "Drone status source unavailable."))
  }

  snapshot.sources = NATURE_STATISTICS_SOURCES.map(
    (source) => sources.get(source.id) || sourceState(source, byId.get(source.id), null, null, now, "Source not normalized."),
  )
  snapshot.generatedAt = now
  return snapshot
}
