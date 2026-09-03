"use client"

// Hardware context and the reason live device control remains gated:
// docs/MYCOSOFT_DEVICE_COMPUTE_AND_CONTROL_ARCHITECTURE_SEP01_2026.md

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, BrainCircuit, Cable, Cpu, RefreshCw } from "lucide-react"
import {
  fungiComputeHandoff,
  parseFciNlm,
  parseFciRegistry,
  unboundNlmEvidence,
  type FciDeviceEvidence,
  type FciNlmEvidence,
  type FciRegistryEvidence,
} from "@/lib/fusarium/fci/contracts"
import { normalizeSensingScope } from "@/lib/fusarium/sensing-scope/contracts"
import { ConnectedSensingScopeSelector, useSensingScope } from "@/components/fusarium/sensing/sensing-scope-selector"
import { MultimodalSourceCatalog } from "@/components/fusarium/sensing/multimodal-source-catalog"
import { NlmEngineStatus } from "@/components/fusarium/fci/nlm-engine-status"
import styles from "./fci-dashboard.module.css"

const loadingRegistry: FciRegistryEvidence = {
  state: "loading",
  devices: [],
  source: null,
  message: "Checking the local FCI registry contract.",
  rejectedRecords: 0,
}

function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function EvidenceBadge({ state }: { state: string }) {
  return <span className={styles.badge} data-state={state}>{label(state)}</span>
}

function fact(value: string | number | null): string {
  return value === null ? "Not reported" : String(value)
}

export function FciDashboard() {
  const { scope, setScope } = useSensingScope()
  const [registry, setRegistry] = useState<FciRegistryEvidence>(loadingRegistry)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nlm, setNlm] = useState<FciNlmEvidence>(() => unboundNlmEvidence())
  const [observedAt, setObservedAt] = useState<string | null>(null)

  const loadRegistry = useCallback(async (signal?: AbortSignal) => {
    setRegistry(loadingRegistry)
    const request = new AbortController()
    const timeout = window.setTimeout(() => request.abort(), 5_000)
    const abortFromCaller = () => request.abort()
    signal?.addEventListener("abort", abortFromCaller, { once: true })
    try {
      const response = await fetch("/api/fci/devices", { cache: "no-store", signal: request.signal })
      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      const next = parseFciRegistry(payload, response.status)
      setRegistry(next)
      setObservedAt(new Date().toISOString())
      setSelectedId((current) => next.devices.some((device) => device.id === current)
        ? current
        : null)
      setNlm(unboundNlmEvidence())
    } catch (error) {
      if (signal?.aborted) return
      setRegistry({
        state: "unavailable",
        devices: [],
        source: null,
        message: request.signal.aborted
          ? "The local FCI registry route did not answer within five seconds."
          : "The local FCI registry route could not be reached.",
        rejectedRecords: 0,
      })
      setSelectedId(null)
      setNlm(unboundNlmEvidence())
      setObservedAt(new Date().toISOString())
    } finally {
      window.clearTimeout(timeout)
      signal?.removeEventListener("abort", abortFromCaller)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadRegistry(controller.signal)
    return () => controller.abort()
  }, [loadRegistry])

  const selected = useMemo<FciDeviceEvidence | null>(
    () => registry.devices.find((device) => device.id === selectedId) ?? null,
    [registry.devices, selectedId],
  )

  useEffect(() => {
    if (registry.state === "loading") return
    if (scope.kind !== "devices" || scope.deviceIds.length === 0) {
      if (selectedId && !registry.devices.some((device) => device.id === selectedId)) {
        setSelectedId(null)
        setNlm(unboundNlmEvidence())
      }
      return
    }
    const selectedIsScoped = Boolean(
      selectedId &&
      scope.deviceIds.includes(selectedId) &&
      registry.devices.some((device) => device.id === selectedId),
    )
    if (selectedIsScoped) return
    const scopedId = scope.deviceIds.find((deviceId) => registry.devices.some((device) => device.id === deviceId)) ?? null
    if (scopedId !== selectedId) {
      setSelectedId(scopedId)
      setNlm(unboundNlmEvidence(scopedId))
    }
  }, [registry.devices, registry.state, scope.deviceIds, scope.kind, selectedId])

  const chooseDevice = (deviceId: string) => {
    setSelectedId(deviceId)
    setNlm(unboundNlmEvidence(deviceId))
    if (scope.kind !== "devices" || !scope.deviceIds.includes(deviceId)) {
      setScope(normalizeSensingScope({ kind: "devices", deviceIds: [deviceId] }))
    }
  }

  const loadNlm = async () => {
    if (!selected) return
    const deviceId = selected.id
    setNlm({ ...unboundNlmEvidence(deviceId), state: "loading", message: "Requesting NLM evidence." })
    const request = new AbortController()
    const timeout = window.setTimeout(() => request.abort(), 5_000)
    try {
      const response = await fetch(`/api/fci/nlm/${encodeURIComponent(deviceId)}`, {
        cache: "no-store",
        signal: request.signal,
      })
      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      setNlm(parseFciNlm(payload, response.status, deviceId))
    } catch {
      setNlm({
        ...unboundNlmEvidence(deviceId),
        state: "unavailable",
        message: request.signal.aborted
          ? "The local NLM evidence route did not answer within five seconds."
          : "The local NLM evidence route could not be reached.",
      })
    } finally {
      window.clearTimeout(timeout)
    }
  }

  return (
    <main className={styles.root} data-fusarium-app="fci" data-sensing-scope={scope.kind}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>FCI · Fungal Computer Interface</span>
          <h1>Device Interface</h1>
          <p>Registry-backed device context for Fungi Compute. No demo devices, generated signals, or inferred stream readiness appear here.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={() => void loadRegistry()} disabled={registry.state === "loading"}>
          <RefreshCw size={15} aria-hidden="true" /> Refresh registry
        </button>
      </header>

      <ConnectedSensingScopeSelector compact defaultOpen={false} />
      <MultimodalSourceCatalog application="FCI" />

      <section className={styles.statusRail} aria-label="FCI evidence posture">
        <article>
          <Cable size={17} aria-hidden="true" />
          <span>Device registry</span>
          <strong>{registry.source ?? "Local proxy"}</strong>
          <EvidenceBadge state={registry.state} />
        </article>
        <article>
          <Activity size={17} aria-hidden="true" />
          <span>Signal stream</span>
          <strong>No handshake evidence</strong>
          <EvidenceBadge state="unbound" />
        </article>
        <article>
          <BrainCircuit size={17} aria-hidden="true" />
          <span>NLM evidence</span>
          <strong>{nlm.modelId && nlm.modelVersion ? `${nlm.modelId} · ${nlm.modelVersion}` : "Model provenance not established"}</strong>
          <EvidenceBadge state={nlm.state} />
        </article>
      </section>

      <section className={styles.notice} data-state={registry.state}>
        <strong>{label(registry.state)}</strong>
        <span>{registry.message}</span>
        {registry.rejectedRecords > 0 ? <small>{registry.rejectedRecords} malformed or demo record(s) withheld.</small> : null}
        {observedAt ? <small>Registry check: {new Date(observedAt).toLocaleString()}</small> : null}
      </section>

      <NlmEngineStatus compact />

      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="fci-device-list-title">
          <header className={styles.panelHead}>
            <div>
              <span>Verified registry surface</span>
              <h2 id="fci-device-list-title">Devices</h2>
            </div>
            <strong>{registry.state === "verified" || registry.state === "empty" ? registry.devices.length : "—"}</strong>
          </header>
          <div className={styles.deviceList}>
            {registry.state === "loading" ? <p className={styles.empty}>Loading registry evidence…</p> : null}
            {registry.state !== "loading" && registry.devices.length === 0 ? (
              <p className={styles.empty}>No selectable registry-backed device is available. This is not an all-clear and does not imply that no hardware exists.</p>
            ) : null}
            {registry.devices.map((device) => (
              <button
                type="button"
                key={device.id}
                className={styles.deviceRow}
                data-selected={device.id === selectedId ? "true" : "false"}
                data-in-scope={scope.kind === "devices" && scope.deviceIds.includes(device.id) ? "true" : "false"}
                onClick={() => chooseDevice(device.id)}
              >
                <span>
                  <Cpu size={15} aria-hidden="true" />
                  <b>{device.name}</b>
                  <small>{device.id}</small>
                </span>
                <span className={styles.registryReported}>{scope.kind === "devices" && scope.deviceIds.includes(device.id) ? "In sensing scope · " : ""}Registry says {label(device.registryStatus)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="fci-device-detail-title">
          <header className={styles.panelHead}>
            <div>
              <span>Progressive disclosure</span>
              <h2 id="fci-device-detail-title">Device &amp; processing handoff</h2>
            </div>
          </header>
          {selected ? (
            <div className={styles.detail}>
              <div className={styles.detailTitle}>
                <div><strong>{selected.name}</strong><small>{selected.id}</small></div>
                <EvidenceBadge state={selected.registryStatus} />
              </div>
              <dl className={styles.facts}>
                <div><dt>Device type</dt><dd>{fact(selected.deviceType)}</dd></div>
                <div><dt>Probe type</dt><dd>{fact(selected.probeType)}</dd></div>
                <div><dt>Channels</dt><dd>{fact(selected.channels)}</dd></div>
                <div><dt>Sample rate</dt><dd>{selected.sampleRateHz === null ? "Not reported" : `${selected.sampleRateHz} Hz`}</dd></div>
                <div><dt>Firmware</dt><dd>{fact(selected.firmwareVersion)}</dd></div>
                <div><dt>Last seen</dt><dd>{selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleString() : "Not reported"}</dd></div>
              </dl>
              <div className={styles.truthBox}>
                <strong>Stream remains unverified</strong>
                <p>An online registry label is not a signal-stream handshake. This interface will not draw a waveform until an evidence-bearing stream contract is bound.</p>
              </div>
              <div className={styles.actions}>
                <button type="button" onClick={() => void loadNlm()} disabled={nlm.state === "loading"}>Request NLM evidence</button>
                <Link href={fungiComputeHandoff(selected.id)}>Open Fungi Compute workbench</Link>
              </div>
              <div className={styles.nlm} data-state={nlm.state}>
                <div><span>NLM state</span><EvidenceBadge state={nlm.state} /></div>
                <p>{nlm.message}</p>
                <dl>
                  <div><dt>Growth phase</dt><dd>{fact(nlm.growthPhase)}</dd></div>
                  <div><dt>Predictions</dt><dd>{fact(nlm.predictionCount)}</dd></div>
                  <div><dt>Correlations</dt><dd>{fact(nlm.correlationCount)}</dd></div>
                  <div><dt>Recommendations</dt><dd>{fact(nlm.recommendationCount)}</dd></div>
                </dl>
              </div>
            </div>
          ) : <p className={styles.empty}>Select a registry-backed device to inspect its supplied metadata and hand it to Fungi Compute.</p>}
        </section>
      </div>
    </main>
  )
}
