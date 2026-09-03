"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, Camera, ChevronLeft, ChevronRight, Database, Eye, FileJson, Layers3, Radar, ScanEye, ShieldCheck, Upload, Wifi } from "lucide-react"
import { BLUESIGHT_EVIDENCE_MAX_BYTES, BLUESIGHT_MODALITIES, type BlueSightEvidenceValidation, type BlueSightModality } from "@/lib/fusarium/bluesight-evidence/contracts"
import { describeSensingScope, type SensingScope } from "@/lib/fusarium/sensing-scope/contracts"
import { SensingScopeSelector, useSensingDeviceInventory, useSensingScope } from "./sensing-scope-selector"
import { MultimodalSourceCatalog } from "./multimodal-source-catalog"

const ICON = { camera: Camera, radar: Radar, lidar: ScanEye, wifi: Wifi } as const
const EMPTY: BlueSightEvidenceValidation = { ok: false, state: "unbound", dataset: null, issues: [], rejectedRecordCount: 0, duplicateRecordCount: 0, fusionFrames: [], message: "No replay evidence has been imported." }

function recordMatchesScope(record: NonNullable<BlueSightEvidenceValidation["dataset"]>["records"][number], scope: SensingScope) {
  if (scope.kind === "devices") return scope.deviceIds.includes(record.scope.deviceId)
  if (scope.kind === "mission") return record.scope.missionId === scope.contextId
  if (scope.kind === "location") return record.scope.locationId === scope.contextId
  if (scope.kind === "environment") return record.scope.environmentId === scope.contextId
  return true
}

function StateBadge({ state }: { state: BlueSightEvidenceValidation["state"] | "loading" }) {
  const color = state === "available" ? "border-emerald-400/35 text-emerald-200" : state === "error" ? "border-rose-400/35 text-rose-200" : "border-amber-400/35 text-amber-200"
  return <b className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[.14em] ${color}`}>{state}</b>
}

export function FusariumBlueSightDashboard() {
  const { inventory, refresh } = useSensingDeviceInventory()
  const { scope } = useSensingScope()
  const input = useRef<HTMLInputElement>(null)
  const [validation, setValidation] = useState<BlueSightEvidenceValidation>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [activeModality, setActiveModality] = useState<BlueSightModality | "all">("all")
  const [cursor, setCursor] = useState(0)
  const records = useMemo(() => (validation.dataset?.records ?? []).filter((record) => recordMatchesScope(record, scope)).filter((record) => activeModality === "all" || record.modality === activeModality), [validation.dataset, scope, activeModality])
  const selected = records[Math.min(cursor, Math.max(0, records.length - 1))] ?? null
  const selectedFusion = selected ? validation.fusionFrames.find((frame) => frame.observedAt === selected.observedAt && frame.scope.deviceId === selected.scope.deviceId && frame.collectionId === selected.provenance.collectionId) : null

  async function importFile(file: File) {
    setCursor(0)
    if (file.size > BLUESIGHT_EVIDENCE_MAX_BYTES) {
      setValidation({ ...EMPTY, state: "error", issues: ["Import exceeds the 2 MiB limit."], message: "Import rejected." })
      return
    }
    setLoading(true)
    try {
      const response = await fetch("/api/fusarium/bluesight/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() })
      setValidation(await response.json() as BlueSightEvidenceValidation)
    } catch {
      setValidation({ ...EMPTY, state: "error", issues: ["The local validation route could not be reached."], message: "Import was not admitted." })
    } finally {
      setLoading(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <main className="fixed inset-0 z-[70] flex min-h-0 flex-col overflow-hidden bg-[#020509] text-slate-100" data-fusarium-app="bluesight">
      <header className="relative z-40 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cyan-400/20 bg-black/75 px-4 py-2 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3"><Link href="/fusarium" className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10"><ArrowLeft className="h-3.5 w-3.5" /> Fusarium</Link><Eye className="h-5 w-5 text-cyan-300" /><div><h1 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-100">BlueSight</h1><p className="text-[10px] text-slate-400">Scoped multi-modal evidence replay</p></div></div>
        <div className="flex items-center gap-2"><StateBadge state={loading ? "loading" : validation.state} /><input ref={input} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} /><button type="button" onClick={() => input.current?.click()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-50"><Upload className="h-3.5 w-3.5" /> Import replay</button></div>
      </header>
      <SensingScopeSelector inventory={inventory} onRefreshInventory={refresh} compact defaultOpen={false} />
      <section className="min-h-0 flex-1 overflow-auto p-3" aria-label="BlueSight evidence workbench" data-sensing-scope={scope.kind}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(21rem,.7fr)]">
          <div className="space-y-3">
            <section className="rounded-xl border border-cyan-400/15 bg-zinc-950/75 p-3 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-200"><Database className="h-4 w-4" />{validation.dataset?.title ?? "No replay loaded"}</span><p className="mt-1 text-[11px] text-slate-400">{describeSensingScope(scope)} · records retain declared device and context scope</p></div><div className="flex flex-wrap gap-1.5">{(["all", ...BLUESIGHT_MODALITIES] as const).map((modality) => { const ModalityIcon = modality === "all" ? Layers3 : ICON[modality]; return <button key={modality} type="button" onClick={() => { setActiveModality(modality); setCursor(0) }} data-active={activeModality === modality} className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] uppercase text-slate-400 data-[active=true]:border-cyan-300/50 data-[active=true]:bg-cyan-300/10 data-[active=true]:text-cyan-100"><ModalityIcon className="h-3 w-3" />{modality}</button> })}</div></div>
            </section>
            <section className="min-h-[25rem] overflow-hidden rounded-xl border border-cyan-400/15 bg-[#03070b] shadow-2xl">
              <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[.025] px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-300">Replay timeline · {records.length} scoped records</span><div className="flex items-center gap-1"><button type="button" aria-label="Previous evidence record" disabled={!selected || cursor === 0} onClick={() => setCursor((value) => Math.max(0, value - 1))} className="rounded border border-white/10 p-1 text-slate-300 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-16 text-center font-mono text-[10px] text-slate-500">{selected ? `${cursor + 1} / ${records.length}` : "0 / 0"}</span><button type="button" aria-label="Next evidence record" disabled={!selected || cursor >= records.length - 1} onClick={() => setCursor((value) => Math.min(records.length - 1, value + 1))} className="rounded border border-white/10 p-1 text-slate-300 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></header>
              {selected ? <div className="grid min-h-[22rem] gap-3 p-4 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
                <div className="flex flex-col justify-between rounded-lg border border-cyan-400/15 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.10),transparent_65%)] p-4"><div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold uppercase text-cyan-100">{(() => { const I = ICON[selected.modality]; return <I className="h-4 w-4" /> })()}{selected.modality}</span><b className="text-[9px] uppercase text-amber-200">Replay evidence</b></div><p className="mt-8 break-all font-mono text-lg text-white">{selected.recordId}</p><p className="mt-2 font-mono text-xs text-cyan-200">{selected.observedAt}</p></div><div className="space-y-1 text-[10px] text-slate-400"><p>Device <b className="text-slate-200">{selected.scope.deviceId}</b></p><p>Collection <b className="text-slate-200">{selected.provenance.collectionId}</b></p><p>Source revision <b className="text-slate-200">{selected.provenance.sourceRevision}</b></p></div></div>
                <div className="space-y-3"><div className="grid grid-cols-2 gap-2">{selected.measurements.map((measurement) => <div key={measurement.name} className="rounded-lg border border-white/10 bg-black/35 p-3"><span className="block text-[9px] uppercase tracking-wider text-slate-500">{measurement.name}</span><b className="mt-1 block break-words font-mono text-sm text-emerald-200">{String(measurement.value)} <small className="text-slate-500">{measurement.unit}</small></b></div>)}</div><div className="rounded-lg border border-white/10 bg-black/25 p-3 text-[10px] leading-relaxed text-slate-400"><p><b className="text-slate-200">Provenance:</b> {selected.provenance.sourceRef} / {selected.provenance.sourceRecordId}</p><p><b className="text-slate-200">Received:</b> {selected.receivedAt}</p><p><b className="text-slate-200">Confidence:</b> {selected.confidence.value ?? "not reported"} · {selected.confidence.basis}</p><p><b className="text-slate-200">Uncertainty:</b> {selected.uncertainty.value ?? "not reported"}{selected.uncertainty.unit ? ` ${selected.uncertainty.unit}` : ""} · {selected.uncertainty.basis}</p></div></div>
              </div> : <div className="flex min-h-[22rem] flex-col items-center justify-center gap-3 p-8 text-center"><FileJson className="h-12 w-12 text-cyan-300/35" /><strong className="text-sm text-slate-200">No evidence for this filter</strong><p className="max-w-xl text-xs leading-relaxed text-slate-400">Import a strict BlueSight replay JSON file, or change the scope or modality. No device-bound live observation is assumed; no Psathyrella default is inserted.</p></div>}
            </section>
          </div>
          <aside className="space-y-3">
            <section className="rounded-xl border border-violet-400/20 bg-violet-400/[.04] p-4"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-200"><Layers3 className="h-4 w-4" />Cross-modality correlation</span>{selectedFusion ? <div className="mt-3"><div className="flex flex-wrap gap-1">{selectedFusion.modalities.map((modality) => <b key={modality} className="rounded border border-violet-300/25 px-2 py-0.5 text-[9px] uppercase text-violet-100">{modality}</b>)}</div><p className="mt-3 text-xs leading-relaxed text-slate-300">{selectedFusion.statement}</p><p className="mt-2 break-all font-mono text-[10px] text-slate-500">{selectedFusion.recordIds.join(" · ")}</p></div> : <p className="mt-3 text-xs leading-relaxed text-slate-400">Correlation requires at least two modalities with exact matching device/context scope, observed timestamp, collection ID, and source revision.</p>}</section>
            <section className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.035] p-4"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200"><ShieldCheck className="h-4 w-4" />Evidence boundary</span><ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-400"><li>Local validation only; the import is not persisted or transmitted.</li><li>REPLAY never becomes LIVE.</li><li>Correlation does not infer identity, object class, target, detection, or track.</li><li>Every record retains source ID, revision, timestamps, units, confidence, and uncertainty.</li></ul></section>
            {validation.issues.length > 0 ? <section className="rounded-xl border border-rose-400/20 bg-rose-400/[.04] p-4"><span className="flex items-center gap-2 text-xs font-bold uppercase text-rose-200"><AlertTriangle className="h-4 w-4" />Import rejected</span><ul className="mt-3 max-h-64 space-y-1 overflow-auto text-[10px] text-rose-100/80">{validation.issues.map((issue, index) => <li key={`${index}:${issue}`}>{issue}</li>)}</ul></section> : null}
          </aside>
        </div>
        <MultimodalSourceCatalog application="BlueSight" />
      </section>
    </main>
  )
}
