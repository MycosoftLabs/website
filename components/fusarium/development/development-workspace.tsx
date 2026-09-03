"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Braces, CheckCircle2, Code2, Copy, FileJson, LockKeyhole, Search, ShieldCheck, XCircle } from "lucide-react"
import { developmentRecords, type DevelopmentSurface } from "@/lib/fusarium/development/catalog"
import { generateSdkArtifact, MOUNTED_CONTRACTS, validateLocalJson, type ValidationResult } from "@/lib/fusarium/development/toolkit"

const META = {
  functions: { eyebrow: "Execution inventory", title: "Functions", description: "Inspected local function families and their operational boundaries.", Icon: Braces },
  sdk: { eyebrow: "Developer contracts", title: "SDK", description: "Typed source contracts available to Fusarium applications and future integrations.", Icon: Code2 },
  shell: { eyebrow: "Terminal boundary", title: "Cloud Shell", description: "Shell prerequisites and lock state. No command runner is exposed from the browser.", Icon: LockKeyhole },
} as const

export function DevelopmentWorkspace({ surface }: { surface: DevelopmentSurface }) {
  const [query, setQuery] = useState("")
  const records = useMemo(() => developmentRecords(surface, query), [surface, query])
  const meta = META[surface]
  const Icon = meta.Icon

  return (
    <main className="min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_34%),linear-gradient(145deg,#050807,#0b100d_55%,#050706)] p-3 text-zinc-100 md:p-5" data-development-surface={surface}>
      <header className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300"><Icon className="h-6 w-6" aria-hidden="true" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Fusarium · {meta.eyebrow}</p><h1 className="mt-1 text-2xl font-black md:text-3xl">{meta.title}</h1><p className="mt-2 max-w-3xl text-sm text-zinc-400">{meta.description}</p></div></div>
          <Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Back to Fusarium</Link>
        </div>
        {surface === "shell" ? <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-100/80"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>LOCKED / UNAVAILABLE. No trusted session broker, server-verified shell identity, command policy, or durable audit is bound. This page cannot execute a command.</p></div> : null}
      </header>

      {surface === "functions" ? <FunctionsValidator /> : null}
      {surface === "sdk" ? <SdkWorkbench /> : null}

      <section className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3"><Search className="h-4 w-4 text-zinc-500" aria-hidden="true" /><span className="sr-only">Search {meta.title}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${meta.title.toLowerCase()}`} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600" /></label>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-2" aria-live="polite">
        {records.map((record) => <article key={record.id} className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(0,0,0,0.3))] p-4 backdrop-blur-xl"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">{record.category}</p><h2 className="mt-1 text-lg font-bold">{record.name}</h2></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${record.state === "source-present" ? "border-emerald-400/25 text-emerald-300" : record.state === "unbound" ? "border-amber-400/25 text-amber-200" : "border-red-400/25 text-red-200"}`}>{record.state.replaceAll("-", " ")}</span></div><code className="mt-3 block break-all rounded-lg border border-white/[0.07] bg-black/35 p-2 text-[11px] text-zinc-400">{record.location}</code><p className="mt-3 text-sm leading-5 text-zinc-300">{record.description}</p><p className="mt-2 border-l-2 border-emerald-500/30 pl-2 text-xs leading-5 text-zinc-500">{record.boundary}</p></article>)}
        {records.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/35 p-8 text-center text-sm text-zinc-500 lg:col-span-2">No source record matches this search.</p> : null}
      </section>
    </main>
  )
}

function FunctionsValidator() {
  const [contractId, setContractId] = useState(MOUNTED_CONTRACTS[0].id)
  const selected = MOUNTED_CONTRACTS.find((contract) => contract.id === contractId) ?? MOUNTED_CONTRACTS[0]
  const [text, setText] = useState(JSON.stringify(selected.example, null, 2))
  const [result, setResult] = useState<ValidationResult | null>(null)
  function selectContract(nextId: string) {
    const next = MOUNTED_CONTRACTS.find((contract) => contract.id === nextId) ?? MOUNTED_CONTRACTS[0]
    setContractId(next.id); setText(JSON.stringify(next.example, null, 2)); setResult(null)
  }
  return <section className="mt-3 rounded-2xl border border-emerald-400/15 bg-black/40 p-4 backdrop-blur-xl" aria-labelledby="functions-validator-title" data-functions-validator>
    <div className="flex items-start gap-3"><FileJson className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" /><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Local-only utility</p><h2 id="functions-validator-title" className="mt-1 text-lg font-bold">JSON and request-shape validator</h2><p className="mt-1 text-xs leading-5 text-zinc-400">Parses at most 64 KiB in this browser tab and checks a selected mounted contract. It never executes a function, sends a request, uploads input, or persists content.</p></div></div>
    <div className="mt-4 grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)_minmax(18rem,.7fr)]">
      <div><label className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Mounted contract<select value={contractId} onChange={(event) => selectContract(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-200">{MOUNTED_CONTRACTS.map((contract) => <option key={contract.id} value={contract.id}>{contract.title}</option>)}</select></label><div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><code className="break-all text-[10px] text-emerald-200">{selected.schema}</code><p className="mt-2 text-[11px] leading-4 text-zinc-500">Source: {selected.source}</p></div></div>
      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Local JSON<textarea value={text} onChange={(event) => { setText(event.target.value); setResult(null) }} spellCheck={false} className="mt-2 min-h-64 w-full resize-y rounded-xl border border-white/10 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-400/40" /></label>
      <div><button type="button" onClick={() => setResult(validateLocalJson(text, contractId))} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-xs font-black uppercase tracking-[0.1em] text-emerald-200"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Validate locally</button><ValidationPanel result={result} /></div>
    </div>
  </section>
}

function ValidationPanel({ result }: { result: ValidationResult | null }) {
  if (!result) return <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-xs leading-5 text-zinc-500">Not validated. No input leaves this page.</div>
  return <div className={`mt-3 rounded-xl border p-4 ${result.ok ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-red-400/25 bg-red-400/[0.05]"}`} aria-live="polite"><div className="flex items-center gap-2 text-sm font-bold">{result.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-red-300" />}{result.ok ? "Shape compatible" : "Validation issues"}</div><p className="mt-2 text-[10px] text-zinc-500">{result.bytes} bytes · depth {result.depth} · {result.keys} keys</p>{result.issues.length ? <ul className="mt-3 space-y-1 text-xs leading-5 text-red-100/80">{result.issues.map((issue) => <li key={issue}>• {issue}</li>)}</ul> : <p className="mt-3 text-xs leading-5 text-emerald-100/80">Required fields and bounded shape passed. This does not prove runtime acceptance.</p>}</div>
}

function SdkWorkbench() {
  const [contractId, setContractId] = useState(MOUNTED_CONTRACTS[0].id)
  const [language, setLanguage] = useState<"typescript" | "python" | "json">("typescript")
  const [copied, setCopied] = useState(false)
  const contract = MOUNTED_CONTRACTS.find((candidate) => candidate.id === contractId) ?? MOUNTED_CONTRACTS[0]
  const artifact = generateSdkArtifact(contractId, language)
  async function copyArtifact() { try { await navigator.clipboard.writeText(artifact); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { setCopied(false) } }
  return <section className="mt-3 rounded-2xl border border-emerald-400/15 bg-black/40 p-4 backdrop-blur-xl" aria-labelledby="sdk-workbench-title" data-sdk-workbench>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Schema-derived local utility</p><h2 id="sdk-workbench-title" className="mt-1 text-lg font-bold">Contract and example generator</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">Generates inspectable examples from mounted Fusarium contract definitions. Nothing is installed, published, executed, fetched, or sent.</p></div><button type="button" onClick={copyArtifact} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-bold text-zinc-300"><Copy className="h-4 w-4" aria-hidden="true" />{copied ? "Copied" : "Copy generated text"}</button></div>
    <div className="mt-4 grid gap-3 xl:grid-cols-[19rem_minmax(0,1fr)]"><div className="space-y-3"><label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Contract<select value={contractId} onChange={(event) => setContractId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-200">{MOUNTED_CONTRACTS.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Output<select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-200"><option value="typescript">TypeScript</option><option value="python">Python / Pydantic</option><option value="json">JSON example</option></select></label><div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><p className="text-xs font-bold text-zinc-200">{contract.title}</p><code className="mt-2 block break-all text-[10px] text-emerald-200">{contract.schema}</code><p className="mt-2 break-all text-[10px] text-zinc-500">{contract.endpoint}</p></div></div><pre className="max-h-[34rem] min-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-zinc-950 p-4 text-xs leading-5 text-zinc-300"><code>{artifact}</code></pre></div>
  </section>
}
