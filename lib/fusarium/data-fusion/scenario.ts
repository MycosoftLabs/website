import {
  DATA_FUSION_SCHEMA,
  type FusionContext,
  type FusionLineageEdge,
  type FusionLineageNode,
  type FusionSnapshot,
  type ModalityCoverage,
  type ReviewDisposition,
  type SourceTruth,
} from "./contracts"

const SCENARIO_TIME = "2026-09-01T18:42:00.000Z"

function source(
  id: string,
  label: string,
  sourceType: string,
  dataPresence: SourceTruth["dataPresence"],
  reason: string,
  recordCount: number | null,
): SourceTruth {
  return {
    id,
    label,
    endpointRef: `scenario://sanitized/${id}`,
    sourceType,
    endpointReachability: "simulated",
    identityVerification: "simulated",
    schemaValidity: "simulated",
    freshness: "simulated",
    provenance: "simulated",
    coverage: dataPresence === "missing" ? "gap" : "simulated",
    dataPresence,
    observedAt: dataPresence === "missing" ? null : SCENARIO_TIME,
    receivedAt: SCENARIO_TIME,
    recordCount,
    reason,
    synthetic: true,
  }
}

function node(
  input: Omit<FusionLineageNode, "synthetic" | "dataMode"> &
    Partial<Pick<FusionLineageNode, "synthetic" | "dataMode">>,
): FusionLineageNode {
  return {
    ...input,
    dataMode: "simulated",
    synthetic: true,
  }
}

function edge(
  id: string,
  fromId: string,
  toId: string,
  label: string,
  evidenceIds: string[],
  confidence: number | null = null,
): FusionLineageEdge {
  return { id, fromId, toId, label, confidence, evidenceIds, synthetic: true }
}

const pendingDisposition: ReviewDisposition = {
  state: "pending",
  reviewId: "sim-review-run-alpha-7",
  revision: 0,
  localOnly: true,
  judgment: null,
}

export function buildSanitizedFusionScenario(context: FusionContext): FusionSnapshot {
  const scenarioContext: FusionContext = {
    ...context,
    contextId: "sim-context-alpha-7",
    missionId: "demo-mission-alpha-7",
    missionAreaId: "demo-area-alpha-7",
    missionAreaLabel: "Sanitized Alpha-7 exercise area",
    mode: "simulated",
    timeRange: null,
    selectedNodeId: context.selectedNodeId?.startsWith("sim-") ? context.selectedNodeId : null,
    selectedObjectId: context.selectedObjectId?.startsWith("sim-") ? context.selectedObjectId : null,
    selectedEvidenceId: context.selectedEvidenceId?.startsWith("sim-") ? context.selectedEvidenceId : null,
    selectedSourceId: context.selectedSourceId?.startsWith("sim-") ? context.selectedSourceId : null,
  }

  const sourceTruth: SourceTruth[] = [
    source(
      "sim-source-spectral-01",
      "Sanitized multispectral frame",
      "spectral fixture",
      "present",
      "Deterministic fixture frame; no camera or external imagery was contacted.",
      1,
    ),
    source(
      "sim-source-acoustic-02",
      "Sanitized acoustic gauge",
      "acoustic fixture",
      "present",
      "Deterministic scenario waveform summary, not recorded audio.",
      1,
    ),
    source(
      "sim-source-bioelectric-03",
      "Sanitized rhizosphere probe",
      "bioelectric fixture",
      "present",
      "Fixture input arrived after the scenario fusion cutoff and is queued as late.",
      1,
    ),
    source(
      "sim-source-thermal-04",
      "Sanitized thermal channel",
      "thermal fixture",
      "missing",
      "No thermal fixture was supplied. This is a missing input, not a measured zero.",
      null,
    ),
    source(
      "sim-source-chemical-05",
      "Sanitized field chemistry",
      "chemical fixture",
      "present",
      "One deterministic conductivity observation with explicit units.",
      1,
    ),
    source(
      "sim-source-chemical-06",
      "Sanitized confirmatory chemistry",
      "chemical fixture",
      "present",
      "A second deterministic reading conflicts with the field fixture.",
      1,
    ),
    source(
      "sim-source-mechanical-07",
      "Sanitized soil-pressure strip",
      "mechanical fixture",
      "measured_absence",
      "The fixture completed and measured no threshold crossings. This is measured absence, not missing data.",
      1,
    ),
  ]

  const coverage: ModalityCoverage[] = [
    {
      modality: "spectral",
      label: "Spectral",
      state: "observed",
      observedRecords: 1,
      expectedRecords: 1,
      freshness: "simulated",
      sourceIds: ["sim-source-spectral-01"],
      gaps: [],
      synthetic: true,
    },
    {
      modality: "acoustic",
      label: "Acoustic",
      state: "observed",
      observedRecords: 1,
      expectedRecords: 1,
      freshness: "simulated",
      sourceIds: ["sim-source-acoustic-02"],
      gaps: [],
      synthetic: true,
    },
    {
      modality: "bioelectric",
      label: "Bioelectric",
      state: "degraded",
      observedRecords: 1,
      expectedRecords: 1,
      freshness: "simulated",
      sourceIds: ["sim-source-bioelectric-03"],
      gaps: ["Fixture arrived after the declared fusion cutoff."],
      synthetic: true,
    },
    {
      modality: "thermal",
      label: "Thermal",
      state: "gap",
      observedRecords: null,
      expectedRecords: 1,
      freshness: "simulated",
      sourceIds: ["sim-source-thermal-04"],
      gaps: ["Expected fixture was not supplied."],
      synthetic: true,
    },
    {
      modality: "chemical",
      label: "Chemical",
      state: "partial",
      observedRecords: 2,
      expectedRecords: 2,
      freshness: "simulated",
      sourceIds: ["sim-source-chemical-05", "sim-source-chemical-06"],
      gaps: ["Two valid readings conflict beyond the scenario tolerance."],
      synthetic: true,
    },
    {
      modality: "mechanical",
      label: "Mechanical",
      state: "empty",
      observedRecords: 1,
      expectedRecords: 1,
      freshness: "simulated",
      sourceIds: ["sim-source-mechanical-07"],
      gaps: ["Completed measurement reported no threshold crossings."],
      synthetic: true,
    },
  ]

  const sourceNodes = sourceTruth.map((item, index) =>
    node({
      id: item.id,
      stage: "source",
      label: item.label,
      eyebrow: `${String(index + 1).padStart(2, "0")} · ${item.sourceType}`,
      summary: item.reason,
      state: item.dataPresence === "missing" ? "missing" : "simulated",
      recordRef: item.endpointRef,
      domain: index === 0 ? "water" : index === 1 ? "atmosphere" : index === 2 ? "living" : index === 3 ? "infrastructure" : index < 6 ? "water" : "land",
      observedAt: item.observedAt,
      receivedAt: item.receivedAt,
      sourceIds: [item.id],
      objectIds: [],
      evidenceIds: [`sim-evidence-${item.id.replace("sim-source-", "")}`],
      confidence: null,
      uncertainty: "Scenario fixture; confidence is not inferred at source readiness.",
      contribution: null,
      modelRef: null,
      facts: [
        { label: "Data", value: item.dataPresence.replaceAll("_", " "), state: "simulated" },
        { label: "Records", value: item.recordCount === null ? "Unknown" : String(item.recordCount), state: "simulated" },
      ],
      disposition: null,
    }),
  )

  const observations: FusionLineageNode[] = [
    node({
      id: "sim-observation-spectral-water",
      stage: "observation",
      label: "Water reflectance change",
      eyebrow: "Observation · spectral",
      summary: "Fixture records a reflectance change inside the exercise drainage cell.",
      state: "simulated",
      recordRef: "scenario://sanitized/observations/spectral-water",
      domain: "water",
      observedAt: "2026-09-01T18:34:00.000Z",
      receivedAt: "2026-09-01T18:34:04.000Z",
      sourceIds: ["sim-source-spectral-01"],
      objectIds: ["sim-change-drainage-response"],
      evidenceIds: ["sim-evidence-spectral-01"],
      confidence: null,
      uncertainty: "No environmental interpretation exists until normalization and review.",
      contribution: 0.26,
      modelRef: null,
      facts: [{ label: "Value", value: "Fixture band ratio 1.18", state: "simulated" }],
      disposition: null,
    }),
    node({
      id: "sim-observation-acoustic-rain",
      stage: "observation",
      label: "Rainfall acoustic onset",
      eyebrow: "Observation · acoustic",
      summary: "Fixture marks a rainfall onset before the drainage response.",
      state: "simulated",
      recordRef: "scenario://sanitized/observations/acoustic-rain",
      domain: "atmosphere",
      observedAt: "2026-09-01T18:27:00.000Z",
      receivedAt: "2026-09-01T18:27:02.000Z",
      sourceIds: ["sim-source-acoustic-02"],
      objectIds: ["sim-change-drainage-response"],
      evidenceIds: ["sim-evidence-acoustic-02"],
      confidence: null,
      uncertainty: "Scenario timing fact only.",
      contribution: 0.17,
      modelRef: null,
      facts: [{ label: "Onset", value: "18:27Z scenario clock", state: "simulated" }],
      disposition: null,
    }),
    node({
      id: "sim-observation-chemical-field",
      stage: "observation",
      label: "Field conductivity",
      eyebrow: "Observation · chemical",
      summary: "First deterministic chemistry fixture.",
      state: "conflict",
      recordRef: "scenario://sanitized/observations/chem-field",
      domain: "water",
      observedAt: "2026-09-01T18:35:00.000Z",
      receivedAt: "2026-09-01T18:35:05.000Z",
      sourceIds: ["sim-source-chemical-05"],
      objectIds: ["sim-change-drainage-response"],
      evidenceIds: ["sim-evidence-chemical-05"],
      confidence: null,
      uncertainty: "Conflicts with confirmatory fixture; neither value is preferred.",
      contribution: 0.21,
      modelRef: null,
      facts: [{ label: "Conductivity", value: "420 µS/cm", state: "warn" }],
      disposition: null,
    }),
    node({
      id: "sim-observation-chemical-confirm",
      stage: "observation",
      label: "Confirmatory conductivity",
      eyebrow: "Observation · chemical",
      summary: "Second deterministic chemistry fixture at the same scenario location and time gate.",
      state: "conflict",
      recordRef: "scenario://sanitized/observations/chem-confirm",
      domain: "water",
      observedAt: "2026-09-01T18:35:00.000Z",
      receivedAt: "2026-09-01T18:36:10.000Z",
      sourceIds: ["sim-source-chemical-06"],
      objectIds: ["sim-change-drainage-response"],
      evidenceIds: ["sim-evidence-chemical-06"],
      confidence: null,
      uncertainty: "Conflicts with field fixture; neither value is preferred.",
      contribution: 0.21,
      modelRef: null,
      facts: [{ label: "Conductivity", value: "710 µS/cm", state: "warn" }],
      disposition: null,
    }),
    node({
      id: "sim-observation-bioelectric-late",
      stage: "observation",
      label: "Rhizosphere response",
      eyebrow: "Observation · bioelectric",
      summary: "Valid fixture input received after the scenario fusion cutoff.",
      state: "late",
      recordRef: "scenario://sanitized/observations/bioelectric-late",
      domain: "living",
      observedAt: "2026-09-01T18:31:00.000Z",
      receivedAt: "2026-09-01T18:43:30.000Z",
      sourceIds: ["sim-source-bioelectric-03"],
      objectIds: [],
      evidenceIds: ["sim-evidence-bioelectric-03"],
      confidence: null,
      uncertainty: "Excluded from the simulated run because it arrived after cutoff.",
      contribution: null,
      modelRef: null,
      facts: [{ label: "Queue", value: "Late input", state: "warn" }],
      disposition: null,
    }),
    node({
      id: "sim-observation-thermal-missing",
      stage: "observation",
      label: "Thermal observation missing",
      eyebrow: "Observation · thermal",
      summary: "No fixture was supplied. The system does not infer a zero or normal condition.",
      state: "missing",
      recordRef: null,
      domain: "infrastructure",
      observedAt: null,
      receivedAt: null,
      sourceIds: ["sim-source-thermal-04"],
      objectIds: [],
      evidenceIds: [],
      confidence: null,
      uncertainty: "Unavailable",
      contribution: null,
      modelRef: null,
      facts: [{ label: "Data", value: "Missing", state: "bad" }],
      disposition: null,
    }),
    node({
      id: "sim-observation-mechanical-zero",
      stage: "observation",
      label: "No pressure threshold crossings",
      eyebrow: "Observation · mechanical",
      summary: "The fixture completed with a measured count of zero threshold crossings.",
      state: "simulated",
      recordRef: "scenario://sanitized/observations/mechanical-zero",
      domain: "land",
      observedAt: "2026-09-01T18:38:00.000Z",
      receivedAt: "2026-09-01T18:38:01.000Z",
      sourceIds: ["sim-source-mechanical-07"],
      objectIds: ["sim-object-culvert-7"],
      evidenceIds: ["sim-evidence-mechanical-07"],
      confidence: null,
      uncertainty: "Measured absence applies only to the declared threshold and interval.",
      contribution: 0.15,
      modelRef: null,
      facts: [{ label: "Crossings", value: "0 · measured", state: "simulated" }],
      disposition: null,
    }),
  ]

  const normalization: FusionLineageNode[] = [
    node({
      id: "sim-normalization-env-schema",
      stage: "normalization",
      label: "Environmental schema normalization",
      eyebrow: "Normalization · fixture-v1",
      summary: "Deterministic unit and timestamp alignment; no inference is performed.",
      state: "partial",
      recordRef: "scenario://sanitized/transforms/normalize-v1",
      domain: "process",
      observedAt: "2026-09-01T18:39:00.000Z",
      receivedAt: "2026-09-01T18:39:00.000Z",
      sourceIds: sourceTruth.filter((item) => item.dataPresence !== "missing").map((item) => item.id),
      objectIds: ["sim-change-drainage-response", "sim-object-culvert-7"],
      evidenceIds: sourceTruth.filter((item) => item.dataPresence !== "missing").map((item) => `sim-evidence-${item.id.replace("sim-source-", "")}`),
      confidence: null,
      uncertainty: "Thermal input missing; bioelectric input late; chemical values unresolved.",
      contribution: null,
      modelRef: "deterministic-normalizer@fixture-v1",
      facts: [
        { label: "Schema", value: "fixture-v1", state: "simulated" },
        { label: "State", value: "Partial", state: "warn" },
      ],
      disposition: null,
    }),
  ]

  const fusionRunNode = node({
    id: "sim-run-alpha-7-1042",
    stage: "fusion_run",
    label: "Sanitized fusion exercise 1042",
    eyebrow: "Fusion run · simulated",
    summary: "A deterministic lineage fixture joins declared records. It is not a trained model or real environmental inference.",
    state: "conflict",
    recordRef: "scenario://sanitized/runs/alpha-7-1042",
    domain: "process",
    observedAt: "2026-09-01T18:40:00.000Z",
    receivedAt: "2026-09-01T18:40:05.000Z",
    sourceIds: sourceTruth.filter((item) => item.dataPresence !== "missing").map((item) => item.id),
    objectIds: ["sim-change-drainage-response", "sim-object-culvert-7"],
    evidenceIds: [
      "sim-evidence-spectral-01",
      "sim-evidence-acoustic-02",
      "sim-evidence-chemical-05",
      "sim-evidence-chemical-06",
      "sim-evidence-mechanical-07",
    ],
    confidence: 0.62,
    uncertainty: "Illustrative confidence only; conflict, missing thermal input, and one late record remain visible.",
    contribution: null,
    modelRef: "deterministic-lineage-fixture@1.0.0",
    facts: [
      { label: "Included", value: "5 fixture observations", state: "simulated" },
      { label: "Held", value: "1 conflict group", state: "warn" },
      { label: "Excluded", value: "1 late · 1 missing", state: "warn" },
    ],
    disposition: null,
  })

  const conclusions: FusionLineageNode[] = [
    node({
      id: "sim-change-drainage-response",
      stage: "environmental_object",
      label: "Drainage response change",
      eyebrow: "Environmental change · water / process",
      summary: "Scenario candidate: a time-bounded drainage response follows the fixture rainfall onset.",
      state: "pending",
      recordRef: "scenario://sanitized/objects/drainage-response",
      domain: "water",
      observedAt: "2026-09-01T18:40:00.000Z",
      receivedAt: "2026-09-01T18:40:05.000Z",
      sourceIds: [
        "sim-source-spectral-01",
        "sim-source-acoustic-02",
        "sim-source-chemical-05",
        "sim-source-chemical-06",
      ],
      objectIds: ["sim-change-drainage-response"],
      evidenceIds: [
        "sim-evidence-spectral-01",
        "sim-evidence-acoustic-02",
        "sim-evidence-chemical-05",
        "sim-evidence-chemical-06",
      ],
      confidence: 0.62,
      uncertainty: "Chemical conflict unresolved; thermal input missing; no causal claim is made.",
      contribution: null,
      modelRef: "deterministic-lineage-fixture@1.0.0",
      facts: [
        { label: "Mission consequence", value: "Review drainage access assumptions", state: "warn" },
        { label: "Status", value: "Candidate · not accepted", state: "muted" },
      ],
      disposition: { ...pendingDisposition },
    }),
    node({
      id: "sim-object-culvert-7",
      stage: "environmental_object",
      label: "Culvert 7 observation context",
      eyebrow: "Environmental object · infrastructure",
      summary: "The fixture associates measured mechanical absence with the culvert context only.",
      state: "simulated",
      recordRef: "scenario://sanitized/objects/culvert-7",
      domain: "infrastructure",
      observedAt: "2026-09-01T18:38:00.000Z",
      receivedAt: "2026-09-01T18:40:05.000Z",
      sourceIds: ["sim-source-mechanical-07"],
      objectIds: ["sim-object-culvert-7"],
      evidenceIds: ["sim-evidence-mechanical-07"],
      confidence: null,
      uncertainty: "Measured absence is limited to one threshold and interval.",
      contribution: null,
      modelRef: null,
      facts: [{ label: "Pressure events", value: "0 · measured", state: "simulated" }],
      disposition: null,
    }),
  ]

  const assessment = node({
    id: "sim-assessment-drainage-review",
    stage: "assessment",
    label: "Drainage-change assessment",
    eyebrow: "Assessment · human review required",
    summary: "Candidate conclusion is held for explicit analyst disposition.",
    state: "pending",
    recordRef: "scenario://sanitized/reviews/run-alpha-7",
    domain: "process",
    observedAt: "2026-09-01T18:41:00.000Z",
    receivedAt: "2026-09-01T18:41:00.000Z",
    sourceIds: fusionRunNode.sourceIds,
    objectIds: ["sim-change-drainage-response"],
    evidenceIds: fusionRunNode.evidenceIds,
    confidence: 0.62,
    uncertainty: fusionRunNode.uncertainty,
    contribution: null,
    modelRef: fusionRunNode.modelRef,
    facts: [
      { label: "Disposition", value: "Pending", state: "warn" },
      { label: "Persistence", value: "Local scenario session only", state: "simulated" },
    ],
    disposition: { ...pendingDisposition },
  })

  const narrative = node({
    id: "sim-narrative-drainage-draft",
    stage: "narrative",
    label: "Held narrative draft",
    eyebrow: "Narrative · simulated draft",
    summary: "A fixture draft is withheld from downstream use until the candidate conclusion is accepted by a human reviewer.",
    state: "pending",
    recordRef: "scenario://sanitized/narratives/drainage-draft",
    domain: "process",
    observedAt: "2026-09-01T18:41:30.000Z",
    receivedAt: "2026-09-01T18:41:30.000Z",
    sourceIds: fusionRunNode.sourceIds,
    objectIds: ["sim-change-drainage-response"],
    evidenceIds: fusionRunNode.evidenceIds,
    confidence: null,
    uncertainty: "Narrative inherits the unresolved source conflict and missing-input bounds.",
    contribution: null,
    modelRef: "fixed-scenario-template@1.0.0",
    facts: [
      { label: "Release", value: "Held · no external send", state: "warn" },
      { label: "Generator", value: "Fixed sanitized fixture", state: "simulated" },
    ],
    disposition: null,
  })

  const nodes = [
    ...sourceNodes,
    ...observations,
    ...normalization,
    fusionRunNode,
    ...conclusions,
    assessment,
    narrative,
  ]

  const edges: FusionLineageEdge[] = [
    ...observations.map((item) =>
      edge(`sim-edge-${item.sourceIds[0]}-${item.id}`, item.sourceIds[0], item.id, "produced", item.evidenceIds),
    ),
    ...observations
      .filter((item) => item.state !== "late" && item.state !== "missing")
      .map((item) => edge(`sim-edge-${item.id}-normalization`, item.id, normalization[0].id, "normalized", item.evidenceIds)),
    edge("sim-edge-normalization-run", normalization[0].id, fusionRunNode.id, "input set", fusionRunNode.evidenceIds),
    edge("sim-edge-run-change", fusionRunNode.id, conclusions[0].id, "candidate conclusion", conclusions[0].evidenceIds, 0.62),
    edge("sim-edge-run-object", fusionRunNode.id, conclusions[1].id, "context association", conclusions[1].evidenceIds),
    edge("sim-edge-change-assessment", conclusions[0].id, assessment.id, "requires review", assessment.evidenceIds, 0.62),
    edge("sim-edge-assessment-narrative", assessment.id, narrative.id, "held pending disposition", narrative.evidenceIds),
  ]

  return {
    schema: DATA_FUSION_SCHEMA,
    generatedAt: SCENARIO_TIME,
    context: scenarioContext,
    condition: "simulated",
    identityMode: "simulated",
    operatorId: "scenario.operator",
    sourceTruth,
    coverage,
    nodes,
    edges,
    correlations: [
      {
        id: "sim-correlation-drainage-01",
        label: "Drainage response timing",
        state: "simulated",
        nodeIds: ["sim-observation-acoustic-rain", "sim-observation-spectral-water"],
        evidenceIds: ["sim-evidence-acoustic-02", "sim-evidence-spectral-01"],
        basis: "Deterministic scenario timestamps only; no causal inference.",
        synthetic: true,
      },
      {
        id: "sim-correlation-chem-conflict-02",
        label: "Conductivity conflict",
        state: "conflict",
        nodeIds: ["sim-observation-chemical-field", "sim-observation-chemical-confirm"],
        evidenceIds: ["sim-evidence-chemical-05", "sim-evidence-chemical-06"],
        basis: "Same scenario location and time gate; values exceed the fixture tolerance.",
        synthetic: true,
      },
    ],
    conflicts: [
      {
        id: "sim-conflict-conductivity",
        kind: "conflict",
        label: "Conductivity values disagree",
        detail: "420 µS/cm versus 710 µS/cm. Neither fixture is preferred automatically.",
        nodeIds: ["sim-observation-chemical-field", "sim-observation-chemical-confirm"],
        observedAt: "2026-09-01T18:35:00.000Z",
        synthetic: true,
      },
    ],
    lateMissing: [
      {
        id: "sim-late-bioelectric",
        kind: "late",
        label: "Bioelectric fixture arrived after cutoff",
        detail: "Retained in lineage, excluded from the simulated run input set.",
        nodeIds: ["sim-observation-bioelectric-late"],
        observedAt: "2026-09-01T18:31:00.000Z",
        synthetic: true,
      },
      {
        id: "sim-missing-thermal",
        kind: "missing",
        label: "Thermal fixture missing",
        detail: "No value is substituted and no reassuring zero is shown.",
        nodeIds: ["sim-observation-thermal-missing"],
        observedAt: null,
        synthetic: true,
      },
    ],
    contributions: [
      ["sim-source-spectral-01", "Spectral fixture", 0.26],
      ["sim-source-acoustic-02", "Acoustic fixture", 0.17],
      ["sim-source-chemical-05", "Field chemistry fixture", 0.21],
      ["sim-source-chemical-06", "Confirmatory chemistry fixture", 0.21],
      ["sim-source-mechanical-07", "Mechanical fixture", 0.15],
    ].map(([sourceId, label, contribution]) => ({
      id: `sim-contribution-${String(sourceId).replace("sim-source-", "")}`,
      sourceId: String(sourceId),
      label: String(label),
      contribution: Number(contribution),
      basis: "Illustrative deterministic scenario weight; not model attribution.",
      synthetic: true,
    })),
    model: {
      state: "simulated",
      name: "deterministic-lineage-fixture",
      version: "1.0.0",
      schemaVersion: "fixture-v1",
      evaluatedAt: null,
      basis: "Fixed sanitized workflow fixture; no trained model and no environmental inference service.",
      synthetic: true,
    },
    runs: [
      {
        id: fusionRunNode.id,
        state: "simulated",
        startedAt: "2026-09-01T18:40:00.000Z",
        completedAt: "2026-09-01T18:40:05.000Z",
        inputNodeIds: observations.filter((item) => item.state !== "late" && item.state !== "missing").map((item) => item.id),
        outputNodeIds: conclusions.map((item) => item.id),
        modelName: "deterministic-lineage-fixture",
        modelVersion: "1.0.0",
        confidence: 0.62,
        uncertainty: fusionRunNode.uncertainty,
        reviewState: "pending",
        reason: "Sanitized scenario only; this fixture does not read or modify the runtime fusion-run resource.",
        dataMode: "simulated",
        synthetic: true,
      },
    ],
    timeline: [
      { id: "sim-time-rain", at: "2026-09-01T18:27:00.000Z", label: "Rainfall fixture onset", detail: "Acoustic fixture", nodeIds: ["sim-observation-acoustic-rain"], state: "simulated", synthetic: true },
      { id: "sim-time-water", at: "2026-09-01T18:34:00.000Z", label: "Water reflectance fixture", detail: "Spectral observation", nodeIds: ["sim-observation-spectral-water"], state: "simulated", synthetic: true },
      { id: "sim-time-conflict", at: "2026-09-01T18:35:00.000Z", label: "Chemistry conflict detected", detail: "Two valid fixture readings disagree", nodeIds: ["sim-observation-chemical-field", "sim-observation-chemical-confirm"], state: "simulated", synthetic: true },
      { id: "sim-time-zero", at: "2026-09-01T18:38:00.000Z", label: "Mechanical measured absence", detail: "Zero threshold crossings measured", nodeIds: ["sim-observation-mechanical-zero"], state: "simulated", synthetic: true },
      { id: "sim-time-run", at: "2026-09-01T18:40:05.000Z", label: "Sanitized fusion exercise completed", detail: "Candidate held for human review", nodeIds: [fusionRunNode.id, conclusions[0].id], state: "simulated", synthetic: true },
      { id: "sim-time-review", at: "2026-09-01T18:41:00.000Z", label: "Review opened", detail: "No external send or actuation", nodeIds: [assessment.id], state: "simulated", synthetic: true },
      { id: "sim-time-late", at: "2026-09-01T18:43:30.000Z", label: "Late bioelectric fixture received", detail: "Retained outside run inputs", nodeIds: ["sim-observation-bioelectric-late"], state: "simulated", synthetic: true },
    ],
    gaps: [
      "This scenario is fixed, sanitized, and entirely synthetic.",
      "Thermal input is missing, one bioelectric input is late, and the chemical conflict is unresolved.",
      "Review dispositions remain in this browser session and are never sent to an external system.",
      "No trained model, operational fusion run, narrative service, target system, asset control, or actuation path is used.",
    ],
    note: "SIMULATED scenario namespace only. It does not augment, replace, or imply operational environmental state.",
  }
}

export function applyScenarioDisposition(
  snapshot: FusionSnapshot,
  state: "accepted" | "rejected" | "pending",
): FusionSnapshot {
  if (snapshot.condition !== "simulated") return snapshot
  const disposition: ReviewDisposition = {
    ...pendingDisposition,
    state,
    judgment:
      state === "accepted"
        ? "Accepted in the local sanitized scenario session."
        : state === "rejected"
          ? "Rejected in the local sanitized scenario session."
          : null,
  }
  const nodeState = state === "pending" ? "pending" : state
  const reviewNodeIds = new Set(["sim-change-drainage-response", "sim-assessment-drainage-review"])
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((item) =>
      reviewNodeIds.has(item.id)
        ? {
            ...item,
            state: nodeState,
            disposition,
            facts: item.facts.map((fact) => {
              const tone = state === "rejected" ? "bad" : state === "accepted" ? "ok" : "warn"
              if (fact.label === "Disposition") {
                return { ...fact, value: `${state.replaceAll("_", " ")} · local simulated session`, state: tone }
              }
              if (fact.label === "Status") {
                return {
                  ...fact,
                  value:
                    state === "accepted"
                      ? "Accepted · local simulated session"
                      : state === "rejected"
                        ? "Rejected · local simulated session"
                        : "Candidate · pending local simulated review",
                  state: tone,
                }
              }
              return fact
            }),
          }
        : item.id === "sim-narrative-drainage-draft"
          ? {
              ...item,
              state: state === "accepted" ? "available" : state,
              summary:
                state === "accepted"
                  ? "The fixture narrative is available inside this simulated session only; no external release occurs."
                  : state === "rejected"
                    ? "The fixture narrative is rejected and remains unavailable."
                    : "A fixture draft is withheld from downstream use until the candidate conclusion is accepted by a human reviewer.",
            }
          : item,
    ),
    runs: snapshot.runs?.map((run) => ({ ...run, reviewState: state })) ?? null,
    timeline: [
      ...snapshot.timeline.filter((item) => item.id !== "sim-time-local-disposition"),
      ...(state === "pending"
        ? []
        : [
            {
              id: "sim-time-local-disposition",
              at: null,
              label: `Conclusion ${state}`,
              detail: "Local simulated session only; not persisted or transmitted.",
              nodeIds: ["sim-assessment-drainage-review", "sim-change-drainage-response"],
              state: "simulated" as const,
              synthetic: true,
            },
          ]),
    ],
  }
}
