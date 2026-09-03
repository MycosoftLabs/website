"use client"

// Physical-device limits and command-authorization invariants:
// docs/MYCOSOFT_DEVICE_COMPUTE_AND_CONTROL_ARCHITECTURE_SEP01_2026.md

import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, Download, FileJson, Gauge, Hand, Pause, Play, SkipForward, Upload } from "lucide-react"
import {
  mechanicalSequenceSummary,
  mechanicalSampleSummary,
  mechanicalTrend,
  mechanicalTrainingReadiness,
  stageMechanicalLabel,
  validateMechanicalSequence,
  type MechanicalSequence,
} from "@/lib/fusarium/mechanical/contracts"
import {
  FLEX_MOTION_GATE_LABELS,
  MYCOBOT_280_PI_2023_PROFILE,
  MECHANICAL_ARM_CANDIDATES,
  buildPassiveArmSelfCheckRequest,
  createUnboundArmReadiness,
  evaluatePassiveArmSelfCheck,
  flexMotionReadiness,
  type ArmReadinessSignal,
  type PassiveArmSelfCheckRequest,
  type PassiveArmSelfCheckResult,
} from "@/lib/fusarium/mechanical/arm-readiness"
import { describeSensingScope, sensingScopeContainsDevice } from "@/lib/fusarium/sensing-scope/contracts"
import styles from "./sensing-tool.module.css"
import armStyles from "./mechanical-dashboard.module.css"
import { ConnectedSensingScopeSelector, useSensingScope } from "./sensing-scope-selector"
import { MultimodalSourceCatalog } from "./multimodal-source-catalog"

function downloadSequence(sequence: MechanicalSequence) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(sequence, null, 2)], { type: "application/json" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${sequence.sequenceId}-mechanical-staged.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function MechanicalTrend({ sequence, selectedId }: { sequence: MechanicalSequence; selectedId: string | null }) {
  const rows = mechanicalTrend(sequence)
  const maximum = Math.max(1, ...rows.flatMap((row) => [row.forceMagnitudeN, row.totalPressureN]))
  const points = (key: "forceMagnitudeN" | "totalPressureN") => rows.map((row, index) => {
    const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100
    return `${x},${94 - (row[key] / maximum) * 88}`
  }).join(" ")
  const selectedIndex = Math.max(0, rows.findIndex((row) => row.sampleId === selectedId))
  const selectedX = rows.length === 1 ? 50 : (selectedIndex / (rows.length - 1)) * 100
  return <div className={armStyles.motionTrend} aria-label="Force and pressure trend from imported samples">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"><title>Force magnitude and total pressure across supplied mechanical samples</title><line x1={selectedX} x2={selectedX} y1="4" y2="96" /><polyline data-series="force" points={points("forceMagnitudeN")} /><polyline data-series="pressure" points={points("totalPressureN")} /></svg>
    <div><span data-series="force">Force magnitude</span><span data-series="pressure">Total pressure</span><em>0–{maximum.toFixed(2)} N</em></div>
  </div>
}

export function MechanicalDashboard() {
  const { scope } = useSensingScope()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sequence, setSequence] = useState<MechanicalSequence | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState("")
  const [selectedArmId, setSelectedArmId] = useState("")
  const [selfCheckRequest, setSelfCheckRequest] = useState<PassiveArmSelfCheckRequest | null>(null)
  const [selfCheck, setSelfCheck] = useState<PassiveArmSelfCheckResult | null>(null)
  const [playing, setPlaying] = useState(false)
  const sample = sequence?.samples.find((item) => item.sampleId === selectedId) ?? null
  const summary = useMemo(() => sample ? mechanicalSampleSummary(sample) : null, [sample])
  const sequenceSummary = useMemo(() => sequence ? mechanicalSequenceSummary(sequence) : null, [sequence])
  const readiness = useMemo(() => mechanicalTrainingReadiness(sequence, false), [sequence])
  const armReadiness = useMemo(() => selectedArmId ? createUnboundArmReadiness(selectedArmId) : null, [selectedArmId])
  const flexReadiness = useMemo(() => armReadiness ? flexMotionReadiness(armReadiness) : null, [armReadiness])
  const captureMatchesScope = useMemo(() => sequence ? sensingScopeContainsDevice(scope, sequence.deviceId) : null, [scope, sequence])
  const readinessSignals: Array<[string, ArmReadinessSignal]> = armReadiness ? [
    ["Adapter service", armReadiness.service],
    ["Vendor SDK", armReadiness.sdk],
    ["Serial transport", armReadiness.serial],
    ["Arm camera", armReadiness.camera],
    ["Proprioception", armReadiness.proprioception],
  ] : []

  useEffect(() => {
    if (!playing || !sequence || sequence.samples.length < 2) return
    const timer = window.setInterval(() => {
      setSelectedId((current) => {
        const index = Math.max(0, sequence.samples.findIndex((item) => item.sampleId === current))
        return sequence.samples[(index + 1) % sequence.samples.length].sampleId
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [playing, sequence])

  const importFile = async (file: File) => {
    try {
      const parsed = validateMechanicalSequence(JSON.parse(await file.text()) as unknown)
      if (!parsed.ok) { setSequence(null); setSelectedId(null); setIssues(parsed.issues); return }
      setSequence(parsed.value); setSelectedId(parsed.value.samples[0]?.sampleId ?? null); setIssues([]); setPlaying(false)
    } catch {
      setSequence(null); setSelectedId(null); setIssues(["The selected file is not valid JSON."])
    }
  }

  const applyLabel = () => {
    if (!sequence || !selectedId) return
    const staged = stageMechanicalLabel(sequence, selectedId, draftLabel)
    if (!staged.ok) { setIssues(staged.issues); return }
    setSequence(staged.value); setDraftLabel(""); setIssues([])
  }

  const runPassiveSelfCheck = () => {
    if (!armReadiness) return
    const request = buildPassiveArmSelfCheckRequest(armReadiness.deviceId)
    setSelfCheckRequest(request)
    setSelfCheck(evaluatePassiveArmSelfCheck(armReadiness))
  }

  return (
    <main className={`${styles.root} ${styles.mechanical}`} data-fusarium-app="mechanical" data-sensing-scope={scope.kind}>
      <header className={styles.hero}>
        <div><h1>Tactus — Mechanical</h1><p>Tactus is Fusarium&apos;s mechanical and tactile workbench. Select the lab myCobot candidate, inspect adapter and sensing readiness, and review real tactile captures. The passive self-check does not open a serial port or contact hardware. Flex motion control stays locked until every physical safety and authority gate is independently verified.</p></div>
        <div className={styles.heroActions}>
          <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} />
          <button type="button" onClick={() => inputRef.current?.click()}><Upload size={15} /> Import capture JSON</button>
          <button type="button" disabled={!sequence} onClick={() => sequence && downloadSequence(sequence)}><Download size={15} /> Export staged capture</button>
        </div>
      </header>

      <ConnectedSensingScopeSelector compact defaultOpen={false} />
      <MultimodalSourceCatalog application="Tactus — Mechanical" />

      <section className={styles.rail} aria-label="Tactus mechanical operational state">
        <article><Activity /><span>Arm candidate</span><strong>{selectedArmId ? "Identity pending" : "Not selected"}</strong><b data-state="unbound">unverified</b></article>
        <article><Gauge /><span>Adapter</span><strong>No canonical service</strong><b data-state="unbound">unbound</b></article>
        <article><FileJson /><span>Capture</span><strong>{sequence ? `${sequence.samples.length} samples` : "Not loaded"}</strong><b data-state={sequence ? "verified" : "unbound"}>{sequence ? "validated" : "unbound"}</b></article>
        <article><Hand /><span>Flex</span><strong>Motion authority withheld</strong><b data-state="unbound">locked</b></article>
      </section>

      {issues.length ? <section className={styles.issues} role="alert"><strong>Tactus capture withheld</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section> : null}
      {sequence && captureMatchesScope === false ? <section className={armStyles.scopeWarning} role="status"><strong>Imported capture does not match the selected device scope</strong><p>Capture device: {sequence.deviceId ?? "not supplied"}. Current scope: {describeSensingScope(scope)}. The file remains available for inspection; this warning does not bind it to a device or treat it as live telemetry.</p></section> : null}

      <div className={armStyles.armGrid}>
        <section className={styles.panel}>
          <header><div><span>Physical-device boundary</span><h2>myCobot selection &amp; readiness</h2></div><Activity /></header>
          <div className={armStyles.armBody}>
            <label className={armStyles.deviceSelect}>
              <span>Select a physical arm candidate</span>
              <select value={selectedArmId} onChange={(event) => { setSelectedArmId(event.target.value); setSelfCheck(null); setSelfCheckRequest(null) }} aria-label="Select a myCobot device">
                <option value="">No arm selected</option>
                {MECHANICAL_ARM_CANDIDATES.map((candidate) => <option key={candidate.deviceId} value={candidate.deviceId}>{candidate.label}</option>)}
              </select>
            </label>
            {!armReadiness ? <div className={armStyles.armEmpty}><strong>No physical arm selected</strong><p>Select the candidate profile to inspect readiness. Selection does not assert that the installed unit, serial number, service, SDK, port, camera, or joint stream is available.</p></div> : <>
              <div className={armStyles.referenceNote}>
                <strong>{MYCOBOT_280_PI_2023_PROFILE.model} reference profile</strong>
                <p>{MYCOBOT_280_PI_2023_PROFILE.degreesOfFreedom} axes · {MYCOBOT_280_PI_2023_PROFILE.workingRadiusMm} mm radius · {MYCOBOT_280_PI_2023_PROFILE.ratedPayloadG} g rated payload. Official direct-serial reference: {MYCOBOT_280_PI_2023_PROFILE.directSerialReference.port} at {MYCOBOT_280_PI_2023_PROFILE.directSerialReference.baud.toLocaleString()} baud. These values have not been observed on the lab unit.</p>
              </div>
              <div className={armStyles.readinessGrid}>
                {readinessSignals.map(([label, signal]) => <article key={label} data-state={signal.state}><span>{label}</span><strong>{signal.state.replace("_", " ")}</strong><p>{signal.message}</p></article>)}
              </div>
              <div className={armStyles.telemetryWithheld}><strong>Joint and pose telemetry withheld</strong><p>No zeros or default coordinates are displayed. The local embodiment stub is not accepted as connected evidence; telemetry must carry device-read provenance and an observation timestamp.</p></div>
            </>}
          </div>
        </section>

        <section className={styles.panel}>
          <header><div><span>Read-only gate</span><h2>Non-moving self-check &amp; Flex</h2></div><Hand /></header>
          <div className={armStyles.armBody}>
            <div className={armStyles.passiveBoundary}><strong>Passive check guarantees</strong><p>No motion, servo write, power change, calibration, or firmware change. This source pass evaluates the readiness contract only and contacts no device.</p></div>
            <button className={armStyles.selfCheckButton} type="button" disabled={!armReadiness} onClick={runPassiveSelfCheck}>Run non-moving readiness check</button>
            {selfCheck ? <div className={armStyles.selfCheckResult} data-state={selfCheck.state} role="status"><strong>{selfCheck.state === "ready" ? "Passive readiness verified" : "Passive readiness blocked"}</strong><p>{selfCheck.reasons.length ? selfCheck.reasons.join(" ") : "All passive adapter checks supplied verified evidence."}</p><small>{selfCheckRequest?.schema} · no hardware contacted</small></div> : null}
            <div className={styles.gate}>
              <strong>Flex motion control is locked</strong>
              <p>Motion is unavailable while any gate is unverified. A browser selection or successful connection check never grants motion authority.</p>
              <ul className={armStyles.gateList}>{(flexReadiness?.missing ?? Object.values(FLEX_MOTION_GATE_LABELS)).map((gate) => <li key={gate}>{gate}</li>)}</ul>
              <button type="button" disabled>Flex motion locked</button>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header><div><span>Evidence session</span><h2>Capture &amp; samples</h2></div><FileJson /></header>
          {!sequence ? <div className={styles.empty}><Hand /><strong>No mechanical capture loaded</strong><p>Import a versioned capture containing normalized contact coordinates, non-negative pressure, a force vector, joint angles, timestamps, and provenance. No generated gait or contact data is supplied.</p></div> : <>
            <dl className={styles.summary}><div><dt>Sequence</dt><dd>{sequence.sequenceId}</dd></div><div><dt>Device</dt><dd>{sequence.deviceId ?? "not supplied"}</dd></div><div><dt>Provenance</dt><dd>{sequence.provenance.source}</dd></div><div><dt>Training gate</dt><dd>{readiness.canSubmit ? "ready" : "withheld"}</dd></div><div><dt>Duration</dt><dd>{sequenceSummary ? `${(sequenceSummary.durationMs / 1000).toFixed(2)} s` : "unknown"}</dd></div><div><dt>Labeled</dt><dd>{sequenceSummary ? `${sequenceSummary.labeledCount} / ${sequenceSummary.sampleCount}` : "unknown"}</dd></div></dl>
            <div className={armStyles.replayBar}><button type="button" onClick={() => setPlaying((value) => !value)} disabled={sequence.samples.length < 2}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "Pause replay" : "Replay supplied samples"}</button><button type="button" onClick={() => { const index = Math.max(0, sequence.samples.findIndex((item) => item.sampleId === selectedId)); setSelectedId(sequence.samples[(index + 1) % sequence.samples.length].sampleId) }}><SkipForward size={14} /> Step</button><span>{sequence.samples.findIndex((item) => item.sampleId === selectedId) + 1} / {sequence.samples.length}</span></div>
            <div className={styles.samples}>{sequence.samples.slice(0, 1000).map((item) => <button type="button" key={item.sampleId} data-selected={item.sampleId === selectedId} onClick={() => setSelectedId(item.sampleId)}><span><b>{item.sampleId}</b><small>{new Date(item.observedAt).toLocaleString()} · {item.contacts.length} contacts</small></span><em>{item.label ?? "unlabeled"}</em></button>)}</div>
          </>}
        </section>

        <section className={styles.panel}>
          <header><div><span>Progressive disclosure</span><h2>Contact, force &amp; joints</h2></div><Hand /></header>
          {!sample || !summary ? <div className={styles.empty}><Activity /><strong>Select a mechanical sample</strong><p>Its tactile field, force vector, joint state, and labeling controls will appear here.</p></div> : <div className={styles.detail}>
            <div className={styles.contactField} aria-label="Normalized tactile contact field">{sample.contacts.map((contact, index) => <span key={`${contact.x}-${contact.y}-${index}`} style={{ left: `${contact.x * 100}%`, top: `${contact.y * 100}%`, width: `${Math.min(44, 8 + Math.sqrt(contact.pressureN) * 5)}px`, height: `${Math.min(44, 8 + Math.sqrt(contact.pressureN) * 5)}px`, opacity: Math.min(1, .3 + Math.log10(contact.pressureN + 1) / 2) }} title={`${contact.pressureN} N`} />)}{sample.contacts.length === 0 ? <b>Measured capture contains no contact points</b> : null}</div>
            {sequence ? <MechanicalTrend sequence={sequence} selectedId={selectedId} /> : null}
            <dl className={styles.readings}><div><dt>Force magnitude</dt><dd>{summary.forceMagnitudeN.toFixed(3)} N</dd></div><div><dt>Total pressure</dt><dd>{summary.totalPressureN.toFixed(3)} N</dd></div><div><dt>Peak contact</dt><dd>{summary.peakPressureN.toFixed(3)} N</dd></div><div><dt>Contact count</dt><dd>{summary.contactCount}</dd></div><div><dt>Force vector</dt><dd>{sample.forceN.x}, {sample.forceN.y}, {sample.forceN.z} N</dd></div><div><dt>Observed</dt><dd>{new Date(sample.observedAt).toLocaleString()}</dd></div></dl>
            <div className={`${styles.joints} ${armStyles.jointBars}`}><strong>Joint positions</strong>{Object.entries(sample.jointsDeg).length ? Object.entries(sample.jointsDeg).map(([joint, angle]) => <div key={joint}><span>{joint}</span><i aria-hidden="true"><em style={{ width: `${Math.min(100, Math.abs(angle) / 1.8)}%` }} /></i><b>{angle.toFixed(2)}°</b></div>) : <p>No joint positions were supplied.</p>}</div>
            <div className={styles.labelEditor}><input value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} placeholder={sample.label ?? "Enter observed interaction label"} /><button type="button" onClick={applyLabel}>Stage label</button></div>
            <div className={styles.gate}><strong>Robot training is locked</strong><p>{readiness.reasons.join(" ")}</p><button type="button" disabled>Submit training job</button></div>
          </div>}
        </section>
      </div>
    </main>
  )
}
