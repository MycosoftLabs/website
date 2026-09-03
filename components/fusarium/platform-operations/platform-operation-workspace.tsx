"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Database, RefreshCw, ShieldAlert, Unplug, type LucideIcon } from "lucide-react"
import { FUSARIUM_INFRASTRUCTURE_FLOW, type PlatformOperationDefinition, type PlatformReadContract } from "@/lib/fusarium/platform-operations/catalog"

type ProbeState = "loading" | "available" | "empty" | "unavailable"
interface ProbeResult { contract: PlatformReadContract; state: ProbeState; status?: number; checkedAt?: string; durationMs?: number; facts: string[]; reason?: string }

const accent = { emerald: "border-emerald-400/25 bg-emerald-400/5 text-emerald-200", cyan: "border-cyan-400/25 bg-cyan-400/5 text-cyan-200", amber: "border-amber-400/25 bg-amber-400/5 text-amber-200", violet: "border-violet-400/25 bg-violet-400/5 text-violet-200" }
const tone: Record<ProbeState, string> = { loading: "border-zinc-500/30 text-zinc-400", available: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200", empty: "border-cyan-400/35 bg-cyan-400/10 text-cyan-200", unavailable: "border-amber-400/35 bg-amber-400/10 text-amber-200" }

function object(value: unknown): Record<string, unknown> | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null }
function factsFrom(value: unknown): string[] {
  if (Array.isArray(value)) return [`${value.length} record${value.length === 1 ? "" : "s"} returned`]
  const row = object(value)
  if (!row) return []
  const facts: string[] = []
  for (const [key, item] of Object.entries(row)) {
    if (facts.length >= 5) break
    if (Array.isArray(item)) facts.push(`${key.replaceAll("_", " ")}: ${item.length} record${item.length === 1 ? "" : "s"}`)
    else if (["string", "number", "boolean"].includes(typeof item) && !/token|secret|password|key|cookie|authorization/i.test(key)) facts.push(`${key.replaceAll("_", " ")}: ${String(item).slice(0, 100)}`)
  }
  return facts
}
function isEmpty(value: unknown) {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  const row = object(value)
  if (!row) return false
  const arrays = Object.values(row).filter(Array.isArray) as unknown[][]
  return Object.keys(row).length === 0 || (arrays.length > 0 && arrays.every((items) => items.length === 0) && !Object.values(row).some((item) => typeof item === "number" && item > 0))
}

async function read(contract: PlatformReadContract): Promise<ProbeResult> {
  const started = performance.now(); const checkedAt = new Date().toISOString(); const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(contract.endpoint, { cache: "no-store", signal: controller.signal, headers: { Accept: "application/json" } })
    const durationMs = Math.round(performance.now() - started)
    let body: unknown = null
    try { body = await response.json() } catch { body = null }
    if (!response.ok) return { contract, state: "unavailable", status: response.status, checkedAt, durationMs, facts: [], reason: `The local contract returned HTTP ${response.status}. No operational state is inferred.` }
    const facts = factsFrom(body)
    return { contract, state: isEmpty(body) ? "empty" : "available", status: response.status, checkedAt, durationMs, facts, reason: isEmpty(body) ? "The read completed but returned no records. Empty is not an all-clear." : undefined }
  } catch (error) {
    return { contract, state: "unavailable", checkedAt, durationMs: Math.round(performance.now() - started), facts: [], reason: error instanceof DOMException && error.name === "AbortError" ? "The local read timed out after eight seconds." : "The local contract could not be read." }
  } finally { window.clearTimeout(timeout) }
}

export function PlatformOperationWorkspace({ definition, children }: { definition: PlatformOperationDefinition; children?: ReactNode }) {
  const [results, setResults] = useState<ProbeResult[]>(() => definition.contracts.map((contract) => ({ contract, state: "loading", facts: [] })))
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(async () => { setRefreshing(true); setResults(definition.contracts.map((contract) => ({ contract, state: "loading", facts: [] }))); setResults(await Promise.all(definition.contracts.map(read))); setRefreshing(false) }, [definition])
  useEffect(() => { void refresh() }, [refresh])
  const totals = useMemo(() => ({ available: results.filter((r) => r.state === "available").length, empty: results.filter((r) => r.state === "empty").length, unavailable: results.filter((r) => r.state === "unavailable").length }), [results])
  const summaryCards: readonly { label: string; value: number; Icon: LucideIcon }[] = [
    { label: "Read contracts", value: results.length, Icon: Database },
    { label: "Available", value: totals.available, Icon: CheckCircle2 },
    { label: "Empty", value: totals.empty, Icon: Unplug },
    { label: "Unavailable", value: totals.unavailable, Icon: ShieldAlert },
  ]
  return <main className="min-h-full bg-[#050706] p-3 text-zinc-100 sm:p-5">
    <header className={`rounded-2xl border p-4 backdrop-blur-xl ${accent[definition.accent]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">{definition.eyebrow}</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{definition.title}</h1><p className="mt-2 max-w-4xl text-sm text-zinc-300">{definition.summary}</p></div><div className="flex gap-2"><Link href="/fusarium" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold"><ArrowLeft size={14}/>Fusarium</Link><button onClick={() => void refresh()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""}/>Refresh</button></div></div>
    </header>
    {children}
    <section aria-labelledby="fusarium-system-flow" className="mt-3 rounded-2xl border border-emerald-400/15 bg-black/55 p-4 backdrop-blur-xl">
      <div className="max-w-4xl"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/75">Fusarium-native architecture</p><h2 id="fusarium-system-flow" className="mt-1 text-lg font-black">Field observation to protected mission picture</h2><p className="mt-1 text-xs leading-relaxed text-zinc-400">This map shows intended responsibility and data direction only. Each tile reports its own current availability below; the diagram does not assert a live connection.</p></div>
      <ol className="mt-4 grid gap-2 md:grid-cols-3 2xl:grid-cols-6">
        {FUSARIUM_INFRASTRUCTURE_FLOW.map((stage, index) => <li key={stage.id} className="relative min-w-0"><Link href={stage.href} className="group block h-full rounded-xl border border-white/10 bg-zinc-950/80 p-3 transition hover:border-emerald-400/30"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">0{index + 1}</span><h3 className="mt-1 text-xs font-black text-zinc-100">{stage.shortLabel}</h3><p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{stage.description}</p></Link>{index < FUSARIUM_INFRASTRUCTURE_FLOW.length - 1 ? <ArrowRight aria-hidden="true" size={14} className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-emerald-300/50 2xl:block"/> : null}</li>)}
      </ol>
    </section>
    <section aria-label="Contract summary" className="mt-3 grid gap-3 grid-cols-2 xl:grid-cols-4">{summaryCards.map(({ label, value, Icon }) => <article key={label} className="rounded-xl border border-white/10 bg-zinc-950/70 p-3"><Icon className="mb-2 text-emerald-300" size={17}/><span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</span><strong className="mt-1 block text-2xl">{value}</strong></article>)}</section>
    <section className="mt-3 grid gap-3 xl:grid-cols-2">{results.map((result) => <article key={result.contract.endpoint} className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{result.contract.purpose}</p><h2 className="mt-1 font-black">{result.contract.label}</h2></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${tone[result.state]}`}>{result.state}</span></div><code className="mt-3 block break-all rounded-lg border border-white/5 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-400">GET {result.contract.endpoint}</code>{result.facts.length ? <ul className="mt-3 grid gap-1 text-xs text-zinc-300">{result.facts.map((fact) => <li key={fact}>• {fact}</li>)}</ul> : null}{result.reason ? <p className="mt-3 text-xs leading-relaxed text-amber-100/80">{result.reason}</p> : null}<div className="mt-3 flex gap-3 text-[10px] uppercase tracking-wider text-zinc-600">{result.status ? <span>HTTP {result.status}</span> : null}{result.durationMs !== undefined ? <span>{result.durationMs} ms</span> : null}{result.checkedAt ? <span>{new Date(result.checkedAt).toLocaleTimeString()}</span> : null}</div></article>)}</section>
    <section className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]"><article className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4"><div className="flex gap-3"><ShieldAlert className="shrink-0 text-amber-300" size={18}/><div><h2 className="font-black">Read-only boundary</h2><p className="mt-1 text-xs leading-relaxed text-zinc-300">{definition.boundary}</p></div></div></article><nav aria-label={`${definition.title} related applications`} className="rounded-2xl border border-white/10 bg-black/45 p-4"><h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">Related applications</h2><div className="mt-2 flex flex-wrap gap-2">{definition.links.map((link) => <Link key={link.href} href={link.href} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-bold hover:border-emerald-400/30">{link.label}</Link>)}</div></nav></section>
  </main>
}
