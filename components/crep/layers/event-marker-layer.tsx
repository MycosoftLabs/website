"use client"

/**
 * Event Marker Layer - February 6, 2026
 *
 * Map layer for timeline events.
 * Clusters markers at low zoom, shows individual markers at high zoom.
 * Integrates with timeline slider for time filtering.
 */

import React, { useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { clusterPoints, type Point, type Cluster } from "@/lib/lod/cluster-aggregator"
import { useLOD } from "@/hooks/useLOD"

export interface TimelineEvent {
  id: string
  lat: number
  lng: number
  timestamp: number
  type: string
  label?: string
  magnitude?: number
  properties?: Record<string, unknown>
}

export interface EventMarkerLayerProps {
  events: TimelineEvent[]
  currentTime?: number
  timeWindowMs?: number
  entityType?: string
  mapProjection?: (point: { lat: number; lng: number }) => { x: number; y: number }
  viewportSize?: { width: number; height: number }
  onEventClick?: (event: TimelineEvent) => void
  onEventFocus?: (event: TimelineEvent | null) => void
  selectedEventId?: string
}

const defaultProjection = (point: { lat: number; lng: number }) => ({
  x: ((point.lng + 180) / 360) * 800,
  y: ((90 - point.lat) / 180) * 400,
})

const typeColors: Record<string, string> = {
  earthquake: "#ef4444",
  aircraft: "#3b82f6",
  vessel: "#14b8a6",
  satellite: "#8b5cf6",
  wildlife: "#22c55e",
  storm: "#0ea5e9",
  wildfire: "#f97316",
  default: "#6b7280",
}

export function EventMarkerLayer({
  events,
  currentTime = Date.now(),
  timeWindowMs = 24 * 60 * 60 * 1000,
  entityType = "earthquake",
  mapProjection,
  viewportSize = { width: 800, height: 400 },
  onEventClick,
  onEventFocus,
  selectedEventId,
}: EventMarkerLayerProps) {
  const projection = mapProjection || defaultProjection
  const { zoom, getClusterRadius, shouldAggregate, getRenderMode } = useLOD()

  // Filter events by time window around current time
  const filteredEvents = useMemo(() => {
    const windowStart = currentTime - timeWindowMs / 2
    const windowEnd = currentTime + timeWindowMs / 2
    return events.filter(
      (e) => e.timestamp >= windowStart && e.timestamp <= windowEnd
    )
  }, [events, currentTime, timeWindowMs])

  const renderMode = getRenderMode(entityType)
  const clusterRadius = getClusterRadius(entityType)
  const useClusters = renderMode === "clusters" || shouldAggregate(entityType, filteredEvents.length)

  const points: Point[] = useMemo(
    () =>
      filteredEvents.map((e) => ({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        properties: { ...e.properties, event: e },
      })),
    [filteredEvents]
  )

  const clusters = useMemo(() => {
    if (!useClusters || points.length === 0) return []
    return clusterPoints(points, {
      radius: clusterRadius,
      minPoints: 1,
    })
  }, [points, useClusters, clusterRadius])

  const color = typeColors[entityType] || typeColors.default

  if (filteredEvents.length === 0 && clusters.length === 0) return null

  return (
    <TooltipProvider>
      <svg
        className="event-marker-layer absolute inset-0 pointer-events-auto"
        width={viewportSize.width}
        height={viewportSize.height}
      >
        <AnimatePresence>
          {useClusters && clusters.length > 0 ? (
            clusters.map((cluster) => (
              <ClusterMarker
                key={cluster.id}
                cluster={cluster}
                projection={projection}
                color={color}
                onClick={() => {
                  if (cluster.points.length === 1) {
                    const evt = (cluster.points[0].properties?.event as TimelineEvent)
                    onEventClick?.(evt)
                  }
                }}
              />
            ))
          ) : (
            filteredEvents.map((event) => (
              <SingleMarker
                key={event.id}
                event={event}
                projection={projection}
                color={typeColors[event.type] || color}
                isSelected={selectedEventId === event.id}
                onClick={() => onEventClick?.(event)}
                onHover={(hover) => onEventFocus?.(hover ? event : null)}
              />
            ))
          )}
        </AnimatePresence>
      </svg>
    </TooltipProvider>
  )
}

function ClusterMarker({
  cluster,
  projection,
  color,
  onClick,
}: {
  cluster: Cluster
  projection: (p: { lat: number; lng: number }) => { x: number; y: number }
  color: string
  onClick: () => void
}) {
  const pos = projection(cluster)
  const radius = Math.min(30, Math.max(12, 8 + Math.log2(cluster.count + 1) * 4))

  return (
    <motion.g
      className="cluster-marker cursor-pointer"
      onClick={onClick}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <g>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={radius}
              fill={color}
              fillOpacity={0.6}
              stroke="white"
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={radius > 16 ? 12 : 10}
              fontWeight="bold"
            >
              {cluster.count}
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-medium">{cluster.count} events</div>
            <div className="text-muted-foreground">Click to expand</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </motion.g>
  )
}

function SingleMarker({
  event,
  projection,
  color,
  isSelected,
  onClick,
  onHover,
}: {
  event: TimelineEvent
  projection: (p: { lat: number; lng: number }) => { x: number; y: number }
  color: string
  isSelected?: boolean
  onClick: () => void
  onHover?: (hover: boolean) => void
}) {
  const pos = projection(event)
  const size = event.magnitude ? Math.min(20, 6 + event.magnitude) : 8

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.g
          className="event-marker cursor-pointer"
          onClick={onClick}
          onMouseEnter={() => onHover?.(true)}
          onMouseLeave={() => onHover?.(false)}
          initial={{ scale: 0 }}
          animate={{ scale: isSelected ? 1.3 : 1 }}
          exit={{ scale: 0 }}
          whileHover={{ scale: 1.2 }}
        >
          <circle
            cx={pos.x}
            cy={pos.y}
            r={size}
            fill={color}
            fillOpacity={0.9}
            stroke="white"
            strokeWidth={isSelected ? 3 : 1}
          />
          {isSelected && (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={size + 6}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}
        </motion.g>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <div className="font-medium">{event.label || event.type}</div>
          <div>{new Date(event.timestamp).toLocaleString()}</div>
          {event.magnitude !== undefined && (
            <div>Magnitude: {event.magnitude}</div>
          )}
          <div className="text-muted-foreground">
            {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export default EventMarkerLayer
