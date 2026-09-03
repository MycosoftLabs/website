"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BrainCircuit, Download, FileJson, FlaskConical, Tag, Upload, Wind } from "lucide-react"
import {
  localModelReadiness,
  predictWithLocalCentroid,
  stageGandhaLabel,
  summarizeGandhaDataset,
  trainLocalCentroidModel,
  trainingReadiness,
  unboundTrainingJob,
  type GandhaDataset,
  type GandhaLocalCentroidModel,
} from "@/lib/fusarium/gandha/contracts"
import { importGandhaDataset } from "@/lib/fusarium/gandha/bosch-import"
import { describeSensingScope, sensingScopeContainsDevice } from "@/lib/fusarium/sensing-scope/contracts"
import { ConnectedSensingScopeSelector, useSensingScope } from "./sensing-scope-selector"
import { MultimodalSourceCatalog } from "./multimodal-source-catalog"
import { HeatFieldVisual, MultichannelTraceVisual } from "./visuals"
import type { ChannelSeries, HeatField, VisualProvenance } from "@/lib/fusarium/sensing-visuals/contracts"
import styles from "./sensing-tool.module.css"

function downloadDataset(dataset: GandhaDataset) {
  const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${dataset.datasetId}-staged.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadLocalModel(model: GandhaLocalCentroidModel) {
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${model.datasetId}-gandha-local-model.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const GANDHA_MAX_FILE_BYTES = 8 * 1024 * 1024

export function GandhaDashboard() {
  const { scope } = useSensingScope()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dataset, setDataset] = useState<GandhaDataset | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState("")
  const [localModel, setLocalModel] = useState<GandhaLocalCentroidModel | null>(null)
  const summary = useMemo(() => dataset ? summarizeGandhaDataset(dataset) : null, [dataset])
  const readiness = useMemo(() => trainingReadiness(dataset, false), [dataset])
  const training = useMemo(() => unboundTrainingJob(dataset?.datasetId ?? null), [dataset])
  const localReadiness = useMemo(() => localModelReadiness(dataset), [dataset])
  const datasetInDeviceScope = dataset ? sensingScopeContainsDevice(scope, dataset.sensor.deviceId) : null

  const importFile = async (file: File) => {
    if (file.size > GANDHA_MAX_FILE_BYTES) {
      setDataset(null)
      setSelectedId(null)
      setIssues(["GANDHA import files are limited to 8 MiB."])
      return
    }
    try {
      const raw = JSON.parse(await file.text()) as unknown
      const result = importGandhaDataset(raw, file.name)
      if (!result.ok) {
        setDataset(null)
        setSelectedId(null)
        setIssues(result.issues)
        return
      }
      setDataset(result.value)
      setSelectedId(result.value.samples[0]?.sampleId ?? null)
      setIssues([])
      setLocalModel(null)
    } catch {
      setDataset(null)
      setSelectedId(null)
      setIssues(["The selected file is not valid JSON."])
    }
  }

  const applyLabel = () => {
    if (!dataset || !selectedId) return
    const result = stageGandhaLabel(dataset, selectedId, draftLabel)
    if (!result.ok) {
      setIssues(result.issues)
      return
    }
    setDataset(result.value)
    setDraftLabel("")
    setIssues([])
    setLocalModel(null)
  }

  const selected = dataset?.samples.find((sample) => sample.sampleId === selectedId) ?? null
  const localPrediction = useMemo(() => selected && localModel ? predictWithLocalCentroid(localModel, selected) : null, [localModel, selected])
  const channelRanges = useMemo(() => {
    const ranges: Record<string, { minimum: number; maximum: number }> = {}
    for (const sample of dataset?.samples ?? []) for (const [channel, value] of Object.entries(sample.channels)) {
      const current = ranges[channel]
      ranges[channel] = current ? { minimum: Math.min(current.minimum, value), maximum: Math.max(current.maximum, value) } : { minimum: value, maximum: value }
    }
    return ranges
  }, [dataset])
  const visualProvenance = useMemo<VisualProvenance | undefined>(() => dataset ? ({
    sourceId: dataset.provenance.source === "file_import" ? "operator-file" : "local-capture",
    observedAt: summary?.firstObservedAt ?? undefined,
    evidenceId: dataset.datasetId,
    mode: "REPLAY",
  }) : undefined, [dataset, summary])
  const visualChannels = useMemo<ChannelSeries[]>(() => {
    if (!dataset) return []
    return Object.keys(dataset.channelUnits).slice(0, 12).map((channel) => ({
      id: channel,
      label: channel,
      unit: dataset.channelUnits[channel] ?? "unknown",
      samples: dataset.samples.slice(-512).flatMap((sample) => typeof sample.channels[channel] === "number" ? [{ timestamp: sample.observedAt, value: sample.channels[channel] }] : []),
    }))
  }, [dataset])
  const signatureHeatField = useMemo<HeatField>(() => {
    const channels = visualChannels
    const samples = dataset?.samples.slice(-64) ?? []
    if (!channels.length || !samples.length) return { width: 1, height: 1, values: [], unit: "normalized" }
    const values = channels.flatMap((channel) => {
      const range = channelRanges[channel.id]
      const span = range ? Math.max(range.maximum - range.minimum, Number.EPSILON) : 1
      return samples.map((sample) => {
        const value = sample.channels[channel.id]
        return typeof value === "number" && range ? (value - range.minimum) / span : 0
      })
    })
    return { width: samples.length, height: channels.length, values, unit: "normalized" }
  }, [channelRanges, dataset, visualChannels])

  const trainLocal = () => {
    if (!dataset) return
    const result = trainLocalCentroidModel(dataset, new Date().toISOString())
    if (!result.ok) { setIssues(result.issues); return }
    setLocalModel(result.value); setIssues([])
  }

  return (
    <main className={styles.root} data-fusarium-app="gandha" data-sensing-scope={scope.kind}>
      <header className={styles.hero}>
        <div>
          <Link href="/fusarium" className={styles.backLink}><ArrowLeft size={14} /> Back to Fusarium</Link>
          <span className={styles.eyebrow}>GANDHA · chemical sense</span>
          <h1>Odor Signature Laboratory</h1>
          <p>Import GANDHA JSON or Bosch AI-Studio raw/specimen files, preserve complete heater cycles, label observed specimens, train a local exploratory model, and export evidence. BSEC deployment remains licensed and provenance-gated.</p>
        </div>
        <div className={styles.heroActions}>
          <input ref={inputRef} type="file" accept="application/json,.json,.bmerawdata,.bmespecimen" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} />
          <button type="button" onClick={() => inputRef.current?.click()}><Upload size={15} /> Import dataset</button>
          <button type="button" disabled={!dataset} onClick={() => dataset && downloadDataset(dataset)}><Download size={15} /> Export staged JSON</button>
        </div>
      </header>

      <ConnectedSensingScopeSelector compact defaultOpen={false} />
      <MultimodalSourceCatalog application="GANDHA" />

      {dataset && datasetInDeviceScope === false ? <section className={styles.issues} role="status"><strong>Imported dataset is outside the selected device scope</strong><p>{dataset.sensor.deviceId ? `Dataset device ${dataset.sensor.deviceId} is not among ${describeSensingScope(scope)}.` : "The dataset does not supply a device identifier, so it cannot be correlated to the selected devices."} The file remains available for offline inspection but is not presented as telemetry for the selected scope.</p></section> : null}

      <section className={styles.rail} aria-label="GANDHA operational state">
        <article><FileJson /><span>Dataset</span><strong>{summary ? `${summary.sampleCount} cycles` : "Not loaded"}</strong><b data-state={summary ? "verified" : "unbound"}>{dataset?.sourceCompatibility ? "Bosch import" : summary ? "validated" : "unbound"}</b></article>
        <article><Tag /><span>Labels</span><strong>{summary ? `${summary.labeledCount}/${summary.sampleCount}` : "No dataset"}</strong><b data-state={summary && summary.unlabeledCount === 0 ? "verified" : "unbound"}>{summary && summary.unlabeledCount === 0 ? "complete" : "incomplete"}</b></article>
        <article><BrainCircuit /><span>Local model</span><strong>{localModel ? `${localModel.classes.length} classes` : "Not trained"}</strong><b data-state={localModel ? "verified" : "unbound"}>{localModel ? "local only" : "unbound"}</b></article>
        <article><FlaskConical /><span>Verified inference</span><strong>No registry-verified model</strong><b data-state="unbound">withheld</b></article>
      </section>

      {issues.length > 0 ? <section className={styles.issues} role="alert"><strong>Dataset withheld</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section> : null}

      <section className={styles.visualGrid} aria-label="GANDHA supplied-sample visualizations">
        <MultichannelTraceVisual title="Gas and VOC channel traces" subtitle="Supplied cycles only · each channel preserves its declared unit" channels={visualChannels} state={dataset ? "ready" : "unbound"} provenance={visualProvenance} />
        <HeatFieldVisual title="Odor signature field" subtitle="Per-channel normalized pattern for comparison; not compound identification" field={signatureHeatField} state={dataset ? "ready" : "unbound"} provenance={visualProvenance} />
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header><div><span>Local browser session</span><h2>Dataset &amp; samples</h2></div><Wind /></header>
          {!dataset || !summary ? (
            <div className={styles.empty}><FileJson /><strong>No dataset loaded</strong><p>Import versioned GANDHA JSON, Bosch .bmerawdata, or Bosch .bmespecimen JSON. No built-in odor signatures or generated sensor values are supplied.</p></div>
          ) : (
            <>
              <dl className={styles.summary}>
                <div><dt>Dataset</dt><dd>{summary.datasetId}</dd></div><div><dt>Sensor family</dt><dd>{summary.sensorFamily}</dd></div>
                <div><dt>Channels</dt><dd>{summary.channelNames.join(", ")}</dd></div><div><dt>Observed range</dt><dd>{summary.firstObservedAt} — {summary.lastObservedAt}</dd></div>
                {dataset.sourceCompatibility ? <><div><dt>Bosch source</dt><dd>{dataset.sourceCompatibility.format}</dd></div><div><dt>AI-Studio / firmware</dt><dd>{dataset.sourceCompatibility.appVersion ?? "not supplied"} / {dataset.sourceCompatibility.firmwareVersion ?? "not supplied"}</dd></div><div><dt>Heater profiles</dt><dd>{dataset.sourceCompatibility.heaterProfileIds.join(", ") || "not supplied"}</dd></div><div><dt>Duty cycles</dt><dd>{dataset.sourceCompatibility.dutyCycleProfileIds.join(", ") || "not supplied"}</dd></div></> : null}
              </dl>
              <div className={styles.samples}>
                {dataset.samples.slice(0, 250).map((sample) => (
                  <button type="button" key={sample.sampleId} data-selected={sample.sampleId === selectedId} onClick={() => setSelectedId(sample.sampleId)}>
                    <span><b>{sample.sampleId}</b><small>{new Date(sample.observedAt).toLocaleString()}</small></span>
                    <em>{sample.label ?? "unlabeled"}</em>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className={styles.panel}>
          <header><div><span>Progressive disclosure</span><h2>Signature labeling &amp; training gate</h2></div><BrainCircuit /></header>
          {!selected ? <div className={styles.empty}><Tag /><strong>Select a sample</strong><p>Its supplied readings and environmental context will appear here.</p></div> : (
            <div className={styles.detail}>
              <h3>{selected.sampleId}</h3>
              <dl className={styles.readings}>
                {Object.entries(selected.channels).map(([name, value]) => {
                  const range = channelRanges[name]
                  const width = !range || range.maximum === range.minimum ? 50 : ((value - range.minimum) / (range.maximum - range.minimum)) * 100
                  return <div key={name}><dt>{name}</dt><dd>{value} {dataset?.channelUnits[name] ?? ""}</dd><span className={styles.featureBar}><i style={{ width: `${Math.max(2, width)}%` }} /></span></div>
                })}
                <div><dt>Temperature</dt><dd>{selected.temperatureC ?? "not supplied"}</dd></div>
                <div><dt>Humidity</dt><dd>{selected.humidityPct ?? "not supplied"}</dd></div>
                <div><dt>Pressure</dt><dd>{selected.pressureHpa ?? "not supplied"}</dd></div>
              </dl>
              <div className={styles.labelEditor}><input value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} placeholder={selected.label ?? "Enter observed smell label"} /><button type="button" onClick={applyLabel}>Stage label</button></div>
              <div className={styles.gate}><strong>Local odor-signature model</strong><p>{localModel ? `Trained in this browser from ${localModel.trainingSampleIds.length} labeled samples using ${localModel.algorithm}. No dataset left this page.` : localReadiness.reasons.join(" ")}</p><button type="button" disabled={!localReadiness.canTrain} onClick={trainLocal}>Train local centroid model</button>{localModel ? <button type="button" onClick={() => downloadLocalModel(localModel)}>Export local model</button> : null}</div>
              {localPrediction?.ok ? <div className={styles.gate}><strong>Exploratory match: {localPrediction.value.label}</strong><p>Relative separation {(localPrediction.value.relativeSeparation * 100).toFixed(1)}% · distance {localPrediction.value.distance.toFixed(4)}. {localPrediction.value.message}</p></div> : null}
              <div className={styles.gate}><strong>External training remains unbound</strong><p>{training.message} {readiness.reasons.join(" ")}</p><button type="button" disabled>Submit external training job</button></div>
              <div className={styles.gate}><strong>Verified operational inference is withheld</strong><p>A verified result will appear only with registry-verified model provenance, a matching feature contract, artifact digest, timestamp, and bounded confidence.</p></div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
