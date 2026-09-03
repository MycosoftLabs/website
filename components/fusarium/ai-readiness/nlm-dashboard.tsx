"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BrainCircuit, RefreshCw } from "lucide-react"

interface NlmStatus {
  schema: string
  classification: string
  receivedAt: string
  engine: { state: string; health: string; ready: boolean | null; healthLatencyMs: number; readyLatencyMs: number; errors: string[] }
  training: { state: string; epoch: number | null; progress: number | null; loss: number | null; providerReportedAccuracy: number | null; signalSamples: number | null; observedAt: string | null; reachable: boolean; latencyMs: number; error: string | null }
  capabilities: string[]
  provenance: { provider: string; note: string }
}

export function NlmDashboard() {
  const [data, setData] = useState<NlmStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const response = await fetch("/api/fusarium/nlm/status", { cache: "no-store" })
      if (!response.ok) throw new Error(`status route returned ${response.status}`)
      setData(await response.json())
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "NLM status unavailable")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main className="min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.1),transparent_34%),linear-gradient(145deg,#050807,#0b100d_55%,#050706)] p-3 text-zinc-100 md:p-5" data-nlm-dashboard>
      <header className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl md:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300"><BrainCircuit className="h-6 w-6" aria-hidden="true" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Fusarium · Nature Learning Model</p><h1 className="mt-1 text-2xl font-black md:text-3xl">NLM Training Dashboard</h1><p className="mt-2 max-w-4xl text-sm text-zinc-400">Live read-only engine, readiness, and training evidence. Training metrics do not prove that inference is deployed to FCI or any device.</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-300 hover:bg-white/[0.08] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button><Link href="/fusarium/sine#sine-training-source-heading" className="inline-flex min-h-11 items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-100">Review source catalog</Link><Link href="/fusarium" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-200">Back to Fusarium</Link></div></div></header>
      {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-200" role="alert">NLM status unavailable — {error}</p> : null}
      <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite"><Metric label="Engine" value={data?.engine.state ?? (loading ? "checking" : "unknown")} detail={data ? `${data.engine.health} · ${data.engine.healthLatencyMs} ms` : "No status yet"} /><Metric label="Readiness" value={data?.engine.ready == null ? "unknown" : data.engine.ready ? "ready" : "not ready"} detail={data ? `${data.engine.readyLatencyMs} ms` : "No readiness response"} /><Metric label="Training" value={data?.training.state ?? "unknown"} detail={data?.training.observedAt ? `Observed ${new Date(data.training.observedAt).toLocaleString()}` : "No provider time"} /><Metric label="Progress" value={data?.training.progress == null ? "unknown" : `${data.training.progress}%`} detail={data?.training.epoch == null ? "Epoch unknown" : `Epoch ${data.training.epoch}`} /></section>
      <section className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.4fr]"><article className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-200">Provider-reported metrics</h2><dl className="mt-3 space-y-2 text-sm"><Row label="Signal samples" value={data?.training.signalSamples == null ? "Unknown" : data.training.signalSamples.toLocaleString()} /><Row label="Loss" value={data?.training.loss == null ? "Unknown" : String(data.training.loss)} /><Row label="Accuracy" value={data?.training.providerReportedAccuracy == null ? "Unknown" : `${data.training.providerReportedAccuracy} · provider-reported unit`} /><Row label="Metrics latency" value={data ? `${data.training.latencyMs} ms` : "Unknown"} /><Row label="Classification" value={data?.classification ?? "UNCLASSIFIED"} /></dl><p className="mt-3 text-xs leading-5 text-zinc-500">No percentage conversion or quality conclusion is inferred from the provider’s accuracy field because its unit contract is not declared.</p></article><article className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl"><h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-200">Deployed API capabilities</h2><div className="mt-3 flex flex-wrap gap-2">{(data?.capabilities ?? []).map((capability) => <span key={capability} className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-emerald-200">{capability.replaceAll("-", " ")}</span>)}</div><p className="mt-4 border-l-2 border-emerald-500/30 pl-3 text-xs leading-5 text-zinc-500">{data?.provenance.note ?? "Waiting for provenance."}</p></article></section>
    </main>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(0,0,0,0.3))] p-4 backdrop-blur-xl"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</p><strong className="mt-2 block text-2xl text-zinc-100">{value}</strong><p className="mt-1 text-xs text-zinc-500">{detail}</p></article> }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-2"><dt className="text-zinc-500">{label}</dt><dd className="text-right font-mono text-xs text-zinc-200">{value}</dd></div> }
