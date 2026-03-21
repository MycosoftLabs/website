"use client"

/**
 * Ground Station Overlay Panel for CREP Dashboard
 *
 * Floating overlay panel that shows ground-station satellite tracking data
 * directly on the CREP map view. Includes:
 * - Satellite group selector
 * - Active tracking indicator
 * - Satellite list with positions
 * - Pass timeline miniview
 * - Hardware status LEDs
 * - Quick actions (track, observe)
 *
 * Designed to fit into the CREP dark tactical UI style.
 */

import { useState, useEffect, useCallback } from "react"
import {
  Radio,
  Satellite,
  ChevronDown,
  ChevronUp,
  Activity,
  Crosshair,
  Eye,
  EyeOff,
  Settings,
  Signal,
  Wifi,
  WifiOff,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Target,
  Zap,
  BarChart3,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useGroundStation } from "@/lib/ground-station/context"

interface GSOverlayPanelProps {
  visible: boolean
  onToggle: () => void
  className?: string
}

export function GSOverlayPanel({
  visible,
  onToggle,
  className,
}: GSOverlayPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [showSatList, setShowSatList] = useState(true)
  const [filter, setFilter] = useState<"all" | "visible" | "tracking">("all")

  const { state, selectGroup, selectSatellite, trackSatellite, stopTracking } = useGroundStation()

  const connected = state.systemStatus === "connected"
  const groups = state.groups.map(g => ({ id: g.id, name: g.name, satellite_count: g.satellite_ids?.length || 0 }))
  const selectedGroupId = state.selectedGroupId
  const satellites = state.satellites.map(sat => {
    const pos = state.positions[sat.norad_id]
    return {
      norad_id: sat.norad_id,
      name: sat.name,
      az: pos?.az || 0,
      el: pos?.el || 0,
      range: pos?.range || 0,
      alt: pos?.alt || 0,
      trend: pos?.trend || "stable",
      is_visible: pos?.is_visible || false,
      is_tracking: state.trackingState?.norad_id === sat.norad_id
    }
  })
  const trackingNoradId = state.trackingState?.norad_id
  const hardwareStatus = {
    rotator_connected: state.hardware.rotator?.status === "connected",
    rig_connected: state.hardware.rig?.status === "connected",
    sdr_connected: state.hardware.sdr?.status === "connected",
  }
  const passCount = state.passes.length
  const nextPassTime = state.passes[0]?.aos_time

  const onSelectGroup = selectGroup;
  const onSelectSatellite = selectSatellite;
  const onTrackSatellite = trackSatellite;
  const onStopTracking = stopTracking;

  const filteredSatellites = satellites.filter((sat) => {
    if (filter === "visible") return sat.is_visible
    if (filter === "tracking") return sat.is_tracking
    return true
  })

  const visibleCount = satellites.filter((s) => s.is_visible).length
  const trackingSat = satellites.find((s) => s.norad_id === trackingNoradId)

  const trendIcon = (trend: string) => {
    switch (trend) {
      case "rising": return <ArrowUp className="w-3 h-3 text-green-400" />
      case "falling": return <ArrowDown className="w-3 h-3 text-red-400" />
      case "peak": return <Target className="w-3 h-3 text-yellow-400" />
      default: return <Minus className="w-3 h-3 text-gray-500" />
    }
  }

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 top-20 z-50 p-2 rounded-lg bg-[#0a0f1e]/90 border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
        title="Open Ground Station"
      >
        <Radio className="w-5 h-5 text-cyan-400" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        "fixed right-4 top-20 z-50 w-80 max-h-[calc(100vh-120px)] flex flex-col",
        "bg-[#0a0f1e]/95 backdrop-blur-md border border-cyan-500/20 rounded-xl shadow-2xl shadow-black/50",
        "overflow-hidden transition-all",
        className
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white tracking-wide">GROUND STATION</span>
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                connected ? "bg-green-400 shadow-green-400/50 shadow-sm" : "bg-red-500"
              )}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-white/5 text-gray-400"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onToggle} className="p-1 rounded hover:bg-white/5 text-gray-400">
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          {/* Hardware Status Bar */}
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1" title="Rotator">
                <span className="text-[9px] text-gray-500">ROT</span>
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    hardwareStatus.rotator_connected ? "bg-green-400" : "bg-red-500"
                  )}
                />
              </div>
              <div className="flex items-center gap-1" title="Radio Rig">
                <span className="text-[9px] text-gray-500">RIG</span>
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    hardwareStatus.rig_connected ? "bg-green-400" : "bg-red-500"
                  )}
                />
              </div>
              <div className="flex items-center gap-1" title="SDR">
                <span className="text-[9px] text-gray-500">SDR</span>
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    hardwareStatus.sdr_connected ? "bg-green-400" : "bg-red-500"
                  )}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-gray-500">
              <span>{passCount} passes</span>
              {nextPassTime && (
                <span className="text-cyan-400/70">
                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                  {nextPassTime}
                </span>
              )}
            </div>
          </div>

          {/* Group Selector */}
          <div className="px-3 py-2 border-b border-white/5">
            <label className="text-[9px] text-cyan-400/60 uppercase font-medium block mb-1">
              Satellite Group
            </label>
            <select
              value={selectedGroupId || ""}
              onChange={(e) => onSelectGroup(e.target.value)}
              className="w-full h-7 text-[11px] bg-black/40 border border-gray-700/50 rounded px-2 text-white focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="">Select group...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.satellite_count})
                </option>
              ))}
            </select>
          </div>

          {/* Tracking Active Banner */}
          {trackingSat && (
            <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <div>
                    <div className="text-[10px] font-bold text-red-300">TRACKING</div>
                    <div className="text-[9px] text-red-400/70">{trackingSat.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white">
                    AZ {trackingSat.az.toFixed(1)}° EL {trackingSat.el.toFixed(1)}°
                  </div>
                  <button
                    onClick={onStopTracking}
                    className="text-[9px] text-red-400 hover:text-red-300"
                  >
                    Stop tracking
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="px-3 py-1.5 flex items-center gap-1 border-b border-white/5">
            {(["all", "visible", "tracking"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2 py-0.5 text-[9px] rounded uppercase font-medium transition-all",
                  filter === f
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                )}
              >
                {f === "all" && `All (${satellites.length})`}
                {f === "visible" && `Visible (${visibleCount})`}
                {f === "tracking" && "Tracking"}
              </button>
            ))}
          </div>

          {/* Satellite List */}
          <div className="divide-y divide-white/5">
            {filteredSatellites.length === 0 && (
              <div className="px-3 py-6 text-center text-[10px] text-gray-600">
                {!selectedGroupId ? "Select a satellite group" : "No satellites match filter"}
              </div>
            )}
            {filteredSatellites.slice(0, 50).map((sat) => (
              <div
                key={sat.norad_id}
                className={cn(
                  "px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors",
                  sat.norad_id === trackingNoradId && "bg-red-500/5 border-l-2 border-red-500"
                )}
                onClick={() => onSelectSatellite(sat.norad_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Satellite
                      className={cn(
                        "w-3 h-3 shrink-0",
                        sat.is_visible ? "text-green-400" : "text-gray-600"
                      )}
                    />
                    <span className="text-[10px] text-white truncate">{sat.name}</span>
                    {trendIcon(sat.trend)}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[9px] text-gray-500">
                      {sat.el.toFixed(0)}°
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (sat.norad_id === trackingNoradId) {
                          onStopTracking()
                        } else {
                          onTrackSatellite(sat.norad_id)
                        }
                      }}
                      className={cn(
                        "p-0.5 rounded transition-colors",
                        sat.norad_id === trackingNoradId
                          ? "text-red-400 hover:bg-red-500/20"
                          : "text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10"
                      )}
                      title={sat.norad_id === trackingNoradId ? "Stop tracking" : "Track satellite"}
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GSOverlayPanel
