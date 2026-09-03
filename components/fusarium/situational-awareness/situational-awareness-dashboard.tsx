"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Box,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Cloud,
  Database,
  Droplets,
  Eye,
  FileSearch,
  GitBranch,
  Grid3X3,
  Globe2,
  Layers3,
  Leaf,
  List,
  LoaderCircle,
  Map as MapIcon,
  Network,
  Plus,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Sprout,
  TriangleAlert,
  Waves,
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
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  buildSituationalHandoffLink,
  buildSituationalSelfLink,
  parseSituationalContext,
} from "@/lib/fusarium/situational-awareness/deep-links"
import { runtimeSituationalAwarenessProvider } from "@/lib/fusarium/situational-awareness/provider"
import {
  DOMAIN_LABELS,
  deriveCondition,
  type EnvironmentalDomain,
  type EnvironmentalObject,
  type EvidenceRecord,
  type SituationalCondition,
  type SituationalContext,
  type SituationalSnapshot,
  type SituationalView,
} from "@/lib/fusarium/situational-awareness/contracts"
import {
  addBrowserMissionArea,
  parseBrowserMissionAreas,
  serializeBrowserMissionAreas,
  SITUATIONAL_MISSION_AREAS_STORAGE_KEY,
  type BrowserMissionArea,
} from "@/lib/fusarium/situational-awareness/mission-areas"
import { FormSpaceWorkbench } from "./form-space-workbench"
import { OperationalLayout } from "./operational-layout"
import styles from "./situational-awareness.module.css"

const CREPDashboardLoader = dynamic(
  () => import("@/app/dashboard/crep/CREPDashboardLoader"),
  {
    ssr: false,
    loading: () => (
      <div className={styles.routeLoading} role="status">
        <LoaderCircle className={styles.spin} aria-hidden="true" />
        <strong>Loading the existing Earth renderer</strong>
        <p>Earth layers retain their own source truth when the renderer becomes available.</p>
      </div>
    ),
  },
)

const DOMAIN_META: Record<
  EnvironmentalDomain,
  { icon: LucideIcon; symbol: string; description: string }
> = {
  atmosphere: { icon: Wind, symbol: "○", description: "Air, weather, aerosol, spectral" },
  water: { icon: Droplets, symbol: "◇", description: "Surface, groundwater, marine" },
  land: { icon: Sprout, symbol: "□", description: "Land, terrain, soil" },
  living: { icon: Leaf, symbol: "✣", description: "Funga, flora, fauna, ecological response" },
  infrastructure: { icon: Building2, symbol: "△", description: "Built and instrumented systems" },
  process: { icon: Workflow, symbol: "⬡", description: "Causal and environmental processes" },
}

const CONDITION_META: Record<
  SituationalCondition,
  { label: string; icon: LucideIcon; tone: string; message: string }
> = {
  loading: {
    label: "LOADING",
    icon: LoaderCircle,
    tone: "loading",
    message: "Binding the runtime. No environmental value is inferred while sources load.",
  },
  empty: {
    label: "CONNECTED · NO RECORDS",
    icon: CircleDashed,
    tone: "empty",
    message: "Bound sources returned accepted UNCLASSIFIED response shapes with no environmental records. Empty is not environmentally clear.",
  },
  partial: {
    label: "PARTIAL COVERAGE",
    icon: TriangleAlert,
    tone: "partial",
    message: "At least one required source is unavailable. Read every object with the coverage gaps shown below.",
  },
  stale: {
    label: "STALE",
    icon: Clock3,
    tone: "stale",
    message: "Records exist, but every record is beyond its source freshness window.",
  },
  error: {
    label: "RUNTIME UNREACHABLE",
    icon: XCircle,
    tone: "error",
    message: "No required source returned an accepted response. No synthetic fallback has been inserted.",
  },
  unauthorized: {
    label: "UNAUTHORIZED",
    icon: ShieldCheck,
    tone: "error",
    message: "The runtime rejected this browser session. Environmental state remains undisclosed.",
  },
  ready: {
    label: "RECORDS RECEIVED",
    icon: CheckCircle2,
    tone: "ready",
    message: "Accepted UNCLASSIFIED compatibility records are visible with source-level freshness and known contract gaps; identity is not asserted.",
  },
  simulated: {
    label: "SIMULATED",
    icon: Sparkles,
    tone: "simulated",
    message: "Sanitized deterministic scenario enabled. Scenario records do not create tasks, sends, or backend state.",
  },
}

const SEVERITY_ORDER: Record<EnvironmentalObject["severity"], number> = {
  urgent: 4,
  material: 3,
  watch: 2,
  baseline: 1,
  unknown: 0,
}

function formatTime(value: string | null): string {
  if (!value) return "time unavailable"
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return "time unavailable"
  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatUtc(value: string | null): string {
  if (!value) return "—"
  const parsed = Date.parse(value)
  return Number.isFinite(parsed)
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
        timeZoneName: "short",
      }).format(parsed)
    : "—"
}

function confidenceText(value: number | null): string {
  return value === null ? "NOT ASSESSED" : `${Math.round(value * 100)}%`
}

function currentFreshness(
  item: Pick<EnvironmentalObject, "synthetic" | "observedAt" | "staleAfterSeconds" | "freshness">,
  nowMs: number,
): EnvironmentalObject["freshness"] {
  if (item.synthetic) return "simulated"
  if (!item.observedAt || item.staleAfterSeconds === null) return "unknown"
  const observedMs = Date.parse(item.observedAt)
  if (!Number.isFinite(observedMs)) return "unknown"
  return nowMs - observedMs > item.staleAfterSeconds * 1000 ? "stale" : "fresh"
}

function trendIcon(trend: EnvironmentalObject["trend"]): ReactNode {
  if (trend === "rising") return <ArrowUpRight aria-hidden="true" />
  if (trend === "falling") return <ArrowDownRight aria-hidden="true" />
  if (trend === "steady") return <ArrowRight aria-hidden="true" />
  return <CircleDashed aria-hidden="true" />
}

function ConditionNotice({
  condition,
  note,
}: {
  condition: SituationalCondition
  note?: string
}) {
  const meta = CONDITION_META[condition]
  const Icon = meta.icon
  return (
    <div className={`${styles.conditionNotice} ${styles[`condition_${meta.tone}`]}`} role="status">
      <Icon className={condition === "loading" ? styles.spin : undefined} aria-hidden="true" />
      <div>
        <strong>{meta.label}</strong>
        <span>{meta.message}</span>
        {note ? <small>{note}</small> : null}
      </div>
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <div className={styles.metric} title={hint}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
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
  context: SituationalContext
  snapshot: SituationalSnapshot | null
  loading: boolean
  onChange: (next: SituationalContext) => void
  onRefresh: () => void
}) {
  const [browserMissionAreas, setBrowserMissionAreas] = useState<BrowserMissionArea[]>([])
  const [missionAreaDraft, setMissionAreaDraft] = useState("")
  const [missionAreaMessage, setMissionAreaMessage] = useState("")

  useEffect(() => {
    try {
      setBrowserMissionAreas(parseBrowserMissionAreas(window.localStorage.getItem(SITUATIONAL_MISSION_AREAS_STORAGE_KEY)))
    } catch {
      setBrowserMissionAreas([])
      setMissionAreaMessage("Browser storage is unavailable; local mission areas will not survive a refresh.")
    }
  }, [])

  const missionOptions = [
    { id: "runtime-unscoped", label: "Area not configured · development environment" },
    { id: "demo-area-alpha-7", label: "Training Area ALPHA-7" },
    ...browserMissionAreas,
  ]
  if (!missionOptions.some((option) => option.id === context.missionAreaId)) {
    missionOptions.unshift({ id: context.missionAreaId, label: context.missionAreaLabel })
  }
  const acceptedSources = snapshot?.sources.filter((source) => source.responseAccepted).length ?? 0
  const sourceTotal = snapshot?.sources.filter((source) => !source.synthetic).length ?? 0
  const lastSourceSuccess = snapshot?.sources
    .filter((source) => !source.synthetic && source.responseAccepted && source.receivedAt)
    .map((source) => source.receivedAt as string)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  const identityRole = loading && !snapshot
    ? "CHECKING"
    : snapshot?.condition === "unauthorized"
      ? "REJECTED · ROLE UNKNOWN"
      : "IDENTITY NOT ASSERTED · ROLE NOT REPORTED"

  return (
    <section className={styles.contextFrame} aria-labelledby="mission-frame-heading">
      <div className={styles.contextTitle}>
        <div>
          <div className={styles.eyebrow}>ENVIN / OEI · Environmental fieldboard</div>
          <h1 id="mission-frame-heading">Situational Awareness</h1>
          <p>Environmental Common Operating Picture · evidence before consequence</p>
        </div>
        <div className={styles.contextActions}>
          <span className={styles.schemaChip} title="Frontend normalized contract">
            NORMALIZED VIEW
          </span>
          <button type="button" className={styles.iconTextButton} onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? styles.spin : undefined} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.contextControls}>
        <div className={styles.controlField}>
          <span id="sa-mission-area-label">Mission area · context only</span>
          <select
            aria-labelledby="sa-mission-area-label"
            value={context.missionAreaId}
            onChange={(event) => {
              const option = missionOptions.find((item) => item.id === event.target.value)
              onChange({
                ...context,
                missionAreaId: event.target.value,
                missionAreaLabel: option?.label ?? event.target.value,
                selectedObjectId: null,
                selectedEvidenceId: null,
              })
            }}
          >
            {missionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <small className={styles.contextOnly}>Context for handoff only; not applied to the currently bound feeds.</small>
          <span className={styles.missionAreaCreator}>
            <input
              value={missionAreaDraft}
              onChange={(event) => setMissionAreaDraft(event.target.value.slice(0, 120))}
              placeholder="Add mission area label"
              aria-label="New browser-local mission area label"
            />
            <button
              type="button"
              onClick={() => {
                const next = addBrowserMissionArea(browserMissionAreas, missionAreaDraft)
                const added = next.at(-1)
                if (!added || next.length === browserMissionAreas.length) {
                  setMissionAreaMessage("Enter a unique label; up to 20 browser-local areas are supported.")
                  return
                }
                setBrowserMissionAreas(next)
                try {
                  window.localStorage.setItem(SITUATIONAL_MISSION_AREAS_STORAGE_KEY, serializeBrowserMissionAreas(next))
                  setMissionAreaMessage("Saved in this browser only; no backend mission record was created.")
                } catch {
                  setMissionAreaMessage("Available for this page only; browser storage is unavailable and no backend mission record was created.")
                }
                setMissionAreaDraft("")
                onChange({
                  ...context,
                  missionAreaId: added.id,
                  missionAreaLabel: added.label,
                  selectedObjectId: null,
                  selectedEvidenceId: null,
                })
              }}
              disabled={!missionAreaDraft.trim()}
            >
              <Plus aria-hidden="true" /> Add
            </button>
          </span>
          {missionAreaMessage ? <small className={styles.contextOnly} role="status">{missionAreaMessage}</small> : null}
        </div>

        <fieldset className={styles.segmentField}>
          <legend>Time window · context only</legend>
          <div>
            {(["6h", "24h", "72h"] as const).map((window) => (
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
          <small className={styles.contextOnly}>Preserved for handoff; currently bound feeds are unfiltered.</small>
        </fieldset>

        <fieldset className={styles.segmentField}>
          <legend>Data mode</legend>
          <div>
            <button
              type="button"
              aria-pressed={context.dataMode === "system"}
              onClick={() =>
                onChange({
                  ...context,
                  dataMode: "system",
                  ...(context.missionAreaId === "demo-area-alpha-7"
                    ? { missionAreaId: "runtime-unscoped", missionAreaLabel: "Area not configured · development environment" }
                    : {}),
                  selectedObjectId: null,
                  selectedEvidenceId: null,
                })
              }
            >
              SYSTEM
            </button>
            <button
              type="button"
              aria-pressed={context.dataMode === "demo"}
              onClick={() =>
                onChange({
                  ...context,
                  dataMode: "demo",
                  missionAreaId:
                    context.missionAreaId === "runtime-unscoped" ? "demo-area-alpha-7" : context.missionAreaId,
                  missionAreaLabel:
                    context.missionAreaId === "runtime-unscoped"
                      ? "Training Area ALPHA-7"
                      : context.missionAreaLabel,
                  selectedObjectId: null,
                  selectedEvidenceId: null,
                })
              }
            >
              SANITIZED SCENARIO
            </button>
          </div>
        </fieldset>

        <div className={styles.truthFacts}>
          <div>
            <span>Environment</span>
            <strong title="Development listener; host-firewall and LAN reachability have not been proven.">DEVELOPMENT · NETWORK EXPOSURE UNVERIFIED</strong>
          </div>
          <div>
            <span>Identity / role</span>
            <strong title={identityRole}>{identityRole}</strong>
          </div>
          <div>
            <span>Server policy</span>
            <strong>UNCLASSIFIED ONLY</strong>
          </div>
          <div>
            <span>Area</span>
            <strong title={context.missionAreaLabel}>{context.missionAreaLabel}</strong>
          </div>
          <div>
            <span>Endpoint responses</span>
            <strong>{loading ? "CHECKING" : acceptedSources > 0 ? `${acceptedSources}/${sourceTotal} ACCEPTED` : "NO ACCEPTED RESPONSE"}</strong>
          </div>
          <div>
            <span>Last success</span>
            <strong>{loading ? "CHECKING" : lastSourceSuccess ? formatUtc(lastSourceSuccess) : "UNAVAILABLE"}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function ChangeQueue({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: SituationalSnapshot
  selectedId: string | null
  onSelect: (object: EnvironmentalObject) => void
}) {
  const [domain, setDomain] = useState<EnvironmentalDomain | "all">("all")
  const filtered = snapshot.objects
    .filter((object) => domain === "all" || object.domain === domain)
    .sort((left, right) => {
      const severity = SEVERITY_ORDER[right.severity] - SEVERITY_ORDER[left.severity]
      if (severity !== 0) return severity
      return (Date.parse(right.observedAt ?? "") || 0) - (Date.parse(left.observedAt ?? "") || 0)
    })

  return (
    <section className={`${styles.primaryPanel} ${styles.queuePanel}`} aria-labelledby="change-queue-heading">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Material change</span>
          <h2 id="change-queue-heading">Change queue</h2>
        </div>
        <span className={styles.countChip}>{filtered.length ? `${filtered.length} records` : "NO RECORDS"}</span>
      </header>
      <label className={styles.filterField}>
        <span>Domain</span>
        <select value={domain} onChange={(event) => setDomain(event.target.value as EnvironmentalDomain | "all") }>
          <option value="all">All domains</option>
          {Object.entries(DOMAIN_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.queueList}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <CircleDashed aria-hidden="true" />
            <strong>No environmental objects received</strong>
            <p>The runtime supplied no record for this filter. No all-clear is inferred.</p>
          </div>
        ) : (
          filtered.map((object) => {
            const Icon = DOMAIN_META[object.domain].icon
            const sourceLabels = snapshot.sources
              .filter((source) => object.sourceIds.includes(source.id))
              .map((source) => source.label)
            return (
              <button
                type="button"
                key={object.id}
                className={`${styles.queueItem} ${selectedId === object.id ? styles.queueItemSelected : ""}`}
                onClick={() => onSelect(object)}
                aria-pressed={selectedId === object.id}
              >
                <span className={`${styles.objectIcon} ${styles[`severity_${object.severity}`]}`}>
                  <Icon aria-hidden="true" />
                </span>
                <span className={styles.queueCopy}>
                  <span className={styles.queueMeta}>
                    <b>{object.statusLabel}</b>
                    <span>{formatTime(object.observedAt)}</span>
                  </span>
                  <strong>{object.name}</strong>
                  <small>{object.locationLabel ?? DOMAIN_LABELS[object.domain]}</small>
                  <small className={styles.truthStamp}>
                    {sourceLabels.join(" + ") || "Source unavailable"} · observed {formatUtc(object.observedAt)} · received {formatUtc(object.receivedAt)}
                  </small>
                  <span className={styles.queueSignals}>
                    <span>{trendIcon(object.trend)} {object.trend.replace("_", " ")}</span>
                    <span>{object.synthetic ? "SIMULATED" : object.freshness.toUpperCase()}</span>
                  </span>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

interface LayerState {
  areas: boolean
  changes: boolean
  sensors: boolean
  relationships: boolean
}

function MapPicture({
  snapshot,
  selectedId,
  layers,
  onSelect,
}: {
  snapshot: SituationalSnapshot
  selectedId: string | null
  layers: LayerState
  onSelect: (object: EnvironmentalObject) => void
}) {
  const plotted = snapshot.objects.filter((object) => {
    if (!object.position) return false
    if (object.kind === "sensor") return layers.sensors
    return layers.changes
  })
  const objectById = new Map(snapshot.objects.map((object) => [object.id, object]))

  return (
    <div className={styles.mapStage} aria-label="Schematic environmental spatial picture">
      <svg className={styles.mapGrid} viewBox="0 0 100 100" role="img" aria-label="Schematic mission-area grid">
        <defs>
          <pattern id="sa-grid-small" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" strokeWidth="0.15" />
          </pattern>
          <pattern id="sa-grid-large" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="url(#sa-grid-small)" />
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#sa-grid-large)" />
        <path className={styles.contour} d="M4 82 C22 62, 25 75, 45 61 S75 45, 97 53" />
        <path className={styles.waterLine} d="M3 20 C18 26, 31 47, 48 52 S79 57, 98 85" />
        {layers.areas
          ? snapshot.watchAreas.map((area) => (
              <polygon
                key={area.id}
                className={styles.watchPolygon}
                points={area.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
              />
            ))
          : null}
        {layers.relationships
          ? snapshot.relationships.map((relationship) => {
              const from = objectById.get(relationship.fromId)?.position
              const to = objectById.get(relationship.toId)?.position
              if (!from || !to) return null
              return (
                <line
                  key={relationship.id}
                  className={styles.relationshipLine}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              )
            })
          : null}
      </svg>

      <div className={styles.mapCoordinates} aria-hidden="true">
        <span>N</span>
        <span>SCHEMATIC / NOT NAVIGATIONAL</span>
        <span>100</span>
      </div>

      {plotted.map((object) => {
        const position = object.position!
        const sourceLabels = snapshot.sources
          .filter((source) => object.sourceIds.includes(source.id))
          .map((source) => source.label)
        const markerStyle = {
          "--sa-x": `${position.x}%`,
          "--sa-y": `${position.y}%`,
        } as CSSProperties
        return (
          <button
            type="button"
            key={object.id}
            className={`${styles.mapMarker} ${styles[`severity_${object.severity}`]} ${
              selectedId === object.id ? styles.mapMarkerSelected : ""
            }`}
            style={markerStyle}
            onClick={() => onSelect(object)}
            aria-label={`${object.name}, ${DOMAIN_LABELS[object.domain]}, ${object.statusLabel}`}
            title={`${DOMAIN_META[object.domain].symbol} ${object.name}\n${object.statusLabel}\n${
              object.synthetic ? "SIMULATED" : object.freshness.toUpperCase()
            }\nSource: ${sourceLabels.join(" + ") || "unavailable"}\nObserved: ${formatUtc(object.observedAt)}\nReceived: ${formatUtc(object.receivedAt)}`}
          >
            <span>{DOMAIN_META[object.domain].symbol}</span>
            <small>{object.name}</small>
          </button>
        )
      })}

      {plotted.length === 0 ? (
        <div className={styles.mapEmpty}>
          <MapIcon aria-hidden="true" />
          <strong>NO SPATIAL FEATURES RECEIVED</strong>
          <span>Grid is a frame, not evidence of environmental absence.</span>
        </div>
      ) : null}
    </div>
  )
}

function EarthContextPicture({
  context,
  object,
}: {
  context: SituationalContext
  object: EnvironmentalObject | null
}) {
  const focusLocation =
    object?.position &&
    typeof object.position.latitude === "number" &&
    Number.isFinite(object.position.latitude) &&
    typeof object.position.longitude === "number" &&
    Number.isFinite(object.position.longitude)
      ? {
          lat: object.position.latitude,
          lng: object.position.longitude,
          name: object.name,
          zoom: 8,
        }
      : null
  return (
    <div className={styles.earthContextPicture} data-testid="sa-earth-simulator-context">
      <div className={styles.earthContextNotice} role="status">
        <Globe2 aria-hidden="true" />
        <span>
          <strong>Existing Earth Simulator renderer</strong>
          This view mounts the canonical CREP globe only after the operator selects Earth. Its field layers retain their own available, stale, empty, error, unbound, and cataloged states; selection does not turn them live.
        </span>
        <Link href={buildSituationalHandoffLink("earthSimulator", context)}>
          Open full Earth Simulator <ChevronRight aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.earthContextViewport}>
        <CREPDashboardLoader
          embedded
          homeHref="/fusarium"
          homeLabel="FUSARIUM"
          earthBakedNatureMinZoom={5}
          focusLocation={focusLocation}
        />
      </div>
    </div>
  )
}

function ListPicture({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: SituationalSnapshot
  selectedId: string | null
  onSelect: (object: EnvironmentalObject) => void
}) {
  if (snapshot.objects.length === 0) {
    return (
      <div className={styles.largeEmpty}>
        <List aria-hidden="true" />
        <strong>No object rows</strong>
        <p>There are no runtime objects in the selected mission/time context.</p>
      </div>
    )
  }
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            <th>Object</th>
            <th>Domain</th>
            <th>State</th>
            <th>Source</th>
            <th>Observed / received</th>
            <th>Freshness</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.objects.map((object) => {
            const sourceLabels = snapshot.sources
              .filter((source) => object.sourceIds.includes(source.id))
              .map((source) => source.label)
            return <tr key={object.id} data-selected={selectedId === object.id ? "true" : "false"}>
              <td>
                <button type="button" onClick={() => onSelect(object)}>
                  {DOMAIN_META[object.domain].symbol} {object.name}
                </button>
              </td>
              <td>{DOMAIN_LABELS[object.domain]}</td>
              <td>{object.statusLabel}</td>
              <td>{sourceLabels.join(" + ") || "Unavailable"}</td>
              <td>{formatUtc(object.observedAt)} / {formatUtc(object.receivedAt)}</td>
              <td>{object.synthetic ? "SIMULATED" : object.freshness.toUpperCase()}</td>
              <td>{confidenceText(object.confidence)}</td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  )
}

function TimelinePicture({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: SituationalSnapshot
  selectedId: string | null
  onSelect: (object: EnvironmentalObject) => void
}) {
  const ordered = [...snapshot.objects].sort(
    (left, right) => (Date.parse(right.observedAt ?? "") || 0) - (Date.parse(left.observedAt ?? "") || 0),
  )
  if (ordered.length === 0) {
    return (
      <div className={styles.largeEmpty}>
        <Clock3 aria-hidden="true" />
        <strong>No timeline records</strong>
        <p>History and replay are unavailable until a timestamped contract is bound.</p>
      </div>
    )
  }
  return (
    <ol className={styles.timeline}>
      {ordered.map((object) => {
        const sourceLabels = snapshot.sources
          .filter((source) => object.sourceIds.includes(source.id))
          .map((source) => source.label)
        return <li key={object.id} data-selected={selectedId === object.id ? "true" : "false"}>
          <time dateTime={object.observedAt ?? undefined}>{formatUtc(object.observedAt)}</time>
          <span className={`${styles.timelineDot} ${styles[`severity_${object.severity}`]}`} aria-hidden="true" />
          <button type="button" onClick={() => onSelect(object)}>
            <strong>{object.name}</strong>
            <span>{object.statusLabel} · {DOMAIN_LABELS[object.domain]}</span>
            <small>{sourceLabels.join(" + ") || "Source unavailable"} · received {formatUtc(object.receivedAt)} · {object.synthetic ? "SIMULATED" : object.freshness.toUpperCase()}</small>
          </button>
        </li>
      })}
    </ol>
  )
}

function SpatialPicture({
  snapshot,
  context,
  onContextChange,
  selectedId,
  onSelect,
}: {
  snapshot: SituationalSnapshot
  context: SituationalContext
  onContextChange: (next: SituationalContext) => void
  selectedId: string | null
  onSelect: (object: EnvironmentalObject) => void
}) {
  const [layers, setLayers] = useState<LayerState>({
    areas: true,
    changes: true,
    sensors: true,
    relationships: true,
  })
  const viewMeta: Array<{ id: SituationalView; label: string; icon: LucideIcon }> = [
    { id: "map", label: "Map", icon: MapIcon },
    { id: "earth", label: "Earth", icon: Globe2 },
    { id: "list", label: "List", icon: List },
    { id: "timeline", label: "Timeline", icon: Clock3 },
  ]
  const layerRows: Array<{ id: keyof LayerState; label: string; count: number; icon: LucideIcon }> = [
    { id: "areas", label: "Watch areas", count: snapshot.watchAreas.length, icon: Grid3X3 },
    {
      id: "changes",
      label: "Changes / processes",
      count: snapshot.objects.filter((object) => object.kind !== "sensor").length,
      icon: Activity,
    },
    {
      id: "sensors",
      label: "Registered sensors",
      count: snapshot.objects.filter((object) => object.kind === "sensor").length,
      icon: Radio,
    },
    { id: "relationships", label: "Relationships", count: snapshot.relationships.length, icon: GitBranch },
  ]

  return (
    <section className={`${styles.primaryPanel} ${styles.picturePanel}`} aria-labelledby="picture-heading">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Synchronized picture</span>
          <h2 id="picture-heading">Environmental state</h2>
        </div>
        <div className={styles.viewTabs} role="tablist" aria-label="Environmental picture view">
          {viewMeta.map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              id={`sa-view-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={context.view === id}
              aria-controls={`sa-view-panel-${id}`}
              tabIndex={context.view === id ? 0 : -1}
              onClick={() => onContextChange({ ...context, view: id })}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
                event.preventDefault()
                const nextIndex = event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? viewMeta.length - 1
                    : (index + (event.key === "ArrowRight" ? 1 : -1) + viewMeta.length) % viewMeta.length
                const nextView = viewMeta[nextIndex].id
                onContextChange({ ...context, view: nextView })
                document.getElementById(`sa-view-tab-${nextView}`)?.focus()
              }}
            >
              <Icon aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </header>
      {context.view === "map" ? (
        <div className={styles.layerBar} aria-label="Spatial layers">
          <span><Layers3 aria-hidden="true" /> Layers</span>
          {layerRows.map(({ id, label, count, icon: Icon }) => (
            <label key={id} title={count === 0 ? `${label} unavailable in this snapshot.` : label}>
              <input
                type="checkbox"
                checked={count > 0 && layers[id]}
                onChange={(event) => setLayers((current) => ({ ...current, [id]: event.target.checked }))}
                disabled={count === 0}
              />
              <Icon aria-hidden="true" />
              <span>{label}</span>
              <b>{count === 0 ? "UNAVAILABLE" : count}</b>
            </label>
          ))}
        </div>
      ) : null}
      <div
        id={`sa-view-panel-${context.view}`}
        className={styles.pictureBody}
        role="tabpanel"
        aria-labelledby={`sa-view-tab-${context.view}`}
        tabIndex={0}
      >
        {context.view === "map" ? (
          <MapPicture
            snapshot={snapshot}
            selectedId={selectedId}
            layers={layers}
            onSelect={onSelect}
          />
        ) : context.view === "earth" ? (
          <EarthContextPicture
            context={context}
            object={snapshot.objects.find((object) => object.id === selectedId) ?? null}
          />
        ) : context.view === "list" ? (
          <ListPicture snapshot={snapshot} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <TimelinePicture snapshot={snapshot} selectedId={selectedId} onSelect={onSelect} />
        )}
      </div>
      <footer className={styles.pictureLegend}>
        {Object.entries(DOMAIN_META).map(([domain, meta]) => (
          <span key={domain} title={meta.description}>
            <b>{meta.symbol}</b> {DOMAIN_LABELS[domain as EnvironmentalDomain]}
          </span>
        ))}
        <em>Symbols + labels carry meaning; color is secondary.</em>
      </footer>
    </section>
  )
}

function ComparisonStrip({ object, sourceLabel }: { object: EnvironmentalObject; sourceLabel: string }) {
  const points = [...object.history, ...(object.current ? [object.current] : []), ...object.forecast]
  if (points.length === 0) {
    return (
      <div className={styles.comparisonEmpty}>
        <Clock3 aria-hidden="true" /> History / current / forecast not supplied by this record.
      </div>
    )
  }
  return (
    <>
      <p className={styles.comparisonProvenance}>Source: {sourceLabel} · observed {formatUtc(object.observedAt)} · received {formatUtc(object.receivedAt)}</p>
      <div className={styles.comparisonStrip}>
        {points.map((point, index) => (
          <div key={`${point.label}-${index}`} data-state={point.state}>
            <span>{point.label}</span>
            <strong>{point.value === null ? "—" : point.value}{point.value === null ? "" : point.unit ?? ""}</strong>
            <small>{point.state.toUpperCase()}</small>
          </div>
        ))}
      </div>
    </>
  )
}

function EvidenceDetail({ evidence }: { evidence: EvidenceRecord }) {
  return (
    <div className={styles.evidenceDetail}>
      <div className={styles.evidenceTitle}>
        <FileSearch aria-hidden="true" />
        <div>
          <strong>{evidence.title}</strong>
          <span>{evidence.synthetic ? "SIMULATED" : evidence.freshness.toUpperCase()}</span>
        </div>
      </div>
      <p>{evidence.summary}</p>
      <dl>
        <div><dt>Source</dt><dd>{evidence.sourceLabel}</dd></div>
        <div><dt>Observed</dt><dd>{formatUtc(evidence.observedAt)}</dd></div>
        <div><dt>Received</dt><dd>{formatUtc(evidence.receivedAt)}</dd></div>
        <div><dt>Freshness</dt><dd>{evidence.synthetic ? "SIMULATED" : evidence.freshness.toUpperCase()} · {evidence.freshnessBasis}</dd></div>
        <div><dt>Confidence</dt><dd>{confidenceText(evidence.confidence)} · {evidence.confidenceLabel.replace("_", " ")}</dd></div>
        <div><dt>Classification</dt><dd>{evidence.classification}</dd></div>
        <div><dt>Reference</dt><dd><code>{evidence.sourceRef}</code></dd></div>
      </dl>
      <div className={styles.lineage}>
        <span>Lineage</span>
        {evidence.lineage.map((step, index) => (
          <span key={`${step}-${index}`}>
            {index > 0 ? <ChevronRight aria-hidden="true" /> : null}
            <b>{step}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

function ObjectInspector({
  snapshot,
  object,
  selectedEvidenceId,
  context,
  onEvidence,
}: {
  snapshot: SituationalSnapshot
  object: EnvironmentalObject | null
  selectedEvidenceId: string | null
  context: SituationalContext
  onEvidence: (id: string) => void
}) {
  if (!object) {
    return (
      <section className={`${styles.primaryPanel} ${styles.inspectorPanel}`} aria-labelledby="inspector-heading">
        <header className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Progressive disclosure</span>
            <h2 id="inspector-heading">Object & evidence</h2>
          </div>
        </header>
        <div className={styles.inspectorEmpty}>
          <Eye aria-hidden="true" />
          <strong>Select an environmental object</strong>
          <p>Its relationships, comparison points, mission consequence, confidence, and provenance will appear here.</p>
        </div>
      </section>
    )
  }

  const Icon = DOMAIN_META[object.domain].icon
  const evidence = snapshot.evidence.filter((item) => object.evidenceIds.includes(item.id))
  const selectedEvidence = evidence.find((item) => item.id === selectedEvidenceId) ?? evidence[0] ?? null
  const relationships = snapshot.relationships.filter(
    (relationship) => relationship.fromId === object.id || relationship.toId === object.id,
  )
  const objectById = new Map(snapshot.objects.map((item) => [item.id, item]))
  const objectSourceLabels = snapshot.sources
    .filter((source) => object.sourceIds.includes(source.id))
    .map((source) => source.label)
  const objectSourceLabel = objectSourceLabels.join(" + ") || "Source unavailable"

  return (
    <section className={`${styles.primaryPanel} ${styles.inspectorPanel}`} aria-labelledby="inspector-heading">
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Selected object</span>
          <h2 id="inspector-heading">Object & evidence</h2>
        </div>
        <span className={`${styles.stateChip} ${styles[`severity_${object.severity}`]}`}>
          {object.statusLabel}
        </span>
      </header>
      <div className={styles.inspectorScroll}>
        <div className={styles.objectHeading}>
          <span className={`${styles.objectIcon} ${styles[`severity_${object.severity}`]}`}>
            <Icon aria-hidden="true" />
          </span>
          <div>
            <strong>{object.name}</strong>
            <span>{DOMAIN_LABELS[object.domain]} · {object.locationLabel ?? "location unavailable"}</span>
          </div>
        </div>
        {object.synthetic ? <div className={styles.simulatedFlag}>SIMULATED · SANITIZED SCENARIO OBJECT</div> : null}
        <p className={styles.objectSummary}>{object.summary}</p>
        <div className={styles.objectFacts}>
          <div><span>Observed</span><strong>{formatUtc(object.observedAt)}</strong></div>
          <div><span>Received</span><strong>{formatUtc(object.receivedAt)}</strong></div>
          <div><span>Freshness</span><strong>{object.synthetic ? "SIMULATED" : object.freshness.toUpperCase()}</strong></div>
          <div><span>Source</span><strong title={objectSourceLabel}>{objectSourceLabel}</strong></div>
          <div><span>Confidence</span><strong>{confidenceText(object.confidence)}</strong></div>
          <div><span>Trend</span><strong>{trendIcon(object.trend)} {object.trend.replace("_", " ").toUpperCase()}</strong></div>
          <div><span>Classification</span><strong>{object.classification}</strong></div>
          <div><span>Freshness basis</span><strong title={object.freshnessBasis}>{object.freshnessBasis}</strong></div>
        </div>

        <section className={styles.inspectorSection}>
          <h3>History · current · forecast</h3>
          <ComparisonStrip object={object} sourceLabel={objectSourceLabel} />
        </section>

        <section className={styles.inspectorSection}>
          <h3>Mission consequence</h3>
          <p>{object.missionConsequence ?? "No mission consequence was supplied or assessed for this object."}</p>
        </section>

        <section className={styles.inspectorSection}>
          <h3>Relationships</h3>
          {relationships.length === 0 ? (
            <p className={styles.muted}>No relationship edge was supplied.</p>
          ) : (
            <ul className={styles.relationshipList}>
              {relationships.map((relationship) => {
                const peerId = relationship.fromId === object.id ? relationship.toId : relationship.fromId
                return (
                  <li key={relationship.id}>
                    <GitBranch aria-hidden="true" />
                    <span>
                      <strong>{relationship.label}</strong>
                      <small>{objectById.get(peerId)?.name ?? peerId} · {confidenceText(relationship.confidence)} · {relationship.evidenceIds.length} evidence reference{relationship.evidenceIds.length === 1 ? "" : "s"}</small>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className={styles.inspectorSection}>
          <h3>Evidence & provenance</h3>
          {evidence.length === 0 ? (
            <p className={styles.muted}>No evidence object was supplied. Confidence is not substituted.</p>
          ) : (
            <>
              <div className={styles.evidenceTabs} role="group" aria-label="Evidence records">
                {evidence.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={selectedEvidence?.id === item.id}
                    onClick={() => onEvidence(item.id)}
                  >
                    <Database aria-hidden="true" /> {item.sourceLabel}
                  </button>
                ))}
              </div>
              {selectedEvidence ? <EvidenceDetail evidence={selectedEvidence} /> : null}
            </>
          )}
        </section>

        <div className={styles.inspectorHandoffs}>
          <Link href={buildSituationalHandoffLink("threatAssessment", context)}>
            Threat Assessment <ChevronRight aria-hidden="true" />
          </Link>
          <Link href={buildSituationalHandoffLink("dataFusion", context)}>
            Data Fusion <ChevronRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className={styles.noSpark}>NO SERIES</span>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 72 + 4},${24 - ((value - min) / spread) * 18}`)
    .join(" ")
  return (
    <svg className={styles.sparkline} viewBox="0 0 80 28" role="img" aria-label={`Trend samples ${values.join(", ")}`}>
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx={points.split(" ").at(-1)?.split(",")[0]} cy={points.split(" ").at(-1)?.split(",")[1]} r="2" />
    </svg>
  )
}

function DomainStateWidget({ snapshot }: { snapshot: SituationalSnapshot }) {
  return (
    <div className={styles.domainGrid}>
      {snapshot.domains.map((domain) => {
        const Icon = DOMAIN_META[domain.id].icon
        return (
          <div key={domain.id} className={styles.domainRow}>
            <Icon aria-hidden="true" />
            <div>
              <strong>{domain.label}</strong>
              <span>{domain.note}</span>
            </div>
            <Sparkline values={domain.samples} />
            <span className={styles.domainCount}>
              <b>{domain.coverage === "gap" || domain.coverage === "not_bound" ? "UNKNOWN" : domain.observedObjectCount}</b>
              <small>{domain.coverage === "gap" ? "GAP" : domain.coverage.toUpperCase()}</small>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SourceCoverageWidget({ snapshot }: { snapshot: SituationalSnapshot }) {
  return (
    <div>
      <ul className={styles.sourceList}>
        {snapshot.sources.map((source) => {
          const sourceEvidence = snapshot.evidence.filter((evidence) => evidence.sourceId === source.id)
          const freshnessStates = new Set(sourceEvidence.map((evidence) => evidence.freshness))
          const freshness = source.synthetic
            ? "SIMULATED"
            : sourceEvidence.length === 0
              ? "UNKNOWN"
              : freshnessStates.size === 1
                ? [...freshnessStates][0].toUpperCase()
                : "MIXED"
          const transport = source.synthetic
            ? "NOT LIVE"
            : source.httpStatus === null
              ? "UNREACHABLE"
              : `REACHABLE · HTTP ${source.httpStatus}`
          const schema = source.synthetic
            ? "NOT APPLICABLE"
            : source.schemaValid === true
              ? "TOP-LEVEL VALIDATED"
              : source.schemaValid === false
                ? "INVALID"
                : "NOT CHECKED"
          const dataPresence = source.synthetic
            ? `${source.recordCount ?? "UNKNOWN"} SIMULATED`
            : source.recordCount === null
              ? "UNAVAILABLE"
              : source.recordCount > 0
                ? `${source.recordCount} RECORD${source.recordCount === 1 ? "" : "S"}`
                : "NO RECORDS"
          const provenance = source.synthetic
            ? "SIMULATED LINEAGE"
            : sourceEvidence.length > 0
              ? `${sourceEvidence.length} EVIDENCE REFERENCE${sourceEvidence.length === 1 ? "" : "S"}`
              : source.responseAccepted
                ? "ENDPOINT RESPONSE ONLY"
                : "UNAVAILABLE"
          return <li key={source.id} data-state={source.state}>
            {source.state === "live" ? (
              <CheckCircle2 aria-hidden="true" />
            ) : source.state === "empty" ? (
              <CircleDashed aria-hidden="true" />
            ) : source.state === "simulated" ? (
              <Sparkles aria-hidden="true" />
            ) : (
              <TriangleAlert aria-hidden="true" />
            )}
            <div>
              <strong>{source.label}</strong>
              <div className={styles.sourceFacts}>
                <span><b>Transport</b>{transport}</span>
                <span><b>Schema</b>{schema}</span>
                <span><b>Display policy</b>{source.classificationAccepted === true ? "UNCLASSIFIED ACCEPTED" : source.classificationAccepted === false ? "REJECTED" : "NOT CHECKED"}</span>
                <span><b>Data</b>{dataPresence}</span>
                <span><b>Freshness</b>{freshness}</span>
                <span><b>Provenance</b>{provenance}</span>
                <span><b>Last success</b>{source.receivedAt ? formatUtc(source.receivedAt) : "UNAVAILABLE"}</span>
              </div>
              <span>{source.note}</span>
              <details className={styles.sourceTechnical}>
                <summary>Technical source reference</summary>
                <code>{source.endpoint}</code>
              </details>
            </div>
            <b>{source.state.toUpperCase()}</b>
          </li>
        })}
      </ul>
      <details className={styles.gapDetails}>
        <summary>{snapshot.gaps.length} declared contract / coverage gaps</summary>
        <ul>
          {snapshot.gaps.map((gap, index) => <li key={`${gap}-${index}`}>{gap}</li>)}
        </ul>
      </details>
    </div>
  )
}

function EvidenceLedgerWidget({
  snapshot,
  selectedEvidenceId,
  onSelect,
}: {
  snapshot: SituationalSnapshot
  selectedEvidenceId: string | null
  onSelect: (evidence: EvidenceRecord) => void
}) {
  if (snapshot.evidence.length === 0) {
    return (
      <div className={styles.widgetEmpty}>
        <FileSearch aria-hidden="true" />
        <strong>No evidence records</strong>
        <p>The runtime supplied identity/state records only or no objects. Evidence is never generated to fill this ledger.</p>
      </div>
    )
  }
  return (
    <div className={styles.ledger}>
      {snapshot.evidence.slice(0, 8).map((evidence) => (
        <button
          type="button"
          key={evidence.id}
          aria-pressed={selectedEvidenceId === evidence.id}
          onClick={() => onSelect(evidence)}
        >
          <Database aria-hidden="true" />
          <span>
            <strong>{evidence.title}</strong>
            <small>{evidence.sourceLabel} · {formatTime(evidence.observedAt)}</small>
          </span>
          <b>{evidence.synthetic ? "SIM" : confidenceText(evidence.confidence)}</b>
        </button>
      ))}
    </div>
  )
}

function WatchConditionsWidget({ snapshot }: { snapshot: SituationalSnapshot }) {
  if (snapshot.watchConditions.length === 0) {
    return (
      <div className={styles.widgetEmpty}>
        <Eye aria-hidden="true" />
        <strong>No persistent watch contract</strong>
        <p>No watch-area or watch-condition record is present in the currently bound responses. Nothing is armed in the browser.</p>
      </div>
    )
  }
  return (
    <ul className={styles.watchList}>
      {snapshot.watchConditions.map((watch) => (
        <li key={watch.id}>
          <span className={styles.watchState}>{watch.status.toUpperCase()}</span>
          <strong>{watch.label}</strong>
          <p>{watch.rule}</p>
          <small>{watch.consequence}</small>
        </li>
      ))}
    </ul>
  )
}

function HandoffRouterWidget({ context }: { context: SituationalContext }) {
  const links: Array<{
    route: Parameters<typeof buildSituationalHandoffLink>[0]
    label: string
    description: string
    icon: LucideIcon
  }> = [
    { route: "threatAssessment", label: "Threat Assessment", description: "Assess consequence and uncertainty", icon: AlertTriangle },
    { route: "dataFusion", label: "Data Fusion", description: "Inspect sources and relationships", icon: Network },
    { route: "commandControl", label: "Command & Control", description: "Preserve human-owned observation context", icon: Route },
    { route: "oeiNarrative", label: "OEI Narrative", description: "Draft from evidence with provenance", icon: FileSearch },
    { route: "stackInventory", label: "Stack Inventory", description: "Inspect owning source and service", icon: Box },
    { route: "earthSimulator", label: "Earth Simulator", description: "Carry the selected area and time window", icon: Cloud },
  ]
  return (
    <div className={styles.handoffGrid}>
      {links.map(({ route, label, description, icon: Icon }) => (
        <Link key={route} href={buildSituationalHandoffLink(route, context)}>
          <Icon aria-hidden="true" />
          <span><strong>{label}</strong><small>{description}</small></span>
          <ChevronRight aria-hidden="true" />
        </Link>
      ))}
      <p><ShieldCheck aria-hidden="true" /> Context handoff only. No external send, autonomous task, or weapons-targeting action is present.</p>
    </div>
  )
}

export function SituationalAwarenessDashboard() {
  const searchParams = useSearchParams()
  const serializedParams = searchParams.toString()
  const parsedContext = useMemo(
    () => parseSituationalContext(new URLSearchParams(serializedParams)),
    [serializedParams],
  )
  const [context, setContext] = useState<SituationalContext>(parsedContext)
  const [snapshot, setSnapshot] = useState<SituationalSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [freshnessNow, setFreshnessNow] = useState(() => Date.now())

  useEffect(() => setContext(parsedContext), [parsedContext])
  useEffect(() => {
    const timer = window.setInterval(() => setFreshnessNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const contextDataKey = `${context.missionAreaId}|${context.timeWindow}|${context.dataMode}`
  const providerKey = `${contextDataKey}|${refreshKey}`
  useEffect(() => {
    const controller = new AbortController()
    setSnapshot(null)
    setLoading(true)
    setLoadError(null)
    runtimeSituationalAwarenessProvider
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
    // View and selection update in place; only source-affecting context reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerKey])

  const activeSnapshot = useMemo(() => {
    if (
      !snapshot ||
      snapshot.context.missionAreaId !== context.missionAreaId ||
      snapshot.context.timeWindow !== context.timeWindow ||
      snapshot.context.dataMode !== context.dataMode
    ) {
      return null
    }
    const objects = snapshot.objects.map((object) => ({
      ...object,
      freshness: currentFreshness(object, freshnessNow),
    }))
    const evidence = snapshot.evidence.map((item) => ({
      ...item,
      freshness: currentFreshness(item, freshnessNow),
    }))
    return {
      ...snapshot,
      objects,
      evidence,
      condition: snapshot.condition === "simulated" ? "simulated" : deriveCondition(snapshot.sources, objects),
    }
  }, [context.dataMode, context.missionAreaId, context.timeWindow, freshnessNow, snapshot])

  const commitContext = useCallback(
    (next: SituationalContext) => {
      setContext(next)
      window.history.replaceState(window.history.state, "", buildSituationalSelfLink(next))
    },
    [],
  )

  const selectObject = useCallback(
    (object: EnvironmentalObject) => {
      commitContext({
        ...context,
        selectedObjectId: object.id,
        selectedEvidenceId: object.evidenceIds[0] ?? null,
        sourceId: object.sourceIds[0] ?? null,
      })
    },
    [commitContext, context],
  )

  const selectEvidence = useCallback(
    (evidence: EvidenceRecord) => {
      const owningObject = activeSnapshot?.objects.find((object) => object.evidenceIds.includes(evidence.id))
      commitContext({
        ...context,
        selectedObjectId: owningObject?.id ?? context.selectedObjectId,
        selectedEvidenceId: evidence.id,
        sourceId: evidence.sourceId,
      })
    },
    [activeSnapshot, commitContext, context],
  )

  const selectedObject =
    activeSnapshot?.objects.find((object) => object.id === context.selectedObjectId) ?? null
  const condition: SituationalCondition = loading && !activeSnapshot ? "loading" : activeSnapshot?.condition ?? "error"
  const realSources = activeSnapshot?.sources.filter((source) => !source.synthetic) ?? []
  const acceptedSources = realSources.filter((source) => source.responseAccepted).length
  const objectCount = activeSnapshot?.objects.length ?? 0
  const materialCount = activeSnapshot?.objects.filter((object) => ["material", "urgent"].includes(object.severity)).length ?? 0
  const evidenceCount = activeSnapshot?.evidence.length ?? 0
  const publicLoadError = loadError ? "A bound source refresh failed; no new snapshot was accepted." : null
  const metricValue = (
    count: number,
    emptyLabel: string,
  ): ReactNode => loading && !activeSnapshot ? "—" : count > 0 ? count : emptyLabel

  const layoutWidgets = activeSnapshot
    ? [
        { id: "domain-state", label: "Environmental domain state", content: <DomainStateWidget snapshot={activeSnapshot} /> },
        { id: "source-coverage", label: "Source coverage & gaps", content: <SourceCoverageWidget snapshot={activeSnapshot} /> },
        {
          id: "evidence-ledger",
          label: "Evidence ledger",
          content: (
            <EvidenceLedgerWidget
              snapshot={activeSnapshot}
              selectedEvidenceId={context.selectedEvidenceId}
              onSelect={selectEvidence}
            />
          ),
        },
        { id: "watch-conditions", label: "Watch conditions", content: <WatchConditionsWidget snapshot={activeSnapshot} /> },
        { id: "handoff-router", label: "Context handoff", content: <HandoffRouterWidget context={context} /> },
      ]
    : []

  return (
    <main className={styles.page}>
      <ContextFrame
        context={context}
        snapshot={activeSnapshot}
        loading={loading}
        onChange={commitContext}
        onRefresh={() => setRefreshKey((value) => value + 1)}
      />

      <ConditionNotice
        condition={condition}
        note={publicLoadError ?? activeSnapshot?.note}
      />

      <section className={styles.metrics} aria-label="Environmental picture summary">
        <Metric label="Environmental objects" value={metricValue(objectCount, "NO RECORDS")} hint={objectCount ? "Objects with explicit runtime or simulated provenance." : "No objects reported; not a measured zero state."} />
        <Metric label="Material changes" value={metricValue(materialCount, objectCount ? "NONE REPORTED" : "UNKNOWN")} hint={materialCount ? "Material or urgent records in this snapshot." : "No material records supplied; not an all-clear."} />
        <Metric label="Evidence records" value={metricValue(evidenceCount, "UNAVAILABLE")} hint={evidenceCount ? "Evidence wrappers with lineage and source references." : "No evidence contract supplied."} />
        <Metric label="Accepted source responses" value={loading && !activeSnapshot ? "—" : acceptedSources > 0 ? `${acceptedSources}/${realSources.length}` : realSources.length ? "NO ACCEPTED RESPONSE" : "NOT CONFIGURED"} hint="Successful transport plus minimal top-level schema and UNCLASSIFIED display-policy validation; not authentication or environmental coverage." />
        <Metric label="Watch areas" value={loading && !activeSnapshot ? "—" : activeSnapshot?.watchAreas.length ? activeSnapshot.watchAreas.length : "NOT CONFIGURED"} hint={activeSnapshot?.watchAreas.length ? "Scenario or runtime watch geometry." : "No watch-area record is bound to this surface; not zero monitored area."} />
      </section>

      {activeSnapshot ? (
        <>
          <div className={`${styles.primaryGrid} ${activeSnapshot.objects.length === 0 ? styles.primaryGridEmpty : ""}`}>
            {activeSnapshot.objects.length > 0 ? (
              <ChangeQueue snapshot={activeSnapshot} selectedId={selectedObject?.id ?? null} onSelect={selectObject} />
            ) : null}
            <SpatialPicture
              snapshot={activeSnapshot}
              context={context}
              onContextChange={commitContext}
              selectedId={selectedObject?.id ?? null}
              onSelect={selectObject}
            />
            {activeSnapshot.objects.length > 0 ? (
              <ObjectInspector
                snapshot={activeSnapshot}
                object={selectedObject}
                selectedEvidenceId={context.selectedEvidenceId}
                context={context}
                onEvidence={(id) => {
                  const evidence = activeSnapshot.evidence.find((item) => item.id === id)
                  if (evidence) selectEvidence(evidence)
                }}
              />
            ) : null}
          </div>
          <FormSpaceWorkbench
            context={context}
            snapshot={activeSnapshot}
            onContextChange={commitContext}
          />
          <OperationalLayout widgets={layoutWidgets} />
        </>
      ) : (
        <div className={styles.routeLoading}>
          <LoaderCircle className={styles.spin} aria-hidden="true" />
          <strong>{loadError ? "No accepted snapshot" : "Binding environmental sources"}</strong>
          <p>{publicLoadError ?? "The fieldboard will not render plausible fallback values while source truth is unknown."}</p>
        </div>
      )}
    </main>
  )
}
