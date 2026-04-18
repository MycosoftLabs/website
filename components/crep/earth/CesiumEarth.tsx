"use client"

/**
 * CesiumEarth — v2 canonical 3D Earth component for the CREP dashboard.
 *
 * Status (Apr 18, 2026 · rev 1.0 Phase 2 skeleton):
 *   ✅ Opaque globe (non-negotiable §2)
 *   ✅ Atmosphere + lighting defaults
 *   ✅ Base-mode switcher (REAL_EARTH / TOPOGRAPHY / BATHYMETRY)
 *   ✅ Ion token graceful-fallback wiring
 *   ⏳ Terrain + bathymetry provider (Phase 3)
 *   ⏳ Unified layer registry integration (Phase 4)
 *   ⏳ Live-entity Cesium primitives (Phase 5)
 *   ⏳ AIS WebSocket proxy hookup (Phase 6)
 *   ⏳ Reference layers: volcanoes / undersea / bases (Phase 7)
 *
 * Activated via `?engine=cesium` URL param on /dashboard/crep. Default
 * dashboard continues to use MapLibre until we flip the switch.
 */

import { useState, useCallback } from "react"
import { useCesiumViewer, type BaseMode } from "./hooks/useCesiumViewer"
import { BaseModeSwitcher } from "./BaseModeSwitcher"

interface CesiumEarthProps {
  /** Initial base mode — callers can control this */
  initialBaseMode?: BaseMode
  /** Optional initial camera [lng, lat, height_m] */
  initialCamera?: { lng: number; lat: number; height: number }
  /** Map ref callback, mirrors MapLibre onLoad contract so existing
   *  dashboard code can attach layers */
  onReady?: (viewer: any) => void
  className?: string
}

export default function CesiumEarth({ initialBaseMode = "REAL_EARTH", initialCamera, onReady, className }: CesiumEarthProps) {
  const [baseMode, setBaseMode] = useState<BaseMode>(initialBaseMode)

  const handleReady = useCallback((viewer: any) => {
    try { onReady?.(viewer) } catch (e) { console.warn("[CesiumEarth] onReady:", e) }
  }, [onReady])

  const { containerRef, ready, viewerRef, ionEnabled } = useCesiumViewer({
    initialCamera,
    onReady: handleReady,
  })

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {/* Base-mode switcher (top-left, above Cesium canvas) */}
      {ready && (
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2">
          <BaseModeSwitcher mode={baseMode} onChange={setBaseMode} />
          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-300/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
            CESIUM v2 · {ionEnabled ? "ION LIVE" : "NO ION TOKEN"}
          </div>
        </div>
      )}
      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-cyan-200/80">Loading Cesium Earth v2</p>
          </div>
        </div>
      )}
    </div>
  )
}
