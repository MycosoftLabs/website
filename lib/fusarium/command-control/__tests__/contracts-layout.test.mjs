import assert from "node:assert/strict"
import test from "node:test"

import {
  assertReviewMutation,
  buildDecisionDisclosure,
  buildPolicyGates,
  deriveCommandCondition,
} from "../contracts.ts"
import {
  COMMAND_LAYOUT_VERSION,
  DEFAULT_COMMAND_WIDGET_LAYOUT,
  moveCommandWidget,
  normalizeCommandLayout,
  parseCommandLayout,
  reorderCommandWidgets,
  serializeCommandLayout,
  setCommandWidgetSize,
} from "../layout.ts"

const context = {
  missionId: "mission.alpha",
  contextId: "context.alpha",
  missionAreaId: "area.alpha",
  missionAreaLabel: "Area Alpha",
  timeWindow: "24h",
  timeRange: { start: "2026-09-01T00:00:00Z", end: "2026-09-02T00:00:00Z" },
  mode: "live",
  selectedObjectId: "object.alpha",
  selectedEvidenceId: "evidence.alpha",
  selectedSourceId: "source.alpha",
  selectedDeviceId: "psathyrella",
  operatorId: "local.operator",
  operatorRole: "analyst",
  classification: "UNCLASSIFIED",
}

const truth = (overrides = {}) => ({
  id: "contract-root",
  label: "contract",
  endpoint: "/api/fusarium/v1",
  required: true,
  transport: "reachable",
  httpStatus: 200,
  identity: "not_required",
  schema: "valid",
  freshness: "fresh",
  provenance: "local-api://api/fusarium/v1",
  coverage: "covered",
  dataPresence: "present",
  recordCount: 1,
  receivedAt: "2026-09-01T12:00:00Z",
  note: "test",
  ...overrides,
})

const review = {
  id: "review.alpha",
  namespace: "operational",
  missionId: "mission.alpha",
  kind: "evidence",
  state: "in_review",
  objectIds: ["object.alpha"],
  evidenceIds: ["evidence.alpha"],
  requestedBy: "operator.one",
  assignedTo: "analyst.one",
  judgment: null,
  dataMode: "live",
  synthetic: false,
  revision: 3,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-01T11:00:00Z",
  classification: "UNCLASSIFIED",
}

test("contract reachability never masks an unavailable schema", () => {
  const notBound = truth({ httpStatus: 503, schema: "invalid", dataPresence: "unknown", recordCount: null })
  assert.equal(deriveCommandCondition([notBound], 0, "live"), "unavailable")
  assert.equal(notBound.transport, "reachable")
  assert.equal(notBound.httpStatus, 503)
})

test("empty, stale, forecast, and simulated remain distinct", () => {
  assert.equal(deriveCommandCondition([truth({ dataPresence: "empty", recordCount: 0 })], 0, "live"), "empty")
  assert.equal(deriveCommandCondition([truth({ freshness: "stale" })], 1, "live"), "stale")
  assert.equal(deriveCommandCondition([truth()], 1, "forecast"), "unavailable")
  assert.equal(deriveCommandCondition([truth()], 1, "simulated"), "simulated")
})

test("every review decision discloses change, objects, evidence, policy, side effects, and human approval", () => {
  const disclosure = buildDecisionDisclosure(review, "accepted", "Human evidence review complete.")
  assert.match(disclosure.proposedChange, /in_review to accepted/)
  assert.deepEqual(disclosure.affectedObjectIds, ["object.alpha"])
  assert.deepEqual(disclosure.evidenceIds, ["evidence.alpha"])
  assert.equal(disclosure.policyResult.result, "hold")
  assert.match(disclosure.policyResult.reason, /server-verified identity and scoped review authorization are unavailable/i)
  assert.match(disclosure.externalSideEffects, /NO MUTATION, EXPORT, RELEASE/)
  assert.match(disclosure.requiredHumanApproval, /cannot substitute/i)
})

test("review mutation candidates are revision-bound but validation never grants authorization", () => {
  const mutation = {
    reviewId: review.id,
    expectedRevision: review.revision,
    missionId: review.missionId,
    missionContextId: "context.alpha",
    objectIds: review.objectIds,
    evidenceIds: review.evidenceIds,
    previousState: review.state,
    decision: "deferred",
    judgment: "Insufficient verification; defer for human follow-up.",
  }
  assert.doesNotThrow(() => assertReviewMutation(mutation, review))
  assert.throws(() => assertReviewMutation({ ...mutation, expectedRevision: 2 }, review), /changed since/)
  assert.throws(() => assertReviewMutation({ ...mutation, judgment: "" }, review), /judgment is required/)
  assert.throws(
    () => assertReviewMutation(mutation, { ...review, namespace: "demo", dataMode: "simulated", synthetic: true }),
    /read-only/,
  )
})

test("policy gates always hold external release and do not pass missing evidence", () => {
  const gates = buildPolicyGates({ context, review, evidence: [], objects: [], readiness: null })
  const inconsistentDevelopmentIdentity = buildPolicyGates({
    context,
    review,
    evidence: [],
    objects: [],
    readiness: {
      identity: { verified: true },
      developmentIdentity: true,
      identityMode: "development_header_unverified",
    },
  })
  assert.equal(gates.find((item) => item.id === "evidence")?.result, "hold")
  assert.equal(gates.find((item) => item.id === "objects")?.result, "hold")
  assert.equal(gates.find((item) => item.id === "authorization")?.result, "hold")
  assert.equal(gates.find((item) => item.id === "external-release")?.result, "hold")
  assert.equal(inconsistentDevelopmentIdentity.find((item) => item.id === "identity")?.result, "hold")
})

test("browser-local layout is versioned, complete, and keyboard reorderable", () => {
  const candidate = {
    version: COMMAND_LAYOUT_VERSION,
    items: [
      { id: "decision-timeline", size: "tall" },
      { id: "decision-timeline", size: "wide" },
      { id: "unknown", size: "wide" },
      { id: "route-validation", size: "invalid" },
    ],
  }
  const normalized = normalizeCommandLayout(candidate)
  assert.equal(normalized.length, DEFAULT_COMMAND_WIDGET_LAYOUT.length)
  assert.deepEqual(normalized[0], { id: "decision-timeline", size: "tall" })
  assert.equal(new Set(normalized.map((item) => item.id)).size, normalized.length)
  assert.deepEqual(parseCommandLayout(serializeCommandLayout(normalized)), normalized)
  assert.deepEqual(parseCommandLayout(JSON.stringify({ version: 999, items: [] })), DEFAULT_COMMAND_WIDGET_LAYOUT)

  const moved = moveCommandWidget(normalized, "route-validation", -1)
  const sized = setCommandWidgetSize(moved, "route-validation", "compact")
  const ordered = reorderCommandWidgets(sized, [...sized].reverse().map((item) => item.id))
  assert.equal(ordered[0].id, sized.at(-1).id)
  assert.equal(ordered.find((item) => item.id === "route-validation")?.size, "compact")
})
