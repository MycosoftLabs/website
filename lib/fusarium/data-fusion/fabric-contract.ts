export const FABRIC_SCHEMA = "fusarium-data-center-fabric/v1" as const

export const FABRIC_CONFIGURATION_KEYS = [
  "NATUREOS_STORAGE_ROOT",
  "NAS_APP_STORAGE_ROOT",
  "NAS_MOUNT_PATH",
  "MINDEX_NAS_MOUNT",
  "FUSARIUM_REMOVABLE_MEDIA_REF",
  "FUSARIUM_FEDRAMP_TARGET_REF",
  "FUSARIUM_FEDRAMP_ROLE_REF",
] as const

export type FabricConfigurationKey = (typeof FABRIC_CONFIGURATION_KEYS)[number]
export type EvidenceAxisName = "configured" | "reachable" | "authorized" | "fresh" | "populated"
export type EvidenceAxisState = "satisfied" | "unsatisfied" | "unknown" | "not-probed" | "not-applicable"
export type FabricTargetKind = "local-disk" | "nas" | "removable-media" | "fedramp-cloud"
export type FabricContractState = "declared" | "unbound" | "not-probed" | "unavailable" | "policy-only"

export interface ConfigurationSignal {
  key: FabricConfigurationKey
  present: boolean
  sensitivity: "name-only"
}

export interface EvidenceAxis {
  name: EvidenceAxisName
  state: EvidenceAxisState
  detail: string
  evidence: "configuration-presence" | "no-probe" | "not-applicable"
}

export interface FabricTarget {
  id: FabricTargetKind
  label: string
  role: string
  targetClass: "local" | "operator-media" | "future-authorized-cloud"
  configuration: readonly ConfigurationSignal[]
  axes: readonly EvidenceAxis[]
  allowedOperation: "inventory-only"
}

export interface FabricSilo {
  id: string
  label: string
  scopeKey: string
  state: FabricContractState
  lineage: readonly string[]
  detail: string
}

export interface FabricPipeline {
  id: string
  label: string
  contract: string
  direction: "read" | "ingest" | "projection"
  state: FabricContractState
  statusEndpoint: string | null
  invoked: false
  detail: string
}

export interface LegacyRouteDisqualification {
  route: "/api/storage/nas" | "/api/storage/files"
  decision: "disqualified"
  reason: string
  invoked: false
}

export interface CryptographicErasureReadiness {
  schema: "fusarium-cryptographic-erasure-readiness/v1"
  state: "policy-only"
  executionEnabled: false
  actionEndpoint: null
  minimumApprovers: 2
  requiredReviewRoles: readonly ["data-custodian", "security-officer"]
  prerequisites: readonly string[]
  auditFields: readonly string[]
  detail: string
}

export interface DataCenterFabricContract {
  schema: typeof FABRIC_SCHEMA
  generatedAt: string
  classification: "UNCLASSIFIED"
  access: "owner-authenticated"
  operationMode: "read-only-inventory"
  evidenceRule: string
  targets: readonly FabricTarget[]
  silos: readonly FabricSilo[]
  pipelines: readonly FabricPipeline[]
  lineagePlanes: readonly string[]
  legacyRoutes: readonly LegacyRouteDisqualification[]
  erasureReadiness: CryptographicErasureReadiness
}

export type FabricConfigurationPresence = Partial<Record<FabricConfigurationKey, boolean>>

const TARGET_CONFIGURATION: Record<FabricTargetKind, readonly FabricConfigurationKey[]> = {
  "local-disk": ["NATUREOS_STORAGE_ROOT", "NAS_APP_STORAGE_ROOT"],
  nas: ["NAS_MOUNT_PATH", "MINDEX_NAS_MOUNT"],
  "removable-media": ["FUSARIUM_REMOVABLE_MEDIA_REF"],
  "fedramp-cloud": ["FUSARIUM_FEDRAMP_TARGET_REF", "FUSARIUM_FEDRAMP_ROLE_REF"],
}

const TARGET_CONFIGURATION_REQUIRED_ANY: Record<FabricTargetKind, readonly FabricConfigurationKey[]> = {
  "local-disk": ["NATUREOS_STORAGE_ROOT", "NAS_APP_STORAGE_ROOT"],
  nas: ["NAS_MOUNT_PATH", "MINDEX_NAS_MOUNT"],
  "removable-media": ["FUSARIUM_REMOVABLE_MEDIA_REF"],
  "fedramp-cloud": ["FUSARIUM_FEDRAMP_TARGET_REF"],
}

function configurationSignals(
  keys: readonly FabricConfigurationKey[],
  presence: FabricConfigurationPresence,
): readonly ConfigurationSignal[] {
  return keys.map((key) => ({ key, present: presence[key] === true, sensitivity: "name-only" }))
}

function targetAxes(
  signals: readonly ConfigurationSignal[],
  requiredAny: readonly FabricConfigurationKey[],
): readonly EvidenceAxis[] {
  const configured = signals.some((signal) => signal.present && requiredAny.includes(signal.key))
  return [
    {
      name: "configured",
      state: configured ? "satisfied" : "unsatisfied",
      detail: configured
        ? "At least one approved configuration reference is present. Completeness is not inferred."
        : "No approved configuration reference is present.",
      evidence: "configuration-presence",
    },
    {
      name: "reachable",
      state: "not-probed",
      detail: "No path, mount, network, filesystem, or cloud probe was performed.",
      evidence: "no-probe",
    },
    {
      name: "authorized",
      state: "not-probed",
      detail: "No credential, token, role, share, or access-control check was performed.",
      evidence: "no-probe",
    },
    {
      name: "fresh",
      state: "unknown",
      detail: "No accepted target manifest supplied an observation time or freshness window.",
      evidence: "no-probe",
    },
    {
      name: "populated",
      state: "unknown",
      detail: "No directory, object, row, byte, or record count was requested.",
      evidence: "no-probe",
    },
  ]
}

function target(
  id: FabricTargetKind,
  label: string,
  role: string,
  targetClass: FabricTarget["targetClass"],
  presence: FabricConfigurationPresence,
): FabricTarget {
  const configuration = configurationSignals(TARGET_CONFIGURATION[id], presence)
  return {
    id,
    label,
    role,
    targetClass,
    configuration,
    axes: targetAxes(configuration, TARGET_CONFIGURATION_REQUIRED_ANY[id]),
    allowedOperation: "inventory-only",
  }
}

const SILOS: readonly FabricSilo[] = [
  ["acoustic", "Acoustic / SINE", "device + sensor + mission + time", "Raw audio and derived spectra remain distinct evidence."],
  ["visual", "Visual / BlueSight", "device + camera + mission + time", "Frames, detections, and tracks retain separate provenance."],
  ["chemical", "Chemical / GANDHA", "device + sensor + heater-profile + time", "Raw gas cycles, features, and odor labels cannot be collapsed."],
  ["particulate", "Particulate / SporeBase", "device + cassette + interval + location", "Live particle counts and delayed lab identifications remain separate planes."],
  ["bioelectric", "Bioelectric / FCI", "MycoBrain + channel + sample-clock", "Raw potentials and derived features remain evidence-linked."],
  ["environmental", "Environmental field", "source + model + area + valid-time", "Observed, forecast, replay, and modeled fields remain explicit."],
  ["thermal", "Thermal", "device + imager + calibration + time", "Radiometric frames retain calibration and uncertainty references."],
  ["mechanical", "Mechanical", "device + joint/contact sensor + time", "Motion, force, contact, and command records remain different evidence types."],
].map(([id, label, scopeKey, detail]) => ({
  id,
  label,
  scopeKey,
  state: "unbound" as const,
  lineage: ["raw evidence", "normalized evidence", "derived feature", "Form Space state", "memory", "MINDEX catalog"],
  detail,
}))

const PIPELINES: readonly FabricPipeline[] = [
  {
    id: "fusarium-v1-readiness",
    label: "Fusarium v1 readiness",
    contract: "fusarium-v1-readiness",
    direction: "read",
    state: "not-probed",
    statusEndpoint: "/api/fusarium/v1/readiness",
    invoked: false,
    detail: "Existing same-origin readiness seam; intentionally not called by this inventory endpoint.",
  },
  {
    id: "mindex-catalog",
    label: "MINDEX dataset and modality catalog",
    contract: "MINDEX catalog GET seams",
    direction: "read",
    state: "declared",
    statusEndpoint: "/api/fusarium/catalog/datasets",
    invoked: false,
    detail: "Datasets, modalities, and environments are declared read seams. Runtime binding and contents are not inferred.",
  },
  {
    id: "dirtnet-ingest",
    label: "DIRTNet store-and-forward ingest",
    contract: "proposed signed record and spool contract",
    direction: "ingest",
    state: "unbound",
    statusEndpoint: null,
    invoked: false,
    detail: "Architecture-defined evidence path; no accepted current status or mutation endpoint is bound here.",
  },
  {
    id: "form-space-state",
    label: "Form Space evidence-to-state lineage",
    contract: "append-only evidence-linked state proposal",
    direction: "projection",
    state: "unbound",
    statusEndpoint: null,
    invoked: false,
    detail: "Proposed schema and service work are not treated as deployed database truth.",
  },
  {
    id: "etl-observability",
    label: "API and ETL observability",
    contract: "accepted pipeline-run status contract required",
    direction: "read",
    state: "unavailable",
    statusEndpoint: null,
    invoked: false,
    detail: "No owner-safe, source-current ETL status contract is accepted for Data Fusion.",
  },
]

export function buildDataCenterFabricContract(
  presence: FabricConfigurationPresence = {},
  generatedAt = new Date().toISOString(),
): DataCenterFabricContract {
  return {
    schema: FABRIC_SCHEMA,
    generatedAt,
    classification: "UNCLASSIFIED",
    access: "owner-authenticated",
    operationMode: "read-only-inventory",
    evidenceRule: "Configured, reachable, authorized, fresh, and populated are independent claims and require independent evidence.",
    targets: [
      target("local-disk", "Approved local disk", "Operator-local evidence and bounded cache", "local", presence),
      target("nas", "Approved NAS share", "Durable local evidence and compartment storage", "local", presence),
      target("removable-media", "Approved removable media", "Controlled import/export staging", "operator-media", presence),
      target("fedramp-cloud", "Future authorized cloud / FedRAMP target", "Encrypted resilience and approved projection", "future-authorized-cloud", presence),
    ],
    silos: SILOS,
    pipelines: PIPELINES,
    lineagePlanes: [
      "source identity",
      "raw evidence",
      "normalized evidence",
      "derived features",
      "Form Space state",
      "memory",
      "MINDEX catalog/projection",
      "review and audit",
    ],
    legacyRoutes: [
      {
        route: "/api/storage/nas",
        decision: "disqualified",
        reason: "Legacy route fabricates storage status and cannot establish configuration, reachability, authorization, freshness, or population.",
        invoked: false,
      },
      {
        route: "/api/storage/files",
        decision: "disqualified",
        reason: "Legacy route exposes fake file and mutation behavior and is not an accepted Data Fusion evidence source.",
        invoked: false,
      },
    ],
    erasureReadiness: {
      schema: "fusarium-cryptographic-erasure-readiness/v1",
      state: "policy-only",
      executionEnabled: false,
      actionEndpoint: null,
      minimumApprovers: 2,
      requiredReviewRoles: ["data-custodian", "security-officer"],
      prerequisites: [
        "exact asset and compartment scope",
        "classification and release review",
        "retention and legal-hold clearance",
        "backup and dependency impact map",
        "key-hierarchy and recovery evidence",
        "time-bounded two-person approval",
        "append-only audit destination",
        "post-event verification plan",
      ],
      auditFields: [
        "request-id",
        "asset-scope",
        "reason",
        "requester",
        "approver-one",
        "approver-two",
        "approval-expiry",
        "policy-version",
        "evidence-references",
        "verification-result",
      ],
      detail: "Planning and readiness only. This application has no wipe, delete, unmount, credential, or key-destruction capability.",
    },
  }
}
