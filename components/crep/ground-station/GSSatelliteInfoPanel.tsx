"use client"

/**
 * Ground Station Satellite Info Panel for CREP
 *
 * Detailed satellite information popup/panel shown when a satellite
 * is selected in the CREP map. Adapted from the ground-station
 * satellite-info.jsx component.
 */

import { useState } from "react"
import {
  Satellite,
  Globe,
  Compass,
  ArrowUp,
  ArrowDown,
  Minus,
  Target,
  Radio,
  Eye,
  EyeOff,
  Crosshair,
  ExternalLink,
  X,
  Activity,
  Gauge,
  Signal,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SatelliteDetail {
  norad_id: number
  name: string
  tle1: string
  tle2: string
  operator?: string
  countries?: string
  status?: string
  launched?: string
  website?: string
  // Computed position
  lat: number
  lon: number
  alt: number
  velocity: number
  az: number
  el: number
  range: number
  trend: "rising" | "falling" | "stable" | "peak"
  is_visible: boolean
  // Transmitters
  transmitters?: Array<{
    id: string
    description?: string
    downlink_low?: number
    downlink_high?: number
    mode?: string
    status: string
    alive?: boolean
  }>
}

interface GSSatelliteInfoPanelProps {
  satellite: SatelliteDetail | null
  onClose: () => void
  onTrack: (noradId: number) => void
  onStopTrack: () => void
  isTracking: boolean
  className?: string
}

export function GSSatelliteInfoPanel({
  satellite,
  onClose,
  onTrack,
  onStopTrack,
  isTracking,
  className,
}: GSSatelliteInfoPanelProps) {
  const [showTransmitters, setShowTransmitters] = useState(false)

  if (!satellite) return null

  const trendLabel = {
    rising: { icon: <ArrowUp className="w-3 h-3" />, color: "text-green-400", label: "Rising" },
    falling: { icon: <ArrowDown className="w-3 h-3" />, color: "text-red-400", label: "Setting" },
    peak: { icon: <Target className="w-3 h-3" />, color: "text-yellow-400", label: "Peak" },
    stable: { icon: <Minus className="w-3 h-3" />, color: "text-gray-400", label: "Stable" },
  }[satellite.trend]

  const formatFreq = (hz?: number) => {
    if (!hz) return "N/A"
    if (hz > 1e9) return `${(hz / 1e9).toFixed(3)} GHz`
    if (hz > 1e6) return `${(hz / 1e6).toFixed(3)} MHz`
    if (hz > 1e3) return `${(hz / 1e3).toFixed(1)} kHz`
    return `${hz} Hz`
  }

  return (
    <div
      className={cn(
        "w-72 bg-[#0a0f1e]/95 backdrop-blur-md border border-cyan-500/20 rounded-xl shadow-2xl shadow-black/50 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Satellite className={cn("w-4 h-4 shrink-0", satellite.is_visible ? "text-green-400" : "text-gray-500")} />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{satellite.name}</div>
              <div className="text-[9px] text-gray-500">NORAD {satellite.norad_id}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-gray-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Position Data */}
      <div className="px-3 py-2 space-y-1.5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-500 uppercase">Position</span>
          <div className={cn("flex items-center gap-1 text-[9px]", trendLabel.color)}>
            {trendLabel.icon}
            <span>{trendLabel.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-[8px] text-gray-600 uppercase">AZ</div>
            <div className="text-xs font-mono text-white">{satellite.az.toFixed(1)}°</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] text-gray-600 uppercase">EL</div>
            <div className="text-xs font-mono text-white">{satellite.el.toFixed(1)}°</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] text-gray-600 uppercase">RNG</div>
            <div className="text-xs font-mono text-white">{(satellite.range).toFixed(0)} km</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-[8px] text-gray-600 uppercase">LAT</div>
            <div className="text-[10px] font-mono text-gray-300">{satellite.lat.toFixed(2)}°</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] text-gray-600 uppercase">LON</div>
            <div className="text-[10px] font-mono text-gray-300">{satellite.lon.toFixed(2)}°</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] text-gray-600 uppercase">ALT</div>
            <div className="text-[10px] font-mono text-gray-300">{satellite.alt.toFixed(0)} km</div>
          </div>
        </div>
      </div>

      {/* Satellite Metadata */}
      <div className="px-3 py-2 space-y-1 border-b border-white/5 text-[9px]">
        {satellite.operator && (
          <div className="flex justify-between">
            <span className="text-gray-500">Operator</span>
            <span className="text-gray-300">{satellite.operator}</span>
          </div>
        )}
        {satellite.countries && (
          <div className="flex justify-between">
            <span className="text-gray-500">Country</span>
            <span className="text-gray-300">{satellite.countries}</span>
          </div>
        )}
        {satellite.status && (
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className={cn(
              satellite.status === "alive" ? "text-green-400" : "text-gray-400"
            )}>{satellite.status}</span>
          </div>
        )}
        {satellite.launched && (
          <div className="flex justify-between">
            <span className="text-gray-500">Launched</span>
            <span className="text-gray-300">{new Date(satellite.launched).toLocaleDateString()}</span>
          </div>
        )}
        {/* Apr 22, 2026 — operator website external link removed (data-in-widget).
            All satellite metadata (NORAD, TLE, operator, country, status, transmitters)
            renders inline above. */}
      </div>

      {/* Transmitters */}
      {satellite.transmitters && satellite.transmitters.length > 0 && (
        <div className="border-b border-white/5">
          <button
            onClick={() => setShowTransmitters(!showTransmitters)}
            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Signal className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] text-white font-medium">
                Transmitters ({satellite.transmitters.length})
              </span>
            </div>
            {showTransmitters ? (
              <ArrowUp className="w-3 h-3 text-gray-500" />
            ) : (
              <ArrowDown className="w-3 h-3 text-gray-500" />
            )}
          </button>
          {showTransmitters && (
            <div className="px-3 pb-2 space-y-1">
              {satellite.transmitters.map((tx) => (
                <div key={tx.id} className="px-2 py-1 bg-black/30 rounded text-[9px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 truncate">{tx.description || tx.id}</span>
                    <span
                      className={cn(
                        "text-[8px] uppercase",
                        tx.alive ? "text-green-400" : "text-gray-600"
                      )}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-gray-500">
                    <span>{formatFreq(tx.downlink_low)}</span>
                    {tx.mode && <span>{tx.mode}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2 flex items-center gap-2">
        <button
          onClick={() => (isTracking ? onStopTrack() : onTrack(satellite.norad_id))}
          className={cn(
            "flex-1 py-1.5 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1",
            isTracking
              ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
          )}
        >
          <Crosshair className="w-3 h-3" />
          {isTracking ? "Stop Tracking" : "Track"}
        </button>
      </div>
    </div>
  )
}

export default GSSatelliteInfoPanel
