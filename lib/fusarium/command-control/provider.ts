import {
  COMMAND_CONTROL_SCHEMA,
  FUSARIUM_INTELLIGENCE_SCHEMA,
  assertReviewMutation,
  buildPolicyGates,
  deriveCommandCondition,
  isPage,
  type ActivityRecord,
  type CommandContext,
  type CommandSnapshot,
  type ComponentReadiness,
  type ContractRoot,
  type ContextHandoff,
  type CoverageRecord,
  type EndpointTruth,
  type EnvironmentalObject,
  type EvidenceRecord,
  type Freshness,
  type IntelligencePackagePreview,
  type Mission,
  type MissionArea,
  type MissionContextRecord,
  type Observation,
  type ObservationRecommendation,
  type Page,
  type ReadinessResponse,
  type RecipientRoute,
  type ReviewItem,
  type ReviewMutation,
  type ReviewMutationResult,
  type SourceReadiness,
  type WatchCondition,
} from "./contracts"
import { buildSanitizedCommandSnapshot } from "./scenario"

const API_ROOT = "/api/fusarium/v1"
const DEFAULT_LIMIT = "100"

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type UnknownRecord = Record<string, unknown>

interface RequestOutcome {
  endpoint: string
  status: number | null
  ok: boolean
  payload: unknown
  receivedAt: string | null
  error: string | null
}

interface ReadOptions {
  identity?: boolean
  required?: boolean
  label: string
  validate: (value: unknown) => boolean
  count?: (value: unknown) => number | null
  freshness?: (value: unknown) => Freshness["state"]
  provenance?: string
}

export interface CommandControlProvider {
  load(context: CommandContext, signal?: AbortSignal): Promise<CommandSnapshot>
  decideReview(
    context: CommandContext,
    review: ReviewItem,
    mutation: ReviewMutation,
    signal?: AbortSignal,
  ): Promise<ReviewMutationResult>
}

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null

function identityHeaders(context: CommandContext): HeadersInit {
  return {
    "X-Operator-Id": context.operatorId,
    "X-Operator-Role": context.operatorRole,
  }
}

async function requestJson(
  fetcher: Fetcher,
  endpoint: string,
  init: RequestInit = {},
): Promise<RequestOutcome> {
  try {
    const response = await fetcher(endpoint, { cache: "no-store", ...init })
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    return {
      endpoint,
      status: response.status,
      ok: response.ok,
      payload,
      receivedAt: new Date().toISOString(),
      error: response.ok ? null : errorText(payload) ?? `HTTP ${response.status}`,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return {
      endpoint,
      status: null,
      ok: false,
      payload: null,
      receivedAt: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function errorText(payload: unknown): string | null {
  const root = asRecord(payload)
  const error = asRecord(root?.error)
  if (typeof error?.message === "string") return error.message
  const detail = asRecord(root?.detail)
  const detailError = asRecord(detail?.error)
  if (typeof detailError?.message === "string") return detailError.message
  if (typeof detail?.error === "string") return detail.error
  if (typeof root?.detail === "string") return root.detail
  return null
}

function isContractRoot(value: unknown): value is ContractRoot {
  const item = asRecord(value)
  return Boolean(
    item &&
      item.schemaRef === FUSARIUM_INTELLIGENCE_SCHEMA &&
      item.classification === "UNCLASSIFIED" &&
      typeof item.identityMode === "string" &&
      typeof item.identityVerified === "boolean" &&
      item.productionAccredited === false,
  )
}

function isReadiness(value: unknown): value is ReadinessResponse {
  const item = asRecord(value)
  return Boolean(
    item &&
      item.schemaRef === FUSARIUM_INTELLIGENCE_SCHEMA &&
      item.classification === "UNCLASSIFIED" &&
      typeof item.identityMode === "string" &&
      typeof item.developmentIdentity === "boolean" &&
      asRecord(item.identity) &&
      asRecord(item.storage) &&
      Array.isArray(item.connectorAuthorization),
  )
}

function isComponentList(value: unknown): value is ComponentReadiness[] {
  return Array.isArray(value) && value.every((item) => {
    const record = asRecord(item)
    return Boolean(
      record &&
        typeof record.id === "string" &&
        typeof record.configured === "boolean" &&
        typeof record.verified === "boolean" &&
        record.classification === "UNCLASSIFIED",
    )
  })
}

function isTypedPage(value: unknown): value is Page<unknown> {
  return isPage(value) && value.items.every((item) => {
    const record = asRecord(item)
    return Boolean(record && typeof record.id === "string" && record.classification === "UNCLASSIFIED")
  })
}

function isDemoEnvelope(value: unknown): boolean {
  const root = asRecord(value)
  const snapshot = asRecord(root?.snapshot)
  const lists = [snapshot?.sources, snapshot?.observations, snapshot?.coverage, snapshot?.objects, snapshot?.evidence]
  return Boolean(
    root?.mode === "SIMULATED" &&
      asRecord(root.mission)?.namespace === "demo" &&
      asRecord(root.missionContext)?.dataMode === "simulated" &&
      lists.every(
        (list) =>
          Array.isArray(list) &&
          list.every((item) => {
            const record = asRecord(item)
            return record?.namespace === "demo" && record?.dataMode === "simulated" && record?.synthetic === true
          }),
      ),
  )
}

function pageCount(value: unknown): number | null {
  return isPage(value) ? value.items.length : null
}

function listCount(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null
}

function pageFreshness(value: unknown): Freshness["state"] {
  if (!isPage(value) || value.items.length === 0) return "unknown"
  const states = value.items
    .map((item) => asRecord(asRecord(item)?.freshness)?.state)
    .filter((state): state is string => typeof state === "string")
  if (states.some((state) => state === "simulated")) return "simulated"
  if (states.length > 0 && states.every((state) => state === "stale")) return "stale"
  if (states.some((state) => state === "fresh")) return "fresh"
  return "unknown"
}

function truthFrom(outcome: RequestOutcome, options: ReadOptions): EndpointTruth {
  const schemaValid = outcome.ok && options.validate(outcome.payload)
  const count = schemaValid ? options.count?.(outcome.payload) ?? null : null
  const identity =
    outcome.status === 401 || outcome.status === 403
      ? "rejected"
      : options.identity
        ? outcome.status === null
          ? "unknown"
          : "unverified"
        : "not_required"
  const transport = outcome.status === null ? "unreachable" : "reachable"
  const dataPresence = !schemaValid ? "unknown" : count === null ? "unknown" : count > 0 ? "present" : "empty"
  const relativeId = outcome.endpoint.replace(`${API_ROOT}/`, "").split("?", 1)[0]

  return {
    id: outcome.endpoint === API_ROOT ? "contract-root" : relativeId,
    label: options.label,
    endpoint: outcome.endpoint,
    required: options.required ?? true,
    transport,
    httpStatus: outcome.status,
    identity,
    schema: schemaValid ? "valid" : outcome.status === null ? "unknown" : "invalid",
    freshness: schemaValid ? options.freshness?.(outcome.payload) ?? "unknown" : "unknown",
    provenance: options.provenance ?? `local-api://${outcome.endpoint.replace(/^\//, "")}`,
    coverage: !schemaValid ? "unknown" : dataPresence === "present" ? "covered" : dataPresence === "empty" ? "gap" : "unknown",
    dataPresence,
    recordCount: count,
    receivedAt: outcome.receivedAt,
    note: schemaValid
      ? dataPresence === "empty"
        ? "Endpoint and top-level schema validated; it supplied no records. Empty is not an all-clear."
        : "Endpoint response and top-level contract validated for this browser poll."
      : transport === "unreachable"
        ? `No HTTP response was received${outcome.error ? `: ${outcome.error}` : "."}`
        : `HTTP ${outcome.status} was reachable, but the expected v1 contract was unavailable or invalid${outcome.error ? `: ${outcome.error}` : "."}`,
  }
}

function operationalPageItems<T extends { namespace?: string; dataMode?: string; synthetic?: boolean; classification?: string }>(
  outcome: RequestOutcome,
): T[] {
  if (!outcome.ok || !isTypedPage(outcome.payload)) return []
  return (outcome.payload.items as T[]).filter(
    (item) =>
      item.namespace !== "demo" &&
      item.dataMode !== "simulated" &&
      item.synthetic !== true &&
      item.classification === "UNCLASSIFIED",
  )
}

function operationalListItems<T extends { dataMode?: string; classification?: string }>(
  outcome: RequestOutcome,
): T[] {
  if (!outcome.ok || !isComponentList(outcome.payload)) return []
  return (outcome.payload as unknown as T[]).filter(
    (item) => item.dataMode !== "simulated" && item.classification === "UNCLASSIFIED",
  )
}

function chooseContext(input: CommandContext, contexts: MissionContextRecord[]): MissionContextRecord | null {
  if (input.contextId) {
    const exact = contexts.find((item) => item.id === input.contextId)
    if (exact) return exact
  }
  if (input.missionId) {
    const inMission = contexts.find(
      (item) => item.missionId === input.missionId && item.missionAreaId === input.missionAreaId,
    ) ?? contexts.find((item) => item.missionId === input.missionId)
    if (inMission) return inMission
  }
  return contexts.find((item) => item.missionAreaId === input.missionAreaId) ?? contexts[0] ?? null
}

function hydrateContext(input: CommandContext, selected: MissionContextRecord | null): CommandContext {
  if (!selected) return input
  return {
    ...input,
    missionId: selected.missionId,
    contextId: selected.id,
    missionAreaId: selected.missionAreaId,
    missionAreaLabel: selected.missionAreaLabel ?? selected.missionAreaId,
    timeWindow: selected.timeWindow ?? input.timeWindow,
    timeRange: selected.timeRange,
    selectedObjectId: input.selectedObjectId ?? selected.selectedObjectId,
    selectedEvidenceId: input.selectedEvidenceId ?? selected.selectedEvidenceId,
    selectedSourceId: input.selectedSourceId ?? selected.selectedSourceId,
    selectedDeviceId: input.selectedDeviceId,
    operatorId: selected.operatorId,
    operatorRole: selected.operatorRole,
    classification: "UNCLASSIFIED",
  }
}

function emptyPackage(reason: string, mode: CommandContext["mode"]): IntelligencePackagePreview {
  return {
    id: "package-unavailable",
    title: "Intelligence package unavailable",
    before: [reason],
    proposed: [],
    evidenceIds: [],
    objectIds: [],
    provenance: [],
    messageReadiness: mode === "simulated" ? "simulated" : "unavailable",
    externalRelease: "DISABLED",
    exportPreview: {
      schema: COMMAND_CONTROL_SCHEMA,
      state: "UNAVAILABLE",
      reason,
      externalRelease: "DISABLED",
    },
    synthetic: mode === "simulated",
  }
}

function selectReview(context: CommandContext, reviews: ReviewItem[]): ReviewItem | null {
  return (
    reviews.find(
      (review) =>
        (context.selectedEvidenceId && review.evidenceIds.includes(context.selectedEvidenceId)) ||
        (context.selectedObjectId && review.objectIds.includes(context.selectedObjectId)),
    ) ??
    reviews.find((review) => review.state === "in_review") ??
    reviews.find((review) => review.state === "pending") ??
    reviews[0] ??
    null
  )
}

function recipientsFor(
  context: CommandContext,
  readiness: ReadinessResponse | null,
  connectors: ComponentReadiness[],
): RecipientRoute[] {
  const connectorRecords = connectors.length > 0 ? connectors : readiness?.connectorAuthorization ?? []
  const knownExternal = new Map(
    connectorRecords.map((item) => [item.id.replace("connector:", ""), item]),
  )
  return [
    {
      id: "local-development-review",
      label: "Local development review repository",
      kind: "local-review",
      endpoint: `${API_ROOT}/reviews`,
      identity: `${readiness?.identityMode ?? "UNKNOWN"} · ROLE HINT ${context.operatorRole.toUpperCase()} · NON-AUTHORITATIVE`,
      schema: FUSARIUM_INTELLIGENCE_SCHEMA,
      readiness: readiness ? "blocked" : "unavailable",
      lastAcknowledgment: null,
      note:
        "AUTHORIZATION FAIL: server-verified identity and scoped authorization are unavailable. Query values, role metadata, and development headers cannot enable review or activity writes.",
    },
    ...[
      ["palantir", "Palantir"],
      ["lattice", "Anduril Lattice"],
      ["platform-one", "Platform One"],
      ["jadc2", "JADC2"],
    ].map<RecipientRoute>(([id, label]) => {
      const component = knownExternal.get(id)
      return {
        id: `external-${id}`,
        label,
        kind: "external-disabled",
        endpoint: "DISABLED / NOT CALLED",
        identity: component?.verified ? "VERIFIED BUT DISABLED" : "UNVERIFIED",
        schema: "UNPINNED",
        readiness: "blocked",
        lastAcknowledgment: null,
        note: component?.detail ?? "No operational connector contract is available. No transmission control exists.",
      }
    }),
  ]
}

function recommendationsFor(reviews: ReviewItem[]): ObservationRecommendation[] {
  return reviews
    .filter((review) => review.kind === "observation")
    .map((review) => ({
      id: `recommendation:${review.id}`,
      label: `Human review requested for observation record ${review.id}`,
      rationale: review.judgment ?? "The persisted review does not include a rationale.",
      objectIds: [...review.objectIds],
      evidenceIds: [...review.evidenceIds],
      state: "review_requested" as const,
      externalSideEffects: "NONE" as const,
      synthetic: false,
    }))
}

function packageFor(
  context: CommandContext,
  review: ReviewItem | null,
  objects: EnvironmentalObject[],
  evidence: EvidenceRecord[],
  recipients: RecipientRoute[],
): IntelligencePackagePreview {
  if (!review) return emptyPackage("No persisted review is available for this mission context.", context.mode)
  const linkedObjects = objects.filter((item) => review.objectIds.includes(item.id))
  const linkedEvidence = evidence.filter((item) => review.evidenceIds.includes(item.id))
  const localRoute = recipients.find((item) => item.kind === "local-review")

  return {
    id: `package:${review.id}`,
    title: `${review.kind.replace("_", " ")} review package`,
    before: [
      `Review state: ${review.state.toUpperCase()}`,
      linkedObjects.length > 0
        ? `Affected objects: ${linkedObjects.map((item) => item.name).join(" · ")}`
        : "Affected objects: UNAVAILABLE",
      linkedEvidence.length > 0
        ? `Evidence verification: ${linkedEvidence.map((item) => `${item.id} ${item.verificationState}`).join(" · ")}`
        : "Evidence: UNAVAILABLE",
      "External route: DISABLED",
    ],
    proposed: [
      "Preview one human review disposition in this browser session only",
      "Keep review and activity persistence locked until server authorization exists",
      "Keep every external route and side effect disabled",
    ],
    evidenceIds: [...review.evidenceIds],
    objectIds: [...review.objectIds],
    provenance: linkedEvidence.map((item) => item.sourceRef),
    messageReadiness: "held",
    externalRelease: "DISABLED",
    exportPreview: {
      schema: COMMAND_CONTROL_SCHEMA,
      mode: context.mode.toUpperCase(),
      missionId: context.missionId ?? "UNAVAILABLE",
      missionAreaId: context.missionAreaId,
      contextId: context.contextId ?? "UNAVAILABLE",
      reviewId: review.id,
      reviewState: review.state,
      objectIds: review.objectIds,
      evidenceIds: review.evidenceIds,
      provenance: linkedEvidence.map((item) => item.sourceRef),
      messageReadiness: "HELD",
      authorization: "FAIL_SERVER_VERIFIED_IDENTITY_AND_SCOPE_UNAVAILABLE",
      localRoute: localRoute?.readiness.toUpperCase() ?? "UNAVAILABLE",
      externalRelease: "DISABLED",
      classification: "UNCLASSIFIED",
    },
    synthetic: false,
  }
}

function withParams(path: string, params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  query.set("limit", DEFAULT_LIMIT)
  return `${API_ROOT}/${path}?${query.toString()}`
}

function baseGaps(context: CommandContext): string[] {
  return [
    "AUTHORIZATION FAIL: server-verified identity and scoped authorization are unavailable; client role hints and development headers cannot enable mutation, approval, export, release, dispatch, or device action.",
    "External Palantir, Lattice, Platform One, and JADC2 seams are disabled and are never called by this surface.",
    "The v1 contract has no external send, recipient acknowledgment, release, tasking, command, or actuation resource.",
    "Command & Control is not a server layout surface; supporting-panel layout is namespaced browser-local state.",
    "Review assignment and disposition are preview-only; review and activity writes remain locked.",
    ...(context.mode === "forecast"
      ? ["Forecast is not a v1 DataMode and no forecast package endpoint exists; current operational records are withheld in this mode."]
      : []),
    ...(context.mode === "replay"
      ? ["Replay returns append-only activity only. Current object, evidence, and review revisions are withheld to avoid mixing them with replay state."]
      : []),
  ]
}

function createUnavailableSnapshot(input: {
  context: CommandContext
  generatedAt: string
  contract: ContractRoot | null
  readiness: ReadinessResponse | null
  missionAreas: MissionArea[]
  missions: Mission[]
  contexts: MissionContextRecord[]
  connectors: ComponentReadiness[]
  truth: EndpointTruth[]
  note: string
}): CommandSnapshot {
  const recipients = recipientsFor(input.context, input.readiness, input.connectors)
  return {
    schema: COMMAND_CONTROL_SCHEMA,
    generatedAt: input.generatedAt,
    condition: deriveCommandCondition(input.truth, 0, input.context.mode),
    note: input.note,
    context: input.context,
    contract: input.contract,
    mission: input.missions.find((item) => item.id === input.context.missionId) ?? null,
    missionAreas: input.missionAreas,
    missions: input.missions,
    contexts: input.contexts,
    readiness: input.readiness,
    connectors: input.connectors,
    sources: [],
    coverage: [],
    observations: [],
    objects: [],
    evidence: [],
    reviews: [],
    watchConditions: [],
    activity: [],
    handoffs: [],
    truth: input.truth,
    policyGates: buildPolicyGates({
      context: input.context,
      review: null,
      evidence: [],
      objects: [],
      readiness: input.readiness,
    }),
    recipients,
    recommendations: [],
    packagePreview: emptyPackage(input.note, input.context.mode),
    gaps: [
      ...baseGaps(input.context),
      ...input.truth.filter((item) => item.schema !== "valid").map((item) => `${item.label}: ${item.note}`),
    ],
  }
}

export function createCommandControlProvider(fetcher: Fetcher = fetch): CommandControlProvider {
  return {
    async load(inputContext, signal) {
      if (inputContext.mode === "simulated") {
        const demoOutcome = await requestJson(fetcher, `${API_ROOT}/demo`, { signal })
        const demoTruth = truthFrom(demoOutcome, {
          label: "v1 deterministic demo endpoint",
          required: false,
          validate: isDemoEnvelope,
          count: (value) => (isDemoEnvelope(value) ? 1 : null),
          freshness: () => "simulated",
        })
        return buildSanitizedCommandSnapshot(inputContext, demoTruth)
      }

      const headers = identityHeaders(inputContext)
      const [contractOutcome, readinessOutcome, connectorsOutcome, areasOutcome, missionsOutcome, contextsOutcome] =
        await Promise.all([
          requestJson(fetcher, API_ROOT, { signal }),
          requestJson(fetcher, `${API_ROOT}/readiness`, { signal }),
          requestJson(fetcher, `${API_ROOT}/connectors`, { headers, signal }),
          requestJson(fetcher, `${API_ROOT}/mission-areas?limit=${DEFAULT_LIMIT}`, { headers, signal }),
          requestJson(fetcher, `${API_ROOT}/missions?limit=${DEFAULT_LIMIT}`, { headers, signal }),
          requestJson(fetcher, `${API_ROOT}/contexts?limit=${DEFAULT_LIMIT}`, { headers, signal }),
        ])

      const truth = [
        truthFrom(contractOutcome, { label: "v1 contract root", validate: isContractRoot }),
        truthFrom(readinessOutcome, { label: "Runtime readiness", validate: isReadiness, required: true }),
        truthFrom(connectorsOutcome, {
          label: "Connector authorization metadata",
          validate: isComponentList,
          count: listCount,
          identity: true,
          required: false,
        }),
        truthFrom(areasOutcome, {
          label: "Mission areas",
          validate: isTypedPage,
          count: pageCount,
          identity: true,
        }),
        truthFrom(missionsOutcome, {
          label: "Missions",
          validate: isTypedPage,
          count: pageCount,
          identity: true,
        }),
        truthFrom(contextsOutcome, {
          label: "Mission contexts",
          validate: isTypedPage,
          count: pageCount,
          identity: true,
        }),
      ]

      const contract = isContractRoot(contractOutcome.payload) && contractOutcome.ok
        ? contractOutcome.payload
        : null
      const readiness = isReadiness(readinessOutcome.payload) && readinessOutcome.ok
        ? readinessOutcome.payload
        : null
      const missionAreas = operationalPageItems<MissionArea>(areasOutcome)
      const missions = operationalPageItems<Mission>(missionsOutcome)
      const contexts = operationalPageItems<MissionContextRecord>(contextsOutcome)
      const selectedContext = chooseContext(inputContext, contexts)
      const context = hydrateContext(inputContext, selectedContext)
      const connectors = operationalListItems<ComponentReadiness>(connectorsOutcome)
      const generatedAt = new Date().toISOString()

      if (!contract) {
        return createUnavailableSnapshot({
          context,
          generatedAt,
          contract,
          readiness,
          missionAreas,
          missions,
          contexts,
          connectors,
          truth,
          note: "The same-origin v1 path responded, but its contract root did not validate. Environmental coordination data was not requested or inferred.",
        })
      }

      if (context.mode === "forecast") {
        return createUnavailableSnapshot({
          context,
          generatedAt,
          contract,
          readiness,
          missionAreas,
          missions,
          contexts,
          connectors,
          truth,
          note: "FORECAST is selected, but the current v1 contract has no forecast mode or package endpoint. Live state is not shown in its place.",
        })
      }

      if (!context.missionId) {
        return createUnavailableSnapshot({
          context,
          generatedAt,
          contract,
          readiness,
          missionAreas,
          missions,
          contexts,
          connectors,
          truth,
          note: "The v1 contract is available, but no mission context was supplied or returned. No environmental all-clear is inferred.",
        })
      }

      if (context.mode === "replay") {
        const replayOutcome = await requestJson(fetcher, `${API_ROOT}/replay`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            missionId: context.missionId,
            timeRange: context.timeRange,
            namespace: "operational",
            limit: Number(DEFAULT_LIMIT),
          }),
          signal,
        })
        const replayTruth = truthFrom(replayOutcome, {
          label: "Bounded activity replay",
          validate: (value) => {
            const record = asRecord(value)
            return Boolean(
              record?.schemaRef === FUSARIUM_INTELLIGENCE_SCHEMA &&
                record?.classification === "UNCLASSIFIED" &&
                Array.isArray(record?.items) &&
                asRecord(record?.page),
            )
          },
          count: (value) => {
            const record = asRecord(value)
            return Array.isArray(record?.items) ? record.items.length : null
          },
          identity: true,
          freshness: () => "unknown",
        })
        const replayRecord = replayOutcome.ok ? asRecord(replayOutcome.payload) : null
        const activity = Array.isArray(replayRecord?.items)
          ? (replayRecord.items as ActivityRecord[]).filter(
              (item) => item.namespace === "operational" && item.dataMode !== "simulated" && item.classification === "UNCLASSIFIED",
            )
          : []
        const replayTruthSet = [...truth, replayTruth]
        const recipients = recipientsFor(context, readiness, connectors)
        return {
          ...createUnavailableSnapshot({
            context,
            generatedAt,
            contract,
            readiness,
            missionAreas,
            missions,
            contexts,
            connectors,
            truth: replayTruthSet,
            note: activity.length > 0
              ? "REPLAY shows bounded append-only activity only. Current object and review revisions remain withheld."
              : "The bounded REPLAY returned no activity. No current operational record is substituted.",
          }),
          condition: deriveCommandCondition(replayTruthSet, activity.length, "replay"),
          activity,
        }
      }

      const common = {
        missionId: context.missionId,
        start: context.timeRange.start,
        end: context.timeRange.end,
      }
      const resourceRequests = [
        ["sources", withParams("sources", {}), "Source readiness", false],
        ["coverage", withParams("coverage", common), "Coverage records", false],
        ["observations", withParams("observations", common), "Observations", false],
        ["objects", withParams("objects", { missionId: context.missionId }), "Environmental objects", true],
        ["evidence", withParams("evidence", common), "Evidence", true],
        ["reviews", withParams("reviews", { missionId: context.missionId }), "Human reviews", true],
        ["watch-conditions", withParams("watch-conditions", { missionId: context.missionId }), "Watch conditions", false],
        ["activity", withParams("activity", common), "Append-only activity", true],
        [
          "handoffs",
          withParams("handoffs", {
            missionId: context.missionId,
            targetApplication: "command-control",
            start: context.timeRange.start,
            end: context.timeRange.end,
          }),
          "Context handoffs",
          false,
        ],
      ] as const

      const outcomes = await Promise.all(
        resourceRequests.map(([, endpoint]) => requestJson(fetcher, endpoint, { headers, signal })),
      )
      const byName = new Map(resourceRequests.map(([name], index) => [name, outcomes[index]]))
      const resourceTruth = resourceRequests.map(([name, , label, required], index) =>
        truthFrom(outcomes[index], {
          label,
          validate: isTypedPage,
          count: pageCount,
          freshness: pageFreshness,
          identity: true,
          required,
          provenance: `local-api://${API_ROOT.replace(/^\//, "")}/${name}`,
        }),
      )

      const sources = operationalPageItems<SourceReadiness>(byName.get("sources")!)
      const coverage = operationalPageItems<CoverageRecord>(byName.get("coverage")!)
      const observations = operationalPageItems<Observation>(byName.get("observations")!)
      const objects = operationalPageItems<EnvironmentalObject>(byName.get("objects")!)
      const evidence = operationalPageItems<EvidenceRecord>(byName.get("evidence")!)
      const reviews = operationalPageItems<ReviewItem>(byName.get("reviews")!)
      const watchConditions = operationalPageItems<WatchCondition>(byName.get("watch-conditions")!)
      const activity = operationalPageItems<ActivityRecord>(byName.get("activity")!)
      const handoffs = operationalPageItems<ContextHandoff>(byName.get("handoffs")!)
      const selectedReview = selectReview(context, reviews)
      const selectedContextView: CommandContext = selectedReview
        ? {
            ...context,
            selectedObjectId: context.selectedObjectId ?? selectedReview.objectIds[0] ?? null,
            selectedEvidenceId: context.selectedEvidenceId ?? selectedReview.evidenceIds[0] ?? null,
          }
        : context
      const recipients = recipientsFor(selectedContextView, readiness, connectors)
      const completeTruth = [...truth, ...resourceTruth]
      const recordCount = objects.length + evidence.length + reviews.length + activity.length
      const policyGates = buildPolicyGates({
        context: selectedContextView,
        review: selectedReview,
        evidence,
        objects,
        readiness,
      })

      return {
        schema: COMMAND_CONTROL_SCHEMA,
        generatedAt,
        condition: deriveCommandCondition(completeTruth, recordCount, "live"),
        note: recordCount > 0
          ? "Operational records are shown only where the same-origin v1 response validated; missing values remain unavailable."
          : "The v1 endpoints validated but supplied no coordination records. Empty is not an all-clear or a measured zero.",
        context: selectedContextView,
        contract,
        mission: missions.find((item) => item.id === selectedContextView.missionId) ?? null,
        missionAreas,
        missions,
        contexts,
        readiness,
        connectors,
        sources,
        coverage,
        observations,
        objects,
        evidence,
        reviews,
        watchConditions,
        activity,
        handoffs,
        truth: completeTruth,
        policyGates,
        recipients,
        recommendations: recommendationsFor(reviews),
        packagePreview: packageFor(selectedContextView, selectedReview, objects, evidence, recipients),
        gaps: [
          ...baseGaps(selectedContextView),
          ...completeTruth.filter((item) => item.schema !== "valid").map((item) => `${item.label}: ${item.note}`),
        ],
      }
    },

    async decideReview(context, review, mutation, signal) {
      assertReviewMutation(mutation, review)
      void context
      void signal
      throw new Error(
        "AUTHORIZATION FAIL: server-verified identity and scoped review authorization are unavailable. Client query values, role metadata, and development headers cannot authorize a mutation.",
      )
    },
  }
}

export const runtimeCommandControlProvider = createCommandControlProvider()
