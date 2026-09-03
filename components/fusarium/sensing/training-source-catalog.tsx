"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpenCheck, ChevronDown, ChevronUp, RefreshCw, Search, ShieldAlert } from "lucide-react"

type LoadState = "loading" | "available" | "unavailable"

interface TrainingSourceCandidateSummary {
  id: string
  title: string
  origin: "markdown-numbered" | "pdf-only"
  sourceOrdinal: string | null
  sourceTypeClaim: string
  sourceCategory: string
  modalities: readonly string[]
  catalogTargets: readonly string[]
  acquisitionState: "candidate"
  executionAuthority: false
  blockers: readonly string[]
}

interface TrainingSourceEnvelope {
  state: "available"
  schema: string
  version: string
  reviewedDate: string
  terminology: {
    fusariumMeaning: string
    legacyAttachmentMeaning: string
    acousticApplication: string
    rule: string
  }
  executionPolicy: {
    networkRequestsAuthorized: false
    downloadsAuthorized: false
    nasAccessAuthorized: false
    credentialUseAuthorized: false
    trainingAuthorized: false
    serviceChangesAuthorized: false
    rule: string
  }
  counts: { total: number; sine: number; approved: number; acquired: number }
  candidates: readonly TrainingSourceCandidateSummary[]
}

function isTrainingSourceEnvelope(value: unknown): value is TrainingSourceEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return row.state === "available" && typeof row.version === "string" && Array.isArray(row.candidates)
}

const categoryLabel = (value: string) => value.replaceAll("-", " ")

export function TrainingSourceCatalog() {
  const [state, setState] = useState<LoadState>("loading")
  const [envelope, setEnvelope] = useState<TrainingSourceEnvelope | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")

  const load = useCallback(async () => {
    setState("loading")
    setReason(null)
    try {
      const response = await fetch("/api/fusarium/training-data/sources", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok || !isTrainingSourceEnvelope(body)) {
        setEnvelope(null)
        setState("unavailable")
        setReason(`The protected source catalog is unavailable (HTTP ${response.status}).`)
        return
      }
      setEnvelope(body)
      setState("available")
    } catch {
      setEnvelope(null)
      setState("unavailable")
      setReason("The protected source catalog could not be read.")
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (window.location.hash === "#sine-training-source-heading") setExpanded(true)
  }, [])

  const sineCandidates = useMemo(() => envelope?.candidates.filter((candidate) =>
    candidate.catalogTargets.some((target) => target.startsWith("sine-")),
  ) ?? [], [envelope])
  const categories = useMemo(() => [...new Set(sineCandidates.map((candidate) => candidate.sourceCategory))].sort(), [sineCandidates])
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sineCandidates.filter((candidate) => {
      if (category !== "all" && candidate.sourceCategory !== category) return false
      if (!needle) return true
      return [candidate.title, candidate.id, candidate.sourceTypeClaim, candidate.sourceCategory, ...candidate.modalities]
        .some((value) => value.toLowerCase().includes(needle))
    })
  }, [category, query, sineCandidates])

  return (
    <section aria-labelledby="sine-training-source-heading" className="border-b border-cyan-400/15 bg-[#03070c] p-3" data-sine-training-source-catalog={state}>
      <div className="rounded-xl border border-cyan-400/20 bg-black/55 p-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-4xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/75">Controlled acquisition inventory</p>
            <h2 id="sine-training-source-heading" className="mt-1 flex items-center gap-2 text-lg font-black text-white"><BookOpenCheck className="h-4 w-4 text-cyan-300" />SINE training source catalog</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">The supplied catalog is visible here as planning evidence. A listed corpus is not downloaded, licensed, installed, approved, or accepted for training.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} disabled={state === "loading"} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 bg-zinc-950/80 px-3 text-xs font-semibold text-zinc-200 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`} />Refresh</button>
            <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-50">{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{expanded ? "Hide catalog" : "Open catalog"}</button>
          </div>
        </div>

        {envelope ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Fact label="SINE candidates" value={String(envelope.counts.sine)} />
            <Fact label="All supplied candidates" value={String(envelope.counts.total)} />
            <Fact label="Approved" value={String(envelope.counts.approved)} />
            <Fact label="Acquired" value={String(envelope.counts.acquired)} />
            <Fact label="Registry" value={envelope.version} />
          </div>
        ) : null}
        {state === "loading" ? <p className="mt-3 text-xs text-slate-500">Loading the owner-gated source inventory…</p> : null}
        {state === "unavailable" ? <div role="status" className="mt-3 flex gap-2 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-xs text-amber-100"><ShieldAlert className="h-4 w-4 shrink-0" />{reason} No acquisition state is inferred.</div> : null}

        {expanded && envelope ? (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2"><Search className="h-3.5 w-3.5 text-zinc-500" /><span className="sr-only">Search source catalog</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sources, modalities, or categories" className="min-w-0 flex-1 bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-600" /></label>
              <label className="rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-300"><span className="sr-only">Filter source category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="bg-transparent outline-none"><option value="all">All SINE categories</option>{categories.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-[11px] leading-5 text-amber-100/80"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>Every candidate is fail-closed. Current URL, release, license and use rights, expected bytes and objects, checksum, destination, and human approval must all be verified before a download can be created.</p></div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
              {visible.map((candidate) => (
                <article key={candidate.id} className="rounded-lg border border-white/10 bg-zinc-950/70 p-3">
                  <div className="flex items-start justify-between gap-2"><strong className="text-xs text-zinc-100">{candidate.title}</strong><span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-200">Candidate</span></div>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{candidate.sourceOrdinal ? `Source ${candidate.sourceOrdinal} · ` : ""}{categoryLabel(candidate.sourceCategory)}</p>
                  <p className="mt-2 text-[11px] leading-5 text-zinc-400">{candidate.sourceTypeClaim}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{candidate.modalities.map((modality) => <span key={modality} className="rounded-full border border-cyan-300/15 bg-cyan-300/5 px-2 py-0.5 text-[9px] text-cyan-100">{modality}</span>)}</div>
                  <p className="mt-2 text-[10px] text-zinc-500">{candidate.blockers.length} of 8 acquisition gates remain closed.</p>
                </article>
              ))}
              {visible.length === 0 ? <p className="rounded-lg border border-white/10 bg-zinc-950/70 p-4 text-xs text-zinc-500">No SINE source candidate matches these filters.</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-zinc-600">{label}</span><strong className="mt-1 block text-sm text-zinc-100">{value}</strong></div>
}
