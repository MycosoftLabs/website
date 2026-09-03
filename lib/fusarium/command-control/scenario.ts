import {
  COMMAND_CONTROL_SCHEMA,
  buildPolicyGates,
  type ActivityRecord,
  type CommandContext,
  type CommandSnapshot,
  type ContextHandoff,
  type CoverageRecord,
  type EndpointTruth,
  type EnvironmentalObject,
  type EvidenceRecord,
  type Mission,
  type MissionArea,
  type MissionContextRecord,
  type Observation,
  type ObservationRecommendation,
  type RecipientRoute,
  type ReviewItem,
  type SourceReadiness,
  type WatchCondition,
} from "./contracts"

export const SANITIZED_SCENARIO_NOTICE =
  "SIMULATED sanitized coordination scenario. It is a client-side training artifact, contains no real measurement, and cannot transmit or create operational state."

const START = "2026-01-15T00:00:00.000Z"
const OBSERVED = "2026-01-15T01:00:00.000Z"
const RECEIVED = "2026-01-15T01:01:00.000Z"
const REVIEWED = "2026-01-15T01:10:00.000Z"
const CAPTURED = "2026-01-15T06:00:00.000Z"
const END = "2026-01-15T06:00:00.000Z"

const MISSION_ID = "demo:mission-alpha-7"
const AREA_ID = "demo-area-alpha-7"
const CONTEXT_ID = "demo:context-command-review"
const OBJECT_ID = "demo:object-alpha-7-atmosphere"
const EVIDENCE_ID = "demo:evidence-alpha-7-001"
const SOURCE_ID = "demo:source-alpha-7"
const REVIEW_ID = "demo:review-alpha-7-evidence"

function scenarioContext(input: CommandContext): CommandContext {
  return {
    ...input,
    missionId: MISSION_ID,
    contextId: CONTEXT_ID,
    missionAreaId: AREA_ID,
    missionAreaLabel: "SIMULATED Alpha-7 training area",
    timeWindow: "6h",
    timeRange: { start: START, end: END },
    mode: "simulated",
    selectedObjectId: OBJECT_ID,
    selectedEvidenceId: EVIDENCE_ID,
    selectedSourceId: SOURCE_ID,
    selectedDeviceId: input.selectedDeviceId,
    operatorId: "demo:operator",
    operatorRole: "analyst",
    classification: "UNCLASSIFIED",
  }
}

function scenarioResources(context: CommandContext) {
  const missionArea: MissionArea = {
    id: AREA_ID,
    namespace: "demo",
    name: "SIMULATED Alpha-7 training area",
    description: `${SANITIZED_SCENARIO_NOTICE} No real geographic bounds are supplied.`,
    revision: 1,
    classification: "UNCLASSIFIED",
  }
  const mission: Mission = {
    id: MISSION_ID,
    namespace: "demo",
    name: "SIMULATED Alpha-7 environmental review",
    description: SANITIZED_SCENARIO_NOTICE,
    status: "draft",
    selectedContextId: CONTEXT_ID,
    revision: 1,
    classification: "UNCLASSIFIED",
  }
  const missionContext: MissionContextRecord = {
    id: CONTEXT_ID,
    namespace: "demo",
    missionId: MISSION_ID,
    missionAreaId: AREA_ID,
    missionAreaLabel: context.missionAreaLabel,
    timeRange: context.timeRange,
    timeWindow: "6h",
    dataMode: "simulated",
    selectedObjectId: OBJECT_ID,
    selectedEvidenceId: EVIDENCE_ID,
    selectedSourceId: SOURCE_ID,
    sourceApplication: "command-control",
    operatorId: context.operatorId,
    operatorRole: context.operatorRole,
    revision: 1,
    classification: "UNCLASSIFIED",
  }
  const source: SourceReadiness = {
    id: SOURCE_ID,
    namespace: "demo",
    label: "SIMULATED Alpha-7 fixture source",
    sourceType: "sanitized_scenario",
    endpointRef: null,
    state: "configured",
    configured: true,
    verified: false,
    live: false,
    observedAt: OBSERVED,
    receivedAt: RECEIVED,
    lastSuccessAt: null,
    staleAfterSeconds: null,
    recordCount: 1,
    dataMode: "simulated",
    synthetic: true,
    reason: SANITIZED_SCENARIO_NOTICE,
    classification: "UNCLASSIFIED",
  }
  const evidence: EvidenceRecord = {
    id: EVIDENCE_ID,
    namespace: "demo",
    missionId: MISSION_ID,
    missionAreaId: AREA_ID,
    objectIds: [OBJECT_ID],
    sourceId: SOURCE_ID,
    title: "SIMULATED Alpha-7 atmospheric fixture evidence",
    summary: "Training-only source artifact supplied to exercise evidence review; it contains no measured environmental value.",
    sourceRef: "scenario://sanitized/alpha-7/evidence/001",
    observedAt: OBSERVED,
    receivedAt: RECEIVED,
    confidence: {
      score: null,
      label: "not_assessed",
      basis: "Scenario confidence is deliberately not assessed.",
    },
    confidenceBasis: "SIMULATED fixture; no real source confidence exists.",
    integrityState: "unverified",
    verificationState: "unavailable",
    dataMode: "simulated",
    synthetic: true,
    classification: "UNCLASSIFIED",
  }
  const object: EnvironmentalObject = {
    id: OBJECT_ID,
    namespace: "demo",
    missionId: MISSION_ID,
    missionAreaId: AREA_ID,
    objectType: "change",
    domain: "atmosphere",
    name: "SIMULATED Alpha-7 atmospheric review object",
    summary: "Training object used to preview a human-owned coordination review. No real condition is asserted.",
    status: "unknown",
    missionConsequence: "SIMULATED: determine whether a passive confirmatory observation should be proposed for human review.",
    sourceIds: [SOURCE_ID],
    evidenceIds: [EVIDENCE_ID],
    provenanceRef: "scenario://sanitized/alpha-7/object/atmosphere",
    confidence: {
      score: null,
      label: "not_assessed",
      basis: "Scenario confidence is deliberately not assessed.",
    },
    freshness: {
      observedAt: OBSERVED,
      receivedAt: RECEIVED,
      staleAfterSeconds: null,
      state: "simulated",
      basis: "scenario_clock",
    },
    dataMode: "simulated",
    synthetic: true,
    classification: "UNCLASSIFIED",
  }
  const observation: Observation = {
    id: "demo:observation-alpha-7-001",
    namespace: "demo",
    missionId: MISSION_ID,
    missionAreaId: AREA_ID,
    sourceId: SOURCE_ID,
    domain: "atmosphere",
    objectIds: [OBJECT_ID],
    evidenceIds: [EVIDENCE_ID],
    observedAt: OBSERVED,
    receivedAt: RECEIVED,
    payload: { scenarioLabel: "SIMULATED", statement: SANITIZED_SCENARIO_NOTICE },
    dataMode: "simulated",
    synthetic: true,
    classification: "UNCLASSIFIED",
  }
  const coverage: CoverageRecord = {
    id: "demo:coverage-alpha-7-atmosphere",
    namespace: "demo",
    missionId: MISSION_ID,
    missionAreaId: AREA_ID,
    sourceId: SOURCE_ID,
    domain: "atmosphere",
    timeRange: context.timeRange,
    state: "partial",
    expectedRecords: null,
    observedRecords: 1,
    gaps: [SANITIZED_SCENARIO_NOTICE, "No real spatial or temporal coverage is asserted."],
    sourceState: "configured",
    freshness: object.freshness,
    dataMode: "simulated",
    synthetic: true,
    classification: "UNCLASSIFIED",
  }
  const review: ReviewItem = {
    id: REVIEW_ID,
    namespace: "demo",
    missionId: MISSION_ID,
    kind: "evidence",
    state: "in_review",
    objectIds: [OBJECT_ID],
    evidenceIds: [EVIDENCE_ID],
    requestedBy: "demo:environmental-duty-officer",
    assignedTo: "demo:human-analyst",
    judgment: null,
    dataMode: "simulated",
    synthetic: true,
    revision: 1,
    createdAt: RECEIVED,
    updatedAt: REVIEWED,
    classification: "UNCLASSIFIED",
  }
  const watch: WatchCondition = {
    id: "demo:watch-alpha-7-evidence",
    namespace: "demo",
    missionId: MISSION_ID,
    watchAreaId: "demo:watch-area-alpha-7",
    label: "Evidence verification hold",
    rule: "Hold the local package until a human reviews the linked synthetic evidence.",
    consequence: "No local release-ready state is shown while the review remains unresolved.",
    status: "simulated",
    objectIds: [OBJECT_ID],
    evidenceIds: [EVIDENCE_ID],
    requiresAnalystReview: true,
    synthetic: true,
    revision: 1,
    classification: "UNCLASSIFIED",
  }
  return { missionArea, mission, missionContext, source, evidence, object, observation, coverage, review, watch }
}

function scenarioActivity(context: CommandContext): ActivityRecord[] {
  return [
    {
      id: "demo:activity-context",
      sequence: 1,
      namespace: "demo",
      missionId: MISSION_ID,
      missionContextId: CONTEXT_ID,
      actorId: "demo:operator",
      actorRole: "analyst",
      occurredAt: RECEIVED,
      actionType: "context_selected",
      objectIds: [OBJECT_ID],
      evidenceIds: [EVIDENCE_ID],
      beforeState: null,
      afterState: { sourceApplication: "situational-awareness", targetApplication: "command-control" },
      judgment: null,
      auditMetadata: { scenario: true, notice: SANITIZED_SCENARIO_NOTICE },
      dataMode: "simulated",
      appendOnly: true,
      classification: "UNCLASSIFIED",
    },
    {
      id: "demo:activity-review",
      sequence: 2,
      namespace: "demo",
      missionId: MISSION_ID,
      missionContextId: context.contextId,
      actorId: "demo:human-analyst",
      actorRole: "analyst",
      occurredAt: REVIEWED,
      actionType: "review_created",
      objectIds: [OBJECT_ID],
      evidenceIds: [EVIDENCE_ID],
      beforeState: null,
      afterState: { reviewId: REVIEW_ID, state: "in_review" },
      judgment: "SIMULATED review opened; no operational decision recorded.",
      auditMetadata: { scenario: true },
      dataMode: "simulated",
      appendOnly: true,
      classification: "UNCLASSIFIED",
    },
  ]
}

function scenarioHandoffs(context: CommandContext): ContextHandoff[] {
  return [
    {
      id: "demo:handoff-sa-command-review",
      namespace: "demo",
      contextId: CONTEXT_ID,
      missionId: MISSION_ID,
      missionAreaId: AREA_ID,
      missionAreaLabel: context.missionAreaLabel,
      timeRange: context.timeRange,
      timeWindow: context.timeWindow,
      dataMode: "simulated",
      selectedObjectId: OBJECT_ID,
      selectedEvidenceId: EVIDENCE_ID,
      selectedSourceId: SOURCE_ID,
      operatorId: context.operatorId,
      operatorRole: context.operatorRole,
      sourceApplication: "situational-awareness",
      targetApplication: "command-control",
      revision: 1,
      createdAt: RECEIVED,
      classification: "UNCLASSIFIED",
    },
  ]
}

export function buildSanitizedCommandSnapshot(
  input: CommandContext,
  demoEndpointTruth?: EndpointTruth,
): CommandSnapshot {
  const context = scenarioContext(input)
  const resources = scenarioResources(context)
  const localTruth: EndpointTruth = {
    id: "sanitized-scenario",
    label: "Client-side sanitized coordination scenario",
    endpoint: "scenario://sanitized/command-control/alpha-7",
    required: true,
    transport: "reachable",
    httpStatus: null,
    identity: "not_required",
    schema: "valid",
    freshness: "simulated",
    provenance: "build://fusarium/command-control/sanitized-scenario",
    coverage: "simulated",
    dataPresence: "present",
    recordCount: 1,
    receivedAt: CAPTURED,
    note: SANITIZED_SCENARIO_NOTICE,
  }
  const recommendation: ObservationRecommendation = {
    id: "demo:recommendation-passive-confirmation",
    label: "Draft a passive confirmatory observation request",
    rationale: "Exercise the review disclosure without directing a device, asset, or external actor.",
    objectIds: [OBJECT_ID],
    evidenceIds: [EVIDENCE_ID],
    state: "simulated",
    externalSideEffects: "NONE",
    synthetic: true,
  }
  const recipients: RecipientRoute[] = [
    {
      id: "demo:local-review",
      label: "SIMULATED local human review queue",
      kind: "local-review",
      endpoint: "scenario://sanitized/local-review",
      identity: "SIMULATED HUMAN ROLE · NOT VERIFIED",
      schema: COMMAND_CONTROL_SCHEMA,
      readiness: "simulated",
      lastAcknowledgment: null,
      note: "Local preview only. No message is sent and no operational review is created.",
    },
    ...["Palantir", "Anduril Lattice", "Platform One", "JADC2"].map<RecipientRoute>((label) => ({
      id: `demo:disabled-${label.toLowerCase().replaceAll(" ", "-")}`,
      label,
      kind: "external-disabled",
      endpoint: "NOT CONFIGURED",
      identity: "UNVERIFIED",
      schema: "UNPINNED",
      readiness: "blocked",
      lastAcknowledgment: null,
      note: "Disabled connector seam. No call, credential use, or transmission control exists.",
    })),
  ]
  const policyGates = buildPolicyGates({
    context,
    review: resources.review,
    evidence: [resources.evidence],
    objects: [resources.object],
    readiness: null,
  })

  return {
    schema: COMMAND_CONTROL_SCHEMA,
    generatedAt: CAPTURED,
    condition: "simulated",
    note: SANITIZED_SCENARIO_NOTICE,
    context,
    contract: null,
    mission: resources.mission,
    missionAreas: [resources.missionArea],
    missions: [resources.mission],
    contexts: [resources.missionContext],
    readiness: null,
    connectors: [],
    sources: [resources.source],
    coverage: [resources.coverage],
    observations: [resources.observation],
    objects: [resources.object],
    evidence: [resources.evidence],
    reviews: [resources.review],
    watchConditions: [resources.watch],
    activity: scenarioActivity(context),
    handoffs: scenarioHandoffs(context),
    truth: demoEndpointTruth ? [localTruth, demoEndpointTruth] : [localTruth],
    policyGates,
    recipients,
    recommendations: [recommendation],
    packagePreview: {
      id: "demo:package-alpha-7-review",
      title: "SIMULATED environmental intelligence review package",
      before: [
        "Evidence state: UNVERIFIED / SIMULATED",
        "Observation request: NOT STAGED",
        "Recipient route: NONE",
      ],
      proposed: [
        "Record a human review disposition in this client-side scenario only",
        "Stage a passive observation-request draft with no actuation or transmission",
        "Keep every external connector disabled",
      ],
      evidenceIds: [EVIDENCE_ID],
      objectIds: [OBJECT_ID],
      provenance: ["scenario://sanitized/alpha-7", SANITIZED_SCENARIO_NOTICE],
      messageReadiness: "simulated",
      externalRelease: "DISABLED",
      exportPreview: {
        schema: COMMAND_CONTROL_SCHEMA,
        mode: "SIMULATED",
        missionId: MISSION_ID,
        missionAreaId: AREA_ID,
        reviewId: REVIEW_ID,
        objectIds: [OBJECT_ID],
        evidenceIds: [EVIDENCE_ID],
        policy: "HOLD",
        externalRelease: "DISABLED",
        notice: SANITIZED_SCENARIO_NOTICE,
      },
      synthetic: true,
    },
    gaps: [
      "The scenario does not verify identity, source integrity, coverage, recipient routing, or external connector authorization.",
      "No real observation request, review update, activity record, acknowledgment, export, or transmission occurs.",
      "Forecast data is not part of the current v1 contract.",
    ],
  }
}
