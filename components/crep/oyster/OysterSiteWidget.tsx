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
import { X, ExternalLink, MapPin, Thermometer, Droplets, Wind, AlertTriangle } from "lucide-react"

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

  useEffect(() => {
    const onClick = (e: Event) => {
      const ce = e as CustomEvent<ClickDetail>
      if (ce.detail) setSite(ce.detail)
    }
    window.addEventListener("crep:oyster:site-click", onClick as any)
    // Legacy event from pre-expansion TijuanaStationWidget — still route here:
    window.addEventListener("crep:tijuana:station-click", onClick as any)
    return () => {
      window.removeEventListener("crep:oyster:site-click", onClick as any)
      window.removeEventListener("crep:tijuana:station-click", onClick as any)
    }
  }, [])

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

      {/* External agency links */}
      <div className="flex flex-col gap-1.5">
        {site.category === "plume" && (
          <a href="https://pfmweb.ucsd.edu" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-red-300 hover:text-red-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-red-400/30 transition-colors">
            <span>UCSD Pacific Forecast Model</span><ExternalLink className="w-3 h-3" />
          </a>
        )}
        {site.category === "crossborder" && (
          <a href="https://scripps.ucsd.edu/crossborderpollution" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-red-300 hover:text-red-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-red-400/30 transition-colors">
            <span>Scripps Cross-Border Pollution</span><ExternalLink className="w-3 h-3" />
          </a>
        )}
        {site.category === "emit" && (
          <a href="https://earth.jpl.nasa.gov/emit/data/data-portal/coverage-and-forecasts/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-orange-300 hover:text-orange-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-orange-400/30 transition-colors">
            <span>NASA EMIT Coverage + Forecasts</span><ExternalLink className="w-3 h-3" />
          </a>
        )}
        {site.category === "air-quality" && (
          <a href="https://www.sdapcd.org/content/sdapcd/about/tj-river-valley/tjrv-air-quality-monitoring.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-red-300 hover:text-red-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-red-400/30 transition-colors">
            <span>SDAPCD TJRV Dashboard</span><ExternalLink className="w-3 h-3" />
          </a>
        )}
        {site.category === "river-flow" && (
          <a href="https://waterdata.ibwc.gov/AQWebportal/Data/Dashboard/8" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-amber-300 hover:text-amber-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-amber-400/30 transition-colors">
            <span>USIBWC AQWebportal</span><ExternalLink className="w-3 h-3" />
          </a>
        )}
        {site.category === "mycosoft-project" && (
          <>
            <a href="https://mycodao.com/projects/project-oyster" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-teal-300 hover:text-teal-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-teal-400/30 transition-colors">
              <span>MYCODAO / Project Oyster</span><ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://trnerr.org" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-cyan-300 hover:text-cyan-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-cyan-400/30 transition-colors">
              <span>TJ River NERR</span><ExternalLink className="w-3 h-3" />
            </a>
          </>
        )}
        {site.category === "camera" && site.stream_url && (
          <a href={String(site.stream_url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-sky-300 hover:text-sky-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-sky-400/30 transition-colors">
            <span>Open {String(site.provider || "camera")} feed</span><ExternalLink className="w-3 h-3" />
          </a>
        )}
        {site.category === "inat-observation" && site.inat_url && (
          <a href={String(site.inat_url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[11px] text-lime-300 hover:text-lime-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-lime-400/30 transition-colors">
            <span>Open on iNaturalist</span><ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}
