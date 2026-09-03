"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Database,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  GitBranch,
  GitCompareArrows,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MapPinned,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserRoundCheck,
  X,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  assessClaim,
  deriveChangedClaimIds,
  workflowBlockers,
  type OeiClaim,
  type OeiCondition,
  type OeiContext,
  type OeiDimensionState,
  type OeiMode,
  type OeiNarrativeSnapshot,
  type OeiNarrativeVersion,
  type OeiTimeWindow,
  type OeiWorkflowStage,
  type V1EnvironmentalObject,
  type V1EvidenceRecord,
} from "@/lib/fusarium/oei-narrative/contracts"
import {
  buildOeiHandoffLink,
  buildOeiSelfLink,
  parseOeiContext,
  withOeiSelection,
} from "@/lib/fusarium/oei-narrative/deep-links"
import {
  OEI_LOCAL_DRAFT_STORAGE_KEY,
  appendLocalVersion,
  createOeiLocalDraft,
  oeiDraftContextKey,
  parseOeiLocalDraft,
  serializeOeiLocalDraft,
  updateLocalClaim,
  type OeiLocalDraft,
} from "@/lib/fusarium/oei-narrative/local-draft"
import { oeiNarrativeProvider } from "@/lib/fusarium/oei-narrative/provider"
import styles from "./oei-narrative.module.css"

const WORKFLOW: Array<{ id: OeiWorkflowStage; label: string; short: string }> = [
  { id: "draft", label: "Draft", short: "01" },
  { id: "evidence_check", label: "Evidence check", short: "02" },
  { id: "human_review", label: "Human review", short: "03" },
  { id: "approved_package", label: "Approved package", short: "04" },
]

const MODES: Array<{ id: OeiMode; label: string }> = [
  { id: "live", label: "LIVE" },
  { id: "replay", label: "REPLAY" },
  { id: "forecast", label: "FORECAST" },
  { id: "simulated", label: "SIMULATED" },
]

const WINDOWS: OeiTimeWindow[] = ["6h", "24h", "72h"]

const DOMAIN_LABELS: Record<V1EnvironmentalObject["domain"], string> = {
  atmosphere: "Atmosphere",
  water: "Water",
  land: "Land / soil",
  living: "Living systems",
  infrastructure: "Infrastructure",
  process: "Process",
}

function formatUtc(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "UNKNOWN"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value)) + "Z"
}

function confidenceText(value: number | null): string {
  return value === null ? "NOT ASSESSED" : `${Math.round(value * 100)}%`
}

function countText(count: number, empty = "NO RECORDS"): string | number {
  return count > 0 ? count : empty
}

function joinOrUnknown(values: readonly string[]): string {
  return values.length ? values.join(" · ") : "UNKNOWN"
}

function ConditionNotice({ condition, note }: { condition: OeiCondition; note: string }) {
  const Icon =
    condition === "ready" || condition === "replay"
      ? CheckCircle2
      : condition === "simulated"
        ? Sparkles
        : condition === "loading"
          ? LoaderCircle
          : TriangleAlert
  return (
    <div className={styles.conditionNotice} data-condition={condition} role="status">
      <Icon className={condition === "loading" ? styles.spin : undefined} aria-hidden="true" />
      <div>
        <strong>{condition.replace("_", " ").toUpperCase()}</strong>
        <span>{note}</span>
      </div>
    </div>
  )
}

function ContextHeader({
  context,
  snapshot,
  loading,
  onChange,
  onRefresh,
}: {
  context: OeiContext
  snapshot: OeiNarrativeSnapshot | null
  loading: boolean
  onChange: (next: OeiContext) => void
  onRefresh: () => void
}) {
  const chooseMission = (missionId: string) => {
    const mission = snapshot?.availableMissions.find((item) => item.id === missionId)
    onChange({
      ...context,
      missionId: mission?.id ?? "runtime-unscoped",
      missionLabel: mission?.name ?? "Mission not selected",
      contextId: null,
      missionAreaId: "runtime-unscoped",
      missionAreaLabel: "Area not configured · development environment",
      selectedObjectId: null,
      selectedEvidenceId: null,
      selectedSourceId: null,
    })
  }
  const chooseContext = (contextId: string) => {
    const selected = snapshot?.availableContexts.find((item) => item.id === contextId)
    if (!selected) {
      onChange({ ...context, contextId: null })
      return
    }
    const area = snapshot?.availableMissionAreas.find((item) => item.id === selected.missionAreaId)
    onChange({
      ...context,
      contextId: selected.id,
      missionAreaId: selected.missionAreaId,
      missionAreaLabel: area?.name ?? selected.missionAreaLabel ?? selected.missionAreaId,
      timeWindow: selected.timeWindow ?? context.timeWindow,
      selectedObjectId: selected.selectedObjectId,
      selectedEvidenceId: selected.selectedEvidenceId,
      selectedSourceId: selected.selectedSourceId,
    })
  }

  return (
    <header className={styles.contextFrame}>
      {context.mode === "simulated" ? (
        <div className={styles.simulationBanner}>
          <Sparkles aria-hidden="true" /> SIMULATED · SANITIZED · EXERCISE ONLY · SEPARATE FROM OPERATIONAL STATE
        </div>
      ) : null}
      <div className={styles.contextTitle}>
        <div>
          <span className={styles.eyebrow}>Environmental intelligence product composer</span>
          <h1>OEI Narrative</h1>
          <p>Evidence-linked briefing canvas · local draft · human review required</p>
        </div>
        <div className={styles.contextActions}>
          <span className={styles.classificationChip}><ShieldCheck aria-hidden="true" /> UNCLASSIFIED</span>
          <button type="button" className={styles.iconButton} onClick={onRefresh} disabled={loading}>
            <RefreshCcw className={loading ? styles.spin : undefined} aria-hidden="true" /> Refresh sources
          </button>
        </div>
      </div>
      <div className={styles.contextGrid}>
        <label className={styles.contextControl}>
          <span>Mission</span>
          <select value={context.missionId} onChange={(event) => chooseMission(event.target.value)}>
            <option value="runtime-unscoped">Not selected</option>
            {snapshot?.availableMissions.map((mission) => (
              <option key={mission.id} value={mission.id}>{mission.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.contextControl}>
          <span>Mission context</span>
          <select value={context.contextId ?? ""} onChange={(event) => chooseContext(event.target.value)} disabled={!context.missionId || context.missionId === "runtime-unscoped"}>
            <option value="">Not selected</option>
            {snapshot?.availableContexts.map((item) => (
              <option key={item.id} value={item.id}>{item.missionAreaLabel ?? item.id}</option>
            ))}
          </select>
        </label>
        <div className={styles.contextReadout}>
          <span>Area</span>
          <strong>{context.missionAreaLabel}</strong>
        </div>
        <div className={styles.contextControl}>
          <span>Time window</span>
          <div className={styles.segmented}>
            {WINDOWS.map((window) => (
              <button key={window} type="button" aria-pressed={context.timeWindow === window} onClick={() => onChange({ ...context, timeWindow: window })}>{window}</button>
            ))}
          </div>
        </div>
        <div className={`${styles.contextControl} ${styles.modeControl}`}>
          <span>Mode</span>
          <div className={styles.segmented}>
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                data-mode={mode.id}
                aria-pressed={context.mode === mode.id}
                onClick={() => onChange({ ...context, mode: mode.id, selectedObjectId: null, selectedEvidenceId: null, selectedSourceId: null })}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.contextReadout}>
          <span>Role context</span>
          <strong>{context.role.toUpperCase()} · DISPLAY ONLY</strong>
          <small>API reader: VIEWER · development header unverified</small>
        </div>
      </div>
    </header>
  )
}

function Metric({ label, value, hint, tone }: { label: string; value: ReactNode; hint: string; tone?: string }) {
  return (
    <div className={styles.metric} data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

function objectMarkerStyle(object: V1EnvironmentalObject, area: OeiNarrativeSnapshot["missionArea"]): CSSProperties | null {
  const objectBox = object.spatialBounds?.boundingBox
  const areaBox = area?.bounds?.boundingBox
  if (!objectBox || !areaBox) return null
  const width = areaBox.east - areaBox.west
  const height = areaBox.north - areaBox.south
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  const longitude = (objectBox.west + objectBox.east) / 2
  const latitude = (objectBox.south + objectBox.north) / 2
  return {
    left: `${Math.max(4, Math.min(96, ((longitude - areaBox.west) / width) * 100))}%`,
    top: `${Math.max(4, Math.min(96, (1 - (latitude - areaBox.south) / height) * 100))}%`,
  }
}

function ContextMap({
  snapshot,
  selectedObjectId,
  onSelect,
}: {
  snapshot: OeiNarrativeSnapshot
  selectedObjectId: string | null
  onSelect: (object: V1EnvironmentalObject) => void
}) {
  const positioned = snapshot.objects
    .map((object) => ({ object, style: objectMarkerStyle(object, snapshot.missionArea) }))
    .filter((item): item is { object: V1EnvironmentalObject; style: CSSProperties } => Boolean(item.style))
  return (
    <div className={styles.mapPanel}>
      <div className={styles.mapHeader}>
        <div><span className={styles.eyebrow}>Map / context summary</span><strong>{snapshot.missionArea?.name ?? "AREA UNBOUND"}</strong></div>
        <span>{positioned.length ? `${positioned.length} LOCATED` : "GEOMETRY UNAVAILABLE"}</span>
      </div>
      {positioned.length ? (
        <div className={styles.contextMap} role="group" aria-label={`Selectable sanitized or mission-bounded context plot for ${snapshot.missionArea?.name ?? "the selected area"}`}>
          <div className={styles.mapGrid} aria-hidden="true" />
          {positioned.map(({ object, style }) => (
            <button
              key={object.id}
              type="button"
              style={style}
              data-domain={object.domain}
              data-selected={selectedObjectId === object.id}
              title={`${object.name} · ${DOMAIN_LABELS[object.domain]}`}
              aria-label={`Select ${object.name}, ${DOMAIN_LABELS[object.domain]}`}
              onClick={() => onSelect(object)}
            >
              <span />
              <b>{object.name}</b>
            </button>
          ))}
          <span className={styles.mapNorth}>N</span>
          <span className={styles.mapDisclaimer}>{snapshot.context.mode === "simulated" ? "NORMALIZED SANITIZED GRID" : "SOURCE GEOMETRY · NOT EARTH SIMULATOR"}</span>
        </div>
      ) : (
        <div className={styles.mapEmpty}>
          <MapPinned aria-hidden="true" />
          <strong>No bounded map context</strong>
          <p>Mission-area or object geometry is unavailable. Objects are not assigned plausible positions.</p>
        </div>
      )}
      <div className={styles.domainStrip}>
        {Object.entries(DOMAIN_LABELS).map(([domain, label]) => {
          const count = snapshot.objects.filter((object) => object.domain === domain).length
          return <span key={domain} data-domain={domain}><i />{label}<b>{count ? count : "—"}</b></span>
        })}
      </div>
    </div>
  )
}

function ObjectList({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: OeiNarrativeSnapshot
  selectedId: string | null
  onSelect: (object: V1EnvironmentalObject) => void
}) {
  if (snapshot.objects.length === 0) {
    return <div className={styles.compactEmpty}><Layers3 aria-hidden="true" /><strong>No environmental objects</strong><span>Nothing is generated to populate this context.</span></div>
  }
  return (
    <div className={styles.objectList}>
      {snapshot.objects.map((object) => (
        <button key={object.id} type="button" aria-pressed={selectedId === object.id} onClick={() => onSelect(object)}>
          <span className={styles.domainGlyph} data-domain={object.domain} />
          <span>
            <strong>{object.name}</strong>
            <small>{DOMAIN_LABELS[object.domain]} · {object.status.toUpperCase()} · {object.freshness.state.toUpperCase()}</small>
          </span>
          <b>{object.changes.length ? `${object.changes.length} Δ` : "NO Δ"}</b>
        </button>
      ))}
    </div>
  )
}

function WorkflowRail({
  stage,
  claims,
  snapshot,
  onStage,
}: {
  stage: OeiWorkflowStage
  claims: readonly OeiClaim[]
  snapshot: OeiNarrativeSnapshot
  onStage: (stage: OeiWorkflowStage) => void
}) {
  const currentIndex = WORKFLOW.findIndex((item) => item.id === stage)
  return (
    <div className={styles.workflowRail} aria-label="Narrative workflow">
      {WORKFLOW.map((step, index) => {
        const blockers = workflowBlockers(step.id, claims, snapshot.evidence, snapshot.objects, snapshot.reviews, false)
        const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : blockers.length ? "blocked" : "available"
        return (
          <button key={step.id} type="button" data-state={state} aria-current={state === "current" ? "step" : undefined} onClick={() => onStage(step.id)}>
            <span>{state === "complete" ? <Check aria-hidden="true" /> : blockers.length ? <LockKeyhole aria-hidden="true" /> : step.short}</span>
            <strong>{step.label}</strong>
            <small>{blockers.length ? `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}` : state.toUpperCase()}</small>
          </button>
        )
      })}
      <div className={styles.workflowBoundary}>
        <ShieldCheck aria-hidden="true" />
        <span><strong>Human-owned boundary</strong><small>No external send or machine approval</small></span>
      </div>
    </div>
  )
}

function ClaimCard({
  claim,
  snapshot,
  changed,
  selected,
  readOnly,
  onSelect,
  onText,
  onRemove,
}: {
  claim: OeiClaim
  snapshot: OeiNarrativeSnapshot
  changed: boolean | null
  selected: boolean
  readOnly: boolean
  onSelect: () => void
  onText: (text: string) => void
  onRemove: () => void
}) {
  const assessment = assessClaim(claim, snapshot.evidence, snapshot.objects)
  return (
    <article className={styles.claimCard} data-state={assessment.state} data-selected={selected}>
      <button type="button" className={styles.claimSelect} onClick={onSelect} aria-label={`Select claim ${claim.id}`}>
        <span className={styles.claimIndex}>{claim.id.split(".").at(-1)?.slice(0, 3).toUpperCase()}</span>
        <span className={styles.claimState}>{assessment.state.toUpperCase()}</span>
        {changed === null ? <span className={styles.changeUnknown}>Δ UNAVAILABLE</span> : changed ? <span className={styles.changedChip}>CHANGED</span> : <span className={styles.unchangedChip}>UNCHANGED</span>}
      </button>
      <textarea
        value={claim.text}
        rows={3}
        aria-label={`Claim wording for ${claim.id}`}
        readOnly={readOnly}
        onFocus={onSelect}
        onChange={(event) => onText(event.target.value)}
      />
      <div className={styles.claimFooter}>
        <span><Database aria-hidden="true" /> {claim.evidenceIds.length ? `${claim.evidenceIds.length} linked` : "NO EVIDENCE"}</span>
        <span><Layers3 aria-hidden="true" /> {claim.objectIds.length ? `${claim.objectIds.length} object${claim.objectIds.length === 1 ? "" : "s"}` : "NO OBJECT"}</span>
        <span><CircleDashed aria-hidden="true" /> {confidenceText(claim.confidence.score)}</span>
        {!readOnly ? <button type="button" onClick={onRemove}><Trash2 aria-hidden="true" /> Remove local</button> : null}
      </div>
      {assessment.state === "blocked" ? (
        <ul className={styles.claimBlockers}>{assessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      ) : null}
    </article>
  )
}

function BriefingCanvas({
  draft,
  snapshot,
  selectedClaimId,
  changedIds,
  hasBaseline,
  readOnly,
  onDraft,
  onClaimSelect,
  onClaimText,
  onRemoveClaim,
  onAddClaim,
}: {
  draft: OeiLocalDraft
  snapshot: OeiNarrativeSnapshot
  selectedClaimId: string | null
  changedIds: Set<string>
  hasBaseline: boolean
  readOnly: boolean
  onDraft: (draft: OeiLocalDraft) => void
  onClaimSelect: (id: string) => void
  onClaimText: (id: string, text: string) => void
  onRemoveClaim: (id: string) => void
  onAddClaim: () => void
}) {
  return (
    <section className={styles.canvasPanel} aria-labelledby="briefing-canvas-heading">
      <header className={styles.panelHeader}>
        <div><span className={styles.eyebrow}>Structured briefing canvas</span><h2 id="briefing-canvas-heading">Environmental intelligence package</h2></div>
        <span className={styles.localChip}><Save aria-hidden="true" /> LOCAL DRAFT · MUTABLE</span>
      </header>
      <div className={styles.canvasFields}>
        <label>
          <span>Package title</span>
          <input value={draft.title} readOnly={readOnly} placeholder="Operator-entered title" onChange={(event) => onDraft({ ...draft, title: event.target.value })} />
        </label>
        <label>
          <span>Executive summary</span>
          <textarea value={draft.executiveSummary} readOnly={readOnly} rows={4} placeholder="Operator-entered summary. No wording is generated." onChange={(event) => onDraft({ ...draft, executiveSummary: event.target.value })} />
        </label>
      </div>
      <div className={styles.claimSectionHeader}>
        <div><strong>Claims</strong><span>Every accepted claim must resolve to source evidence and supporting environmental objects.</span></div>
        {!readOnly ? <button type="button" className={styles.quietButton} onClick={onAddClaim}><Plus aria-hidden="true" /> Add local claim</button> : null}
      </div>
      <div className={styles.claimStack}>
        {draft.claims.length ? draft.claims.map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            snapshot={snapshot}
            changed={hasBaseline ? changedIds.has(claim.id) : null}
            selected={claim.id === selectedClaimId}
            readOnly={readOnly}
            onSelect={() => onClaimSelect(claim.id)}
            onText={(text) => onClaimText(claim.id, text)}
            onRemove={() => onRemoveClaim(claim.id)}
          />
        )) : <div className={styles.canvasEmpty}><FileText aria-hidden="true" /><strong>No claims in this local draft</strong><p>Add a claim and link it to existing evidence. The composer will not create wording to fill the canvas.</p></div>}
      </div>
    </section>
  )
}

function EvidenceInspector({
  snapshot,
  draft,
  selectedClaimId,
  selectedEvidenceId,
  readOnly,
  onEvidenceSelect,
  onDraft,
}: {
  snapshot: OeiNarrativeSnapshot
  draft: OeiLocalDraft
  selectedClaimId: string | null
  selectedEvidenceId: string | null
  readOnly: boolean
  onEvidenceSelect: (evidence: V1EvidenceRecord) => void
  onDraft: (draft: OeiLocalDraft) => void
}) {
  const claim = draft.claims.find((item) => item.id === selectedClaimId) ?? null
  const evidence = snapshot.evidence.find((item) => item.id === selectedEvidenceId) ?? snapshot.evidence.find((item) => claim?.evidenceIds.includes(item.id)) ?? snapshot.evidence[0] ?? null
  const toggleEvidence = (item: V1EvidenceRecord) => {
    if (!claim || readOnly) return
    const linked = claim.evidenceIds.includes(item.id)
    const evidenceIds = linked ? claim.evidenceIds.filter((id) => id !== item.id) : [...claim.evidenceIds, item.id]
    const objectIds = linked
      ? claim.objectIds
      : [...new Set([...claim.objectIds, ...item.objectIds])]
    onDraft(updateLocalClaim(draft, claim.id, { evidenceIds, objectIds }))
    onEvidenceSelect(item)
  }
  return (
    <aside className={styles.inspectorPanel} aria-labelledby="evidence-inspector-heading">
      <header className={styles.panelHeader}>
        <div><span className={styles.eyebrow}>Evidence inspector</span><h2 id="evidence-inspector-heading">Claim support & provenance</h2></div>
        <span className={styles.countChip}>{countText(snapshot.evidence.length, "UNAVAILABLE")}</span>
      </header>
      {snapshot.evidence.length ? (
        <div className={styles.evidencePicker}>
          {snapshot.evidence.map((item) => (
            <button key={item.id} type="button" aria-pressed={evidence?.id === item.id} onClick={() => onEvidenceSelect(item)}>
              <Database aria-hidden="true" />
              <span><strong>{item.title}</strong><small>{item.sourceId} · {formatUtc(item.observedAt)}</small></span>
              <b>{claim?.evidenceIds.includes(item.id) ? "LINKED" : item.verificationState.toUpperCase()}</b>
            </button>
          ))}
        </div>
      ) : <div className={styles.compactEmpty}><FileSearch aria-hidden="true" /><strong>No evidence records</strong><span>Claims cannot pass evidence check.</span></div>}
      {evidence ? (
        <div className={styles.evidenceDetail}>
          {evidence.synthetic ? <div className={styles.syntheticFlag}>SIMULATED · SANITIZED EVIDENCE</div> : null}
          <h3>{evidence.title}</h3>
          <p>{evidence.summary || "No source summary supplied."}</p>
          {claim ? (
            <button type="button" className={claim.evidenceIds.includes(evidence.id) ? styles.unlinkButton : styles.linkButton} disabled={readOnly} onClick={() => toggleEvidence(evidence)}>
              {claim.evidenceIds.includes(evidence.id) ? <X aria-hidden="true" /> : <GitBranch aria-hidden="true" />}
              {claim.evidenceIds.includes(evidence.id) ? "Unlink from selected local claim" : "Link to selected local claim"}
            </button>
          ) : <p className={styles.mutedLine}>Select a claim to manage local evidence links.</p>}
          <dl className={styles.factGrid}>
            <div><dt>Observed</dt><dd>{formatUtc(evidence.observedAt)}</dd></div>
            <div><dt>Received</dt><dd>{formatUtc(evidence.receivedAt)}</dd></div>
            <div><dt>Confidence</dt><dd>{confidenceText(evidence.confidence.score)} · {evidence.confidence.label.toUpperCase()}</dd></div>
            <div><dt>Verification</dt><dd>{evidence.verificationState.toUpperCase()}</dd></div>
            <div><dt>Integrity</dt><dd>{evidence.integrityState.toUpperCase()}</dd></div>
            <div><dt>Mode</dt><dd>{evidence.dataMode.toUpperCase()}</dd></div>
          </dl>
          <section className={styles.inspectorSection}>
            <h4>Confidence basis</h4>
            <p>{evidence.confidenceBasis}</p>
          </section>
          <section className={styles.inspectorSection}>
            <h4>Source reference</h4>
            <code>{evidence.sourceRef}</code>
          </section>
          <section className={styles.inspectorSection}>
            <h4>Lineage</h4>
            <ul>
              {evidence.lineage.sourceRecordIds.map((id) => <li key={id}>Source record · <code>{id}</code></li>)}
              {evidence.lineage.parentEvidenceIds.map((id) => <li key={id}>Parent evidence · <code>{id}</code></li>)}
              {evidence.lineage.transformations.map((item) => <li key={item.id}>Transform · {item.name} {item.version}</li>)}
              {!evidence.lineage.sourceRecordIds.length && !evidence.lineage.parentEvidenceIds.length && !evidence.lineage.transformations.length ? <li>Lineage object is present but contains no lineage entries.</li> : null}
            </ul>
          </section>
        </div>
      ) : null}
    </aside>
  )
}

function ClaimDetailEditor({
  draft,
  claimId,
  readOnly,
  onDraft,
}: {
  draft: OeiLocalDraft
  claimId: string | null
  readOnly: boolean
  onDraft: (draft: OeiLocalDraft) => void
}) {
  const claim = draft.claims.find((item) => item.id === claimId)
  if (!claim) return <div className={styles.compactEmpty}><FileCheck2 aria-hidden="true" /><strong>Select a claim</strong><span>Uncertainty, caveats, and competing explanations stay claim-specific.</span></div>
  const setLines = (field: "caveats" | "competingExplanations", value: string) =>
    onDraft(updateLocalClaim(draft, claim.id, { [field]: value.split("\n").map((line) => line.trim()).filter(Boolean) }))
  return (
    <div className={styles.claimDetailEditor}>
      <label><span>Uncertainty</span><textarea rows={3} readOnly={readOnly} value={claim.uncertainty} onChange={(event) => onDraft(updateLocalClaim(draft, claim.id, { uncertainty: event.target.value }))} /></label>
      <label><span>Caveats · one per line</span><textarea rows={3} readOnly={readOnly} value={claim.caveats.join("\n")} onChange={(event) => setLines("caveats", event.target.value)} /></label>
      <label><span>Competing explanations · one per line</span><textarea rows={3} readOnly={readOnly} value={claim.competingExplanations.join("\n")} onChange={(event) => setLines("competingExplanations", event.target.value)} /></label>
      <div className={styles.authoringBasis}><span>Wording basis</span><strong>{claim.authoringBasis.replace("_", " ").toUpperCase()}</strong><small>Confidence remains source-derived; local wording does not create confidence.</small></div>
    </div>
  )
}

function VersionCompare({
  versions,
  selectedId,
  currentClaims,
  onSelect,
}: {
  versions: readonly OeiNarrativeVersion[]
  selectedId: string | null
  currentClaims: readonly OeiClaim[]
  onSelect: (id: string) => void
}) {
  const selected = versions.find((item) => item.id === selectedId) ?? versions[0] ?? null
  const changed = selected ? deriveChangedClaimIds(currentClaims, selected.claims) : new Set<string>()
  const removed = selected ? selected.claims.filter((claim) => !currentClaims.some((item) => item.id === claim.id)) : []
  return (
    <div className={styles.versionCompare}>
      <div className={styles.versionToolbar}>
        <div><GitCompareArrows aria-hidden="true" /><span><strong>Changed since last brief</strong><small>Current local draft vs selected baseline</small></span></div>
        <select value={selected?.id ?? ""} onChange={(event) => onSelect(event.target.value)} disabled={!versions.length} aria-label="Version comparison baseline">
          {!versions.length ? <option value="">No baseline available</option> : null}
          {versions.map((version) => <option key={version.id} value={version.id}>{version.label} · v{version.ordinal}</option>)}
        </select>
      </div>
      {selected ? (
        <div className={styles.diffSummary}>
          <div><span>Baseline</span><strong>{selected.label}</strong><small>{formatUtc(selected.createdAt)} · {selected.immutable ? "IMMUTABLE FIXTURE/RECORD" : "MUTABLE BROWSER LOCAL"}</small></div>
          <div><span>Changed claims</span><strong>{changed.size ? changed.size : "NONE"}</strong><small>{changed.size ? [...changed].join(" · ") : "Wording and links match the selected baseline."}</small></div>
          <div><span>Removed claims</span><strong>{removed.length ? removed.length : "NONE"}</strong><small>{removed.length ? removed.map((claim) => claim.id).join(" · ") : "No baseline claims removed."}</small></div>
        </div>
      ) : <div className={styles.compactEmpty}><GitCompareArrows aria-hidden="true" /><strong>Comparison unavailable</strong><span>Save a browser-local version before claiming a change since the prior brief.</span></div>}
    </div>
  )
}

function ReviewAndPublication({ snapshot }: { snapshot: OeiNarrativeSnapshot }) {
  return (
    <div className={styles.reviewPublicationGrid}>
      <section className={styles.supportPanel}>
        <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Human review</span><h2>Reviewer assignments</h2></div><span className={styles.countChip}>{countText(snapshot.reviews.length, "UNAVAILABLE")}</span></header>
        {snapshot.reviews.length ? <div className={styles.reviewList}>{snapshot.reviews.map((review) => (
          <article key={review.id} data-state={review.state}>
            <UserRoundCheck aria-hidden="true" />
            <div><strong>{review.kind.replace("_", " ")}</strong><span>{review.assignedTo ?? "UNASSIGNED"} · {review.state.toUpperCase()}</span><small>{review.judgment ?? "No reviewer judgment recorded."}</small></div>
            <b>{review.synthetic ? "SIM" : `R${review.revision}`}</b>
          </article>
        ))}</div> : <div className={styles.compactEmpty}><UserRoundCheck aria-hidden="true" /><strong>No reviewer assignment</strong><span>The local draft cannot manufacture a durable human review.</span></div>}
      </section>
      <section className={styles.supportPanel}>
        <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Immutable history</span><h2>Publication history</h2></div><span className={styles.countChip}>{countText(snapshot.publicationHistory.length, "UNAVAILABLE")}</span></header>
        {snapshot.publicationHistory.length ? <div className={styles.publicationList}>{snapshot.publicationHistory.map((record) => (
          <article key={record.id}>
            <Archive aria-hidden="true" />
            <div><strong>{record.packageLabel}</strong><span>{record.releaseMarking} · {record.releaseScope}</span><small>{formatUtc(record.approvedAt)} · {record.approvedBy}</small></div>
            <b>{record.synthetic ? "SIMULATED" : record.immutable ? "LOCKED" : "MUTABLE"}</b>
          </article>
        ))}</div> : <div className={styles.compactEmpty}><Archive aria-hidden="true" /><strong>No publication repository</strong><span>Publication history is unavailable, not empty-by-measurement. Preview creates no record.</span></div>}
      </section>
    </div>
  )
}

function Dimension({ label, value }: { label: string; value: OeiDimensionState | string }) {
  return <span data-value={value}><small>{label}</small><b>{value.replaceAll("_", " ").toUpperCase()}</b></span>
}

function SourceTruth({ snapshot }: { snapshot: OeiNarrativeSnapshot }) {
  return (
    <section className={styles.sourcePanel}>
      <header className={styles.panelHeader}>
        <div><span className={styles.eyebrow}>Operational truth matrix</span><h2>Reachability · identity · schema · freshness · provenance · coverage · data</h2></div>
        <span className={styles.schemaChip}>{snapshot.schema}</span>
      </header>
      <div className={styles.sourceTable}>
        {snapshot.sources.map((source) => (
          <article key={source.id} data-transport={source.transport}>
            <div className={styles.sourceIdentity}>
              {source.transport === "reachable" ? <CheckCircle2 aria-hidden="true" /> : source.synthetic ? <Sparkles aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
              <span><strong>{source.label}</strong><code>{source.endpoint}</code><small>{source.note}</small></span>
            </div>
            <div className={styles.dimensionGrid}>
              <Dimension label="Transport" value={source.transport} />
              <Dimension label="Identity" value={source.identityVerified ? "verified" : "unverified"} />
              <Dimension label="Schema" value={source.schema} />
              <Dimension label="Freshness" value={source.freshness} />
              <Dimension label="Provenance" value={source.provenance} />
              <Dimension label="Coverage" value={source.coverage} />
              <Dimension label="Data" value={source.dataPresence} />
            </div>
            <div className={styles.sourceTimes}><span>Observed <b>{formatUtc(source.observedAt)}</b></span><span>Received <b>{formatUtc(source.receivedAt)}</b></span><span>Records <b>{source.recordCount === null ? "UNKNOWN" : source.recordCount}</b></span></div>
          </article>
        ))}
      </div>
      <details className={styles.gapDetails}>
        <summary>{snapshot.gaps.length} declared capability / coverage gaps</summary>
        <ul>{snapshot.gaps.map((gap, index) => <li key={`${gap}-${index}`}>{gap}</li>)}</ul>
      </details>
    </section>
  )
}

function ActivityPanel({ snapshot }: { snapshot: OeiNarrativeSnapshot }) {
  return (
    <section className={styles.activityPanel}>
      <header className={styles.panelHeader}><div><span className={styles.eyebrow}>{snapshot.context.mode === "replay" ? "Time-bounded replay" : "Append-only context"}</span><h2>Mission activity & handoffs</h2></div><span className={styles.countChip}>{countText(snapshot.activity.length + snapshot.handoffs.length, "NO RECORDS")}</span></header>
      <div className={styles.activityGrid}>
        {snapshot.activity.map((item) => <article key={item.id}><Activity aria-hidden="true" /><span><strong>{item.actionType.replaceAll("_", " ")}</strong><small>{formatUtc(item.occurredAt)} · {item.actorId} · seq {item.sequence}</small></span><b>{item.dataMode.toUpperCase()}</b></article>)}
        {snapshot.handoffs.map((item) => <article key={item.id}><ArrowRight aria-hidden="true" /><span><strong>{item.sourceApplication} → {item.targetApplication}</strong><small>{formatUtc(item.createdAt)} · context {item.contextId}</small></span><b>HANDOFF</b></article>)}
        {!snapshot.activity.length && !snapshot.handoffs.length ? <div className={styles.compactEmpty}><Clock3 aria-hidden="true" /><strong>No activity or handoff records</strong><span>No event is generated to fill the timeline.</span></div> : null}
      </div>
    </section>
  )
}

function HandoffLinks({ context }: { context: OeiContext }) {
  const links: Array<{ route: Parameters<typeof buildOeiHandoffLink>[0]; label: string; hint: string }> = [
    { route: "situationalAwareness", label: "Situational Awareness", hint: "Object and map context" },
    { route: "dataFusion", label: "Data Fusion", hint: "Source and relationship context" },
    { route: "threatAssessment", label: "Threat Assessment", hint: "Consequence and uncertainty" },
    { route: "commandControl", label: "Command & Control", hint: "Human-owned mission context" },
    { route: "stackInventory", label: "Stack Inventory", hint: "Owning service readiness" },
  ]
  return <nav className={styles.handoffLinks} aria-label="Context-preserving app links">{links.map((link) => <Link key={link.route} href={buildOeiHandoffLink(link.route, context)}><span><strong>{link.label}</strong><small>{link.hint}</small></span><ChevronRight aria-hidden="true" /></Link>)}</nav>
}

function PackagePreview({
  draft,
  snapshot,
  onClose,
}: {
  draft: OeiLocalDraft
  snapshot: OeiNarrativeSnapshot
  onClose: () => void
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      } else if (event.key === "Tab") {
        event.preventDefault()
        closeButtonRef.current?.focus()
      }
    }
    closeButtonRef.current?.focus()
    document.addEventListener("keydown", keepFocusInside)
    return () => {
      document.removeEventListener("keydown", keepFocusInside)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className={styles.previewOverlay} role="dialog" aria-modal="true" aria-labelledby="package-preview-title">
      <section className={styles.previewSheet}>
        <header>
          <div><span>UNCLASSIFIED · PREVIEW ONLY · NO EXTERNAL DELIVERY</span><h2 id="package-preview-title">{draft.title || "Untitled local draft"}</h2><p>{draft.executiveSummary || "No executive summary entered."}</p></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close package preview"><X aria-hidden="true" /></button>
        </header>
        <div className={styles.previewContext}><span>Mission <b>{snapshot.context.missionLabel}</b></span><span>Area <b>{snapshot.context.missionAreaLabel}</b></span><span>Window <b>{snapshot.context.timeWindow}</b></span><span>Mode <b>{snapshot.context.mode.toUpperCase()}</b></span></div>
        <div className={styles.previewClaims}>{draft.claims.map((claim, index) => {
          const assessment = assessClaim(claim, snapshot.evidence, snapshot.objects)
          return <article key={claim.id} data-state={assessment.state}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{claim.text || "Empty claim"}</strong><small>{assessment.state.toUpperCase()} · evidence {joinOrUnknown(claim.evidenceIds)} · objects {joinOrUnknown(claim.objectIds)}</small><p>Uncertainty: {claim.uncertainty || "Not supplied"}</p></div></article>
        })}</div>
        <footer><LockKeyhole aria-hidden="true" /><span><strong>Preview rendered locally</strong><small>No file exported, no publication record created, no external request sent.</small></span><button type="button" disabled>Export unavailable</button></footer>
      </section>
    </div>
  )
}

export function OeiNarrativeDashboard() {
  const searchParams = useSearchParams()
  const serializedParams = searchParams.toString()
  const parsedContext = useMemo(() => parseOeiContext(new URLSearchParams(serializedParams)), [serializedParams])
  const [context, setContext] = useState<OeiContext>(parsedContext)
  const [snapshot, setSnapshot] = useState<OeiNarrativeSnapshot | null>(null)
  const [draft, setDraft] = useState<OeiLocalDraft | null>(null)
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)
  const [comparisonVersionId, setComparisonVersionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => setContext(parsedContext), [parsedContext])

  const providerKey = `${context.missionId}|${context.contextId ?? ""}|${context.missionAreaId}|${context.timeWindow}|${context.mode}|${refreshKey}`
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)
    oeiNarrativeProvider
      .load(context, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setSnapshot(next)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
    // Selection and display-role changes do not reload source collections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerKey])

  useEffect(() => {
    if (!snapshot) return
    const contextKey = oeiDraftContextKey(snapshot)
    const storageKey = `${OEI_LOCAL_DRAFT_STORAGE_KEY}:${contextKey}`
    setDraft((current) => {
      if (current?.contextKey === contextKey) return current
      let stored: OeiLocalDraft | null = null
      try {
        stored = parseOeiLocalDraft(window.localStorage.getItem(storageKey), contextKey)
      } catch {
        stored = null
      }
      return stored ?? createOeiLocalDraft(snapshot)
    })
  }, [snapshot])

  useEffect(() => {
    if (!draft) return
    if (!draft.claims.some((claim) => claim.id === selectedClaimId)) {
      setSelectedClaimId(draft.claims[0]?.id ?? null)
    }
  }, [draft, selectedClaimId])

  const commitContext = useCallback((next: OeiContext) => {
    setContext(next)
    window.history.replaceState(window.history.state, "", buildOeiSelfLink(next))
  }, [])

  const hasLocalSelection = Boolean(context.selectedObjectId || context.selectedEvidenceId || context.selectedSourceId)
  const activeContext = snapshot
    ? {
        ...snapshot.context,
        ...(hasLocalSelection
          ? {
              selectedObjectId: context.selectedObjectId,
              selectedEvidenceId: context.selectedEvidenceId,
              selectedSourceId: context.selectedSourceId,
            }
          : {}),
      }
    : context
  const selectedObject = snapshot?.objects.find((object) => object.id === activeContext.selectedObjectId) ?? null
  const selectedEvidence = snapshot?.evidence.find((evidence) => evidence.id === activeContext.selectedEvidenceId) ?? null
  const readOnlyMode = activeContext.mode === "replay" || activeContext.mode === "forecast"

  const selectObject = (object: V1EnvironmentalObject) => {
    commitContext(withOeiSelection(activeContext, {
      objectId: object.id,
      evidenceId: object.evidenceIds[0] ?? null,
      sourceId: object.sourceIds[0] ?? null,
    }))
  }
  const selectEvidence = (evidence: V1EvidenceRecord) => {
    const owningObject = snapshot?.objects.find((object) => evidence.objectIds.includes(object.id))
    commitContext(withOeiSelection(activeContext, {
      objectId: owningObject?.id ?? activeContext.selectedObjectId,
      evidenceId: evidence.id,
      sourceId: evidence.sourceId,
    }))
  }

  const allVersions = useMemo(() => {
    const byId = new Map<string, OeiNarrativeVersion>()
    for (const version of [...(snapshot?.versions ?? []), ...(draft?.versions ?? [])]) byId.set(version.id, version)
    return [...byId.values()].sort((left, right) => right.ordinal - left.ordinal)
  }, [draft?.versions, snapshot?.versions])
  useEffect(() => {
    if (!allVersions.some((version) => version.id === comparisonVersionId)) setComparisonVersionId(allVersions[0]?.id ?? null)
  }, [allVersions, comparisonVersionId])
  const comparisonVersion = allVersions.find((version) => version.id === comparisonVersionId) ?? null
  const changedIds = useMemo(
    () => draft && comparisonVersion ? deriveChangedClaimIds(draft.claims, comparisonVersion.claims) : new Set<string>(),
    [comparisonVersion, draft],
  )

  const saveDraft = (versioned: boolean) => {
    if (!draft || !snapshot) return
    const next = versioned ? appendLocalVersion(draft, { actor: `${activeContext.role} display context · browser local` }) : { ...draft, savedAt: new Date().toISOString() }
    try {
      const key = `${OEI_LOCAL_DRAFT_STORAGE_KEY}:${oeiDraftContextKey(snapshot)}`
      window.localStorage.setItem(key, serializeOeiLocalDraft(next))
      setDraft(next)
      setDraftNotice(versioned ? "Browser-local version saved. It is mutable and not a publication record." : "Browser-local draft saved. No server persistence occurred.")
    } catch {
      setDraftNotice("Browser storage is unavailable. The draft remains only in this open page.")
    }
  }

  const tryStage = (target: OeiWorkflowStage) => {
    if (!draft || !snapshot) return
    const currentIndex = WORKFLOW.findIndex((item) => item.id === draft.stage)
    const targetIndex = WORKFLOW.findIndex((item) => item.id === target)
    if (targetIndex > currentIndex + 1) {
      setWorkflowNotice("Complete the preceding workflow step first.")
      return
    }
    const blockers = workflowBlockers(target, draft.claims, snapshot.evidence, snapshot.objects, snapshot.reviews, false)
    if (blockers.length) {
      setWorkflowNotice(blockers.join(" "))
      return
    }
    setDraft({ ...draft, stage: target })
    setWorkflowNotice(`${WORKFLOW[targetIndex].label} selected in the browser-local draft. No durable review or publication record was written.`)
  }

  const addClaim = () => {
    if (!draft) return
    const id = `local.claim.${Date.now()}`
    const claim: OeiClaim = {
      id,
      text: "",
      objectIds: selectedObject ? [selectedObject.id] : [],
      evidenceIds: selectedEvidence ? [selectedEvidence.id] : [],
      confidence: { score: null, label: "not_assessed", basis: "Operator-entered local wording has no generated confidence." },
      uncertainty: "",
      caveats: [],
      competingExplanations: [],
      changedSincePrevious: true,
      authoringBasis: "operator_entered",
    }
    setDraft({ ...draft, claims: [...draft.claims, claim] })
    setSelectedClaimId(id)
  }

  const sourceSuccesses = snapshot?.sources.filter((source) => source.transport === "reachable" && source.schema === "valid").length ?? 0
  const blockedClaims = draft && snapshot ? draft.claims.filter((claim) => assessClaim(claim, snapshot.evidence, snapshot.objects).state === "blocked").length : 0
  const condition: OeiCondition = loading && !snapshot ? "loading" : snapshot?.condition ?? "unavailable"
  const notice = loadError ?? snapshot?.note ?? "Binding the v1 environmental intelligence contract."

  return (
    <main className={styles.page} data-mode={activeContext.mode}>
      <ContextHeader context={activeContext} snapshot={snapshot} loading={loading} onChange={commitContext} onRefresh={() => setRefreshKey((value) => value + 1)} />
      <ConditionNotice condition={condition} note={notice} />

      <section className={styles.metrics} aria-label="OEI composer summary">
        <Metric label="Environmental objects" value={snapshot ? countText(snapshot.objects.length) : "—"} hint={snapshot?.objects.length ? "Explicit v1 or simulated object records." : "No object records; not a measured environmental zero."} />
        <Metric label="Claim evidence gate" value={draft ? blockedClaims ? `${blockedClaims} BLOCKED` : draft.claims.length ? "HOLDS" : "NO CLAIMS" : "—"} hint="Every claim must trace to existing object-linked evidence." tone={blockedClaims ? "warn" : "ok"} />
        <Metric label="Source contracts" value={snapshot ? sourceSuccesses ? `${sourceSuccesses}/${snapshot.sources.length} VALID` : "NO VALID RESPONSE" : "—"} hint="Reachable plus OEI-required v1 shape; identity remains unverified." />
        <Metric label="Narrative persistence" value={draft ? "BROWSER LOCAL" : "UNAVAILABLE"} hint="Mutable local storage only; no durable publication repository." />
        <Metric label="Release boundary" value="PREVIEW ONLY" hint="UNCLASSIFIED commercial surface; no external send or export." />
      </section>

      {snapshot && draft ? (
        <>
          <WorkflowRail stage={draft.stage} claims={draft.claims} snapshot={snapshot} onStage={tryStage} />
          {workflowNotice ? <div className={styles.localNotice} role="status"><AlertTriangle aria-hidden="true" /><span>{workflowNotice}</span><button type="button" onClick={() => setWorkflowNotice(null)} aria-label="Dismiss workflow notice"><X aria-hidden="true" /></button></div> : null}
          <div className={styles.primaryGrid}>
            <section className={styles.contextPanel} aria-label="Environmental context">
              <ContextMap snapshot={snapshot} selectedObjectId={selectedObject?.id ?? null} onSelect={selectObject} />
              <div className={styles.subpanelHeader}><div><span className={styles.eyebrow}>Supporting objects</span><strong>Environmental object queue</strong></div><span>{countText(snapshot.objects.length)}</span></div>
              <ObjectList snapshot={snapshot} selectedId={selectedObject?.id ?? null} onSelect={selectObject} />
              <HandoffLinks context={activeContext} />
            </section>

            <BriefingCanvas
              draft={draft}
              snapshot={snapshot}
              selectedClaimId={selectedClaimId}
              changedIds={changedIds}
              hasBaseline={Boolean(comparisonVersion)}
              readOnly={readOnlyMode}
              onDraft={setDraft}
              onClaimSelect={setSelectedClaimId}
              onClaimText={(id, text) => setDraft(updateLocalClaim(draft, id, { text }))}
              onRemoveClaim={(id) => {
                setDraft({ ...draft, claims: draft.claims.filter((claim) => claim.id !== id) })
                if (selectedClaimId === id) setSelectedClaimId(null)
              }}
              onAddClaim={addClaim}
            />

            <EvidenceInspector
              snapshot={snapshot}
              draft={draft}
              selectedClaimId={selectedClaimId}
              selectedEvidenceId={selectedEvidence?.id ?? null}
              readOnly={readOnlyMode}
              onEvidenceSelect={selectEvidence}
              onDraft={setDraft}
            />
          </div>

          <div className={styles.composerActions}>
            <div>
              <button type="button" className={styles.primaryButton} onClick={() => saveDraft(false)} disabled={readOnlyMode}><Save aria-hidden="true" /> Save browser-local draft</button>
              <button type="button" className={styles.quietButton} onClick={() => saveDraft(true)} disabled={readOnlyMode}><GitCompareArrows aria-hidden="true" /> Snapshot local version</button>
              <button type="button" className={styles.quietButton} onClick={() => setPreviewOpen(true)}><Eye aria-hidden="true" /> Preview package</button>
            </div>
            <span><LockKeyhole aria-hidden="true" /> Publish / export disabled · no external delivery path</span>
          </div>
          {draftNotice ? <div className={styles.localNotice} role="status"><Save aria-hidden="true" /><span>{draftNotice}</span><button type="button" onClick={() => setDraftNotice(null)} aria-label="Dismiss draft notice"><X aria-hidden="true" /></button></div> : null}

          <div className={styles.analysisGrid}>
            <section className={styles.supportPanel}>
              <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Claim analysis</span><h2>Uncertainty · caveats · alternatives</h2></div><span className={styles.countChip}>{selectedClaimId ? "SELECTED" : "NONE"}</span></header>
              <ClaimDetailEditor draft={draft} claimId={selectedClaimId} readOnly={readOnlyMode} onDraft={setDraft} />
            </section>
            <section className={styles.supportPanel}>
              <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Version lineage</span><h2>Local comparison</h2></div><span className={styles.countChip}>{countText(allVersions.length, "NO BASELINE")}</span></header>
              <VersionCompare versions={allVersions} selectedId={comparisonVersionId} currentClaims={draft.claims} onSelect={setComparisonVersionId} />
            </section>
          </div>

          <ReviewAndPublication snapshot={snapshot} />
          <ActivityPanel snapshot={snapshot} />
          <SourceTruth snapshot={snapshot} />
          {previewOpen ? <PackagePreview draft={draft} snapshot={snapshot} onClose={() => setPreviewOpen(false)} /> : null}
        </>
      ) : (
        <div className={styles.routeLoading}>
          {loadError ? <TriangleAlert aria-hidden="true" /> : <LoaderCircle className={styles.spin} aria-hidden="true" />}
          <strong>{loadError ? "No verified OEI snapshot" : "Binding mission and evidence context"}</strong>
          <p>{loadError ?? "The composer will not seed prose, confidence, evidence, or publication history while the provider is unresolved."}</p>
          <button type="button" className={styles.quietButton} onClick={() => setRefreshKey((value) => value + 1)}><RefreshCcw aria-hidden="true" /> Retry</button>
        </div>
      )}
    </main>
  )
}
