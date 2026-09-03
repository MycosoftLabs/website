"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { CheckCircle2, FileJson, Fingerprint, HeartPulse, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react"
import { MAX_EVIDENCE_BYTES, SOURCE_HEALTH_CONTRACTS, canonicalizeEvidence, classifySourceResponse, inspectEvidence, type EvidenceFinding, type EvidenceState } from "@/lib/fusarium/tools-hub/evidence-tools"

export type EvidenceToolKind = "provenance" | "integrity" | "health"

const COPY = {
  provenance: { eyebrow: "Evidence · Local inspection", title: "Source Provenance Inspector", description: "Inspect source identity, timestamps, stable record identifiers, and declared checksums without uploading or persisting evidence.", Icon: Fingerprint },
  integrity: { eyebrow: "Cyber-defense · Defensive verification", title: "Evidence Integrity Check", description: "Compute a local SHA-256 digest and compare it with an optional declared digest. Content never leaves this browser.", Icon: ShieldCheck },
  health: { eyebrow: "Cyber-defense · Same-origin status", title: "Source Health Matrix", description: "Check a fixed allowlist of same-origin read contracts and keep reachability, authorization, freshness, and data state separate.", Icon: HeartPulse },
} as const

const SAMPLE = JSON.stringify({ id: "evidence-example", source: "operator-local", observedAt: "2026-09-01T12:00:00.000Z", dataMode: "REPLAY", records: [] }, null, 2)

export function EvidenceToolWorkspace({ kind }: { kind: EvidenceToolKind }) {
  const copy = COPY[kind]
  const Icon = copy.Icon
  const [text, setText] = useState(SAMPLE)
  const [fileName, setFileName] = useState<string | null>(null)
  const [declaredHash, setDeclaredHash] = useState("")
  const [digest, setDigest] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [health, setHealth] = useState<Record<string, { state: EvidenceState; status: number | null; detail: string }>>({})
  const [probing, setProbing] = useState(false)

  const parsed = useMemo(() => {
    try { return { value: JSON.parse(text) as unknown, error: null } }
    catch { return { value: null, error: "Input is not valid JSON." } }
  }, [text])
  const inspection = parsed.error ? null : inspectEvidence(parsed.value)

  async function loadFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_EVIDENCE_BYTES) { setParseError("File exceeds the 256 KiB local inspection limit."); return }
    if (!file.name.toLowerCase().endsWith(".json")) { setParseError("Only JSON files are accepted."); return }
    setText(await file.text()); setFileName(file.name); setParseError(null); setDigest(null)
  }

  async function computeDigest() {
    if (parsed.error) { setParseError(parsed.error); return }
    const bytes = new TextEncoder().encode(canonicalizeEvidence(parsed.value))
    const hash = await crypto.subtle.digest("SHA-256", bytes)
    setDigest(Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("")); setParseError(null)
  }

  async function probeAllowlist() {
    setProbing(true)
    const results: Record<string, { state: EvidenceState; status: number | null; detail: string }> = {}
    await Promise.all(SOURCE_HEALTH_CONTRACTS.map(async (contract) => {
      try {
        const response = await fetch(contract.href, { method: "GET", cache: "no-store", headers: { Accept: "application/json" } })
        const body = await response.text()
        let value: unknown = null
        let malformed = false
        if (body.trim()) {
          try { value = JSON.parse(body) as unknown }
          catch { malformed = true }
        }
        results[contract.id] = malformed
          ? { state: "error", status: response.status, detail: "The same-origin contract returned a non-JSON body; schema inspection stopped." }
          : { state: classifySourceResponse(response.status, value, contract.freshnessMs), status: response.status, detail: response.ok ? "Same-origin response received; content state classified independently." : `Same-origin contract returned HTTP ${response.status}.` }
      } catch { results[contract.id] = { state: "unavailable", status: null, detail: "No same-origin response was received." } }
    }))
    setHealth(results); setProbing(false)
  }

  return <main className="min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.11),transparent_35%),linear-gradient(145deg,#030605,#090d0b_55%,#040605)] p-3 text-zinc-100 md:p-5" data-evidence-tool={kind}>
    <header className="rounded-2xl border border-white/10 bg-black/50 p-4 shadow-2xl backdrop-blur-xl md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-300"><Icon className="h-6 w-6" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">{copy.eyebrow}</p><h1 className="mt-1 text-2xl font-black md:text-3xl">{copy.title}</h1><p className="mt-2 max-w-4xl text-sm text-zinc-400">{copy.description}</p></div></div><nav className="flex flex-wrap gap-2"><Link href="/fusarium/tools" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-200">Tools Hub</Link><Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200">Back to Fusarium</Link></nav></div>
      <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-100">Read-only. No upload, persistence, arbitrary URL, credential use, external request, shell, remediation, or evidence mutation.</p>
    </header>

    {kind === "health" ? <section className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Allowlisted source contracts</h2><p className="text-xs text-zinc-500">Configured is not reachable; reachable is not authorized; authorized is not fresh or populated.</p></div><button type="button" disabled={probing} onClick={probeAllowlist} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${probing ? "animate-spin" : ""}`} />Check local sources</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{SOURCE_HEALTH_CONTRACTS.map((contract) => { const result = health[contract.id]; return <article key={contract.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{contract.label}</h3><code className="text-[11px] text-zinc-500">{contract.href}</code></div><State state={result?.state ?? "unavailable"} label={result ? result.state : "not probed"} /></div><p className="mt-3 text-xs text-zinc-400">{result?.detail ?? "No request has been made in this browser session."}</p><p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">HTTP {result?.status ?? "not observed"}</p></article> })}</div></section> : <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,.95fr)]"><div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Bounded local JSON</h2><p className="text-xs text-zinc-500">Maximum 256 KiB · JSON only · processed in this browser</p></div><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold"><FileJson className="h-4 w-4" />Open JSON<input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void loadFile(event.target.files?.[0])} /></label></div>{fileName ? <p className="mt-2 text-xs text-emerald-300">Local file: {fileName}</p> : null}<textarea aria-label="Evidence JSON" value={text} onChange={(event) => { if (new Blob([event.target.value]).size <= MAX_EVIDENCE_BYTES) { setText(event.target.value); setDigest(null) } }} spellCheck={false} className="mt-3 min-h-[25rem] w-full resize-y rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-400/40" />{parseError || parsed.error ? <p role="alert" className="mt-2 text-sm text-rose-300">{parseError ?? parsed.error}</p> : null}</div><div className="space-y-3">{kind === "integrity" ? <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><h2 className="font-bold">Canonical SHA-256</h2><p className="mt-1 text-xs text-zinc-500">Object keys are sorted before hashing so formatting differences do not alter the digest.</p><label className="mt-3 block text-xs font-bold uppercase tracking-wider text-zinc-500">Declared digest (optional)<input value={declaredHash} onChange={(event) => setDeclaredHash(event.target.value.trim().toLowerCase())} placeholder="64 hexadecimal characters" className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 font-mono text-xs normal-case tracking-normal text-zinc-100 outline-none" /></label><button type="button" onClick={() => void computeDigest()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200"><ShieldCheck className="h-4 w-4" />Compute locally</button>{digest ? <div className="mt-3 rounded-xl border border-white/10 bg-black/60 p-3"><p className="break-all font-mono text-xs text-zinc-300">{digest}</p><div className="mt-2"><State state={!declaredHash ? "partial" : declaredHash === digest ? "verified" : "error"} label={!declaredHash ? "computed · no declared digest" : declaredHash === digest ? "digest matches" : "digest mismatch"} /></div></div> : null}</div> : null}{inspection ? <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Inspection result</h2><State state={inspection.state} /></div><p className="mt-2 text-xs text-zinc-500">Records: {inspection.recordCount ?? "unknown"}</p><div className="mt-3 space-y-2">{inspection.findings.map((finding) => <Finding key={finding.id} finding={finding} />)}</div></div> : null}</div></section>}
  </main>
}

function State({ state, label = state }: { state: EvidenceState; label?: string }) { const danger = state === "error"; const Icon = danger ? TriangleAlert : CheckCircle2; return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${state === "verified" ? "border-emerald-400/30 text-emerald-300" : state === "stale" || state === "partial" ? "border-amber-400/30 text-amber-200" : danger ? "border-rose-400/30 text-rose-300" : "border-zinc-600 text-zinc-400"}`}><Icon className="h-3 w-3" />{label}</span> }
function Finding({ finding }: { finding: EvidenceFinding }) { return <article className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{finding.label}</h3><State state={finding.state} /></div><p className="mt-2 text-xs leading-5 text-zinc-400">{finding.detail}</p></article> }
