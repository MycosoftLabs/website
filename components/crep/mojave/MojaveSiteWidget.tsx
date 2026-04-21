"use client"

/**
 * MojaveSiteWidget — Apr 21, 2026
 *
 * Listens for `crep:mojave:site-click` events dispatched by
 * MojavePreserveLayer and renders a category-color-coded glass-morphism
 * dialog with site context, metadata, external links, and (for climate
 * stations) the latest NWS observation.
 *
 * Categories handled:
 *   • mycosoft-project  — Goffs anchor, teal accent, thesis context
 *   • wilderness        — amber accent, NPS description
 *   • climate           — cyan accent, latest temp/humidity/wind
 *   • inat-observation  — green accent, iNat photo + observer link
 */

import { useEffect, useState } from "react"
import { X, ExternalLink, MapPin, Thermometer, Droplets, Wind } from "lucide-react"

type Category = "mycosoft-project" | "wilderness" | "climate" | "inat-observation"

interface ClickDetail {
  category: Category | string
  id?: string
  name?: string
  lat?: number
  lng?: number
  description?: string
  [key: string]: any
}

const CATEGORY_META: Record<string, { label: string; accent: string; ring: string; text: string }> = {
  "mycosoft-project": { label: "MYCOSOFT project site", accent: "bg-teal-500/20 border-teal-400/40",  ring: "ring-teal-400/40",  text: "text-teal-100" },
  "wilderness":       { label: "Wilderness POI",        accent: "bg-amber-500/20 border-amber-400/40", ring: "ring-amber-400/40", text: "text-amber-100" },
  "climate":          { label: "Climate station",       accent: "bg-cyan-500/20 border-cyan-400/40",   ring: "ring-cyan-400/40",  text: "text-cyan-100" },
  "inat-observation": { label: "iNat observation",      accent: "bg-lime-500/20 border-lime-400/40",   ring: "ring-lime-400/40",  text: "text-lime-100" },
}

export default function MojaveSiteWidget() {
  const [site, setSite] = useState<ClickDetail | null>(null)

  useEffect(() => {
    const onClick = (e: Event) => {
      const ce = e as CustomEvent<ClickDetail>
      if (ce.detail) setSite(ce.detail)
    }
    window.addEventListener("crep:mojave:site-click", onClick as any)
    return () => window.removeEventListener("crep:mojave:site-click", onClick as any)
  }, [])

  if (!site) return null

  const meta = CATEGORY_META[site.category] || CATEGORY_META["wilderness"]
  const name = site.name || "Unknown site"
  const description = site.description || site.sci_name || ""
  const lat = typeof site.lat === "number" ? site.lat.toFixed(4) : "—"
  const lng = typeof site.lng === "number" ? site.lng.toFixed(4) : "—"

  // Parse metadata JSON if serialized (MapLibre feature properties are
  // always string→string after going through the click event path).
  let metadata: Record<string, unknown> = {}
  try {
    if (typeof site.metadata === "string") metadata = JSON.parse(site.metadata)
    else if (site.metadata && typeof site.metadata === "object") metadata = site.metadata as any
  } catch { /* ignore */ }

  return (
    <div
      className={`fixed right-4 top-24 z-[60] w-[360px] rounded-xl backdrop-blur-xl ${meta.accent} ring-1 ${meta.ring} shadow-2xl p-4 text-sm`}
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

      {/* Coordinates */}
      <div className="flex items-center gap-1.5 text-[11px] text-white/60 font-mono mb-3">
        <MapPin className="w-3 h-3" />
        <span>{lat}° N, {lng}° W</span>
      </div>

      {description && (
        <div className="text-[12px] text-white/80 leading-relaxed mb-3">
          {description}
        </div>
      )}

      {/* Climate station observation panel */}
      {site.category === "climate" && site.temp_c != null && (
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
            <div key={k} className="flex items-center justify-between text-[11px]">
              <span className="text-white/50 font-mono uppercase tracking-wider text-[9px]">
                {k.replace(/_/g, " ")}
              </span>
              <span className="text-white/85 font-mono">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Agency / external links */}
      <div className="flex flex-col gap-1.5">
        {site.category === "climate" && site.id && (
          <a
            href={`https://api.weather.gov/stations/${site.id}/observations`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-[11px] text-cyan-300 hover:text-cyan-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-cyan-400/30 transition-colors"
          >
            <span>NWS observations · {site.id}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {site.category === "inat-observation" && site.inat_url && (
          <a
            href={String(site.inat_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-[11px] text-lime-300 hover:text-lime-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-lime-400/30 transition-colors"
          >
            <span>Open on iNaturalist</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {site.category === "wilderness" && (
          <a
            href={`https://www.nps.gov/moja`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-[11px] text-amber-300 hover:text-amber-200 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10 hover:border-amber-400/30 transition-colors"
          >
            <span>Mojave National Preserve · NPS</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}
