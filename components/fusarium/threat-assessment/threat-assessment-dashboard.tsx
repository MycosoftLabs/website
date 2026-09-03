"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Database,
  Droplets,
  FileSearch,
  GitBranch,
  History,
  Layers3,
  Leaf,
  LoaderCircle,
  Mountain,
  RadioTower,
  RefreshCw,
  Route,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wind,
  Workflow,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  buildThreatAssessmentHandoffLink,
  buildThreatAssessmentSelfLink,
  parseThreatAssessmentContext,
} from "@/lib/fusarium/threat-assessment/deep-links"
import { runtimeThreatAssessmentProvider } from "@/lib/fusarium/threat-assessment/provider"
import {
  DOMAIN_LABELS,
  INVESTIGATION_MODES,
  OPERATOR_ROLES,
  REVIEW_DISPOSITIONS,
  THREAT_TIME_WINDOWS,
  type CausalRelationship,
  type EndpointTruth,
  type EnvironmentalAssessment,
  type EnvironmentalDomain,
  type FreshnessState,
  type InvestigationMode,
  type OperatorRole,
  type ThreatAssessmentContext,
  type ThreatAssessmentSnapshot,
  type ThreatCondition,
  type ThreatEvidence,
} from "@/lib/fusarium/threat-assessment/contracts"
import styles from "./threat-assessment.module.css"

const DOMAIN_META: Record<EnvironmentalDomain, { icon: LucideIcon; symbol: string }> = {
  atmosphere: { icon: Wind, symbol: "○" },
  water: { icon: Droplets, symbol: "◇" },
  land: { icon: Mountain, symbol: "□" },
  living: { icon: Leaf, symbol: "✣" },
  infrastructure: { icon: Building2, symbol: "△" },
  process: { icon: Workflow, symbol: "⬡" },
}

const CONDITION_META: Record<
  ThreatCondition,
  { label: string; icon: LucideIcon; tone: string; message: string }
> = {
  loading: {
    label: "LOADING",
    icon: LoaderCircle,
    tone: "loading",
    message: "Checking the contract boundary. No environmental condition is inferred while sources load.",
  },
  empty: {
    label: "COLLECTED EMPTY",
    icon: CircleDashed,
    tone: "empty",
    message: "The mission-scoped collections validated and supplied no assessment candidates. Empty is not environmentally clear.",
  },
  ready: {
    label: "LIVE · DEVELOPMENT",
    icon: CheckCircle2,
    tone: "ready",
    message: "Object-derived assessment candidates are visible with evidence, provenance, and contract gaps.",
  },
  partial: {
    label: "PARTIAL",
    icon: TriangleAlert,
    tone: "partial",
    message: "At least one required collection failed or did not validate. Treat the queue as incomplete.",
  },
  stale: {
    label: "STALE",
    icon: Clock3,
    tone: "stale",
    message: "Assessment candidates exist, but every candidate is stale at its reported source boundary.",
  },
  unavailable: {
    label: "UNAVAILABLE",
    icon: XCircle,
    tone: "error",
    message: "The current v1 boundary is not usable. No operational values or synthetic substitutes were inserted.",
  },
  unauthorized: {
    label: "UNAUTHORIZED",
    icon: ShieldCheck,
    tone: "error",
    message: "The development identity metadata was rejected. Environmental state remains unavailable.",
  },
  replay: {
    label: "REPLAY",
    icon: History,
    tone: "replay",
    message: "Bounded append-only history only. Live environmental collections are not mixed into replay.",
  },
  forecast: {
    label: "FORECAST · CONTRACT GAP",
    icon: Layers3,
    tone: "forecast",
    message: "v1 has no forecast-assessment contract. Current or replay values are not relabelled as forecasts.",
  },
  simulated: {
    label: "SIMULATED · SANITIZED",
    icon: Sparkles,
    tone: "simulated",
    message: "Deterministic workflow exercise only. Scenario records never mix with or write operational state.",
  },
}

function formatUtc(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "TIME UNKNOWN"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(Date.parse(value))
}

function confidenceText(value: EnvironmentalAssessment["confidence"] | ThreatEvidence["confidence"]): string {
  return value.score === null ? "NOT ASSESSED" : `${Math.round(value.score * 100)}% · ${value.label.toUpperCase()}`
}

function freshnessText(value: FreshnessState): string {
  return value === "simulated" ? "SIMULATED CLOCK" : value.toUpperCase()
}

function sentence(value: string): string {
  return value.replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

function ConditionNotice({
  condition,
  note,
}: {
  condition: ThreatCondition
  note: string
}) {
  const meta = CONDITION_META[condition]
  const Icon = meta.icon
  return (
    <div className={`${styles.conditionNotice} ${styles[`condition_${meta.tone}`]}`} role="status">
      <Icon className={condition === "loading" ? styles.spin : undefined} aria-hidden="true" />
      <div>
        <strong>{meta.label}</strong>
        <span>{meta.message}</span>
        <small>{note}</small>
      </div>
    </div>
  )
}

function ModeIntegrity({ mode }: { mode: InvestigationMode }) {
  const wording: Record<InvestigationMode, string> = {
    live: "LIVE queries only · simulated and replay records excluded",
    replay: "REPLAY history only · no live collection substitution",
    forecast: "FORECAST gap · no current values relabelled",
    simulated: "SIMULATED fixture only · no operational collection queried",
  }
  return (
    <div className={styles.modeIntegrity} data-mode={mode}>
      <span>{mode.toUpperCase()}</span>
      <strong>{wording[mode]}</strong>
    </div>
  )
}

function ContextFrame({
  context,
  snapshot,
  loading,
  onChange,
  onRefresh,
}: {
  context: ThreatAssessmentContext
  snapshot: ThreatAssessmentSnapshot | null
  loading: boolean
  onChange: (next: ThreatAssessmentContext) => void
  onRefresh: () => void
}) {
  const contractTruth = snapshot?.sourceTruth.find((source) => source.id === "contract")
  const dataTruth = snapshot?.sourceTruth.filter((source) => !["contract", "readiness"].includes(source.id)) ?? []
  const reachedSchemaSources = dataTruth.filter(
    (source) => source.reachability === "reached" && source.schema === "valid",
  ).length
  const sourceSummary = context.mode === "simulated"
    ? snapshot
      ? "SCENARIO FIXTURE"
      : "LOADING SCENARIO"
    : loading && !snapshot
      ? "CHECKING"
      : dataTruth.length === 0
        ? "NOT REQUESTED"
        : reachedSchemaSources === 0
          ? "NONE REACHED + VALID"
          : `${reachedSchemaSources}/${dataTruth.length} REACHED + VALID`

  const setMode = (mode: InvestigationMode) => {
    const enteringScenario = mode === "simulated"
    const leavingScenario = context.missionId.startsWith("scenario:") && !enteringScenario
    onChange({
      ...context,
      mode,
      missionId: enteringScenario
        ? "scenario:mission-harbor-glass"
        : leavingScenario
          ? "runtime-unscoped"
          : context.missionId,
      missionLabel: enteringScenario
        ? "SANITIZED · Harbor Glass exercise"
        : leavingScenario
          ? "Mission not selected · development environment"
          : context.missionLabel,
      missionAreaId: enteringScenario
        ? "scenario:area-harbor-glass"
        : leavingScenario
          ? "runtime-unscoped"
          : context.missionAreaId,
      missionAreaLabel: enteringScenario
        ? "SANITIZED · Estuary / upland interface"
        : leavingScenario
          ? "Area not selected · development environment"
          : context.missionAreaLabel,
      selectedAssessmentId: null,
      selectedObjectId: null,
      selectedEvidenceId: null,
      selectedSourceId: null,
    })
  }

  return (
    <section className={styles.contextFrame} aria-labelledby="threat-context-heading">
      <div className={styles.contextTitle}>
        <div>
          <div className={styles.eyebrow}>ENVIN / OEI · Investigation workbench</div>
          <h1 id="threat-context-heading">Threat Assessment</h1>
          <p>Environmental conditions, causal evidence, uncertainty, and mission consequence</p>
        </div>
        <div className={styles.contextActions}>
          <span className={styles.schemaChip}>CONTRACT v1 · UNCLASSIFIED</span>
          <button type="button" className={styles.iconButton} onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? styles.spin : undefined} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.contextIdentity}>
        <div>
          <span>Mission</span>
          <strong>{context.missionLabel}</strong>
          <small>{context.missionId}</small>
        </div>
        <div>
          <span>Mission area</span>
          <strong>{context.missionAreaLabel}</strong>
          <small>{context.missionAreaId}</small>
        </div>
        <fieldset className={styles.segmentField}>
          <legend>Time window</legend>
          <div>
            {THREAT_TIME_WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                aria-pressed={context.timeWindow === window}
                onClick={() => onChange({ ...context, timeWindow: window })}
              >
                {window.toUpperCase()}
              </button>
            ))}
          </div>
        </fieldset>
        <label className={styles.roleField}>
          <span>Display role · non-authoritative</span>
          <select
            value={context.role}
            onChange={(event) =>
              onChange({
                ...context,
                role: event.target.value as OperatorRole,
                selectedAssessmentId: null,
                selectedObjectId: null,
                selectedEvidenceId: null,
              })
            }
          >
            {OPERATOR_ROLES.map((role) => (
              <option key={role} value={role}>
                {role.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.modeRow}>
        <fieldset className={styles.segmentField}>
          <legend>Investigation mode</legend>
          <div>
            {INVESTIGATION_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={context.mode === mode}
                onClick={() => setMode(mode)}
              >
                {mode === "simulated" ? "SANITIZED SCENARIO" : mode.toUpperCase()}
              </button>
            ))}
          </div>
        </fieldset>
        <ModeIntegrity mode={context.mode} />
      </div>

      <div className={styles.truthStrip}>
        <div>
          <span>Trust boundary</span>
          <strong>UNCLASSIFIED · COMMERCIAL DEVELOPMENT</strong>
        </div>
        <div>
          <span>Identity</span>
          <strong>
            {snapshot?.identityVerified === false
              ? "DEVELOPMENT HEADER · UNVERIFIED"
              : snapshot?.identityMode
                ? snapshot.identityMode.toUpperCase()
                : "NOT VERIFIED"}
          </strong>
        </div>
        <div>
          <span>v1 endpoint</span>
          <strong>
            {context.mode === "simulated"
              ? "NOT QUERIED"
              : contractTruth
              ? `${contractTruth.reachability.toUpperCase()} · ${contractTruth.schema.toUpperCase()}`
              : "CHECKING"}
          </strong>
        </div>
        <div>
          <span>Required collections</span>
          <strong>{sourceSummary}</strong>
        </div>
        <div>
          <span>Snapshot freshness</span>
          <strong>{snapshot ? formatUtc(snapshot.generatedAt) : "UNKNOWN"}</strong>
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className={styles.metric} title={note}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

function AssessmentQueue({
  assessments,
  selectedId,
  onSelect,
  condition,
}: {
  assessments: EnvironmentalAssessment[]
  selectedId: string | null
  onSelect: (assessment: EnvironmentalAssessment) => void
  condition: ThreatCondition
}) {
  return (
    <section className={`${styles.primaryPanel} ${styles.queuePanel}`} aria-labelledby="assessment-queue-heading">
      <header className={styles.panelHeader}>
        <div>
          <div className={styles.eyebrow}>Ranked triage · explicit fields first</div>
          <h2 id="assessment-queue-heading">Environmental condition queue</h2>
        </div>
        <span className={styles.countChip}>
          {assessments.length > 0
            ? `${assessments.length} CANDIDATE${assessments.length === 1 ? "" : "S"}`
            : condition === "empty"
              ? "COLLECTED EMPTY"
              : condition === "loading"
                ? "CHECKING"
                : "DATA UNAVAILABLE"}
        </span>
      </header>
      <p className={styles.panelNote}>
        Rank uses supplied severity, supplied urgency when present, explicit conflict markers, and typed change-after-review. No hidden probability is added.
      </p>
      <div className={styles.queueScroll}>
        {assessments.length === 0 ? (
          <div className={styles.emptyState}>
            <CircleDashed aria-hidden="true" />
            <strong>{CONDITION_META[condition].label}</strong>
            <span>No assessment candidate is available in this mode and mission scope.</span>
          </div>
        ) : (
          assessments.map((assessment, index) => {
            const DomainIcon = DOMAIN_META[assessment.domain].icon
            const selected = assessment.id === selectedId
            return (
              <button
                type="button"
                className={styles.queueItem}
                data-severity={assessment.severity}
                data-selected={selected ? "true" : "false"}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(assessment)}
                key={assessment.id}
              >
                <div className={styles.queueRank}>{String(index + 1).padStart(2, "0")}</div>
                <div className={styles.queueBody}>
                  <div className={styles.queueTopline}>
                    <span className={styles.severityChip}>{assessment.severity}</span>
                    {assessment.changedSinceReview === true ? <span className={styles.changeChip}>CHANGED</span> : null}
                    {assessment.evidenceConflict === "detected" ? <span className={styles.conflictChip}>CONFLICT</span> : null}
                    <span className={styles.modeChip}>{assessment.synthetic ? "SIMULATED" : assessment.dataMode}</span>
                  </div>
                  <strong className={styles.queueTitle}>{assessment.name}</strong>
                  <span className={styles.queueDomain}>
                    <DomainIcon aria-hidden="true" /> {DOMAIN_LABELS[assessment.domain]}
                  </span>
                  <div className={styles.queueFacts}>
                    <span><em>Urgency</em>{sentence(assessment.urgency)}</span>
                    <span><em>Confidence</em>{confidenceText(assessment.confidence)}</span>
                    <span><em>Evidence</em>{assessment.evidenceCompleteness.state.toUpperCase()}</span>
                    <span><em>Review</em>{assessment.review.disposition}</span>
                  </div>
                  <div className={styles.queueFooter}>
                    <span>{freshnessText(assessment.freshness)}</span>
                    <ChevronRight aria-hidden="true" />
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

function EvidenceNode({
  item,
  selected,
  onSelect,
}: {
  item: ThreatEvidence
  selected: boolean
  onSelect: (item: ThreatEvidence) => void
}) {
  return (
    <button
      type="button"
      className={styles.atlasNode}
      data-kind="evidence"
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      onClick={() => onSelect(item)}
    >
      <FileSearch aria-hidden="true" />
      <span>
        <strong>{item.title}</strong>
        <small>{item.sourceLabel} · {confidenceText(item.confidence)}</small>
      </span>
    </button>
  )
}

function CausalEvidenceAtlas({
  assessment,
  evidence,
  relationships,
  selectedEvidenceId,
  onEvidence,
}: {
  assessment: EnvironmentalAssessment | null
  evidence: ThreatEvidence[]
  relationships: CausalRelationship[]
  selectedEvidenceId: string | null
  onEvidence: (item: ThreatEvidence) => void
}) {
  const DomainIcon = assessment ? DOMAIN_META[assessment.domain].icon : ScanSearch
  return (
    <section className={`${styles.primaryPanel} ${styles.atlasPanel}`} aria-labelledby="causal-atlas-heading">
      <header className={styles.panelHeader}>
        <div>
          <div className={styles.eyebrow}>Evidence → condition → explanations</div>
          <h2 id="causal-atlas-heading">Causal Evidence Atlas</h2>
        </div>
        <span className={styles.countChip}>
          {assessment ? `${evidence.length} EVIDENCE · ${relationships.length} LINKS` : "NO SELECTION"}
        </span>
      </header>
      {!assessment ? (
        <div className={styles.emptyState}>
          <ScanSearch aria-hidden="true" />
          <strong>No environmental condition selected</strong>
          <span>Select a queue row to synchronize evidence, relationships, and history.</span>
        </div>
      ) : (
        <div className={styles.atlasBody}>
          <div className={styles.atlasLegend} aria-hidden="true">
            <span>Evidence</span><span>Condition</span><span>Explanations / consequence</span>
          </div>
          <div className={styles.atlasFlow}>
            <div className={styles.atlasStack}>
              {evidence.length > 0 ? evidence.slice(0, 4).map((item) => (
                <EvidenceNode
                  key={item.id}
                  item={item}
                  selected={selectedEvidenceId === item.id}
                  onSelect={onEvidence}
                />
              )) : (
                <div className={styles.atlasGap}>NO LINKED EVIDENCE · UNKNOWN, NOT ZERO</div>
              )}
            </div>
            <div className={styles.atlasArrow}><ArrowRight aria-hidden="true" /></div>
            <div className={styles.conditionCore} data-severity={assessment.severity}>
              <DomainIcon aria-hidden="true" />
              <span>{DOMAIN_META[assessment.domain].symbol}</span>
              <strong>{assessment.name}</strong>
              <small>{assessment.severity.toUpperCase()} · {freshnessText(assessment.freshness)}</small>
              <p>{assessment.summary}</p>
            </div>
            <div className={styles.atlasArrow}><ArrowRight aria-hidden="true" /></div>
            <div className={styles.atlasStack}>
              {assessment.explanations.length > 0 ? assessment.explanations.slice(0, 4).map((item) => (
                <div className={styles.atlasNode} data-kind={item.kind} key={item.id}>
                  <GitBranch aria-hidden="true" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.kind.toUpperCase()} · {confidenceText(item.confidence)}</small>
                  </span>
                </div>
              )) : (
                <div className={styles.atlasGap}>NO EXPLANATION CONTRACT · CAUSALITY UNKNOWN</div>
              )}
              <div className={styles.consequenceNode}>
                <Route aria-hidden="true" />
                <span>
                  <strong>Mission consequence</strong>
                  <small>{assessment.missionConsequence ?? "NOT SUPPLIED"}</small>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.atlasFoot}>
            <span data-state={assessment.evidenceConflict}>
              Evidence conflict: {assessment.evidenceConflict === "detected" ? "DETECTED" : "UNKNOWN"}
            </span>
            <span>
              Changed since review: {assessment.changedSinceReview === true ? "YES" : "UNKNOWN"}
            </span>
            <span>Horizon: {assessment.forecastHorizon ?? "NOT AVAILABLE"}</span>
          </div>
        </div>
      )}
    </section>
  )
}

function ReviewPipeline({ assessment }: { assessment: EnvironmentalAssessment }) {
  return (
    <section className={styles.reviewBlock} aria-labelledby="review-pipeline-heading">
      <div className={styles.subsectionTitle}>
        <div>
          <span>Human-controlled package</span>
          <h3 id="review-pipeline-heading">Review disposition</h3>
        </div>
        <small>DISPLAY ONLY · NO REVIEW WRITE</small>
      </div>
      <ol className={styles.reviewPipeline}>
        {REVIEW_DISPOSITIONS.map((step, index) => {
          const active = assessment.review.disposition === step
          const activeIndex = REVIEW_DISPOSITIONS.indexOf(assessment.review.disposition)
          return (
            <li
              key={step}
              data-active={active ? "true" : "false"}
              data-complete={index < activeIndex ? "true" : "false"}
              aria-current={active ? "step" : undefined}
            >
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </li>
          )
        })}
      </ol>
      <div className={styles.reviewMeta}>
        <span>v1 state</span>
        <strong>{assessment.review.backendState?.toUpperCase() ?? "NO LINKED REVIEW"}</strong>
        <small>{assessment.review.mappingNote}</small>
      </div>
    </section>
  )
}

function EvidenceInspector({ evidence }: { evidence: ThreatEvidence | null }) {
  return (
    <section className={styles.inspectorSection} aria-labelledby="evidence-inspector-heading">
      <div className={styles.subsectionTitle}>
        <div>
          <span>Selected record</span>
          <h3 id="evidence-inspector-heading">Evidence inspector</h3>
        </div>
        <Database aria-hidden="true" />
      </div>
      {!evidence ? (
        <div className={styles.miniEmpty}>No linked evidence is selected. Evidence presence is unknown.</div>
      ) : (
        <>
          <div className={styles.evidenceHeading}>
            <strong>{evidence.title}</strong>
            <span data-state={evidence.synthetic ? "simulated" : evidence.freshness}>
              {evidence.synthetic ? "SIMULATED" : evidence.freshness.toUpperCase()}
            </span>
          </div>
          <p>{evidence.summary}</p>
          <dl className={styles.inspectorFacts}>
            <div><dt>Source</dt><dd>{evidence.sourceLabel}</dd></div>
            <div><dt>Observed</dt><dd>{formatUtc(evidence.observedAt)}</dd></div>
            <div><dt>Received</dt><dd>{formatUtc(evidence.receivedAt)}</dd></div>
            <div><dt>Confidence</dt><dd>{confidenceText(evidence.confidence)}</dd></div>
            <div><dt>Integrity</dt><dd>{evidence.integrityState.toUpperCase()}</dd></div>
            <div><dt>Verification</dt><dd>{evidence.verificationState.toUpperCase()}</dd></div>
          </dl>
          <div className={styles.provenanceBlock}>
            <span>Provenance</span>
            <code>{evidence.sourceRef}</code>
            {evidence.lineage.length > 0 ? (
              <ol>{evidence.lineage.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ol>
            ) : <small>Lineage not supplied.</small>}
          </div>
          <div className={styles.conflictCallout} data-conflict={evidence.conflictNote ? "true" : "false"}>
            <AlertTriangle aria-hidden="true" />
            <span>
              <strong>{evidence.conflictNote ? "EXPLICIT CONFLICT MARKER" : "CONFLICT UNKNOWN"}</strong>
              <small>{evidence.conflictNote ?? "This evidence record carries no explicit conflict metadata."}</small>
            </span>
          </div>
        </>
      )}
    </section>
  )
}

function RelationshipHistory({
  assessment,
  relationships,
  history,
}: {
  assessment: EnvironmentalAssessment
  relationships: CausalRelationship[]
  history: ThreatAssessmentSnapshot["history"]
}) {
  return (
    <div className={styles.relationshipHistory}>
      <section aria-labelledby="relationship-heading">
        <div className={styles.subsectionTitle}>
          <div><span>Object graph</span><h3 id="relationship-heading">Relationships</h3></div>
          <GitBranch aria-hidden="true" />
        </div>
        {relationships.length === 0 ? (
          <div className={styles.miniEmpty}>No linked relationship was supplied. Causality remains unknown.</div>
        ) : (
          <ul className={styles.compactList}>
            {relationships.map((item) => (
              <li key={item.id}>
                <span data-causal={item.explicitlyCausal ? "true" : "false"}>
                  {item.explicitlyCausal ? "EXPLICIT CAUSAL LANGUAGE" : "ASSERTED RELATIONSHIP"}
                </span>
                <strong>{item.label}</strong>
                <small>{item.relationshipType} · {confidenceText(item.confidence)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="history-heading">
        <div className={styles.subsectionTitle}>
          <div><span>Append-only trail</span><h3 id="history-heading">History</h3></div>
          <History aria-hidden="true" />
        </div>
        {history.length === 0 ? (
          <div className={styles.miniEmpty}>No linked activity appears in the loaded window. This does not prove no change.</div>
        ) : (
          <ol className={styles.timeline}>
            {history.slice(0, 6).map((item) => (
              <li key={item.id}>
                <time>{formatUtc(item.occurredAt)}</time>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className={styles.changeReviewCallout} data-changed={assessment.changedSinceReview === true ? "true" : "unknown"}>
        <span>Changed since last review</span>
        <strong>{assessment.changedSinceReview === true ? "YES" : "UNKNOWN"}</strong>
        <small>{assessment.changedSinceReviewNote}</small>
      </div>
    </div>
  )
}

function InvestigationInspector({
  assessment,
  evidence,
  relationships,
  history,
}: {
  assessment: EnvironmentalAssessment | null
  evidence: ThreatEvidence | null
  relationships: CausalRelationship[]
  history: ThreatAssessmentSnapshot["history"]
}) {
  return (
    <aside className={`${styles.primaryPanel} ${styles.inspectorPanel}`} aria-labelledby="investigation-inspector-heading">
      <header className={styles.panelHeader}>
        <div>
          <div className={styles.eyebrow}>Synchronized selection</div>
          <h2 id="investigation-inspector-heading">Investigation inspector</h2>
        </div>
        <span className={styles.countChip}>{assessment ? assessment.review.disposition.toUpperCase() : "NO SELECTION"}</span>
      </header>
      {!assessment ? (
        <div className={styles.emptyState}>
          <ScanSearch aria-hidden="true" />
          <strong>No selection</strong>
          <span>The inspector, relationship view, and history follow the queue selection.</span>
        </div>
      ) : (
        <div className={styles.inspectorScroll} tabIndex={0} aria-label="Scrollable investigation details">
          <section className={styles.assessmentSummary}>
            <div className={styles.summaryTopline}>
              <span data-severity={assessment.severity}>{assessment.severity.toUpperCase()}</span>
              <span>{DOMAIN_LABELS[assessment.domain]}</span>
              <span>{assessment.synthetic ? "SIMULATED" : assessment.dataMode.toUpperCase()}</span>
            </div>
            <h3>{assessment.name}</h3>
            <p>{assessment.summary}</p>
            <div className={styles.summaryGrid}>
              <Metric label="Urgency" value={sentence(assessment.urgency)} note="Explicit when supplied; otherwise not assessed." />
              <Metric label="Confidence" value={confidenceText(assessment.confidence)} note={assessment.confidence.basis} />
              <Metric label="Horizon" value={assessment.forecastHorizon ?? "NOT AVAILABLE"} note="Forecast horizon is absent from live v1 objects." />
              <Metric label="Evidence" value={assessment.evidenceCompleteness.state.toUpperCase()} note={assessment.evidenceCompleteness.note} />
            </div>
            <div className={styles.uncertaintyBlock}>
              <span>Uncertainty</span><p>{assessment.uncertainty}</p>
            </div>
            <div className={styles.affectedSystems}>
              <span>Affected systems</span>
              <div>{assessment.affectedSystems.map((domain) => <strong key={domain}>{DOMAIN_LABELS[domain]}</strong>)}</div>
            </div>
          </section>
          <ReviewPipeline assessment={assessment} />
          <EvidenceInspector evidence={evidence} />
          <RelationshipHistory assessment={assessment} relationships={relationships} history={history} />
        </div>
      )}
    </aside>
  )
}

function Axis({ value }: { value: string }) {
  const negative = /unreachable|rejected|invalid|missing|not_supported/i.test(value)
  const caution = /unknown|partial|stale|unverified|not_attempted/i.test(value)
  return <span className={styles.axis} data-tone={negative ? "bad" : caution ? "warn" : "good"}>{value.replaceAll("_", " ").toUpperCase()}</span>
}

function SourceReadiness({ sources }: { sources: EndpointTruth[] }) {
  return (
    <section className={`${styles.supportPanel} ${styles.sourcePanel}`} aria-labelledby="source-readiness-heading">
      <header className={styles.supportHeader}>
        <div><div className={styles.eyebrow}>Independent truth axes</div><h2 id="source-readiness-heading">Source readiness</h2></div>
        <RadioTower aria-hidden="true" />
      </header>
      <div className={styles.tableScroll} tabIndex={0} aria-label="Scrollable source readiness truth table">
        <table className={styles.truthTable}>
          <thead>
            <tr>
              <th>Source</th><th>Reach</th><th>Identity</th><th>Schema</th><th>Freshness</th><th>Provenance</th><th>Coverage</th><th>Data</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} data-source-id={source.id}>
                <th scope="row">
                  <strong>{source.label}</strong>
                  <code>{source.method} {source.endpoint}</code>
                  <small>{source.note}</small>
                </th>
                <td><Axis value={source.reachability} /></td>
                <td><Axis value={source.identity} /></td>
                <td><Axis value={source.schema} /></td>
                <td><Axis value={source.freshness} /></td>
                <td><Axis value={source.provenance} /></td>
                <td><Axis value={source.coverage} /></td>
                <td>
                  <Axis value={source.dataPresence} />
                  <small>{source.dataPresence === "empty" ? "COLLECTED EMPTY" : source.recordCount === null ? "COUNT UNKNOWN" : `${source.recordCount} RECORDS`}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ContractGaps({ gaps }: { gaps: string[] }) {
  return (
    <section className={styles.supportPanel} aria-labelledby="contract-gaps-heading">
      <header className={styles.supportHeader}>
        <div><div className={styles.eyebrow}>No inferred success</div><h2 id="contract-gaps-heading">Contract gaps</h2></div>
        <AlertTriangle aria-hidden="true" />
      </header>
      {gaps.length === 0 ? <p className={styles.miniEmpty}>No gap list was supplied.</p> : (
        <ul className={styles.gapList}>{gaps.map((gap, index) => <li key={`${gap}-${index}`}>{gap}</li>)}</ul>
      )}
      <div className={styles.externalSeam}>
        <ShieldCheck aria-hidden="true" />
        <span><strong>External seams disabled / unverified</strong><small>This route makes no vendor, external-platform, credential, or external-send calls.</small></span>
      </div>
    </section>
  )
}

function HandoffRouter({
  context,
  freshness,
}: {
  context: ThreatAssessmentContext
  freshness: FreshnessState | null
}) {
  const routes = [
    {
      id: "situationalAwareness" as const,
      title: "Situational Awareness",
      detail: "Open the selected environmental object in the fieldboard.",
      icon: ScanSearch,
    },
    {
      id: "dataFusion" as const,
      title: "Data Fusion",
      detail: "Carry the mission, object, evidence, source, mode, and time window.",
      icon: Layers3,
    },
    {
      id: "oeiNarrative" as const,
      title: "OEI Narrative",
      detail: "Open a context-preserving narrative handoff; no narrative is generated here.",
      icon: FileSearch,
    },
    {
      id: "environmentalResponseCoordination" as const,
      title: "Environmental Response Coordination",
      detail: "Read-only browser context seam. No action or persisted handoff is created.",
      icon: Route,
    },
  ]
  return (
    <section className={styles.supportPanel} aria-labelledby="handoff-heading">
      <header className={styles.supportHeader}>
        <div><div className={styles.eyebrow}>Context continuity</div><h2 id="handoff-heading">Investigation handoffs</h2></div>
        <Route aria-hidden="true" />
      </header>
      <div className={styles.handoffGrid}>
        {routes.map((route) => {
          const Icon = route.icon
          return (
            <Link key={route.id} href={buildThreatAssessmentHandoffLink(route.id, context, freshness)}>
              <Icon aria-hidden="true" />
              <span><strong>{route.title}</strong><small>{route.detail}</small></span>
              <ArrowRight aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function LoadingSnapshot(context: ThreatAssessmentContext): ThreatAssessmentSnapshot {
  return {
    schema: "fusarium-threat-assessment/v1",
    context,
    generatedAt: new Date().toISOString(),
    condition: "loading",
    classification: "UNCLASSIFIED",
    identityMode: null,
    identityVerified: null,
    assessments: [],
    evidence: [],
    relationships: [],
    history: [],
    sourceTruth: [],
    gaps: [],
    note: "Contract handshake in progress.",
  }
}

export function ThreatAssessmentDashboard() {
  const searchParams = useSearchParams()
  const initialContext = useMemo(() => parseThreatAssessmentContext(searchParams), [searchParams])
  const [context, setContext] = useState<ThreatAssessmentContext>(initialContext)
  const [snapshot, setSnapshot] = useState<ThreatAssessmentSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const contextKey = useCallback((value: ThreatAssessmentContext) => JSON.stringify({
    missionId: value.missionId,
    missionAreaId: value.missionAreaId,
    timeWindow: value.timeWindow,
    mode: value.mode,
    role: value.role,
    selectedAssessmentId: value.selectedAssessmentId,
    selectedObjectId: value.selectedObjectId,
    selectedEvidenceId: value.selectedEvidenceId,
    selectedSourceId: value.selectedSourceId,
  }), [])

  useEffect(() => {
    setContext((current) => contextKey(current) === contextKey(initialContext) ? current : initialContext)
  }, [contextKey, initialContext])

  const replaceContext = useCallback((next: ThreatAssessmentContext, freshness?: FreshnessState | null) => {
    const queryChanged =
      next.missionId !== context.missionId ||
      next.missionAreaId !== context.missionAreaId ||
      next.timeWindow !== context.timeWindow ||
      next.mode !== context.mode ||
      next.operatorId !== context.operatorId
    if (queryChanged) setSnapshot(null)
    setContext(next)
    window.history.replaceState(null, "", buildThreatAssessmentSelfLink(next, freshness))
  }, [context])

  useEffect(() => {
    let active = true
    let controller: AbortController | null = null
    let timer: ReturnType<typeof setInterval> | null = null

    const load = async (clear: boolean) => {
      controller?.abort()
      controller = new AbortController()
      if (clear) setSnapshot(null)
      setLoading(true)
      try {
        const next = await runtimeThreatAssessmentProvider.load(context, controller.signal)
        if (!active) return
        setSnapshot(next)
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return
        setSnapshot({
          ...LoadingSnapshot(context),
          generatedAt: new Date().toISOString(),
          condition: "unavailable",
          note: error instanceof Error ? error.message : String(error),
          gaps: ["The frontend provider failed before it could produce a validated snapshot."],
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    void load(true)
    if (context.mode === "live") timer = setInterval(() => void load(false), 30_000)
    return () => {
      active = false
      controller?.abort()
      if (timer) clearInterval(timer)
    }
  }, [
    context.missionId,
    context.missionAreaId,
    context.timeWindow,
    context.mode,
    context.operatorId,
    refreshKey,
  ])

  const snapshotMatchesContext = snapshot !== null &&
    snapshot.context.missionId === context.missionId &&
    snapshot.context.missionAreaId === context.missionAreaId &&
    snapshot.context.timeWindow === context.timeWindow &&
    snapshot.context.mode === context.mode
  const effectiveSnapshot = snapshotMatchesContext ? snapshot : LoadingSnapshot(context)
  const selectedAssessment = useMemo(() => {
    const byAssessment = effectiveSnapshot.assessments.find((item) => item.id === context.selectedAssessmentId)
    const byObject = effectiveSnapshot.assessments.find((item) => item.objectId === context.selectedObjectId)
    return byAssessment ?? byObject ?? effectiveSnapshot.assessments[0] ?? null
  }, [effectiveSnapshot.assessments, context.selectedAssessmentId, context.selectedObjectId])

  const linkedEvidence = useMemo(() => {
    if (!selectedAssessment) return []
    const linked = new Set(selectedAssessment.evidenceIds)
    return effectiveSnapshot.evidence.filter((item) => linked.has(item.id) || item.objectIds.includes(selectedAssessment.objectId))
  }, [effectiveSnapshot.evidence, selectedAssessment])

  const selectedEvidence =
    linkedEvidence.find((item) => item.id === context.selectedEvidenceId) ?? linkedEvidence[0] ?? null
  const linkedRelationships = selectedAssessment
    ? effectiveSnapshot.relationships.filter(
        (item) => item.fromObjectId === selectedAssessment.objectId || item.toObjectId === selectedAssessment.objectId,
      )
    : []
  const linkedHistory = selectedAssessment
    ? effectiveSnapshot.history.filter((item) => item.objectIds.includes(selectedAssessment.objectId))
    : effectiveSnapshot.history

  useEffect(() => {
    if (!selectedAssessment) return
    const nextEvidence = selectedEvidence?.id ?? null
    if (
      context.selectedAssessmentId === selectedAssessment.id &&
      context.selectedObjectId === selectedAssessment.objectId &&
      context.selectedEvidenceId === nextEvidence
    ) return
    replaceContext(
      {
        ...context,
        selectedAssessmentId: selectedAssessment.id,
        selectedObjectId: selectedAssessment.objectId,
        selectedEvidenceId: nextEvidence,
        selectedSourceId: selectedEvidence?.sourceId ?? context.selectedSourceId,
      },
      selectedAssessment.freshness,
    )
  }, [selectedAssessment, selectedEvidence, context, replaceContext])

  const selectAssessment = (assessment: EnvironmentalAssessment) => {
    const firstEvidence = effectiveSnapshot.evidence.find(
      (item) => assessment.evidenceIds.includes(item.id) || item.objectIds.includes(assessment.objectId),
    )
    replaceContext(
      {
        ...context,
        selectedAssessmentId: assessment.id,
        selectedObjectId: assessment.objectId,
        selectedEvidenceId: firstEvidence?.id ?? null,
        selectedSourceId: firstEvidence?.sourceId ?? assessment.sourceIds[0] ?? null,
      },
      assessment.freshness,
    )
  }

  const selectEvidence = (item: ThreatEvidence) => {
    replaceContext(
      {
        ...context,
        selectedEvidenceId: item.id,
        selectedSourceId: item.sourceId,
      },
      selectedAssessment?.freshness,
    )
  }

  const operationalAssessmentCount = effectiveSnapshot.assessments.filter((item) => !item.synthetic).length
  const simulatedAssessmentCount = effectiveSnapshot.assessments.filter((item) => item.synthetic).length
  const modeMixSafe =
    context.mode === "simulated"
      ? operationalAssessmentCount === 0
      : simulatedAssessmentCount === 0

  return (
    <div className={styles.page} data-mode={context.mode}>
      {context.mode === "simulated" ? <div className={styles.scenarioWatermark}>SIMULATED · SANITIZED · NOT OPERATIONAL</div> : null}
      <ContextFrame
        context={context}
        snapshot={snapshot}
        loading={loading}
        onChange={replaceContext}
        onRefresh={() => setRefreshKey((value) => value + 1)}
      />
      <ConditionNotice condition={effectiveSnapshot.condition} note={effectiveSnapshot.note} />

      <section className={styles.metricGrid} aria-label="Assessment summary">
        <Metric
          label="Queue"
          value={effectiveSnapshot.assessments.length > 0
            ? effectiveSnapshot.assessments.length
            : effectiveSnapshot.condition === "empty"
              ? "COLLECTED EMPTY"
              : effectiveSnapshot.condition === "loading"
                ? "CHECKING"
                : "DATA UNAVAILABLE"}
          note="Environmental-object projections in the current isolated mode."
        />
        <Metric
          label="Evidence conflict"
          value={effectiveSnapshot.assessments.some((item) => item.evidenceConflict === "detected") ? "DETECTED" : "UNKNOWN"}
          note="Unknown unless the source or sanitized fixture explicitly marks a conflict."
        />
        <Metric
          label="Changed after review"
          value={effectiveSnapshot.assessments.some((item) => item.changedSinceReview === true) ? "YES" : "UNKNOWN"}
          note="Yes only when a typed change timestamp is later than a linked review."
        />
        <Metric
          label="Mode isolation"
          value={modeMixSafe ? "VERIFIED IN SNAPSHOT" : "FAILED"}
          note="Operational and simulated assessment arrays are never merged."
        />
      </section>

      <section className={styles.primaryWorkspace} aria-label="Primary environmental investigation workspace">
        <AssessmentQueue
          assessments={effectiveSnapshot.assessments}
          selectedId={selectedAssessment?.id ?? null}
          onSelect={selectAssessment}
          condition={effectiveSnapshot.condition}
        />
        <CausalEvidenceAtlas
          assessment={selectedAssessment}
          evidence={linkedEvidence}
          relationships={linkedRelationships}
          selectedEvidenceId={selectedEvidence?.id ?? null}
          onEvidence={selectEvidence}
        />
        <InvestigationInspector
          assessment={selectedAssessment}
          evidence={selectedEvidence}
          relationships={linkedRelationships}
          history={linkedHistory}
        />
      </section>

      <section className={styles.supportingGrid} aria-label="Supporting investigation panels" data-layout="fixed">
        <SourceReadiness sources={effectiveSnapshot.sourceTruth} />
        <ContractGaps gaps={effectiveSnapshot.gaps} />
        <HandoffRouter
          context={context}
          freshness={selectedAssessment?.freshness ?? null}
        />
      </section>

      <footer className={styles.workspaceFooter}>
        <span>ENVIRONMENTAL DECISION SUPPORT · HUMAN REVIEW REQUIRED</span>
        <span>READ-ONLY WORKBENCH · NO EXTERNAL SENDS · NO OPERATIONAL CLAIM FROM MISSING DATA</span>
      </footer>
    </div>
  )
}
