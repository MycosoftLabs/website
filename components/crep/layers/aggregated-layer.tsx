"use client"

/**
 * Aggregated Data Layer - February 6, 2026
 *
 * Unified layer for spatial aggregation.
 * Switches between heatmap/hexbin/cluster modes based on LOD config.
 */

import React, { useMemo, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  prepareHeatmapData,
  generateHeatmapCanvas,
  type HeatmapPoint,
  type HeatmapData,
} from "@/lib/lod/heatmap-generator"
import {
  aggregateToHexbins,
  getDensityColor,
  type Hexbin,
} from "@/lib/lod/hexbin-aggregator"
import { clusterPoints, type Point } from "@/lib/lod/cluster-aggregator"
import { useLOD } from "@/hooks/useLOD"

export interface AggregatedPoint {
  lat: number
  lng: number
  weight?: number
  id?: string
  properties?: Record<string, unknown>
}

export interface AggregatedLayerProps {
  points: AggregatedPoint[]
  entityType?: string
  mapProjection?: (point: { lat: number; lng: number }) => { x: number; y: number }
  viewportSize?: { width: number; height: number }
  bounds?: { north: number; south: number; east: number; west: number }
  onClusterClick?: (cluster: { lat: number; lng: number; count: number }) => void
}

const defaultProjection = (point: { lat: number; lng: number }) => ({
  x: ((point.lng + 180) / 360) * 800,
  y: ((90 - point.lat) / 180) * 400,
})

export function AggregatedLayer({
  points,
  entityType = "wildlife",
  mapProjection,
  viewportSize = { width: 800, height: 400 },
  bounds,
  onClusterClick,
}: AggregatedLayerProps) {
  const projection = mapProjection || defaultProjection
  const { getRenderMode, getClusterRadius } = useLOD()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const renderMode = getRenderMode(entityType)
  const clusterRadius = getClusterRadius(entityType)

  // Convert to heatmap points
  const heatmapPoints: HeatmapPoint[] = useMemo(
    () =>
      points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        weight: p.weight ?? 1,
      })),
    [points]
  )

  // Heatmap mode
  const heatmapData = useMemo(
    () => prepareHeatmapData(heatmapPoints, { radius: 25 }),
    [heatmapPoints]
  )

  const heatmapCanvas = useMemo(() => {
    if (renderMode !== "heatmap" || heatmapData.points.length === 0) return null
    return generateHeatmapCanvas(
      heatmapData,
      viewportSize.width,
      viewportSize.height,
      { radius: 30, maxIntensity: heatmapData.maxWeight }
    )
  }, [renderMode, heatmapData, viewportSize.width, viewportSize.height])

  useEffect(() => {
    if (renderMode === "heatmap" && heatmapCanvas && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, viewportSize.width, viewportSize.height)
        ctx.drawImage(heatmapCanvas, 0, 0)
      }
    }
  }, [renderMode, heatmapCanvas, viewportSize.width, viewportSize.height])

  // Hexbin mode
  const hexbins = useMemo(() => {
    if (renderMode !== "hexbins") return []
    return aggregateToHexbins(
      points.map((p) => ({ lat: p.lat, lng: p.lng, properties: p.properties })),
      { radius: clusterRadius }
    )
  }, [renderMode, points, clusterRadius])

  // Cluster mode
  const clusters = useMemo(() => {
    if (renderMode !== "clusters") return []
    const pts: Point[] = points.map((p, i) => ({
      id: p.id ?? `p-${i}`,
      lat: p.lat,
      lng: p.lng,
      properties: p.properties,
    }))
    return clusterPoints(pts, { radius: clusterRadius, minPoints: 1 })
  }, [renderMode, points, clusterRadius])

  const isAggregationMode = ["heatmap", "hexbins", "clusters"].includes(renderMode)
  if (points.length === 0 || !isAggregationMode) return null

  return (
    <>
      {/* Heatmap - canvas overlay */}
      {renderMode === "heatmap" && heatmapCanvas && (
        <canvas
          ref={canvasRef}
          width={viewportSize.width}
          height={viewportSize.height}
          className="aggregated-layer heatmap absolute inset-0 pointer-events-none opacity-70"
          style={{ mixBlendMode: "multiply" }}
        />
      )}

      {/* Hexbins - SVG polygons */}
      {renderMode === "hexbins" && (
        <svg
          className="aggregated-layer hexbins absolute inset-0 pointer-events-auto"
          width={viewportSize.width}
          height={viewportSize.height}
        >
          {hexbins.map((hex) => (
            <HexbinPolygon
              key={hex.id}
              hex={hex}
              projection={projection}
              onClick={() =>
                onClusterClick?.({
                  lat: hex.centerLat,
                  lng: hex.centerLng,
                  count: hex.count,
                })
              }
            />
          ))}
        </svg>
      )}

      {/* Clusters - SVG circles */}
      {renderMode === "clusters" && (
        <svg
          className="aggregated-layer clusters absolute inset-0 pointer-events-auto"
          width={viewportSize.width}
          height={viewportSize.height}
        >
          {clusters.map((cluster) => (
            <ClusterCircle
              key={cluster.id}
              cluster={cluster}
              projection={projection}
              onClick={() =>
                onClusterClick?.({
                  lat: cluster.lat,
                  lng: cluster.lng,
                  count: cluster.count,
                })
              }
            />
          ))}
        </svg>
      )}

    </>
  )
}

function HexbinPolygon({
  hex,
  projection,
  onClick,
}: {
  hex: Hexbin
  projection: (p: { lat: number; lng: number }) => { x: number; y: number }
  onClick: () => void
}) {
  const color = getDensityColor(hex.density)
  const points = hex.vertices
    .map((v) => {
      const p = projection(v)
      return `${p.x},${p.y}`
    })
    .join(" ")

  return (
    <motion.polygon
      points={points}
      fill={color}
      fillOpacity={0.6}
      stroke="white"
      strokeWidth={1}
      strokeOpacity={0.3}
      className="cursor-pointer"
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ fillOpacity: 0.8 }}
    />
  )
}

function ClusterCircle({
  cluster,
  projection,
  onClick,
}: {
  cluster: { id: string; lat: number; lng: number; count: number }
  projection: (p: { lat: number; lng: number }) => { x: number; y: number }
  onClick: () => void
}) {
  const pos = projection(cluster)
  const radius = Math.min(40, Math.max(8, 6 + Math.log2(cluster.count + 1) * 3))

  return (
    <motion.g
      className="cursor-pointer"
      onClick={onClick}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
    >
      <circle
        cx={pos.x}
        cy={pos.y}
        r={radius}
        fill="#3b82f6"
        fillOpacity={0.5}
        stroke="white"
        strokeWidth={1}
      />
      <text
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={10}
        fontWeight="bold"
      >
        {cluster.count}
      </text>
    </motion.g>
  )
}

export default AggregatedLayer
