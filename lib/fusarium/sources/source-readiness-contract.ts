/**
 * Source-only readiness contract for Fusarium data backends.
 * Does not call live services, read secrets, or mutate infrastructure.
 */

export const SOURCE_READINESS_SCHEMA = "fusarium-source-readiness/v1"

export type ReadinessAxis =
  | "configured"
  | "reachable"
  | "authorized"
  | "schemaFresh"
  | "dataPresent"

export type AxisState =
  | "yes"
  | "no"
  | "unknown"
  | "unavailable"
  | "not_configured"
  | "stale"
  | "empty"
  | "measured_zero"
  | "not_probed"

export type SourceId =
  | "stack-inventory"
  | "data-fusion"
  | "nas"
  | "mindex"
  | "supabase"
  | "mas"
  | "natureos-core"
  | "earth-2"
  | "nlm"

export interface SourceReadinessRow {
  sourceId: SourceId
  service: string
  owner: string
  environment: "source" | "runtime-8011" | "unproven"
  endpointClass: string
  configurationSourceName: string
  secretRefs: string[]
  axes: Record<ReadinessAxis, AxisState>
  implementedSource: string
  evidence: string
  nextAction: string
  approvalRequired: boolean
}

export const SOURCE_READINESS_INVENTORY: readonly SourceReadinessRow[] = [
  {
    sourceId: "stack-inventory",
    service: "Stack Inventory provider",
    owner: "twins-host source",
    environment: "source",
    endpointClass: "same-origin /api/fusarium/v1 + operator state",
    configurationSourceName: "lib/fusarium/stack-inventory",
    secretRefs: [],
    axes: {
      configured: "yes",
      reachable: "unknown",
      authorized: "unknown",
      schemaFresh: "stale",
      dataPresent: "empty",
    },
    implementedSource: "contracts v1 + provider; focused tests 16/16 at audit",
    evidence: "apps/twins-host/lib/fusarium/stack-inventory",
    nextAction: "Do not collapse axes. Runtime 8011 remains a separate durable-backend lane.",
    approvalRequired: false,
  },
  {
    sourceId: "data-fusion",
    service: "Data Fusion provider",
    owner: "twins-host source",
    environment: "source",
    endpointClass: "same-origin /api/fusarium/v1 fusion surfaces",
    configurationSourceName: "lib/fusarium/data-fusion",
    secretRefs: [],
    axes: {
      configured: "yes",
      reachable: "unknown",
      authorized: "unknown",
      schemaFresh: "stale",
      dataPresent: "empty",
    },
    implementedSource: "v1 readiness/contexts/sources/coverage/observations/objects/relationships/evidence/reviews/activity/fusion runs; tests 21/21 at audit",
    evidence: "apps/twins-host/lib/fusarium/data-fusion",
    nextAction: "Keep empty fusion records empty. Do not invent COP/tracks.",
    approvalRequired: false,
  },
  {
    sourceId: "nas",
    service: "NAS dataset ingest",
    owner: "unassigned",
    environment: "unproven",
    endpointClass: "share / read-only ingest (not authorized here)",
    configurationSourceName: "not present as a Fusarium v1 NAS contract",
    secretRefs: ["NAS credential location TBD — name only"],
    axes: {
      configured: "not_configured",
      reachable: "not_probed",
      authorized: "not_probed",
      schemaFresh: "unknown",
      dataPresent: "unknown",
    },
    implementedSource: "No Fusarium v1 NAS inventory/source contract. Civilian NAS API is declared fabricated in the handoff and must stay quarantined.",
    evidence: "handoff section 10.1; overview scenario foundation-external-data",
    nextAction: "Inventory approved shares by name only after action-level approval. Default read-only. Do not mount or copy data.",
    approvalRequired: true,
  },
  {
    sourceId: "mindex",
    service: "MINDEX API / database",
    owner: "unassigned",
    environment: "unproven",
    endpointClass: "API/database adapter (not authorized here)",
    configurationSourceName: "secret-ref names MINDEX_INTERNAL_TOKEN, MINDEX_API_KEY only",
    secretRefs: ["MINDEX_INTERNAL_TOKEN", "MINDEX_API_KEY"],
    axes: {
      configured: "not_configured",
      reachable: "not_probed",
      authorized: "not_probed",
      schemaFresh: "unknown",
      dataPresent: "unknown",
    },
    implementedSource: "Stack Inventory declares source:mindex and connector:mindex as unavailable/unverified. Biology Simulator probes remain cloned NatureOS probes.",
    evidence: "lib/fusarium/stack-inventory/provider.ts source:mindex",
    nextAction: "Do not create a Fusarium MINDEX schema/user. Timeout is not permission to repair infrastructure.",
    approvalRequired: true,
  },
  {
    sourceId: "supabase",
    service: "Supabase identity/application",
    owner: "unassigned",
    environment: "unproven",
    endpointClass: "hosted project (not authorized here)",
    configurationSourceName: "not present as a Fusarium defense-data store",
    secretRefs: ["SUPABASE URL/key names only — not read"],
    axes: {
      configured: "not_configured",
      reachable: "not_probed",
      authorized: "not_probed",
      schemaFresh: "unknown",
      dataPresent: "unknown",
    },
    implementedSource: "No Fusarium v1 Supabase inventory. Overview states no Supabase persistence/backup path is proven.",
    evidence: "overview/scenario.ts foundation-persistence / foundation-external-data",
    nextAction: "Separate identity use from defense/environmental data. Do not assume Supabase is approved for controlled data.",
    approvalRequired: true,
  },
  {
    sourceId: "mas",
    service: "MAS orchestrator declarations",
    owner: "unassigned",
    environment: "unproven",
    endpointClass: "declared source without verified exchange",
    configurationSourceName: "stack-inventory source:mas",
    secretRefs: [],
    axes: {
      configured: "not_configured",
      reachable: "not_probed",
      authorized: "not_probed",
      schemaFresh: "unknown",
      dataPresent: "unknown",
    },
    implementedSource: "Declaration only.",
    evidence: "stack-inventory source:mas",
    nextAction: "Keep disabled until an approved read-only gate proves each axis.",
    approvalRequired: true,
  },
  {
    sourceId: "natureos-core",
    service: "NatureOS Core declarations",
    owner: "unassigned",
    environment: "unproven",
    endpointClass: "declared source without verified exchange",
    configurationSourceName: "stack-inventory source:natureos-core",
    secretRefs: [],
    axes: {
      configured: "not_configured",
      reachable: "not_probed",
      authorized: "not_probed",
      schemaFresh: "unknown",
      dataPresent: "unknown",
    },
    implementedSource: "Declaration only.",
    evidence: "stack-inventory source:natureos-core",
    nextAction: "Keep disabled until an approved read-only gate proves each axis.",
    approvalRequired: true,
  },
  {
    sourceId: "earth-2",
    service: "Earth-2 declarations",
    owner: "Claude-owned Earth Simulator lane — excluded from mutation",
    environment: "unproven",
    endpointClass: "declared source without verified exchange",
    configurationSourceName: "stack-inventory source:earth2",
    secretRefs: [],
    axes: {
      configured: "not_configured",
      reachable: "not_probed",
      authorized: "not_probed",
      schemaFresh: "unknown",
      dataPresent: "unknown",
    },
    implementedSource: "Declaration only. Earth Simulator remains Claude-owned.",
    evidence: "handoff section 3.1",
    nextAction: "Do not enter Earth Simulator or GCS.",
    approvalRequired: true,
  },
  {
    sourceId: "nlm",
    service: "Nature Learning Model",
    owner: "operator-state flag only",
    environment: "runtime-8011",
    endpointClass: "operator state #nlm — no inference endpoint called",
    configurationSourceName: "STACK_ENDPOINTS.operator#nlm",
    secretRefs: [],
    axes: {
      configured: "no",
      reachable: "unknown",
      authorized: "not_probed",
      schemaFresh: "unknown",
      dataPresent: "unavailable",
    },
    implementedSource: "Stack Inventory model:nlm. Bridge may be present; model not deployed. No versioned inference contract proven.",
    evidence: "stack-inventory provider model:nlm; operator nlm.bridge / nlm.model_deployed",
    nextAction: "Treat NLM as evidence/advice only. Do not auto-release threats.",
    approvalRequired: true,
  },
]

export function readinessAxesAreIndependent(row: SourceReadinessRow): boolean {
  const values = Object.values(row.axes)
  return values.length === 5 && !values.every((value) => value === "yes")
}

export function inventoryRequiresApproval(sourceId: SourceId): boolean {
  const row = SOURCE_READINESS_INVENTORY.find((item) => item.sourceId === sourceId)
  return row?.approvalRequired ?? true
}
