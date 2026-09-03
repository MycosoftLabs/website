"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, FileJson, Radar, ShieldCheck } from "lucide-react"
import {
  DEFENSIVE_ANALYSIS_MAX_BYTES,
  analyzeEnvironmentalTracks,
  checkReleaseabilityMetadata,
  evaluateIndicatorWatchlist,
  fuseEnvironmentalObservations,
} from "@/lib/fusarium/defensive-analysis/contracts"

export type DefensiveToolKind = "tracker" | "fusion" | "watchlist" | "release"
const CONFIG = {
  tracker: { eyebrow: "Environmental intelligence · replay", title: "Environmental Object Tracker", description: "Order provenance-bearing observations of explicitly identified non-human environmental objects into reviewable tracks.", schema: "fusarium-environmental-track-replay/v1", boundary: "No human subjects, identity inference, autonomous pursuit, targeting, commands, or live device contact." },
  fusion: { eyebrow: "Defensive analysis · local correlation", title: "Multi-Sensor Track Fusion", description: "Correlate camera, radar, LiDAR, AIS, ADS-B, and environmental observations only when scope, time, class, uncertainty, and provenance gates agree.", schema: "fusarium-multisensor-fusion-replay/v1", boundary: "Correlation is an inference for human review—not identity, intent, target selection, or command authority." },
  watchlist: { eyebrow: "Environmental intelligence · local rules", title: "Indicator Watchlist", description: "Evaluate bounded deterministic rules against imported numeric environmental evidence.", schema: "fusarium-indicator-watchlist/v1", boundary: "No person surveillance, background monitoring, external alerts, automatic response, persistence, or device action." },
  release: { eyebrow: "Information handling · metadata check", title: "Classification / Releaseability Checker", description: "Validate UNCLASSIFIED work-product metadata for internally inconsistent handling and recipient declarations.", schema: "fusarium-releaseability-metadata/v1", boundary: "This tool is not a classification authority and never authorizes release, publication, or transmission." },
} as const

function execute(kind: DefensiveToolKind, input: unknown) {
  if (kind === "tracker") return analyzeEnvironmentalTracks(input)
  if (kind === "fusion") return fuseEnvironmentalObservations(input)
  if (kind === "watchlist") return evaluateIndicatorWatchlist(input)
  return checkReleaseabilityMetadata(input)
}

export function DefensiveAnalysisWorkspace({ kind }: { kind: DefensiveToolKind }) {
  const config = CONFIG[kind]
  const [text, setText] = useState("")
  const [result, setResult] = useState<ReturnType<typeof execute> | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const size = useMemo(() => new TextEncoder().encode(text).byteLength, [text])
  const run = () => {
    setParseError(null); setResult(null)
    if (!text.trim()) { setParseError("No evidence file or JSON was supplied. Empty input is unbound, not a measured zero."); return }
    if (size > DEFENSIVE_ANALYSIS_MAX_BYTES) { setParseError("Input exceeds the 512 KiB local-analysis boundary."); return }
    try { setResult(execute(kind, JSON.parse(text))) } catch { setParseError("Input is not valid JSON.") }
  }
  const importFile = async (file: File) => {
    setResult(null); setParseError(null)
    if (file.size > DEFENSIVE_ANALYSIS_MAX_BYTES) { setParseError("File exceeds the 512 KiB local-analysis boundary."); return }
    setText(await file.text())
  }

  return <main className="min-h-full w-full bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.11),transparent_34%),linear-gradient(145deg,#020504,#090d0b_58%,#020403)] p-3 text-zinc-100 md:p-5" data-defensive-tool={kind}>
    <header className="rounded-2xl border border-white/10 bg-black/50 p-4 shadow-2xl backdrop-blur-xl md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-4xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300">{config.eyebrow}</p><h1 className="mt-1 text-2xl font-black md:text-3xl">{config.title}</h1><p className="mt-2 text-sm leading-6 text-zinc-400">{config.description}</p></div><Link href="/fusarium/tools" className="inline-flex min-h-11 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200">Back to Tools Hub</Link></div>
      <div className="mt-4 flex gap-3 rounded-xl border border-amber-300/20 bg-amber-400/[.06] p-3 text-xs leading-5 text-amber-100"><ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" /><p>{config.boundary}</p></div>
    </header>

    <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,.72fr)]">
      <article className="min-w-0 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Bounded local JSON</p><h2 className="mt-1 text-lg font-bold">Evidence input</h2><p className="mt-1 text-xs text-zinc-500">Expected schema: <code>{config.schema}</code></p></div><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-bold text-zinc-300"><FileJson className="h-4 w-4" />Import JSON<input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void importFile(file); event.currentTarget.value = "" }} /></label></div>
        <textarea value={text} onChange={(event) => { setText(event.target.value); setResult(null); setParseError(null) }} spellCheck={false} aria-label={`${config.title} JSON evidence`} placeholder={`Paste ${config.schema} JSON or import a local file`} className="mt-3 min-h-80 w-full resize-y rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-400/50" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className={`text-xs ${size > DEFENSIVE_ANALYSIS_MAX_BYTES ? "text-red-300" : "text-zinc-500"}`}>{size.toLocaleString()} / {DEFENSIVE_ANALYSIS_MAX_BYTES.toLocaleString()} bytes · browser memory only</span><button type="button" onClick={run} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-400/15 px-4 text-sm font-black text-emerald-100"><Radar className="h-4 w-4" />Run local analysis</button></div>
      </article>

      <article className="min-w-0 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl" aria-live="polite">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Evidence vs inference</p><h2 className="mt-1 text-lg font-bold">Review result</h2>
        {!result && !parseError ? <EmptyResult /> : null}
        {parseError ? <IssuePanel title="Input unavailable" issues={[parseError]} /> : null}
        {result && !result.ok ? <IssuePanel title="Contract rejected" issues={result.issues.map((issue) => `${issue.path}: ${issue.message}`)} /> : null}
        {result?.ok ? <ResultView kind={kind} value={result.value} /> : null}
      </article>
    </section>
  </main>
}

function EmptyResult() { return <div className="mt-4 grid min-h-64 place-items-center rounded-xl border border-dashed border-white/15 bg-black/30 p-6 text-center"><div><Radar className="mx-auto h-8 w-8 text-zinc-600" /><strong className="mt-3 block text-sm text-zinc-300">No analysis has run</strong><p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">Supply bounded local evidence. No placeholder event, track, match, decision, or release state is generated.</p></div></div> }
function IssuePanel({ title, issues }: { title: string; issues: readonly string[] }) { return <div className="mt-4 rounded-xl border border-red-300/20 bg-red-400/[.06] p-3"><div className="flex items-center gap-2 text-red-200"><AlertTriangle className="h-4 w-4" /><strong className="text-sm">{title}</strong></div><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-red-100/75">{issues.slice(0, 12).map((issue) => <li key={issue}>{issue}</li>)}</ul></div> }

function ResultView({ kind, value }: { kind: DefensiveToolKind; value: any }) {
  if (kind === "tracker") return <ResultShell state={`${value.tracks.length} track${value.tracks.length === 1 ? "" : "s"}`}><div className="grid gap-2">{value.tracks.map((track: any) => <ResultCard key={track.trackId} title={`${track.objectClass} · ${track.trackId}`} badge={track.state}><Metric label="Evidence" value={String(track.evidenceCount)} /><Metric label="Distance" value={`${Math.round(track.distanceM)} m`} /><Metric label="Uncertainty" value={`${Math.round(Math.max(...track.points.map((point: any) => point.uncertaintyM)))} m max`} /><p>{track.inference?.basis ?? "Single evidence record; no ordered association inferred."}</p></ResultCard>)}</div></ResultShell>
  if (kind === "fusion") return <ResultShell state={`${value.tracks.length} fusion group${value.tracks.length === 1 ? "" : "s"}`}><div className="grid gap-2">{value.tracks.map((track: any) => <ResultCard key={track.fusionId} title={`${track.objectClass} · ${track.fusionId}`} badge={track.state}><Metric label="Evidence" value={String(track.observations.length)} /><Metric label="Modalities" value={track.modalities.join(" · ")} /><Metric label="Uncertainty" value={`${Math.round(track.uncertaintyM)} m`} /><p>{track.basis}</p></ResultCard>)}</div></ResultShell>
  if (kind === "watchlist") return <ResultShell state={`${value.matches.length} evidence match${value.matches.length === 1 ? "" : "es"}`}><div className="grid gap-2">{value.matches.length ? value.matches.map((match: any) => <ResultCard key={`${match.ruleId}:${match.evidenceId}`} title={match.ruleId} badge="matched evidence"><Metric label="Metric" value={match.metric} /><Metric label="Observed" value={String(match.value)} /><Metric label="Threshold" value={String(match.threshold)} /><p>{match.provenance.sourceRef} · {match.evidenceId}</p></ResultCard>) : <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">The supplied evidence produced zero rule matches. This is an evaluated empty result, not proof that the broader environment is clear.</p>}</div></ResultShell>
  return <ResultShell state={value.state}><div className="grid gap-2"><ResultCard title="Metadata consistency" badge={value.state}><Metric label="Release authorization" value="No" />{value.blockers.map((item: string) => <p key={item} className="text-red-200">Blocker: {item}</p>)}{value.warnings.map((item: string) => <p key={item}>{item}</p>)}</ResultCard></div></ResultShell>
}
function ResultShell({ state, children }: { state: string; children: React.ReactNode }) { return <div className="mt-4"><div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[.06] p-3 text-emerald-200"><CheckCircle2 className="h-4 w-4" /><strong className="text-sm">{state}</strong></div>{children}</div> }
function ResultCard({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) { return <article className="rounded-xl border border-white/10 bg-white/[.035] p-3"><header className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold text-zinc-100">{title}</h3><span className="rounded-full border border-cyan-300/25 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-200">{badge}</span></header><div className="mt-3 grid grid-cols-2 gap-2">{children}</div></article> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-white/[.07] bg-black/30 p-2"><span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</span><strong className="mt-1 block break-words text-xs text-zinc-200">{value || "not supplied"}</strong></div> }
