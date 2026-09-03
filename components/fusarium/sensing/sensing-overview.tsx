"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Activity, Cable, Layers3, RadioTower, SearchX, ShieldCheck } from "lucide-react"
import {
  SENSING_MODALITIES,
  describeSensingScope,
  deviceSupportsModality,
  devicesForSensingScope,
  sensingScopeHref,
  sensingScopeIsBound,
  unmappedDeviceCapabilities,
} from "@/lib/fusarium/sensing-scope/contracts"
import {
  SensingScopeSelector,
  type LocalDeviceReplaySeries,
  useSensingDeviceInventory,
  useSensingScope,
} from "./sensing-scope-selector"
import styles from "./sensing-overview.module.css"
import { DeviceSensorVisualPanel } from "./visuals"
import type { DeviceSensorSampleSeries } from "@/lib/fusarium/sensing-visuals/contracts"
import type { SensingTelemetryResult } from "@/lib/fusarium/sensing-telemetry/adapter"

const INSTRUMENT_WALL: ReadonlyArray<{
  modality: DeviceSensorSampleSeries["modality"]
  label: string
}> = [
  { modality: "microphone", label: "Acoustic waveform & spectrum" },
  { modality: "gas-voc", label: "Gas / VOC field" },
  { modality: "particulate", label: "Particle distribution" },
  { modality: "bioelectric", label: "FCI bioelectric signal" },
  { modality: "radiation", label: "Radiation signal" },
  { modality: "thermal", label: "Thermal field" },
  { modality: "mechanical", label: "Mechanical force / motion" },
  { modality: "radar", label: "Radar return" },
  { modality: "lidar", label: "LiDAR return" },
  { modality: "wifi", label: "Passive Wi-Fi spectrum" },
  { modality: "camera", label: "Camera evidence signal" },
]

function seriesMatchesScopeModality(series: DeviceSensorSampleSeries, scopeModalityId: string): boolean {
  if (scopeModalityId === "acoustic") return series.modality === "microphone"
  if (scopeModalityId === "chemical") return series.modality === "gas-voc"
  return series.modality === scopeModalityId
}

function unboundInstrument(modality: DeviceSensorSampleSeries["modality"]): DeviceSensorSampleSeries {
  return {
    deviceId: "unbound",
    sensorId: `${modality}-unbound`,
    modality,
    unit: "awaiting source",
    timestamps: [],
    values: [],
    provenance: { sourceId: "No selected device stream" },
    state: "unbound",
  }
}

function instrumentSelfTest(tick: number): Array<{ series: DeviceSensorSampleSeries; sampleRateHz?: number }> {
  const base = Date.UTC(2026, 0, 1)
  const timestamps = Array.from({ length: 96 }, (_, index) => base + index * 50)
  const movingPhase = tick / 5
  const wave = (phase: number, gain = 1) => timestamps.map((_, index) => gain * (Math.sin(index / 6 + phase + movingPhase) + .28 * Math.sin(index / 2.3 + phase + movingPhase * 1.7)))
  const make = (modality: DeviceSensorSampleSeries["modality"], values: number[], unit: string, extra: Partial<DeviceSensorSampleSeries> = {}) => ({
    series: {
      deviceId: "instrument-self-test",
      sensorId: `${modality}-self-test`,
      modality,
      unit,
      timestamps: extra.width && extra.height ? [] : timestamps.slice(0, values.length),
      values,
      provenance: { sourceId: "Fusarium deterministic instrument self-test", evidenceId: `self-test-${modality}`, mode: "SIMULATED" as const },
      state: "available" as const,
      ...extra,
    },
    ...((modality === "microphone" || modality === "bioelectric") ? { sampleRateHz: 20 } : {}),
  })
  const field = (phase: number) => Array.from({ length: 48 }, (_, index) => 20 + 15 * Math.sin(index / 4 + phase + movingPhase) + 8 * Math.cos(index / 7 - movingPhase / 2))
  return [
    make("microphone", wave(0, .72), "normalized amplitude"),
    make("gas-voc", field(.4), "index", { width: 8, height: 6 }),
    make("particulate", Array.from({ length: 96 }, (_, index) => 1 + (((index + tick) * 17) % 37) / 4), "µg/m³"),
    make("bioelectric", wave(1.2, .18), "mV"),
    make("radiation", wave(.7, .08).map((value) => .12 + Math.abs(value)), "µSv/h"),
    make("thermal", field(1.1), "°C", { width: 8, height: 6 }),
    make("mechanical", wave(2.1, 12).map(Math.abs), "N"),
    make("radar", wave(.9, 4).map(Math.abs), "return"),
    make("lidar", wave(1.7, 2).map((value) => 8 + value), "m"),
    make("wifi", wave(2.6, 9).map((value) => -62 + value), "dBm"),
    make("camera", wave(.2, .15).map((value) => .72 + value), "confidence"),
  ]
}

function idleSeries(deviceId: string, sensor: { id: string; modality: DeviceSensorSampleSeries["modality"]; provenance: { sourceRef: string; sourceRecordId: string; observedAt: string | null; receivedAt: string | null } }): DeviceSensorSampleSeries {
  return {
    deviceId,
    sensorId: sensor.id,
    modality: sensor.modality,
    unit: "unit unavailable",
    timestamps: [],
    values: [],
    provenance: {
      sourceId: sensor.provenance.sourceRef,
      evidenceId: sensor.provenance.sourceRecordId,
      ...(sensor.provenance.observedAt ? { observedAt: sensor.provenance.observedAt } : {}),
      ...(sensor.provenance.receivedAt ? { receivedAt: sensor.provenance.receivedAt } : {}),
    },
    state: "unbound",
  }
}

function preferredEvidenceSeries(
  candidates: readonly LocalDeviceReplaySeries[],
  predicate: (candidate: LocalDeviceReplaySeries) => boolean,
  preferSelectedLiveRead: boolean,
): LocalDeviceReplaySeries | undefined {
  const stateRank = (candidate: LocalDeviceReplaySeries) => candidate.series.state === "available" ? 2 : candidate.series.state === "stale" ? 1 : 0
  const liveReadRank = (candidate: LocalDeviceReplaySeries) => preferSelectedLiveRead && candidate.series.provenance.sourceId.includes("live_selected=1") ? 1 : 0
  const modeRank = (candidate: LocalDeviceReplaySeries) => candidate.series.provenance.mode === "LIVE" ? 2 : candidate.series.provenance.mode === "REPLAY" ? 1 : 0
  const observedTime = (candidate: LocalDeviceReplaySeries) => {
    const parsed = Date.parse(candidate.series.provenance.observedAt ?? "")
    return Number.isFinite(parsed) ? parsed : 0
  }
  return candidates.filter(predicate).sort((left, right) =>
    stateRank(right) - stateRank(left)
    || liveReadRank(right) - liveReadRank(left)
    || observedTime(right) - observedTime(left)
    || modeRank(right) - modeRank(left)
    || right.series.provenance.sourceId.localeCompare(left.series.provenance.sourceId)
  )[0]
}

export function SensingOverview() {
  const { inventory, manifests, sampleSeries, importMessage, importManifest, refresh } = useSensingDeviceInventory()
  const { scope } = useSensingScope()
  const selectedDevices = devicesForSensingScope(scope, inventory.devices)
  const missingDeviceIds = scope.kind === "devices"
    ? scope.deviceIds.filter((id) => !inventory.devices.some((device) => device.id === id))
    : []
  const otherCapabilities = [...new Set(selectedDevices.flatMap(unmappedDeviceCapabilities))].sort()
  const scopeBound = sensingScopeIsBound(scope)
  const [selfTest, setSelfTest] = useState(false)
  const [selfTestTick, setSelfTestTick] = useState(0)
  const [liveTelemetry, setLiveTelemetry] = useState<SensingTelemetryResult | null>(null)
  const selectedScopeKeyRef = useRef("")
  const [liveReadScopeKey, setLiveReadScopeKey] = useState<string | null>(null)
  const [telemetryError, setTelemetryError] = useState<string | null>(null)
  const [sessionPending, setSessionPending] = useState(false)
  useEffect(() => {
    if (!selfTest) return
    const timer = window.setInterval(() => setSelfTestTick((tick) => tick + 1), 250)
    return () => window.clearInterval(timer)
  }, [selfTest])
  const selfTestSamples = selfTest ? instrumentSelfTest(selfTestTick) : []
  const exactSelectedDeviceIds = scope.kind === "devices" ? selectedDevices.map((device) => device.id) : []
  const exactSelectedDeviceKey = exactSelectedDeviceIds.join("\u001f")
  const liveReadEnabled = Boolean(exactSelectedDeviceKey && liveReadScopeKey === exactSelectedDeviceKey)
  const toggleLiveReads = async () => {
    if (liveReadEnabled) {
      setLiveReadScopeKey(null)
      return
    }
    if (!exactSelectedDeviceKey) return

    setSessionPending(true)
    setTelemetryError(null)
    try {
      const sessionResponse = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      })
      const session = await sessionResponse.json().catch(() => ({}))
      if (!sessionResponse.ok || !session?.ok || !session.user) {
        const redirectTo = sensingScopeHref("/fusarium/sensing", scope)
        const ownerResponse = await fetch("/api/auth/local-dev-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ redirectTo }),
        })
        const ownerSession = await ownerResponse.json().catch(() => ({}))
        if (!ownerResponse.ok || ownerSession.success !== true) {
          throw new Error("Mycosoft owner session is unavailable")
        }
      }
      setLiveReadScopeKey(exactSelectedDeviceKey)
    } catch {
      setTelemetryError("Sign in with the Mycosoft super-admin session to enable selected-device telemetry.")
    } finally {
      setSessionPending(false)
    }
  }
  useEffect(() => {
    if (!exactSelectedDeviceKey) {
      selectedScopeKeyRef.current = ""
      setLiveTelemetry(null)
      setTelemetryError(null)
      return
    }
    if (selectedScopeKeyRef.current !== exactSelectedDeviceKey) {
      selectedScopeKeyRef.current = exactSelectedDeviceKey
      setLiveTelemetry(null)
    }
    setTelemetryError(null)
    let active = true
    const controller = new AbortController()
    let timer: number | null = null
    const read = async () => {
      try {
        const query = new URLSearchParams()
        exactSelectedDeviceKey.split("\u001f").forEach((deviceId) => query.append("deviceId", deviceId))
        if (liveReadEnabled) query.set("live", "1")
        const response = await fetch(`/api/fusarium/sensing-telemetry?${query}`, { method: "GET", cache: "no-store", signal: controller.signal })
        if (!response.ok) {
          if (active) {
            const authenticationFailed = response.status === 401 || response.status === 403
            if (authenticationFailed) setLiveTelemetry(null)
            setTelemetryError(authenticationFailed
              ? "Owner authentication is required for selected-device telemetry. Passive and live evidence remain unavailable until that session is verified."
              : `The latest selected-device refresh returned HTTP ${response.status}; the last verified frame is retained and marked by its original timestamp.`)
            if (liveReadEnabled && authenticationFailed) setLiveReadScopeKey(null)
          }
          return
        }
        const payload = await response.json() as SensingTelemetryResult
        const selectedIds = exactSelectedDeviceKey.split("\u001f")
        const payloadMatchesSelection = Array.isArray(payload.selectedDeviceIds)
          && payload.selectedDeviceIds.length === selectedIds.length
          && selectedIds.every((deviceId) => payload.selectedDeviceIds.includes(deviceId))
        if (active) {
          if (!payloadMatchesSelection) {
            setTelemetryError("A telemetry response named a different device than the current selection; the last verified frame is retained.")
            return
          }
          setLiveTelemetry(payload)
          setTelemetryError(null)
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setTelemetryError("The latest selected-device refresh is unavailable; the last verified frame is retained and marked by its original timestamp.")
        }
      } finally {
        // Schedule from completion so a slow selected-device read can never create
        // overlapping aggregate reads or overwrite a newer selected scope.
        if (active) timer = window.setTimeout(() => void read(), 15_000)
      }
    }
    void read()
    return () => {
      active = false
      controller.abort()
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [exactSelectedDeviceKey, liveReadEnabled])
  const liveSampleSeries = liveTelemetry?.sampleSeries ?? []
  const evidenceSampleSeries: LocalDeviceReplaySeries[] = [
    ...liveSampleSeries.map((series): LocalDeviceReplaySeries => ({ series })),
    ...sampleSeries,
  ]

  return (
    <main className={styles.root} data-fusarium-app="sensing" data-sensing-scope={scope.kind}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Sensing tools · scope-aware overview</span>
          <h1>Senses Overview</h1>
          <p>Choose one device, multiple devices, a mission, a location, or an environment. Exact location and environment values reported by registered devices are suggested when present; current-user missions remain unbound until website and runtime identities have an authoritative relationship. The same read-only context follows every sensing tool, and inventory declarations are never presented as live telemetry.</p>
        </div>
        <div className={styles.truthBadge}><ShieldCheck aria-hidden="true" /><span><strong>UNCLASSIFIED · {liveReadEnabled ? "owner-enabled sensor reads" : "passive telemetry"}</strong><small>{liveReadEnabled ? "Exact selected-device sampling; no motion, output, configuration, or firmware authority." : "Passive inventory and bounded network telemetry may refresh; no serial sensor command, output, configuration, or firmware action occurs until live reads are enabled."}</small></span></div>
      </header>

      <SensingScopeSelector inventory={inventory} importMessage={importMessage} onImportManifest={importManifest} onRefreshInventory={refresh} defaultOpen />

      <section className={styles.section} aria-labelledby="instrument-wall-heading">
        <header>
          <div><span>Selected evidence · visual instrumentation</span><h2 id="instrument-wall-heading">Live Signal Wall</h2></div>
          <div className={styles.instrumentActions}>
            <p>Every sensing family has a visual instrument. Use the deterministic self-test to verify rendering; it is always labeled SIMULATED and never presented as device evidence.</p>
            <button
              type="button"
              disabled={!exactSelectedDeviceKey || sessionPending}
              aria-pressed={liveReadEnabled}
              onClick={() => void toggleLiveReads()}
            >
              {sessionPending ? "Opening owner session…" : liveReadEnabled ? "Stop live sensor reads" : "Enable live sensor reads"}
            </button>
            <button type="button" onClick={() => setSelfTest((active) => !active)}>{selfTest ? "Clear instrument self-test" : "Run instrument self-test"}</button>
          </div>
        </header>
        <div className={styles.instrumentWall}>
          {INSTRUMENT_WALL.map(({ modality, label }) => {
            const matching = preferredEvidenceSeries(evidenceSampleSeries, (candidate) => candidate.series.modality === modality && (
              selectedDevices.length === 0 || selectedDevices.some((device) => device.id === candidate.series.deviceId)
            ), liveReadEnabled) ?? selfTestSamples.find((candidate) => candidate.series.modality === modality)
            return (
              <DeviceSensorVisualPanel
                key={modality}
                series={matching?.series ?? unboundInstrument(modality)}
                sampleRateHz={matching?.sampleRateHz}
                title={matching ? `${label} · ${matching.series.deviceId}` : label}
              />
            )
          })}
        </div>
      </section>

      <section className={styles.scopeSummary} aria-label="Selected sensing context">
        <article>
          <Layers3 aria-hidden="true" />
          <span>Current scope</span>
          <strong>{describeSensingScope(scope)}</strong>
          <b data-state={scopeBound ? "set" : "unbound"}>{scopeBound ? "set" : "unbound"}</b>
        </article>
        <article>
          <RadioTower aria-hidden="true" />
          <span>Registry evidence</span>
          <strong>{inventory.state === "available" || inventory.state === "partial" ? `${inventory.devices.length} device record${inventory.devices.length === 1 ? "" : "s"}` : inventory.message}</strong>
          <b data-state={inventory.state}>{inventory.state}</b>
        </article>
        <article>
          <Activity aria-hidden="true" />
          <span>Telemetry posture</span>
          <strong>{telemetryError ?? liveTelemetry?.message ?? (exactSelectedDeviceKey ? "Passive exact-device telemetry is active; enable live reads to contact the selected sensor." : "Select an exact registry-backed device to evaluate telemetry.")}</strong>
          {telemetryError?.toLowerCase().includes("sign in") || telemetryError?.toLowerCase().includes("authentication") ? (
            <Link href={`/fusarium/login?redirectTo=${encodeURIComponent(sensingScopeHref("/fusarium/sensing", scope))}`}>Sign in with Mycosoft</Link>
          ) : null}
          <b data-state={telemetryError ? "error" : liveTelemetry?.state ?? "unbound"}>{telemetryError ? "error" : liveTelemetry?.state ?? "unbound"}</b>
        </article>
      </section>

      {missingDeviceIds.length > 0 ? (
        <section className={styles.warning} role="status">
          <SearchX aria-hidden="true" />
          <span><strong>Stale or unverified device selection withheld</strong><small>{missingDeviceIds.join(", ")} {missingDeviceIds.length === 1 ? "is" : "are"} present in the URL but absent from the current registry response.</small></span>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="modality-heading">
        <header><div><span>Selected scope × sensing application</span><h2 id="modality-heading">Cross-sensor coverage</h2></div><p>“Declared” means inventory metadata only. Telemetry is reported only when an exact selected-device stream passes identity, sensor, time, unit, and provenance checks.</p></header>
        <div className={styles.modalities}>
          {SENSING_MODALITIES.map((modality) => {
            const matching = selectedDevices.filter((device) => deviceSupportsModality(device, modality))
            const liveForModality = liveSampleSeries.filter((series) => seriesMatchesScopeModality(series, modality.id) && selectedDevices.some((device) => device.id === series.deviceId))
            const capabilityState = scope.kind === "unbound" || scope.kind === "mission"
              ? "not evaluated for this context type"
              : selectedDevices.length === 0
                ? `no inventory record linked to the selected ${scope.kind === "devices" ? "device ID" : scope.kind}`
                : matching.length > 0
                  ? `declared by ${matching.length}/${selectedDevices.length} selected device${selectedDevices.length === 1 ? "" : "s"}`
                  : "not declared by selected device inventory"
            return (
              <article key={modality.id} className={styles.modality}>
                <header><span>{modality.label}</span><b>adapter {modality.adapterState}</b></header>
                <h3>{modality.tool}</h3>
                <p>{modality.adapterMessage}</p>
                <dl>
                  <div><dt>Scope</dt><dd>{scopeBound ? describeSensingScope(scope) : "unbound"}</dd></div>
                  <div><dt>Inventory capability</dt><dd>{capabilityState}</dd></div>
                  <div><dt>Telemetry</dt><dd>{liveForModality.length > 0 ? `${liveForModality.length} contract-valid live series` : "unbound for selected device"}</dd></div>
                </dl>
                <Link href={sensingScopeHref(modality.href, scope)}>Open {modality.tool} with this scope</Link>
              </article>
            )
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="device-heading">
        <header><div><span>Registry correlation</span><h2 id="device-heading">Selected devices and other reported modalities</h2></div><p>No capability is added from a product name, device type, or assumed Psathyrella configuration.</p></header>
        {scope.kind === "unbound" || scope.kind === "mission" ? (
          <div className={styles.unboundPanel}><Cable aria-hidden="true" /><span><strong>Device correlation not available for this scope</strong><small>{scope.kind === "mission" ? "The mission identifier is carried to each tool, but the website user is not authoritatively mapped to runtime operator-owned mission contexts." : "Choose an inventory-backed device, registered location or environment, or manually enter a context."}</small></span></div>
        ) : selectedDevices.length === 0 ? (
          <div className={styles.unboundPanel}><SearchX aria-hidden="true" /><span><strong>No registry-backed device matches this scope</strong><small>{scope.kind === "devices" ? "Select one or more current inventory records above." : `No registered device reports the selected ${scope.kind} context.`} A placeholder Psathyrella, droid, or sensor is never inserted.</small></span></div>
        ) : (
          <div className={styles.deviceGrid}>
            {selectedDevices.map((device) => (
              <article key={device.id}>
                <header><strong>{device.name}</strong><b>{device.status ?? "status not reported"}</b></header>
                <dl>
                  <div><dt>ID</dt><dd>{device.id}</dd></div>
                  <div><dt>Type</dt><dd>{device.type ?? "not reported"}</dd></div>
                  <div><dt>Location</dt><dd>{device.locationLabel ?? "not reported"}</dd></div>
                  <div><dt>Source</dt><dd>{device.sourceEndpoints.join(", ")}</dd></div>
                </dl>
                <p>{device.declaredCapabilities.length > 0 ? device.declaredCapabilities.join(" · ") : "No sensing capabilities were declared by the registry record."}</p>
              </article>
            ))}
          </div>
        )}
        <div className={styles.otherCapabilities}>
          <strong>Other registered modalities</strong>
          <span>{otherCapabilities.length > 0 ? otherCapabilities.join(" · ") : "None reported outside the mapped sensing modalities for the selected device records."}</span>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="manifest-heading">
        <header><div><span>Strict capability manifests</span><h2 id="manifest-heading">Boards, processors, and sensor instances</h2></div><p>Only explicit registry or bounded local-import declarations appear. A declared sensor does not imply a live stream.</p></header>
        {selectedDevices.length === 0 ? (
          <div className={styles.unboundPanel}><SearchX aria-hidden="true" /><span><strong>No selected-device manifest to inspect</strong><small>Select one or more registry-backed devices, or import a strict local replay manifest.</small></span></div>
        ) : (
          <div className={styles.manifestGrid}>
            {selectedDevices.map((device) => {
              const manifest = manifests.find((candidate) => candidate.device.id === device.id)
              return <article key={device.id}>
                <header><strong>{device.name}</strong><b>{manifest ? `${manifest.sensors.length} sensor${manifest.sensors.length === 1 ? "" : "s"}` : "manifest unavailable"}</b></header>
                {manifest ? <>
                  <dl>
                    <div><dt>Boards</dt><dd>{manifest.boards.length ? manifest.boards.map((board) => `${board.model ?? board.family} (${board.processors.map((processor) => processor.model ?? processor.family).join(", ") || "no processor refs"})`).join(" · ") : "not declared"}</dd></div>
                    <div><dt>Mission</dt><dd>{manifest.mission?.label ?? manifest.mission?.id ?? "not declared"}</dd></div>
                    <div><dt>Environment</dt><dd>{manifest.environment?.label ?? manifest.environment?.id ?? "not declared"}</dd></div>
                  </dl>
                  <div className={styles.sensorList}>{manifest.sensors.length ? manifest.sensors.map((sensor) => <div key={sensor.id}>
                    <span><strong>{sensor.modality}</strong><small>{sensor.model ?? sensor.id}</small></span>
                    <em data-state={sensor.transport.adapterState}>{sensor.transport.kind} · {sensor.transport.adapterState}</em>
                    <i>{sensor.calibration.state === "unknown" ? "calibration unknown" : `calibration ${sensor.calibration.state}`} · {sensor.provenance.sourceRef}</i>
                    <div className={styles.instrument}>{(() => { const evidence = preferredEvidenceSeries(evidenceSampleSeries, (candidate) => candidate.series.deviceId === device.id && (candidate.series.sensorId === sensor.id || candidate.series.sensorId.startsWith(`${sensor.id}:`)), liveReadEnabled); return <DeviceSensorVisualPanel series={evidence?.series ?? idleSeries(device.id, sensor)} sampleRateHz={evidence?.sampleRateHz} title={`${device.name} · ${sensor.model ?? sensor.modality}`} /> })()}</div>
                  </div>) : <p>No sensor instance was explicitly declared.</p>}</div>
                </> : <p>The current inventory row predates the strict manifest response. Refresh discovery; no sensor has been inferred.</p>}
              </article>
            })}
          </div>
        )}
      </section>
    </main>
  )
}
