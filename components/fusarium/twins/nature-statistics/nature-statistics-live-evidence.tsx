"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, Bot, Car, CloudSun, Database, Droplets, MapPin, Plane, RefreshCw, Ship, Sprout, Users, Wind } from "lucide-react"
import { Button } from "@/components/ui/button"
import { countRows, normalizeAqi, normalizeImportedEvidence, type LiveReading, type LiveState } from "@/lib/fusarium/twins/nature-statistics/live-evidence"

type Snapshot = { receivedAt: string; air: LiveReading[]; environment: any; agents: any; mas: any; population: any; mobility: Record<string, any> }
const GLASS = "rounded-2xl border border-white/15 bg-black/55 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_20px_60px_rgba(0,0,0,.36)] backdrop-blur-2xl"
const stateColor: Record<LiveState, string> = { live: "text-emerald-300", stale: "text-amber-300", empty: "text-zinc-400", unbound: "text-zinc-500", error: "text-rose-300" }

function format(value: number | string | null) {
  if (value == null || value === "") return "—"
  if (typeof value !== "number") return value
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function observed(value: string | null) {
  if (!value) return "not observed"
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value
}

function Stat({ reading, accent = "emerald" }: { reading: LiveReading; accent?: "emerald" | "cyan" | "amber" | "violet" }) {
  const colors = { emerald: "border-emerald-400/25 bg-emerald-400/10", cyan: "border-cyan-400/25 bg-cyan-400/10", amber: "border-amber-400/25 bg-amber-400/10", violet: "border-violet-400/25 bg-violet-400/10" }
  return <div className={`min-w-0 rounded-xl border p-3 ${colors[accent]}`} data-live-state={reading.state} title={`${reading.detail}\n${reading.source}`}>
    <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-zinc-400"><span className="truncate">{reading.label}</span><span className={stateColor[reading.state]}>{reading.state}</span></div>
    <div className="mt-2 truncate font-mono text-3xl font-semibold tabular-nums text-white">{format(reading.value)} <span className="text-xs font-normal text-zinc-400">{reading.unit}</span></div>
    <div className="mt-2 truncate text-[10px] text-zinc-500">{reading.source} · {observed(reading.observedAt)}</div>
  </div>
}

function ImportedEvidence({ domain, readings, onReadings }: { domain: "soil" | "water"; readings: LiveReading[]; onReadings: (value: LiveReading[]) => void }) {
  const load = async (file: File | undefined) => {
    if (!file) return
    try { onReadings(normalizeImportedEvidence(JSON.parse(await file.text()), domain, new Date().toISOString())) } catch { onReadings([]) }
  }
  return <div className={`${GLASS} p-4`}>
    <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.14em] text-zinc-100">{domain === "soil" ? <Sprout className="h-5 w-5 text-amber-300" /> : <Droplets className="h-5 w-5 text-cyan-300" />}{domain === "soil" ? "Ground & soil evidence" : "Water quality evidence"}</h3><span className="text-[10px] uppercase text-zinc-500">{readings.length ? `${readings.length} supplied` : "unbound"}</span></div>
    <p className="mt-2 text-xs text-zinc-400">{domain === "soil" ? "SoilGrids REST is officially paused. Import verified local measurements; no substitute score is invented." : "Import bounded lab or field measurements. Empty means no verified water-quality contract is bound."}</p>
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/[.05] px-3 py-2 text-xs text-zinc-200 hover:bg-white/[.08]"><Database className="h-4 w-4" />Import JSON<input className="hidden" type="file" accept="application/json" onChange={(event) => load(event.target.files?.[0])} /></label>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{readings.length ? readings.slice(0, 6).map((reading) => <Stat key={reading.id} reading={reading} accent={domain === "soil" ? "amber" : "cyan"} />) : <Stat reading={{ id: domain, label: domain === "soil" ? "Verified soil measurements" : "Verified water measurements", value: null, unit: "", state: "unbound", source: "operator import", observedAt: null, detail: "No evidence supplied" }} accent={domain === "soil" ? "amber" : "cyan"} />}</div>
  </div>
}

async function json(url: string) { const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } }); const data = await response.json().catch(() => null); return { ok: response.ok, data } }

export function NatureStatisticsLiveEvidence() {
  const [lat, setLat] = useState("32.7157"), [lng, setLng] = useState("-117.1611")
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [loading, setLoading] = useState(false)
  const [soil, setSoil] = useState<LiveReading[]>([]), [water, setWater] = useState<LiveReading[]>([])
  const refresh = useCallback(async () => {
    const latitude = Number(lat), longitude = Number(lng); if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
    setLoading(true); const receivedAt = new Date().toISOString(); const delta = .12
    const urls = [`/api/environment/aqi?lat=${latitude}&lng=${longitude}`, `/api/crep/viewport-environment?bbox=${longitude-delta},${latitude-delta},${longitude+delta},${latitude+delta}&zoom=10`, "/api/global-agents", "/api/mas/agents", "/api/natureos/population", "/api/oei/opensky", "/api/oei/aisstream", "/api/crep/transit/vehicles", "/api/crep/mycosoft-devices"]
    const result = await Promise.all(urls.map((url) => json(url).catch(() => ({ ok: false, data: null }))))
    setSnapshot({ receivedAt, air: result[0].ok ? normalizeAqi(result[0].data, receivedAt) : [{ id: "aqi", label: "Air quality index", value: null, unit: "AQI", state: "error", source: "/api/environment/aqi", observedAt: null, detail: "Same-origin source unavailable" }], environment: result[1].data, agents: result[2].data, mas: result[3].data, population: result[4].data, mobility: { aircraft: result[5], vessels: result[6], transit: result[7], devices: result[8] } })
    setLoading(false)
  }, [lat, lng])
  useEffect(() => { refresh(); const id = setInterval(refresh, 60_000); return () => clearInterval(id) }, [refresh])
  const metrics = useMemo(() => {
    const at = snapshot?.receivedAt || null, pop = snapshot?.population || {}, agents = snapshot?.agents || {}, mas = snapshot?.mas || {}
    return [
      { id: "population", label: "World population", value: typeof pop.population === "number" ? pop.population : null, unit: "people", state: pop.population ? "live" : "unbound", source: "population estimate feed", observedAt: at, detail: "Estimate clock, not a census measurement" },
      { id: "births", label: "Births today", value: typeof pop.birthsToday === "number" ? pop.birthsToday : null, unit: "estimated", state: pop.birthsToday != null ? "live" : "unbound", source: "population estimate feed", observedAt: at, detail: "Rate-derived estimate" },
      { id: "mas", label: "MAS registered agents", value: typeof mas.totalRegistered === "number" ? mas.totalRegistered : null, unit: "registered", state: mas.totalRegistered != null ? "live" : "unbound", source: String(mas.source || "/api/mas/agents"), observedAt: mas.timestamp || at, detail: "Registry count; not proof all agents are executing" },
      { id: "active", label: "MAS active agents", value: typeof mas.activeCount === "number" ? mas.activeCount : null, unit: "active", state: mas.activeCount != null ? "live" : "unbound", source: String(mas.source || "/api/mas/agents"), observedAt: mas.timestamp || at, detail: "Current same-origin registry status" },
      { id: "x402", label: "x402 tracked services", value: agents.x402?.trackedServices ?? null, unit: "services", state: agents.sources?.x402_direct_services?.ok ? "live" : "unbound", source: agents.sources?.x402_direct_services?.ok ? "x402.direct registry" : "global-agent telemetry", observedAt: agents.sources?.x402_direct_services?.lastSeen || at, detail: "Tracked service registry, not a global agent estimate" },
      { id: "networks", label: "x402 networks", value: agents.x402?.networks ?? null, unit: "networks", state: agents.sources?.x402_direct_services?.ok ? "live" : "unbound", source: "x402.direct registry", observedAt: agents.sources?.x402_direct_services?.lastSeen || at, detail: "Distinct networks in returned registry" },
    ] as LiveReading[]
  }, [snapshot])
  const mobility = snapshot ? [
    ["aircraft", "Aircraft rows", Plane, "cyan"], ["vessels", "Vessel rows", Ship, "emerald"], ["transit", "Transit rows", Car, "amber"], ["devices", "Mycosoft devices", Bot, "violet"],
  ] as const : []
  return <section className="mx-3 mb-8 mt-6 space-y-4 sm:mx-4 xl:mx-5" data-fusarium-nature-statistics-live-evidence>
    <div className={`${GLASS} overflow-hidden p-4`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold uppercase tracking-[.16em] text-white"><Activity className="h-5 w-5 text-emerald-300" />Live evidence expansion</h2><p className="mt-1 text-xs text-zinc-400">Same-origin, read-only sources. Values retain live, empty, stale, error, and unbound meaning.</p></div><Button variant="outline" onClick={refresh} disabled={loading} className="border-emerald-400/25 bg-emerald-400/10 text-emerald-200"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div>
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3"><MapPin className="mb-2 h-5 w-5 text-emerald-300" /><label className="text-[10px] uppercase text-zinc-400">Latitude<input value={lat} onChange={(e) => setLat(e.target.value)} className="mt-1 block w-36 rounded border border-white/15 bg-black/60 px-2 py-2 font-mono text-sm text-white" /></label><label className="text-[10px] uppercase text-zinc-400">Longitude<input value={lng} onChange={(e) => setLng(e.target.value)} className="mt-1 block w-36 rounded border border-white/15 bg-black/60 px-2 py-2 font-mono text-sm text-white" /></label><span className="mb-2 text-[10px] text-zinc-500">Operator-selected viewport; defaults to San Diego and can be changed without persistence.</span></div>
    </div>
    <div className="grid gap-4 xl:grid-cols-2"><div className={`${GLASS} p-4`}><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.14em] text-zinc-100"><Wind className="h-5 w-5 text-cyan-300" />Air quality at selected location</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{snapshot?.air.map((reading) => <Stat key={reading.id} reading={reading} accent="cyan" />) || <Stat reading={{ id: "air", label: "Air evidence", value: null, unit: "", state: "unbound", source: "/api/environment/aqi", observedAt: null, detail: "Awaiting refresh" }} accent="cyan" />}</div></div><div className={`${GLASS} p-4`}><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.14em] text-zinc-100"><CloudSun className="h-5 w-5 text-emerald-300" />Environmental context</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><Stat reading={{ id: "humidity", label: "Relative humidity", value: snapshot?.environment?.weather?.current?.relative_humidity_2m ?? null, unit: snapshot?.environment?.weather?.units?.relative_humidity_2m || "%", state: snapshot?.environment?.weather?.current ? "live" : "unbound", source: "viewport environment / Open-Meteo", observedAt: snapshot?.receivedAt || null, detail: "Selected viewport weather context" }} /><Stat reading={{ id: "features", label: "Environmental features", value: [snapshot?.environment?.features?.water, snapshot?.environment?.features?.ecosystems, snapshot?.environment?.features?.geology].reduce((sum: number, value: unknown) => sum + (Array.isArray(value) ? value.length : 0), 0), unit: "features", state: snapshot?.environment?.features?.status === "live" ? "live" : "empty", source: "viewport environment / OpenStreetMap", observedAt: snapshot?.receivedAt || null, detail: "Mapped water, ecosystem, and geology features; not a quality score" }} /></div></div></div>
    <div className="grid gap-4 xl:grid-cols-2"><ImportedEvidence domain="soil" readings={soil} onReadings={setSoil} /><ImportedEvidence domain="water" readings={water} onReadings={setWater} /></div>
    <div className={`${GLASS} p-4`}><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.14em] text-zinc-100"><Users className="h-5 w-5 text-violet-300" />Human & agentic activity</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{metrics.map((reading, index) => <Stat key={reading.id} reading={reading} accent={index < 2 ? "cyan" : "violet"} />)}</div></div>
    <div className={`${GLASS} p-4`}><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.14em] text-zinc-100"><Car className="h-5 w-5 text-amber-300" />Machine, mobility & device evidence</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{mobility.map(([id, label, Icon, accent]) => { const result = snapshot!.mobility[id]; const value = result.ok ? countRows(result.data) : null; return <div key={id} className="relative"><Icon className="absolute right-3 top-3 z-10 h-5 w-5 text-white/30" /><Stat reading={{ id, label, value, unit: "returned", state: !result.ok ? "error" : value === 0 ? "empty" : value == null ? "unbound" : "live", source: `/api/${id === "aircraft" ? "oei/opensky" : id === "vessels" ? "oei/aisstream" : id === "transit" ? "crep/transit/vehicles" : "crep/mycosoft-devices"}`, observedAt: snapshot!.receivedAt, detail: "Rows returned by the same-origin read contract; not a global fleet estimate" }} accent={accent} /></div> })}</div></div>
  </section>
}
