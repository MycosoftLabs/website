"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Activity, Braces, RefreshCw, Search, ShieldAlert } from "lucide-react"
import { API_DOMAINS, API_HEALTH_CONTRACTS, filterApiCatalog, type ApiDomain, type ApiSafety } from "@/lib/fusarium/api-gateway/catalog"

const SAFETY: readonly (ApiSafety | "all")[] = ["all", "passive-read", "local-analysis", "gated-write", "device-action"]

export function FusariumApiGateway() {
  const [domain, setDomain] = useState<ApiDomain>("all")
  const [safety, setSafety] = useState<ApiSafety | "all">("all")
  const [query, setQuery] = useState("")
  const entries = useMemo(() => filterApiCatalog(domain, query, safety), [domain, query, safety])
  const [checks, setChecks] = useState<Record<string, HealthResult>>({})
  const [checking, setChecking] = useState(false)
  const runRef = useRef(0)

  async function checkFixedContracts() {
    const run = ++runRef.current
    setChecking(true)
    setChecks(Object.fromEntries(API_HEALTH_CONTRACTS.map((contract) => [contract.id, { state: "checking", detail: "Checking fixed same-origin GET contract." }])))
    const next: Record<string, HealthResult> = {}
    await Promise.all(API_HEALTH_CONTRACTS.map(async (contract) => {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 4000)
      try {
        const response = await fetch(contract.path, { method: "GET", cache: "no-store", credentials: "same-origin", signal: controller.signal, headers: { Accept: "application/json" } })
        const contentType = response.headers.get("content-type") ?? ""
        const schema = contentType.includes("application/json") ? "JSON response" : "non-JSON response"
        next[contract.id] = response.ok
          ? { state: "reachable", detail: `${response.status} · ${schema}. Reachability does not prove freshness or data presence.` }
          : { state: response.status === 401 || response.status === 403 ? "unauthorized" : "degraded", detail: `${response.status} · ${schema}.` }
      } catch (error) {
        next[contract.id] = { state: "unavailable", detail: error instanceof DOMException && error.name === "AbortError" ? "Timed out after 4 seconds." : "The same-origin contract could not be reached." }
      } finally {
        window.clearTimeout(timer)
      }
    }))
    if (run === runRef.current) {
      setChecks(next)
      setChecking(false)
    }
  }

  return (
    <main className="min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_34%),linear-gradient(145deg,#050807,#0b100d_55%,#050706)] p-3 text-zinc-100 md:p-5" data-fusarium-api-gateway>
      <header className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Fusarium · Development</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">API Gateway</h1>
            <p className="mt-2 text-sm text-zinc-400">Source inventory for same-origin contracts. This surface does not execute requests, probe dependencies, use credentials, or turn source presence into runtime readiness.</p>
          </div>
          <Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Back to Fusarium</Link>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-100/80"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>Mutation and device-action routes are documentation only. They require server-verified identity, policy, system readiness, and separate operator approval.</p></div>
      </header>

      <section className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl" aria-labelledby="contract-health-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Bounded runtime evidence</p><h2 id="contract-health-title" className="mt-1 text-lg font-bold">Fixed contract health</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">Checks four hard-coded same-origin GET contracts. It cannot accept a URL, method, body, header, credential, mutation, or device command.</p></div>
          <button type="button" onClick={checkFixedContracts} disabled={checking} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-xs font-black uppercase tracking-[0.1em] text-emerald-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />{checking ? "Checking" : "Check fixed GET contracts"}</button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" aria-live="polite">
          {API_HEALTH_CONTRACTS.map((contract) => {
            const result = checks[contract.id] ?? { state: "not-probed", detail: "No runtime probe has been made in this page session." }
            return <article key={contract.id} className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 text-xs font-bold"><Activity className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />{contract.label}</span><HealthTag state={result.state} /></div><code className="mt-2 block break-all text-[10px] text-zinc-500">GET {contract.path}</code><p className="mt-2 text-[11px] leading-4 text-zinc-400">{result.detail}</p></article>
          })}
        </div>
      </section>

      <section className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl" aria-label="API filters">
        <div className="flex flex-wrap gap-2" role="group" aria-label="API domain">
          {API_DOMAINS.map((value) => <FilterButton key={value} active={domain === value} onClick={() => setDomain(value)}>{value}</FilterButton>)}
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2" role="group" aria-label="API safety">
            {SAFETY.map((value) => <FilterButton key={value} active={safety === value} onClick={() => setSafety(value)}>{value.replaceAll("-", " ")}</FilterButton>)}
          </div>
          <label className="ml-auto flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 lg:w-80"><Search className="h-4 w-4 text-zinc-500" aria-hidden="true" /><span className="sr-only">Search API catalog</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search paths and purposes" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600" /></label>
        </div>
      </section>

      <section className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl" aria-live="polite">
        <div className="border-b border-white/10 px-4 py-3 text-xs text-zinc-400"><strong className="text-zinc-100">{entries.length}</strong> catalog entries · source inventory only</div>
        <div className="divide-y divide-white/[0.07]">
          {entries.map((entry) => (
            <article key={entry.id} className="grid gap-3 p-4 lg:grid-cols-[7rem_minmax(14rem,1.15fr)_minmax(18rem,1fr)_11rem] lg:items-center">
              <div className="flex items-center gap-2"><Braces className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className={`rounded-md border px-2 py-1 font-mono text-[11px] font-black ${entry.method === "GET" ? "border-emerald-400/25 text-emerald-300" : "border-amber-400/25 text-amber-200"}`}>{entry.method}</span></div>
              <code className="break-all text-xs text-zinc-200">{entry.path}</code>
              <p className="text-xs leading-5 text-zinc-400">{entry.purpose}</p>
              <div className="flex flex-wrap gap-1.5 lg:justify-end"><Tag>{entry.safety.replaceAll("-", " ")}</Tag><Tag>{entry.sourceState.replaceAll("-", " ")}</Tag></div>
            </article>
          ))}
          {entries.length === 0 ? <p className="p-8 text-center text-sm text-zinc-500">No source entry matches this filter.</p> : null}
        </div>
      </section>
    </main>
  )
}

type HealthState = "not-probed" | "checking" | "reachable" | "degraded" | "unauthorized" | "unavailable"
type HealthResult = { state: HealthState; detail: string }

function HealthTag({ state }: { state: HealthState }) {
  const color = state === "reachable" ? "border-emerald-400/25 text-emerald-300" : state === "not-probed" || state === "checking" ? "border-zinc-400/20 text-zinc-400" : state === "unauthorized" ? "border-amber-400/25 text-amber-200" : "border-red-400/25 text-red-200"
  return <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] ${color}`}>{state.replaceAll("-", " ")}</span>
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-11 rounded-xl border px-3 text-[10px] font-black uppercase tracking-[0.12em] ${active ? "border-emerald-300/45 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-300"}`}>{children}</button>
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400">{children}</span>
}
