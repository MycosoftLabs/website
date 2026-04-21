"use client"

/**
 * Tijuana Estuary station detail widget — Apr 20, 2026
 *
 * Morgan: "none of the project oyster of pollution icons are selectable
 * no widgets seen".
 *
 * Listens for `crep:tijuana:station-click` (dispatched by
 * tijuana-estuary-layer.tsx) and renders a floating glass dialog with:
 *   • Category-color-coded header (river-flow blue, air-quality red,
 *     project-oyster teal, navy-training amber, beach-closure red,
 *     estuary-monitor cyan)
 *   • Agency + name + location coordinates
 *   • Latest reading (when available — e.g. discharge in m³/s)
 *   • Full metadata grid
 *   • External links grouped at the bottom (PowerBI dashboard,
 *     report URL, MYCODAO project page, Navy Times article, etc.)
 *
 * Click outside or Escape closes. No iframes — info-only widget that
 * surfaces the public data the connector pulled.
 */

import { useEffect, useState } from "react"
import { X, MapPin, ExternalLink, Activity, AlertTriangle, Waves, Cloud, Sparkles } from "lucide-react"

type StationDetail = {
  id?: string
  name?: string
  agency?: string
  category?: string
  latest_value?: number | null
  latest_unit?: string | null
  measurement_count?: number
  // metadata fields are flattened onto properties — pick out the ones we know
  port_code?: string
  param?: string
  report_url?: string
  powerbi_dashboard?: string
  reference?: string
  facility?: string
  impact?: string
  closure_status?: string
  closure_days?: string | number
  reason?: string
  reef_type?: string
  partner?: string
  project?: string
  data_source?: string
  portal?: string
  dataset?: string
  latest_discharge_m3s?: number
  live_latest_m3s?: number
  live_observed_at?: string
  historical_records_loaded?: number
  // catch-all
  [k: string]: unknown
}

const CATEGORY_THEME: Record<string, { color: string; icon: typeof Activity; label: string }> = {
  "river-flow":      { color: "#0ea5e9", icon: Waves,          label: "RIVER FLOW" },
  "air-quality":     { color: "#dc2626", icon: Cloud,          label: "AIR QUALITY" },
  "project-oyster":  { color: "#14b8a6", icon: Waves,          label: "PROJECT OYSTER" },
  "navy-training":   { color: "#fbbf24", icon: AlertTriangle,  label: "NAVY TRAINING" },
  "beach-closure":   { color: "#dc2626", icon: AlertTriangle,  label: "BEACH CLOSURE" },
  "estuary-monitor": { color: "#22d3ee", icon: Sparkles,       label: "ESTUARY MONITOR" },
}

function isUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//i.test(v)
}

export default function TijuanaStationWidget() {
  const [station, setStation] = useState<StationDetail | null>(null)

  useEffect(() => {
    const onClick = (ev: any) => {
      const d = ev?.detail
      if (d) setStation(d as StationDetail)
    }
    window.addEventListener("crep:tijuana:station-click", onClick as any)
    const onEsc = (ev: KeyboardEvent) => { if (ev.key === "Escape") setStation(null) }
    window.addEventListener("keydown", onEsc)
    return () => {
      window.removeEventListener("crep:tijuana:station-click", onClick as any)
      window.removeEventListener("keydown", onEsc)
    }
  }, [])

  if (!station) return null

  const theme = CATEGORY_THEME[station.category || ""] || { color: "#22d3ee", icon: Activity, label: (station.category || "STATION").toUpperCase() }
  const Icon = theme.icon
  const externalLinks: { label: string; url: string }[] = []
  if (isUrl(station.report_url)) externalLinks.push({ label: "Provider report", url: station.report_url })
  if (isUrl(station.powerbi_dashboard)) externalLinks.push({ label: "PowerBI dashboard", url: station.powerbi_dashboard })
  if (isUrl(station.reference)) externalLinks.push({ label: "Reference", url: station.reference })
  if (isUrl(station.portal)) externalLinks.push({ label: "Portal", url: station.portal })

  // Stats grid — pick out known numeric/text fields to surface
  const fields: { label: string; value: string }[] = []
  if (station.facility) fields.push({ label: "Facility", value: String(station.facility) })
  if (station.param) fields.push({ label: "Parameter", value: String(station.param) })
  if (station.port_code) fields.push({ label: "CBP port code", value: String(station.port_code) })
  if (station.live_latest_m3s != null) fields.push({ label: "Live discharge", value: `${station.live_latest_m3s.toFixed(2)} m³/s` })
  else if (station.latest_discharge_m3s != null) fields.push({ label: "Latest discharge", value: `${station.latest_discharge_m3s.toFixed(2)} m³/s` })
  if (station.live_observed_at) fields.push({ label: "Observed at", value: String(station.live_observed_at) })
  if (station.measurement_count != null && station.measurement_count > 0) fields.push({ label: "Measurements (last 30 d)", value: String(station.measurement_count) })
  if (station.historical_records_loaded != null) fields.push({ label: "Historical records loaded", value: String(station.historical_records_loaded) })
  if (station.closure_status) fields.push({ label: "Closure status", value: String(station.closure_status) })
  if (station.closure_days != null) fields.push({ label: "Days closed", value: String(station.closure_days) })
  if (station.reason) fields.push({ label: "Reason", value: String(station.reason) })
  if (station.impact) fields.push({ label: "Impact", value: String(station.impact) })
  if (station.reef_type) fields.push({ label: "Reef type", value: String(station.reef_type) })
  if (station.partner) fields.push({ label: "Partner", value: String(station.partner) })
  if (station.project) fields.push({ label: "Project", value: String(station.project) })
  if (station.dataset) fields.push({ label: "Dataset", value: String(station.dataset) })
  if (station.data_source) fields.push({ label: "Data source", value: String(station.data_source) })

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center pointer-events-auto"
      onClick={() => setStation(null)}
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
      <div
        className="relative w-[420px] max-h-[88vh] overflow-y-auto rounded-2xl shadow-[0_0_60px_rgba(34,211,238,0.15)]"
        style={{
          background: "linear-gradient(155deg, rgba(8,16,32,0.92) 0%, rgba(10,22,40,0.94) 50%, rgba(7,14,28,0.96) 100%)",
          border: `1px solid ${theme.color}55`,
          backdropFilter: "blur(18px) saturate(1.2)",
          WebkitBackdropFilter: "blur(18px) saturate(1.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div
          className="h-[3px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${theme.color} 30%, ${theme.color} 70%, transparent 100%)`,
          }}
        />
        {/* Header */}
        <div className="flex items-start gap-3 p-3 border-b border-white/10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${theme.color}33`, boxShadow: `0 0 24px ${theme.color}66` }}
          >
            <Icon className="w-5 h-5" style={{ color: theme.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider font-bold" style={{ color: theme.color }}>{theme.label}</div>
            <div className="text-sm font-bold text-white mt-0.5">{station.name || "Tijuana Estuary station"}</div>
            <div className="text-[10px] text-cyan-300/80 font-mono mt-0.5">{station.agency || ""}</div>
            {station.id ? <div className="text-[9px] text-gray-500 font-mono mt-0.5">{station.id}</div> : null}
          </div>
          <button
            onClick={() => setStation(null)}
            className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Latest value (large) */}
        {station.latest_value != null && station.latest_unit ? (
          <div className="px-3 pt-3">
            <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex items-baseline justify-between">
              <span className="text-[10px] uppercase text-gray-400 tracking-wider">Latest reading</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: theme.color }}>
                {Number(station.latest_value).toFixed(2)}
                <span className="text-xs text-gray-500 ml-1">{station.latest_unit}</span>
              </span>
            </div>
          </div>
        ) : null}

        {/* Field grid */}
        {fields.length ? (
          <div className="px-3 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-cyan-300/70 mb-1.5">Details</div>
            <div className="grid grid-cols-2 gap-1.5">
              {fields.map((f) => (
                <div key={f.label} className="bg-black/40 rounded p-1.5 border border-white/5">
                  <div className="text-[9px] uppercase text-gray-500 tracking-wider truncate">{f.label}</div>
                  <div className="text-[11px] text-white truncate">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* External links */}
        {externalLinks.length ? (
          <div className="px-3 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-cyan-300/70 mb-1.5">Sources</div>
            <div className="space-y-1">
              {externalLinks.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-black/40 hover:bg-cyan-700/30 border border-white/5 hover:border-cyan-500/40 rounded p-1.5 text-[10px] text-cyan-300 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="flex-1 truncate">{l.label}</span>
                  <span className="text-gray-500 font-mono text-[9px] truncate">{new URL(l.url).hostname}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-3 py-2.5 mt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-gray-500 font-mono">
          <span className="flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            Tijuana Estuary
          </span>
          <span className="text-cyan-300/40">MYCODAO · MYCOSOFT</span>
        </div>
      </div>
    </div>
  )
}
