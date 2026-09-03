"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Download, FileJson, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react"
import { LOCAL_REVIEW_MAX_BYTES, parseLocalReviewJson, runLocalReview, type LocalReviewKind, type LocalReviewResult, type LocalReviewState } from "@/lib/fusarium/tools-hub/local-review-tools"

const COPY: Record<LocalReviewKind, { eyebrow: string; title: string; description: string; schema: string; action: string; boundary: string }> = {
  coverage: { eyebrow: "Environmental planning · supplied coverage", title: "Environmental Coverage Planner", description: "Compare explicitly required environmental domains with supplied observations for named areas.", schema: "fusarium-environmental-coverage-source/v1", action: "Review coverage", boundary: "No access, priority, targeting, or effect score is inferred." },
  "field-diff": { eyebrow: "Environmental analysis · mode-safe comparison", title: "Field Change Detector", description: "Compare supplied observed, forecast, or replay fields while retaining units and valid-time boundaries.", schema: "fusarium-field-change-source/v1", action: "Compare fields", boundary: "A forecast or replay delta is never presented as an observed change." },
  "sensor-health": { eyebrow: "Defensive readiness · passive evidence", title: "Sensor Health Triage", description: "Review supplied freshness, calibration, clock drift, power, and source-authorization metadata.", schema: "fusarium-sensor-health-source/v1", action: "Run triage", boundary: "Advisory only; no discovery, connection, configuration change, or device command." },
  "network-posture": { eyebrow: "Cyber defense · approved inventory only", title: "Network Posture Review", description: "Review declared service exposure and certificate metadata for an explicitly approved asset inventory.", schema: "fusarium-network-posture-source/v1", action: "Review posture", boundary: "No network scan, credential, exploitation, probe, or remediation." },
  "incident-timeline": { eyebrow: "Defensive review · supplied events", title: "Incident Timeline", description: "Deterministically order supplied environmental, device, operator, and system events for human review.", schema: "fusarium-incident-timeline-source/v1", action: "Build timeline", boundary: "Ordering does not infer missing events, intent, attribution, or cause." },
}

export function LocalReviewWorkspace({ kind }: { kind: LocalReviewKind }) {
  const copy = COPY[kind]
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const [result, setResult] = useState<LocalReviewResult | null>(null)
  const [running, setRunning] = useState(false)
  const bytes = useMemo(() => new Blob([text]).size, [text])

  const loadFile = async (file?: File) => {
    if (!file) return
    if (file.size > LOCAL_REVIEW_MAX_BYTES) { setInputError(`File exceeds ${LOCAL_REVIEW_MAX_BYTES.toLocaleString()} bytes.`); return }
    const value = await file.text()
    setText(value); setFileName(file.name); setInputError(null); setResult(null)
  }

  const run = async () => {
    setRunning(true); setInputError(null); setResult(null)
    try { setResult(await runLocalReview(kind, parseLocalReviewJson(text))) }
    catch { setInputError("The supplied content is not valid JSON or contains duplicate object members.") }
    finally { setRunning(false) }
  }

  const exportResult = () => {
    if (!result?.output) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.output, null, 2)], { type: "application/json" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${kind}-local-review.json`; anchor.click(); URL.revokeObjectURL(url)
  }

  return <main className="min-h-full w-full bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.11),transparent_34%),linear-gradient(145deg,#020504,#090d0b_58%,#020403)] p-3 text-zinc-100 md:p-5" data-local-review-tool={kind}>
    <header className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-4xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300">{copy.eyebrow}</p><h1 className="mt-1 text-2xl font-black md:text-3xl">{copy.title}</h1><p className="mt-2 text-sm leading-6 text-zinc-400">{copy.description}</p></div><nav className="flex flex-wrap gap-2"><Link href="/fusarium/tools" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-200">Tools Hub</Link><Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200">Back to Fusarium</Link></nav></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3"><Boundary label="Execution" value="Browser-local" /><Boundary label="Input" value="Operator-supplied JSON" /><Boundary label="Persistence" value="None" /></div>
      <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">{copy.boundary} Valid structure does not prove that supplied records are authentic or current.</p>
    </header>

    <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)]">
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Bounded local evidence</h2><p className="mt-1 text-xs text-zinc-500">Expected schema <code className="text-emerald-300">{copy.schema}</code> · JSON only · 512 KiB maximum</p></div><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold"><FileJson className="h-4 w-4" />Open JSON<input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void loadFile(event.target.files?.[0])} /></label></div>
        {fileName ? <p className="mt-2 text-xs text-emerald-300">Local file: {fileName}</p> : null}
        <textarea aria-label={`${copy.title} JSON`} value={text} onChange={(event) => { const next = event.target.value; if (new Blob([next]).size <= LOCAL_REVIEW_MAX_BYTES) { setText(next); setInputError(null); setResult(null) } }} placeholder="Paste or open authoritative JSON. No sample evidence is preloaded." spellCheck={false} className="mt-3 min-h-[30rem] w-full resize-y rounded-xl border border-white/10 bg-black/65 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-400/40" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-zinc-600"><span>{bytes.toLocaleString()} / {LOCAL_REVIEW_MAX_BYTES.toLocaleString()} bytes</span><span>No content leaves this browser</span></div>
        {inputError ? <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{inputError}</p> : null}
        <button type="button" disabled={running || !text.trim()} onClick={() => void run()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40">{running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{copy.action}</button>
      </div>

      <div className="space-y-3">
        <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl" aria-live="polite"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Local review result</h2><p className="mt-1 text-xs text-zinc-500">Empty, partial, schema-valid, and error remain distinct.</p></div><State state={result?.state ?? null} /></div><p className="mt-4 text-sm leading-6 text-zinc-300">{result?.summary ?? "No evidence has been supplied or reviewed in this browser session."}</p><dl className="mt-4 grid gap-2 sm:grid-cols-2"><Metric label="Records" value={result ? String(result.recordCount) : "not observed"} /><Metric label="Canonical hash" value={result?.canonicalHash ? `${result.canonicalHash.slice(0, 16)}…` : "not generated"} /></dl>{result?.output ? <button type="button" onClick={exportResult} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200"><Download className="h-4 w-4" />Export local review</button> : null}</section>
        <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><h2 className="font-bold">Findings</h2>{!result ? <p className="mt-3 text-sm text-zinc-500">No review has run.</p> : result.findings.length === 0 ? <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">No declared issue was found within this bounded input.</p> : <div className="mt-3 space-y-2">{result.findings.map((item, index) => <article key={`${item.path}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><div className="flex items-start justify-between gap-2"><code className="break-all text-[11px] text-emerald-200">{item.path}</code><span className="text-[9px] font-black uppercase tracking-wider text-amber-200">{item.severity}</span></div><p className="mt-2 text-xs leading-5 text-zinc-400">{item.message}</p></article>)}</div>}</section>
        {result?.output ? <details className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><summary className="cursor-pointer font-bold text-zinc-200">Generated output preview</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/60 p-3 text-[10px] leading-4 text-zinc-400">{JSON.stringify(result.output, null, 2)}</pre></details> : null}
      </div>
    </section>
  </main>
}

function State({ state }: { state: LocalReviewState | null }) { const label = state === "valid" ? "schema-valid" : state ?? "unavailable"; const style = state === "valid" ? "border-emerald-400/30 text-emerald-300" : state === "partial" || state === "empty" ? "border-amber-400/30 text-amber-200" : state === "error" ? "border-rose-400/30 text-rose-300" : "border-zinc-600 text-zinc-400"; return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[.14em] ${style}`}>{label}</span> }
function Boundary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[.035] px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-[.14em] text-zinc-500">{label}</span><strong className="mt-1 block text-sm text-zinc-200">{value}</strong></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-white/10 bg-white/[.035] p-3"><dt className="text-[9px] font-bold uppercase tracking-[.14em] text-zinc-500">{label}</dt><dd className="mt-1 break-all font-mono text-xs text-zinc-200">{value}</dd></div> }
