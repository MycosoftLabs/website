"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, FileJson, Pause, Play, RadioTower, ScanLine, SkipForward, Thermometer, Upload } from "lucide-react"
import {
  summarizeThermalFrame,
  summarizeThermalSequence,
  thermalDifference,
  thermalTrend,
  validateThermalSequence,
  type ThermalFrame,
  type ThermalSequence,
} from "@/lib/fusarium/thermal/contracts"
import { describeSensingScope, sensingScopeContainsDevice } from "@/lib/fusarium/sensing-scope/contracts"
import { ConnectedSensingScopeSelector, useSensingScope } from "./sensing-scope-selector"
import { MultimodalSourceCatalog } from "./multimodal-source-catalog"
import styles from "./sensing-tool.module.css"
import thermalStyles from "./thermal-dashboard.module.css"

type DisplayMode = "temperature" | "difference"

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function thermalColor(value: number, minimum: number, maximum: number): string {
  const span = Math.max(maximum - minimum, Number.EPSILON)
  const t = Math.max(0, Math.min(1, (value - minimum) / span))
  const stops = [
    [8, 18, 56], [43, 38, 120], [132, 45, 125], [214, 78, 68], [252, 169, 52], [255, 245, 158],
  ]
  const scaled = t * (stops.length - 1)
  const index = Math.min(stops.length - 2, Math.floor(scaled))
  const local = scaled - index
  const color = stops[index].map((channel, channelIndex) => Math.round(channel + (stops[index + 1][channelIndex] - channel) * local))
  return `rgb(${color.join(",")})`
}

function ThermalCanvas({ frame, baseline, mode }: { frame: ThermalFrame; baseline: ThermalFrame | null; mode: DisplayMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const values = useMemo(
    () => mode === "difference" && baseline ? thermalDifference(frame, baseline) : frame.temperaturesC,
    [baseline, frame, mode],
  )
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = frame.width
    canvas.height = frame.height
    const context = canvas.getContext("2d")
    if (!context) return
    const image = context.createImageData(frame.width, frame.height)
    values.forEach((value, index) => {
      const color = thermalColor(value, minimum, maximum).match(/\d+/g)?.map(Number) ?? [0, 0, 0]
      image.data[index * 4] = color[0]
      image.data[index * 4 + 1] = color[1]
      image.data[index * 4 + 2] = color[2]
      image.data[index * 4 + 3] = 255
    })
    context.putImageData(image, 0, 0)
  }, [frame.height, frame.width, maximum, minimum, values])

  return (
    <div className={styles.visualization}>
      <canvas ref={canvasRef} aria-label={mode === "difference" ? "Thermal difference frame" : "Radiometric thermal frame"} />
      <div className={styles.scale}><span>{minimum.toFixed(2)}{mode === "difference" ? " Δ°C" : " °C"}</span><i /><span>{maximum.toFixed(2)}{mode === "difference" ? " Δ°C" : " °C"}</span></div>
    </div>
  )
}

function TemperatureTrend({ sequence, selectedId }: { sequence: ThermalSequence; selectedId: string | null }) {
  const rows = thermalTrend(sequence)
  const values = rows.flatMap((row) => [row.minimumC, row.averageC, row.maximumC])
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const span = Math.max(maximum - minimum, Number.EPSILON)
  const points = (key: "minimumC" | "averageC" | "maximumC") => rows.map((row, index) => {
    const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100
    const y = 94 - ((row[key] - minimum) / span) * 88
    return `${x},${y}`
  }).join(" ")
  const selectedIndex = Math.max(0, rows.findIndex((row) => row.frameId === selectedId))
  const selectedX = rows.length === 1 ? 50 : (selectedIndex / (rows.length - 1)) * 100
  return <div className={thermalStyles.trend} aria-label="Temperature trend from imported frames">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
      <title>Minimum, average, and maximum temperature across supplied frames</title>
      <line className={thermalStyles.cursor} x1={selectedX} x2={selectedX} y1="4" y2="96" />
      <polyline className={thermalStyles.minimumLine} points={points("minimumC")} />
      <polyline className={thermalStyles.averageLine} points={points("averageC")} />
      <polyline className={thermalStyles.maximumLine} points={points("maximumC")} />
    </svg>
    <div className={thermalStyles.legend}><span data-series="minimum">Minimum</span><span data-series="average">Average</span><span data-series="maximum">Maximum</span></div>
  </div>
}

export function ThermalDashboard() {
  const { scope } = useSensingScope()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sequence, setSequence] = useState<ThermalSequence | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [baselineId, setBaselineId] = useState<string | null>(null)
  const [mode, setMode] = useState<DisplayMode>("temperature")
  const [playing, setPlaying] = useState(false)
  const frame = sequence?.frames.find((item) => item.frameId === selectedId) ?? null
  const baseline = sequence?.frames.find((item) => item.frameId === baselineId) ?? null
  const summary = useMemo(() => frame ? summarizeThermalFrame(frame) : null, [frame])
  const sequenceSummary = useMemo(() => sequence ? summarizeThermalSequence(sequence) : null, [sequence])
  const sequenceInDeviceScope = sequence ? sensingScopeContainsDevice(scope, sequence.deviceId) : null

  useEffect(() => {
    if (!playing || !sequence || sequence.frames.length < 2) return
    const timer = window.setInterval(() => {
      setSelectedId((current) => {
        const index = Math.max(0, sequence.frames.findIndex((item) => item.frameId === current))
        return sequence.frames[(index + 1) % sequence.frames.length].frameId
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [playing, sequence])

  const importFile = async (file: File) => {
    try {
      const parsed = validateThermalSequence(JSON.parse(await file.text()) as unknown)
      if (!parsed.ok) {
        setSequence(null); setSelectedId(null); setBaselineId(null); setIssues(parsed.issues)
        return
      }
      setSequence(parsed.value)
      setSelectedId(parsed.value.frames[0]?.frameId ?? null)
      setBaselineId(parsed.value.frames[0]?.frameId ?? null)
      setIssues([])
      setPlaying(false)
    } catch {
      setSequence(null); setSelectedId(null); setBaselineId(null); setIssues(["The selected file is not valid JSON."])
    }
  }

  return (
    <main className={`${styles.root} ${styles.thermal}`} data-fusarium-app="thermal" data-sensing-scope={scope.kind}>
      <header className={styles.hero}>
        <div><span className={styles.eyebrow}>Thermal Imaging · radiometric sense</span><h1>Thermal Field Laboratory</h1><p>Validate calibrated temperature sequences, inspect every pixel, compare frames, and export evidence-bearing summaries. A file import is offline analysis; it never claims that live thermal hardware is connected.</p></div>
        <div className={styles.heroActions}>
          <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} />
          <button type="button" onClick={() => inputRef.current?.click()}><Upload size={15} /> Import thermal JSON</button>
          <button type="button" disabled={!sequence} onClick={() => sequence && downloadJson(`${sequence.sequenceId}-thermal-analysis.json`, { sequence, frameSummaries: sequence.frames.map(summarizeThermalFrame) })}><Download size={15} /> Export analysis</button>
        </div>
      </header>

      <ConnectedSensingScopeSelector compact defaultOpen={false} />
      <MultimodalSourceCatalog application="Thermal" />

      {sequence && sequenceInDeviceScope === false ? <section className={styles.issues} role="status"><strong>Imported sequence is outside the selected device scope</strong><p>{sequence.deviceId ? `Sequence device ${sequence.deviceId} is not among ${describeSensingScope(scope)}.` : "The sequence does not supply a device identifier, so it cannot be correlated to the selected devices."} The file remains available for offline inspection but is not presented as telemetry for the selected scope.</p></section> : null}

      <section className={styles.rail} aria-label="Thermal operational state">
        <article><RadioTower /><span>Live sensor</span><strong>No verified adapter</strong><b data-state="unbound">unbound</b></article>
        <article><FileJson /><span>Sequence</span><strong>{sequence ? `${sequence.frames.length} frames` : "Not loaded"}</strong><b data-state={sequence ? "verified" : "unbound"}>{sequence ? "validated" : "unbound"}</b></article>
        <article><Thermometer /><span>Calibration</span><strong>{sequence ? (sequence.calibrated ? "Declared calibrated" : "Not calibrated") : "No evidence"}</strong><b data-state={sequence?.calibrated ? "verified" : "unbound"}>{sequence?.calibrated ? "supplied" : "withheld"}</b></article>
        <article><ScanLine /><span>Differential</span><strong>{frame && baseline ? "Frames compatible" : "Select a sequence"}</strong><b data-state={frame && baseline ? "verified" : "unbound"}>{frame && baseline ? "ready" : "unbound"}</b></article>
      </section>

      {issues.length ? <section className={styles.issues} role="alert"><strong>Thermal sequence withheld</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section> : null}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header><div><span>Evidence session</span><h2>Frames &amp; provenance</h2></div><FileJson /></header>
          {!sequence ? <div className={styles.empty}><Thermometer /><strong>No thermal sequence loaded</strong><p>Import a versioned sequence containing finite per-pixel Celsius values, timestamps, dimensions, calibration state, and provenance. No sample image is silently substituted.</p></div> : <>
            <dl className={styles.summary}><div><dt>Sequence</dt><dd>{sequence.sequenceId}</dd></div><div><dt>Sensor family</dt><dd>{sequence.sensorFamily}</dd></div><div><dt>Device</dt><dd>{sequence.deviceId ?? "not supplied"}</dd></div><div><dt>Provenance</dt><dd>{sequence.provenance.source}</dd></div><div><dt>Duration</dt><dd>{sequenceSummary ? `${(sequenceSummary.durationMs / 1000).toFixed(2)} s` : "unknown"}</dd></div><div><dt>Median interval</dt><dd>{sequenceSummary?.medianIntervalMs === null ? "single frame" : `${sequenceSummary?.medianIntervalMs} ms`}</dd></div></dl>
            <div className={thermalStyles.replayBar}><button type="button" onClick={() => setPlaying((value) => !value)} disabled={sequence.frames.length < 2}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "Pause replay" : "Replay supplied frames"}</button><button type="button" onClick={() => { const index = Math.max(0, sequence.frames.findIndex((item) => item.frameId === selectedId)); setSelectedId(sequence.frames[(index + 1) % sequence.frames.length].frameId) }}><SkipForward size={14} /> Step</button><span>{sequence.frames.findIndex((item) => item.frameId === selectedId) + 1} / {sequence.frames.length}</span></div>
            <div className={styles.samples}>{sequence.frames.map((item) => <button type="button" key={item.frameId} data-selected={item.frameId === selectedId} onClick={() => setSelectedId(item.frameId)}><span><b>{item.frameId}</b><small>{new Date(item.observedAt).toLocaleString()} · {item.width}×{item.height}</small></span><em>{item.emissivity === null ? "ε not supplied" : `ε ${item.emissivity}`}</em></button>)}</div>
          </>}
        </section>

        <section className={styles.panel}>
          <header><div><span>Calibrated scene analysis</span><h2>Radiometric viewer</h2></div><Thermometer /></header>
          {!frame || !summary ? <div className={styles.empty}><ScanLine /><strong>Select a thermal frame</strong><p>The image, extrema, average, and differential controls will appear here.</p></div> : <div className={styles.detail}>
            <div className={styles.modeBar}><button type="button" data-active={mode === "temperature"} onClick={() => setMode("temperature")}>Temperature</button><button type="button" data-active={mode === "difference"} disabled={!baseline} onClick={() => setMode("difference")}>Difference</button><label>Baseline<select value={baselineId ?? ""} onChange={(event) => setBaselineId(event.target.value)}>{sequence?.frames.map((item) => <option value={item.frameId} key={item.frameId}>{item.frameId}</option>)}</select></label></div>
            <ThermalCanvas frame={frame} baseline={baseline} mode={mode} />
            {sequence ? <TemperatureTrend sequence={sequence} selectedId={selectedId} /> : null}
            <dl className={styles.readings}><div><dt>Minimum</dt><dd>{summary.minimumC.toFixed(2)} °C</dd></div><div><dt>Maximum</dt><dd>{summary.maximumC.toFixed(2)} °C</dd></div><div><dt>Average</dt><dd>{summary.averageC.toFixed(2)} °C</dd></div><div><dt>Range</dt><dd>{summary.rangeC.toFixed(2)} °C</dd></div><div><dt>Ambient</dt><dd>{frame.ambientC === null ? "not supplied" : `${frame.ambientC} °C`}</dd></div><div><dt>Observed</dt><dd>{new Date(frame.observedAt).toLocaleString()}</dd></div></dl>
            {!sequence?.calibrated ? <div className={styles.gate}><strong>Radiometric claims withheld</strong><p>This sequence declares itself uncalibrated. The supplied values remain visible for inspection, but they are not promoted as calibrated temperature evidence.</p></div> : null}
          </div>}
        </section>
      </div>
    </main>
  )
}
