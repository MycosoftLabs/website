import {
  createOverviewRecord,
  type ConnectorPayload,
  type OverviewCardPayload,
  type OverviewContext,
  type OverviewRecord,
  type OverviewSnapshot,
  type OverviewStatusState,
} from "@/lib/fusarium/overview/contracts"

const DEMO_SOURCE = "sanitized-scenario-alpha-7"
const DEMO_PROVENANCE = "demo://fusarium/overview/scenario-alpha-7/v1"

function unavailable(
  context: OverviewContext,
  now: string,
  recordId: string,
  surface: string,
  reason: string,
  state: OverviewStatusState = "unknown",
): OverviewRecord<OverviewCardPayload> {
  return createOverviewRecord<OverviewCardPayload>({
    recordId,
    missionAreaId: context.missionAreaId,
    now,
    payload: null,
    state,
    condition: "empty",
    source: "overview-provider",
    surface,
    reason,
    observedAt: null,
    provenanceRef: "build://fusarium/overview/provider/v1",
  })
}

function loading<T>(
  context: OverviewContext,
  now: string,
  recordId: string,
  surface: string,
): OverviewRecord<T> {
  return createOverviewRecord<T>({
    recordId,
    missionAreaId: context.missionAreaId,
    now,
    payload: null,
    state: "unknown",
    condition: "loading",
    source: "overview-provider",
    surface,
    reason: "Waiting for this local provider to respond.",
    observedAt: null,
    provenanceRef: "build://fusarium/overview/provider/v1",
  })
}

function simulated(
  context: OverviewContext,
  now: string,
  recordId: string,
  surface: string,
  payload: OverviewCardPayload,
  score: number | null,
  basis: string,
): OverviewRecord<OverviewCardPayload> {
  const label = score === null ? "not_assessed" : score >= 0.8 ? "high" : score >= 0.6 ? "moderate" : "low"
  return createOverviewRecord({
    recordId,
    missionAreaId: context.missionAreaId,
    now,
    payload,
    state: "simulated",
    condition: "simulated",
    source: DEMO_SOURCE,
    surface,
    reason: "Deterministic sanitized scenario object; no operational telemetry is represented.",
    dataMode: "simulated",
    sourceIds: [DEMO_SOURCE, `${DEMO_SOURCE}:${recordId}`],
    provenanceRef: `${DEMO_PROVENANCE}/${recordId}`,
    confidence: { score, label, basis },
    staleAfterSeconds: 3600,
    demo: true,
  })
}

function foundationBlockers(context: OverviewContext, now: string): OverviewRecord<OverviewCardPayload>[] {
  const blocker = (recordId: string, title: string, summary: string, nextStep: string) =>
    createOverviewRecord({
      recordId,
      missionAreaId: context.missionAreaId,
      now,
      payload: { title, summary, nextStep },
      state: "blocked",
      condition: "ready",
      source: "verified-platform-reconciliation",
      surface: "Overview / Foundation blockers",
      reason: "Verified current platform limitation; resolution belongs to a shared-platform lane.",
      dataMode: "unavailable",
      sourceIds: ["fusarium-runtime-current-state", "overview-gap-reconciliation"],
      provenanceRef: "build://fusarium/foundation/reconciliation-2026-09-01",
      observedAt: now,
    })

  return [
    blocker(
      "foundation-auth",
      "Runtime exposure and identity",
      "The development runtime listens on 0.0.0.0:8011 and may be LAN-reachable, although host-firewall reachability is unverified. Role-aware development headers exist but are not an accredited staging trust boundary; the 8012 host is loopback-only.",
      "Treat the development-header identity as unverified until the shared accredited-environment boundary is implemented.",
    ),
    blocker(
      "foundation-persistence",
      "Durable mission and audit state",
      "SQLite/WAL persistence and /api/fusarium/v1 are source-implemented, but the running 8011 revision, active v1 binding, and applied migration head remain unverified. A not_bound runtime requires an approved restart before revalidation; no Supabase or NAS persistence/backup path is proven.",
      "Keep local SQLite/WAL as the sole declared writer and resolve runtime binding, backup, retention, and operational-record policy in the shared platform lane.",
    ),
    blocker(
      "foundation-deployment",
      "Staging and deployment boundary",
      "No staging guest, deployment path, DNS, or TLS boundary is currently verified for Fusarium.",
      "Keep this Overview on the local development surface until the shared deployment lane establishes those controls.",
    ),
    blocker(
      "foundation-observability",
      "Metrics and audit retention",
      "No dedicated metrics pipeline or retained audit service is currently verified.",
      "Treat point-in-time health polls as transient status only; establish retained observability in the shared platform lane.",
    ),
    blocker(
      "foundation-external-data",
      "External data dependency boundary",
      "MINDEX, MAS, Supabase, and NAS are not proven configured, reachable, authenticated, authorized, schema-compatible, data-present, or fresh for Fusarium.",
      "Keep external evidence, storage, identity, and agent claims unavailable until an approved read-only gate proves each axis independently.",
    ),
    blocker(
      "foundation-threat-route",
      "Threat provider namespace",
      "A legacy host route masks the 8011 threat provider and currently fails instead of returning its honest empty state.",
      "Resolve the route collision in the shared integration lane; Overview does not depend on it.",
    ),
    blocker(
      "foundation-runtime-catalog",
      "Native app catalog parity",
      "OEI Narrative and Stack Inventory exist in the frontend catalog but are absent from the runtime catalog.",
      "Align the shared runtime catalog after native app contracts stabilize.",
    ),
  ]
}

export function createLoadingSnapshot(context: OverviewContext, now = new Date().toISOString()): OverviewSnapshot {
  return {
    context,
    generatedAt: now,
    operationalPosture: unavailable(
      context,
      now,
      "posture-unavailable",
      "Overview / Operational posture",
      "No mission assessment provider is bound. Enable the sanitized scenario to exercise the evidence workflow.",
      "not_implemented",
    ),
    missionContinuity: unavailable(
      context,
      now,
      "mission-continuity-unavailable",
      "Overview / Active mission continuity",
      "No durable mission, review, or handoff record is bound. Context in this page is URL-scoped only.",
      "not_implemented",
    ),
    environmentalPicture: unavailable(
      context,
      now,
      "picture-unavailable",
      "Overview / Environmental picture",
      "No mission bounds and no Overview-facing Earth picture were supplied. The non-map fallback remains explicit.",
      "not_implemented",
    ),
    environmentalStateMatrix: unavailable(
      context,
      now,
      "state-matrix-unavailable",
      "Overview / Environmental state matrix",
      "No evidence-backed domain state is available for air, water, land/soil, living systems, infrastructure, or processes.",
      "not_implemented",
    ),
    oeiBrief: unavailable(
      context,
      now,
      "brief-unavailable",
      "Overview / OEI situation brief",
      "No evidence-backed OEI brief exists for this mission context.",
      "not_implemented",
    ),
    priorityAnomalies: [
      unavailable(
        context,
        now,
        "anomalies-empty",
        "Overview / Priority anomalies",
        "No anomaly provider is bound. Unknown is not displayed as a measured zero.",
        "not_implemented",
      ),
    ],
    causalAssessment: [
      unavailable(
        context,
        now,
        "causal-assessment-unavailable",
        "Overview / Causal chain and competing explanations",
        "No evidence-backed causal hypothesis or competing explanation is available.",
        "not_implemented",
      ),
    ],
    recommendedObservations: [
      unavailable(
        context,
        now,
        "observations-empty",
        "Overview / Recommended observations",
        "No recommendation engine or approved observation queue is bound.",
        "not_implemented",
      ),
    ],
    governanceQueue: [
      unavailable(
        context,
        now,
        "governance-empty",
        "Overview / Governance queue",
        "No durable review queue is available. No approval or actuation control is exposed here.",
        "not_implemented",
      ),
    ],
    stabilityOutlook: [
      unavailable(
        context,
        now,
        "outlook-unavailable",
        "Overview / Stability outlook",
        "No deployed NLM or forecast conclusion is available.",
        "not_implemented",
      ),
    ],
    deviceDomainHealth: [loading(context, now, "device-health-loading", "Overview / Device and domain health")],
    modalityCoverage: [loading(context, now, "modality-loading", "Overview / Modality coverage")],
    provenanceHealth: [
      unavailable(
        context,
        now,
        "provenance-unavailable",
        "Overview / Provenance health",
        "No mission evidence set is selected, so provenance completeness cannot be measured.",
        "unknown",
      ),
    ],
    missionRouting: [
      unavailable(
        context,
        now,
        "routing-unavailable",
        "Overview / Mission routing",
        "Mission and alert routing are not implemented on this runtime.",
        "not_implemented",
      ),
    ],
    productQueue: [
      unavailable(
        context,
        now,
        "products-empty",
        "Overview / Intelligence product queue",
        "No durable intelligence-product queue is bound.",
        "not_implemented",
      ),
    ],
    coreServices: [loading(context, now, "services-loading", "Overview / Core service health")],
    connectorHealth: [loading<ConnectorPayload>(context, now, "connectors-loading", "Overview / Connector health")],
    activity: [loading(context, now, "activity-loading", "Overview / Activity timeline")],
    foundationBlockers: foundationBlockers(context, now),
  }
}

export function applySanitizedScenario(snapshot: OverviewSnapshot): OverviewSnapshot {
  if (snapshot.context.dataMode !== "demo") return snapshot

  const { context, generatedAt: now } = snapshot
  return {
    ...snapshot,
    operationalPosture: simulated(
      context,
      now,
      "posture-monitor",
      "Overview / Operational posture",
      {
        kicker: "MONITOR · HUMAN REVIEW REQUIRED",
        title: "Correlated environmental change persists in the exercise corridor",
        summary:
          "A simulated volatile-organic-compound pattern remains co-located with a simulated soil-moisture shift. No operational action has been authorized.",
        location: "Training Area ALPHA-7 · service corridor C",
        trend: "Persistent across three simulated observation cycles",
        nextStep: "Review the evidence bundle and approve or reject a confirmatory observation.",
      },
      0.82,
      "Scenario fusion of four synthetic observations with an intentionally incomplete visual channel.",
    ),
    missionContinuity: simulated(
      context,
      now,
      "mission-continuity-demo",
      "Overview / Active mission continuity",
      {
        kicker: "ANALYTIC CONTINUITY · HUMAN OWNED",
        title: "Evidence review remains the active decision thread",
        summary:
          "The simulated mission context carries one policy-held brief, two proposed observations, and no authorized external release or execution path.",
        owner: "Environmental Duty Officer",
        details: [
          { label: "Open reviews", value: "2 · SIMULATED" },
          { label: "Next evidence window", value: "2 scenario hours · SIMULATED" },
          { label: "External delivery", value: "NOT CONFIGURED" },
        ],
        nextStep: "Preserve the evidence and review context when entering the owning native app.",
      },
      null,
      "Deterministic mission-continuity fixture; no durable mission record is bound to this Overview context.",
    ),
    environmentalPicture: simulated(
      context,
      now,
      "environment-picture",
      "Overview / Environmental picture",
      {
        kicker: "NON-MAP FALLBACK",
        title: "Environmental picture summary",
        summary:
          "Simulated chemical and soil-condition changes are concentrated along corridor C; simulated wind context keeps the change localized inside the exercise area.",
        location: "Training Area ALPHA-7 · 1.4 km sanitized exercise extent",
        trend: "Localized change; spatial confidence limited by one unavailable visual source",
        nextStep: "Open Situational Awareness for the object list and spatial context.",
        details: [
          { label: "Atmosphere", value: "Context stable · SIMULATED" },
          { label: "Water", value: "Localized change · SIMULATED" },
          { label: "Land / soil", value: "Correlated change · SIMULATED" },
          { label: "Living systems", value: "Evidence gap · SIMULATED" },
          { label: "Infrastructure", value: "Potential exposure · SIMULATED" },
          { label: "Process coupling", value: "Water ↔ soil ↔ infrastructure · SIMULATED" },
          { label: "Earth contract", value: "Not queried — mission bounds are not operational" },
          { label: "Picture type", value: "Read-only text fallback" },
        ],
      },
      0.78,
      "Synthetic chemical, moisture, and weather-context objects; no Earth Simulator data was queried.",
    ),
    environmentalStateMatrix: simulated(
      context,
      now,
      "environment-state-matrix",
      "Overview / Environmental state matrix",
      {
        kicker: "CROSS-DOMAIN STATE · SIMULATED",
        title: "Water–soil–infrastructure coupling is the active relationship",
        summary:
          "The matrix keeps environmental domains and processes visible as first-class objects, including what is stable, changing, uncertain, or missing.",
        details: [
          { label: "Atmosphere", value: "STABLE CONTEXT · SIMULATED" },
          { label: "Water", value: "CHANGE UNDER REVIEW · SIMULATED" },
          { label: "Land / soil", value: "CORRELATED CHANGE · SIMULATED" },
          { label: "Living systems", value: "UNKNOWN · EVIDENCE GAP" },
          { label: "Infrastructure", value: "EXPOSURE HYPOTHESIS · SIMULATED" },
          { label: "Processes", value: "TRANSPORT PATH UNCERTAIN · SIMULATED" },
        ],
        nextStep: "Inspect the selected objects and relationships in Situational Awareness.",
      },
      0.72,
      "Synthetic cross-domain relationship graph with one explicitly unknown living-systems state.",
    ),
    oeiBrief: simulated(
      context,
      now,
      "oei-brief",
      "Overview / OEI situation brief",
      {
        kicker: "DRAFT · NOT RELEASED",
        title: "OEI Situation Brief 001",
        summary:
          "The simulated pattern is more consistent with a localized infrastructure condition than a broad environmental transition. That judgment remains provisional until confirmatory sampling.",
        trend: "Most likely next: persistence within the next six simulated hours",
        nextStep: "Human analyst should validate wording, evidence sufficiency, and release marking.",
      },
      0.74,
      "Machine-generated demonstration judgment grounded only in the linked sanitized evidence bundle.",
    ),
    priorityAnomalies: [
      simulated(
        context,
        now,
        "anomaly-voc-moisture",
        "Overview / Priority anomalies",
        {
          kicker: "PRIORITY 1",
          title: "VOC and soil-moisture co-change",
          summary: "Two simulated modalities changed inside the same exercise grid cell and time interval.",
          location: "Corridor C · grid cell A7-C04",
          trend: "Persistent",
          nextStep: "Compare source calibration context before requesting confirmation.",
        },
        0.82,
        "Four synthetic source objects; two agree, one adds context, and one remains unavailable.",
      ),
      simulated(
        context,
        now,
        "anomaly-conductivity",
        "Overview / Priority anomalies",
        {
          kicker: "PRIORITY 2",
          title: "Drainage conductivity departure",
          summary: "A simulated reading departs from the scenario baseline but lacks a corroborating sample.",
          location: "Outfall D · grid cell A7-D02",
          trend: "Single-cycle change",
          nextStep: "Hold as an observation candidate until a second source reports.",
        },
        0.64,
        "One synthetic measurement plus baseline comparison; corroboration is intentionally absent.",
      ),
    ],
    causalAssessment: [
      simulated(
        context,
        now,
        "causal-primary",
        "Overview / Causal chain and competing explanations",
        {
          kicker: "WORKING HYPOTHESIS",
          title: "Localized infrastructure condition with environmental transport",
          summary:
            "The simulated co-change may reflect a localized source moving through wet soil toward drainage infrastructure.",
          trend: "Supported by spatial co-location; source identity remains unresolved",
          nextStep: "Use confirmatory observation evidence to test the transport relationship.",
        },
        0.67,
        "Synthetic co-location and change-order evidence; no causal proof is claimed.",
      ),
      simulated(
        context,
        now,
        "causal-competing",
        "Overview / Causal chain and competing explanations",
        {
          kicker: "COMPETING EXPLANATION",
          title: "Sensor drift plus routine drainage variability",
          summary:
            "The same simulated pattern could arise from calibration drift combined with a normal moisture transition.",
          trend: "Plausible until calibration and confirmation evidence arrive",
          nextStep: "Review calibration context before increasing confidence in either explanation.",
        },
        0.41,
        "Synthetic alternative hypothesis retained because calibration evidence is incomplete.",
      ),
    ],
    recommendedObservations: [
      simulated(
        context,
        now,
        "observation-grab-sample",
        "Overview / Recommended observations",
        {
          kicker: "HUMAN DECISION NEEDED",
          title: "Confirmatory environmental sample",
          summary: "Collect a simulated confirmation sample at waypoint OBS-04 using the approved exercise protocol.",
          location: "Waypoint OBS-04 · sanitized",
          owner: "Environmental response team",
          nextStep: "Review safety, access, and evidence requirements in Command & Control.",
        },
        0.76,
        "Recommendation derived from the simulated anomaly and its largest evidence gap.",
      ),
      simulated(
        context,
        now,
        "observation-repeat-transect",
        "Overview / Recommended observations",
        {
          kicker: "HUMAN DECISION NEEDED",
          title: "Repeat the corridor transect",
          summary: "Repeat the simulated passive measurement sequence after two scenario hours.",
          owner: "Mission collection coordinator",
          nextStep: "Confirm the collection window; no device tasking is available from Overview.",
        },
        0.68,
        "Synthetic temporal-gap analysis; no fleet or device readiness is assumed.",
      ),
    ],
    governanceQueue: [
      simulated(
        context,
        now,
        "review-bar-001",
        "Overview / Governance queue",
        {
          kicker: "POLICY HOLD",
          title: "Biological Anomaly Report draft",
          summary: "The simulated BAR draft is held until an analyst confirms evidence sufficiency and wording.",
          owner: "Human intelligence-product reviewer",
          nextStep: "Review only; no release or external send control exists on this page.",
        },
        0.74,
        "Demonstration review item linked to the simulated OEI brief and anomaly bundle.",
      ),
      simulated(
        context,
        now,
        "review-observation-117",
        "Overview / Governance queue",
        {
          kicker: "SAFETY REVIEW",
          title: "Observation request OR-117",
          summary: "The simulated confirmatory observation awaits human safety and access review.",
          owner: "Environmental duty officer",
          nextStep: "Approve, amend, or reject in the future review workflow; no actuation occurs here.",
        },
        null,
        "Human review state; no machine confidence score applies.",
      ),
    ],
    stabilityOutlook: [
      simulated(
        context,
        now,
        "outlook-6h",
        "Overview / Stability outlook",
        {
          kicker: "NEXT 6 HOURS",
          title: "Localized persistence more likely than expansion",
          summary: "The simulated change is expected to remain near corridor C if scenario wind and drainage remain steady.",
          trend: "Stable boundary · uncertain source persistence",
          nextStep: "Reassess after the recommended confirmation window.",
        },
        0.71,
        "Synthetic trend continuation with fixed scenario weather context; no deployed NLM prediction.",
      ),
      simulated(
        context,
        now,
        "outlook-24h",
        "Overview / Stability outlook",
        {
          kicker: "NEXT 24 HOURS",
          title: "Confidence falls without new evidence",
          summary: "No defensible simulated 24-hour projection is available without the recommended observations.",
          trend: "Evidence-limited",
          nextStep: "Treat the six-hour horizon as the current decision boundary.",
        },
        0.45,
        "Scenario deliberately withholds the observations needed for a longer-horizon conclusion.",
      ),
    ],
    modalityCoverage: [
      simulated(
        context,
        now,
        "coverage-chemical",
        "Overview / Modality coverage",
        {
          kicker: "SIMULATED COVERAGE",
          title: "Chemical context",
          value: "3 of 4 planned scenario sources reporting",
          summary: "Synthetic VOC and ambient-context objects are present; one corroborating source is absent.",
          nextStep: "Inspect source-level coverage in Data Fusion.",
        },
        null,
        "Coverage is a deterministic scenario fixture, not a model conclusion.",
      ),
      simulated(
        context,
        now,
        "coverage-physical",
        "Overview / Modality coverage",
        {
          kicker: "SIMULATED COVERAGE",
          title: "Physical environment context",
          value: "2 of 3 planned scenario sources reporting",
          summary: "Synthetic soil moisture and weather context are present; visual confirmation is unavailable.",
          nextStep: "Open Data Fusion to inspect the missing-source effect.",
        },
        null,
        "Coverage is a deterministic scenario fixture, not a measured operational percentage.",
      ),
    ],
    provenanceHealth: [
      simulated(
        context,
        now,
        "provenance-demo-bundle",
        "Overview / Provenance health",
        {
          kicker: "DEMONSTRATION LINEAGE",
          title: "Scenario evidence bundle resolves locally",
          value: "4 linked synthetic objects",
          summary: "Every displayed scenario conclusion points to a deterministic demo reference; no cryptographic operational claim is made.",
          nextStep: "Open Data Fusion for the normalized envelope and missing provenance capabilities.",
        },
        null,
        "Direct validation of deterministic frontend scenario references only.",
      ),
    ],
    missionRouting: [
      simulated(
        context,
        now,
        "mission-routing-demo",
        "Overview / Mission routing",
        {
          kicker: "LOCAL DEMO ROUTING",
          title: "Human review path only",
          summary: "The simulated anomaly routes to the local governance queue and OEI draft review. External delivery is not configured.",
          details: [
            { label: "Local analyst queue", value: "SIMULATED" },
            { label: "External C2", value: "NOT IMPLEMENTED" },
            { label: "Automated action", value: "NOT AVAILABLE" },
          ],
          nextStep: "Inspect review context in Command & Control.",
        },
        null,
        "Deterministic scenario routing; no message was sent.",
      ),
    ],
    productQueue: [
      simulated(
        context,
        now,
        "product-bar-draft",
        "Overview / Intelligence product queue",
        {
          kicker: "DRAFT · POLICY HOLD",
          title: "BAR-001 · Biological Anomaly Report",
          summary: "A simulated draft awaits human evidence and language review.",
          owner: "OEI analyst",
          nextStep: "Open OEI Narrative; no external release control is available.",
        },
        0.74,
        "Synthetic product derived from the simulated OEI brief.",
      ),
      simulated(
        context,
        now,
        "product-esi-queue",
        "Overview / Intelligence product queue",
        {
          kicker: "WAITING FOR EVIDENCE",
          title: "ESI-001 · Environmental Stability Index",
          summary: "The simulated product remains unscored until the confirmation window closes.",
          owner: "Environmental intelligence cell",
          nextStep: "Review source completeness before generation.",
        },
        null,
        "No conclusion exists; this is a deterministic queue-state fixture.",
      ),
    ],
    activity: [
      simulated(
        context,
        now,
        "activity-anomaly",
        "Overview / Activity timeline",
        {
          kicker: "T−18 MIN · DATA FUSION",
          title: "Cross-source anomaly correlation created",
          summary: "The sanitized scenario linked chemical and soil-condition objects.",
          nextStep: "Open the anomaly in Threat Assessment.",
        },
        0.82,
        "Deterministic scenario event tied to the simulated anomaly bundle.",
      ),
      simulated(
        context,
        now,
        "activity-brief",
        "Overview / Activity timeline",
        {
          kicker: "T−11 MIN · OEI NARRATIVE",
          title: "Situation brief draft generated",
          summary: "The scenario produced a draft judgment and placed it on policy hold.",
          nextStep: "Open the draft in OEI Narrative.",
        },
        0.74,
        "Deterministic scenario event tied to the simulated OEI brief.",
      ),
      simulated(
        context,
        now,
        "activity-observation",
        "Overview / Activity timeline",
        {
          kicker: "T−6 MIN · COMMAND & CONTROL",
          title: "Confirmatory observation proposed",
          summary: "The scenario added a human decision item; no device or external system was tasked.",
          nextStep: "Open the review context in Command & Control.",
        },
        0.76,
        "Deterministic scenario event; the recommendation remains inert.",
      ),
      ...snapshot.activity,
    ],
  }
}
