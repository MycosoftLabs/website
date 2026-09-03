"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Database,
  Eye,
  FileDiff,
  FileJson,
  FileSearch,
  GitBranch,
  Inbox,
  Link2,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Network,
  Radio,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  COMMAND_MODES,
  buildDecisionDisclosure,
  type CommandCondition,
  type CommandContext,
  type CommandMode,
  type CommandSnapshot,
  type EndpointTruth,
  type PolicyGate,
  type ReviewDecision,
  type ReviewItem,
} from "@/lib/fusarium/command-control/contracts"
import {
  buildCommandLink,
  parseCommandContext,
} from "@/lib/fusarium/command-control/deep-links"
import {
  CERTIFIED_CONTROL_PREREQUISITES,
  CONTROL_STATE_MODEL,
  COORDINATION_HANDOFF_SEAMS,
  DEVICE_APP_OWNERSHIP,
  EARTH_SIMULATOR_SEAM,
  FLEET_DEVICE_CATALOG,
  FLEET_TRUTH_BOUNDARY,
  FUTURE_MOBILE_PROFILE,
  GCS_ACKNOWLEDGMENT_BOUNDARY,
  MANUAL_CONTROL_POLICY,
  PROPOSAL_INPUT_POLICY,
  PSATHYRELLA_IDENTITY_CONFLICT,
  STANDARDS_PROFILE_SEAMS,
  createSessionLocalProposal,
  findFleetDevice,
  type FleetDeviceId,
  type ProposalOrigin,
  type SessionLocalProposal,
} from "@/lib/fusarium/command-control/fleet"
import { runtimeCommandControlProvider } from "@/lib/fusarium/command-control/provider"
import { CommandOperationalLayout } from "./operational-layout"
import styles from "./command-control.module.css"

const CONDITION_META: Record<
  CommandCondition,
  { label: string; icon: LucideIcon; tone: string; message: string }
> = {
  loading: {
    label: "LOADING",
    icon: LoaderCircle,
    tone: "loading",
    message: "Validating the local contract. No environmental value is inferred while sources load.",
  },
  empty: {
    label: "VALIDATED · NO RECORDS",
    icon: CircleDashed,
    tone: "empty",
    message: "The required v1 responses validated and supplied no coordination records. Empty is not an all-clear.",
  },
  ready: {
    label: "LIVE · LOCAL REVIEW",
    icon: CheckCircle2,
    tone: "ready",
    message: "Local v1 records are visible with evidence, provenance, policy, and human approval gates.",
  },
  partial: {
    label: "PARTIAL",
    icon: AlertTriangle,
    tone: "partial",
    message: "Some required responses are missing or invalid. Review each truth row before using this workspace.",
  },
  stale: {
    label: "STALE",
    icon: Clock3,
    tone: "stale",
    message: "Records exist, but the required data-bearing responses are stale.",
  },
  unauthorized: {
    label: "UNAUTHORIZED",
    icon: ShieldAlert,
    tone: "error",
    message: "The local runtime rejected the development identity metadata. No records are substituted.",
  },
  unavailable: {
    label: "CONTRACT UNAVAILABLE",
    icon: XCircle,
    tone: "error",
    message: "The same-origin path may answer HTTP, but the v1 contract did not validate. No operational success is claimed.",
  },
  simulated: {
    label: "SIMULATED · LOCAL ONLY",
    icon: Sparkles,
    tone: "simulated",
    message: "A sanitized deterministic scenario is active. It cannot write operational state or transmit externally.",
  },
}

const MODE_META: Record<CommandMode, { label: string; note: string }> = {
  live: { label: "LIVE", note: "Current validated local records" },
  replay: { label: "REPLAY", note: "Bounded append-only activity only" },
  forecast: { label: "FORECAST", note: "Unavailable until a forecast contract exists" },
  simulated: { label: "SIMULATED", note: "Sanitized client-side review scenario" },
}

function formatUtc(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "UNAVAILABLE"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value))
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").toUpperCase()
}

function ids(ids: readonly string[]): string {
  return ids.length > 0 ? ids.join(" · ") : "NONE LINKED"
}

function rangeFor(window: CommandContext["timeWindow"]): CommandContext["timeRange"] {
  const hours = window === "6h" ? 6 : window === "72h" ? 72 : 24
  const end = Date.now()
  return {
    start: new Date(end - hours * 60 * 60 * 1000).toISOString(),
    end: new Date(end).toISOString(),
  }
}

function ConditionNotice({ snapshot, loading }: { snapshot: CommandSnapshot | null; loading: boolean }) {
  const condition = loading && !snapshot ? "loading" : snapshot?.condition ?? "unavailable"
  const meta = CONDITION_META[condition]
  const Icon = meta.icon
  return (
    <div className={`${styles.conditionNotice} ${styles[`condition_${meta.tone}`]}`} role="status">
      <Icon className={condition === "loading" ? styles.spin : undefined} aria-hidden="true" />
      <div>
        <strong>{meta.label}</strong>
        <span>{meta.message}</span>
        {snapshot?.note ? <small>{snapshot.note}</small> : null}
      </div>
    </div>
  )
}

function Fact({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  return (
    <div className={styles.fact}>
      <span>{label}</span>
      <strong title={title}>{value}</strong>
    </div>
  )
}

function GateRow({ gate }: { gate: PolicyGate }) {
  const Icon = gate.result === "pass" ? CheckCircle2 : gate.result === "simulated" ? Sparkles : ShieldAlert
  return (
    <li className={`${styles.gateRow} ${styles[`gate_${gate.result}`]}`}>
      <Icon aria-hidden="true" />
      <span>
        <strong>{gate.label}</strong>
        <small>{gate.reason}</small>
      </span>
      <b>{gate.result.toUpperCase()}</b>
    </li>
  )
}

function ContextFrame({
  context,
  snapshot,
  loading,
  onNavigate,
  onRefresh,
}: {
  context: CommandContext
  snapshot: CommandSnapshot | null
  loading: boolean
  onNavigate: (context: CommandContext) => void
  onRefresh: () => void
}) {
  const identity = snapshot?.readiness
    ? `${snapshot.readiness.identityMode} · role hint ${context.operatorRole} · authorization unavailable`
    : "development_header_unverified · role hint non-authoritative · authorization unavailable"
  const contextOptions = snapshot?.contexts ?? []
  const selectedContext = contextOptions.find((item) => item.id === context.contextId)

  return (
    <section className={styles.contextFrame} aria-labelledby="command-context-heading">
      <div className={styles.contextTitle}>
        <div>
          <span className={styles.eyebrow}>ENVIN / OEI · Human-owned coordination</span>
          <h1 id="command-context-heading">Command &amp; Control</h1>
          <p>Environmental Response Coordination</p>
        </div>
        <div className={styles.contextActions}>
          <span className={styles.boundaryChip}>UNCLASSIFIED · COMMERCIAL</span>
          <span className={styles.schemaChip}>CONTRACT v1</span>
          <button type="button" className={styles.iconButton} onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? styles.spin : undefined} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.contextControls}>
        <label className={styles.controlField}>
          <span>Mission context</span>
          <select
            value={context.contextId ?? ""}
            disabled={contextOptions.length === 0 || context.mode === "simulated"}
            onChange={(event) => {
              const selected = contextOptions.find((item) => item.id === event.target.value)
              if (!selected) return
              onNavigate({
                ...context,
                missionId: selected.missionId,
                contextId: selected.id,
                missionAreaId: selected.missionAreaId,
                missionAreaLabel: selected.missionAreaLabel ?? selected.missionAreaId,
                timeWindow: selected.timeWindow ?? context.timeWindow,
                timeRange: selected.timeRange,
                selectedObjectId: selected.selectedObjectId,
                selectedEvidenceId: selected.selectedEvidenceId,
                selectedSourceId: selected.selectedSourceId,
                operatorId: selected.operatorId,
                operatorRole: selected.operatorRole,
              })
            }}
          >
            {contextOptions.length === 0 ? (
              <option value="">No validated context</option>
            ) : (
              contextOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.missionAreaLabel ?? item.missionAreaId} · {item.id}
                </option>
              ))
            )}
          </select>
          <small>{selectedContext ? selectedContext.missionId : "Context selection is unavailable until v1 validates."}</small>
        </label>

        <fieldset className={styles.segmentField}>
          <legend>Time window</legend>
          <div>
            {(["6h", "24h", "72h"] as const).map((window) => (
              <button
                key={window}
                type="button"
                aria-pressed={context.timeWindow === window}
                onClick={() => onNavigate({ ...context, timeWindow: window, timeRange: rangeFor(window) })}
                disabled={context.mode === "simulated"}
              >
                {window.toUpperCase()}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.segmentField}>
          <legend>Operational mode</legend>
          <div className={styles.modeSegments}>
            {COMMAND_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={context.mode === mode}
                title={MODE_META[mode].note}
                onClick={() => onNavigate({ ...context, mode })}
              >
                {MODE_META[mode].label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.truthFacts}>
        <Fact label="Mission" value={snapshot?.mission?.name ?? (context.missionId ? context.missionId : "UNAVAILABLE")} />
        <Fact label="Area" value={context.missionAreaLabel} title={context.missionAreaId} />
        <Fact label="Identity / role" value={identity.toUpperCase()} />
        <Fact label="Server policy" value="UNCLASSIFIED ONLY" />
        <Fact label="Selected object" value={context.selectedObjectId ?? "NONE"} />
        <Fact label="Selected evidence" value={context.selectedEvidenceId ?? "NONE"} />
        <Fact label="Selected device" value={findFleetDevice(context.selectedDeviceId ?? "")?.name ?? "NONE"} />
        <Fact label="Window" value={`${formatUtc(context.timeRange.start)} → ${formatUtc(context.timeRange.end)}`} />
        <Fact label="Last validation" value={loading ? "CHECKING" : formatUtc(snapshot?.generatedAt)} />
      </div>
    </section>
  )
}

function PlanStrip({ snapshot }: { snapshot: CommandSnapshot }) {
  const selectedReview = snapshot.reviews.find(
    (item) =>
      (snapshot.context.selectedEvidenceId && item.evidenceIds.includes(snapshot.context.selectedEvidenceId)) ||
      (snapshot.context.selectedObjectId && item.objectIds.includes(snapshot.context.selectedObjectId)),
  ) ?? snapshot.reviews[0] ?? null
  const stages = [
    {
      label: "Context",
      state: snapshot.context.contextId ? "linked" : "unavailable",
      note: snapshot.context.contextId ?? "No canonical context",
    },
    {
      label: "Evidence",
      state: snapshot.packagePreview.evidenceIds.length > 0 ? "linked" : "held",
      note: snapshot.packagePreview.evidenceIds.length > 0 ? `${snapshot.packagePreview.evidenceIds.length} linked` : "No evidence",
    },
    {
      label: "Human review",
      state: selectedReview?.state ?? "unavailable",
      note: selectedReview?.assignedTo ?? "No assignment",
    },
    {
      label: "Policy",
      state: snapshot.policyGates.some((gate) => gate.result === "hold" || gate.result === "unavailable") ? "held" : "pass",
      note: snapshot.policyGates.some((gate) => gate.result === "hold") ? "Holds remain" : "Local gates reviewed",
    },
    {
      label: "Message",
      state: snapshot.packagePreview.messageReadiness,
      note: "Local preview only",
    },
    {
      label: "External release",
      state: "disabled",
      note: "No transmission path",
    },
  ]
  return (
    <ol className={styles.planStrip} aria-label="Mission plan and release readiness">
      {stages.map((stage, index) => (
        <li key={stage.label}>
          <span className={styles.planIndex}>{String(index + 1).padStart(2, "0")}</span>
          <span>
            <strong>{stage.label}</strong>
            <small>{stage.note}</small>
          </span>
          <b>{humanize(stage.state)}</b>
          {index < stages.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  )
}

function DeviceCoordinationPanel({
  context,
  onSelectDevice,
}: {
  context: CommandContext
  onSelectDevice: (id: FleetDeviceId | null) => void
}) {
  const selected = findFleetDevice(context.selectedDeviceId ?? "")
  const earthLink = buildCommandLink("earthSimulator", context)

  return (
    <section className={styles.coordinationPanel} aria-labelledby="device-coordination-heading">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Higher coordination layer · GCS ownership preserved</span>
          <h2 id="device-coordination-heading">Device &amp; Earth context seams</h2>
        </div>
        <span className={styles.statusChip}>STATIC INVENTORY · READ ONLY</span>
      </header>
      <div className={styles.coordinationGrid}>
        <div className={styles.fleetCatalog}>
          <span className={styles.sectionLabel}>Catalog identities · not live fleet state</span>
          <div className={styles.deviceButtons}>
            {FLEET_DEVICE_CATALOG.map((device) => (
              <button
                key={device.id}
                type="button"
                aria-pressed={selected?.id === device.id}
                onClick={() => onSelectDevice(selected?.id === device.id ? null : device.id)}
              >
                <Network aria-hidden="true" />
                <span><strong>{device.name}</strong><small>{humanize(device.mobilityCategory)} · {humanize(device.platformProfile)}</small></span>
                <b>{selected?.id === device.id ? "SELECTED" : "STATIC"}</b>
              </button>
            ))}
            <div className={styles.futureDevice}>
              <CircleDashed aria-hidden="true" />
              <span><strong>Future mobile category</strong><small>{FUTURE_MOBILE_PROFILE.note}</small></span>
              <b>NOT A DEVICE</b>
            </div>
          </div>
        </div>

        <div className={styles.deviceReadout}>
          <span className={styles.sectionLabel}>Selected coordination context</span>
          {selected ? (
            <>
              <div className={styles.selectedDeviceTitle}>
                <Target aria-hidden="true" />
                <span>
                  <strong>{selected.name}</strong>
                  <small>{selected.id} · {humanize(selected.mobilityCategory)} · {humanize(selected.platformProfile)}</small>
                </span>
                <b>UNVERIFIED</b>
              </div>
              <dl className={styles.truthTiles}>
                {Object.entries(FLEET_TRUTH_BOUNDARY).map(([axis, value]) => (
                  <div key={axis}><dt>{humanize(axis)}</dt><dd>{humanize(value)}</dd></div>
                ))}
              </dl>
              {selected.id === "psathyrella" ? (
                <div className={styles.aliasWarning}>
                  <ShieldAlert aria-hidden="true" />
                  <span>
                    <strong>Canonical spelling: Psathyrella · alias resolution blocked</strong>
                    <small>{PSATHYRELLA_IDENTITY_CONFLICT.conflictingAliases.join(" · ")} · identity remains unverified</small>
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.emptyStateCompact}>
              <CircleDashed aria-hidden="true" />
              <span><strong>No device selected</strong><small>Catalog presence is not observed state, location, telemetry, or readiness.</small></span>
            </div>
          )}
        </div>

        <div className={styles.integrationReadout}>
          <span className={styles.sectionLabel}>Application ownership &amp; Earth seam</span>
          <div className={styles.ownershipBoundary}>
            <div><strong>C2 owns</strong><small>{DEVICE_APP_OWNERSHIP.commandAndControlOwns.join(" · ")}</small></div>
            <div><strong>GCS owns</strong><small>{DEVICE_APP_OWNERSHIP.gcsOwns.join(" · ")}</small></div>
          </div>
          <p className={styles.ackBoundary}>
            <ShieldAlert aria-hidden="true" />
            <span><strong>GCS ledger ACK ≠ physical execution proof</strong><small>{GCS_ACKNOWLEDGMENT_BOUNDARY.note}</small></span>
          </p>
          <div className={styles.earthSeam}>
            <Route aria-hidden="true" />
            <span>
              <strong>{EARTH_SIMULATOR_SEAM.label}</strong>
              <small>{humanize(EARTH_SIMULATOR_SEAM.interaction)} · {humanize(EARTH_SIMULATOR_SEAM.access)} · map/data contracts NONE</small>
            </span>
            <Link href={earthLink}>Open context link</Link>
          </div>
          <p className={styles.boundaryNote}>{DEVICE_APP_OWNERSHIP.boundary} Manual operation is {MANUAL_CONTROL_POLICY.mode}; actual execution is {MANUAL_CONTROL_POLICY.actualExecution}.</p>
        </div>
      </div>
    </section>
  )
}

function MissionPlanProposal({ snapshot }: { snapshot: CommandSnapshot }) {
  const [origin, setOrigin] = useState<ProposalOrigin>("human")
  const [summary, setSummary] = useState("")
  const [rationale, setRationale] = useState("")
  const [proposal, setProposal] = useState<SessionLocalProposal | null>(null)

  const stage = () => {
    setProposal(createSessionLocalProposal({
      id: `session-proposal-${Date.now()}`,
      summary,
      rationale,
      origin,
    }))
  }

  return (
    <div className={styles.proposalWidget}>
      <div className={styles.stateLadder} aria-label="Observed proposed approved and executed state separation">
        {Object.values(CONTROL_STATE_MODEL).map((item, index) => (
          <div key={item.stage} data-active={item.stage === "proposed" && Boolean(proposal)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{humanize(item.stage)}</strong>
            <b>{humanize(item.stage === "proposed" && proposal ? "session_local" : item.availability)}</b>
            <small>{item.note}</small>
          </div>
        ))}
      </div>
      <div className={styles.proposalGrid}>
        <label className={styles.controlField}>
          <span>Proposal authoring mode</span>
          <select value={origin} onChange={(event) => setOrigin(event.target.value as ProposalOrigin)}>
            <option value="human">Human-authored</option>
            <option value="natural_language">Natural-language draft · local only</option>
            <option value="myca">MYCA-shaped draft · MYCA not called</option>
          </select>
          <small>Natural language and MYCA are {humanize(PROPOSAL_INPUT_POLICY.naturalLanguage)}.</small>
        </label>
        <label className={styles.draftField}>
          <span>Mission / observation proposal</span>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Describe mission intent or a passive observation request. Do not enter device instructions."
            maxLength={1800}
          />
        </label>
        <label className={styles.draftField}>
          <span>Waypoint labels, environmental constraints &amp; expected consequences</span>
          <textarea
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            placeholder="Labels and review rationale only; no coordinates are parsed, validated, routed, or sent."
            maxLength={1800}
          />
        </label>
      </div>
      <dl className={styles.miniDisclosure}>
        <div><dt>Proposed change</dt><dd>Stage exact draft text in browser memory</dd></div>
        <div><dt>Affected device / objects</dt><dd>{findFleetDevice(snapshot.context.selectedDeviceId ?? "")?.name ?? "NO DEVICE"} · {ids(snapshot.packagePreview.objectIds)}</dd></div>
        <div><dt>Evidence</dt><dd>{ids(snapshot.packagePreview.evidenceIds)}</dd></div>
        <div><dt>Policy result</dt><dd>INERT LOCAL PROPOSAL · NOT APPROVED</dd></div>
        <div><dt>External side effects</dt><dd>NONE</dd></div>
        <div><dt>Required human approval</dt><dd>Future signed package and certified authority plane; unavailable here</dd></div>
      </dl>
      <div className={styles.proposalActions}>
        <button type="button" className={styles.quietButton} onClick={stage} disabled={!summary.trim()}>
          <ListChecks aria-hidden="true" /> Stage session-local proposal
        </button>
        {proposal ? <button type="button" className={styles.quietButton} onClick={() => setProposal(null)}>Clear local proposal</button> : null}
      </div>
      {proposal ? (
        <div className={styles.localProposal} role="status">
          <Sparkles aria-hidden="true" />
          <span><strong>{proposal.summary}</strong><small>{proposal.rationale ?? "No review rationale supplied."} · not saved · not approved · not transmitted · not executable</small></span>
        </div>
      ) : null}
    </div>
  )
}

function StandardsReadiness() {
  const unsupported = "JADC2/CJADC2 · Link 16/J-series · MIL-STD-2525D/APP-6 · STIX/TAXII · NATO STANAG · Palantir/Lattice/Platform One"
  return (
    <div className={styles.standardsWidget}>
      <div className={styles.standardsBoundary}>
        <ShieldAlert aria-hidden="true" />
        <span><strong>NO INTEROPERABILITY OR ACCREDITATION CLAIM</strong><small>Commercial UNCLASSIFIED only. Reference catalogs are not assessment evidence.</small></span>
      </div>
      <div className={styles.seamTable} role="table" aria-label="Standards and exchange profile inventory">
        <div className={styles.seamHeader} role="row"><span>Profile seam</span><span>Identification</span><span>Integration</span><span>Verification</span><span>Claim</span></div>
        {STANDARDS_PROFILE_SEAMS.map((item) => (
          <div className={styles.seamRow} role="row" key={item.id}>
            <span role="cell"><strong>{item.label}</strong><small>{item.id}</small></span>
            <span role="cell">{humanize(item.profile)}</span>
            <span role="cell">{humanize(item.state)}</span>
            <span role="cell">UNVERIFIED</span>
            <span role="cell">NONE</span>
          </div>
        ))}
      </div>
      <p className={styles.profileGap}><strong>Named profile gap:</strong> {unsupported}. All remain disabled/unverified; no gateway, edition, schema, authorization, signing, markings, or bearer is selected.</p>
    </div>
  )
}

function ControlSafetyBoundary() {
  return (
    <div className={styles.safetyWidget}>
      <div className={styles.safetyColumns}>
        <div>
          <span className={styles.sectionLabel}>Bidirectional handoff contracts · definitions only</span>
          <ul className={styles.handoffList}>
            {COORDINATION_HANDOFF_SEAMS.map((seam) => (
              <li key={seam.direction}>
                <GitBranch aria-hidden="true" />
                <span><strong>{humanize(seam.direction)}</strong><small>{seam.note}</small><small>Required: {seam.fieldsRequired.join(" · ")}</small></span>
                <b>DISABLED</b>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className={styles.sectionLabel}>Future certified device plane · prerequisites unmet</span>
          <ul className={styles.prerequisiteList}>
            {CERTIFIED_CONTROL_PREREQUISITES.map((item) => (
              <li key={item.id}><ShieldAlert aria-hidden="true" /><span><strong>{item.label}</strong><small>Profile unidentified · unverified · disabled</small></span></li>
            ))}
          </ul>
        </div>
      </div>
      <p className={styles.ackBoundary}>
        <ShieldAlert aria-hidden="true" />
        <span><strong>Positive device-originated outcome proof is unavailable.</strong><small>{GCS_ACKNOWLEDGMENT_BOUNDARY.note}</small></span>
      </p>
    </div>
  )
}

function ReviewQueue({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: CommandSnapshot
  selectedId: string | null
  onSelect: (review: ReviewItem) => void
}) {
  return (
    <section className={styles.reviewColumn} aria-labelledby="review-queue-heading">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Human ownership</span>
          <h2 id="review-queue-heading">Review assignments</h2>
        </div>
        <span className={styles.countChip}>
          {snapshot.condition === "unavailable"
            ? "UNAVAILABLE"
            : snapshot.condition === "simulated"
              ? `${snapshot.reviews.length} SIMULATED`
              : `${snapshot.reviews.length} RECORDS`}
        </span>
      </header>
      <div className={styles.reviewList}>
        {snapshot.reviews.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox aria-hidden="true" />
            <strong>No validated review records</strong>
            <p>No approval, rejection, or all-clear is inferred.</p>
          </div>
        ) : (
          snapshot.reviews.map((review) => (
            <button
              type="button"
              key={review.id}
              className={`${styles.reviewItem} ${selectedId === review.id ? styles.reviewItemSelected : ""}`}
              aria-pressed={selectedId === review.id}
              onClick={() => onSelect(review)}
            >
              <span className={`${styles.reviewState} ${styles[`review_${review.state}`]}`}>
                {review.synthetic ? <Sparkles aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
              </span>
              <span>
                <span className={styles.itemMeta}>
                  <b>{humanize(review.kind)}</b>
                  <small>{humanize(review.state)}</small>
                </span>
                <strong>{review.id}</strong>
                <small>Assigned: {review.assignedTo ?? "UNASSIGNED"}</small>
                <small>{review.objectIds.length > 0 ? `${review.objectIds.length} object link(s)` : "No object links"} · {review.evidenceIds.length > 0 ? `${review.evidenceIds.length} evidence link(s)` : "No evidence links"}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))
        )}
      </div>
    </section>
  )
}

function PackagePreview({ snapshot }: { snapshot: CommandSnapshot }) {
  const selectedObject = snapshot.objects.find((item) => snapshot.packagePreview.objectIds.includes(item.id))
  const selectedEvidence = snapshot.evidence.find((item) => snapshot.packagePreview.evidenceIds.includes(item.id))
  return (
    <section className={styles.packageColumn} aria-labelledby="package-preview-heading">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Intelligence package</span>
          <h2 id="package-preview-heading">Diff &amp; preview</h2>
        </div>
        <span className={`${styles.statusChip} ${styles[`readiness_${snapshot.packagePreview.messageReadiness}`]}`}>
          {humanize(snapshot.packagePreview.messageReadiness)}
        </span>
      </header>
      <div className={styles.packageBody}>
        <div className={styles.objectBrief}>
          <span className={styles.objectGlyph}>{selectedObject ? selectedObject.domain.slice(0, 2).toUpperCase() : "—"}</span>
          <div>
            <strong>{selectedObject?.name ?? snapshot.packagePreview.title}</strong>
            <p>{selectedObject?.summary ?? "No validated environmental object is linked to this package."}</p>
          </div>
        </div>
        <div className={styles.diffGrid}>
          <div>
            <span>Current</span>
            <ul>
              {snapshot.packagePreview.before.length > 0 ? snapshot.packagePreview.before.map((line) => <li key={line}>{line}</li>) : <li>UNAVAILABLE</li>}
            </ul>
          </div>
          <div>
            <span>Proposed local change</span>
            <ul>
              {snapshot.packagePreview.proposed.length > 0 ? snapshot.packagePreview.proposed.map((line) => <li key={line}>{line}</li>) : <li>NONE</li>}
            </ul>
          </div>
        </div>
        <dl className={styles.compactMeta}>
          <div><dt>Affected objects</dt><dd>{ids(snapshot.packagePreview.objectIds)}</dd></div>
          <div><dt>Evidence</dt><dd>{ids(snapshot.packagePreview.evidenceIds)}</dd></div>
          <div><dt>Verification</dt><dd>{selectedEvidence ? humanize(selectedEvidence.verificationState) : "UNAVAILABLE"}</dd></div>
          <div><dt>Integrity</dt><dd>{selectedEvidence ? humanize(selectedEvidence.integrityState) : "UNAVAILABLE"}</dd></div>
          <div><dt>Provenance</dt><dd>{snapshot.packagePreview.provenance.length > 0 ? snapshot.packagePreview.provenance.join(" · ") : "UNAVAILABLE"}</dd></div>
          <div><dt>External release</dt><dd className={styles.blockedText}>DISABLED</dd></div>
        </dl>
      </div>
    </section>
  )
}

function DecisionGate({
  snapshot,
  review,
  reviewMode,
  onReviewMode,
  onComplete,
}: {
  snapshot: CommandSnapshot
  review: ReviewItem | null
  reviewMode: boolean
  onReviewMode: (active: boolean) => void
  onComplete: () => void
}) {
  const [decision, setDecision] = useState<ReviewDecision>("deferred")
  const [judgment, setJudgment] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [writeState, setWriteState] = useState<{ state: "idle" | "writing" | "success" | "error"; message: string }>({ state: "idle", message: "" })
  const disclosure = review ? buildDecisionDisclosure(review, decision, judgment) : null
  const localRoute = snapshot.recipients.find((item) => item.kind === "local-review")
  const simulated = snapshot.context.mode === "simulated"
  const canPersist = Boolean(
    review &&
      snapshot.context.mode === "live" &&
      review.namespace === "operational" &&
      !review.synthetic &&
      localRoute?.readiness === "reviewable",
  )

  useEffect(() => {
    setDecision("deferred")
    setJudgment("")
    setConfirmed(false)
    setWriteState({ state: "idle", message: "" })
  }, [review?.id, review?.revision])

  const submit = async () => {
    if (!review || !disclosure || !confirmed || !judgment.trim()) return
    if (simulated) {
      setWriteState({
        state: "success",
        message: `SIMULATED ${decision.toUpperCase()} disposition staged in this browser only. No operational record changed.`,
      })
      return
    }
    if (!canPersist || !snapshot.context.missionId) {
      setWriteState({ state: "error", message: "Local review persistence is not verified or authorized for this state." })
      return
    }
    setWriteState({ state: "writing", message: "Applying the local review revision…" })
    try {
      const result = await runtimeCommandControlProvider.decideReview(
        snapshot.context,
        review,
        {
          reviewId: review.id,
          expectedRevision: review.revision,
          missionId: snapshot.context.missionId,
          missionContextId: snapshot.context.contextId,
          objectIds: [...review.objectIds],
          evidenceIds: [...review.evidenceIds],
          previousState: review.state,
          decision,
          judgment: judgment.trim(),
        },
      )
      setWriteState({
        state: result.warning ? "error" : "success",
        message: result.warning ?? `Local review ${result.review.id} updated and append-only activity recorded.`,
      })
      if (!result.warning) onComplete()
    } catch (error) {
      setWriteState({ state: "error", message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <section className={styles.decisionColumn} aria-labelledby="decision-gate-heading">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Human release gate</span>
          <h2 id="decision-gate-heading">Policy &amp; approval</h2>
        </div>
        {reviewMode ? (
          <button type="button" className={styles.iconOnlyButton} onClick={() => onReviewMode(false)} aria-label="Exit review mode">
            <X aria-hidden="true" />
          </button>
        ) : null}
      </header>
      <div className={styles.decisionBody}>
        <ul className={styles.gateList}>
          {snapshot.policyGates.map((gate) => <GateRow key={gate.id} gate={gate} />)}
        </ul>
        <div className={styles.releaseLock}>
          <LockKeyhole aria-hidden="true" />
          <span>
            <strong>EXTERNAL RELEASE DISABLED</strong>
            <small>No send, command issuance, tasking, actuation, or connector call is implemented.</small>
          </span>
        </div>
        <div className={styles.releaseLock}>
          <ShieldAlert aria-hidden="true" />
          <span>
            <strong>AUTHORIZATION FAIL · OPERATIONAL CHANGES LOCKED</strong>
            <small>Server-verified identity and scoped authorization are unavailable. Query values, role hints, and development headers cannot authorize mutation, approval, export, release, dispatch, or device action.</small>
          </span>
        </div>

        {!reviewMode ? (
          <button
            type="button"
            className={styles.reviewModeButton}
            onClick={() => onReviewMode(true)}
            disabled={!review}
          >
            <Eye aria-hidden="true" />
            Enter human review mode
          </button>
        ) : review && disclosure ? (
          <div className={styles.decisionForm}>
            <fieldset className={styles.decisionSegments}>
              <legend>Proposed disposition</legend>
              <div>
                {(["accepted", "deferred", "rejected"] as const).map((item) => (
                  <button key={item} type="button" aria-pressed={decision === item} onClick={() => setDecision(item)}>
                    {humanize(item)}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className={styles.judgmentField}>
              <span>Human judgment</span>
              <textarea
                value={judgment}
                onChange={(event) => setJudgment(event.target.value)}
                placeholder="Required. State the evidence basis, uncertainty, and reason for the local review disposition."
                maxLength={8192}
              />
            </label>
            <dl className={styles.disclosure}>
              <div><dt>Proposed change</dt><dd>{disclosure.proposedChange}</dd></div>
              <div><dt>Affected environmental objects</dt><dd>{ids(disclosure.affectedObjectIds)}</dd></div>
              <div><dt>Evidence</dt><dd>{ids(disclosure.evidenceIds)}</dd></div>
              <div><dt>Policy result</dt><dd>{disclosure.policyResult.result.toUpperCase()} · {disclosure.policyResult.reason}</dd></div>
              <div><dt>External side effects</dt><dd>{disclosure.externalSideEffects}</dd></div>
              <div><dt>Required human approval</dt><dd>{disclosure.requiredHumanApproval}</dd></div>
            </dl>
            <label className={styles.confirmRow}>
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>I inspected the objects, evidence, policy result, and side-effect disclosure.</span>
            </label>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={() => void submit()}
              disabled={!confirmed || !judgment.trim() || writeState.state === "writing" || (!simulated && !canPersist)}
            >
              {writeState.state === "writing" ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
              {simulated ? "Stage simulated disposition" : "Operational review update locked"}
            </button>
            {writeState.message ? (
              <p className={`${styles.writeNotice} ${styles[`write_${writeState.state}`]}`} role={writeState.state === "error" ? "alert" : "status"}>
                {writeState.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function TruthLedger({ truth, recipients }: { truth: EndpointTruth[]; recipients: CommandSnapshot["recipients"] }) {
  return (
    <div className={styles.truthLedger}>
      <div className={styles.truthTable} role="table" aria-label="Endpoint truth ledger">
        <div className={styles.truthHeader} role="row">
          <span>Endpoint</span><span>Transport</span><span>Identity</span><span>Schema</span><span>Freshness</span><span>Coverage</span><span>Data</span>
        </div>
        {truth.map((item) => (
          <div className={styles.truthRow} role="row" key={`${item.id}:${item.endpoint}`}>
            <span role="cell"><strong>{item.label}</strong><small>{item.endpoint}</small></span>
            <span role="cell">{item.transport.toUpperCase()}<small>{item.httpStatus ?? "NO HTTP"}</small></span>
            <span role="cell">{humanize(item.identity)}</span>
            <span role="cell">{humanize(item.schema)}</span>
            <span role="cell">{humanize(item.freshness)}</span>
            <span role="cell">{humanize(item.coverage)}</span>
            <span role="cell">{humanize(item.dataPresence)}<small>{item.recordCount === null ? "COUNT UNKNOWN" : `${item.recordCount} RECORD(S)`}</small></span>
            <p>{item.note}<br /><b>Provenance:</b> {item.provenance}</p>
          </div>
        ))}
      </div>
      <div className={styles.routeList}>
        {recipients.map((route) => (
          <div key={route.id} className={route.kind === "external-disabled" ? styles.routeDisabled : styles.routeLocal}>
            {route.kind === "external-disabled" ? <LockKeyhole aria-hidden="true" /> : <Database aria-hidden="true" />}
            <span>
              <strong>{route.label}</strong>
              <small>{route.endpoint} · {route.identity} · {route.schema}</small>
              <small>{route.note}</small>
            </span>
            <b>{route.readiness.toUpperCase()}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function ObservationRequests({ snapshot }: { snapshot: CommandSnapshot }) {
  const [draft, setDraft] = useState("")
  const [staged, setStaged] = useState<string | null>(null)
  const recommendation = snapshot.recommendations[0]
  const affectedObjects = recommendation?.objectIds ?? snapshot.packagePreview.objectIds
  const evidence = recommendation?.evidenceIds ?? snapshot.packagePreview.evidenceIds
  return (
    <div className={styles.observationWidget}>
      {snapshot.recommendations.length === 0 ? (
        <div className={styles.emptyStateCompact}>
          <Radio aria-hidden="true" />
          <span><strong>No validated observation recommendation</strong><small>No request or no-action conclusion is inferred.</small></span>
        </div>
      ) : (
        <ul className={styles.recommendationList}>
          {snapshot.recommendations.map((item) => (
            <li key={item.id}>
              <Radio aria-hidden="true" />
              <span><strong>{item.label}</strong><small>{item.rationale}</small><small>Objects: {ids(item.objectIds)} · Evidence: {ids(item.evidenceIds)}</small></span>
              <b>{humanize(item.state)}</b>
            </li>
          ))}
        </ul>
      )}
      <label className={styles.draftField}>
        <span>Session-local observation-request draft</span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Draft a passive observation recommendation for human review. This never tasks a device or external actor."
          maxLength={1200}
        />
      </label>
      <dl className={styles.miniDisclosure}>
        <div><dt>Proposed change</dt><dd>Stage text in this browser session only</dd></div>
        <div><dt>Affected objects</dt><dd>{ids(affectedObjects)}</dd></div>
        <div><dt>Evidence</dt><dd>{ids(evidence)}</dd></div>
        <div><dt>Policy</dt><dd>LOCAL DRAFT · HUMAN REVIEW REQUIRED</dd></div>
        <div><dt>External side effects</dt><dd>NONE</dd></div>
      </dl>
      <button
        type="button"
        className={styles.quietButton}
        onClick={() => setStaged(draft.trim())}
        disabled={!draft.trim()}
      >
        <ListChecks aria-hidden="true" /> Stage local draft
      </button>
      {staged ? <p className={styles.localDraftNotice} role="status">Draft staged in memory only · not saved · not transmitted.</p> : null}
    </div>
  )
}

function Acknowledgments({ snapshot }: { snapshot: CommandSnapshot }) {
  return (
    <div className={styles.ackWidget}>
      <div className={styles.ackHeadline}>
        <Inbox aria-hidden="true" />
        <span><strong>External acknowledgments unavailable</strong><small>The v1 contract has no recipient acknowledgment resource and no message was sent.</small></span>
      </div>
      <ul>
        {snapshot.handoffs.length === 0 ? (
          <li><CircleDashed aria-hidden="true" /><span><strong>No context handoff records</strong><small>Absence is not an acknowledgment.</small></span></li>
        ) : (
          snapshot.handoffs.map((handoff) => (
            <li key={handoff.id}>
              <GitBranch aria-hidden="true" />
              <span><strong>{handoff.sourceApplication} → {handoff.targetApplication}</strong><small>{formatUtc(handoff.createdAt)} · context continuity only</small></span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function DecisionTimeline({ snapshot }: { snapshot: CommandSnapshot }) {
  return (
    <ol className={styles.timeline}>
      {snapshot.activity.length === 0 ? (
        <li><CircleDashed aria-hidden="true" /><span><strong>No activity records</strong><small>No decision history or no-action conclusion is inferred.</small></span></li>
      ) : (
        snapshot.activity.map((item) => (
          <li key={item.id}>
            <span className={styles.timelineMarker}>{item.namespace === "demo" ? <Sparkles aria-hidden="true" /> : <Activity aria-hidden="true" />}</span>
            <span>
              <strong>{humanize(item.actionType)}</strong>
              <small>{formatUtc(item.occurredAt)} · {item.actorId} · {item.actorRole}</small>
              <p>{item.judgment ?? "No human judgment text recorded."}</p>
              <small>Objects: {ids(item.objectIds)} · Evidence: {ids(item.evidenceIds)}</small>
            </span>
          </li>
        ))
      )}
    </ol>
  )
}

function ExportPreview({ snapshot }: { snapshot: CommandSnapshot }) {
  return (
    <div className={styles.exportWidget}>
      <div className={styles.exportBanner}>
        <FileJson aria-hidden="true" />
        <span><strong>LOCAL PREVIEW ONLY · AUTHORIZATION FAIL · EXTERNAL RELEASE DISABLED</strong><small>No file is created, no record is changed, and no recipient is contacted.</small></span>
      </div>
      <pre tabIndex={0}>{JSON.stringify(snapshot.packagePreview.exportPreview, null, 2)}</pre>
      <dl className={styles.miniDisclosure}>
        <div><dt>Policy result</dt><dd>HOLD · SERVER AUTHORIZATION UNAVAILABLE</dd></div>
        <div><dt>Provenance</dt><dd>{snapshot.packagePreview.provenance.length > 0 ? snapshot.packagePreview.provenance.join(" · ") : "UNAVAILABLE"}</dd></div>
        <div><dt>External side effects</dt><dd>NONE</dd></div>
        <div><dt>Required approval</dt><dd>Human review plus a future authorized release contract</dd></div>
      </dl>
    </div>
  )
}

function Gaps({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null
  return (
    <section className={styles.gapPanel} aria-labelledby="declared-gaps-heading">
      <header><ShieldAlert aria-hidden="true" /><h2 id="declared-gaps-heading">Declared holds &amp; gaps</h2></header>
      <ul>{gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
    </section>
  )
}

export function CommandControlDashboard({ initialNowMs }: { initialNowMs: number }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const searchKey = searchParams.toString()
  const requestedContext = useMemo(
    () => parseCommandContext(new URLSearchParams(searchKey), initialNowMs),
    [initialNowMs, searchKey],
  )
  const [snapshot, setSnapshot] = useState<CommandSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const operationalContextRef = useRef<CommandContext | null>(null)

  const navigate = useCallback((next: CommandContext) => {
    const current = snapshot?.context ?? requestedContext
    let target = next
    if (current.mode !== "simulated" && next.mode === "simulated") {
      operationalContextRef.current = current
    } else if (current.mode === "simulated" && next.mode !== "simulated") {
      target = { ...(operationalContextRef.current ?? requestedContext), mode: next.mode }
    }
    router.replace(buildCommandLink("commandControl", target), { scroll: false })
  }, [requestedContext, router, snapshot?.context])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setSnapshot(null)
    setLoadError(null)
    void runtimeCommandControlProvider
      .load(requestedContext, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return
        setSnapshot(next)
        if (next.context.mode !== "simulated") operationalContextRef.current = next.context
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setLoadError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [refreshKey, requestedContext])

  useEffect(() => {
    if (!snapshot) return
    const preferred = snapshot.reviews.find(
      (item) =>
        (snapshot.context.selectedEvidenceId && item.evidenceIds.includes(snapshot.context.selectedEvidenceId)) ||
        (snapshot.context.selectedObjectId && item.objectIds.includes(snapshot.context.selectedObjectId)),
    ) ?? snapshot.reviews.find((item) => item.state === "in_review") ?? snapshot.reviews[0] ?? null
    setSelectedReviewId((current) => snapshot.reviews.some((item) => item.id === current) ? current : preferred?.id ?? null)
    setReviewMode(false)
  }, [snapshot])

  const context = snapshot?.context ?? requestedContext
  const selectedReview = snapshot?.reviews.find((item) => item.id === selectedReviewId) ?? null
  const supportingWidgets = snapshot
    ? [
        {
          id: "mission-plan-proposal",
          label: "Mission plan & natural-language proposal",
          content: <MissionPlanProposal snapshot={snapshot} />,
        },
        {
          id: "observation-requests",
          label: "Observation recommendations & requests",
          content: <ObservationRequests snapshot={snapshot} />,
        },
        {
          id: "route-validation",
          label: "Endpoint, recipient & routing validation",
          content: <TruthLedger truth={snapshot.truth} recipients={snapshot.recipients} />,
        },
        {
          id: "standards-readiness",
          label: "Standards & exchange-profile readiness",
          content: <StandardsReadiness />,
        },
        {
          id: "control-safety",
          label: "GCS / Earth handoffs & future control safety",
          content: <ControlSafetyBoundary />,
        },
        {
          id: "acknowledgments",
          label: "Acknowledgment history",
          content: <Acknowledgments snapshot={snapshot} />,
        },
        {
          id: "decision-timeline",
          label: `${snapshot.context.mode === "replay" ? "Replay" : "Decision"} timeline`,
          content: <DecisionTimeline snapshot={snapshot} />,
        },
        {
          id: "export-preview",
          label: "Export preview",
          content: <ExportPreview snapshot={snapshot} />,
        },
      ]
    : []

  return (
    <div className={styles.page} data-mode={context.mode}>
      <ContextFrame
        context={context}
        snapshot={snapshot}
        loading={loading}
        onNavigate={navigate}
        onRefresh={() => setRefreshKey((value) => value + 1)}
      />
      <ConditionNotice snapshot={snapshot} loading={loading} />
      {loadError ? <p className={styles.errorNotice} role="alert">Provider failed: {loadError}. No fallback data was inserted.</p> : null}

      {snapshot ? (
        <>
          <PlanStrip snapshot={snapshot} />
          <DeviceCoordinationPanel
            context={snapshot.context}
            onSelectDevice={(selectedDeviceId) => navigate({ ...snapshot.context, selectedDeviceId })}
          />
          <section className={styles.primaryWorkspace} aria-label="Human-owned coordination and release review workbench">
            <ReviewQueue
              snapshot={snapshot}
              selectedId={selectedReviewId}
              onSelect={(review) => {
                setSelectedReviewId(review.id)
                setReviewMode(false)
                navigate({
                  ...snapshot.context,
                  selectedObjectId: review.objectIds[0] ?? snapshot.context.selectedObjectId,
                  selectedEvidenceId: review.evidenceIds[0] ?? snapshot.context.selectedEvidenceId,
                })
              }}
            />
            <PackagePreview snapshot={snapshot} />
            <DecisionGate
              snapshot={snapshot}
              review={selectedReview}
              reviewMode={reviewMode}
              onReviewMode={setReviewMode}
              onComplete={() => setRefreshKey((value) => value + 1)}
            />
          </section>

          <nav className={styles.contextLinks} aria-label="Context-preserving Fusarium links">
            <span><Link2 aria-hidden="true" /> Preserve context</span>
            <Link href={buildCommandLink("overview", snapshot.context)}>Overview</Link>
            <Link href={buildCommandLink("situationalAwareness", snapshot.context)}>Situational Awareness</Link>
            <Link href={buildCommandLink("dataFusion", snapshot.context)}>Data Fusion</Link>
            <Link href={buildCommandLink("oeiNarrative", snapshot.context)}>OEI Narrative</Link>
            <Link href={buildCommandLink("stackInventory", snapshot.context)}>Stack Inventory</Link>
            <Link href={buildCommandLink("earthSimulator", snapshot.context)}>Earth Simulator</Link>
          </nav>

          <CommandOperationalLayout widgets={supportingWidgets} />
          <Gaps gaps={[
            ...snapshot.gaps,
            "GCS remains the device-specific application; its read adapter and reverse context handoff are disabled and unverified in C2.",
            "Fleet entries are static catalog identities only; no telemetry, readiness, location, or device execution is observed.",
            "Psathyrella aliases remain unresolved and cannot select a physical target.",
            "Earth Simulator is a context-preserving link only; no map, layer, device-state, or reverse-selection contract is verified.",
            "A GCS ledger acknowledgment is not device-originated proof of receipt, outcome, or physical execution.",
            "Interoperability and safety-assurance profiles remain unidentified; military, JADC2, FedRAMP, and accreditation claims are absent.",
          ]} />
        </>
      ) : (
        <div className={styles.loadingWorkspace} aria-hidden="true">
          <div /><div /><div />
        </div>
      )}
    </div>
  )
}
