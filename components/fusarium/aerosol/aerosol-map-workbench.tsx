"use client"

import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react"
import Link from "next/link"
import Map, {
  Layer,
  NavigationControl,
  ScaleControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre"
import maplibregl, { type StyleSpecification } from "maplibre-gl"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FileJson,
  Filter,
  Globe2,
  HardDrive,
  Layers3,
  LocateFixed,
  MapPinned,
  Pause,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react"
import {
  AEROSOL_CLASSIFICATION,
  AEROSOL_LAYER_DEFINITIONS,
  AEROSOL_LAYER_GROUPS,
  AEROSOL_LAYER_IDS,
  aerosolLayerRuntimes,
  aerosolRecordsToGeoJson,
  filterAerosolRecords,
  validateAerosolEvidence,
  type AerosolEvidenceDataset,
  type AerosolEvidenceRecord,
  type AerosolLayerId,
  type AerosolLayerState,
} from "@/lib/fusarium/aerosol/contracts"
import {
  sharedCrepLayerIdsForAerosolLayers,
  type SharedEarthLayerStatus,
} from "@/lib/fusarium/aerosol/shared-earth-contracts"
import { AerosolSharedEarthView } from "./aerosol-shared-earth-view"
import { EnvironmentalCoveragePlanningPanel } from "./environmental-coverage-planning-panel"
import { useAerosolSharedEarth } from "./use-aerosol-shared-earth"
import {
  ARRAYLAKE_FIELD_OPTIONS,
  useArraylakeFields,
  type ArraylakeFieldOption,
  type ArraylakeFieldStatus,
  type ArraylakeFieldState,
} from "./use-arraylake-fields"
import {
  normalizeFieldFrameIndex,
  type FieldPlaybackSnapshot,
} from "@/lib/crep/fields/field-playback"
import styles from "./aerosol-map-workbench.module.css"

const EMPTY_FEATURES = { type: "FeatureCollection" as const, features: [] }

function buildGraticule() {
  const features: Array<{
    type: "Feature"
    properties: Record<string, never>
    geometry: { type: "LineString"; coordinates: number[][] }
  }> = []
  for (let longitude = -180; longitude <= 180; longitude += 30) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: Array.from({ length: 35 }, (_, index) => [longitude, -85 + index * 5]),
      },
    })
  }
  for (let latitude = -60; latitude <= 60; latitude += 20) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: Array.from({ length: 73 }, (_, index) => [-180 + index * 5, latitude]),
      },
    })
  }
  return { type: "FeatureCollection" as const, features }
}

const LOCAL_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "Fusarium Aerosol Local Operations Map",
  sources: {
    land: {
      type: "geojson",
      data: "/data/geo/ne_110m_land.geojson",
    },
    graticule: {
      type: "geojson",
      data: buildGraticule(),
    },
  },
  layers: [
    {
      id: "aerosol-ocean",
      type: "background",
      paint: { "background-color": "#031119" },
    },
    {
      id: "aerosol-graticule",
      type: "line",
      source: "graticule",
      paint: {
        "line-color": "rgba(91, 174, 178, 0.19)",
        "line-width": 0.65,
      },
    },
    {
      id: "aerosol-land",
      type: "fill",
      source: "land",
      paint: {
        "fill-color": "#0c2a2b",
        "fill-opacity": 0.9,
      },
    },
    {
      id: "aerosol-coastline",
      type: "line",
      source: "land",
      paint: {
        "line-color": "rgba(113, 232, 194, 0.52)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.65, 7, 1.6],
      },
    },
  ],
}

const TIME_WINDOWS = [
  { id: "all", label: "All evidence", durationMs: null },
  { id: "1h", label: "Last hour", durationMs: 60 * 60 * 1000 },
  { id: "6h", label: "Last 6 hours", durationMs: 6 * 60 * 60 * 1000 },
  { id: "24h", label: "Last 24 hours", durationMs: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "Last 7 days", durationMs: 7 * 24 * 60 * 60 * 1000 },
] as const

type TimeWindowId = (typeof TIME_WINDOWS)[number]["id"]
type AerosolViewMode = "shared-earth" | "offline-evidence"

function statusLabel(state: AerosolLayerState) {
  if (state === "empty") return "verified empty"
  return state
}

function arraylakeStatusLabel(state: ArraylakeFieldState) {
  if (state === "cataloged") return "cataloged"
  if (state === "loading") return "checking"
  return state
}

function arraylakeFieldColor(option: ArraylakeFieldOption) {
  const rampColor = option.variable.ramp?.at(-1)?.[1]
  if (rampColor && !rampColor.startsWith("rgba(0,0,0,0")) return rampColor
  if (option.variable.render === "wind") return "#72cfff"
  if (option.dataset.group === "solar") return "#ffad51"
  if (option.dataset.group === "carbon" || option.dataset.group === "vegetation") return "#69e29e"
  if (option.dataset.group === "imagery") return "#d0b8ff"
  return "#65c5da"
}

function formatObservedAt(value: string | null) {
  if (!value) return "not observed"
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function temporalBasisLabel(layerId: AerosolLayerId) {
  if (layerId === "sporebase") return "live device/environmental time; no live taxon identity"
  if (layerId === "sporebase-lab") return "15-minute tape interval; identification reported after lab analysis"
  if (layerId === "fungal-occurrence") return "source occurrence time; not airborne concentration"
  if (layerId === "modeled-spore-dispersal") return "model run + meteorology valid time; not a direct detection"
  return "source observation or model-valid time"
}

function downloadEvidence(dataset: AerosolEvidenceDataset) {
  const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = `${dataset.datasetId}-aerosol-evidence.json`
  anchor.click()
  URL.revokeObjectURL(href)
}

function summarizeMetric(record: AerosolEvidenceRecord) {
  const first = Object.entries(record.measurements)[0]
  if (!first) return "No supplied measurement"
  const [name, measurement] = first
  return `${name}: ${String(measurement.value)}${measurement.unit ? ` ${measurement.unit}` : ""}`
}

export function AerosolMapWorkbench() {
  const inputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<MapRef>(null)
  const [viewMode, setViewMode] = useState<AerosolViewMode>("shared-earth")
  const [dataset, setDataset] = useState<AerosolEvidenceDataset | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inspectedLayerId, setInspectedLayerId] = useState<AerosolLayerId>("sporebase")
  const [inspectedFieldLayerId, setInspectedFieldLayerId] = useState<string | null>(null)
  const [enabledLayers, setEnabledLayers] = useState<readonly AerosolLayerId[]>(AEROSOL_LAYER_IDS)
  const [enabledFieldLayerIds, setEnabledFieldLayerIds] = useState<readonly string[]>([])
  const [fieldPlaybackControl, setFieldPlaybackControl] = useState<{
    layerId: string | null
    playing: boolean
    scrubIndex: number | null
  }>({ layerId: null, playing: true, scrubIndex: null })
  const [fieldPlaybackSnapshot, setFieldPlaybackSnapshot] = useState<FieldPlaybackSnapshot | null>(null)
  const [timeWindow, setTimeWindow] = useState<TimeWindowId>("all")
  const [query, setQuery] = useState("")
  const [evaluationTime, setEvaluationTime] = useState(() => new Date().toISOString())
  const [importing, setImporting] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [cursor, setCursor] = useState("grab")
  const sharedEarth = useAerosolSharedEarth(viewMode === "shared-earth")
  const arraylake = useArraylakeFields(viewMode === "shared-earth", enabledFieldLayerIds)

  const runtimes = useMemo(() => aerosolLayerRuntimes(dataset), [dataset])
  const selectedWindow = TIME_WINDOWS.find((item) => item.id === timeWindow) ?? TIME_WINDOWS[0]
  const earliestObservedAt = selectedWindow.durationMs == null
    ? null
    : new Date(Date.parse(evaluationTime) - selectedWindow.durationMs).toISOString()
  const visibleRecords = useMemo(
    () => filterAerosolRecords(dataset?.records ?? [], { enabledLayers, earliestObservedAt, query }),
    [dataset, earliestObservedAt, enabledLayers, query],
  )
  const mapData = useMemo(
    () => visibleRecords.length > 0 ? aerosolRecordsToGeoJson(visibleRecords) : EMPTY_FEATURES,
    [visibleRecords],
  )
  const selected = dataset?.records.find((record) => record.recordId === selectedId) ?? null
  const observedWindow = useMemo(() => {
    if (!dataset || dataset.records.length === 0) return null
    const sorted = dataset.records.map((record) => record.observedAt).sort((left, right) => Date.parse(left) - Date.parse(right))
    return { first: sorted[0], last: sorted[sorted.length - 1] }
  }, [dataset])
  const providerCount = useMemo(
    () => new Set(dataset?.records.map((record) => record.provenance.provider) ?? []).size,
    [dataset],
  )
  const sharedStatusByLayer = useMemo(
    () => new globalThis.Map<AerosolLayerId, SharedEarthLayerStatus>(sharedEarth.statuses.map((status) => [status.layerId, status])),
    [sharedEarth.statuses],
  )
  const sharedCrepLayerIds = useMemo(
    () => sharedCrepLayerIdsForAerosolLayers(enabledLayers),
    [enabledLayers],
  )
  const activeRuntimes = viewMode === "shared-earth" ? sharedEarth.statuses : runtimes
  const inspectedSharedStatus = sharedStatusByLayer.get(inspectedLayerId) ?? null
  const inspectedLayerDefinition = AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === inspectedLayerId) ?? null
  const selectedLayerDefinition = selected
    ? AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === selected.layerId) ?? null
    : null
  const arraylakeStatusByLayer = useMemo(
    () => new globalThis.Map(arraylake.statuses.map((status) => [status.layerId, status])),
    [arraylake.statuses],
  )
  const inspectedArraylakeStatus = inspectedFieldLayerId
    ? arraylakeStatusByLayer.get(inspectedFieldLayerId) ?? null
    : null
  const selectedArraylakeStatuses = arraylake.statuses.filter((status) => enabledFieldLayerIds.includes(status.layerId))
  const readyArraylakeCount = selectedArraylakeStatuses.filter((status) => status.state === "available" || status.state === "stale").length
  const activePlaybackField: ArraylakeFieldStatus | null = (
    inspectedFieldLayerId
      ? selectedArraylakeStatuses.find((status) => status.layerId === inspectedFieldLayerId && status.variable.render === "raster")
      : null
  ) ?? selectedArraylakeStatuses.find((status) => status.variable.render === "raster") ?? null
  const activePlaybackLayerId = activePlaybackField?.layerId ?? null
  const activePlaybackControl = fieldPlaybackControl.layerId === activePlaybackLayerId
    ? fieldPlaybackControl
    : { layerId: activePlaybackLayerId, playing: true, scrubIndex: null }
  const activePlaybackSnapshot = fieldPlaybackSnapshot?.layerId === activePlaybackLayerId
    ? fieldPlaybackSnapshot
    : null
  const playbackFrameCount = activePlaybackSnapshot?.frameCount ?? activePlaybackField?.frameCount ?? 0
  const playbackFrameIndex = normalizeFieldFrameIndex(activePlaybackSnapshot?.frameIndex ?? 0, playbackFrameCount)
  const playbackRetained = activePlaybackSnapshot?.retained === true
  const playbackActuallyPlaying = playbackRetained
    ? activePlaybackSnapshot?.playing === true
    : activePlaybackControl.playing
  const onFieldPlaybackStateChange = useCallback((snapshot: FieldPlaybackSnapshot) => {
    setFieldPlaybackSnapshot(snapshot)
  }, [])

  const importFile = async (file: File) => {
    const evaluatedAt = new Date().toISOString()
    setImporting(true)
    setIssues([])
    try {
      const raw = JSON.parse(await file.text()) as unknown
      const result = validateAerosolEvidence(raw, evaluatedAt)
      if (!result.ok) {
        setDataset(null)
        setSelectedId(null)
        setIssues(result.issues)
        return
      }
      setDataset(result.value)
      setViewMode("offline-evidence")
      setEvaluationTime(evaluatedAt)
      setSelectedId(result.value.records[0]?.recordId ?? null)
      setIssues([])
    } catch {
      setDataset(null)
      setSelectedId(null)
      setIssues(["The selected file is not valid JSON or GeoJSON."])
    } finally {
      setImporting(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const selectRecord = (record: AerosolEvidenceRecord) => {
    setSelectedId(record.recordId)
    mapRef.current?.flyTo({
      center: [record.coordinates[0], record.coordinates[1]],
      zoom: Math.max(mapRef.current?.getZoom() ?? 1.2, 5.2),
      duration: 700,
    })
  }

  const toggleLayer = (layerId: AerosolLayerId) => {
    setEnabledLayers((current) => current.includes(layerId)
      ? current.filter((id) => id !== layerId)
      : [...current, layerId])
  }

  const toggleFieldLayer = (layerId: string) => {
    setEnabledFieldLayerIds((current) => current.includes(layerId)
      ? current.filter((id) => id !== layerId)
      : [...current, layerId])
  }

  const setFieldPlaybackPlaying = (nextPlaying: boolean) => {
    if (!activePlaybackLayerId) return
    setFieldPlaybackControl({
      layerId: activePlaybackLayerId,
      playing: nextPlaying,
      scrubIndex: null,
    })
  }

  const requestFieldPlaybackFrame = (index: number) => {
    if (!activePlaybackLayerId || playbackFrameCount < 1) return
    setFieldPlaybackControl({
      layerId: activePlaybackLayerId,
      playing: false,
      scrubIndex: normalizeFieldFrameIndex(index, playbackFrameCount),
    })
  }

  const onMapClick = (event: MapLayerMouseEvent) => {
    const recordId = event.features?.[0]?.properties?.recordId
    if (typeof recordId !== "string") return
    const record = dataset?.records.find((item) => item.recordId === recordId)
    if (record) selectRecord(record)
  }

  return (
    <main
      className={styles.root}
      data-fusarium-app="aerosol"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files?.[0]
        if (file) void importFile(file)
      }}
    >
      <header className={styles.commandBar}>
        <div className={styles.identity}>
          <Link href="/fusarium" className={styles.backLink}><ArrowLeft size={15} /> Back to Fusarium</Link>
          <div className={styles.titleBlock}>
            <span>AEROSOL · GLOBAL ATMOSPHERIC INTELLIGENCE</span>
            <h1>Spore &amp; Particulate Operations Map</h1>
          </div>
        </div>
        <div className={styles.commandActions}>
          <span className={styles.classification}><ShieldCheck size={14} /> {AEROSOL_CLASSIFICATION}</span>
          <span className={styles.mode}>
            {viewMode === "shared-earth" ? <Globe2 size={14} /> : <HardDrive size={14} />}
            {viewMode === "shared-earth" ? "Shared Earth stack" : "Offline evidence"}
          </span>
          <div className={styles.modeSwitch} aria-label="Aerosol data plane">
            <button
              type="button"
              data-active={viewMode === "shared-earth"}
              onClick={() => setViewMode("shared-earth")}
            >
              <Globe2 size={14} /> Operational
            </button>
            <button
              type="button"
              data-active={viewMode === "offline-evidence"}
              onClick={() => setViewMode("offline-evidence")}
            >
              <HardDrive size={14} /> Evidence file
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json,.geojson"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importFile(file)
            }}
          />
          <button type="button" className={styles.primaryButton} onClick={() => inputRef.current?.click()} disabled={importing}>
            <Upload size={15} /> {importing ? "Validating…" : "Import evidence"}
          </button>
          <button type="button" className={styles.secondaryButton} disabled={!dataset} onClick={() => dataset && downloadEvidence(dataset)}>
            <Download size={15} /> Export
          </button>
        </div>
      </header>

      <section className={styles.statusRail} aria-label="Aerosol operational state">
        {viewMode === "shared-earth" ? (
          <>
            <article>
              <Globe2 />
              <span>Shared renderer</span>
              <strong>Earth Simulator · CREP globe / map</strong>
              <b data-state="available">reused</b>
            </article>
            <article>
              <RadioTower />
              <span>Qualified sources</span>
              <strong>{sharedEarth.statuses.filter((status) => ["available", "empty", "stale"].includes(status.state)).length} of {sharedEarth.statuses.length}</strong>
              <b data-state={sharedEarth.statuses.some((status) => status.state === "available") ? "available" : "unbound"}>read only</b>
            </article>
            <article>
              <Layers3 />
              <span>Arraylake fields</span>
              <strong>{readyArraylakeCount} ready · {enabledFieldLayerIds.length} enabled · {ARRAYLAKE_FIELD_OPTIONS.length} cataloged</strong>
              <b data-state={arraylake.refreshing ? "loading" : selectedArraylakeStatuses.some((status) => status.state === "stale") ? "stale" : readyArraylakeCount > 0 ? "available" : "unbound"}>
                {arraylake.refreshing ? "checking" : enabledFieldLayerIds.length === 0 ? "off" : readyArraylakeCount > 0 ? "real frames" : "unbound"}
              </b>
            </article>
            <article>
              <Clock3 />
              <span>Contract freshness</span>
              <strong>{sharedEarth.lastCheckedAt ? formatObservedAt(sharedEarth.lastCheckedAt) : "Checking shared sources"}</strong>
              <b data-state={sharedEarth.statuses.some((status) => status.state === "stale") ? "stale" : sharedEarth.refreshing ? "loading" : "available"}>
                {sharedEarth.refreshing ? "checking" : sharedEarth.statuses.some((status) => status.state === "stale") ? "stale present" : "verified"}
              </b>
            </article>
          </>
        ) : (
          <>
            <article>
              <Database />
              <span>Evidence package</span>
              <strong>{dataset ? dataset.datasetId : "No package loaded"}</strong>
              <b data-state={dataset ? "available" : "unbound"}>{dataset ? "validated" : "unbound"}</b>
            </article>
            <article>
              <MapPinned />
              <span>Mapped records</span>
              <strong>{dataset ? `${visibleRecords.length} of ${dataset.records.length}` : "Unknown"}</strong>
              <b data-state={dataset?.records.length ? "available" : "unbound"}>{dataset?.records.length ? "evidence" : "not clear"}</b>
            </article>
            <article>
              <Layers3 />
              <span>Bound layers</span>
              <strong>{runtimes.filter((runtime) => runtime.state !== "unbound").length} of {runtimes.length}</strong>
              <b data-state={runtimes.some((runtime) => runtime.state === "available") ? "available" : "unbound"}>read only</b>
            </article>
            <article>
              <Clock3 />
              <span>Observed window</span>
              <strong>{observedWindow ? `${formatObservedAt(observedWindow.first)} — ${formatObservedAt(observedWindow.last)}` : "Not supplied"}</strong>
              <b data-state={runtimes.some((runtime) => runtime.state === "stale") ? "stale" : dataset ? "available" : "unbound"}>
                {runtimes.some((runtime) => runtime.state === "stale") ? "stale present" : "source time"}
              </b>
            </article>
          </>
        )}
      </section>

      {issues.length > 0 ? (
        <section className={styles.issues} role="alert">
          <AlertTriangle size={18} />
          <div><strong>Evidence withheld</strong><ul>{issues.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}</ul></div>
          <button type="button" onClick={() => setIssues([])} aria-label="Dismiss validation issues"><X size={16} /></button>
        </section>
      ) : null}

      <section className={styles.workbench}>
        <aside className={styles.layerPanel}>
          <div className={styles.panelHeading}>
            <div><span>Source registry</span><h2>Atmospheric layers</h2></div>
            <Layers3 size={19} />
          </div>
          <div className={styles.layerList}>
            {AEROSOL_LAYER_GROUPS.map((group) => (
              <section className={styles.layerGroup} data-evidence-group={group.id} key={group.id}>
                <div className={styles.layerGroupHeading}>{group.label}</div>
                {group.layerIds.map((layerId) => {
                  const definition = AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === layerId)!
                  const runtime = activeRuntimes.find((item) => item.layerId === definition.id)!
                  const enabled = enabledLayers.includes(definition.id)
                  const sharedRuntime = viewMode === "shared-earth" ? runtime as SharedEarthLayerStatus : null
                  return (
                    <button
                      key={definition.id}
                      type="button"
                      className={styles.layerRow}
                      data-enabled={enabled}
                      data-inspected={inspectedLayerId === definition.id}
                      data-state={runtime.state}
                      onClick={() => {
                        setInspectedLayerId(definition.id)
                        setInspectedFieldLayerId(null)
                        toggleLayer(definition.id)
                      }}
                      title={`${definition.description} ${runtime.reason}`}
                    >
                      <i style={{ "--layer-color": definition.color } as CSSProperties} />
                      <span>
                        <strong>{definition.shortLabel}</strong>
                        <small>
                          {definition.evidenceLabel} · {sharedRuntime
                            ? `${sharedRuntime.sourceLabel} · ${sharedRuntime.count == null ? sharedRuntime.reason : `${sharedRuntime.count} qualified result${sharedRuntime.count === 1 ? "" : "s"}`}`
                            : (runtime.count ?? 0) > 0
                              ? `${runtime.count} verified record${runtime.count === 1 ? "" : "s"}`
                              : runtime.reason}
                        </small>
                      </span>
                      <b>{statusLabel(runtime.state)}</b>
                    </button>
                  )
                })}
              </section>
            ))}
          </div>
          {viewMode === "shared-earth" ? (
            <>
              <div className={styles.fieldSectionHeading}>
                <div><span>Earthmover / Arraylake</span><strong>Modeled &amp; gridded fields</strong></div>
                <b>{ARRAYLAKE_FIELD_OPTIONS.length} fields</b>
              </div>
              <div className={`${styles.layerList} ${styles.fieldLayerList}`} data-testid="aerosol-arraylake-field-list">
                {arraylake.statuses.map((runtime) => {
                  const enabled = enabledFieldLayerIds.includes(runtime.layerId)
                  return (
                    <button
                      key={runtime.layerId}
                      type="button"
                      className={styles.layerRow}
                      data-enabled={enabled}
                      data-inspected={inspectedFieldLayerId === runtime.layerId}
                      data-state={runtime.state}
                      onClick={() => {
                        setInspectedFieldLayerId(runtime.layerId)
                        setFieldPlaybackControl({ layerId: runtime.layerId, playing: true, scrubIndex: null })
                        setFieldPlaybackSnapshot(null)
                        toggleFieldLayer(runtime.layerId)
                      }}
                      title={runtime.reason}
                    >
                      <i style={{ "--layer-color": arraylakeFieldColor(runtime) } as CSSProperties} />
                      <span>
                        <strong>{runtime.variable.name}</strong>
                        <small>{runtime.dataset.name} · {runtime.frameCount == null ? runtime.reason : `${runtime.frameCount} real frame${runtime.frameCount === 1 ? "" : "s"}`}</small>
                      </span>
                      <b>{arraylakeStatusLabel(runtime.state)}</b>
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}
          <div className={styles.truthNotice}>
            <ShieldCheck size={17} />
            <p><strong>Absence is not inferred.</strong> SporeBase live telemetry is environmental/device data, not species identification. Species or taxon results appear only after lab analysis and are backfilled to 15-minute tape intervals. Occurrence and modeled dispersal remain separate. Smoke stays quarantined while its renderer uses stochastic defaults.</p>
          </div>
        </aside>

        <div className={styles.mapColumn}>
          <div className={styles.mapToolbar}>
            {viewMode === "shared-earth" ? (
              <>
                <div className={styles.operationalNotice}>
                  <Globe2 size={15} />
                  <span><strong>Shared Earth operational view</strong><small>CREP renderer · Arraylake field manifests · verified read-only adapters · no fabricated fallback</small></span>
                </div>
                <span className={styles.localMapBadge}><RadioTower size={14} /> {sharedCrepLayerIds.length} evidence · {enabledFieldLayerIds.length} field{enabledFieldLayerIds.length === 1 ? "" : "s"}</span>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => { void sharedEarth.refresh(); arraylake.refresh() }}
                  disabled={sharedEarth.refreshing || arraylake.refreshing}
                >
                  <RefreshCw size={14} className={sharedEarth.refreshing || arraylake.refreshing ? styles.spin : undefined} /> {sharedEarth.refreshing || arraylake.refreshing ? "Checking" : "Refresh sources"}
                </button>
              </>
            ) : (
              <>
                <label className={styles.searchBox}>
                  <Search size={15} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Species, station, source, metric…" />
                </label>
                <label className={styles.selectBox}>
                  <Clock3 size={15} />
                  <select value={timeWindow} onChange={(event) => setTimeWindow(event.target.value as TimeWindowId)}>
                    {TIME_WINDOWS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <span className={styles.localMapBadge}><LocateFixed size={14} /> Local Natural Earth frame</span>
                {dataset ? <button type="button" className={styles.clearButton} onClick={() => { setDataset(null); setSelectedId(null); setIssues([]) }}><X size={14} /> Clear package</button> : null}
              </>
            )}
          </div>
          {viewMode === "shared-earth" ? (
            <div className={`${styles.mapFrame} ${styles.sharedMapFrame}`} data-map-ready="true">
              <AerosolSharedEarthView
                enabledLayers={enabledLayers}
                enabledFieldLayerIds={enabledFieldLayerIds}
                statuses={sharedEarth.statuses}
                fieldPlayback={activePlaybackLayerId ? {
                  layerId: activePlaybackLayerId,
                  playing: activePlaybackControl.playing,
                  scrubIndex: activePlaybackControl.scrubIndex,
                  onStateChange: onFieldPlaybackStateChange,
                } : undefined}
              />
              {activePlaybackField ? (
                <section
                  className={styles.fieldPlaybackPanel}
                  data-testid="aerosol-arraylake-field-playback"
                  data-field-state={activePlaybackField.state}
                  data-retained={playbackRetained ? "true" : "false"}
                  data-visible-layer-id={activePlaybackSnapshot?.visibleLayerId ?? ""}
                  aria-label="Arraylake field playback"
                >
                  <div className={styles.fieldPlaybackHeading}>
                    <span>
                      <Clock3 size={13} />
                      <strong>{activePlaybackField.variable.name}</strong>
                      <small>{activePlaybackField.dataset.name}</small>
                    </span>
                    <b data-state={activePlaybackField.state}>
                      {activePlaybackField.state === "stale" ? "stale · historical" : activePlaybackField.state}
                    </b>
                  </div>
                  <div className={styles.fieldPlaybackStatus} data-playing={playbackRetained && playbackActuallyPlaying ? "true" : "false"}>
                    <i />
                    <span>
                      <strong>
                        {playbackRetained
                          ? playbackActuallyPlaying ? "Animating retained map frame" : "Retained map frame paused"
                          : "Waiting for a retained map frame"}
                      </strong>
                      <small>
                        Frame {playbackFrameCount > 0 ? playbackFrameIndex + 1 : 0} of {playbackFrameCount || "—"}
                        {activePlaybackSnapshot?.validAt ? ` · valid ${formatObservedAt(activePlaybackSnapshot.validAt)}` : " · valid time pending"}
                      </small>
                    </span>
                  </div>
                  <div className={styles.fieldPlaybackControls}>
                    <button
                      type="button"
                      onClick={() => requestFieldPlaybackFrame(playbackFrameIndex - 1)}
                      disabled={!playbackRetained || playbackFrameCount < 2}
                      aria-label="Previous Arraylake frame"
                      title="Previous frame"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFieldPlaybackPlaying(!playbackActuallyPlaying)}
                      disabled={!playbackRetained || playbackFrameCount < 2}
                      aria-label={playbackActuallyPlaying ? "Pause Arraylake playback" : "Play Arraylake playback"}
                      title={playbackActuallyPlaying ? "Pause" : "Play"}
                    >
                      {playbackActuallyPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => requestFieldPlaybackFrame(playbackFrameIndex + 1)}
                      disabled={!playbackRetained || playbackFrameCount < 2}
                      aria-label="Next Arraylake frame"
                      title="Next frame"
                    >
                      <ChevronRight size={15} />
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, playbackFrameCount - 1)}
                      step={1}
                      value={playbackFrameIndex}
                      disabled={!playbackRetained || playbackFrameCount < 2}
                      onChange={(event) => requestFieldPlaybackFrame(Number(event.currentTarget.value))}
                      aria-label="Scrub Arraylake field frames"
                    />
                    <output>{playbackFrameCount > 0 ? `${playbackFrameIndex + 1}/${playbackFrameCount}` : "0/0"}</output>
                  </div>
                  <p>
                    {activePlaybackField.state === "stale"
                      ? "Historical baked frames only; this animation is not live. Freshness remains dependent on the existing data-bake recovery workflow."
                      : "Timestamped modeled frames. Playback status changes only after MapLibre retains and paints the selected frame."}
                  </p>
                </section>
              ) : null}
              <div className={styles.mapLegend}>
                <span><i className={styles.sharedSwatch} /> Earth Simulator / CREP shared renderer</span>
                <span>{readyArraylakeCount} Arraylake field{readyArraylakeCount === 1 ? "" : "s"} ready · stale remains labeled · outages fail closed</span>
              </div>
            </div>
          ) : (
          <div className={styles.mapFrame} data-map-ready={mapReady}>
            <Map
              ref={mapRef}
              mapLib={maplibregl}
              mapStyle={LOCAL_MAP_STYLE}
              initialViewState={{ longitude: 0, latitude: 18, zoom: 1.15 }}
              minZoom={0.7}
              maxZoom={14}
              attributionControl={false}
              dragRotate={false}
              touchZoomRotate
              style={{ width: "100%", height: "100%" }}
              interactiveLayerIds={["aerosol-record-points"]}
              cursor={cursor}
              onLoad={() => { setMapReady(true); setMapError(null) }}
              onError={(event) => {
                console.error("[Fusarium Aerosol map]", event.error)
                setMapError(event.error?.message ?? "The local map frame could not be initialized.")
              }}
              onMouseEnter={() => setCursor("pointer")}
              onMouseLeave={() => setCursor("grab")}
              onClick={onMapClick}
            >
              <NavigationControl position="bottom-right" showCompass={false} visualizePitch={false} />
              <ScaleControl position="bottom-left" unit="metric" />
              <Source id="aerosol-evidence" type="geojson" data={mapData} promoteId="recordId">
                <Layer
                  id="aerosol-record-density"
                  type="heatmap"
                  maxzoom={8}
                  paint={{
                    "heatmap-weight": 0.65,
                    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.45, 7, 1.4],
                    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 7, 7, 24],
                    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.45, 7, 0.18, 8, 0],
                    "heatmap-color": [
                      "interpolate", ["linear"], ["heatmap-density"],
                      0, "rgba(30, 220, 180, 0)",
                      0.25, "rgba(44, 221, 183, .25)",
                      0.55, "rgba(83, 196, 255, .45)",
                      0.8, "rgba(241, 205, 91, .65)",
                      1, "rgba(255, 96, 73, .82)",
                    ],
                  }}
                />
                <Layer
                  id="aerosol-record-points"
                  type="circle"
                  paint={{
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 4.5, 6, 7, 12, 10],
                    "circle-color": ["get", "color"],
                    "circle-opacity": 0.9,
                    "circle-stroke-color": "rgba(236, 255, 250, .92)",
                    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 8, 1.7],
                    "circle-blur": 0.08,
                  }}
                />
                {selected ? (
                  <Layer
                    id="aerosol-selected-record"
                    type="circle"
                    filter={["==", ["get", "recordId"], selected.recordId]}
                    paint={{
                      "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 9, 8, 15],
                      "circle-color": "rgba(0,0,0,0)",
                      "circle-stroke-color": "#ffffff",
                      "circle-stroke-width": 2.5,
                      "circle-opacity": 0,
                    }}
                  />
                ) : null}
              </Source>
            </Map>

            {!mapReady && !mapError ? <div className={styles.mapLoading}><Activity className={styles.spin} /><span>Initializing local WebGL map…</span></div> : null}
            {mapError ? <div className={styles.mapError}><AlertTriangle /><strong>Map unavailable</strong><span>{mapError}</span></div> : null}
            {mapReady && visibleRecords.length === 0 ? (
              <div className={styles.mapEmpty}>
                <MapPinned size={31} />
                <strong>No verified atmospheric records displayed</strong>
                <span>The global frame is geographic context, not evidence of environmental absence. Drop a validated JSON or GeoJSON evidence package anywhere on this workbench.</span>
              </div>
            ) : null}
            <div className={styles.mapLegend}>
              <span><i className={styles.densitySwatch} /> Record density — not concentration</span>
              <span>{visibleRecords.length} displayed</span>
            </div>
          </div>
          )}
          <div className={styles.timeline}>
            {viewMode === "shared-earth" ? (
              <>
                <div className={styles.timelineHeading}><RadioTower size={14} /><span>Shared evidence contracts</span><b>{sharedEarth.refreshing ? "checking" : `${sharedEarth.statuses.length} evaluated · ${readyArraylakeCount} fields ready`}</b></div>
                <div className={`${styles.timelineRecords} ${styles.contractGrid}`}>
                  {sharedEarth.statuses.map((status) => {
                    const definition = AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === status.layerId)!
                    return (
                      <button type="button" key={status.layerId} data-selected={status.layerId === inspectedLayerId} onClick={() => setInspectedLayerId(status.layerId)}>
                        <i style={{ "--layer-color": definition.color } as CSSProperties} />
                        <span><strong>{definition.shortLabel} · {statusLabel(status.state)}</strong><small>{definition.evidenceLabel} · {status.sourceLabel} · {status.reason}</small></span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <div className={styles.timelineHeading}><Filter size={14} /><span>Evidence timeline</span><b>{visibleRecords.length} visible</b></div>
                <div className={styles.timelineRecords}>
                  {visibleRecords.length === 0 ? <p>No record times are available for this filter.</p> : visibleRecords.slice().sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt)).slice(0, 12).map((record) => (
                    <button type="button" key={record.recordId} data-selected={record.recordId === selectedId} onClick={() => selectRecord(record)}>
                      <i style={{ "--layer-color": AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === record.layerId)!.color } as CSSProperties} />
                      <span><strong>{record.title}</strong><small>{formatObservedAt(record.observedAt)} · {summarizeMetric(record)}</small></span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className={styles.detailPanel}>
          <div className={styles.panelHeading}>
            <div><span>Progressive disclosure</span><h2>Evidence &amp; provenance</h2></div>
            <FileJson size={19} />
          </div>
          {viewMode === "shared-earth" && inspectedArraylakeStatus ? (
            <div className={styles.recordDetail} data-testid="aerosol-arraylake-field-detail">
              <div className={styles.recordTitle}>
                <i style={{ "--layer-color": arraylakeFieldColor(inspectedArraylakeStatus) } as CSSProperties} />
                <div>
                  <span>Arraylake modeled field</span>
                  <h3>{inspectedArraylakeStatus.variable.name}</h3>
                  <small>{inspectedArraylakeStatus.dataset.name}</small>
                </div>
              </div>
              <dl className={styles.recordFacts}>
                <div><dt>State</dt><dd>{arraylakeStatusLabel(inspectedArraylakeStatus.state)}</dd></div>
                <div><dt>Real frames</dt><dd>{inspectedArraylakeStatus.frameCount ?? "not checked"}</dd></div>
                <div><dt>Manifest updated</dt><dd>{formatObservedAt(inspectedArraylakeStatus.updatedAt)}</dd></div>
                <div><dt>Newest frame</dt><dd>{formatObservedAt(inspectedArraylakeStatus.newestFrameAt)}</dd></div>
              </dl>
              <section className={styles.provenance}>
                <h4><CheckCircle2 size={15} /> Model &amp; provenance</h4>
                <dl>
                  <div><dt>Provider</dt><dd>{inspectedArraylakeStatus.dataset.provider}</dd></div>
                  <div><dt>Arraylake repo</dt><dd>{inspectedArraylakeStatus.dataset.repo}</dd></div>
                  <div><dt>Field contract</dt><dd>{inspectedArraylakeStatus.dataset.id}/{inspectedArraylakeStatus.variable.key}</dd></div>
                  <div><dt>Coverage</dt><dd>{inspectedArraylakeStatus.dataset.coverage}</dd></div>
                  <div><dt>Render</dt><dd>{inspectedArraylakeStatus.variable.render}</dd></div>
                  <div><dt>Units</dt><dd>{inspectedArraylakeStatus.variable.unit || "dimensionless / imagery"}</dd></div>
                  <div><dt>Storage</dt><dd>{inspectedArraylakeStatus.storage ?? "not checked"}</dd></div>
                  <div><dt>Classification</dt><dd>{AEROSOL_CLASSIFICATION}</dd></div>
                  <div><dt>Fallback</dt><dd>synthetic and random fallback prohibited</dd></div>
                </dl>
                <p className={styles.contractReason}>{inspectedArraylakeStatus.reason}</p>
                <span className={styles.nonSynthetic}><ShieldCheck size={14} /> modeled field · timestamped · fail closed</span>
              </section>
            </div>
          ) : viewMode === "shared-earth" && inspectedSharedStatus ? (
            <div className={styles.recordDetail}>
              <div className={styles.recordTitle}>
                <i style={{ "--layer-color": AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === inspectedSharedStatus.layerId)!.color } as CSSProperties} />
                <div>
                  <span>{inspectedLayerDefinition?.evidenceLabel ?? "Shared Earth source contract"}</span>
                  <h3>{inspectedLayerDefinition?.label ?? inspectedSharedStatus.layerId}</h3>
                  <small>{inspectedSharedStatus.sourceLabel}</small>
                </div>
              </div>
              <dl className={styles.recordFacts}>
                <div><dt>State</dt><dd>{statusLabel(inspectedSharedStatus.state)}</dd></div>
                <div><dt>Qualified results</dt><dd>{inspectedSharedStatus.count ?? "not asserted"}</dd></div>
                <div><dt>Checked</dt><dd>{formatObservedAt(inspectedSharedStatus.checkedAt)}</dd></div>
                <div><dt>Newest observation</dt><dd>{formatObservedAt(inspectedSharedStatus.observedAt)}</dd></div>
                <div><dt>Temporal basis</dt><dd>{temporalBasisLabel(inspectedSharedStatus.layerId)}</dd></div>
              </dl>
              <section className={styles.provenance}>
                <h4><CheckCircle2 size={15} /> Renderer &amp; provenance</h4>
                <dl>
                  <div><dt>Endpoint</dt><dd>{inspectedSharedStatus.sourceRef}</dd></div>
                  <div><dt>CREP ids</dt><dd>{sharedCrepLayerIdsForAerosolLayers([inspectedSharedStatus.layerId]).join(", ") || "shared Earth-2 overlay / none"}</dd></div>
                  <div><dt>Cache</dt><dd>{inspectedSharedStatus.cached ? "cached real" : "not asserted"}</dd></div>
                  <div><dt>Classification</dt><dd>{AEROSOL_CLASSIFICATION}</dd></div>
                  <div><dt>Fallback</dt><dd>synthetic and random fallback prohibited</dd></div>
                </dl>
                <p className={styles.contractReason}>{inspectedLayerDefinition?.description}</p>
                <p className={styles.contractReason}>{inspectedSharedStatus.reason}</p>
                <span className={styles.nonSynthetic}><ShieldCheck size={14} /> fail closed · read only</span>
              </section>
              {inspectedSharedStatus.layerId === "sporebase" ? <EnvironmentalCoveragePlanningPanel /> : null}
            </div>
          ) : !selected ? (
            <div className={styles.detailEmpty}>
              <MapPinned size={30} />
              <strong>Select a verified record</strong>
              <p>Location, source observation time, supplied measurements, confidence, and provenance will appear here.</p>
              <dl>
                <div><dt>Package</dt><dd>{dataset?.datasetId ?? "unbound"}</dd></div>
                <div><dt>Providers</dt><dd>{dataset ? providerCount : "unknown"}</dd></div>
                <div><dt>Classification</dt><dd>{AEROSOL_CLASSIFICATION}</dd></div>
                <div><dt>Synthetic records</dt><dd>rejected</dd></div>
              </dl>
            </div>
          ) : (
            <div className={styles.recordDetail}>
              <div className={styles.recordTitle}>
                <i style={{ "--layer-color": selectedLayerDefinition!.color } as CSSProperties} />
                <div><span>{selectedLayerDefinition!.evidenceLabel}</span><h3>{selected.title}</h3><small>{selectedLayerDefinition!.label} · {selected.category ?? "uncategorized observation"}</small></div>
              </div>
              <dl className={styles.recordFacts}>
                <div><dt>Observed</dt><dd>{formatObservedAt(selected.observedAt)}</dd></div>
                <div><dt>Location</dt><dd>{selected.coordinates[1].toFixed(5)}, {selected.coordinates[0].toFixed(5)}</dd></div>
                <div><dt>Altitude</dt><dd>{selected.altitudeM == null ? "not supplied" : `${selected.altitudeM} m`}</dd></div>
                <div><dt>Confidence</dt><dd>{selected.confidence == null ? "not supplied" : `${Math.round(selected.confidence * 100)}%`}</dd></div>
                <div><dt>Evidence class</dt><dd>{selected.evidenceClass}</dd></div>
                <div><dt>Interval</dt><dd>{selected.interval ? `${formatObservedAt(selected.interval.startAt)} — ${formatObservedAt(selected.interval.endAt)} · index ${selected.interval.index}` : "not interval-indexed"}</dd></div>
                <div><dt>Reported</dt><dd>{formatObservedAt(selected.reportedAt)}</dd></div>
              </dl>
              <section className={styles.measurements}>
                <h4>Supplied measurements</h4>
                {Object.entries(selected.measurements).map(([name, measurement]) => (
                  <div key={name}>
                    <span>{name}</span>
                    <strong>{String(measurement.value)}{measurement.unit ? ` ${measurement.unit}` : ""}</strong>
                    <small>{measurement.quality}</small>
                  </div>
                ))}
              </section>
              <section className={styles.provenance}>
                <h4><CheckCircle2 size={15} /> Source provenance</h4>
                <dl>
                  <div><dt>Provider</dt><dd>{selected.provenance.provider}</dd></div>
                  <div><dt>Source ref</dt><dd>{selected.provenance.sourceRef}</dd></div>
                  <div><dt>Source record</dt><dd>{selected.provenance.sourceRecordId}</dd></div>
                  <div><dt>Received</dt><dd>{formatObservedAt(selected.provenance.receivedAt)}</dd></div>
                  <div><dt>License</dt><dd>{selected.provenance.licenseRef ?? "not supplied"}</dd></div>
                  <div><dt>Transforms</dt><dd>{selected.provenance.transformRefs.length > 0 ? selected.provenance.transformRefs.join(", ") : "none declared"}</dd></div>
                </dl>
                <span className={styles.nonSynthetic}><ShieldCheck size={14} /> synthetic = false</span>
              </section>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}
