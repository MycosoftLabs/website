"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Activity, Database, Eye, FlaskConical, Radar, Search, ShieldCheck, Waves } from "lucide-react"
import {
  FUSARIUM_TOOL_CATALOG,
  TOOL_CATEGORIES,
  visibleTools,
  type ToolCategory,
} from "@/lib/fusarium/tools-hub/catalog"
import { buildToolsHubLink } from "@/lib/fusarium/tools-hub/deep-links"

const ICONS = { operations: Radar, environment: Waves, intelligence: Eye, defense: ShieldCheck, "cyber-defense": ShieldCheck, evidence: Database, simulation: FlaskConical, analysis: Activity, sensing: Waves, data: Database }

export function FusariumToolsHub() {
  const searchParams = useSearchParams()
  const [category, setCategory] = useState<ToolCategory>("all")
  const [query, setQuery] = useState("")
  const tools = useMemo(() => visibleTools(category, query), [category, query])
  const mounted = FUSARIUM_TOOL_CATALOG.filter((tool) => tool.href).length
  const unbound = FUSARIUM_TOOL_CATALOG.filter((tool) => tool.availability === "unbound").length

  return (
    <main className="min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.09),transparent_34%),linear-gradient(145deg,#050807,#0a0e0c_55%,#050706)] p-3 text-zinc-100 md:p-5" data-fusarium-tools-hub>
      <header className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Fusarium · Science &amp; Lab Tools</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Tools Hub</h1>
            <p className="mt-2 max-w-4xl text-sm text-zinc-400">Environmental intelligence, defensive operations, evidence, cyber-defense, sensing, simulation, analysis, and data tools in one local directory. A working page is not evidence that its device or provider is connected.</p>
          </div>
          <Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Back to Fusarium</Link>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Summary label="Cataloged tools" value={String(FUSARIUM_TOOL_CATALOG.length)} />
          <Summary label="Mounted here" value={String(mounted)} />
          <Summary label="Mounted · source unbound" value={String(unbound)} />
        </div>
      </header>

      <section className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl" aria-label="Tool filters">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tool category">
            {TOOL_CATEGORIES.map((value) => (
              <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`min-h-11 rounded-xl border px-3 text-xs font-bold uppercase tracking-[0.12em] ${category === value ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"}`}>{value}</button>
            ))}
          </div>
          <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 lg:w-80">
            <Search className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <span className="sr-only">Search tools</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools" className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
          </label>
        </div>
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-live="polite" aria-label="Fusarium tools">
        {tools.map((tool) => {
          const Icon = ICONS[tool.category]
          return (
            <article key={tool.id} className="flex min-h-56 flex-col rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.065),rgba(0,0,0,0.28))] p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${tool.availability === "available" ? "border-emerald-400/30 text-emerald-300" : tool.availability === "unbound" ? "border-amber-400/30 text-amber-200" : "border-zinc-600 text-zinc-500"}`}>{tool.availability.replaceAll("-", " ")}</span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-zinc-100">{tool.name}</h2>
              <p className="mt-1 text-sm leading-5 text-zinc-400">{tool.description}</p>
              <p className="mt-3 border-l-2 border-emerald-500/30 pl-2 text-xs leading-4 text-zinc-500">{tool.boundary}</p>
              <div className="mt-auto pt-4">
                {tool.href ? <Link href={buildToolsHubLink(tool.href, searchParams.toString())} className="inline-flex min-h-11 items-center text-sm font-bold text-emerald-300 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Open tool →</Link> : <span className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Implementation required</span>}
              </div>
            </article>
          )
        })}
      </section>
      {tools.length === 0 ? <p className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-6 text-center text-sm text-zinc-400">No cataloged tool matches this filter.</p> : null}
    </main>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"><span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</span><strong className="mt-1 block text-xl text-zinc-100">{value}</strong></div>
}
