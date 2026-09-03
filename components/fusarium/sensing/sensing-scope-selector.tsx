"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, LocateFixed, RadioTower, RefreshCw, Satellite, SearchX } from "lucide-react"
import {
  SENSING_SCOPE_SCHEMA,
  UNBOUND_CURRENT_USER_MISSION_SUGGESTIONS,
  deriveSensingContextSuggestions,
  describeSensingScope,
  normalizeSensingScope,
  parseSensingScope,
  sensingScopeIsBound,
  writeSensingScope,
  type SensingDeviceInventoryRecord,
  type SensingContextSuggestionSnapshot,
  type SensingInventorySnapshot,
  type SensingScope,
  type SensingScopeKind,
} from "@/lib/fusarium/sensing-scope/contracts"
import {
  DEVICE_CAPABILITY_SCHEMA,
  DEVICE_MANIFEST_MAX_BYTES,
  parseDeviceCapabilityManifest,
  parseDeviceCapabilitySnapshot,
  type DeviceCapabilityManifest,
} from "@/lib/fusarium/device-capabilities/contracts"
import { deduplicateDeviceCapabilityManifests, manifestFromRegistryRecord, selectableSensingDeviceManifests } from "@/lib/fusarium/device-capabilities/registry"
import styles from "./sensing-scope-selector.module.css"
import { validateDeviceSensorSampleSeries, type DeviceSensorSampleSeries } from "@/lib/fusarium/sensing-visuals/contracts"

export interface LocalDeviceReplaySeries { series: DeviceSensorSampleSeries; sampleRateHz?: number }

const DEVICE_CAPABILITY_ENDPOINT = "/api/fusarium/device-capabilities"
const EARTH_DEVICE_ENDPOINT = "/api/earth-simulator/devices"
const DEVICE_CAPABILITY_TIMEOUT_MS = 18_000
const DEVICE_CAPABILITY_REFRESH_MS = 15_000

const LOADING_INVENTORY: SensingInventorySnapshot = {
  state: "loading",
  devices: [],
  message: "Checking passive device registries.",
  rejectedRecords: 0,
  checkedEndpoints: [DEVICE_CAPABILITY_ENDPOINT],
}

function inventoryFromManifests(manifests: readonly DeviceCapabilityManifest[], message: string, state: SensingInventorySnapshot["state"]): SensingInventorySnapshot {
  return {
    state,
    devices: manifests.map((manifest) => ({
      id: manifest.device.id,
      name: manifest.device.name,
      type: manifest.device.type,
      status: manifest.device.status,
      locationLabel: manifest.location?.label ?? manifest.location?.id ?? null,
      locationContexts: manifest.location ? [{ id: manifest.location.id, label: manifest.location.label ?? manifest.location.id, identifierSource: "registry-id" as const }] : [],
      environmentContexts: manifest.environment ? [{ id: manifest.environment.id, label: manifest.environment.label ?? manifest.environment.id, identifierSource: "registry-id" as const }] : [],
      declaredCapabilities: manifest.sensors.map((sensor) => sensor.modality),
      registryKinds: ["device-registry" as const],
      sourceEndpoints: [...new Set(manifest.sensors.map((sensor) => sensor.provenance.sourceRef).concat(manifest.provenance.sourceRefs ?? [manifest.provenance.sourceRef]))],
    })),
    message,
    rejectedRecords: 0,
    checkedEndpoints: [DEVICE_CAPABILITY_ENDPOINT],
  }
}

async function registrySnapshot(signal: AbortSignal): Promise<{ inventory: SensingInventorySnapshot; manifests: readonly DeviceCapabilityManifest[] }> {
  try {
    const [capabilityResult, earthResult] = await Promise.allSettled([
      fetch(DEVICE_CAPABILITY_ENDPOINT, { cache: "no-store", signal }).then(async (response) => ({ response, payload: await response.json().catch(() => null) })),
      fetch(EARTH_DEVICE_ENDPOINT, { cache: "no-store", signal }).then(async (response) => ({ response, payload: await response.json().catch(() => null) })),
    ])
    const capability = capabilityResult.status === "fulfilled" && capabilityResult.value.response.ok
      ? parseDeviceCapabilitySnapshot(capabilityResult.value.payload)
      : null
    const earthEnvelope = earthResult.status === "fulfilled" && earthResult.value.response.ok && typeof earthResult.value.payload === "object" && earthResult.value.payload !== null
      ? earthResult.value.payload as Record<string, unknown>
      : null
    const earthRows = Array.isArray(earthEnvelope?.devices) ? earthEnvelope.devices : []
    const earthManifests = earthRows.map((row, index) => manifestFromRegistryRecord(row, EARTH_DEVICE_ENDPOINT, index)).filter((row): row is DeviceCapabilityManifest => Boolean(row))
    const manifests = selectableSensingDeviceManifests(deduplicateDeviceCapabilityManifests([...earthManifests, ...(capability?.devices ?? [])]))
    const state: SensingInventorySnapshot["state"] = manifests.length ? (capability ? capability.state === "available" ? "available" : "partial" : "partial") : capability?.state ?? "unavailable"
    const message = manifests.length
      ? `${manifests.length} device record${manifests.length === 1 ? "" : "s"} from Earth Simulator${capability?.devices.length ? " plus capability registries" : ""}; undeclared sensors remain unbound.`
      : capability?.message ?? "No passive device inventory source returned a usable record."
    return { inventory: inventoryFromManifests(manifests, message, state), manifests }
  } catch (error) {
    return { inventory: {
      state: "unavailable",
      devices: [],
      message: signal.aborted
        ? `${DEVICE_CAPABILITY_ENDPOINT} did not answer within eighteen seconds.`
        : `${DEVICE_CAPABILITY_ENDPOINT} could not be reached.`,
      rejectedRecords: 0,
      checkedEndpoints: [DEVICE_CAPABILITY_ENDPOINT],
    }, manifests: [] }
  }
}

export function useSensingDeviceInventory() {
  const [inventory, setInventory] = useState<SensingInventorySnapshot>(LOADING_INVENTORY)
  const [manifests, setManifests] = useState<readonly DeviceCapabilityManifest[]>([])
  const lastRegistryManifests = useRef<readonly DeviceCapabilityManifest[]>([])
  const localManifests = useRef<readonly DeviceCapabilityManifest[]>([])
  const [sampleSeries, setSampleSeries] = useState<readonly LocalDeviceReplaySeries[]>([])
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    let refreshTimer: number | null = null
    const timeout = window.setTimeout(() => controller.abort(), DEVICE_CAPABILITY_TIMEOUT_MS)
    void registrySnapshot(controller.signal).then((snapshot) => {
      if (active) {
        const transientFailure = snapshot.inventory.state === "unavailable" || snapshot.inventory.state === "error"
        const registryManifests = transientFailure && lastRegistryManifests.current.length
          ? lastRegistryManifests.current
          : snapshot.manifests
        if (!transientFailure || snapshot.manifests.length) lastRegistryManifests.current = snapshot.manifests
        const byId = new Map(registryManifests.map((manifest) => [manifest.device.id, manifest]))
        for (const manifest of localManifests.current) byId.set(manifest.device.id, manifest)
        const combined = [...byId.values()]
        const retainedMessage = transientFailure && lastRegistryManifests.current.length
          ? `${snapshot.inventory.message} The last verified registry snapshot is retained; its original device and telemetry timestamps remain authoritative.`
          : snapshot.inventory.message
        setInventory(combined.length
          ? inventoryFromManifests(combined, `${retainedMessage}${localManifests.current.length ? ` ${localManifests.current.length} browser-local replay manifest${localManifests.current.length === 1 ? "" : "s"} retained.` : ""}`, transientFailure ? "partial" : snapshot.inventory.state)
          : snapshot.inventory)
        setManifests(combined)
      }
    }).finally(() => {
      window.clearTimeout(timeout)
      // Schedule from completion so a slow bounded registry read cannot overlap
      // the next refresh or be cancelled by a fixed interval.
      if (active) refreshTimer = window.setTimeout(() => setRevision((value) => value + 1), DEVICE_CAPABILITY_REFRESH_MS)
    })
    return () => {
      active = false
      window.clearTimeout(timeout)
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      controller.abort()
    }
  }, [revision])

  const importManifest = useCallback(async (file: File) => {
    if (file.size > DEVICE_MANIFEST_MAX_BYTES) { setImportMessage("Manifest rejected: file exceeds 256 KiB."); return }
    try {
      const parsedJson = JSON.parse(await file.text()) as unknown
      const root = typeof parsedJson === "object" && parsedJson !== null && !Array.isArray(parsedJson) ? parsedJson as Record<string, unknown> : null
      const candidates = root && root.manifest ? [root.manifest] : Array.isArray(parsedJson) ? parsedJson : [parsedJson]
      const imported: DeviceCapabilityManifest[] = []
      const issues: string[] = []
      for (const candidate of candidates) {
        const parsed = parseDeviceCapabilityManifest(candidate)
        if (parsed.ok) imported.push(parsed.manifest)
        else issues.push(...parsed.issues)
      }
      if (!imported.length || issues.length) { setImportMessage(`Manifest rejected: ${issues.slice(0, 3).join("; ") || `expected ${DEVICE_CAPABILITY_SCHEMA}`}.`); return }
      const byId = new Map(manifests.map((manifest) => [manifest.device.id, manifest]))
      for (const manifest of imported) byId.set(manifest.device.id, manifest)
      const next = [...byId.values()]
      const localById = new Map(localManifests.current.map((manifest) => [manifest.device.id, manifest]))
      for (const manifest of imported) localById.set(manifest.device.id, manifest)
      localManifests.current = [...localById.values()]
      setManifests(next)
      setInventory(inventoryFromManifests(next, `${imported.length} bounded local manifest${imported.length === 1 ? "" : "s"} imported for this browser session; no registry or hardware was changed.`, "available"))
      const replayInput = root && Array.isArray(root.sampleSeries) ? root.sampleSeries : []
      const replay: LocalDeviceReplaySeries[] = []
      for (const candidate of replayInput) {
        if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) { issues.push("sample series must be an object"); continue }
        const row = candidate as Record<string, unknown>
        const series = row.series && typeof row.series === "object" ? row.series as DeviceSensorSampleSeries : row as unknown as DeviceSensorSampleSeries
        const seriesIssues = validateDeviceSensorSampleSeries(series)
        const manifest = imported.find((item) => item.device.id === series.deviceId)
        const sensor = manifest?.sensors.find((item) => item.id === series.sensorId && item.modality === series.modality)
        if (seriesIssues.length || !sensor || !["available", "stale"].includes(series.state)) { issues.push(...seriesIssues, `sample series ${series.sensorId || "(unknown)"} is not bound to an imported manifest sensor`); continue }
        const sampleRateHz = Number(row.sampleRateHz)
        // A browser-local import is replay evidence even if its file attempts
        // to label itself LIVE. Preserve provenance fields while fixing the
        // operational mode at this ingestion boundary.
        replay.push({ series: { ...series, provenance: { ...series.provenance, mode: "REPLAY" } }, ...(Number.isFinite(sampleRateHz) && sampleRateHz > 0 && sampleRateHz <= 1_000_000 ? { sampleRateHz } : {}) })
      }
      setSampleSeries(replay)
      setImportMessage(replay.length ? `Local replay accepted with ${replay.length} provenance-bearing sample series. It exists only in this browser session.` : "Local replay manifest accepted. Declared capabilities are selectable; sample instruments remain idle because no validated sample series was supplied.")
    } catch { setImportMessage("Manifest rejected: invalid JSON.") }
  }, [manifests])

  return { inventory, manifests, sampleSeries, importMessage, importManifest, refresh: () => setRevision((value) => value + 1) }
}

export function useSensingScope() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const scope = useMemo(() => parseSensingScope(searchParams), [searchParams])

  const setScope = useCallback((nextScope: SensingScope) => {
    const next = writeSensingScope(new URLSearchParams(searchParams.toString()), nextScope)
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return { scope, setScope }
}

function DeviceChoice({
  device,
  checked,
  onChange,
}: {
  device: SensingDeviceInventoryRecord
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={styles.device} data-selected={checked ? "true" : "false"}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.check}>{checked ? <Check aria-hidden="true" /> : null}</span>
      <span>
        <strong>{device.name}</strong>
        <small>{device.id}</small>
      </span>
      <em>{device.type ?? "type not reported"}</em>
    </label>
  )
}

function ContextEditor({
  scope,
  suggestions,
  onApply,
}: {
  scope: SensingScope
  suggestions: SensingContextSuggestionSnapshot
  onApply: (scope: SensingScope) => void
}) {
  const [contextId, setContextId] = useState(scope.contextId ?? "")
  const [contextLabel, setContextLabel] = useState(scope.contextLabel ?? "")

  useEffect(() => {
    setContextId(scope.contextId ?? "")
    setContextLabel(scope.contextLabel ?? "")
  }, [scope.contextId, scope.contextLabel, scope.kind])

  const title = scope.kind[0].toUpperCase() + scope.kind.slice(1)
  const chooseSuggestion = (id: string, label: string) => {
    setContextId(id)
    setContextLabel(label)
    onApply(normalizeSensingScope({ ...scope, contextId: id, contextLabel: label }))
  }
  return (
    <div className={styles.contextEditor}>
      <section className={styles.suggestions} aria-label={`${title} suggestions`}>
        <header>
          <span><strong>Source-backed suggestions</strong><small>{suggestions.message}</small></span>
          <b data-state={suggestions.state}>{suggestions.state}</b>
        </header>
        {suggestions.suggestions.length > 0 ? (
          <div className={styles.suggestionList}>
            {suggestions.suggestions.map((suggestion) => (
              <button type="button" key={`${suggestion.kind}:${suggestion.id}`} onClick={() => chooseSuggestion(suggestion.id, suggestion.label)}>
                <span><strong>{suggestion.label}</strong><small>{suggestion.id}</small></span>
                <em>{suggestion.deviceIds.length} registered device{suggestion.deviceIds.length === 1 ? "" : "s"}</em>
                {suggestion.identifierSource === "registry-label" ? <i>exact registry label; no stable ID reported</i> : <i>registry ID</i>}
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.suggestionEmpty}>No suggestion is substituted. Manual context entry remains available below.</p>
        )}
      </section>
      <h3 className={styles.manualHeading}>Manual context entry</h3>
      <label>
        <span>{title} identifier</span>
        <input value={contextId} onChange={(event) => setContextId(event.target.value)} placeholder={`Enter a stable ${scope.kind} ID`} />
      </label>
      <label>
        <span>Display label (optional)</span>
        <input value={contextLabel} onChange={(event) => setContextLabel(event.target.value)} placeholder="Operator-entered context label" />
      </label>
      <button type="button" onClick={() => onApply(normalizeSensingScope({ ...scope, contextId, contextLabel }))}>
        Apply {scope.kind} scope
      </button>
      <p>Manually entered values are operator-supplied filter context. A source-backed location or environment suggestion is copied exactly from registered device fields, but still does not prove authorization or live telemetry. Current-user mission suggestions remain unavailable until website identity is authoritatively mapped to runtime operator contexts.</p>
    </div>
  )
}

export interface SensingScopeSelectorProps {
  inventory: SensingInventorySnapshot
  onRefreshInventory?: () => void
  defaultOpen?: boolean
  compact?: boolean
  importMessage?: string | null
  onImportManifest?: (file: File) => void
}

export function SensingScopeSelector({
  inventory,
  onRefreshInventory,
  defaultOpen = true,
  compact = false,
  importMessage,
  onImportManifest,
}: SensingScopeSelectorProps) {
  const { scope, setScope } = useSensingScope()
  const [open, setOpen] = useState(defaultOpen)
  const bound = sensingScopeIsBound(scope)
  const contextSuggestions = scope.kind === "location" || scope.kind === "environment"
    ? deriveSensingContextSuggestions(inventory, scope.kind)
    : UNBOUND_CURRENT_USER_MISSION_SUGGESTIONS

  const chooseKind = (kind: SensingScopeKind) => {
    if (kind === scope.kind) return
    setScope(normalizeSensingScope({ schema: SENSING_SCOPE_SCHEMA, kind }))
  }

  const chooseDevice = (deviceId: string, checked: boolean) => {
    const deviceIds = checked
      ? [...scope.deviceIds, deviceId]
      : scope.deviceIds.filter((id) => id !== deviceId)
    setScope(normalizeSensingScope({ ...scope, kind: "devices", deviceIds }))
  }

  return (
    <details className={styles.scope} open={open} onToggle={(event) => setOpen(event.currentTarget.open)} data-compact={compact ? "true" : "false"}>
      <summary>
        <span className={styles.scopeIcon}>{scope.kind === "devices" ? <RadioTower /> : scope.kind === "unbound" ? <SearchX /> : <LocateFixed />}</span>
        <span><strong>Sensing scope</strong><small>{describeSensingScope(scope)}</small></span>
        <b data-state={bound ? "bound" : "unbound"}>{bound ? "context set" : "unbound"}</b>
      </summary>
      <div className={styles.body}>
        <div className={styles.kindBar} role="group" aria-label="Sensing scope type">
          {(["unbound", "devices", "mission", "location", "environment"] as SensingScopeKind[]).map((kind) => (
            <button type="button" key={kind} data-active={scope.kind === kind ? "true" : "false"} onClick={() => chooseKind(kind)}>
              {kind === "devices" ? "Device(s)" : kind[0].toUpperCase() + kind.slice(1)}
            </button>
          ))}
        </div>

        {scope.kind === "unbound" ? (
          <div className={styles.empty}>
            <SearchX aria-hidden="true" />
            <span><strong>No sensing scope is bound</strong><small>Choose one inventory-backed device, multiple devices, or enter a mission, location, or environment identifier.</small></span>
          </div>
        ) : null}

        {scope.kind === "devices" ? (
          <div className={styles.deviceArea}>
            <header>
              <span>
                <strong>Passive registry inventory</strong>
                <small>{inventory.message}</small>
              </span>
              <span className={styles.inventoryActions}>
                <b data-state={inventory.state}>{inventory.state}</b>
                {onRefreshInventory ? <button type="button" onClick={onRefreshInventory} disabled={inventory.state === "loading"}><RefreshCw aria-hidden="true" /> Refresh</button> : null}
                {onImportManifest ? <label className={styles.importButton}>Import replay manifest<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) onImportManifest(file); event.currentTarget.value = "" }} /></label> : null}
              </span>
            </header>
            {inventory.devices.length ? (
              <div className={styles.devices}>
                {inventory.devices.map((device) => (
                  <DeviceChoice key={device.id} device={device} checked={scope.deviceIds.includes(device.id)} onChange={(checked) => chooseDevice(device.id, checked)} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <Satellite aria-hidden="true" />
                <span>
                  <strong>No inventory-backed device is selectable</strong>
                  <small>{inventory.state === "empty" ? "The available registries returned no records." : "The registries are loading, unavailable, or invalid. No device has been invented as a fallback."}</small>
                </span>
              </div>
            )}
            {inventory.rejectedRecords > 0 ? <p className={styles.rejected}>{inventory.rejectedRecords} malformed or demo inventory record(s) withheld.</p> : null}
            {importMessage ? <p className={styles.rejected}>{importMessage}</p> : null}
          </div>
        ) : null}

        {scope.kind === "mission" || scope.kind === "location" || scope.kind === "environment"
          ? <ContextEditor scope={scope} suggestions={contextSuggestions} onApply={setScope} />
          : null}
      </div>
    </details>
  )
}

export function ConnectedSensingScopeSelector(props: Omit<SensingScopeSelectorProps, "inventory" | "onRefreshInventory">) {
  const { inventory, importMessage, importManifest, refresh } = useSensingDeviceInventory()
  return <SensingScopeSelector {...props} inventory={inventory} importMessage={importMessage} onImportManifest={importManifest} onRefreshInventory={refresh} />
}
