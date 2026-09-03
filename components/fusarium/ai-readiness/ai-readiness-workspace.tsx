"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Bot, BrainCircuit, Network, Search, ShieldCheck, Workflow } from "lucide-react"
import { aiReadiness, type AiSurface } from "@/lib/fusarium/ai-readiness/catalog"

const META = {
  "ai-studio": { title: "MYCA AI Studio", eyebrow: "Conversation and tool readiness", Icon: Bot },
  "nlm-training": { title: "NLM Training Dashboard", eyebrow: "Model evidence and deployment gates", Icon: BrainCircuit },
  workflows: { title: "Workflows", eyebrow: "n8n inventory and execution boundary", Icon: Workflow },
  mas: { title: "MAS Topology", eyebrow: "Agent and service readiness", Icon: Network },
  avani: { title: "AVANI Guardian", eyebrow: "Governance evidence and authorization boundary", Icon: ShieldCheck },
} as const

export function AiReadinessWorkspace({ surface }: { surface: AiSurface }) {
  const [query, setQuery] = useState("")
  const records = useMemo(() => aiReadiness(surface, query), [surface, query])
  const meta = META[surface]
  const Icon = meta.Icon

  return (
    <main className="min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_34%),linear-gradient(145deg,#050807,#0b100d_55%,#050706)] p-3 text-zinc-100 md:p-5" data-ai-readiness={surface}>
      <header className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl md:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300"><Icon className="h-6 w-6" aria-hidden="true" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Fusarium · {meta.eyebrow}</p><h1 className="mt-1 text-2xl font-black md:text-3xl">{meta.title}</h1><p className="mt-2 max-w-4xl text-sm text-zinc-400">This is a source-backed readiness surface. It performs no prompt, training job, workflow mutation, agent dispatch, external probe, or authorization decision.</p></div></div><Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Back to Fusarium</Link></div></header>
      <section className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl"><label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3"><Search className="h-4 w-4 text-zinc-500" aria-hidden="true" /><span className="sr-only">Search {meta.title}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search capabilities and requirements" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600" /></label></section>
      <section className="mt-3 grid gap-3 lg:grid-cols-2" aria-live="polite">{records.map((record) => <article key={record.id} className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(0,0,0,0.3))] p-4 backdrop-blur-xl"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="text-lg font-bold">{record.capability}</h2><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${record.state === "source-present" ? "border-emerald-400/25 text-emerald-300" : record.state === "unbound" ? "border-amber-400/25 text-amber-200" : "border-red-400/25 text-red-200"}`}>{record.state.replaceAll("-", " ")}</span></div><code className="mt-3 block break-all rounded-lg border border-white/[0.07] bg-black/35 p-2 text-[11px] text-zinc-400">{record.source}</code><p className="mt-3 text-sm leading-5 text-zinc-300">{record.evidence}</p><p className="mt-2 border-l-2 border-emerald-500/30 pl-2 text-xs leading-5 text-zinc-500"><strong className="text-zinc-400">Required:</strong> {record.requirement}</p></article>)}{records.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/35 p-8 text-center text-sm text-zinc-500 lg:col-span-2">No capability matches this search.</p> : null}</section>
    </main>
  )
}
