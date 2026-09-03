export const FORM_SPACE_CATALOG_SCHEMA = "fusarium-form-space-catalog/v1" as const

export type FormSpaceEvidenceState =
  | "source_present"
  | "document_proposed"
  | "context_only"
  | "not_probed"
  | "unbound"

export type FormSpaceModelFamily =
  | "compatibility"
  | "form-space"
  | "modality"
  | "fusion"

export interface FormSpaceModelCatalogItem {
  id: string
  label: string
  family: FormSpaceModelFamily
  description: string
  dimensions: string[]
  state: FormSpaceEvidenceState
  statusPath: string | null
  inferencePath: string | null
  sourceBasis: string
}

export interface FormSpaceTopologyNode {
  id: string
  label: string
  role: string
  state: FormSpaceEvidenceState
}

export interface FormSpaceTopologyEdge {
  from: string
  to: string
  label: string
  state: FormSpaceEvidenceState
}

export interface FormSpaceBinding {
  id: string
  label: string
  state: FormSpaceEvidenceState
  endpoint: string | null
  note: string
}

export interface FormSpaceDocumentRef {
  id: string
  title: string
  role: "canonical" | "specification" | "implementation-package" | "runtime-evidence"
  evidenceState: FormSpaceEvidenceState
}

export interface FormSpaceCatalog {
  schema: typeof FORM_SPACE_CATALOG_SCHEMA
  classification: "UNCLASSIFIED"
  generatedAt: string
  evidenceBoundary: string
  models: FormSpaceModelCatalogItem[]
  topology: {
    nodes: FormSpaceTopologyNode[]
    edges: FormSpaceTopologyEdge[]
  }
  bindings: FormSpaceBinding[]
  documents: FormSpaceDocumentRef[]
  mindex: {
    authority: "proposed"
    persistenceState: "unbound"
    tables: string[]
  }
  proposedApis: string[]
  formState: {
    state: "unbound"
    requiredFields: string[]
    note: string
  }
}

export const FORM_SPACE_MODELS: readonly FormSpaceModelCatalogItem[] = [
  {
    id: "nlm-compatibility-status",
    label: "NLM compatibility status",
    family: "compatibility",
    description:
      "Existing sensor-native NLM health and training surface. A healthy service is not proof that Form Space inference is deployed.",
    dimensions: ["environment", "prediction", "anomaly", "training"],
    state: "not_probed",
    statusPath: "/api/fusarium/nlm/status",
    inferencePath: null,
    sourceBasis: "Existing owner-gated Fusarium NLM status route; probe only on explicit operator request.",
  },
  {
    id: "nlm-form-space-engine",
    label: "NLM Form Space Engine",
    family: "form-space",
    description:
      "Proposed chart, target, attractor, trajectory, recovery, reachability, stopping, and uncertainty layer above the sensor-native NLM.",
    dimensions: ["form state", "target manifold", "attractor", "trajectory", "recovery"],
    state: "unbound",
    statusPath: null,
    inferencePath: "/api/nlm/form-space/infer",
    sourceBasis: "Canonical Form Space architecture v2; no current route binding is asserted.",
  },
  ...[
    ["nlm-funga", "NLM-Funga", ["physiology", "bioelectric", "morphology", "ecology"]],
    ["nlm-voc", "NLM-VOC", ["chemical", "gas", "drift", "specimen context"]],
    ["nlm-acoustic", "NLM-Acoustic", ["waveform", "spectrum", "source identity", "environment"]],
    ["nlm-spectral", "NLM-Spectral", ["RGB", "infrared", "multispectral", "light field"]],
    ["nlm-soil", "NLM-Soil", ["moisture", "chemistry", "structure", "living systems"]],
    ["nlm-weather", "NLM-Weather", ["atmosphere", "forecast", "season", "geography"]],
    ["nlm-maritime", "NLM-Maritime", ["hydroacoustic", "water", "vessel", "bathymetry"]],
    ["nlm-myconode", "NLM-MycoNode", ["edge sensing", "soil", "mycelium", "device health"]],
  ].map(([id, label, dimensions]) => ({
    id: id as string,
    label: label as string,
    family: "modality" as const,
    description: "Proposed sensor-native modality family named by the NLM architecture package.",
    dimensions: dimensions as string[],
    state: "document_proposed" as const,
    statusPath: null,
    inferencePath: null,
    sourceBasis: "NLM architecture specification; model artifact and serving contract are not bound here.",
  })),
  {
    id: "nlm-fusion",
    label: "NLM-Fusion",
    family: "fusion",
    description:
      "Proposed cross-modal temporal and graph/hypergraph fusion model for structured environmental state.",
    dimensions: ["temporal state", "graph", "hypergraph", "cross-modal uncertainty"],
    state: "document_proposed",
    statusPath: null,
    inferencePath: null,
    sourceBasis: "NLM architecture specification; no deployed fusion artifact is asserted.",
  },
]

export const FORM_SPACE_MINDEX_TABLES = [
  "form_space.model_version",
  "form_space.space",
  "form_space.metric",
  "form_space.chart",
  "form_space.chart_transition",
  "form_space.embodiment_binding",
  "form_space.target",
  "form_space.attractor",
  "form_space.state",
  "form_space.state_evidence",
  "form_space.goal_contract",
  "form_space.goal_contract_event",
  "form_space.trajectory",
  "form_space.trajectory_state",
  "form_space.intervention",
  "form_space.recovery_trial",
  "form_space.uncertainty_record",
  "form_space.event_outbox",
] as const

export const FORM_SPACE_PROPOSED_APIS = [
  "POST /api/nlm/form-space/infer",
  "POST /api/nlm/form-space/locate",
  "GET /api/nlm/form-space/atlas/{space_id}",
  "GET /api/nlm/form-space/charts/{chart_id}",
  "POST /api/nlm/form-space/reachability",
  "POST /api/nlm/form-space/trajectory/plan",
  "GET /api/nlm/form-space/light-cone/{system_id}",
  "GET /api/myca/self-form",
  "GET /api/myca/collective-form",
] as const

const TOPOLOGY_NODES: FormSpaceTopologyNode[] = [
  { id: "sensing", label: "Sensing + bio-I/O", role: "Measurement contract boundary", state: "not_probed" },
  { id: "edge", label: "MycoBrain / edge", role: "Calibration and quality", state: "document_proposed" },
  { id: "nlm", label: "Sensor-native NLM", role: "Latent world state", state: "not_probed" },
  { id: "form-space", label: "Form Space Engine", role: "Charts, targets, dynamics", state: "unbound" },
  { id: "mindex", label: "MINDEX Atlas", role: "Scientific lineage", state: "unbound" },
  { id: "myca", label: "MYCA Navigator", role: "Reviewed proposals", state: "context_only" },
  { id: "avani", label: "AVANI boundary", role: "PASS / GATE / VETO", state: "unbound" },
  { id: "dirtnet", label: "DIRTNet / Mycorrhizae", role: "Distributed transport", state: "not_probed" },
  { id: "earth", label: "Earth Simulator", role: "Geographic rendering", state: "context_only" },
  { id: "fusarium", label: "FUSARIUM SA", role: "Operator picture", state: "source_present" },
]

const TOPOLOGY_EDGES: FormSpaceTopologyEdge[] = [
  { from: "sensing", to: "edge", label: "samples", state: "document_proposed" },
  { from: "edge", to: "nlm", label: "calibrated frames", state: "document_proposed" },
  { from: "nlm", to: "form-space", label: "latent state", state: "unbound" },
  { from: "form-space", to: "mindex", label: "Form State + lineage", state: "unbound" },
  { from: "mindex", to: "myca", label: "atlas reads", state: "unbound" },
  { from: "myca", to: "avani", label: "trajectory proposal", state: "unbound" },
  { from: "dirtnet", to: "mindex", label: "signed evidence", state: "not_probed" },
  { from: "mindex", to: "earth", label: "geographic context", state: "unbound" },
  { from: "earth", to: "fusarium", label: "context-preserving view", state: "context_only" },
  { from: "myca", to: "fusarium", label: "review-only proposal", state: "context_only" },
]

export function buildFormSpaceCatalog(generatedAt = new Date().toISOString()): FormSpaceCatalog {
  return {
    schema: FORM_SPACE_CATALOG_SCHEMA,
    classification: "UNCLASSIFIED",
    generatedAt,
    evidenceBoundary:
      "This is a source-backed architecture catalog. Proposed services, tables, APIs, and model families are not represented as deployed or live.",
    models: FORM_SPACE_MODELS.map((model) => ({ ...model, dimensions: [...model.dimensions] })),
    topology: {
      nodes: TOPOLOGY_NODES.map((node) => ({ ...node })),
      edges: TOPOLOGY_EDGES.map((edge) => ({ ...edge })),
    },
    bindings: [
      {
        id: "form-space-catalog",
        label: "SA Form Space catalog",
        state: "source_present",
        endpoint: "/api/fusarium/situational-awareness/form-space",
        note: "Owner-gated, same-origin, GET-only architecture and binding manifest.",
      },
      {
        id: "nlm-status",
        label: "Existing NLM status",
        state: "not_probed",
        endpoint: "/api/fusarium/nlm/status",
        note: "A probe is operator-initiated; health does not establish Form Space inference.",
      },
      {
        id: "mindex-form-space",
        label: "MINDEX Form Space Atlas",
        state: "unbound",
        endpoint: null,
        note: "The implementation package proposes authoritative tables and APIs; no current local binding is proven.",
      },
      {
        id: "dirtnet",
        label: "DIRTNet / Mycorrhizae",
        state: "not_probed",
        endpoint: null,
        note: "Architecture-defined transport; this surface performs no network or device probe.",
      },
      {
        id: "earth-simulator",
        label: "Earth Simulator",
        state: "context_only",
        endpoint: "/fusarium/earth-simulator",
        note: "The synchronized picture can mount the existing renderer on operator selection; its own layers retain their source truth states.",
      },
      {
        id: "myca-context",
        label: "MYCA context and proposal seam",
        state: "context_only",
        endpoint: "/api/fusarium/situational-awareness/myca-context",
        note: "Reads context and validates allowlisted review proposals only; no execution or durable audit is claimed.",
      },
    ],
    documents: [
      { id: "form-space-v2", title: "MYCOSOFT Form Space Architecture v2", role: "canonical", evidenceState: "document_proposed" },
      { id: "form-space-glossary", title: "Form Space Canonical Engineering Glossary v1", role: "canonical", evidenceState: "document_proposed" },
      { id: "nlm-form-space-change", title: "How the Nature Learning Model changed with Form Space", role: "specification", evidenceState: "document_proposed" },
      { id: "mindex-mas-package", title: "Form Space database and MAS implementation package", role: "implementation-package", evidenceState: "document_proposed" },
      { id: "dirtnet-itdx26", title: "NLM, DIRTNet, and ITDX26 architecture package", role: "specification", evidenceState: "document_proposed" },
      { id: "earth-verification", title: "Earth Simulator integration verification", role: "runtime-evidence", evidenceState: "context_only" },
    ],
    mindex: {
      authority: "proposed",
      persistenceState: "unbound",
      tables: [...FORM_SPACE_MINDEX_TABLES],
    },
    proposedApis: [...FORM_SPACE_PROPOSED_APIS],
    formState: {
      state: "unbound",
      requiredFields: [
        "form_state_id",
        "space_id",
        "chart_id or explicit open-set status",
        "system_id",
        "timestamp and validity horizon",
        "typed coordinates",
        "target posterior",
        "nearest attractors",
        "distance to target",
        "form velocity",
        "reachability and viability",
        "completion and stop probabilities",
        "uncertainty",
        "evidence references",
        "sensory-NLM model version",
        "provenance",
        "AVANI status",
      ],
      note:
        "Environmental objects remain observations. This surface will not relabel them as Form States until an evidence-bearing model contract is bound.",
    },
  }
}

export function formSpaceModelById(id: string): FormSpaceModelCatalogItem | null {
  return FORM_SPACE_MODELS.find((model) => model.id === id) ?? null
}
