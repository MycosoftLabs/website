"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import { ArrowLeft, Download, FlaskConical, Play, ShieldCheck, Upload } from "lucide-react"
import { BIOLOGY_MODELS, BIOLOGY_SCALES, DEFAULT_BIOLOGY_SCENARIO, DEFAULT_MODEL_PARAMETERS, simulateBiologyScenario, type BiologyModelId, type BiologyScenario, type BiologySimulationResult } from "@/lib/fusarium/twins/biology-simulator/biology-model.mjs"
import styles from "./biology-simulation-workbench.module.css"

const PARAMS: Record<BiologyModelId, Array<{ key: string; label: string; unit: string; min: number; max: number; step: number }>> = {
  logistic: [
    { key: "initialPopulation", label: "Initial population", unit: "individuals", min: .000001, max: 1e12, step: 1 },
    { key: "carryingCapacity", label: "Carrying capacity", unit: "individuals", min: .000001, max: 1e12, step: 1 },
    { key: "growthRatePerHour", label: "Per-capita growth rate", unit: "h⁻¹", min: -2, max: 2, step: .01 },
  ],
  exponential: [
    { key: "initialPopulation", label: "Initial population", unit: "individuals", min: .000001, max: 1e12, step: 1 },
    { key: "ratePerHour", label: "Per-capita rate", unit: "h⁻¹", min: -2, max: 2, step: .01 },
  ],
  competition: [
    { key: "populationA", label: "Population A", unit: "individuals", min: .000001, max: 1e12, step: 1 },
    { key: "populationB", label: "Population B", unit: "individuals", min: .000001, max: 1e12, step: 1 },
    { key: "carryingCapacityA", label: "Capacity A", unit: "individuals", min: .000001, max: 1e12, step: 1 },
    { key: "carryingCapacityB", label: "Capacity B", unit: "individuals", min: .000001, max: 1e12, step: 1 },
    { key: "growthRateAPerHour", label: "Growth A", unit: "h⁻¹", min: .000001, max: 2, step: .01 },
    { key: "growthRateBPerHour", label: "Growth B", unit: "h⁻¹", min: .000001, max: 2, step: .01 },
    { key: "effectBOnA", label: "B effect on A", unit: "ratio", min: 0, max: 10, step: .05 },
    { key: "effectAOnB", label: "A effect on B", unit: "ratio", min: 0, max: 10, step: .05 },
  ],
  sir: [
    { key: "susceptible", label: "Susceptible", unit: "individuals", min: 0, max: 1e12, step: 1 },
    { key: "infectious", label: "Infectious", unit: "individuals", min: 0, max: 1e12, step: 1 },
    { key: "recovered", label: "Recovered", unit: "individuals", min: 0, max: 1e12, step: 1 },
    { key: "transmissionPerHour", label: "Transmission coefficient", unit: "person⁻¹ h⁻¹", min: 0, max: 2, step: .00001 },
    { key: "recoveryPerHour", label: "Recovery rate", unit: "h⁻¹", min: 0, max: 2, step: .01 },
  ],
}

const format = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: Math.abs(value) < 100 ? 3 : 0 }).format(value)

function SeriesChart({ result }: { result: BiologySimulationResult }) {
  const width = 900, height = 330, pad = 42
  const maxHour = Math.max(1, result.scenario.durationHours)
  const values = result.series.flatMap((series) => series.points.map((point) => point.value))
  const min = Math.min(0, ...values), max = Math.max(1, ...values), span = max - min || 1
  const path = (points: Array<{hour:number;value:number}>) => points.map((point, index) => `${index ? "L" : "M"}${(pad + point.hour / maxHour * (width - pad * 2)).toFixed(2)},${(height - pad - (point.value - min) / span * (height - pad * 2)).toFixed(2)}`).join(" ")
  return <div className={styles.chartFrame}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Simulated series over time">
      {[0,.25,.5,.75,1].map((f) => <line key={f} x1={pad} x2={width-pad} y1={height-pad-f*(height-pad*2)} y2={height-pad-f*(height-pad*2)} className={styles.gridLine}/>) }
      {result.series.map((series) => <path key={series.id} d={path(series.points)} fill="none" stroke={series.color} strokeWidth="3" vectorEffect="non-scaling-stroke"/>) }
      <text x={pad} y={height-12} className={styles.axisLabel}>0 h</text><text x={width-pad} y={height-12} textAnchor="end" className={styles.axisLabel}>{maxHour} h</text>
      <text x={pad+4} y={pad-10} className={styles.axisLabel}>{format(max)}</text><text x={pad+4} y={height-pad-7} className={styles.axisLabel}>{format(min)}</text>
    </svg>
    <div className={styles.legend}>{result.series.map((series) => <span key={series.id}><i style={{background:series.color}}/>{series.label} · {series.unit}</span>)}</div>
  </div>
}

function PhasePlot({ result }: { result: BiologySimulationResult }) {
  if (!result.phase?.length) return null
  const width=420,height=280,pad=34,maxX=Math.max(1,...result.phase.map(p=>p.x)),maxY=Math.max(1,...result.phase.map(p=>p.y))
  const points=result.phase.map(p=>`${pad+p.x/maxX*(width-pad*2)},${height-pad-p.y/maxY*(height-pad*2)}`).join(" ")
  return <section className={styles.phase}><h3>Phase plane</h3><p>Population B versus Population A across model time.</p><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Competition phase plot"><line x1={pad} x2={pad} y1={pad} y2={height-pad} className={styles.axis}/><line x1={pad} x2={width-pad} y1={height-pad} y2={height-pad} className={styles.axis}/><polyline points={points} className={styles.phaseSeries}/><text x={width-pad} y={height-8} textAnchor="end" className={styles.axisLabel}>Population A</text><text x={pad+4} y={pad-8} className={styles.axisLabel}>Population B</text></svg></section>
}

export function BiologySimulationWorkbench() {
  const [scenario,setScenario]=useState<BiologyScenario>({...DEFAULT_BIOLOGY_SCENARIO,parameters:{...DEFAULT_BIOLOGY_SCENARIO.parameters}})
  const [result,setResult]=useState(()=>simulateBiologyScenario(DEFAULT_BIOLOGY_SCENARIO))
  const [notice,setNotice]=useState("")
  const importRef=useRef<HTMLInputElement>(null)
  const modelInfo=useMemo(()=>BIOLOGY_MODELS.find(item=>item.id===scenario.model),[scenario.model])
  const updateParameter=(key:string,value:number)=>setScenario(current=>({...current,parameters:{...current.parameters,[key]:value}}))
  const chooseModel=(model:BiologyModelId)=>{ const next={...scenario,model,parameters:{...DEFAULT_MODEL_PARAMETERS[model]}}; setScenario(next); setResult(simulateBiologyScenario(next)); setNotice("") }
  const run=()=>{setResult(simulateBiologyScenario(scenario));setNotice("")}
  const download=(payload:unknown,name:string)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
  const importScenario=async(file?:File)=>{if(!file)return;try{const parsed=JSON.parse(await file.text());const candidate=parsed.scenario??parsed;const checked=simulateBiologyScenario(candidate);if(!checked.ok){setResult(checked);setNotice("Import rejected: scenario failed validation.");return}setScenario(checked.scenario);setResult(checked);setNotice("Validated scenario imported locally. Nothing was uploaded or persisted.")}catch{setNotice("Import rejected: choose a valid JSON scenario file.")}}
  return <main className={styles.page} data-fusarium-biology-workbench>
    <header className={styles.header}><div><div className={styles.eyebrow}><ShieldCheck/> Fusarium deterministic model lab</div><h1>Biology Simulator</h1><p>Compare bounded mathematical scenarios without presenting them as observations, forecasts, MINDEX records, or live biology. Results are not live telemetry.</p></div><Link href="/fusarium" className={styles.backLink}><ArrowLeft/> Back to Fusarium</Link></header>
    <section className={styles.statusStrip} aria-label="Simulation provenance"><span><strong>Engine</strong> Local deterministic</span><span><strong>Models</strong> Four validated</span><span><strong>MINDEX / Unreal</strong> Unbound</span><span><strong>Persistence</strong> Browser only</span></section>
    <nav className={styles.modelTabs} aria-label="Biology models">{BIOLOGY_MODELS.map(model=><button key={model.id} type="button" data-active={scenario.model===model.id} onClick={()=>chooseModel(model.id as BiologyModelId)}><strong>{model.label}</strong><span>{model.description}</span></button>)}</nav>
    <div className={styles.workspace}>
      <section className={styles.controls}><div className={styles.sectionHeading}><FlaskConical/><div><h2>Scenario</h2><p>{modelInfo?.description}</p></div></div>
        <label className={styles.field}><span>Biological scale</span><select value={scenario.scale} onChange={e=>setScenario(current=>({...current,scale:e.target.value as BiologyScenario["scale"]}))}>{BIOLOGY_SCALES.map(scale=><option key={scale.id} value={scale.id}>{scale.label}</option>)}</select></label>
        <div className={styles.parameterGrid}>{PARAMS[scenario.model].map(param=><label className={styles.field} key={param.key}><span>{param.label}<em>{param.unit}</em></span><input type="number" min={param.min} max={param.max} step={param.step} value={scenario.parameters[param.key]} onChange={e=>updateParameter(param.key,Number(e.target.value))}/></label>)}</div>
        <div className={styles.timeGrid}><label className={styles.field}><span>Duration<em>hours</em></span><input type="number" min="1" max="720" step="1" value={scenario.durationHours} onChange={e=>setScenario(c=>({...c,durationHours:Number(e.target.value)}))}/></label><label className={styles.field}><span>Step<em>minutes</em></span><input type="number" min="1" max="60" step="1" value={scenario.stepMinutes} onChange={e=>setScenario(c=>({...c,stepMinutes:Number(e.target.value)}))}/></label></div>
        <button type="button" className={styles.runButton} onClick={run}><Play/> Run deterministic scenario</button>
        <div className={styles.fileActions}><button type="button" onClick={()=>importRef.current?.click()}><Upload/> Import scenario</button><button type="button" onClick={()=>download(scenario,"fusarium-biology-scenario.json")}><Download/> Export scenario</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e=>void importScenario(e.target.files?.[0])}/></div>{notice&&<p className={styles.notice}>{notice}</p>}
      </section>
      <section className={styles.results}><div className={styles.resultsHeader}><div><h2>Model output</h2><p>{result.ok ? `${result.provenance.integrator} · ${result.summary.pointCount} time points` : "No output generated"}</p></div><button type="button" className={styles.exportButton} disabled={!result.ok} onClick={()=>result.ok&&download(result,"fusarium-biology-result.json")}><Download/> Export result</button></div>
        {!result.ok?<div className={styles.errorPanel} role="alert"><strong>Scenario rejected</strong><ul>{result.errors.map(error=><li key={error}>{error}</li>)}</ul></div>:<><div className={styles.metrics}><div><span>Series</span><strong>{result.summary.seriesCount}</strong></div><div><span>Samples / series</span><strong>{result.summary.pointCount}</strong></div><div><span>Minimum</span><strong>{format(result.summary.minimum)}</strong></div><div><span>Maximum</span><strong>{format(result.summary.maximum)}</strong></div></div><SeriesChart result={result}/><div className={styles.lowerGrid}><PhasePlot result={result}/><section className={styles.finalValues}><h3>Final values</h3>{result.series.map(series=><div key={series.id}><span><i style={{background:series.color}}/>{series.label}</span><strong>{format(result.summary.finalValues[series.id])} <small>{series.unit}</small></strong></div>)}</section><section className={styles.assumptions}><h3>Scientific boundary</h3><ul><li>Parameters are operator supplied and not calibrated.</li><li>Populations are continuous mathematical quantities.</li><li>The system is closed; migration and stochastic effects are omitted.</li><li>{result.provenance.integrator === "fixed-step-rk4" ? "Coupled equations use fixed-step fourth-order Runge-Kutta integration." : "The selected equation uses a closed-form solution."}</li></ul></section></div><p className={styles.provenance}>{result.provenance.note}</p></>}
      </section>
    </div>
  </main>
}
