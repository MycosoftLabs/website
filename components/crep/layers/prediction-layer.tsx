"use client"

/**
 * Prediction Layer - February 6, 2026
 * 
 * Visualization component for predicted tracks on the map.
 */

import React, { useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  PredictedPosition,
  GeoPoint,
} from "@/lib/prediction/prediction-client"

export interface PredictionLayerProps {
  predictions: PredictedPosition[]
  entityType: "aircraft" | "vessel" | "satellite" | "wildlife"
  showTrail?: boolean
  showUncertainty?: boolean
  showMarkers?: boolean
  markerInterval?: number
  trailColor?: string
  selectedTime?: Date
  onMarkerClick?: (prediction: PredictedPosition) => void
  onMarkerHover?: (prediction: PredictedPosition | null) => void
  // For integration with map library
  mapProjection?: (point: GeoPoint) => { x: number; y: number }
}

const entityColors = {
  aircraft: { trail: "#3b82f6", marker: "#1d4ed8" },
  vessel: { trail: "#14b8a6", marker: "#0d9488" },
  satellite: { trail: "#8b5cf6", marker: "#7c3aed" },
  wildlife: { trail: "#22c55e", marker: "#16a34a" },
}

/**
 * PredictionTrail - SVG path for predicted track
 */
export function PredictionTrail({
  predictions,
  color,
  mapProjection,
  showUncertainty = true,
}: {
  predictions: PredictedPosition[]
  color: string
  mapProjection: (point: GeoPoint) => { x: number; y: number }
  showUncertainty?: boolean
}) {
  const pathData = useMemo(() => {
    if (predictions.length < 2) return ""

    const points = predictions.map((p) => mapProjection(p.position))
    let d = `M ${points[0].x} ${points[0].y}`

    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`
    }

    return d
  }, [predictions, mapProjection])

  const uncertaintyCones = useMemo(() => {
    if (!showUncertainty) return []

    return predictions
      .filter((p, i) => i % 5 === 0 && p.uncertainty_radius_m)
      .map((p) => {
        const center = mapProjection(p.position)
        // Scale uncertainty to screen pixels (rough approximation)
        const radius = (p.uncertainty_radius_m || 0) / 1000 // km to screen units
        return {
          cx: center.x,
          cy: center.y,
          r: Math.max(5, Math.min(50, radius)),
          confidence: p.confidence,
        }
      })
  }, [predictions, showUncertainty, mapProjection])

  return (
    <g className="prediction-trail">
      {/* Uncertainty cones */}
      {uncertaintyCones.map((cone, i) => (
        <circle
          key={`uncertainty-${i}`}
          cx={cone.cx}
          cy={cone.cy}
          r={cone.r}
          fill={color}
          fillOpacity={0.1 * cone.confidence}
          stroke={color}
          strokeWidth={1}
          strokeOpacity={0.3 * cone.confidence}
          strokeDasharray="4 2"
        />
      ))}

      {/* Main trail path - dashed to indicate prediction */}
      <motion.path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="8 4"
        strokeOpacity={0.8}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      {/* Gradient overlay to show confidence decay */}
      <defs>
        <linearGradient id="confidence-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0.3} />
        </linearGradient>
      </defs>
      <path
        d={pathData}
        fill="none"
        stroke="url(#confidence-gradient)"
        strokeWidth={3}
        strokeDasharray="8 4"
      />
    </g>
  )
}

/**
 * PredictionMarker - Individual position marker
 */
export function PredictionMarker({
  prediction,
  color,
  mapProjection,
  isSelected,
  onClick,
  onHover,
}: {
  prediction: PredictedPosition
  color: string
  mapProjection: (point: GeoPoint) => { x: number; y: number }
  isSelected?: boolean
  onClick?: () => void
  onHover?: (hover: boolean) => void
}) {
  const position = useMemo(
    () => mapProjection(prediction.position),
    [prediction.position, mapProjection]
  )

  const confidenceOpacity = Math.max(0.3, prediction.confidence)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.g
            className="prediction-marker cursor-pointer"
            onClick={onClick}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
            initial={{ scale: 0 }}
            animate={{ scale: isSelected ? 1.5 : 1 }}
            whileHover={{ scale: 1.3 }}
          >
            <circle
              cx={position.x}
              cy={position.y}
              r={isSelected ? 8 : 5}
              fill={color}
              fillOpacity={confidenceOpacity}
              stroke="white"
              strokeWidth={2}
            />
            {isSelected && (
              <circle
                cx={position.x}
                cy={position.y}
                r={12}
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
            <div>Time: {new Date(prediction.timestamp).toLocaleTimeString()}</div>
            <div>
              Position: {prediction.position.lat.toFixed(4)},{" "}
              {prediction.position.lng.toFixed(4)}
            </div>
            {prediction.position.altitude && (
              <div>Altitude: {Math.round(prediction.position.altitude)}m</div>
            )}
            <div>Confidence: {Math.round(prediction.confidence * 100)}%</div>
            <div className="text-muted-foreground">
              Source: {prediction.prediction_source}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Main PredictionLayer component
 */
export function PredictionLayer({
  predictions,
  entityType,
  showTrail = true,
  showUncertainty = true,
  showMarkers = true,
  markerInterval = 5,
  trailColor,
  selectedTime,
  onMarkerClick,
  onMarkerHover,
  mapProjection,
}: PredictionLayerProps) {
  const colors = entityColors[entityType]
  const effectiveTrailColor = trailColor || colors.trail

  // Default projection for demo (would be replaced by map library)
  const defaultProjection = useCallback(
    (point: GeoPoint): { x: number; y: number } => {
      return {
        x: (point.lng + 180) * (800 / 360),
        y: (90 - point.lat) * (400 / 180),
      }
    },
    []
  )

  const projection = mapProjection || defaultProjection

  // Filter markers to show at intervals
  const visibleMarkers = useMemo(() => {
    if (!showMarkers) return []
    return predictions.filter((_, i) => i % markerInterval === 0)
  }, [predictions, showMarkers, markerInterval])

  // Find selected position based on time
  const selectedPrediction = useMemo(() => {
    if (!selectedTime || predictions.length === 0) return null

    const targetTime = selectedTime.getTime()
    let nearest = predictions[0]
    let minDiff = Infinity

    for (const pred of predictions) {
      const predTime = new Date(pred.timestamp).getTime()
      const diff = Math.abs(predTime - targetTime)
      if (diff < minDiff) {
        minDiff = diff
        nearest = pred
      }
    }

    return nearest
  }, [predictions, selectedTime])

  if (predictions.length === 0) {
    return null
  }

  return (
    <svg className="prediction-layer absolute inset-0 pointer-events-none">
      <AnimatePresence>
        {/* Trail */}
        {showTrail && (
          <PredictionTrail
            predictions={predictions}
            color={effectiveTrailColor}
            mapProjection={projection}
            showUncertainty={showUncertainty}
          />
        )}

        {/* Markers */}
        {visibleMarkers.map((pred, i) => (
          <PredictionMarker
            key={`marker-${i}`}
            prediction={pred}
            color={colors.marker}
            mapProjection={projection}
            isSelected={
              selectedPrediction?.timestamp === pred.timestamp
            }
            onClick={() => onMarkerClick?.(pred)}
            onHover={(hover) => onMarkerHover?.(hover ? pred : null)}
          />
        ))}
      </AnimatePresence>
    </svg>
  )
}

/**
 * PredictionInfo - Info card showing prediction details
 */
export function PredictionInfo({
  prediction,
  entityType,
}: {
  prediction: PredictedPosition
  entityType: string
}) {
  return (
    <Card className="p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{prediction.entity_id}</span>
        <Badge variant="outline" className="text-xs">
          {entityType}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
        <div>
          <div className="text-xs">Time</div>
          <div className="font-mono">
            {new Date(prediction.timestamp).toLocaleTimeString()}
          </div>
        </div>
        <div>
          <div className="text-xs">Confidence</div>
          <div className="flex items-center gap-1">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{ width: `${prediction.confidence * 100}%` }}
            />
            <span className="font-mono text-xs">
              {Math.round(prediction.confidence * 100)}%
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs">Latitude</div>
          <div className="font-mono">{prediction.position.lat.toFixed(5)}</div>
        </div>
        <div>
          <div className="text-xs">Longitude</div>
          <div className="font-mono">{prediction.position.lng.toFixed(5)}</div>
        </div>
        {prediction.position.altitude && (
          <div>
            <div className="text-xs">Altitude</div>
            <div className="font-mono">
              {Math.round(prediction.position.altitude)}m
            </div>
          </div>
        )}
        {prediction.velocity && (
          <div>
            <div className="text-xs">Speed</div>
            <div className="font-mono">
              {prediction.velocity.speed.toFixed(1)} m/s
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Source: {prediction.prediction_source}
      </div>
    </Card>
  )
}

export default PredictionLayer