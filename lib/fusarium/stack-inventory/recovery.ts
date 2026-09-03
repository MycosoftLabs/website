import type { InventoryItem, InventoryState, StackInventorySnapshot } from "./contracts"
import { STACK_ENDPOINTS } from "./provider"

export const STACK_ACTIVITY_LIMIT = 200

export type StackActivityKind =
  | "poll_started"
  | "poll_accepted"
  | "poll_rejected"
  | "state_changed"
  | "proposal_created"
  | "policy_evaluated"
  | "approval_recorded"
  | "action_started"
  | "action_acknowledged"
  | "verification_recorded"
  | "manual_instruction"

export interface StackActivityRecord {
  id: string
  at: string
  kind: StackActivityKind
  actor: "stack-inventory" | "operator" | "myca-policy-bridge"
  state: InventoryState
  summary: string
  evidenceRef: string
  correlationId: string
}

export type StackRecoveryActionId =
  | "refresh_local_readonly_status"
  | "present_manual_recovery"

export type StackRecoveryStage =
  | "proposed"
  | "awaiting_approval"
  | "policy_blocked"
  | "instructions_only"
  | "approved"
  | "executing"
  | "acknowledged"
  | "verified"
  | "not_verified"

export type StackPolicyDecision = "pending" | "allowed" | "manual_only" | "blocked"

export interface StackRecoveryBounds {
  maxRequests: number
  timeoutMs: number
  sameOriginOnly: boolean
  readOnly: boolean
  externalEffects: false
}

export interface StackRemediationProposal {
  id: string
  idempotencyKey: string
  createdAt: string
  targetId: string
  targetName: string
  request: string
  actionId: StackRecoveryActionId
  endpoint: string | null
  stage: StackRecoveryStage
  policyDecision: StackPolicyDecision
  requiresApproval: boolean
  reversible: boolean
  reason: string
  expectedEffect: string
  instructions: string[]
  bounds: StackRecoveryBounds
  approvedBy: "operator" | null
  approvedAt: string | null
  startedAt: string | null
  acknowledgedAt: string | null
  verifiedAt: string | null
  resultDetail: string | null
}

const SAFE_LOCAL_ENDPOINTS = new Set<string>(Object.values(STACK_ENDPOINTS))

const ISSUE_STATES = new Set<InventoryState>([
  "degraded",
  "unauthorized",
  "unavailable",
  "stale",
  "unknown",
])

function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function cleanRequest(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 240)
  return normalized || "Explain this dependency and propose the safest bounded recovery check."
}

function localStatusEndpoint(item: InventoryItem): string | null {
  const endpoint = item.endpointRef?.split("#", 1)[0] ?? null
  return endpoint && SAFE_LOCAL_ENDPOINTS.has(endpoint) ? endpoint : null
}

export function describeInventoryAttention(item: InventoryItem): {
  reason: string
  nextStep: string
} {
  if (item.state === "unauthorized") {
    const detail = item.signals.permission.state === "denied"
      ? item.signals.permission.detail
      : item.signals.identity.detail
    return {
      reason: detail,
      nextStep: "Confirm the owner session and the server-side authorization decision, then repeat only the same local read.",
    }
  }
  if (item.state === "stale") {
    return {
      reason: item.signals.freshness.detail,
      nextStep: "Recheck the declared local status contract. If the source timestamp remains stale, escalate to the source owner without rewriting the evidence time.",
    }
  }
  if (item.state === "unavailable") {
    const endpointUnavailable = ["unreachable", "not_probed", "unknown"].includes(item.signals.endpoint.state)
    const reason = endpointUnavailable
      ? item.signals.endpoint.detail
      : item.signals.exchange.state === "no_exchange"
        ? item.signals.exchange.detail
        : item.signals.data.detail
    return {
      reason,
      nextStep: localStatusEndpoint(item)
        ? "Repeat the allowlisted same-origin read. A successful recheck does not imply that the dependency recovered."
        : "Review the named evidence and owning service. Any restart, connector call, credential use, or infrastructure change requires its separate approved workflow.",
    }
  }
  if (item.state === "degraded") {
    const degradedSignal = Object.values(item.signals).find((signal) =>
      ["unreachable", "incompatible", "denied", "stale", "unavailable", "unknown"].includes(signal.state),
    )
    return {
      reason: degradedSignal?.detail ?? item.summary,
      nextStep: localStatusEndpoint(item)
        ? "Repeat the allowlisted local status read and compare the accepted evidence."
        : "Inspect the owning source and follow its human recovery procedure; Stack Inventory will not mutate it.",
    }
  }
  if (item.state === "unknown") {
    return {
      reason: item.summary,
      nextStep: "Collect a source-specific, timestamped observation through an approved read contract; do not infer readiness from configuration.",
    }
  }
  return {
    reason: `${item.name} currently reports ${item.state}.`,
    nextStep: "Continue bounded monitoring. No corrective action is justified by the accepted evidence.",
  }
}

function manualInstructions(item: InventoryItem): string[] {
  const attention = describeInventoryAttention(item)
  return [
    attention.nextStep,
    "Preserve the current evidence and record the owning service, observed time, and exact unavailable reason.",
    "Use a separately approved operator workflow for restart, rebind, deploy, credentials, external systems, cloud, VMs, storage, or devices.",
  ]
}

export function createStackRemediationProposal(
  item: InventoryItem,
  request: string,
  now = new Date(),
): StackRemediationProposal {
  const endpoint = localStatusEndpoint(item)
  const actionId: StackRecoveryActionId = endpoint
    ? "refresh_local_readonly_status"
    : "present_manual_recovery"
  const reason = describeInventoryAttention(item).reason
  const materialState = [
    item.id,
    item.state,
    ...Object.values(item.signals).map((entry) => entry.state),
  ].join("|")
  const idempotencyKey = `stack:${actionId}:${stableHash(materialState)}`

  return {
    id: `proposal:${stableHash(`${idempotencyKey}|${cleanRequest(request)}`)}`,
    idempotencyKey,
    createdAt: now.toISOString(),
    targetId: item.id,
    targetName: item.name,
    request: cleanRequest(request),
    actionId,
    endpoint,
    stage: "proposed",
    policyDecision: "pending",
    requiresApproval: actionId === "refresh_local_readonly_status",
    reversible: true,
    reason,
    expectedEffect: endpoint
      ? "Repeat the existing four same-origin GET-only status reads and accept a new snapshot if every response passes its normal validation boundary."
      : "Present source-specific human recovery instructions without contacting or changing the dependency.",
    instructions: manualInstructions(item),
    bounds: {
      maxRequests: endpoint ? Object.values(STACK_ENDPOINTS).length : 0,
      timeoutMs: endpoint ? 10_000 : 0,
      sameOriginOnly: true,
      readOnly: true,
      externalEffects: false,
    },
    approvedBy: null,
    approvedAt: null,
    startedAt: null,
    acknowledgedAt: null,
    verifiedAt: null,
    resultDetail: null,
  }
}

export function evaluateStackRemediationPolicy(
  proposal: StackRemediationProposal,
): StackRemediationProposal {
  if (proposal.actionId === "present_manual_recovery") {
    return {
      ...proposal,
      stage: "instructions_only",
      policyDecision: "manual_only",
      resultDetail: "Automation is unavailable for this dependency; no action was executed.",
    }
  }

  const allowed =
    proposal.actionId === "refresh_local_readonly_status" &&
    proposal.endpoint !== null &&
    SAFE_LOCAL_ENDPOINTS.has(proposal.endpoint) &&
    proposal.bounds.maxRequests === Object.values(STACK_ENDPOINTS).length &&
    proposal.bounds.timeoutMs <= 10_000 &&
    proposal.bounds.sameOriginOnly &&
    proposal.bounds.readOnly &&
    proposal.bounds.externalEffects === false &&
    proposal.reversible &&
    proposal.requiresApproval

  return allowed
    ? { ...proposal, stage: "awaiting_approval", policyDecision: "allowed" }
    : {
        ...proposal,
        stage: "policy_blocked",
        policyDecision: "blocked",
        resultDetail: "The request is outside the fixed local read-only recovery allowlist.",
      }
}

export function approveStackRemediation(
  proposal: StackRemediationProposal,
  now = new Date(),
): StackRemediationProposal {
  if (proposal.stage !== "awaiting_approval" || proposal.policyDecision !== "allowed") {
    throw new Error("Only a policy-allowed proposal awaiting approval can be approved.")
  }
  return {
    ...proposal,
    stage: "approved",
    approvedBy: "operator",
    approvedAt: now.toISOString(),
  }
}

export function beginStackRemediation(
  proposal: StackRemediationProposal,
  executedIdempotencyKeys: ReadonlySet<string>,
  now = new Date(),
): StackRemediationProposal {
  if (proposal.stage !== "approved" || proposal.approvedBy !== "operator") {
    throw new Error("The local recheck requires an approved proposal.")
  }
  if (executedIdempotencyKeys.has(proposal.idempotencyKey)) {
    return {
      ...proposal,
      stage: "verified",
      verifiedAt: now.toISOString(),
      resultDetail: "This exact dependency-state recheck already completed in the current browser session; it was not repeated.",
    }
  }
  return { ...proposal, stage: "executing", startedAt: now.toISOString() }
}

export function acknowledgeStackRemediation(
  proposal: StackRemediationProposal,
  now = new Date(),
): StackRemediationProposal {
  if (proposal.stage !== "executing") return proposal
  return {
    ...proposal,
    stage: "acknowledged",
    acknowledgedAt: now.toISOString(),
    resultDetail: "The browser accepted a new validated local inventory snapshot.",
  }
}

export function verifyStackRemediation(
  proposal: StackRemediationProposal,
  snapshot: StackInventorySnapshot,
  now = new Date(),
): StackRemediationProposal {
  if (proposal.stage !== "acknowledged") return proposal
  const target = snapshot.inventory.find((item) => item.id === proposal.targetId)
  if (!target) {
    return {
      ...proposal,
      stage: "not_verified",
      verifiedAt: now.toISOString(),
      resultDetail: "The recheck completed, but the target is absent from the accepted inventory; recovery is not verified.",
    }
  }
  return {
    ...proposal,
    stage: "verified",
    verifiedAt: now.toISOString(),
    resultDetail: ISSUE_STATES.has(target.state)
      ? `The read-only recheck is verified; ${target.name} still reports ${target.state}. No repair is claimed.`
      : `The read-only recheck is verified; ${target.name} now reports ${target.state}. This verifies the observation, not an automated repair.`,
  }
}

export function rejectStackRemediationVerification(
  proposal: StackRemediationProposal,
  detail: string,
  now = new Date(),
): StackRemediationProposal {
  if (proposal.stage !== "executing") return proposal
  return {
    ...proposal,
    stage: "not_verified",
    verifiedAt: now.toISOString(),
    resultDetail: detail,
  }
}

export function appendStackActivityRecords(
  current: readonly StackActivityRecord[],
  additions: readonly StackActivityRecord[],
  limit = STACK_ACTIVITY_LIMIT,
): StackActivityRecord[] {
  if (limit < 1) return []
  const seen = new Set(current.map((entry) => entry.id))
  const next = [...current]
  for (const entry of additions) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    next.push({ ...entry })
  }
  return next.slice(-limit)
}

export function stackActivityRecord(
  input: Omit<StackActivityRecord, "id"> & { id?: string },
): StackActivityRecord {
  return {
    ...input,
    id: input.id ?? `activity:${stableHash(`${input.correlationId}|${input.kind}|${input.at}|${input.evidenceRef}`)}`,
  }
}
