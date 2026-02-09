"use client"

/**
 * Trail Layer - February 6, 2026
 *
 * Renders entity movement trails on the map.
 * Integrates trail-renderer with LOD manager for detail level.
 * Fading trails based on time, gradient colors for altitude/speed.
 */

import React, { useMemo, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Trail,
  TrailPoint,
  prepareTrailSegments,
  getGradientColor,
  DEFAULT_STYLES,
  type TrailStyle,
} from "@/lib/trails/trail-renderer"
import { smoothTrail } from "@/lib/trails/trail-calculator"
import { useLOD } from "@/hooks/useLOD"

export interface TrailLayerProps {
  trails: Trail[]
  currentTime?: number
  colorBy?: "altitude" | "speed" | "time"
  mapProjection?: (point: { lat: number; lng: number }) => { x: number; y: number }
  viewportSize?: { width: number; height: number }
  onTrailClick?: (trail: Trail) => void
  selectedTrailId?: string
}

const defaultProjection = (point: { lat: number; lng: number }) => ({
  x: ((point.lng + 180) / 360) * 800,
  y: ((90 - point.lat) / 180) * 400,
})

export function TrailLayer({
  trails,
  currentTime = Date.now(),
  colorBy = "time",
  mapProjection,
  viewportSize = { width: 800, height: 400 },
  onTrailClick,
  selectedTrailId,
}: TrailLayerProps) {
  const projection = mapProjection || defaultProjection
  const { level } = useLOD()

  // Filter trails based on LOD - at global/regional show fewer, at detailed show all with trails
  const visibleTrails = useMemo(() => {
    const maxTrails =
      level === "global" ? 20 : level === "regional" ? 50 : trails.length
    return trails.slice(0, maxTrails)
  }, [trails, level])

  if (visibleTrails.length === 0) return null

  return (
    <svg
      className="trail-layer absolute inset-0 pointer-events-auto"
      width={viewportSize.width}
      height={viewportSize.height}
    >
      <defs>
        <linearGradient id="trail-altitude-low" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.5} />
        </linearGradient>
        <linearGradient id="trail-speed-low" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5} />
        </linearGradient>
      </defs>

      {visibleTrails.map((trail) => (
        <TrailPath
          key={trail.id}
          trail={trail}
          currentTime={currentTime}
          colorBy={colorBy}
          projection={projection}
          isSelected={selectedTrailId === trail.id}
          onClick={() => onTrailClick?.(trail)}
        />
      ))}
    </svg>
  )
}

function TrailPath({
  trail,
  currentTime,
  colorBy,
  projection,
  isSelected,
  onClick,
}: {
  trail: Trail
  currentTime: number
  colorBy: "altitude" | "speed" | "time"
  projection: (point: { lat: number; lng: number }) => { x: number; y: number }
  isSelected?: boolean
  onClick?: () => void
}) {
  const style = trail.style || DEFAULT_STYLES[trail.entityType] || DEFAULT_STYLES.aircraft

  // Smooth trail for cleaner rendering at lower LOD
  const smoothedPoints = useMemo(
    () => smoothTrail(trail.points, 3),
    [trail.points]
  )

  const segments = useMemo(
    () =>
      prepareTrailSegments(
        { ...trail, points: smoothedPoints },
        currentTime
      ),
    [trail.id, smoothedPoints, currentTime, style]
  )

  const pathData = useMemo(() => {
    if (smoothedPoints.length < 2) return ""

    let d = `M ${projection(smoothedPoints[0]).x} ${projection(smoothedPoints[0]).y}`

    for (let i = 1; i < smoothedPoints.length; i++) {
      const { x, y } = projection(smoothedPoints[i])
      d += ` L ${x} ${y}`
    }

    return d
  }, [smoothedPoints, projection])

  const pathColor =
    colorBy === "altitude" || colorBy === "speed"
      ? getGradientColor(
          trail.points[trail.points.length - 1] || trail.points[0],
          trail.entityType,
          colorBy
        )
      : typeof style.color === "string"
        ? style.color
        : "#3b82f6"

  const avgOpacity =
    segments.length > 0
      ? segments.reduce((sum, s) => sum + s.opacity, 0) / segments.length
      : 0

  if (pathData === "" || avgOpacity < 0.01) return null

  const dashArray =
    style.type === "orbit_arc" || style.type === "dotted_path"
      ? style.dashArray?.join(" ") || "4 4"
      : undefined

  return (
    <motion.g
      className="trail-path cursor-pointer"
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <path
        d={pathData}
        fill="none"
        stroke={pathColor}
        strokeWidth={isSelected ? style.width + 2 : style.width}
        strokeOpacity={avgOpacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashArray}
        style={{
          filter: isSelected ? "drop-shadow(0 0 4px rgba(59,130,246,0.8))" : undefined,
        }}
      />
      {isSelected && (
        <path
          d={pathData}
          fill="none"
          stroke="white"
          strokeWidth={1}
          strokeOpacity={0.5}
          strokeDasharray="4 2"
        />
      )}
    </motion.g>
  )
}

export default TrailLayer
