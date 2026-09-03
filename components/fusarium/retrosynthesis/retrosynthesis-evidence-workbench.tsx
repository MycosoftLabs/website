"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Atom,
  CheckCircle2,
  FileJson,
  GitBranch,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import {
  RETROSYNTHESIS_BLANK_TEMPLATE,
  RETROSYNTHESIS_MAX_BYTES,
  reviewRetrosynthesisEvidence,
  type RetrosynthesisReview,
} from "@/lib/fusarium/retrosynthesis/evidence-planner"
import { parseLocalReviewJson } from "@/lib/fusarium/tools-hub/local-review-tools"

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength
}

export function RetrosynthesisEvidenceWorkbench() {
  const [source, setSource] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [review, setReview] = useState<RetrosynthesisReview | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const [contractIssues, setContractIssues] = useState<readonly { path: string; message: string }[]>([])
  const size = useMemo(() => byteLength(source), [source])

  function clearResult() {
    setReview(null)
    setInputError(null)
    setContractIssues([])
  }

  function loadTemplate() {
    setSource(RETROSYNTHESIS_BLANK_TEMPLATE)
    setFileName(null)
    clearResult()
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    clearResult()
    if (!file.name.toLowerCase().endsWith(".json")) {
      setInputError("Only local JSON files are accepted.")
      return
    }
    if (file.size > RETROSYNTHESIS_MAX_BYTES) {
      setInputError("File exceeds the 128 KiB local review boundary.")
      return
    }
    try {
      const text = await file.text()
      parseLocalReviewJson(text)
      setSource(text)
      setFileName(file.name)
    } catch (cause) {
      setInputError(cause instanceof Error ? cause.message : "The selected file is not valid JSON.")
    }
  }

  function runReview() {
    clearResult()
    if (!source.trim()) {
      setInputError("No local evidence was supplied. Empty input remains unbound.")
      return
    }
    if (size > RETROSYNTHESIS_MAX_BYTES) {
      setInputError("Input exceeds the 128 KiB local review boundary.")
      return
    }
    try {
      const result = reviewRetrosynthesisEvidence(parseLocalReviewJson(source))
      if (!result.ok) {
        setContractIssues(result.issues)
        return
      }
      setReview(result.value)
    } catch (cause) {
      setInputError(cause instanceof Error ? cause.message : "Input is not valid JSON.")
    }
  }

  return (
    <main
      className="min-h-full w-full bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,.12),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(34,211,238,.07),transparent_30%),linear-gradient(145deg,#020504,#080d0b_58%,#020403)] p-3 text-zinc-100 md:p-5"
      data-fusarium-retrosynthesis-workbench
      data-provider-state="local-operator-input"
      data-truth-mode="evidence-review"
    >
      <header className="rounded-2xl border border-white/10 bg-black/55 p-4 shadow-2xl backdrop-blur-xl md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-300">
              <GitBranch className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300">Chemistry · local evidence review</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Retrosynthesis Evidence Map</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
                Inspect operator-supplied compound concepts, non-operational relationship claims, and provenance. The review measures evidence coverage and graph consistency only; it does not generate or validate a synthesis route.
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Retrosynthesis navigation">
            <Link href="/fusarium/tools" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-100 hover:bg-emerald-400/15">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tools Hub
            </Link>
            <Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[.04] px-4 text-sm font-semibold text-zinc-300 hover:bg-white/[.08]">Fusarium overview</Link>
          </nav>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Retrosynthesis operating boundaries">
          {[
            ["LOCAL INPUT", "emerald"],
            ["READ ONLY", "cyan"],
            ["NO EXECUTION", "amber"],
            ["UNCLASSIFIED", "zinc"],
          ].map(([label, tone]) => (
            <span key={label} className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] ${tone === "emerald" ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : tone === "cyan" ? "border-cyan-300/25 bg-cyan-400/[.08] text-cyan-200" : tone === "amber" ? "border-amber-300/25 bg-amber-400/[.08] text-amber-100" : "border-zinc-500/40 bg-white/[.04] text-zinc-300"}`}>{label}</span>
          ))}
        </div>
        <div className="mt-4 flex gap-3 rounded-xl border border-amber-300/20 bg-amber-400/[.06] p-3 text-xs leading-5 text-amber-100">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>No procedure, reagent list, quantity, condition, equipment instruction, prediction, external lookup, provider call, persistence, export, or laboratory/device action is produced.</p>
        </div>
      </header>

      <section className="mt-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1.02fr)_minmax(24rem,.98fr)]">
        <article className="min-w-0 rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Bounded structured input</p>
              <h2 className="mt-1 text-lg font-bold">Local evidence package</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">JSON only · 128 KiB maximum · commercial host accepts UNCLASSIFIED data only</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={loadTemplate} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-bold text-zinc-300 hover:border-emerald-300/30"><FileJson className="h-4 w-4" />Blank schema</button>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-bold text-zinc-300 hover:border-emerald-300/30">
                <FileJson className="h-4 w-4" />Open JSON
                <input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => { const file = event.currentTarget.files?.[0]; void importFile(file); event.currentTarget.value = "" }} />
              </label>
            </div>
          </div>
          {fileName ? <p className="mt-2 text-xs text-emerald-300">Local file: {fileName}</p> : null}
          <textarea
            aria-label="Retrosynthesis evidence JSON"
            value={source}
            onChange={(event) => { setSource(event.target.value); clearResult() }}
            placeholder="Load the blank schema or open a local evidence JSON file."
            spellCheck={false}
            className="mt-3 min-h-[26rem] w-full resize-y rounded-xl border border-white/10 bg-black/65 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-300/45"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className={`text-xs ${size > RETROSYNTHESIS_MAX_BYTES ? "text-rose-300" : "text-zinc-500"}`}>{size.toLocaleString()} / {RETROSYNTHESIS_MAX_BYTES.toLocaleString()} bytes · browser memory only</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setSource(""); setFileName(null); clearResult() }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-sm font-bold text-zinc-300"><RotateCcw className="h-4 w-4" />Clear</button>
              <button type="button" onClick={runReview} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-400/15 px-4 text-sm font-black text-emerald-100 hover:bg-emerald-400/20"><Atom className="h-4 w-4" />Review evidence map</button>
            </div>
          </div>
          {inputError ? <IssuePanel title="Input unavailable" issues={[inputError]} /> : null}
          {contractIssues.length ? <IssuePanel title="Contract rejected" issues={contractIssues.map((issue) => `${issue.path}: ${issue.message}`)} /> : null}
        </article>

        <article className="min-w-0 rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl" aria-live="polite">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Evidence, gaps, and limitations</p>
          <h2 className="mt-1 text-lg font-bold">Review result</h2>
          {!review && !inputError && !contractIssues.length ? <EmptyResult /> : null}
          {review ? <ReviewResult review={review} /> : null}
        </article>
      </section>
    </main>
  )
}

function EmptyResult() {
  return <div className="mt-4 grid min-h-80 place-items-center rounded-xl border border-dashed border-white/15 bg-black/30 p-6 text-center"><div><GitBranch className="mx-auto h-9 w-9 text-zinc-600" /><strong className="mt-3 block text-sm text-zinc-300">No evidence map has been reviewed</strong><p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">No example route, synthetic chemistry result, or placeholder success state is generated.</p></div></div>
}

function IssuePanel({ title, issues }: { title: string; issues: readonly string[] }) {
  return <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/[.06] p-3"><div className="flex items-center gap-2 text-rose-200"><AlertTriangle className="h-4 w-4" /><strong className="text-sm">{title}</strong></div><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-rose-100/75">{issues.slice(0, 16).map((issue) => <li key={issue}>{issue}</li>)}</ul>{issues.length > 16 ? <p className="mt-2 text-xs text-rose-200">{issues.length - 16} additional issue(s) withheld from this compact view.</p> : null}</div>
}

function ReviewResult({ review }: { review: RetrosynthesisReview }) {
  return <div className="mt-4 space-y-3">
    <div className={`flex items-center gap-2 rounded-xl border p-3 ${review.reviewState === "documented-input" ? "border-emerald-300/20 bg-emerald-400/[.06] text-emerald-200" : "border-amber-300/20 bg-amber-400/[.06] text-amber-100"}`}><CheckCircle2 className="h-4 w-4" /><strong className="text-sm">{review.reviewState.replaceAll("-", " ")}</strong><span className="text-xs opacity-70">· not chemical validation</span></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Metric label="Concepts" value={String(review.metrics.conceptCount)} />
      <Metric label="Relationships" value={String(review.metrics.relationshipCount)} />
      <Metric label="Evidence records" value={String(review.metrics.evidenceCount)} />
      <Metric label="Documented claims" value={String(review.metrics.documentedRelationshipCount)} />
      <Metric label="Evidence coverage" value={`${review.metrics.relationshipEvidenceCoveragePercent}%`} />
      <Metric label="Unused evidence" value={String(review.metrics.unusedEvidenceCount)} />
    </div>
    <section className="rounded-xl border border-white/10 bg-white/[.035] p-3">
      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Target record</span>
      <h3 className="mt-1 break-words text-sm font-bold text-zinc-100">{review.target.label}</h3>
      <code className="mt-1 block break-all text-[11px] text-emerald-300">{review.target.targetId}</code>
      <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(review.target.identifiers).map(([key, value]) => <span key={key} className="max-w-full break-all rounded-lg border border-white/10 bg-black/35 px-2 py-1 font-mono text-[10px] text-zinc-300">{key}: {value}</span>)}{!Object.keys(review.target.identifiers).length ? <span className="text-xs text-zinc-500">No target identifiers supplied.</span> : null}</div>
    </section>
    <section className="rounded-xl border border-white/10 bg-white/[.035] p-3">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Relationship evidence</h3><span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">No route order inferred</span></div>
      <div className="mt-2 space-y-2">{review.relationships.map((relationship) => <div key={relationship.relationshipId} className="rounded-lg border border-white/[.08] bg-black/35 p-2.5"><div className="flex flex-wrap items-center justify-between gap-2"><code className="break-all text-[11px] text-zinc-300">{relationship.fromConceptId} → {relationship.toConceptId}</code><StatePill state={relationship.evidenceState} /></div><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{relationship.claimType.replaceAll("-", " ")} · {relationship.evidenceIds.length} evidence link(s)</p></div>)}{!review.relationships.length ? <p className="text-xs text-zinc-500">No relationship claims supplied.</p> : null}</div>
    </section>
    {review.gaps.length ? <section className="rounded-xl border border-amber-300/20 bg-amber-400/[.05] p-3"><div className="flex items-center gap-2 text-amber-100"><AlertTriangle className="h-4 w-4" /><h3 className="text-sm font-bold">Evidence gaps</h3></div><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-100/75">{review.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></section> : null}
    <details className="rounded-xl border border-white/10 bg-white/[.035] p-3">
      <summary className="cursor-pointer text-sm font-bold text-zinc-200">Provenance ledger ({review.evidence.length})</summary>
      <div className="mt-3 space-y-2">{review.evidence.map((item) => <article key={item.evidenceId} className="rounded-lg border border-white/[.08] bg-black/35 p-2.5 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.sourceLabel}</strong><StatePill state={item.provenanceState} /></div><code className="mt-1 block break-all text-[10px] text-zinc-500">{item.sourceRef}</code><p className="mt-1 text-[10px] text-zinc-500">Record {item.sourceRecordId ?? "not supplied"} · {item.recordedAt ?? "timestamp not supplied"} · {item.evidenceClass}</p></article>)}{!review.evidence.length ? <p className="text-xs text-zinc-500">No provenance records supplied.</p> : null}</div>
    </details>
    <div className="flex gap-3 rounded-xl border border-sky-300/20 bg-sky-400/[.06] p-3 text-xs leading-5 text-sky-100"><LockKeyhole className="h-5 w-5 shrink-0" /><p>Coverage describes only the supplied records. It does not establish chemical identity, feasibility, safety, legality, yield, biological activity, or suitability for laboratory use.</p></div>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/35 p-2.5"><span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</span><strong className="mt-1 block font-mono text-lg text-emerald-200">{value}</strong></div>
}

function StatePill({ state }: { state: string }) {
  const tone = state === "documented-input" || state === "complete" ? "border-emerald-300/25 text-emerald-200" : state === "claim-only" ? "border-rose-300/25 text-rose-200" : "border-amber-300/25 text-amber-100"
  return <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${tone}`}>{state.replaceAll("-", " ")}</span>
}
