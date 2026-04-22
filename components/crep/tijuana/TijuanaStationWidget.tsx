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
  // Apr 22, 2026 — Morgan: "Imperial Beach Pier — H₂S monitor has no
  // data why i gave you all live data sources you did not wire or code
  // them into live etl engine". Poll /api/crep/sdapcd/h2s for any open
  // SDAPCD air-quality station popup; refresh every 2 min.
  const [h2s, setH2s] = useState<{ h2s_ppb: number | null; observed_at: string | null; source: string } | null>(null)

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

  useEffect(() => {
    if (!station) { setH2s(null); return }
    const isSdapcd = String(station.id ?? "").toLowerCase().startsWith("sdapcd") ||
                     String(station.agency ?? "").toUpperCase().includes("SDAPCD") ||
                     String(station.param ?? "").toUpperCase() === "H2S"
    if (!isSdapcd) { setH2s(null); return }
    let cancelled = false
    const fetchH2s = async () => {
      try {
        const r = await fetch("/api/crep/sdapcd/h2s", { signal: AbortSignal.timeout(10_000) })
        if (!r.ok) return
        const j = await r.json()
        const mine = Array.isArray(j?.stations)
          ? j.stations.find((s: any) => String(s.id) === String(station.id))
          : null
        if (!cancelled && mine) setH2s({ h2s_ppb: mine.h2s_ppb, observed_at: mine.observed_at, source: mine.source })
      } catch { /* ignore */ }
    }
    fetchH2s()
    const iv = setInterval(fetchH2s, 120_000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [station?.id, station?.agency, station?.param])

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

        {/* Apr 22, 2026 — SDAPCD H₂S live. Morgan pointed us at 3 feeds:
              sdapcd.org TJRV page (PowerBI-gated, can't scrape)
              app.powerbigov.us (same)
              airborne.ucsd.edu/h2s (UCSD research page — PNG-only data)
            UCSD exposes matplotlib-rendered PNG charts (not JSON), but
            they auto-refresh every 5 min. Render them INLINE so data
            stays in the widget per the data-in-widget rule. Chart URLs:
              30 min: /wp-json/airborne/v1/30minutes
              12 hr:  /wp-json/airborne/v1/12hours
            Both are public, no auth, cache-busted via timestamp. */}
        {(() => {
          const isSdapcd = String(station.id ?? "").toLowerCase().startsWith("sdapcd") ||
                           String(station.agency ?? "").toUpperCase().includes("SDAPCD") ||
                           String(station.param ?? "").toUpperCase() === "H2S"
          if (!isSdapcd) return null
          // Force refresh every minute
          const bust = Math.floor(Date.now() / 60_000)
          return (
            <div className="px-3 pt-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-red-300/80 flex items-center gap-1">
                <Cloud className="w-3 h-3" /> H₂S · UCSD Airborne · live
              </div>
              <div className="bg-white rounded-lg overflow-hidden border border-red-500/30">
                <img
                  src={`/api/crep/sdapcd/h2s/chart?id=nestor_30m&t=${bust}`}
                  alt="UCSD H₂S Nestor — last 30 minutes"
                  className="w-full h-auto block"
                  loading="lazy"
                />
                <div className="text-[9px] text-gray-600 font-mono px-2 py-1">Nestor · last 30 min · 1-min avgs</div>
              </div>
              <div className="bg-white rounded-lg overflow-hidden border border-red-500/30">
                <img
                  src={`/api/crep/sdapcd/h2s/chart?id=coast_30m&t=${bust}`}
                  alt="UCSD H₂S IB Coast — last 30 minutes"
                  className="w-full h-auto block"
                  loading="lazy"
                />
                <div className="text-[9px] text-gray-600 font-mono px-2 py-1">IB Coast · last 30 min · 1-min avgs</div>
              </div>
              <div className="bg-white rounded-lg overflow-hidden border border-red-500/30">
                <img
                  src={`/api/crep/sdapcd/h2s/chart?id=nestor_12h&t=${bust}`}
                  alt="UCSD H₂S Nestor — last 12 hours"
                  className="w-full h-auto block"
                  loading="lazy"
                />
                <div className="text-[9px] text-gray-600 font-mono px-2 py-1">Nestor · last 12 hr · 5-min avgs</div>
              </div>
              {h2s?.h2s_ppb != null ? (
                <div className="bg-black/40 border border-red-500/20 rounded p-2 flex items-baseline justify-between">
                  <span className="text-[10px] uppercase text-gray-400">Latest numeric (via {h2s.source})</span>
                  <span className="text-xl font-bold tabular-nums text-red-300">
                    {Number(h2s.h2s_ppb).toFixed(1)}
                    <span className="text-[10px] text-gray-500 ml-1">ppb</span>
                  </span>
                </div>
              ) : null}
              <div className="text-[9px] text-gray-500 font-mono">
                Data: UCSD airborne.ucsd.edu/h2s · refreshes every 5 min
              </div>
            </div>
          )
        })()}

        {/* Apr 22, 2026 — data-in-widget: external Sources block removed.
            All station metrics/readings render inline above via the
            /api/crep/tijuana-estuary data pull. Source attribution is shown
            as a small badge in the header; no click-out links. */}
        {externalLinks.length ? (
          <div className="px-3 pt-2 pb-1">
            <div className="flex flex-wrap gap-1">
              {externalLinks.map((l) => {
                const host = (() => { try { return new URL(l.url).hostname } catch { return "source" } })()
                return (
                  <span
                    key={l.url}
                    className="inline-flex items-center gap-1 bg-black/40 border border-white/5 rounded px-1.5 py-0.5 text-[9px] text-cyan-300/70 font-mono"
                    title={l.label}
                  >
                    {host}
                  </span>
                )
              })}
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
