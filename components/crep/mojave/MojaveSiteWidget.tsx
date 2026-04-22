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
import { X, MapPin, Thermometer, Droplets, Wind, Mountain } from "lucide-react"
import LiveAQIWidget from "@/components/crep/LiveAQIWidget"

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

      {/* Apr 22, 2026 (Morgan: "all data will be within its widgets live
          including video streams"). External agency links removed. All
          data surfaces inline via category-specific panels below. */}
      <MojaveCategoryPanel site={site} />

      {/* Apr 22, 2026 — Morgan: "all aqi widgets even ones we added for
          project oyster and goffs need live data in widget no refresh
          needed". LiveAQIWidget auto-refreshes via useAirNowAQI hook
          every 10 min. Rendered for any Mojave site with valid coords. */}
      {typeof site.lat === "number" && typeof site.lng === "number" && (
        <div className="mt-3">
          <LiveAQIWidget lat={site.lat} lng={site.lng} radiusMi={50} title="Air Quality (EPA AirNow)" />
        </div>
      )}
    </div>
  )
}

function MojaveCategoryPanel({ site }: { site: ClickDetail }) {
  if (site.category === "climate") return <MojaveClimateLivePanel stationId={String(site.id || "")} />
  if (site.category === "inat-observation") return <MojaveInatInfoPanel site={site} />
  if (site.category === "wilderness") return <MojaveWildernessInfoPanel site={site} />
  if (site.category === "mycosoft-project") return <MojaveProjectInfoPanel />
  return null
}

function MojaveClimateLivePanel({ stationId }: { stationId: string }) {
  const [obs, setObs] = useState<any | null>(null)
  useEffect(() => {
    if (!stationId) return
    let cancelled = false
    // Use the existing mojave aggregator which already pulls NWS observations
    // for the 3 ASOS stations. One round-trip, same data as external link.
    fetch("/api/crep/mojave", { signal: AbortSignal.timeout(8000) })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (cancelled || !j) return
        const station = (j.climate_stations || []).find((s: any) => s.id === stationId)
        if (station?.observation) setObs(station.observation)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [stationId])
  if (!obs) return (
    <div className="text-[10px] text-white/50 font-mono bg-black/30 rounded-lg p-2 border border-white/10">
      station {stationId} — NWS observation not available (RAWS/COOP stations don&apos;t publish via api.weather.gov)
    </div>
  )
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-cyan-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-cyan-300 font-mono">NWS live · {stationId}</div>
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        {obs.temp_c != null && <div className="bg-black/40 rounded p-1.5 border border-white/10"><div className="text-[8px] text-cyan-300/80 uppercase">Temp</div><div className="text-white font-mono">{Number(obs.temp_c).toFixed(1)}°C</div></div>}
        {obs.humidity_pct != null && <div className="bg-black/40 rounded p-1.5 border border-white/10"><div className="text-[8px] text-sky-300/80 uppercase">Humid</div><div className="text-white font-mono">{Number(obs.humidity_pct).toFixed(0)}%</div></div>}
        {obs.wind_kph != null && <div className="bg-black/40 rounded p-1.5 border border-white/10"><div className="text-[8px] text-emerald-300/80 uppercase">Wind</div><div className="text-white font-mono">{Number(obs.wind_kph).toFixed(0)} km/h</div></div>}
        {obs.pressure_pa != null && <div className="bg-black/40 rounded p-1.5 border border-white/10"><div className="text-[8px] text-violet-300/80 uppercase">Pres</div><div className="text-white font-mono">{(Number(obs.pressure_pa) / 100).toFixed(0)} hPa</div></div>}
        {obs.visibility_m != null && <div className="bg-black/40 rounded p-1.5 border border-white/10"><div className="text-[8px] text-amber-300/80 uppercase">Vis</div><div className="text-white font-mono">{(Number(obs.visibility_m) / 1000).toFixed(1)} km</div></div>}
      </div>
      {obs.description && <div className="text-[10px] text-white/70 italic">&ldquo;{String(obs.description)}&rdquo;</div>}
      {obs.ts && <div className="text-[9px] text-white/40 font-mono text-right">obs {new Date(obs.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>}
    </div>
  )
}

function MojaveInatInfoPanel({ site }: { site: ClickDetail }) {
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

function MojaveWildernessInfoPanel({ site }: { site: ClickDetail }) {
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-amber-500/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-amber-300 font-mono flex items-center gap-1">
        <Mountain className="w-3 h-3" /> NPS MOJA wilderness POI
      </div>
      <div className="text-[11px] text-white/80 leading-snug">
        {String(site.description || "Mojave National Preserve wilderness landmark — NPS-managed, within MOJA unit boundary.")}
      </div>
      <div className="text-[9px] text-white/50 font-mono">
        Unit: Mojave National Preserve (MOJA) · 1,600,000 acres · California east of I-15/I-40
      </div>
    </div>
  )
}

function MojaveProjectInfoPanel() {
  return (
    <div className="bg-black/30 rounded-lg p-2.5 border border-teal-400/30 space-y-1.5">
      <div className="text-[9px] uppercase tracking-[0.15em] text-teal-300 font-mono">Project partners</div>
      <div className="text-[11px] text-white/80 leading-snug space-y-0.5">
        <div>• MYCOSOFT — biz-dev vertical thesis (Garret)</div>
        <div>• NPS MOJA — Mojave National Preserve coordination</div>
        <div>• BLM Needles Field Office — east Mojave land admin</div>
        <div>• UC Granite Mountains Research Center — field science</div>
        <div>• NWS / NOAA — live climate observations (KEED / KDAG / KIFP)</div>
      </div>
    </div>
  )
}
