"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeftRight, Boxes, Download, FileClock, FileJson, GitCommitHorizontal, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react"
import { MAX_OPERATION_BYTES, runEvidenceOperation, type OperationKind, type OperationResult, type OperationState } from "@/lib/fusarium/tools-hub/evidence-operations"

const COPY = {
  custody: {
    title: "Chain of Custody Ledger Inspector",
    eyebrow: "Evidence operations · Append-chain inspection",
    description: "Verify supplied custody order, revision sequence, authoritative times, provenance, classification, and canonical hash links without asserting that an event occurred.",
    schema: "fusarium-chain-of-custody/v1",
    action: "Inspect custody chain",
    Icon: GitCommitHorizontal,
  },
  timeline: {
    title: "Evidence Timeline Builder",
    eyebrow: "Evidence operations · Deterministic chronology",
    description: "Order supplied evidence by authoritative observation and record times, retain every source reference, and generate a canonical local timeline without filling gaps.",
    schema: "fusarium-evidence-timeline-source/v1",
    action: "Build timeline",
    Icon: FileClock,
  },
  packet: {
    title: "Field Packet Builder",
    eyebrow: "Evidence operations · Bounded assembly",
    description: "Assemble supplied UNCLASSIFIED field records into a deterministic manifest with a bounded mission area, time window, provenance, and per-record hashes.",
    schema: "fusarium-field-packet-source/v1",
    action: "Build field packet",
    Icon: Boxes,
  },
  diff: {
    title: "Evidence Diff",
    eyebrow: "Evidence operations · Revision comparison",
    description: "Compare two supplied revisions by stable record identifier and canonical content while preserving both source revisions and their provenance.",
    schema: "fusarium-evidence-diff-source/v1",
    action: "Compare revisions",
    Icon: ArrowLeftRight,
  },
} as const

function exportLocal(kind: OperationKind, result: OperationResult) {
  if (!result.output) return
  const url = URL.createObjectURL(new Blob([JSON.stringify(result.output, null, 2)], { type: "application/json" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `fusarium-${kind}-${result.canonicalHash?.slice(0, 12) ?? "empty"}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function EvidenceOperationsWorkspace({ kind }: { kind: OperationKind }) {
  const copy = COPY[kind]
  const Icon = copy.Icon
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const [result, setResult] = useState<OperationResult | null>(null)
  const [running, setRunning] = useState(false)
  const bytes = useMemo(() => new Blob([text]).size, [text])

  async function loadFile(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".json")) { setInputError("Only JSON files are accepted."); return }
    if (file.size > MAX_OPERATION_BYTES) { setInputError("File exceeds the 512 KiB local-operation limit."); return }
    setText(await file.text())
    setFileName(file.name)
    setInputError(null)
    setResult(null)
  }

  async function run() {
    if (!text.trim()) { setInputError("No local evidence was supplied. This is unavailable, not an empty result."); setResult(null); return }
    let value: unknown
    try { value = JSON.parse(text) as unknown }
    catch { setInputError("Input is not valid JSON."); setResult(null); return }
    setRunning(true)
    setInputError(null)
    try { setResult(await runEvidenceOperation(kind, value)) }
    catch { setResult({ kind, state: "error", summary: "The local transformation failed before an output could be generated.", recordCount: null, canonicalHash: null, issues: [{ path: "$", state: "error", message: "Local operation failed." }], output: null }) }
    finally { setRunning(false) }
  }

  return <main className="min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),linear-gradient(145deg,#020504,#090d0b_55%,#030504)] p-3 text-zinc-100 md:p-5" data-evidence-operation={kind}>
    <header className="rounded-2xl border border-white/10 bg-black/50 p-4 shadow-2xl backdrop-blur-xl md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-300"><Icon className="h-6 w-6" aria-hidden="true" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">{copy.eyebrow}</p><h1 className="mt-1 text-2xl font-black md:text-3xl">{copy.title}</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">{copy.description}</p></div></div>
        <nav className="flex flex-wrap gap-2"><Link href="/fusarium/tools" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-200">Tools Hub</Link><Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200">Back to Fusarium</Link></nav>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3"><Boundary label="Processing" value="Browser-local only" /><Boundary label="Classification" value="UNCLASSIFIED only" /><Boundary label="Persistence" value="None" /></div>
      <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">No upload, persistence, external call, credential, backend write, inferred evidence, or custody assertion. A valid structure does not prove that the supplied records are authentic.</p>
    </header>

    <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)]">
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Bounded local evidence</h2><p className="mt-1 text-xs text-zinc-500">Expected schema <code className="text-emerald-300">{copy.schema}</code> · JSON only · 512 KiB maximum</p></div><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold"><FileJson className="h-4 w-4" />Open JSON<input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void loadFile(event.target.files?.[0])} /></label></div>
        {fileName ? <p className="mt-2 text-xs text-emerald-300">Local file: {fileName}</p> : null}
        <textarea aria-label={`${copy.title} JSON`} value={text} onChange={(event) => { const next = event.target.value; if (new Blob([next]).size <= MAX_OPERATION_BYTES) { setText(next); setInputError(null); setResult(null) } }} placeholder="Paste or open authoritative JSON. No sample evidence is preloaded." spellCheck={false} className="mt-3 min-h-[30rem] w-full resize-y rounded-xl border border-white/10 bg-black/65 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-400/40" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-zinc-600"><span>{bytes.toLocaleString()} / {MAX_OPERATION_BYTES.toLocaleString()} bytes</span><span>No content leaves this browser</span></div>
        {inputError ? <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{inputError}</p> : null}
        <button type="button" disabled={running || !text.trim()} onClick={() => void run()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40">{running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{copy.action}</button>
      </div>

      <div className="space-y-3">
        <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Operation result</h2><p className="mt-1 text-xs text-zinc-500">Unavailable, empty, partial, verified, and error are distinct.</p></div><State state={result?.state ?? "unavailable"} /></div>
          <p className="mt-4 text-sm leading-6 text-zinc-300">{result?.summary ?? "No evidence has been supplied or processed in this browser session."}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2"><Metric label="Records" value={result?.recordCount == null ? "not observed" : String(result.recordCount)} /><Metric label="Canonical hash" value={result?.canonicalHash ? `${result.canonicalHash.slice(0, 16)}…` : "not generated"} /></dl>
          {result?.output ? <button type="button" onClick={() => exportLocal(kind, result)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200"><Download className="h-4 w-4" />Export generated JSON locally</button> : null}
        </section>
        <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><h2 className="font-bold">Validation findings</h2>{!result ? <p className="mt-3 text-sm text-zinc-500">No validation has run.</p> : result.issues.length === 0 ? <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">No structural, ordering, provenance, time, revision, or classification issue was found within this bounded inspection.</p> : <div className="mt-3 space-y-2">{result.issues.map((issue, index) => <article key={`${issue.path}-${index}`} className="rounded-xl border border-rose-400/15 bg-rose-400/[0.045] p-3"><div className="flex items-start justify-between gap-2"><code className="break-all text-[11px] text-rose-200">{issue.path}</code><State state={issue.state} /></div><p className="mt-2 text-xs leading-5 text-zinc-400">{issue.message}</p></article>)}</div>}</section>
        {result?.output ? <details className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><summary className="cursor-pointer font-bold text-zinc-200">Generated output preview</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/60 p-3 text-[10px] leading-4 text-zinc-400">{JSON.stringify(result.output, null, 2)}</pre></details> : null}
      </div>
    </section>
  </main>
}

function State({ state }: { state: OperationState }) { const style = state === "verified" ? "border-emerald-400/30 text-emerald-300" : state === "empty" || state === "partial" ? "border-amber-400/30 text-amber-200" : state === "error" ? "border-rose-400/30 text-rose-300" : "border-zinc-600 text-zinc-400"; return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${style}`}>{state}</span> }
function Boundary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</span><strong className="mt-1 block text-sm text-zinc-200">{value}</strong></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-3"><dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</dt><dd className="mt-1 break-all font-mono text-xs text-zinc-200">{value}</dd></div> }
