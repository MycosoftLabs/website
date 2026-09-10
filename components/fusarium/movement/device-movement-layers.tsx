"use client"

import { useEffect, useState } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"
import type { MovementSnapshot } from "@/lib/fusarium/movement/contracts"
import { DeviceMovementOverlay } from "./device-movement-overlay"

interface DeviceMovementLayersProps {
  map: MapLibreMap | null
  showPaths: boolean
  showCoordination: boolean
  showTriangulation: boolean
  showPathTree: boolean
}

export function DeviceMovementLayers({
  map,
  showPaths,
  showCoordination,
  showTriangulation,
  showPathTree,
}: DeviceMovementLayersProps) {
  const [snapshot, setSnapshot] = useState<MovementSnapshot | null>(null)

  const shouldPoll =
    showPaths || showCoordination || showTriangulation || showPathTree

  useEffect(() => {
    if (!shouldPoll) {
      setSnapshot(null)
      return
    }
    if (typeof window !== "undefined" && !window.location.pathname.includes("/fusarium/")) {
      setSnapshot(null)
      return
    }
    let cancelled = false
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return
      try {
        const response = await fetch("/api/fusarium/movement/snapshot", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        })
        if (!response.ok) return
        const next = (await response.json()) as MovementSnapshot
        if (!cancelled) setSnapshot(next)
      } catch {
        if (!cancelled) setSnapshot(null)
      }
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 30_000)
    const onVisibility = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [shouldPoll])

  if (!showPaths && !showCoordination && !showTriangulation && !showPathTree) {
    return null
  }

  return (
    <DeviceMovementOverlay
      map={map}
      snapshot={snapshot}
      showPaths={showPaths}
      showCoordination={showCoordination}
      showTriangulation={showTriangulation}
      showPathTree={showPathTree}
    />
  )
}
