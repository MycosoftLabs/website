"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import {
  buildStackHandoffLink,
  filterInventory,
  nextInventorySelection,
  semanticSnapshotKey,
  snapshotChanges,
  type InventoryItem,
  type InventorySignals,
  type InventoryState,
  type StackCategory,
  type StackInventoryFilters,
  type StackInventorySnapshot,
} from "@/lib/fusarium/stack-inventory/contracts"
import {
  createLoadingSnapshot,
  createRuntimeStackInventoryProvider,
} from "@/lib/fusarium/stack-inventory/provider"
import {
  acknowledgeStackRemediation,
  appendStackActivityRecords,
  approveStackRemediation,
  beginStackRemediation,
  createStackRemediationProposal,
  describeInventoryAttention,
  evaluateStackRemediationPolicy,
  rejectStackRemediationVerification,
  stackActivityRecord,
  verifyStackRemediation,
  type StackActivityRecord,
  type StackRemediationProposal,
} from "@/lib/fusarium/stack-inventory/recovery"
import styles from "./stack-inventory.module.css"
import { AlphaObservabilityPanel } from "./alpha-observability-panel"

const DEFAULT_POLL_DELAY_MS = 10_000
const REQUEST_TIMEOUT_MS = 10_000
const runtimeProvider = createRuntimeStackInventoryProvider()

const CADENCE_OPTIONS = [
  { value: 10_000, label: "10 seconds" },
  { value: 30_000, label: "30 seconds" },
  { value: 60_000, label: "60 seconds" },
  { value: 0, label: "Paused" },
] as const

const CATEGORY_OPTIONS: Array<{ value: "all" | StackCategory; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "sensor", label: "Sensors" },
  { value: "source", label: "Sources" },
  { value: "service", label: "Services" },
  { value: "schema", label: "Schemas" },
  { value: "model", label: "Models" },
  { value: "node", label: "Nodes" },
  { value: "adapter", label: "Adapters" },
]

const STATE_OPTIONS: Array<{ value: "all" | InventoryState; label: string }> = [
  { value: "all", label: "All states" },
  ...(["live", "verified", "configured", "empty", "unknown", "stale", "degraded", "unauthorized", "unavailable", "simulated"] as InventoryState[])
    .map((state) => ({ value: state, label: stateLabel(state) })),
]

const SIGNAL_LABELS: Array<[keyof InventorySignals, string]> = [
  ["endpoint", "Endpoint reachability"],
  ["identity", "Identity"],
  ["schema", "Schema compatibility"],
  ["permission", "Permission"],
  ["exchange", "Exchange acknowledgement"],
  ["freshness", "Data freshness"],
  ["data", "Data presence"],
]

function stateLabel(state: string): string {
  return state.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function conditionSummary(condition: StackInventorySnapshot["condition"]): string {
  switch (condition) {
    case "loading": return "Connecting to local readiness contracts"
    case "live": return "Required components report live or verified"
    case "degraded": return "A required dependency needs attention"
    case "unauthorized": return "A required local request was denied"
    case "unavailable": return "A required service is unavailable"
    case "stale": return "Required evidence is outside the freshness window"
    case "empty": return "Validated sources reported no records"
    case "simulated": return "Only explicit simulated data is in view"
    default: return "Required posture is not yet established"
  }
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Not reported"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Invalid timestamp"
  return parsed.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatBoolean(value: boolean | null): string {
  return value === null ? "Not reported" : value ? "Yes" : "No"
}

function formatNumber(value: number | null): string {
  return value === null ? "Not reported" : value.toLocaleString()
}

function StateBadge({ state }: { state: InventoryState | StackInventorySnapshot["condition"] }) {
  return <span className={styles.stateBadge} data-state={state}>{stateLabel(state)}</span>
}

function eventKey(event: StackActivityRecord): string {
  return event.id
}

function InventoryRow({
  item,
  selected,
  onSelect,
  onKeyDown,
  buttonRef,
}: {
  item: InventoryItem
  selected: boolean
  onSelect: () => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  buttonRef: (node: HTMLButtonElement | null) => void
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.inventoryRow}
      data-state={item.state}
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <span className={styles.rowLead}>
        <span className={styles.rowCategory}>{item.category}</span>
        <strong>{item.name}</strong>
        <small>{item.id}</small>
      </span>
      <span className={styles.rowSummary}>{item.summary}</span>
      <span className={styles.rowSignals} aria-label={`${item.name} summary`}>
        <span data-signal={item.signals.endpoint.state}>Endpoint · {item.signals.endpoint.label}</span>
        <span data-signal={item.signals.schema.state}>Schema · {item.signals.schema.label}</span>
        <span data-signal={item.signals.data.state}>Data · {item.signals.data.label}</span>
      </span>
      <StateBadge state={item.state} />
    </button>
  )
}

function TopologyStrip({
  snapshot,
  selected,
  onSelect,
}: {
  snapshot: StackInventorySnapshot
  selected: InventoryItem | null
  onSelect: (id: string) => void
}) {
  const inventoryIds = useMemo(() => new Set(snapshot.inventory.map((item) => item.id)), [snapshot.inventory])
  const edges = selected
    ? snapshot.topology.filter((edge) => edge.from === selected.id || edge.to === selected.id)
    : snapshot.topology.slice(0, 6)
  const visible = edges.length > 0 ? edges : snapshot.topology.slice(0, 6)
  return (
    <section className={styles.topology} aria-labelledby="stack-topology-title">
      <header>
        <span id="stack-topology-title">Topology &amp; impact</span>
        <small>{selected ? `Direct path for ${selected.name}` : "Core local dependency path"}</small>
      </header>
      <div className={styles.topologyRail}>
        {visible.map((edge) => (
          <span className={styles.topologyEdge} key={`${edge.from}:${edge.to}:${edge.relation}`}>
            {inventoryIds.has(edge.from) ? (
              <button type="button" onClick={() => onSelect(edge.from)}>{edge.from}</button>
            ) : <b>{edge.from}</b>}
            <i>→ {edge.relation} →</i>
            {inventoryIds.has(edge.to) ? (
              <button type="button" onClick={() => onSelect(edge.to)}>{edge.to}</button>
            ) : <b>{edge.to}</b>}
          </span>
        ))}
      </div>
    </section>
  )
}

function RecoveryWorkspace({
  item,
  request,
  proposal,
  refreshing,
  onRequestChange,
  onCreateProposal,
  onApprove,
  onExecute,
}: {
  item: InventoryItem
  request: string
  proposal: StackRemediationProposal | null
  refreshing: boolean
  onRequestChange: (value: string) => void
  onCreateProposal: () => void
  onApprove: () => void
  onExecute: () => void
}) {
  const attention = describeInventoryAttention(item)
  const activeForItem = proposal?.targetId === item.id ? proposal : null
  return (
    <section
      className={styles.recoverySection}
      aria-labelledby="stack-recovery-title"
      data-recovery-stage={activeForItem?.stage ?? "idle"}
    >
      <div className={styles.recoveryHead}>
        <div>
          <span>MYCA policy bridge · local source contract</span>
          <h3 id="stack-recovery-title">Bounded recovery</h3>
        </div>
        <small>No live model call · no automatic service mutation</small>
      </div>
      <div className={styles.attentionCard}>
        <strong>Why this state</strong>
        <p>{attention.reason}</p>
        <strong>Safest next step</strong>
        <p>{attention.nextStep}</p>
      </div>
      <label className={styles.recoveryRequest}>
        <span>Operator request to MYCA</span>
        <textarea
          value={request}
          maxLength={240}
          rows={3}
          placeholder="Explain this dependency and propose the safest bounded recovery check."
          onChange={(event) => onRequestChange(event.target.value)}
        />
      </label>
      <button className={styles.proposalButton} type="button" onClick={onCreateProposal}>
        Build typed proposal
      </button>

      {activeForItem ? (
        <article className={styles.proposalCard} data-policy-decision={activeForItem.policyDecision}>
          <header>
            <div>
              <span>Proposal lifecycle</span>
              <strong>{stateLabel(activeForItem.stage)}</strong>
            </div>
            <code>{activeForItem.actionId}</code>
          </header>
          <p>{activeForItem.expectedEffect}</p>
          <dl>
            <div><dt>Policy</dt><dd>{stateLabel(activeForItem.policyDecision)}</dd></div>
            <div><dt>Approval</dt><dd>{activeForItem.requiresApproval ? activeForItem.approvedBy ?? "Required" : "Not required"}</dd></div>
            <div><dt>Maximum reads</dt><dd>{activeForItem.bounds.maxRequests}</dd></div>
            <div><dt>External effects</dt><dd>None</dd></div>
            <div><dt>Same-origin</dt><dd>{activeForItem.bounds.sameOriginOnly ? "Required" : "No"}</dd></div>
            <div><dt>Idempotency</dt><dd>{activeForItem.idempotencyKey}</dd></div>
          </dl>
          {activeForItem.instructions.length > 0 ? (
            <ol>{activeForItem.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
          ) : null}
          {activeForItem.resultDetail ? <p className={styles.recoveryResult}>{activeForItem.resultDetail}</p> : null}
          <div className={styles.recoveryActions}>
            {activeForItem.stage === "awaiting_approval" ? (
              <button type="button" onClick={onApprove}>Approve local recheck</button>
            ) : null}
            {activeForItem.stage === "approved" ? (
              <button type="button" disabled={refreshing} onClick={onExecute}>Run approved recheck</button>
            ) : null}
            {activeForItem.stage === "executing" ? <span>Awaiting accepted local snapshot…</span> : null}
          </div>
        </article>
      ) : null}
      <p className={styles.recoveryBoundary}>
        Fixed allowlist only: the four existing same-origin GET status contracts. Shell, restart, rebind,
        deploy, credentials, external systems, cloud, VM, storage, device, and silent self-modification
        actions are structurally unavailable.
      </p>
    </section>
  )
}

function Inspector({
  item,
  snapshot,
  handoffParams,
  recoveryRequest,
  recoveryProposal,
  refreshing,
  onRecoveryRequestChange,
  onCreateRecoveryProposal,
  onApproveRecovery,
  onExecuteRecovery,
}: {
  item: InventoryItem | null
  snapshot: StackInventorySnapshot
  handoffParams: URLSearchParams
  recoveryRequest: string
  recoveryProposal: StackRemediationProposal | null
  refreshing: boolean
  onRecoveryRequestChange: (value: string) => void
  onCreateRecoveryProposal: () => void
  onApproveRecovery: () => void
  onExecuteRecovery: () => void
}) {
  if (!item) {
    return (
      <aside className={styles.inspector} aria-label="Dependency inspector">
        <div className={styles.inspectorEmpty}>
          <strong>No dependency selected</strong>
          <span>Select a row to inspect evidence, readiness axes, and downstream impact.</span>
        </div>
      </aside>
    )
  }

  return (
    <aside className={styles.inspector} aria-labelledby="stack-inspector-title">
      <header className={styles.inspectorHead}>
        <span>{item.category} · dependency inspector</span>
        <h2 id="stack-inspector-title">{item.name}</h2>
        <p>{item.summary}</p>
        <StateBadge state={item.state} />
      </header>

      <section className={styles.signalSection} aria-labelledby="signal-section-title">
        <h3 id="signal-section-title">Independent readiness axes</h3>
        <div className={styles.signalGrid}>
          {SIGNAL_LABELS.map(([key, label]) => {
            const observation = item.signals[key]
            return (
              <article key={key} data-signal={observation.state}>
                <span>{label}</span>
                <strong>{observation.label}</strong>
                <p>{observation.detail}</p>
                {observation.observedAt ? <small>As of {formatTimestamp(observation.observedAt)}</small> : null}
              </article>
            )
          })}
        </div>
      </section>

      <section className={styles.detailSection} aria-labelledby="detail-section-title">
        <h3 id="detail-section-title">Lifecycle &amp; telemetry</h3>
        <dl className={styles.detailGrid}>
          <div><dt>Required</dt><dd>{item.required ? "Yes" : "No"}</dd></div>
          <div><dt>Configured</dt><dd>{formatBoolean(item.configured)}</dd></div>
          <div><dt>Verified live</dt><dd>{formatBoolean(item.verified)}</dd></div>
          <div><dt>Lifecycle</dt><dd>{item.lifecycle}</dd></div>
          <div><dt>Version</dt><dd>{item.version ?? "Not reported"}</dd></div>
          <div><dt>API maturity</dt><dd>{item.apiMaturity}</dd></div>
          <div><dt>Heartbeat / check</dt><dd>{formatTimestamp(item.lastHeartbeatAt)}</dd></div>
          <div><dt>Last component exchange</dt><dd>{formatTimestamp(item.lastExchangeAt)}</dd></div>
          <div><dt>Queue depth</dt><dd>{formatNumber(item.queueDepth)}</dd></div>
          <div><dt>Backlog</dt><dd>{formatNumber(item.backlogCount)}</dd></div>
          <div><dt>Records</dt><dd>{formatNumber(item.recordCount)}</dd></div>
          <div><dt>Credential expiry</dt><dd>{stateLabel(item.credentialExpiry)}</dd></div>
        </dl>
        <dl className={styles.longFacts}>
          <div><dt>Authorization scope</dt><dd>{item.authorizationScope}</dd></div>
          <div><dt>Simulation boundary</dt><dd>{item.simulatedBoundary}</dd></div>
          <div><dt>Endpoint</dt><dd>{item.endpointRef ?? "Not reported"}</dd></div>
          <div><dt>Secret references</dt><dd>{item.secretRefs.length > 0 ? item.secretRefs.join(", ") : "Not applicable"}</dd></div>
        </dl>
      </section>

      <section className={styles.detailSection} aria-labelledby="impact-section-title">
        <h3 id="impact-section-title">Dependency impact</h3>
        <div className={styles.impactColumns}>
          <div><span>Depends on</span><ul>{item.dependencies.length > 0 ? item.dependencies.map((value) => <li key={value}>{value}</li>) : <li>None declared</li>}</ul></div>
          <div><span>Downstream</span><ul>{item.downstream.length > 0 ? item.downstream.map((value) => <li key={value}>{value}</li>) : <li>None declared</li>}</ul></div>
        </div>
      </section>

      <section className={styles.detailSection} aria-labelledby="evidence-section-title">
        <h3 id="evidence-section-title">Evidence</h3>
        <ul className={styles.evidenceList}>
          {item.evidence.map((entry) => (
            <li key={`${entry.label}:${entry.ref}`}>
              {entry.href ? <a href={entry.href} target="_blank" rel="noreferrer">{entry.label}</a> : <strong>{entry.label}</strong>}
              <code>{entry.ref}</code>
            </li>
          ))}
        </ul>
      </section>

      {snapshot.honestGaps.length > 0 ? (
        <section className={styles.detailSection} aria-labelledby="gaps-section-title">
          <h3 id="gaps-section-title">Runtime-declared gaps</h3>
          <ul className={styles.gapList}>{snapshot.honestGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
        </section>
      ) : null}

      <RecoveryWorkspace
        item={item}
        request={recoveryRequest}
        proposal={recoveryProposal}
        refreshing={refreshing}
        onRequestChange={onRecoveryRequestChange}
        onCreateProposal={onCreateRecoveryProposal}
        onApprove={onApproveRecovery}
        onExecute={onExecuteRecovery}
      />

      <section className={styles.handoffSection} aria-labelledby="handoff-section-title">
        <h3 id="handoff-section-title">Context-preserving handoff</h3>
        <div>
          <Link href={buildStackHandoffLink("overview", handoffParams, item.id)}>Overview</Link>
          <Link href={buildStackHandoffLink("situational-awareness", handoffParams, item.id)}>Situational Awareness</Link>
          <Link href={buildStackHandoffLink("data-fusion", handoffParams, item.id)}>Data Fusion</Link>
        </div>
        <p>Context only · no external send, connector call, or autonomous action.</p>
      </section>
    </aside>
  )
}

export function StackInventoryPage() {
  const searchParams = useSearchParams()
  const serializedParams = searchParams.toString()
  const initialSelection = searchParams.get("sourceId")
  const [snapshot, setSnapshot] = useState<StackInventorySnapshot>(() => createLoadingSnapshot())
  const snapshotRef = useRef(snapshot)
  const [activityLog, setActivityLog] = useState<StackActivityRecord[]>([])
  const [lastPollAt, setLastPollAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(true)
  const [pollNote, setPollNote] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [pollDelayMs, setPollDelayMs] = useState(DEFAULT_POLL_DELAY_MS)
  const [filters, setFilters] = useState<StackInventoryFilters>({ query: "", category: "all", state: "all" })
  const [selectedId, setSelectedId] = useState<string | null>(initialSelection ?? "service:intelligence-v1")
  const [recoveryRequest, setRecoveryRequest] = useState("")
  const [recoveryProposal, setRecoveryProposal] = useState<StackRemediationProposal | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())
  const pollSequenceRef = useRef(0)
  const recoveryProposalRef = useRef<StackRemediationProposal | null>(null)
  const executedIdempotencyKeysRef = useRef(new Set<string>())

  const recordActivity = useCallback((records: StackActivityRecord[]) => {
    setActivityLog((current) => appendStackActivityRecords(current, records))
  }, [])

  const updateRecoveryProposal = useCallback((proposal: StackRemediationProposal | null) => {
    recoveryProposalRef.current = proposal
    setRecoveryProposal(proposal)
  }, [])

  useEffect(() => {
    let active = true
    let pollTimer: number | null = null
    let requestTimer: number | null = null
    let controller: AbortController | null = null

    const poll = async () => {
      pollSequenceRef.current += 1
      const startedAt = new Date().toISOString()
      const correlationId = `poll:${pollSequenceRef.current}:${startedAt}`
      recordActivity([
        stackActivityRecord({
          at: startedAt,
          kind: "poll_started",
          actor: "stack-inventory",
          state: snapshotRef.current.condition,
          summary: "Started the fixed four-contract same-origin status poll.",
          evidenceRef: "browser-session",
          correlationId,
        }),
      ])
      controller = new AbortController()
      let timedOut = false
      setRefreshing(true)
      requestTimer = window.setTimeout(() => {
        timedOut = true
        controller?.abort()
      }, REQUEST_TIMEOUT_MS)
      try {
        const next = await runtimeProvider.load(controller.signal)
        if (!active) return
        const previous = snapshotRef.current
        const changed = semanticSnapshotKey(previous) !== semanticSnapshotKey(next)
        if (changed) {
          snapshotRef.current = next
          setSnapshot(next)
          const changeEvents: StackActivityRecord[] = previous.condition === "loading"
            ? []
            : snapshotChanges(previous, next).map((change, index) => stackActivityRecord({
                id: `change:${correlationId}:${change.itemId}:${index}`,
                at: next.generatedAt,
                kind: "state_changed",
                actor: "stack-inventory",
                state: change.state,
                summary: change.summary,
                evidenceRef: change.itemId,
                correlationId,
              }))
          recordActivity(changeEvents)
        }
        const pollEvents = next.pollEvents.map((event, index) => stackActivityRecord({
          id: `poll-result:${correlationId}:${index}`,
          at: event.at,
          kind: "poll_accepted",
          actor: "stack-inventory",
          state: event.state,
          summary: event.summary,
          evidenceRef: event.evidenceRef,
          correlationId,
        }))
        recordActivity(pollEvents)

        const executing = recoveryProposalRef.current
        if (executing?.stage === "executing") {
          const acknowledged = acknowledgeStackRemediation(executing, new Date(next.generatedAt))
          const verified = verifyStackRemediation(acknowledged, next, new Date(next.generatedAt))
          executedIdempotencyKeysRef.current.add(verified.idempotencyKey)
          updateRecoveryProposal(verified)
          recordActivity([
            stackActivityRecord({
              at: next.generatedAt,
              kind: "action_acknowledged",
              actor: "stack-inventory",
              state: next.inventory.find((item) => item.id === verified.targetId)?.state ?? "unknown",
              summary: "The approved local read was acknowledged by an accepted inventory snapshot.",
              evidenceRef: verified.targetId,
              correlationId: verified.id,
            }),
            stackActivityRecord({
              at: next.generatedAt,
              kind: "verification_recorded",
              actor: "myca-policy-bridge",
              state: next.inventory.find((item) => item.id === verified.targetId)?.state ?? "unknown",
              summary: verified.resultDetail ?? "The local recheck reached verification.",
              evidenceRef: verified.targetId,
              correlationId: verified.id,
            }),
          ])
        }
        setLastPollAt(next.generatedAt)
        setPollNote(timedOut ? "The local poll timed out; affected endpoints are marked unavailable." : null)
      } catch {
        if (active) {
          const failedAt = new Date().toISOString()
          const detail = "The local inventory provider failed before a snapshot could be accepted; the prior snapshot remains in view."
          setPollNote(detail)
          recordActivity([
            stackActivityRecord({
              at: failedAt,
              kind: "poll_rejected",
              actor: "stack-inventory",
              state: "unavailable",
              summary: detail,
              evidenceRef: "browser-session",
              correlationId,
            }),
          ])
          const executing = recoveryProposalRef.current
          if (executing?.stage === "executing") {
            const rejected = rejectStackRemediationVerification(executing, detail, new Date(failedAt))
            updateRecoveryProposal(rejected)
            recordActivity([
              stackActivityRecord({
                at: failedAt,
                kind: "verification_recorded",
                actor: "myca-policy-bridge",
                state: "unavailable",
                summary: detail,
                evidenceRef: rejected.targetId,
                correlationId: rejected.id,
              }),
            ])
          }
        }
      } finally {
        if (requestTimer !== null) window.clearTimeout(requestTimer)
        requestTimer = null
        controller = null
        if (active) {
          setRefreshing(false)
          if (pollDelayMs > 0) pollTimer = window.setTimeout(() => void poll(), pollDelayMs)
        }
      }
    }

    void poll()
    return () => {
      active = false
      if (pollTimer !== null) window.clearTimeout(pollTimer)
      if (requestTimer !== null) window.clearTimeout(requestTimer)
      controller?.abort()
    }
  }, [pollDelayMs, recordActivity, refreshToken, updateRecoveryProposal])

  const filteredInventory = useMemo(() => filterInventory(snapshot.inventory, filters), [filters, snapshot.inventory])
  const selectedItem = snapshot.inventory.find((item) => item.id === selectedId) ?? null
  const handoffParams = useMemo(() => new URLSearchParams(serializedParams), [serializedParams])

  const createRecoveryProposal = useCallback(() => {
    if (!selectedItem) return
    const proposed = createStackRemediationProposal(selectedItem, recoveryRequest)
    const evaluated = evaluateStackRemediationPolicy(proposed)
    updateRecoveryProposal(evaluated)
    recordActivity([
      stackActivityRecord({
        at: proposed.createdAt,
        kind: "proposal_created",
        actor: "operator",
        state: selectedItem.state,
        summary: `Created a typed ${proposed.actionId.replaceAll("_", " ")} proposal for ${selectedItem.name}.`,
        evidenceRef: selectedItem.id,
        correlationId: proposed.id,
      }),
      stackActivityRecord({
        at: proposed.createdAt,
        kind: evaluated.stage === "instructions_only" ? "manual_instruction" : "policy_evaluated",
        actor: "myca-policy-bridge",
        state: selectedItem.state,
        summary: evaluated.stage === "instructions_only"
          ? "No allowlisted automation applies; source-specific human instructions were presented."
          : evaluated.stage === "awaiting_approval"
            ? "The policy allowed only a bounded same-origin read and requires explicit operator approval."
            : evaluated.resultDetail ?? "The policy denied the requested action.",
        evidenceRef: selectedItem.id,
        correlationId: proposed.id,
      }),
    ])
  }, [recordActivity, recoveryRequest, selectedItem, updateRecoveryProposal])

  const approveRecovery = useCallback(() => {
    const current = recoveryProposalRef.current
    if (!current) return
    try {
      const approved = approveStackRemediation(current)
      updateRecoveryProposal(approved)
      recordActivity([
        stackActivityRecord({
          at: approved.approvedAt ?? new Date().toISOString(),
          kind: "approval_recorded",
          actor: "operator",
          state: snapshotRef.current.inventory.find((item) => item.id === approved.targetId)?.state ?? "unknown",
          summary: "The operator approved one bounded same-origin read-only recheck.",
          evidenceRef: approved.targetId,
          correlationId: approved.id,
        }),
      ])
    } catch (error) {
      setPollNote(error instanceof Error ? error.message : String(error))
    }
  }, [recordActivity, updateRecoveryProposal])

  const executeRecovery = useCallback(() => {
    const current = recoveryProposalRef.current
    if (!current) return
    try {
      const executing = beginStackRemediation(current, executedIdempotencyKeysRef.current)
      updateRecoveryProposal(executing)
      recordActivity([
        stackActivityRecord({
          at: executing.startedAt ?? executing.verifiedAt ?? new Date().toISOString(),
          kind: executing.stage === "verified" ? "verification_recorded" : "action_started",
          actor: "myca-policy-bridge",
          state: snapshotRef.current.inventory.find((item) => item.id === executing.targetId)?.state ?? "unknown",
          summary: executing.stage === "verified"
            ? executing.resultDetail ?? "The idempotent recheck was already verified."
            : "Started the approved fixed four-contract local status recheck.",
          evidenceRef: executing.targetId,
          correlationId: executing.id,
        }),
      ])
      if (executing.stage === "executing") setRefreshToken((value) => value + 1)
    } catch (error) {
      setPollNote(error instanceof Error ? error.message : String(error))
    }
  }, [recordActivity, updateRecoveryProposal])

  const requestRefreshNow = useCallback(() => {
    recordActivity([
      stackActivityRecord({
        at: new Date().toISOString(),
        kind: "action_started",
        actor: "operator",
        state: snapshotRef.current.condition,
        summary: "The operator requested an immediate local status refresh.",
        evidenceRef: "browser-session",
        correlationId: `manual-refresh:${pollSequenceRef.current + 1}`,
      }),
    ])
    setRefreshToken((value) => value + 1)
  }, [recordActivity])

  const selectItem = useCallback((id: string) => {
    setSelectedId(id)
    const url = new URL(window.location.href)
    url.searchParams.set("sourceId", id)
    window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}`)
  }, [])

  useEffect(() => {
    if (filteredInventory.length === 0) return
    if (!selectedId || !filteredInventory.some((item) => item.id === selectedId)) {
      selectItem(filteredInventory[0].id)
    }
  }, [filteredInventory, selectItem, selectedId])

  const handleRowKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Escape"].includes(event.key)) return
    event.preventDefault()
    if (event.key === "Escape") {
      searchRef.current?.focus()
      return
    }
    const next = nextInventorySelection(
      filteredInventory,
      selectedId,
      event.key as "ArrowDown" | "ArrowUp" | "Home" | "End" | "Escape",
    )
    if (!next) return
    selectItem(next)
    window.requestAnimationFrame(() => rowRefs.current.get(next)?.focus())
  }, [filteredInventory, selectItem, selectedId])

  const required = snapshot.inventory.filter((item) => item.required)
  const requiredReady = required.filter((item) => item.state === "live" || item.state === "verified").length
  const issues = snapshot.inventory.filter((item) => ["degraded", "unauthorized", "unavailable", "stale"].includes(item.state)).length
  const uncertain = snapshot.inventory.filter((item) => item.state === "unknown").length
  const simulated = snapshot.inventory.filter((item) => item.state === "simulated").length
  const loading = snapshot.condition === "loading"

  return (
    <main className={styles.root} data-stack-inventory-root aria-busy={loading ? "true" : undefined}>
      <header className={styles.pageHead}>
        <div className={styles.titleBlock}>
          <span>Operations · dependency readiness</span>
          <h1>Stack Inventory</h1>
          <p>Source-backed posture for the local Fusarium chain. Configured, verified, reachable, authorized, exchanging, fresh, and populated remain independent claims.</p>
        </div>
        <div className={styles.overallStatus} role="status" aria-live="polite">
          <StateBadge state={snapshot.condition} />
          <span>{conditionSummary(snapshot.condition)}</span>
          <small>
            Polled {formatTimestamp(lastPollAt)} · {pollDelayMs > 0 ? `every ${pollDelayMs / 1000} seconds after completion` : "automatic refresh paused"}
          </small>
          {pollNote ? <em>{pollNote}</em> : null}
        </div>
        <button
          className={styles.refreshButton}
          type="button"
          disabled={refreshing}
          onClick={requestRefreshNow}
        >
          {refreshing ? "Polling…" : "Refresh now"}
        </button>
        <div className={styles.summaryRail} aria-label="Inventory summary">
          <span><b>{loading ? "—" : `${requiredReady}/${required.length}`}</b> required ready</span>
          <span><b>{loading ? "—" : issues}</b> attention</span>
          <span><b>{loading ? "—" : uncertain}</b> unknown</span>
          <span><b>{loading ? "—" : simulated}</b> simulated</span>
          <span><b>{snapshot.classification}</b> commercial</span>
          <span><b>{snapshot.authMode}</b> auth mode</span>
        </div>
      </header>

      <AlphaObservabilityPanel />

      <section className={styles.toolbar} aria-label="Inventory filters">
        <label className={styles.searchField}>
          <span>Search inventory</span>
          <input
            ref={searchRef}
            type="search"
            value={filters.query}
            placeholder="Name, endpoint, evidence, dependency…"
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Escape" && filters.query) {
                event.preventDefault()
                setFilters((current) => ({ ...current, query: "" }))
              }
            }}
          />
        </label>
        <label>
          <span>Category</span>
          <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value as StackInventoryFilters["category"] }))}>
            {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span>State</span>
          <select value={filters.state} onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value as StackInventoryFilters["state"] }))}>
            {STATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span>Refresh cadence</span>
          <select
            value={pollDelayMs}
            onChange={(event) => setPollDelayMs(Number(event.target.value))}
          >
            {CADENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button
          type="button"
          className={styles.clearButton}
          disabled={!filters.query && filters.category === "all" && filters.state === "all"}
          onClick={() => setFilters({ query: "", category: "all", state: "all" })}
        >
          Clear filters
        </button>
        <span className={styles.resultCount} aria-live="polite">{filteredInventory.length} of {snapshot.inventory.length} dependencies</span>
      </section>

      <TopologyStrip snapshot={snapshot} selected={selectedItem} onSelect={selectItem} />

      <div className={styles.board}>
        <section className={styles.inventoryPane} aria-labelledby="inventory-list-title">
          <header className={styles.paneHead}>
            <div><span>Dependency matrix</span><h2 id="inventory-list-title">Operational inventory</h2></div>
            <small>Arrow keys / Home / End navigate · Escape returns to search</small>
          </header>
          <div className={styles.inventoryList}>
            {filteredInventory.length > 0 ? filteredInventory.map((item) => (
              <InventoryRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onSelect={() => selectItem(item.id)}
                onKeyDown={handleRowKeyDown}
                buttonRef={(node) => {
                  if (node) rowRefs.current.set(item.id, node)
                  else rowRefs.current.delete(item.id)
                }}
              />
            )) : (
              <div className={styles.noResults}>
                <strong>No matching dependencies</strong>
                <span>The inventory is still present; adjust or clear the filters.</span>
              </div>
            )}
          </div>
          <section className={styles.timeline} aria-labelledby="timeline-title">
            <header><h3 id="timeline-title">Browser-session activity journal</h3><span>Retained records are append-only in this tab · not a durable audit</span></header>
            {activityLog.length > 0 ? (
              <ol>{activityLog.slice(-8).reverse().map((event) => (
                <li key={eventKey(event)} data-state={event.state}>
                  <time dateTime={event.at}>{formatTimestamp(event.at)}</time>
                  <span><b>{stateLabel(event.kind)}</b> · {event.summary}</span>
                  <code>{event.actor} · {event.evidenceRef}</code>
                </li>
              ))}</ol>
            ) : <p>{loading ? "Waiting for the first local poll." : "No accepted browser-session activity has been recorded."}</p>}
          </section>
        </section>

        <Inspector
          item={selectedItem}
          snapshot={snapshot}
          handoffParams={handoffParams}
          recoveryRequest={recoveryRequest}
          recoveryProposal={recoveryProposal}
          refreshing={refreshing}
          onRecoveryRequestChange={setRecoveryRequest}
          onCreateRecoveryProposal={createRecoveryProposal}
          onApproveRecovery={approveRecovery}
          onExecuteRecovery={executeRecovery}
        />
      </div>
    </main>
  )
}
