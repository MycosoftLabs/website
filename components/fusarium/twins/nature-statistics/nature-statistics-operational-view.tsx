"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity, Baby, Bird, Bot, Bug, CircleDot, Cpu, Database, Dna, Droplets, Fish,
  Gauge, Globe2, Leaf, Microscope, PawPrint, Plane, RefreshCw, Ship, Skull, Sprout,
  TrainFront, Users, Wind, Wrench, type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  buildNatureStatisticsSnapshot,
  createInitialNatureStatisticsSnapshot,
  NATURE_STATISTICS_SOURCES,
  type EvidenceMetric,
  type EvidenceRecord,
  type EvidenceState,
  type NatureStatisticsSnapshot,
  type SourceEvidence,
  type SourceFetchResult,
} from "@/lib/fusarium/twins/nature-statistics/operational-contract"

const INITIAL_SNAPSHOT_AT = "1970-01-01T00:00:00.000Z"
const REFRESH_INTERVAL_MS = 60_000
const READ_TIMEOUT_MS = 20_000
const COUNTER_ANIMATION_MS = 900
const PANEL = "rounded-xl border border-white/10 bg-black/55 shadow-[0_12px_40px_rgba(0,0,0,.28)] backdrop-blur-xl"

const STATE_LABEL: Record<EvidenceState, string> = {
  available: "Fresh", stale: "Stale", "verified-empty": "Empty", unbound: "Unbound", error: "Error",
}
const STATE_DOT: Record<EvidenceState, string> = {
  available: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]",
  stale: "bg-amber-400", "verified-empty": "bg-zinc-400", unbound: "bg-zinc-600", error: "bg-rose-400",
}
const STATE_TEXT: Record<EvidenceState, string> = {
  available: "text-emerald-300", stale: "text-amber-300", "verified-empty": "text-zinc-300",
  unbound: "text-zinc-500", error: "text-rose-300",
}

function formatValue(value: number | string | null): string {
  if (value == null || value === "") return "—"
  return typeof value === "number" ? value.toLocaleString() : value
}

function formatCompact(value: number | string | null): string {
  if (typeof value !== "number") return formatValue(value)
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function AnimatedEvidenceNumber({ value, compact = false }: { value: number | string | null; compact?: boolean }) {
  const [displayed, setDisplayed] = useState(value)
  const previous = useRef(value)

  useEffect(() => {
    const from = previous.current
    previous.current = value
    if (typeof from !== "number" || typeof value !== "number" || from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(value)
      return
    }
    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / COUNTER_ANIMATION_MS)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(from + (value - from) * eased)
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }
    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [value])

  const normalized = typeof displayed === "number" ? Math.round(displayed) : displayed
  return <>{compact ? formatCompact(normalized) : formatValue(normalized)}</>
}

function formatTime(value: string | null): string {
  if (!value || value === INITIAL_SNAPSHOT_AT) return "not observed"
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return "not observed"
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(parsed))
}

function stateMeta(metric: EvidenceMetric | EvidenceRecord | SourceEvidence) {
  return {
    "data-evidence-state": metric.state,
    "data-source": metric.source,
    "data-route": metric.endpoint,
    "data-observed-at": metric.observedAt || "",
    "data-updated-at": metric.updatedAt || "",
    "data-freshness": metric.freshness.state,
    "data-freshness-label": metric.freshness.label,
  }
}

function Status({ state, compact = false }: { state: EvidenceState; compact?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 font-bold uppercase tracking-[.12em]", compact ? "text-[8px]" : "text-[9px]", STATE_TEXT[state])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[state])} />
      {STATE_LABEL[state]}
    </span>
  )
}

function MetricCounter({ metric, icon: Icon, featured = false }: { metric: EvidenceMetric; icon: LucideIcon; featured?: boolean }) {
  return (
    <div
      className={cn("min-w-0 border-white/10 bg-white/[.035] px-3 py-2.5", featured && "col-span-2 bg-emerald-400/[.065] sm:col-span-1")}
      data-animated-evidence-value={typeof metric.value === "number" ? "source-transition" : "false"} {...stateMeta(metric)} title={`${metric.detail}\n${metric.endpoint}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-zinc-400">
          <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-400" /><span className="truncate">{metric.label}</span>
        </span>
        <Status state={metric.state} compact />
      </div>
      <div className="mt-2 flex min-w-0 items-end gap-1.5">
        <span className={cn("min-w-0 truncate font-mono font-semibold leading-none tabular-nums text-zinc-100", featured ? "text-3xl" : "text-2xl")}><AnimatedEvidenceNumber value={metric.value} /></span>
        <span className="mb-0.5 truncate text-[8px] uppercase text-zinc-500">{metric.unit}</span>
      </div>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2 text-[8px] text-zinc-500">
        <span className="min-w-0 truncate">{metric.source}</span><time className="shrink-0">{formatTime(metric.observedAt)}</time>
      </div>
    </div>
  )
}

function CompactMetric({ metric, icon: Icon }: { metric: EvidenceMetric; icon?: LucideIcon }) {
  return (
    <div
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-white/[.06] py-1.5 last:border-0"
      data-animated-evidence-value={typeof metric.value === "number" ? "source-transition" : "false"} {...stateMeta(metric)} title={`${metric.detail}\n${metric.endpoint}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {Icon ? <Icon className="h-3 w-3 shrink-0 text-emerald-400/80" /> : <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATE_DOT[metric.state])} />}
        <div className="min-w-0">
          <div className="truncate text-[10px] font-medium text-zinc-300">{metric.label}</div>
          <div className="flex min-w-0 gap-1.5 text-[8px] text-zinc-600"><span className="truncate">{metric.source}</span><span className="shrink-0">· {formatTime(metric.observedAt)}</span></div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-xs font-semibold tabular-nums text-zinc-100"><AnimatedEvidenceNumber value={metric.value} compact /> <span className="text-[7px] font-normal uppercase text-zinc-600">{metric.unit}</span></div>
        <Status state={metric.state} compact />
      </div>
    </div>
  )
}

function PanelHeader({ icon: Icon, title, meta }: { icon: LucideIcon; title: string; meta?: string }) {
  return (
    <div className="flex h-9 items-center justify-between gap-3 border-b border-white/[.07] px-3">
      <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-zinc-200"><Icon className="h-3.5 w-3.5 text-emerald-400" />{title}</h2>
      {meta ? <span className="truncate text-[8px] uppercase tracking-[.12em] text-zinc-600">{meta}</span> : null}
    </div>
  )
}

function MiniStat({ metric }: { metric: EvidenceMetric }) {
  return (
    <div className="min-w-0 px-3 py-2" data-animated-evidence-value={typeof metric.value === "number" ? "source-transition" : "false"} {...stateMeta(metric)} title={`${metric.detail}\n${metric.endpoint}`}>
      <div className="flex items-center justify-between gap-2"><span className="truncate text-[8px] font-bold uppercase tracking-[.13em] text-zinc-500">{metric.label}</span><Status state={metric.state} compact /></div>
      <div className="mt-1 truncate font-mono text-xl font-semibold tabular-nums text-zinc-100"><AnimatedEvidenceNumber value={metric.value} compact /> <span className="text-[8px] font-normal uppercase text-zinc-600">{metric.unit}</span></div>
      <div className="mt-1 truncate text-[8px] text-zinc-600">{formatTime(metric.observedAt)} · {metric.source}</div>
    </div>
  )
}

function CoverageRing({ sources }: { sources: SourceEvidence[] }) {
  const counts = sources.reduce<Record<EvidenceState, number>>((result, source) => { result[source.state] += 1; return result }, { available: 0, stale: 0, "verified-empty": 0, unbound: 0, error: 0 })
  const total = Math.max(sources.length, 1)
  const liveEnd = (counts.available / total) * 100
  const staleEnd = liveEnd + (counts.stale / total) * 100
  const emptyEnd = staleEnd + (counts["verified-empty"] / total) * 100
  const unboundEnd = emptyEnd + (counts.unbound / total) * 100
  const background = `conic-gradient(#34d399 0 ${liveEnd}%, #fbbf24 ${liveEnd}% ${staleEnd}%, #a1a1aa ${staleEnd}% ${emptyEnd}%, #3f3f46 ${emptyEnd}% ${unboundEnd}%, #fb7185 ${unboundEnd}% 100%)`
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-20 w-20 shrink-0 rounded-full p-[7px]" style={{ background }} aria-label="Source-state coverage chart">
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-black"><span className="font-mono text-xl font-semibold text-zinc-100">{counts.available}</span><span className="text-[7px] uppercase tracking-[.15em] text-zinc-600">fresh</span></div>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
        {(Object.keys(counts) as EvidenceState[]).map((state) => <div key={state} className="flex items-center justify-between gap-2"><Status state={state} compact /><span className="font-mono text-zinc-400">{counts[state]}</span></div>)}
      </div>
    </div>
  )
}

function SourceStrip({ sources }: { sources: SourceEvidence[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {sources.map((source) => (
        <div key={source.id} className="min-w-0 rounded border border-white/[.06] bg-white/[.025] px-2 py-1.5" data-source-state={source.state} {...stateMeta(source)} title={`${source.detail}\n${source.endpoint}`}>
          <div className="flex items-center gap-1"><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATE_DOT[source.state])} /><span className="truncate text-[8px] font-medium text-zinc-400">{source.label}</span></div>
          <div className="mt-0.5 truncate text-[7px] text-zinc-600">{formatTime(source.observedAt)}</div>
        </div>
      ))}
    </div>
  )
}

function RecentRuns({ records }: { records: EvidenceRecord[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between text-[8px] font-bold uppercase tracking-[.12em] text-zinc-600"><span>Recent run ledger</span><span>{records.length ? `${records.length} returned` : "No rows"}</span></div>
      {records.slice(0, 4).map((record) => (
        <div key={record.id} className="flex min-w-0 items-center gap-2 border-t border-white/[.05] py-1.5" {...stateMeta(record)}>
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATE_DOT[record.state])} /><span className="min-w-0 flex-1 truncate text-[9px] text-zinc-300">{record.title}</span><span className="shrink-0 text-[8px] uppercase text-zinc-600">{record.subtitle}</span><time className="shrink-0 text-[8px] text-zinc-600">{formatTime(record.observedAt)}</time>
        </div>
      ))}
      {!records.length ? <div className="border-t border-white/[.05] py-3 text-center text-[9px] text-zinc-700">No source-backed run rows</div> : null}
    </div>
  )
}

function AirReadings({ records }: { records: EvidenceRecord[] }) {
  if (!records.length) return <div className="py-2 text-[9px] text-zinc-700">No station readings</div>
  return (
    <div className="mt-1 grid gap-1 sm:grid-cols-2">
      {records.slice(0, 4).map((record) => (
        <div key={record.id} className="flex min-w-0 items-center gap-1.5 rounded bg-white/[.025] px-2 py-1" {...stateMeta(record)}>
          <Wind className="h-3 w-3 shrink-0 text-emerald-400" /><span className="min-w-0 flex-1 truncate text-[8px] text-zinc-500">{record.title} · {record.subtitle}</span><span className="shrink-0 font-mono text-[9px] text-zinc-200">{record.facts[0]?.value ?? "—"} <span className="text-[7px] text-zinc-600">{record.facts[0]?.unit}</span></span>
        </div>
      ))}
    </div>
  )
}

function MobilityColumn({ metric, icon: Icon, records }: { metric: EvidenceMetric; icon: LucideIcon; records: EvidenceRecord[] }) {
  return (
    <div className="min-w-0 px-3 py-2.5" data-animated-evidence-value={typeof metric.value === "number" ? "source-transition" : "false"} {...stateMeta(metric)} title={`${metric.detail}\n${metric.endpoint}`}>
      <div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-zinc-400"><Icon className="h-3.5 w-3.5 shrink-0 text-emerald-400" /><span className="truncate">{metric.label.replace(" rows returned", "")}</span></span><Status state={metric.state} compact /></div>
      <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-zinc-100"><AnimatedEvidenceNumber value={metric.value} compact /> <span className="text-[8px] font-normal uppercase text-zinc-600">{metric.unit}</span></div>
      <div className="mt-1 truncate text-[8px] text-zinc-600">{formatTime(metric.observedAt)} · {metric.source}</div>
      <div className="mt-2 space-y-1 border-t border-white/[.05] pt-1.5">
        {records.slice(0, 2).map((record) => <div key={record.id} className="flex min-w-0 justify-between gap-2 text-[8px]" {...stateMeta(record)}><span className="truncate text-zinc-400">{record.title}</span><span className="shrink-0 truncate text-zinc-600">{record.subtitle}</span></div>)}
        {!records.length ? <div className="text-[8px] text-zinc-700">No recent rows</div> : null}
      </div>
    </div>
  )
}

function kingdomIcon(label: string): LucideIcon {
  const name = label.toLowerCase()
  if (name.includes("plant")) return Sprout
  if (name.includes("fung")) return Leaf
  if (name.includes("bird")) return Bird
  if (name.includes("insect")) return Bug
  if (name.includes("animal") || name.includes("mammal")) return PawPrint
  if (name.includes("marine") || name.includes("fish")) return Fish
  if (name.includes("bacter") || name.includes("archaea")) return CircleDot
  if (name.includes("protist")) return Microscope
  return Dna
}

function KingdomTile({ metric, max }: { metric: EvidenceMetric; max: number }) {
  const Icon = kingdomIcon(metric.label)
  const numeric = typeof metric.value === "number" ? metric.value : 0
  const width = max > 0 ? Math.max(2, (numeric / max) * 100) : 0
  return (
    <div className="group min-w-0 overflow-hidden rounded-lg border border-white/[.07] bg-white/[.025] p-2.5 transition-colors hover:border-emerald-400/25 hover:bg-emerald-400/[.035]" data-animated-evidence-value={typeof metric.value === "number" ? "source-transition" : "false"} {...stateMeta(metric)} title={`${metric.detail}\n${metric.endpoint}`}>
      <div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-zinc-300"><Icon className="h-3.5 w-3.5 shrink-0 text-emerald-400" /><span className="truncate">{metric.label}</span></span><Status state={metric.state} compact /></div>
      <div className="mt-2 flex items-end justify-between gap-2"><span className="font-mono text-xl font-semibold tabular-nums text-zinc-100"><AnimatedEvidenceNumber value={metric.value} compact /></span><span className="text-[7px] uppercase text-zinc-600">{metric.unit}</span></div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${width}%` }} /></div>
      <div className="mt-1.5 flex min-w-0 justify-between gap-2 text-[7px] text-zinc-600"><span className="truncate">{metric.source}</span><time className="shrink-0">{formatTime(metric.observedAt)}</time></div>
    </div>
  )
}

async function readSource(source: (typeof NATURE_STATISTICS_SOURCES)[number], signal: AbortSignal): Promise<SourceFetchResult> {
  const receivedAt = () => new Date().toISOString()
  try {
    const response = await fetch(source.endpoint, { method: "GET", cache: "no-store", headers: { Accept: "application/json" }, signal })
    const raw = await response.text()
    let data: unknown = null
    let parseError: string | null = null
    if (raw) { try { data = JSON.parse(raw) as unknown } catch { parseError = "Source returned non-JSON." } }
    const bodyError = data && typeof data === "object" && !Array.isArray(data) ? String((data as Record<string, unknown>).error || "") : ""
    const ok = response.ok && !parseError && !bodyError
    return { id: source.id, endpoint: source.endpoint, ok, status: response.status, receivedAt: receivedAt(), data, error: ok ? null : parseError || bodyError || `HTTP ${response.status}` }
  } catch (error) {
    return { id: source.id, endpoint: source.endpoint, ok: false, status: 0, receivedAt: receivedAt(), data: null, error: error instanceof Error ? error.message : "Source read failed." }
  }
}

export function FusariumNatureStatisticsOperationalView() {
  const [snapshot, setSnapshot] = useState<NatureStatisticsSnapshot>(() => createInitialNatureStatisticsSnapshot(INITIAL_SNAPSHOT_AT))
  const [refreshing, setRefreshing] = useState(false)
  const [failureCount, setFailureCount] = useState(0)
  const activeController = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    activeController.current?.abort()
    const controller = new AbortController()
    activeController.current = controller
    setRefreshing(true)
    const timeout = window.setTimeout(() => controller.abort("Nature Statistics read timeout"), READ_TIMEOUT_MS)
    try {
      const results = await Promise.all(NATURE_STATISTICS_SOURCES.map((source) => readSource(source, controller.signal)))
      if (activeController.current !== controller) return
      setSnapshot(buildNatureStatisticsSnapshot(results, new Date().toISOString()))
      setFailureCount(results.filter((result) => !result.ok).length)
    } finally {
      window.clearTimeout(timeout)
      if (activeController.current === controller) { activeController.current = null; setRefreshing(false) }
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
    return () => { window.clearInterval(timer); activeController.current?.abort(); activeController.current = null }
  }, [refresh])

  const headline = useMemo(() => {
    const order = ["world-population", "births", "deaths", "taxa", "observations"]
    return [...snapshot.headline].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }, [snapshot.headline])
  const headlineIcons: Record<string, LucideIcon> = { "world-population": Users, births: Baby, deaths: Skull, taxa: Dna, observations: Activity }
  const maxKingdom = Math.max(0, ...snapshot.kingdoms.map((metric) => typeof metric.value === "number" ? metric.value : 0))
  const refreshed = snapshot.generatedAt !== INITIAL_SNAPSHOT_AT

  return (
    <main className="relative min-h-full w-full overflow-x-hidden bg-black text-zinc-200" data-fusarium-nature-statistics data-layout="edge-to-edge-responsive-compact">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.10),transparent_30%),linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:auto,24px_24px,24px_24px]" />
      <div className="relative mx-0 flex w-full max-w-none flex-col gap-3 px-3 py-3 xl:px-4">
        <header className={cn(PANEL, "flex min-w-0 flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between")}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10"><Globe2 className="h-5 w-5 text-emerald-400" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">Nature Statistics</h1><span className="rounded border border-emerald-400/20 bg-emerald-400/[.07] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-emerald-300">Source evidence</span></div>
              <p className="mt-0.5 truncate text-[9px] uppercase tracking-[.12em] text-zinc-600 sm:text-[10px]">MINDEX + MYCA · observed values only · no extrapolation</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 text-right text-[8px] text-zinc-600 sm:flex-none"><div>{refreshed ? `Updated ${formatTime(snapshot.generatedAt)}` : "Awaiting first read"}</div><div>{failureCount ? `${failureCount} sources unavailable` : refreshing ? "Reading sources" : "Sources synchronized"}</div></div>
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing} className="h-8 border-emerald-400/20 bg-black/60 px-2.5 text-[9px] uppercase tracking-wide text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"><RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />{refreshing ? "Reading" : "Refresh"}</Button>
          </div>
        </header>

        <section className={cn(PANEL, "grid overflow-hidden grid-cols-2 divide-x divide-y divide-white/[.07] sm:grid-cols-5 sm:divide-y-0")} aria-label="Global counters">
          {headline.map((metric) => <MetricCounter key={metric.id} metric={metric} icon={headlineIcons[metric.id] || Gauge} featured={metric.id === "world-population"} />)}
        </section>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)]">
          <section className={cn(PANEL, "min-w-0 overflow-hidden")}>
            <PanelHeader icon={Bot} title="Humans, Machines & Agents" meta="MYCA run ledger · AI · OpenClaw · x402" />
            <div className="grid divide-y divide-white/[.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">{snapshot.agents.slice(0, 3).map((metric) => <MiniStat key={metric.id} metric={metric} />)}</div>
            <div className="grid min-w-0 gap-3 border-t border-white/[.07] p-3 md:grid-cols-[minmax(14rem,.75fr)_minmax(0,1.25fr)]"><div className="min-w-0">{snapshot.agents.slice(3).map((metric) => <CompactMetric key={metric.id} metric={metric} icon={metric.id.includes("x402") ? Activity : Cpu} />)}</div><RecentRuns records={snapshot.agentRunRecords} /></div>
          </section>
          <section className={cn(PANEL, "min-w-0 overflow-hidden")}>
            <PanelHeader icon={Database} title="Source coverage" meta={`${snapshot.sources.length} passive adapters`} />
            <div className="p-3"><CoverageRing sources={snapshot.sources} /><SourceStrip sources={snapshot.sources} /></div>
          </section>
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-2">
          <section className={cn(PANEL, "min-w-0 overflow-hidden")}>
            <PanelHeader icon={Wind} title="Environmental Quality" meta="air · ground · water" />
            <div className="grid min-w-0 divide-y divide-white/[.07] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <div className="min-w-0 p-3"><div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.13em] text-zinc-300"><Wind className="h-3.5 w-3.5 text-emerald-400" />Air</span><Status state={snapshot.air[0]?.state || "unbound"} compact /></div>{snapshot.air.map((metric) => <CompactMetric key={metric.id} metric={metric} />)}<AirReadings records={snapshot.airRecords} /></div>
              <div className="min-w-0 p-3"><div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.13em] text-zinc-300"><Sprout className="h-3.5 w-3.5 text-emerald-400" />Ground</span><Status state={snapshot.ground[0]?.state || "unbound"} compact /></div>{snapshot.ground.map((metric) => <CompactMetric key={metric.id} metric={metric} />)}</div>
              <div className="min-w-0 p-3"><div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.13em] text-zinc-300"><Droplets className="h-3.5 w-3.5 text-emerald-400" />Water</span><Status state={snapshot.water[0]?.state || "unbound"} compact /></div>{snapshot.water.map((metric) => <CompactMetric key={metric.id} metric={metric} />)}</div>
            </div>
          </section>
          <section className={cn(PANEL, "min-w-0 overflow-hidden")}>
            <PanelHeader icon={TrainFront} title="Humans & Machines in Motion" meta="returned observations · not global estimates" />
            <div className="grid min-w-0 grid-cols-2 divide-x divide-y divide-white/[.07] lg:grid-cols-4 lg:divide-y-0">
              <MobilityColumn metric={snapshot.transport[0]} icon={TrainFront} records={snapshot.landRecords} /><MobilityColumn metric={snapshot.transport[1]} icon={Plane} records={snapshot.aircraftRecords} /><MobilityColumn metric={snapshot.transport[2]} icon={Ship} records={snapshot.vesselRecords} /><MobilityColumn metric={snapshot.transport[3]} icon={Cpu} records={snapshot.droneRecords} />
            </div>
          </section>
        </div>

        <section className={cn(PANEL, "min-w-0 overflow-hidden")}>
          <PanelHeader icon={Leaf} title="Species & Kingdoms" meta="MINDEX bio.kingdom_stats" />
          <div className="grid min-w-0 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{snapshot.kingdoms.map((metric) => <KingdomTile key={metric.id} metric={metric} max={maxKingdom} />)}</div>
        </section>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,.8fr)]">
          <section className={cn(PANEL, "min-w-0 overflow-hidden")}><PanelHeader icon={Gauge} title="Human & Machine Impact" meta="audited inventories only" /><div className="grid min-w-0 px-3 py-1 sm:grid-cols-2 sm:gap-x-5 xl:grid-cols-3">{snapshot.impact.map((metric) => <CompactMetric key={metric.id} metric={metric} icon={Gauge} />)}</div></section>
          <section className={cn(PANEL, "min-w-0 overflow-hidden")}><PanelHeader icon={Wrench} title="Adapter readiness" meta={`${snapshot.requiredAdapters.length} source gaps`} /><div className="flex min-w-0 flex-wrap gap-1.5 p-3">{snapshot.requiredAdapters.map((adapter) => <span key={adapter.id} className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded border border-white/[.07] bg-white/[.025] px-2 py-1 text-[8px] text-zinc-500" title={`${adapter.requirement}\n${adapter.endpoint}\n${adapter.source}`} data-adapter-gap={adapter.id}><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" /><span className="truncate">{adapter.label}</span></span>)}</div></section>
        </div>
      </div>
    </main>
  )
}
