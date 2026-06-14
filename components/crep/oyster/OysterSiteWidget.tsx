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
import LiveAQIWidget from "@/components/crep/LiveAQIWidget"

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
  // Jun 13, 2026 (Morgan): the sensor card must anchor OVER its map icon and
  // ride the map like the species/device popups — not dock to the right edge
  // behind the MYCA panel. Project the site lng/lat to screen via the shared
  // MapLibre instance (window.__crep_map) and re-project on every camera change.
  const [anchor, setAnchor] = useState<{ x: number; y: number; visible: boolean } | null>(null)

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

  // Anchor the card over the clicked icon and follow the map on pan/zoom.
  useEffect(() => {
    if (!site || typeof site.lat !== "number" || typeof site.lng !== "number") { setAnchor(null); return }
    const map = (window as any).__crep_map
    if (!map?.project) { setAnchor(null); return }
    const update = () => {
      try {
        const p = map.project([site.lng as number, site.lat as number])
        const canvas = map.getCanvas?.()
        const w = canvas?.clientWidth ?? window.innerWidth
        const h = canvas?.clientHeight ?? window.innerHeight
        const visible = p.x >= -40 && p.y >= -40 && p.x <= w + 40 && p.y <= h + 40
        setAnchor({ x: p.x, y: p.y, visible })
      } catch { setAnchor(null) }
    }
    update()
    map.on("move", update); map.on("zoom", update); map.on("rotate", update); map.on("pitch", update)
    return () => {
      try { map.off("move", update); map.off("zoom", update); map.off("rotate", update); map.off("pitch", update) } catch { /* map gone */ }
    }
  }, [site?.lat, site?.lng])

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
      className={`fixed z-[2100] w-[360px] max-h-[80vh] overflow-y-auto rounded-xl backdrop-blur-xl ${meta.accent} ring-1 ${meta.ring} shadow-2xl p-4 text-sm ${anchor ? "" : "right-4 top-24"}`}
      style={anchor ? {
        left: anchor.x,
        top: anchor.y,
        // Sit just right of the icon; flip to the left near the right screen edge so the card never spills off.
        transform: anchor.x > (typeof window !== "undefined" ? window.innerWidth - 380 : 1200) ? "translate(-372px, -50%)" : "translate(16px, -50%)",
        opacity: anchor.visible ? 1 : 0,
        pointerEvents: anchor.visible ? "auto" : "none",
      } : undefined}
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
  const live = site.live as { value?: number; unit?: string; parameter?: string; label?: string; color?: string } | undefined

  if (live && typeof live.value === "number" && Number.isFinite(live.value)) {
    return (
      <div className="bg-black/30 rounded-lg p-2.5 border border-emerald-500/30 space-y-1.5">
        <div className="text-[9px] uppercase tracking-[0.15em] text-emerald-300 font-mono">Live reading</div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="text-white/60">{live.parameter || "Value"}</div>
          <div className="text-white font-mono text-right" style={{ color: live.color || undefined }}>
            {live.value.toFixed(live.unit === "AQI" || live.unit === "ppb" ? 0 : 1)} {live.unit}
          </div>
          {live.label && (
            <>
              <div className="text-white/60">Status</div>
              <div className="text-white font-mono text-right text-[10px]">{live.label}</div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── PLUME (UCSD PFM) — fetch live polygon stats ───────────────────
  if (cat === "plume") return <PlumeLivePanel siteId={String(site.id || "")} />
  if (cat === "crossborder") return <CrossBorderLivePanel site={site} />
  if (cat === "emit") return <EmitLivePanel site={site} />
  if (cat === "air-quality") return <AirQualityLivePanel site={site} />
  if (cat === "river-flow") return <RiverFlowLivePanel />
  if (cat === "mycosoft-project") return <ProjectPartnerPanel />
  if (cat === "camera") return <CameraLivePanel site={site} />
  if (cat === "inat-observation") return <InatLivePanel site={site} />
  if (cat === "government" && isSanYsidroPointOfEntry(site)) return <BorderWaitTimesPanel />
  // Apr 22, 2026 — Morgan: "all aqs all enviornmental sensor needs
  // live data in the widget streamed into the widget not links and
  // not just labels but actual aqs and other sensor data live in
  // widget" (EPA AQS Point Loma monitor had no body). The `sensor`
  // category was previously rendering null. LiveSensorPanel dispatches
  // on kind/param to render the right live feed — AirNow for
  // air-quality-ish kinds, buoy for tide / wave, streamflow for
  // USGS — so every environmental sensor has a live payload inside
  // the widget instead of a label.
  if (cat === "sensor") return <LiveSensorPanel site={site} />
  return null
}

function isSanYsidroPointOfEntry(site: ClickDetail): boolean {
  const id = String(site.id || "").toLowerCase()
  const name = String(site.name || "").toLowerCase()
  const agency = String(site.agency || "").toLowerCase()
  return id === "gov-cbp-sanysidro" || (agency === "cbp" && /san ysidro/.test(name))
}

function BorderWaitTimesPanel() {
  const [payload, setPayload] = useState<any | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const fetchWaits = async () => {
      try {
        const r = await fetch("/api/crep/border-wait-times?port=san-ysidro", {
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        if (!cancelled) {
          setPayload(j)
          setError("")
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "wait-time feed unavailable")
      }
    }
    fetchWaits()
    const iv = setInterval(fetchWaits, 60_000)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [])

  if (error && !payload) {
    return (
      <div className="bg-black/30 rounded-lg p-2.5 border border-amber-500/30 space-y-1.5">
        <div className="text-[9px] uppercase tracking-[0.15em] text-amber-300 font-mono">CBP border wait times</div>
        <div className="text-[11px] text-amber-100/80">Live feed unavailable: {error}</div>
      </div>
    )
  }

  const crossings = Array.isArray(payload?.crossings) ? payload.crossings : []
  if (!crossings.length) {
    return (
      <div className="bg-black/30 rounded-lg p-2.5 border border-sky-500/30 space-y-1.5">
        <div className="text-[9px] uppercase tracking-[0.15em] text-sky-300 font-mono">CBP border wait times</div>
        <div className="text-[11px] text-white/60">Loading San Ysidro live crossing times...</div>
      </div>
    )
  }

  const generatedAt = payload?.generated_at
    ? new Date(payload.generated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null

  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-sky-500/30 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[9px] uppercase tracking-[0.15em] text-sky-300 font-mono">CBP border wait times</div>
        <div className="text-[9px] text-white/45 font-mono">{generatedAt ? `pulled ${generatedAt}` : "live"}</div>
      </div>
      <div className="space-y-2">
        {crossings.map((crossing: any) => (
          <div key={crossing.port_number || crossing.display_name} className="rounded-lg border border-white/10 bg-slate-950/60 p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-white">{crossing.display_name || crossing.port_name}</div>
                <div className="text-[9px] text-white/45 font-mono">{crossing.hours || "hours unknown"} · {crossing.date || ""} {crossing.time || ""}</div>
              </div>
              <div className={`rounded px-1.5 py-0.5 text-[9px] font-mono ${String(crossing.port_status).toLowerCase() === "open" ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>
                {crossing.port_status || "Unknown"}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              {(crossing.lane_groups || []).filter(showBorderLane).map((lane: any) => (
                <div key={`${crossing.port_number}-${lane.mode}-${lane.lane_type}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[10px]">
                  <div className="text-white/65 truncate">{lane.label}</div>
                  <div className={`font-mono ${waitTone(lane.delay_minutes, lane.operational_status)}`}>{formatWait(lane)}</div>
                  <div className="text-white/40 font-mono">{lane.lanes_open != null ? `${lane.lanes_open} open` : lane.operational_status || "n/a"}</div>
                </div>
              ))}
            </div>
            {crossing.construction_notice && (
              <div className="mt-1.5 text-[9px] text-amber-200/80">{crossing.construction_notice}</div>
            )}
          </div>
        ))}
      </div>
      <div className="text-[9px] text-white/40 font-mono text-right">
        Source: CBP Border Wait Times · auto-refreshes every 60 s
      </div>
    </div>
  )
}

function showBorderLane(lane: any): boolean {
  return lane?.delay_minutes != null || lane?.lanes_open != null || !!lane?.operational_status
}

function formatWait(lane: any): string {
  const status = String(lane?.operational_status || "").toLowerCase()
  if (lane?.delay_minutes != null) return `${Number(lane.delay_minutes).toFixed(0)} min`
  if (/closed/.test(status)) return "closed"
  if (/pending/.test(status)) return "pending"
  return "n/a"
}

function waitTone(delay: unknown, status: unknown): string {
  const statusText = String(status || "").toLowerCase()
  if (/closed|pending/.test(statusText)) return "text-amber-300"
  const minutes = typeof delay === "number" ? delay : Number(delay)
  if (!Number.isFinite(minutes)) return "text-white/60"
  if (minutes <= 15) return "text-emerald-300"
  if (minutes <= 60) return "text-amber-300"
  return "text-rose-300"
}

function LiveSensorPanel({ site }: { site: ClickDetail }) {
  const kind = String(site.kind || site.param || "").toLowerCase()
  const cat = String(site.category || "").toLowerCase()
  const idStr = String(site.id || "")
  const hasCoords = typeof site.lat === "number" && typeof site.lng === "number"

  if (kind === "buoy" || /ndbc|sens-buoy|sens-ndbc/.test(idStr)) {
    return <BuoyMiniPanel site={site} />
  }
  if (kind === "tide" || /coops|9410/.test(idStr)) {
    return <TideMiniPanel site={site} />
  }
  if (kind === "streamflow" || /usgs|1101/.test(idStr)) {
    return <StreamflowMiniPanel site={site} />
  }
  if (cat === "river-flow" || kind === "river-flow" || idStr.startsWith("ibwc")) {
    return <RiverFlowLivePanel />
  }
  if (kind === "plume") return <PlumeLivePanel siteId={idStr} />
  if (kind === "crossborder") return <CrossBorderLivePanel site={site} />
  if (kind === "emit") return <EmitLivePanel site={site} />
  if (kind === "h2s" || /sdapcd|h2s/.test(idStr) || /h2s/.test(kind)) {
    return <H2SLivePanel site={site} />
  }
  if (/aqs|aqi|pm2|pm10|ozone|o3|no2|so2|co|ambient|air/.test(kind) || cat === "air-quality") {
    return <AirQualityLivePanel site={site} />
  }
  if (hasCoords) {
    return (
      <div className="space-y-2">
        <div className="text-[9px] uppercase tracking-[0.15em] text-cyan-300 font-mono">Environmental sensor</div>
        <LiveAQIWidget lat={Number(site.lat)} lng={Number(site.lng)} radiusMi={25} title="EPA AirNow · nearest" />
      </div>
    )
  }
  return null
}

function H2SLivePanel({ site }: { site: ClickDetail }) {
  const [reading, setReading] = useState<{ h2s_ppb: number; observed_at?: string | null } | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/crep/sdapcd/h2s", { signal: AbortSignal.timeout(10_000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.stations) return
        const id = String(site.id || "")
        const match =
          j.stations.find((s: any) => String(s.id) === id) ||
          j.stations.find((s: any) => {
            if (typeof site.lat !== "number" || typeof site.lng !== "number") return false
            const d = (s.lat - site.lat) ** 2 + (s.lng - site.lng) ** 2
            return d < 0.002
          })
        if (match && typeof match.h2s_ppb === "number") {
          setReading({ h2s_ppb: match.h2s_ppb, observed_at: match.observed_at })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [site.id, site.lat, site.lng])

  if (!reading) {
    return <div className="text-[10px] text-white/50 font-mono">No live H₂S reading for this monitor.</div>
  }
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-red-500/20 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-red-300 font-mono">SDAPCD H₂S · live</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="text-white/60">H₂S</div>
        <div className="text-white font-mono text-right">{reading.h2s_ppb.toFixed(1)} ppb</div>
        {reading.observed_at && (
          <>
            <div className="text-white/60">Observed</div>
            <div className="text-white font-mono text-right text-[10px]">{reading.observed_at}</div>
          </>
        )}
      </div>
    </div>
  )
}

function BuoyMiniPanel({ site }: { site: ClickDetail }) {
  const [obs, setObs] = useState<any | null>(null)
  useEffect(() => {
    const stationId =
      site.station_id ||
      String(site.id || "").match(/(\d{4,5})/)?.[1]
    if (!stationId) return
    let cancelled = false
    fetch(`/api/crep/buoy/${stationId}`, { signal: AbortSignal.timeout(10_000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.observation) setObs(j.observation) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [site.id, site.station_id])

  if (!obs) return <div className="text-[10px] text-white/50 font-mono">Loading NDBC buoy…</div>
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-cyan-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-cyan-300 font-mono">NDBC buoy · live</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {obs.water_temp_c != null && (
          <>
            <div className="text-white/60">Water temp</div>
            <div className="text-white font-mono text-right">{Number(obs.water_temp_c).toFixed(1)}°C</div>
          </>
        )}
        {obs.wave_height_m != null && (
          <>
            <div className="text-white/60">Wave height</div>
            <div className="text-white font-mono text-right">{Number(obs.wave_height_m).toFixed(1)} m</div>
          </>
        )}
        {obs.wind_speed_ms != null && (
          <>
            <div className="text-white/60">Wind</div>
            <div className="text-white font-mono text-right">{Number(obs.wind_speed_ms).toFixed(1)} m/s</div>
          </>
        )}
      </div>
    </div>
  )
}

function TideMiniPanel({ site }: { site: ClickDetail }) {
  const [tide, setTide] = useState<{ value: number; observed_at?: string } | null>(null)
  useEffect(() => {
    const station = site.station_id || String(site.id || "").match(/941\d{4}/)?.[0]
    if (!station) return
    let cancelled = false
    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${station}&product=water_level&datum=MLLW&units=english&time_zone=lst_ldt&format=json`
    fetch(url, { signal: AbortSignal.timeout(8_000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return
        const row = j?.data?.[j.data.length - 1]
        const value = Number(row?.v)
        if (Number.isFinite(value)) setTide({ value, observed_at: row?.t })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [site.id, site.station_id])

  if (!tide) return <div className="text-[10px] text-white/50 font-mono">No live tide reading.</div>
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-blue-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-blue-300 font-mono">NOAA CO-OPS · tide</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="text-white/60">Water level</div>
        <div className="text-white font-mono text-right">{tide.value.toFixed(2)} ft MLLW</div>
      </div>
    </div>
  )
}

function StreamflowMiniPanel({ site }: { site: ClickDetail }) {
  const [flow, setFlow] = useState<{ value: number; observed_at?: string } | null>(null)
  useEffect(() => {
    const siteId = site.station_id || String(site.id || "").match(/110\d{5}/)?.[0]
    if (!siteId) return
    let cancelled = false
    fetch(`https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${siteId}&parameterCd=00060&siteStatus=all`, {
      signal: AbortSignal.timeout(8_000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return
        const values = j?.value?.timeSeries?.[0]?.values?.[0]?.value
        const latest = Array.isArray(values) ? [...values].reverse().find((v: any) => v?.value && v.value !== "-999999") : null
        const value = Number(latest?.value)
        if (Number.isFinite(value)) setFlow({ value, observed_at: latest?.dateTime })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [site.id, site.station_id])

  if (!flow) return <div className="text-[10px] text-white/50 font-mono">No live streamflow reading.</div>
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-amber-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-amber-300 font-mono">USGS streamflow · live</div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="text-white/60">Discharge</div>
        <div className="text-white font-mono text-right">{flow.value.toFixed(1)} ft³/s</div>
      </div>
    </div>
  )
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
  // Apr 22, 2026 — Morgan: "all aqi widgets even ones we added for
  // project oyster and goffs need live data in widget no refresh
  // needed". LiveAQIWidget pulls current EPA AirNow readings for the
  // nearest reporting monitor and auto-refreshes every 10 min, so this
  // no longer shows stale / placeholder data.
  const param = site.param || site.kind || "H₂S / PM2.5 / O₃"
  const hasCoords = typeof site.lat === "number" && typeof site.lng === "number"
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-red-500/20 space-y-2">
      <div className="text-[9px] uppercase tracking-[0.15em] text-red-300 font-mono">SDAPCD / EPA AQS monitor</div>
      {hasCoords && (
        <LiveAQIWidget lat={Number(site.lat)} lng={Number(site.lng)} radiusMi={25} title="EPA AirNow · live" />
      )}
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
