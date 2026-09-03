"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Braces,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  Database,
  FileText,
  Layers3,
  Link2,
  ListTree,
  Loader2,
  Network,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react"

import {
  DOMAIN_LABELS,
  FUSION_STAGES,
  type FusionCondition,
  type FusionContext,
  type FusionLineageNode,
  type FusionMode,
  type FusionSnapshot,
  type FusionStage,
  type OperatorRole,
  type SourceTruth,
  isReviewCapable,
  sourceTruthLabel,
  stageLabel,
} from "@/lib/fusarium/data-fusion/contracts"
import {
  DEFAULT_FUSION_CONTEXT,
  buildFusionLink,
  contextForSelectedNode,
  parseFusionContext,
  restoreOperationalScopeAfterSimulation,
} from "@/lib/fusarium/data-fusion/deep-links"
import { v1FusionProvider } from "@/lib/fusarium/data-fusion/provider"
import { applyScenarioDisposition } from "@/lib/fusarium/data-fusion/scenario"
import styles from "./data-fusion.module.css"
import { ProtectedDataCenter } from "./protected-data-center"

const MODE_LABELS: Record<FusionMode, string> = {
  live: "LIVE",
  replay: "REPLAY",
  forecast: "FORECAST",
  simulated: "SIMULATED",
}

const CONDITION_COPY: Record<FusionCondition, { label: string; detail: string }> = {
  loading: { label: "LOADING", detail: "Reading each provider capability independently." },
  ready: { label: "READY", detail: "Explicit v1 records are present; unsupported fusion stages remain visible." },
  empty: { label: "EMPTY COLLECTIONS", detail: "The query returned no records. This is not a measured environmental all-clear." },
  partial: { label: "PARTIAL", detail: "Some required dimensions are missing or incomplete." },
  stale: { label: "STALE", detail: "Records exist, but their declared freshness window has elapsed." },
  degraded: { label: "DEGRADED", detail: "At least one endpoint or schema check failed; healthy results are not generalized." },
  unauthorized: { label: "UNAUTHORIZED", detail: "The development identity header was rejected. No values are substituted." },
  unavailable: { label: "UNAVAILABLE", detail: "The v1 provider is not bound or reachable. No operational run is fabricated." },
  replay: { label: "REPLAY", detail: "Append-only activity only. Current live state is intentionally excluded." },
  forecast: { label: "FORECAST UNAVAILABLE", detail: "No v1 forecast contract exists. Live observations are not relabeled as forecast." },
  simulated: { label: "SIMULATED · SANITIZED", detail: "Fixed synthetic fixtures only. They never merge into operational state." },
}

function Timestamp({
  value,
  timeWindow,
}: {
  value: string | null
  timeWindow: FusionContext["timeWindow"]
}) {
  if (!value) return <span>Unknown</span>
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return <span title={value}>{value}</span>
  const iso = date.toISOString()
  const label = timeWindow === "72h"
    ? `${iso.slice(0, 10)} ${iso.slice(11, 19)}Z`
    : `${iso.slice(11, 19)}Z`
  return <time dateTime={iso} title={iso}>{label}</time>
}

function formatConfidence(value: number | null) {
  return value === null ? "Not assessed" : `${Math.round(value * 100)}%`
}

function compactId(value: string) {
  return value.length > 28 ? `${value.slice(0, 13)}…${value.slice(-10)}` : value
}

function statusTone(value: string): "ok" | "warn" | "bad" | "muted" | "simulated" {
  if (["reachable", "valid", "fresh", "traced", "observed", "present", "available", "accepted", "ready"].includes(value)) return "ok"
  if (["partial", "stale", "degraded", "conflict", "late", "pending", "empty", "measured_absence"].includes(value)) return "warn"
  if (["unauthorized", "unreachable", "invalid", "rejected", "missing"].includes(value)) return "bad"
  if (value === "simulated") return "simulated"
  return "muted"
}

function StatusChip({ value, label }: { value: string; label?: string }) {
  return (
    <span className={styles.statusChip} data-tone={statusTone(value)}>
      <span aria-hidden="true" />
      {label || value.replaceAll("_", " ")}
    </span>
  )
}

function nodeMatchesIds(node: FusionLineageNode | null, ids: readonly string[]) {
  if (!node) return false
  const selectionIds = new Set([
    node.id,
    ...node.objectIds,
    ...node.evidenceIds,
    ...node.sourceIds,
  ])
  return ids.some((id) => selectionIds.has(id))
}

function resolveSelectedNode(snapshot: FusionSnapshot, context: FusionContext) {
  const requested = Boolean(context.selectedNodeId || context.selectedObjectId || context.selectedEvidenceId || context.selectedSourceId)
  const matched = (
    snapshot.nodes.find((node) => node.id === context.selectedNodeId) ||
    snapshot.nodes.find((node) => context.selectedObjectId && node.objectIds.includes(context.selectedObjectId)) ||
    snapshot.nodes.find((node) => context.selectedEvidenceId && node.evidenceIds.includes(context.selectedEvidenceId)) ||
    snapshot.nodes.find((node) => context.selectedSourceId && node.sourceIds.includes(context.selectedSourceId))
  )
  if (requested) return matched || null
  return (
    snapshot.nodes.find((node) => node.state !== "unavailable") ||
    snapshot.nodes[0] ||
    null
  )
}

function ContextFrame({
  context,
  snapshot,
  loading,
  onContext,
  onRefresh,
}: {
  context: FusionContext
  snapshot: FusionSnapshot | null
  loading: boolean
  onContext: (next: FusionContext) => void
  onRefresh: () => void
}) {
  const setMode = (mode: FusionMode) =>
    onContext({
      ...context,
      mode,
      timeRange: mode === "replay" ? context.timeRange : null,
      ...(mode === "simulated" && context.missionId === "runtime-unscoped"
        ? {
            missionId: "demo-mission-alpha-7",
            missionAreaId: "demo-area-alpha-7",
            missionAreaLabel: "Sanitized Alpha-7 exercise area",
          }
        : mode !== "simulated" && context.missionId === "demo-mission-alpha-7"
          ? {
              contextId: null,
              missionId: "runtime-unscoped",
              missionAreaId: "runtime-unscoped",
              missionAreaLabel: "Area not configured · development environment",
            }
          : {}),
      selectedNodeId: null,
      selectedObjectId: null,
      selectedEvidenceId: null,
      selectedSourceId: null,
    })

  return (
    <section className={styles.contextFrame} aria-labelledby="fusion-title">
      <div className={styles.contextTitle}>
        <div>
          <span className={styles.eyebrow}>OEI · source-to-conclusion lineage</span>
          <h1 id="fusion-title">Data Fusion</h1>
          <p>Trace every conclusion back to observations, transformations, evidence, source truth, and unresolved uncertainty.</p>
        </div>
        <div className={styles.contextActions}>
          <span className={styles.schemaChip}>{snapshot?.schema || "fusarium-data-fusion/v1"}</span>
          <button type="button" className={styles.iconButton} onClick={onRefresh} disabled={loading}>
            <RefreshCw aria-hidden="true" className={loading ? styles.spin : undefined} />
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.contextControls}>
        <div className={styles.contextFact}>
          <span>Mission</span>
          <strong title={context.missionId}>{context.missionId}</strong>
          <small>{context.missionAreaLabel}</small>
        </div>

        <fieldset className={styles.segmentField}>
          <legend>Time window</legend>
          <div>
            {(["6h", "24h", "72h"] as const).map((window) => (
              <button
                key={window}
                type="button"
                aria-pressed={context.timeWindow === window}
                onClick={() => onContext({ ...context, timeWindow: window, timeRange: null })}
              >
                {window.toUpperCase()}
              </button>
            ))}
          </div>
          {context.mode === "replay" && context.timeRange ? (
            <small className={styles.fixedRange} title={`${context.timeRange.start} — ${context.timeRange.end}`}>
              Exact replay range · select a preset to replace it
            </small>
          ) : null}
        </fieldset>

        <fieldset className={styles.segmentField}>
          <legend>Data mode</legend>
          <div>
            {(Object.keys(MODE_LABELS) as FusionMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={context.mode === mode}
                onClick={() => setMode(mode)}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={styles.selectField}>
          <span>Display role</span>
          <select
            value={context.operatorRole}
            onChange={(event) => onContext({ ...context, operatorRole: event.target.value as OperatorRole })}
          >
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
          <small>display only · provider reads fixed viewer</small>
        </label>

        <div className={styles.truthFacts} aria-label="Trust and provider facts">
          <div><span>Boundary</span><strong>UNCLASSIFIED · COMMERCIAL</strong></div>
          <div><span>Identity</span><strong>{snapshot?.identityMode || "Checking"}</strong></div>
          <div><span>Provider</span><strong>{context.mode === "simulated" ? "Sanitized local fixture" : "/api/fusarium/v1"}</strong></div>
        </div>
      </div>
    </section>
  )
}

function ConditionNotice({ snapshot, loading }: { snapshot: FusionSnapshot | null; loading: boolean }) {
  const condition: FusionCondition = loading ? "loading" : snapshot?.condition || "unavailable"
  const copy = CONDITION_COPY[condition]
  const Icon = condition === "loading" ? Loader2 : condition === "ready" ? BadgeCheck : condition === "simulated" ? Sparkles : condition === "unavailable" || condition === "unauthorized" ? ShieldAlert : AlertTriangle
  return (
    <section className={styles.conditionNotice} data-condition={condition} role="status" aria-live="polite">
      <Icon aria-hidden="true" className={condition === "loading" ? styles.spin : undefined} />
      <div>
        <strong>{copy.label}</strong>
        <span>{copy.detail}</span>
        {snapshot ? <small>{snapshot.note}</small> : null}
      </div>
    </section>
  )
}

function Metrics({ snapshot }: { snapshot: FusionSnapshot }) {
  const reachable = snapshot.sourceTruth.filter((item) => item.endpointReachability === "reachable").length
  const sourceDenominator = snapshot.sourceTruth.length
  const availableModalities = snapshot.coverage.filter((item) => ["observed", "partial", "empty"].includes(item.state)).length
  const modalitiesKnown = snapshot.coverage.some((item) => item.state !== "unavailable" && item.state !== "unknown")
  const review = snapshot.runs?.[0]?.reviewState || snapshot.nodes.find((item) => item.disposition)?.disposition?.state || "unavailable"
  const metrics = [
    { label: "Reachable endpoints", value: sourceDenominator ? `${reachable}/${sourceDenominator}` : "Unknown", hint: "Reachability only; not identity or data" },
    { label: "Six modalities", value: modalitiesKnown ? `${availableModalities}/6` : "Unavailable", hint: "Coverage never inferred from domain rows" },
    {
      label: "Fusion runs",
      value: snapshot.runs === null ? "Unavailable" : String(snapshot.runs.length),
      hint: snapshot.runs === null
        ? "Run capability unavailable"
        : snapshot.runs.length
          ? snapshot.runs.every((run) => run.synthetic) ? "Sanitized scenario history" : "Scoped operational history"
          : "Valid empty scoped history",
    },
    { label: "Conflicts", value: snapshot.conflicts === null ? "Unknown" : String(snapshot.conflicts.length), hint: snapshot.conflicts === null ? "Fusion-run queue unavailable" : "Explicit queue entries" },
    { label: "Late / missing", value: snapshot.lateMissing === null ? "Unknown" : String(snapshot.lateMissing.length), hint: "Explicit provider or scenario states" },
    { label: "Disposition", value: review.replaceAll("_", " "), hint: "No external send or actuation" },
  ]
  return (
    <section className={styles.metrics} aria-label="Fusion posture">
      {metrics.map((metric) => (
        <article key={metric.label} className={styles.metric}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.hint}</small>
        </article>
      ))}
    </section>
  )
}

function LineageGraph({
  snapshot,
  selected,
  onSelect,
}: {
  snapshot: FusionSnapshot
  selected: FusionLineageNode | null
  onSelect: (node: FusionLineageNode) => void
}) {
  return (
    <section className={styles.primaryPanel} aria-labelledby="lineage-heading">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>01 · dominant operational path</span>
          <h2 id="lineage-heading">Source-to-conclusion lineage</h2>
        </div>
        <div className={styles.panelMeta}>
          <StatusChip value={snapshot.condition} />
          <span>{snapshot.edges.length} explicit links</span>
        </div>
      </header>
      <div className={styles.graphGrid}>
        {FUSION_STAGES.map((stage, stageIndex) => {
          const nodes = snapshot.nodes.filter((item) => item.stage === stage)
          const visible = nodes.slice(0, 6)
          return (
            <section key={stage} className={styles.stageColumn} aria-labelledby={`stage-${stage}`}>
              <header>
                <span>{String(stageIndex + 1).padStart(2, "0")}</span>
                <strong id={`stage-${stage}`}>{stageLabel(stage)}</strong>
                {stageIndex < FUSION_STAGES.length - 1 ? <ChevronRight aria-hidden="true" /> : null}
              </header>
              <div className={styles.stageNodes}>
                {visible.map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    className={styles.nodeCard}
                    data-state={node.state}
                    data-selected={selected?.id === node.id}
                    aria-pressed={selected?.id === node.id}
                    onClick={() => onSelect(node)}
                  >
                    <span className={styles.nodeTopline}>
                      <StatusChip value={node.synthetic ? "simulated" : node.state} label={node.synthetic ? "SIM" : undefined} />
                      <small><Timestamp value={node.observedAt} timeWindow={snapshot.context.timeWindow} /></small>
                    </span>
                    <strong>{node.label}</strong>
                    <span>{node.summary}</span>
                    <small>{node.evidenceIds.length ? `${node.evidenceIds.length} evidence` : "Evidence unavailable"}</small>
                  </button>
                ))}
              </div>
              {nodes.length > visible.length ? <p className={styles.overflowNote}>+{nodes.length - visible.length} more in table</p> : null}
            </section>
          )
        })}
      </div>
      <footer className={styles.graphLegend}>
        <span><i data-tone="ok" /> Explicit record</span>
        <span><i data-tone="warn" /> Partial / conflict</span>
        <span><i data-tone="muted" /> Provider gap</span>
        <span><i data-tone="simulated" /> Sanitized simulation</span>
        <small>Column order shows the required workflow; only the counted explicit links assert record relationships.</small>
      </footer>
    </section>
  )
}

const TRUTH_COLUMNS: Array<{ key: keyof Pick<SourceTruth, "endpointReachability" | "identityVerification" | "schemaValidity" | "freshness" | "provenance" | "coverage" | "dataPresence">; label: string }> = [
  { key: "endpointReachability", label: "Endpoint" },
  { key: "identityVerification", label: "Identity" },
  { key: "schemaValidity", label: "Schema" },
  { key: "freshness", label: "Freshness" },
  { key: "provenance", label: "Provenance" },
  { key: "coverage", label: "Coverage" },
  { key: "dataPresence", label: "Data" },
]

function SourceReadiness({ snapshot, selected, onSelect }: { snapshot: FusionSnapshot; selected: FusionLineageNode | null; onSelect: (node: FusionLineageNode) => void }) {
  return (
    <section className={styles.truthPanel} aria-labelledby="source-truth-heading">
      <header className={styles.panelHeader}>
        <div><span className={styles.eyebrow}>02 · source truth</span><h2 id="source-truth-heading">Readiness dimensions</h2></div>
        <span className={styles.countChip}>{snapshot.sourceTruth.length} source rows</span>
      </header>
      <div
        className={styles.tableScroll}
        role="region"
        aria-label="Source readiness table; scroll for additional columns"
        tabIndex={0}
      >
        <table className={styles.truthTable}>
          <thead>
            <tr><th>Source</th>{TRUTH_COLUMNS.map((column) => <th key={column.key}>{column.label}</th>)}<th>Records</th></tr>
          </thead>
          <tbody>
            {snapshot.sourceTruth.map((source) => {
              const node = snapshot.nodes.find((item) => item.stage === "source" && item.sourceIds.includes(source.id))
              return (
                <tr key={source.id} data-selected={selected?.id === node?.id}>
                  <th scope="row">
                    {node ? <button type="button" onClick={() => onSelect(node)}>{source.label}</button> : <span>{source.label}</span>}
                    <small title={source.endpointRef || undefined}>{source.endpointRef ? compactId(source.endpointRef) : "Endpoint ref unavailable"}</small>
                  </th>
                  {TRUTH_COLUMNS.map((column) => {
                    const value = source[column.key]
                    return <td key={column.key}><StatusChip value={String(value)} label={sourceTruthLabel(value)} /></td>
                  })}
                  <td>{source.recordCount === null ? <span className={styles.unknownValue}>Unknown</span> : source.dataPresence === "measured_absence" ? <strong>0 measured</strong> : source.recordCount}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ModalityCoverage({ snapshot }: { snapshot: FusionSnapshot }) {
  return (
    <section className={styles.coveragePanel} aria-labelledby="coverage-heading">
      <header className={styles.panelHeader}>
        <div><span className={styles.eyebrow}>03 · six sensing modalities</span><h2 id="coverage-heading">Coverage without inference</h2></div>
      </header>
      <div className={styles.coverageGrid}>
        {snapshot.coverage.map((item, index) => (
          <article key={item.modality} data-state={item.state}>
            <div className={styles.modalityIcon}><span>{String(index + 1).padStart(2, "0")}</span></div>
            <div>
              <strong>{item.label}</strong>
              <StatusChip value={item.synthetic ? "simulated" : item.state} label={item.synthetic ? `${item.state} · SIM` : undefined} />
            </div>
            <dl>
              <div><dt>Observed</dt><dd>{item.observedRecords === null ? "Unknown" : item.observedRecords}</dd></div>
              <div><dt>Expected</dt><dd>{item.expectedRecords === null ? "Unknown" : item.expectedRecords}</dd></div>
            </dl>
            <p>{item.gaps[0] || "Explicit coverage record supplied."}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function QueuePanel({ snapshot, selected, onSelect }: { snapshot: FusionSnapshot; selected: FusionLineageNode | null; onSelect: (node: FusionLineageNode) => void }) {
  const queues = [
    { title: "Conflict queue", items: snapshot.conflicts, icon: AlertTriangle },
    { title: "Late / missing inputs", items: snapshot.lateMissing, icon: Clock3 },
  ]
  return (
    <section className={styles.queuePanel} aria-labelledby="queue-heading">
      <header className={styles.panelHeader}><div><span className={styles.eyebrow}>04 · exception handling</span><h2 id="queue-heading">Conflicts and gaps</h2></div></header>
      <div className={styles.queueGrid}>
        {queues.map(({ title, items, icon: Icon }) => (
          <article key={title}>
            <h3><Icon aria-hidden="true" />{title}<span>{items === null ? "—" : items.length}</span></h3>
            {items === null ? <p className={styles.emptyState}>Capability unavailable. The interface does not interpret silence as zero exceptions.</p> : items.length === 0 ? <p className={styles.emptyState}>No explicit queue entries in this response.</p> : (
              <ul>
                {items.map((item) => {
                  const node = snapshot.nodes.find((candidate) => nodeMatchesIds(candidate, item.nodeIds))
                  return <li key={item.id} data-selected={nodeMatchesIds(selected, item.nodeIds)}>{node ? <button type="button" onClick={() => onSelect(node)}><strong>{item.label}</strong><span>{item.detail}</span></button> : <div><strong>{item.label}</strong><span>{item.detail}</span></div>}</li>
                })}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

function CorrelationModelRun({ snapshot, selected, onSelect }: { snapshot: FusionSnapshot; selected: FusionLineageNode | null; onSelect: (node: FusionLineageNode) => void }) {
  const correlationEmpty = snapshot.correlations === null
    ? "No correlation-group contract is bound. Pairwise environmental relationships are separate v1 records, not correlation groups, and are never promoted here."
    : "No correlation groups were returned. Pairwise environmental relationships, when present, remain separate records and are not inferred into groups."
  return (
    <section className={styles.analysisPanel} aria-labelledby="analysis-heading">
      <header className={styles.panelHeader}><div><span className={styles.eyebrow}>05 · fusion accountability</span><h2 id="analysis-heading">Correlation, contribution, model, history</h2></div></header>
      <div className={styles.analysisGrid}>
        <article>
          <h3><Network aria-hidden="true" />Correlation groups</h3>
          {!snapshot.correlations?.length ? <p className={styles.emptyState}>{correlationEmpty}</p> : <ul className={styles.compactList}>{snapshot.correlations.map((group) => <li key={group.id} data-selected={nodeMatchesIds(selected, group.nodeIds)}><button type="button" onClick={() => { const node = snapshot.nodes.find((item) => nodeMatchesIds(item, group.nodeIds)); if (node) onSelect(node) }}><span><strong>{group.label}</strong><small>{group.basis}</small></span><StatusChip value={group.synthetic ? "simulated" : group.state} label={group.synthetic ? `${group.state} · SIM` : undefined} /></button></li>)}</ul>}
        </article>
        <article>
          <h3><Layers3 aria-hidden="true" />Source contribution</h3>
          {snapshot.contributions === null ? <p className={styles.emptyState}>Unavailable. The scoped fusion-run capability did not supply contribution state.</p> : snapshot.contributions.length === 0 ? <p className={styles.emptyState}>The scoped fusion-run history is validly empty or its latest run supplied no contribution records.</p> : <ul className={styles.contributionList}>{snapshot.contributions.map((item) => <li key={item.id}><div><span>{item.label}</span><strong>{item.contribution === null ? "Unknown" : `${Math.round(item.contribution * 100)}%`}</strong></div><div className={styles.contributionTrack}><i style={{ width: item.contribution === null ? "0" : `${item.contribution * 100}%` }} /></div><small>{item.basis}</small></li>)}</ul>}
        </article>
        <article>
          <h3><Braces aria-hidden="true" />Model / schema state</h3>
          <dl className={styles.keyValues}>
            <div><dt>State</dt><dd><StatusChip value={snapshot.model.state} /></dd></div>
            <div><dt>Model</dt><dd>{snapshot.model.name || "Unavailable"}</dd></div>
            <div><dt>Version</dt><dd>{snapshot.model.version || "Unavailable"}</dd></div>
            <div><dt>Schema</dt><dd>{snapshot.model.schemaVersion || "Unavailable"}</dd></div>
          </dl>
          <p>{snapshot.model.basis}</p>
        </article>
        <article>
          <h3><Activity aria-hidden="true" />Fusion-run history</h3>
          {snapshot.runs === null
            ? <p className={styles.emptyState}>The fusion-run capability is unavailable or failed schema validation.</p>
            : snapshot.runs.length === 0
              ? <p className={styles.emptyState}>The fusion-run resource returned no run explicitly scoped to this mission area/context and time window.</p>
              : <div className={styles.runHistory}>{snapshot.runs.map((run) => {
                  const node = snapshot.nodes.find((item) => item.id === run.id || item.recordRef === `/api/fusarium/v1/fusion-runs/${encodeURIComponent(run.id)}`)
                  const state = run.synthetic ? "simulated" : run.dataMode === "unavailable" || run.dataMode === "degraded" ? run.dataMode : run.state
                  return <button key={run.id} type="button" className={styles.runCard} data-selected={selected?.id === node?.id} onClick={() => { if (node) onSelect(node) }}><span><strong>{run.id}</strong><small><Timestamp value={run.startedAt} timeWindow={snapshot.context.timeWindow} /> → <Timestamp value={run.completedAt} timeWindow={snapshot.context.timeWindow} /></small></span><StatusChip value={state} /></button>
                })}</div>}
        </article>
      </div>
    </section>
  )
}

function LineageTable({ snapshot, selected, onSelect }: { snapshot: FusionSnapshot; selected: FusionLineageNode | null; onSelect: (node: FusionLineageNode) => void }) {
  return (
    <section className={styles.syncPanel} aria-labelledby="table-heading">
      <header><ListTree aria-hidden="true" /><div><span className={styles.eyebrow}>Lineage table</span><h3 id="table-heading">All nodes</h3></div><span className={styles.countChip}>{snapshot.nodes.length}</span></header>
      <div
        className={styles.syncScroll}
        role="region"
        aria-label="Lineage table; scroll for additional columns"
        tabIndex={0}
      >
        <table className={styles.lineageTable}>
          <thead><tr><th>Stage</th><th>Record</th><th>State</th><th>Observed</th><th>Confidence</th></tr></thead>
          <tbody>{snapshot.nodes.map((node) => <tr key={node.id} data-selected={selected?.id === node.id}><td>{stageLabel(node.stage)}</td><th scope="row"><button type="button" onClick={() => onSelect(node)}>{node.label}</button><small>{compactId(node.id)}</small></th><td><StatusChip value={node.synthetic ? "simulated" : node.state} label={node.synthetic ? `${node.state} · SIM` : undefined} /></td><td><Timestamp value={node.observedAt} timeWindow={snapshot.context.timeWindow} /></td><td>{formatConfidence(node.confidence)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}

function Timeline({ snapshot, selected, onSelect }: { snapshot: FusionSnapshot; selected: FusionLineageNode | null; onSelect: (node: FusionLineageNode) => void }) {
  return (
    <section className={styles.syncPanel} aria-labelledby="timeline-heading">
      <header><Clock3 aria-hidden="true" /><div><span className={styles.eyebrow}>Timeline</span><h3 id="timeline-heading">Activity and lineage time</h3></div><span className={styles.countChip}>{snapshot.timeline.length || "—"}</span></header>
      <div className={styles.timeline} data-window={snapshot.context.timeWindow}>
        {snapshot.timeline.length === 0 ? <p className={styles.emptyState}>No activity events are available for this mission/time context.</p> : <ol>{snapshot.timeline.map((event) => {
          const node = snapshot.nodes.find((candidate) => nodeMatchesIds(candidate, event.nodeIds))
          return <li key={event.id} data-selected={nodeMatchesIds(selected, event.nodeIds)}><Timestamp value={event.at} timeWindow={snapshot.context.timeWindow} /><i aria-hidden="true" />{node ? <button type="button" onClick={() => onSelect(node)}><strong>{event.label}</strong><span>{event.detail}</span></button> : <div><strong>{event.label}</strong><span>{event.detail}</span></div>}</li>
        })}</ol>}
      </div>
    </section>
  )
}

function Inspector({ snapshot, node, onDisposition }: { snapshot: FusionSnapshot; node: FusionLineageNode | null; onDisposition: (state: "accepted" | "rejected" | "pending") => void }) {
  if (!node) return <section className={styles.syncPanel}><p className={styles.emptyState}>Select a lineage node to inspect its truth, evidence, uncertainty, and downstream links.</p></section>
  const downstream = snapshot.edges.filter((edge) => edge.fromId === node.id).map((edge) => snapshot.nodes.find((candidate) => candidate.id === edge.toId)).filter((item): item is FusionLineageNode => Boolean(item))
  const canReview = snapshot.condition === "simulated" && node.disposition?.localOnly && isReviewCapable(snapshot.context.operatorRole)
  const operationalReviewBlocked = Boolean(node.disposition && !node.disposition.localOnly)
  return (
    <section className={styles.syncPanel} aria-labelledby="inspector-heading">
      <header><Database aria-hidden="true" /><div><span className={styles.eyebrow}>Synchronized inspector</span><h3 id="inspector-heading">{node.label}</h3></div><StatusChip value={node.synthetic ? "simulated" : node.state} label={node.synthetic ? `${node.state} · SIM` : undefined} /></header>
      <div className={styles.inspectorBody}>
        <div className={styles.inspectorSummary}>
          <span>{stageLabel(node.stage)}</span>
          <p>{node.summary}</p>
        </div>
        <dl className={styles.inspectorFacts}>
          <div><dt>Record</dt><dd title={node.id}>{compactId(node.id)}</dd></div>
          <div><dt>Mode</dt><dd>{node.dataMode.toUpperCase()}</dd></div>
          <div><dt>Domain</dt><dd>{node.domain ? DOMAIN_LABELS[node.domain] : "Not supplied"}</dd></div>
          <div><dt>Observed</dt><dd><Timestamp value={node.observedAt} timeWindow={snapshot.context.timeWindow} /></dd></div>
          <div><dt>Confidence</dt><dd>{formatConfidence(node.confidence)}</dd></div>
          <div><dt>Model / transform</dt><dd>{node.modelRef || "Unavailable"}</dd></div>
        </dl>
        <section className={styles.inspectorSection}>
          <h4>Confidence and uncertainty</h4>
          <p>{node.uncertainty || "No uncertainty statement was supplied."}</p>
        </section>
        <section className={styles.inspectorSection}>
          <h4>Evidence and provenance</h4>
          <div className={styles.idPills}>
            {node.recordRef ? <span title={node.recordRef}><Link2 aria-hidden="true" />{compactId(node.recordRef)}</span> : <span><X aria-hidden="true" />Provenance ref unavailable</span>}
            {node.evidenceIds.map((id) => <span key={id} title={id}><FileText aria-hidden="true" />{compactId(id)}</span>)}
            {!node.evidenceIds.length ? <span><CircleDashed aria-hidden="true" />Evidence unavailable</span> : null}
          </div>
        </section>
        {node.facts.length ? <section className={styles.inspectorSection}><h4>Record facts</h4><dl className={styles.recordFacts}>{node.facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd data-tone={fact.state || "muted"}>{fact.value}</dd></div>)}</dl></section> : null}
        <section className={styles.inspectorSection}>
          <h4>Downstream impact</h4>
          {downstream.length ? <ul className={styles.downstreamList}>{downstream.map((item) => <li key={item.id}><ArrowRight aria-hidden="true" /><span><strong>{item.label}</strong><small>{stageLabel(item.stage)}</small></span></li>)}</ul> : <p>No explicit downstream links were supplied.</p>}
        </section>
        {node.disposition ? <section className={styles.reviewBox}>
          <div><span className={styles.eyebrow}>Human disposition</span><strong>{node.disposition.state.replaceAll("_", " ")}</strong><p>{node.disposition.localOnly ? "This simulated decision changes only the current browser session." : "This disposition was recorded by the operational provider. Mutation is disabled in this workbench."}</p></div>
          <div className={styles.reviewActions}>
            <button type="button" onClick={() => onDisposition("accepted")} disabled={!canReview} data-action="accept"><Check aria-hidden="true" />Accept</button>
            <button type="button" onClick={() => onDisposition("rejected")} disabled={!canReview} data-action="reject"><X aria-hidden="true" />Reject</button>
            <button type="button" onClick={() => onDisposition("pending")} disabled={!canReview}><RotateCcw aria-hidden="true" />Reset</button>
          </div>
          {!isReviewCapable(snapshot.context.operatorRole) ? <small>Analyst or admin display role is required for this local simulated review exercise.</small> : null}
          {operationalReviewBlocked ? <small>No action was sent: operational records remain read-only in this workbench.</small> : null}
        </section> : null}
      </div>
    </section>
  )
}

function SynchronizedViews({ snapshot, selected, onSelect, onDisposition }: { snapshot: FusionSnapshot; selected: FusionLineageNode | null; onSelect: (node: FusionLineageNode) => void; onDisposition: (state: "accepted" | "rejected" | "pending") => void }) {
  return (
    <section className={styles.syncWorkspace} aria-labelledby="sync-heading">
      <header className={styles.panelHeader}>
        <div><span className={styles.eyebrow}>06 · synchronized review surface</span><h2 id="sync-heading">Table · timeline · inspector</h2></div>
        <span className={styles.selectionReadout}>Selected <strong>{selected?.label || "None"}</strong></span>
      </header>
      <div className={styles.syncGrid}>
        <LineageTable snapshot={snapshot} selected={selected} onSelect={onSelect} />
        <Timeline snapshot={snapshot} selected={selected} onSelect={onSelect} />
        <Inspector snapshot={snapshot} node={selected} onDisposition={onDisposition} />
      </div>
    </section>
  )
}

function ContextHandoffs({ snapshot, context }: { snapshot: FusionSnapshot; context: FusionContext }) {
  const situationalIncompatible = context.mode === "replay" || context.mode === "forecast"
  const routes = [
    { route: "situationalAwareness" as const, label: "Situational Awareness", detail: "Carry area, time, mode, object, evidence, and source" },
    { route: "oeiNarrative" as const, label: "OEI Narrative", detail: "Carry the reviewed context; no narrative is auto-released" },
  ]
  return (
    <section className={styles.handoffPanel} aria-labelledby="handoff-heading">
      <header className={styles.panelHeader}><div><span className={styles.eyebrow}>07 · context-preserving routes</span><h2 id="handoff-heading">Continue the investigation</h2></div></header>
      <div className={styles.handoffGrid}>
        {routes.map((item) => {
          if (item.route === "situationalAwareness" && situationalIncompatible) {
            return (
              <div key={item.route} className={styles.handoffUnavailable} role="link" aria-disabled="true">
                <span>
                  <strong>{item.label}</strong>
                  <small>{MODE_LABELS[context.mode]} is not supported by that workspace. Handoff disabled; mode was not changed.</small>
                </span>
                <ShieldAlert aria-hidden="true" />
              </div>
            )
          }
          return <Link key={item.route} href={buildFusionLink(item.route, context)}><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowRight aria-hidden="true" /></Link>
        })}
      </div>
      <details className={styles.gaps}>
        <summary>Declared provider gaps · {snapshot.gaps.length}</summary>
        <ul>{snapshot.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
      </details>
    </section>
  )
}

export function DataFusionDashboard() {
  const searchParams = useSearchParams()
  const initialContext = useMemo(() => parseFusionContext(new URLSearchParams(searchParams.toString())), [searchParams])
  const [context, setContext] = useState<FusionContext>(initialContext)
  const [snapshot, setSnapshot] = useState<FusionSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const lastOperationalScope = useRef(
    initialContext.mode === "simulated" || initialContext.missionId === "demo-mission-alpha-7"
      ? {
          contextId: DEFAULT_FUSION_CONTEXT.contextId,
          missionId: DEFAULT_FUSION_CONTEXT.missionId,
          missionAreaId: DEFAULT_FUSION_CONTEXT.missionAreaId,
          missionAreaLabel: DEFAULT_FUSION_CONTEXT.missionAreaLabel,
        }
      : {
          contextId: initialContext.contextId,
          missionId: initialContext.missionId,
          missionAreaId: initialContext.missionAreaId,
          missionAreaLabel: initialContext.missionAreaLabel,
        },
  )

  useEffect(() => {
    setContext(initialContext)
  }, [initialContext])

  useEffect(() => {
    if (context.mode !== "simulated" && context.missionId !== "demo-mission-alpha-7") {
      lastOperationalScope.current = {
        contextId: context.contextId,
        missionId: context.missionId,
        missionAreaId: context.missionAreaId,
        missionAreaLabel: context.missionAreaLabel,
      }
    }
  }, [context.contextId, context.missionAreaId, context.missionAreaLabel, context.missionId, context.mode])

  const providerKey = `${context.contextId || ""}|${context.missionId}|${context.missionAreaId}|${context.timeWindow}|${context.timeRange?.start || ""}|${context.timeRange?.end || ""}|${context.mode}|${context.operatorRole}|${refreshKey}`
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)
    setSnapshot(null)
    v1FusionProvider
      .load(context, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return
        const providerContext = value.context
        const selectionRequested = Boolean(
          providerContext.selectedNodeId ||
          providerContext.selectedObjectId ||
          providerContext.selectedEvidenceId ||
          providerContext.selectedSourceId
        )
        const matchedSelection = selectionRequested ? resolveSelectedNode(value, providerContext) : null
        const canonical = selectionRequested
          ? contextForSelectedNode(providerContext, matchedSelection)
          : providerContext
        setSnapshot({ ...value, context: canonical })
        const changed =
          canonical.contextId !== context.contextId ||
          canonical.missionId !== context.missionId ||
          canonical.missionAreaId !== context.missionAreaId ||
          canonical.missionAreaLabel !== context.missionAreaLabel ||
          canonical.timeRange?.start !== context.timeRange?.start ||
          canonical.timeRange?.end !== context.timeRange?.end ||
          canonical.mode !== context.mode ||
          canonical.selectedNodeId !== context.selectedNodeId ||
          canonical.selectedObjectId !== context.selectedObjectId ||
          canonical.selectedEvidenceId !== context.selectedEvidenceId ||
          canonical.selectedSourceId !== context.selectedSourceId
        if (changed) {
          setContext(canonical)
          if (typeof window !== "undefined") window.history.replaceState({}, "", buildFusionLink("dataFusion", canonical))
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
    // Selection changes should synchronize views without refetching provider data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerKey])

  const commitContext = useCallback((next: FusionContext) => {
    let canonical = restoreOperationalScopeAfterSimulation(next, lastOperationalScope.current)
    if (next.mode === "simulated") {
      if (next.missionId !== "runtime-unscoped" && next.missionId !== "demo-mission-alpha-7") {
        lastOperationalScope.current = {
          contextId: next.contextId,
          missionId: next.missionId,
          missionAreaId: next.missionAreaId,
          missionAreaLabel: next.missionAreaLabel,
        }
      }
      if (
        next.contextId !== "sim-context-alpha-7" ||
        next.missionId !== "demo-mission-alpha-7" ||
        next.missionAreaId !== "demo-area-alpha-7"
      ) {
        canonical = {
          ...next,
          contextId: "sim-context-alpha-7",
          missionId: "demo-mission-alpha-7",
          missionAreaId: "demo-area-alpha-7",
          missionAreaLabel: "Sanitized Alpha-7 exercise area",
          timeRange: null,
          selectedNodeId: null,
          selectedObjectId: null,
          selectedEvidenceId: null,
          selectedSourceId: null,
        }
      }
    } else if (
      canonical.missionId === "runtime-unscoped" &&
      lastOperationalScope.current.missionId !== "runtime-unscoped" &&
      lastOperationalScope.current.missionId !== "demo-mission-alpha-7"
    ) {
      canonical = { ...canonical, ...lastOperationalScope.current }
    } else if (canonical.missionId !== "demo-mission-alpha-7") {
      lastOperationalScope.current = {
        contextId: canonical.contextId,
        missionId: canonical.missionId,
        missionAreaId: canonical.missionAreaId,
        missionAreaLabel: canonical.missionAreaLabel,
      }
    }
    setContext(canonical)
    if (typeof window !== "undefined") window.history.replaceState({}, "", buildFusionLink("dataFusion", canonical))
  }, [])

  const selected = snapshot ? resolveSelectedNode(snapshot, context) : null
  const selectNode = useCallback((node: FusionLineageNode) => {
    commitContext(contextForSelectedNode(context, node))
  }, [commitContext, context])

  const disposition = useCallback((state: "accepted" | "rejected" | "pending") => {
    setSnapshot((current) => current ? applyScenarioDisposition(current, state) : current)
  }, [])

  if (loadError) {
    return (
      <main className={styles.page}>
        <ContextFrame context={context} snapshot={null} loading={false} onContext={commitContext} onRefresh={() => setRefreshKey((key) => key + 1)} />
        <section className={styles.fatalError} role="alert"><ShieldAlert aria-hidden="true" /><div><strong>Provider load failed</strong><p>{loadError}</p><p>No operational values were substituted.</p></div></section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <ContextFrame context={context} snapshot={snapshot} loading={loading} onContext={commitContext} onRefresh={() => setRefreshKey((key) => key + 1)} />
      <ConditionNotice snapshot={snapshot} loading={loading} />
      <ProtectedDataCenter />
      {!snapshot ? (
        <section className={styles.loadingGrid} aria-label="Loading data fusion workbench">
          <div /><div /><div /><div />
        </section>
      ) : (
        <>
          <Metrics snapshot={snapshot} />
          <LineageGraph snapshot={snapshot} selected={selected} onSelect={selectNode} />
          <div className={styles.readinessGrid}>
            <SourceReadiness snapshot={snapshot} selected={selected} onSelect={selectNode} />
            <ModalityCoverage snapshot={snapshot} />
          </div>
          <div className={styles.supportGrid}>
            <QueuePanel snapshot={snapshot} selected={selected} onSelect={selectNode} />
            <CorrelationModelRun snapshot={snapshot} selected={selected} onSelect={selectNode} />
          </div>
          <SynchronizedViews snapshot={snapshot} selected={selected} onSelect={selectNode} onDisposition={disposition} />
          <ContextHandoffs snapshot={snapshot} context={context} />
        </>
      )}
    </main>
  )
}
