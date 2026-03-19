"use client"

/**
 * Ground Station Pass Timeline for CREP
 *
 * Horizontal timeline showing upcoming satellite passes, integrated
 * into the CREP map footer area. Adapted from the ground-station
 * timeline-main.jsx component.
 */

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Clock, ChevronLeft, ChevronRight, Activity, Satellite } from "lucide-react"

interface PassData {
  norad_id: number
  satellite_name: string
  aos_time: string
  los_time: string
  max_elevation: number
  duration_seconds: number
  is_visible?: boolean
}

interface GSPassTimelineProps {
  passes: PassData[]
  hoursWindow?: number
  onSelectPass?: (pass: PassData) => void
  onTrackSatellite?: (noradId: number) => void
  trackingNoradId?: number
  className?: string
}

export function GSPassTimeline({
  passes,
  hoursWindow = 24,
  onSelectPass,
  onTrackSatellite,
  trackingNoradId,
  className,
}: GSPassTimelineProps) {
  const now = Date.now()
  const windowStart = now
  const windowEnd = now + hoursWindow * 60 * 60 * 1000

  const sortedPasses = useMemo(() => {
    return passes
      .filter((p) => {
        const los = new Date(p.los_time).getTime()
        return los > windowStart
      })
      .sort((a, b) => new Date(a.aos_time).getTime() - new Date(b.aos_time).getTime())
  }, [passes, windowStart])

  const timeToPercent = (t: number) => {
    return ((t - windowStart) / (windowEnd - windowStart)) * 100
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getPassColor = (pass: PassData) => {
    if (pass.norad_id === trackingNoradId) return "bg-red-500/80 border-red-400"
    const aos = new Date(pass.aos_time).getTime()
    const los = new Date(pass.los_time).getTime()
    if (now >= aos && now <= los) return "bg-green-500/60 border-green-400"
    if (pass.max_elevation > 60) return "bg-cyan-500/60 border-cyan-400"
    if (pass.max_elevation > 30) return "bg-blue-500/50 border-blue-400"
    return "bg-gray-600/50 border-gray-500"
  }

  // Time markers
  const hourMarkers = useMemo(() => {
    const markers: { label: string; percent: number }[] = []
    const start = new Date(windowStart)
    start.setMinutes(0, 0, 0)
    let t = start.getTime() + 60 * 60 * 1000
    while (t < windowEnd) {
      const pct = timeToPercent(t)
      if (pct > 0 && pct < 100) {
        markers.push({
          label: new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          percent: pct,
        })
      }
      t += 60 * 60 * 1000
    }
    return markers
  }, [windowStart, windowEnd])

  return (
    <div
      className={cn(
        "bg-[#0a0f1e]/95 backdrop-blur-md border-t border-cyan-500/10",
        className
      )}
    >
      {/* Header */}
      <div className="px-3 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            Pass Timeline
          </span>
          <span className="text-[9px] text-gray-500">
            {sortedPasses.length} passes / {hoursWindow}h
          </span>
        </div>
        <div className="text-[9px] text-gray-500">
          <Clock className="w-3 h-3 inline mr-1" />
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC
        </div>
      </div>

      {/* Timeline */}
      <div className="relative h-16 mx-3 mb-2">
        {/* Background grid */}
        <div className="absolute inset-0 border border-gray-800/50 rounded bg-black/20">
          {/* Now indicator */}
          <div
            className="absolute top-0 bottom-0 w-px bg-cyan-400/40"
            style={{ left: "0%" }}
          >
            <div className="absolute -top-0.5 -left-1.5 text-[8px] text-cyan-400 font-bold">
              NOW
            </div>
          </div>

          {/* Hour markers */}
          {hourMarkers.map((m, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-gray-800/50"
              style={{ left: `${m.percent}%` }}
            >
              <div className="absolute bottom-0 -left-4 text-[7px] text-gray-600 w-8 text-center">
                {m.label}
              </div>
            </div>
          ))}

          {/* Pass bars */}
          {sortedPasses.map((pass, i) => {
            const aosTime = new Date(pass.aos_time).getTime()
            const losTime = new Date(pass.los_time).getTime()
            const startPct = Math.max(0, timeToPercent(aosTime))
            const endPct = Math.min(100, timeToPercent(losTime))
            const widthPct = Math.max(0.5, endPct - startPct)

            // Vertical position based on elevation (higher el = higher position)
            const yPos = 8 + (1 - pass.max_elevation / 90) * 30

            return (
              <div
                key={`${pass.norad_id}-${i}`}
                className={cn(
                  "absolute h-3 rounded-sm border cursor-pointer hover:opacity-100 transition-all group",
                  getPassColor(pass)
                )}
                style={{
                  left: `${startPct}%`,
                  width: `${widthPct}%`,
                  top: `${yPos}px`,
                  minWidth: "4px",
                }}
                onClick={() => {
                  onSelectPass?.(pass)
                  onTrackSatellite?.(pass.norad_id)
                }}
                title={`${pass.satellite_name} | ${formatTime(pass.aos_time)}-${formatTime(pass.los_time)} | Max El: ${pass.max_elevation.toFixed(0)}°`}
              >
                {widthPct > 3 && (
                  <span className="text-[7px] text-white/80 px-0.5 truncate block leading-3">
                    {pass.satellite_name}
                  </span>
                )}

                {/* Tooltip */}
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 p-1.5 bg-black/90 border border-gray-700 rounded text-[8px] text-white whitespace-nowrap z-10">
                  <div className="font-bold text-cyan-300">{pass.satellite_name}</div>
                  <div>
                    {formatTime(pass.aos_time)} - {formatTime(pass.los_time)}
                  </div>
                  <div>Max El: {pass.max_elevation.toFixed(1)}°</div>
                  <div>Duration: {Math.round(pass.duration_seconds / 60)}m</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default GSPassTimeline
