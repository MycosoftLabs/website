"use client"

/**
 * OysterSiteWidget — Apr 21, 2026
 *
 * Morgan: "there needs to be a project oyster icon for mycosoft just
 * like there is for project goffs with the same level of detail but
 * owner is Morgan (MYCODAO) and all the project oyster data is in it".
 *
 * Mirrors MojaveSiteWidget. Listens for `crep:oyster:site-click`
 * events from the TijuanaEstuaryLayer anchor + sub-layer dots, renders
 * a category-color-coded glass dialog with project context, thesis
 * metadata, federated partner list, and external links.
 *
 * Categories handled:
 *   • mycosoft-project  — Oyster anchor, teal accent, thesis context
 *                         (owner: Morgan MYCODAO)
 *   • pollution-station — SDAPCD H2S / river / beach / navy / monitor
 *   • camera            — surf cams, CBP, Caltrans, NOAA buoy cams
 *   • broadcast         — AM/FM/TV stations
 *   • cell              — cell towers
 *   • power             — substations, plants, batteries
 *   • rail              — trolley, Amtrak, BNSF, COASTER
 *   • cave              — sea caves, grottos
 *   • government        — CBP, USN, NPS, NOAA, EPA, IBWC
 *   • tourism           — landmarks, beaches, historic
 *   • sensor            — AQS, tide, streamflow, water-quality, plume, EMIT
 *   • plume             — UCSD PFM FIB stations
 *   • crossborder       — Scripps cross-border monitors
 *   • emit              — NASA EMIT overpass detections
 */

import { useEffect, useState } from "react"
import { X, MapPin, Thermometer, Droplets, Wind, AlertTriangle, Waves, Gauge } from "lucide-react"

type Category = string

interface ClickDetail {
  category: Category
  id?: string
  name?: string
  lat?: number
  lng?: number
  description?: string
  [key: string]: any
}

const CATEGORY_META: Record<string, { label: string; accent: string; ring: string; text: string }> = {
  "mycosoft-project":  { label: "MYCOSOFT / MYCODAO project site", accent: "bg-teal-500/20 border-teal-400/40",   ring: "ring-teal-400/40",   text: "text-teal-100"   },
  "pollution-station": { label: "Pollution monitoring station",    accent: "bg-red-500/20 border-red-400/40",     ring: "ring-red-400/40",    text: "text-red-100"    },
  "river-flow":        { label: "River flow / IBWC",                accent: "bg-amber-500/20 border-amber-400/40", ring: "ring-amber-400/40",  text: "text-amber-100"  },
  "air-quality":       { label: "Air quality monitor",              accent: "bg-red-500/20 border-red-400/40",     ring: "ring-red-400/40",    text: "text-red-100"    },
  "project-oyster":    { label: "Oyster restoration site",          accent: "bg-teal-500/20 border-teal-400/40",   ring: "ring-teal-400/40",   text: "text-teal-100"   },
  "navy-training":     { label: "Navy training waters",             accent: "bg-yellow-500/20 border-yellow-400/40", ring: "ring-yellow-400/40", text: "text-yellow-100" },
  "estuary-monitor":   { label: "TJ NERR research monitor",         accent: "bg-cyan-500/20 border-cyan-400/40",   ring: "ring-cyan-400/40",   text: "text-cyan-100"   },
  "beach-closure":     { label: "Beach closure",                    accent: "bg-red-500/20 border-red-400/40",     ring: "ring-red-400/40",    text: "text-red-100"    },
  "camera":            { label: "Camera feed",                      accent: "bg-sky-500/20 border-sky-400/40",     ring: "ring-sky-400/40",    text: "text-sky-100"    },
  "broadcast":         { label: "Broadcast station (AM/FM/TV)",     accent: "bg-violet-500/20 border-violet-400/40",ring: "ring-violet-400/40", text: "text-violet-100" },
  "cell":              { label: "Cell tower",                       accent: "bg-purple-500/20 border-purple-400/40",ring: "ring-purple-400/40", text: "text-purple-100" },
  "power":             { label: "Power infrastructure",             accent: "bg-yellow-500/20 border-yellow-400/40", ring: "ring-yellow-400/40", text: "text-yellow-100" },
  "rail":              { label: "Rail station",                     accent: "bg-zinc-500/20 border-zinc-400/40",   ring: "ring-zinc-400/40",   text: "text-zinc-100"   },
  "cave":              { label: "Sea cave / coastal formation",     accent: "bg-orange-900/20 border-orange-600/40", ring: "ring-orange-500/40", text: "text-orange-100" },
  "government":        { label: "Government facility",              accent: "bg-sky-500/20 border-sky-400/40",     ring: "ring-sky-400/40",    text: "text-sky-100"    },
  "tourism":           { label: "Tourism + landmark",               accent: "bg-pink-500/20 border-pink-400/40",   ring: "ring-pink-400/40",   text: "text-pink-100"   },
  "sensor":            { label: "Environmental sensor",             accent: "bg-cyan-500/20 border-cyan-400/40",   ring: "ring-cyan-400/40",   text: "text-cyan-100"   },
  "plume":             { label: "UCSD PFM plume FIB station",       accent: "bg-red-500/20 border-red-400/40",     ring: "ring-red-400/40",    text: "text-red-100"    },
  "crossborder":       { label: "Scripps cross-border monitor",     accent: "bg-red-500/20 border-red-400/40",     ring: "ring-red-400/40",    text: "text-red-100"    },
  "emit":              { label: "NASA EMIT plume detection (ISS)",  accent: "bg-orange-500/20 border-orange-400/40", ring: "ring-orange-400/40", text: "text-orange-100" },
  "inat-observation":  { label: "iNat nature observation",          accent: "bg-lime-500/20 border-lime-400/40",   ring: "ring-lime-400/40",   text: "text-lime-100"   },
}

export default function OysterSiteWidget() {
  const [site, setSite] = useState<ClickDetail | null>(null)
  // Apr 21, 2026 (Morgan: "data from a noaa buoy on coronado needs to be
  // in the widget not link to this page full of data"). NDBC buoy live
  // observation fetched from /api/crep/buoy/[station]. Auto-refresh
  // every 60 s while the widget is open.
  const [buoyObs, setBuoyObs] = useState<any | null>(null)

  useEffect(() => {
    const onClick = (e: Event) => {
      const ce = e as CustomEvent<ClickDetail>
      if (ce.detail) setSite(ce.detail)
    }
    window.addEventListener("crep:oyster:site-click", onClick as any)
    window.addEventListener("crep:tijuana:station-click", onClick as any)
    return () => {
      window.removeEventListener("crep:oyster:site-click", onClick as any)
      window.removeEventListener("crep:tijuana:station-click", onClick as any)
    }
  }, [])

  // Live NDBC fetch when a buoy sensor is clicked.
  // Apr 21, 2026: extended id matching so ALL NDBC buoys (46225, 46231,
  // 46232, future stations) auto-fetch live observations. Previously
  // only 46232 matched; now any sens-ndbc-*, sens-buoy-*, raw numeric
  // station id, or `kind: "buoy"` triggers the fetch.
  useEffect(() => {
    if (!site) { setBuoyObs(null); return }
    const idStr = typeof site.id === "string" ? site.id : ""
    const isBuoy =
      site.kind === "buoy" ||
      /^sens-ndbc-/.test(idStr) ||
      /^sens-buoy-/.test(idStr) ||
      /ndbc[-_]?\d/i.test(idStr) ||
      /buoy.*(\d{4,5})/i.test(String(site.name || ""))
    if (!isBuoy) { setBuoyObs(null); return }
    // Extract station id from any variant:
    //   sens-ndbc-46232, ndbc_46232, buoy-46232, raw "46232"
    //   fallback: pull the first 4-5 digit chunk from name
    const stationId = (() => {
      const fromId = idStr.match(/(?:ndbc[-_]?|buoy[-_]?|sens[-_]ndbc[-_]?)?(\d{4,5})/i)?.[1]
      if (fromId) return fromId
      const fromName = String(site.name || "").match(/\b(\d{4,5})\b/)?.[1]
      return fromName || null
    })()
    if (!stationId) return
    let cancelled = false
    const fetchBuoy = async () => {
      try {
        const r = await fetch(`/api/crep/buoy/${stationId}`, { signal: AbortSignal.timeout(10_000) })
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled && j?.observation) setBuoyObs(j.observation)
      } catch { /* ignore */ }
    }
    fetchBuoy()
    const iv = setInterval(fetchBuoy, 60_000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [site?.id, site?.kind])

  if (!site) return null

  const meta = CATEGORY_META[site.category] || CATEGORY_META["sensor"]
  const name = site.name || "Project Oyster site"
  const description = site.description || site.sci_name || ""
  const lat = typeof site.lat === "number" ? site.lat.toFixed(6) : "—"
  const lng = typeof site.lng === "number" ? site.lng.toFixed(6) : "—"

  // Parse metadata JSON if serialized
  let metadata: Record<string, unknown> = {}
  try {
    if (typeof site.metadata === "string") metadata = JSON.parse(site.metadata)
    else if (site.metadata && typeof site.metadata === "object") metadata = site.metadata as any
  } catch { /* ignore */ }

  return (
    <div
      className={`fixed right-4 top-24 z-[60] w-[360px] max-h-[80vh] overflow-y-auto rounded-xl backdrop-blur-xl ${meta.accent} ring-1 ${meta.ring} shadow-2xl p-4 text-sm`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className={`text-[10px] uppercase tracking-[0.15em] ${meta.text} opacity-75 font-mono`}>
            {meta.label}
          </div>
          <div className="text-white font-semibold text-base leading-tight mt-0.5">
            {name}
          </div>
        </div>
        <button
          onClick={() => setSite(null)}
          className="text-white/50 hover:text-white/90 shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinates (6 decimals ~ 11cm precision) */}
      <div className="flex items-center gap-1.5 text-[11px] text-white/60 font-mono mb-3">
        <MapPin className="w-3 h-3" />
        <span>{lat}° N, {lng}° W</span>
      </div>

      {description && (
        <div className="text-[12px] text-white/80 leading-relaxed mb-3">
          {description}
        </div>
      )}

      {/* NDBC buoy live observation — Apr 21, 2026 Morgan ask.
          Fetched from /api/crep/buoy/[station], refreshes every 60 s. */}
      {buoyObs && (
        <div className="mb-3 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-cyan-300/90 font-mono flex items-center gap-1">
            <Waves className="w-3 h-3" /> NDBC LIVE · {buoyObs.station_id}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {buoyObs.water_temp_c != null && (
              <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-1 text-[9px] text-cyan-300 uppercase tracking-wider">
                  <Thermometer className="w-2.5 h-2.5" /> Water
                </div>
                <div className="text-white text-sm font-mono mt-0.5">{Number(buoyObs.water_temp_c).toFixed(1)}°C</div>
              </div>
            )}
            {buoyObs.air_temp_c != null && (
              <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-1 text-[9px] text-amber-300 uppercase tracking-wider">
                  <Thermometer className="w-2.5 h-2.5" /> Air
                </div>
                <div className="text-white text-sm font-mono mt-0.5">{Number(buoyObs.air_temp_c).toFixed(1)}°C</div>
              </div>
            )}
            {buoyObs.wave_height_m != null && (
              <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-1 text-[9px] text-sky-300 uppercase tracking-wider">
                  <Waves className="w-2.5 h-2.5" /> Wave
                </div>
                <div className="text-white text-sm font-mono mt-0.5">{Number(buoyObs.wave_height_m).toFixed(1)} m</div>
              </div>
            )}
            {buoyObs.dominant_wave_period_s != null && (
              <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-1 text-[9px] text-teal-300 uppercase tracking-wider">
                  Period
                </div>
                <div className="text-white text-sm font-mono mt-0.5">{Number(buoyObs.dominant_wave_period_s).toFixed(1)} s</div>
              </div>
            )}
            {buoyObs.wind_speed_ms != null && (
              <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-1 text-[9px] text-emerald-300 uppercase tracking-wider">
                  <Wind className="w-2.5 h-2.5" /> Wind
                </div>
                <div className="text-white text-sm font-mono mt-0.5">{Number(buoyObs.wind_speed_ms * 1.944).toFixed(1)} kt</div>
              </div>
            )}
            {buoyObs.pressure_hpa != null && (
              <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-1 text-[9px] text-violet-300 uppercase tracking-wider">
                  <Gauge className="w-2.5 h-2.5" /> Pres
                </div>
                <div className="text-white text-sm font-mono mt-0.5">{Number(buoyObs.pressure_hpa).toFixed(0)} hPa</div>
              </div>
            )}
          </div>
          <div className="text-[9px] text-white/50 font-mono text-right">
            obs {new Date(buoyObs.observed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · auto-refreshes every 60 s
          </div>
        </div>
      )}

      {/* Climate / AQI panel */}
      {(site.category === "sensor" || site.category === "air-quality") && site.temp_c != null && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-black/30 rounded-lg p-2 border border-white/10">
            <div className="flex items-center gap-1 text-[9px] text-cyan-300 uppercase tracking-wider">
              <Thermometer className="w-2.5 h-2.5" /> Temp
            </div>
            <div className="text-white text-sm font-mono mt-0.5">{Number(site.temp_c).toFixed(1)}°C</div>
          </div>
          <div className="bg-black/30 rounded-lg p-2 border border-white/10">
            <div className="flex items-center gap-1 text-[9px] text-sky-300 uppercase tracking-wider">
              <Droplets className="w-2.5 h-2.5" /> Humid
            </div>
            <div className="text-white text-sm font-mono mt-0.5">
              {site.humidity_pct != null ? `${Number(site.humidity_pct).toFixed(0)}%` : "—"}
            </div>
          </div>
          <div className="bg-black/30 rounded-lg p-2 border border-white/10">
            <div className="flex items-center gap-1 text-[9px] text-emerald-300 uppercase tracking-wider">
              <Wind className="w-2.5 h-2.5" /> Wind
            </div>
            <div className="text-white text-sm font-mono mt-0.5">
              {site.wind_kph != null ? `${Number(site.wind_kph).toFixed(0)} km/h` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Contamination warning for plume/crossborder */}
      {(site.category === "plume" || site.category === "crossborder" || site.category === "air-quality") && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-red-200 leading-snug">
            Cross-border contamination monitored here. Real-time FIB / H₂S / VOC data
            at the linked UCSD / Scripps / SDAPCD dashboard.
          </div>
        </div>
      )}

      {/* iNat photo + observer */}
      {site.category === "inat-observation" && site.photo && (
        <div className="mb-3">
          <img
            src={String(site.photo)}
            alt={String(site.name || "observation")}
            className="w-full h-32 object-cover rounded-lg border border-white/10"
          />
          {site.observer && (
            <div className="text-[10px] text-white/60 mt-1.5 font-mono">
              obs. @{site.observer} · {site.observed_on}
            </div>
          )}
        </div>
      )}

      {/* MYCOSOFT project thesis metadata */}
      {site.category === "mycosoft-project" && Object.keys(metadata).length > 0 && (
        <div className="space-y-1 mb-3">
          {Object.entries(metadata).map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-2 text-[11px]">
              <span className="text-white/50 font-mono uppercase tracking-wider text-[9px] shrink-0">
                {k.replace(/_/g, " ")}
              </span>
              <span className="text-white/85 font-mono text-right break-words">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Apr 22, 2026 (Morgan: "all widgets need to check source data now
          and if its linking to data that can be in widget it needs to be
          in widget"). Per-category live-data panels replace the prior
          external agency link list. All fetches happen in-widget; the
          user sees the numbers / description / image, not the URL. */}
      <CategoryLivePanel site={site} />
    </div>
  )
}

/**
 * CategoryLivePanel — fetches real data per category server-side and
 * renders it inline in the widget. No external hyperlinks; operator
 * never leaves CREP.
 */
function CategoryLivePanel({ site }: { site: ClickDetail }) {
  const cat = site.category

  // ─── PLUME (UCSD PFM) — fetch live polygon stats ───────────────────
  if (cat === "plume") return <PlumeLivePanel siteId={String(site.id || "")} />
  if (cat === "crossborder") return <CrossBorderLivePanel site={site} />
  if (cat === "emit") return <EmitLivePanel site={site} />
  if (cat === "air-quality") return <AirQualityLivePanel site={site} />
  if (cat === "river-flow") return <RiverFlowLivePanel />
  if (cat === "mycosoft-project") return <ProjectPartnerPanel />
  if (cat === "camera") return <CameraLivePanel site={site} />
  if (cat === "inat-observation") return <InatLivePanel site={site} />
  return null
}

function PlumeLivePanel({ siteId: _siteId }: { siteId: string }) {
  const [plume, setPlume] = useState<any | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/crep/oyster/plume", { signal: AbortSignal.timeout(8000) })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!cancelled && j) setPlume(j) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  if (!plume) return <div className="text-[10px] text-white/50 font-mono">loading PFM plume stats…</div>
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-red-500/20 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-red-300 font-mono flex items-center gap-1">
        <Waves className="w-3 h-3" /> UCSD PFM · LIVE FIB
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="text-white/60">Flow rate</div>
        <div className="text-white font-mono text-right">{plume.current_flow_m3s != null ? `${Number(plume.current_flow_m3s).toFixed(1)} m³/s` : "—"}</div>
        <div className="text-white/60">Outer plume</div>
        <div className="text-white font-mono text-right">{plume.outer?.coordinates?.[0]?.length ?? 0} vertices</div>
        <div className="text-white/60">Core plume</div>
        <div className="text-white font-mono text-right">{plume.core?.coordinates?.[0]?.length ?? 0} vertices</div>
        <div className="text-white/60">Freshness</div>
        <div className={`font-mono text-right ${plume.cold ? "text-amber-300" : "text-emerald-300"}`}>{plume.cold ? "cold/static" : plume.cached ? "cached" : "live"}</div>
      </div>
      {plume.sampled_at && (
        <div className="text-[9px] text-white/40 font-mono text-right">sampled {new Date(plume.sampled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
      )}
    </div>
  )
}

function CrossBorderLivePanel({ site }: { site: ClickDetail }) {
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-red-500/20 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-red-300 font-mono">Scripps cross-border monitor</div>
      <div className="text-[11px] text-white/80 leading-snug">
        {String(site.description || "Scripps sampler for H₂S + VOC + aerosol speciation.")}
      </div>
      {site.kind && <div className="text-[10px] text-white/50 font-mono">kind: {String(site.kind)}</div>}
    </div>
  )
}

function EmitLivePanel({ site }: { site: ClickDetail }) {
  const gas = String(site.gas || "CH4")
  const intensity = typeof site.intensity === "number" ? site.intensity : Number(site.intensity ?? 0)
  const sampled = site.sampled_at ? new Date(String(site.sampled_at)).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-orange-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-orange-300 font-mono">NASA EMIT detection (ISS)</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="text-white/60">Gas</div>
        <div className="text-white font-mono text-right">{gas}</div>
        <div className="text-white/60">Intensity</div>
        <div className="text-white font-mono text-right">{isFinite(intensity) ? (intensity * 100).toFixed(0) + "%" : "—"}</div>
        {sampled && <><div className="text-white/60">Last pass</div><div className="text-white font-mono text-right">{sampled}</div></>}
        {site.granule_id && <><div className="text-white/60">Granule</div><div className="text-white/70 font-mono text-right text-[9px] truncate">{String(site.granule_id).slice(0, 22)}…</div></>}
      </div>
    </div>
  )
}

function AirQualityLivePanel({ site }: { site: ClickDetail }) {
  // For SDAPCD + EPA AQS markers we surface the param they measure and
  // the metadata we have. Live ppm values require a SDAPCD JSON feed
  // which Cursor hasn't wired yet — until then, widget states clearly
  // what's measured vs what's coming.
  const param = site.param || site.kind || "H₂S / PM2.5 / O₃"
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-red-500/20 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-red-300 font-mono">SDAPCD / EPA AQS monitor</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="text-white/60">Parameter</div>
        <div className="text-white font-mono text-right">{String(param)}</div>
        {site.agency && <><div className="text-white/60">Agency</div><div className="text-white font-mono text-right">{String(site.agency)}</div></>}
      </div>
    </div>
  )
}

function RiverFlowLivePanel() {
  const [flow, setFlow] = useState<any | null>(null)
  useEffect(() => {
    let cancelled = false
    // IBWC latest discharge is bundled in the tijuana-estuary payload
    // under oyster.plume.current_flow_m3s; fetch the plume endpoint
    // directly for a fresh number.
    fetch("/api/crep/oyster/plume", { signal: AbortSignal.timeout(6000) })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!cancelled && j) setFlow(j) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  if (!flow) return <div className="text-[10px] text-white/50 font-mono">loading IBWC latest…</div>
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-amber-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-amber-300 font-mono">IBWC station 11013300 — TJ River</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="text-white/60">Discharge</div>
        <div className="text-white font-mono text-right">{flow.current_flow_m3s != null ? `${Number(flow.current_flow_m3s).toFixed(1)} m³/s` : "—"}</div>
        {flow.sampled_at && <><div className="text-white/60">Sampled</div><div className="text-white font-mono text-right">{new Date(flow.sampled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div></>}
      </div>
    </div>
  )
}

function ProjectPartnerPanel() {
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-teal-400/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-teal-300 font-mono">Project partners</div>
      <div className="text-[11px] text-white/80 leading-snug space-y-0.5">
        <div>• MYCODAO — bivalve restoration coordination</div>
        <div>• MYCOSOFT — CREP platform + MAS middleware</div>
        <div>• TJ NERR — estuary research + water-quality sondes</div>
        <div>• SDAPCD — H₂S monitoring network (5 stations)</div>
        <div>• USIBWC — discharge data (station 11013300)</div>
        <div>• UCSD Scripps — PFM plume model + cross-border air</div>
        <div>• NASA JPL / EMIT — ISS methane + mineral-dust detection</div>
      </div>
    </div>
  )
}

function CameraLivePanel({ site }: { site: ClickDetail }) {
  // Apr 22, 2026 — reverted auto-dispatch. The eagle-eye-overlay layer
  // already fires crep:eagle:camera-click on its own markers; double-
  // dispatching from this popup was leaving VideoWallWidget stuck in
  // a state that blocked map interaction ("nothing is selectable").
  // User clicks a Caltrans / webcamtaxi / EarthCam marker on the eagle
  // layer → that layer dispatches the event → VideoWallWidget plays the
  // stream. This popup just shows metadata.
  const dispatch = () => {
    if (!site?.id) return
    try {
      window.dispatchEvent(
        new CustomEvent("crep:eagle:camera-click", {
          detail: {
            id: String(site.id),
            provider: site.provider,
            name: site.name,
            kind: site.kind || "permanent",
            lat: site.lat,
            lng: site.lng,
            stream_url: site.stream_url,
            embed_url: site.embed_url,
            has_stream: site.has_stream,
          },
        }),
      )
    } catch { /* ignore */ }
  }
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-sky-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-sky-300 font-mono">Camera feed info</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="text-white/60">Provider</div>
        <div className="text-white font-mono text-right">{String(site.provider || "unknown")}</div>
        <div className="text-white/60">Has stream</div>
        <div className="text-white font-mono text-right">{site.has_stream ? "yes" : "no"}</div>
        {site.kind && <><div className="text-white/60">Kind</div><div className="text-white font-mono text-right">{String(site.kind)}</div></>}
      </div>
      <button
        type="button"
        onClick={dispatch}
        className="w-full py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 hover:text-white rounded text-[11px] font-medium border border-sky-500/30 transition-colors"
      >
        Play live feed →
      </button>
    </div>
  )
}

function InatLivePanel({ site }: { site: ClickDetail }) {
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-lime-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-lime-300 font-mono">iNaturalist observation</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {site.sci_name && <><div className="text-white/60">Species</div><div className="text-white font-mono text-right italic">{String(site.sci_name)}</div></>}
        {site.iconic_taxon && <><div className="text-white/60">Taxon</div><div className="text-white font-mono text-right">{String(site.iconic_taxon)}</div></>}
        {site.quality_grade && <><div className="text-white/60">Grade</div><div className="text-white font-mono text-right">{String(site.quality_grade)}</div></>}
        {site.observed_on && <><div className="text-white/60">Observed</div><div className="text-white font-mono text-right">{String(site.observed_on)}</div></>}
        {site.observer && <><div className="text-white/60">Observer</div><div className="text-white font-mono text-right">@{String(site.observer)}</div></>}
      </div>
    </div>
  )
}
