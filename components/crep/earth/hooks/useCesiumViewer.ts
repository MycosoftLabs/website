"use client"

/**
 * useCesiumViewer — React-safe Cesium Viewer lifecycle hook
 *
 * Handles:
 *   • Dynamic import of cesium (avoids SSR bundle weight)
 *   • Mount-time Viewer construction
 *   • Scene defaults via applyV2SceneDefaults
 *   • Cleanup on unmount (destroy Viewer, clear camera listeners)
 *   • Single-mount protection (React StrictMode double-invocation safe)
 *
 * Returns an imperative viewer ref plus a ready flag; callers mount the
 * container div via containerRef and react to the `ready` flag to start
 * attaching layers.
 */

import { useEffect, useRef, useState } from "react"
import type * as CesiumNS from "cesium"

export type BaseMode = "REAL_EARTH" | "TOPOGRAPHY" | "BATHYMETRY"

export interface UseCesiumViewerOpts {
  /** Callback when the Viewer is ready for layer attachment */
  onReady?: (viewer: CesiumNS.Viewer, Cesium: typeof CesiumNS) => void
  /** Base-mode switcher — callers can change this; see BaseModeSwitcher */
  baseMode?: BaseMode
  /** Optional initial camera destination [lng, lat, height_m] */
  initialCamera?: { lng: number; lat: number; height: number }
}

export interface UseCesiumViewerResult {
  /** Attach to the DOM div that hosts the Cesium canvas */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Whether the Viewer has booted + the scene defaults applied */
  ready: boolean
  /** Direct handle to the Viewer once ready */
  viewerRef: React.RefObject<CesiumNS.Viewer | null>
  /** Cesium namespace once loaded */
  cesiumRef: React.RefObject<typeof CesiumNS | null>
  /** Ion enablement status once initialized */
  ionEnabled: boolean
}

export function useCesiumViewer(opts: UseCesiumViewerOpts = {}): UseCesiumViewerResult {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CesiumNS.Viewer | null>(null)
  const cesiumRef = useRef<typeof CesiumNS | null>(null)
  const [ready, setReady] = useState(false)
  const [ionEnabled, setIonEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    let viewer: CesiumNS.Viewer | null = null

    ;(async () => {
      if (!containerRef.current) return
      // Don't double-mount (StrictMode safeguard)
      if (viewerRef.current) return

      try {
        const [{ applyV2SceneDefaults, initCesium }, Cesium] = await Promise.all([
          import("@/lib/geo/engine/cesium-init"),
          import("cesium"),
        ])
        if (cancelled) return

        const init = await initCesium(Cesium, { debug: true })
        setIonEnabled(init.ionEnabled)

        viewer = new Cesium.Viewer(containerRef.current!, {
          // Minimal widget set — we build our own chrome in React
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          // Terrain starts flat (ellipsoid); Phase 3 wires bathymetry.
          // Imagery uses Cesium's default layer for now (Natural Earth II
          // or Ion when token is set); Phase 3 swaps to NASA GIBS WMTS.
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          // Rendering perf
          requestRenderMode: false,
          maximumRenderTimeChange: Infinity,
          contextOptions: {
            webgl: {
              // WebGL 2 when available, fallback to 1
              // Cesium picks best context automatically
              alpha: false,
              preserveDrawingBuffer: false,
              powerPreference: "high-performance" as WebGLPowerPreference,
            },
          },
        })

        if (cancelled) {
          viewer.destroy()
          return
        }

        applyV2SceneDefaults(viewer)

        // Initial camera destination
        if (opts.initialCamera) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              opts.initialCamera.lng,
              opts.initialCamera.lat,
              opts.initialCamera.height,
            ),
            duration: 0,
          })
        } else {
          // Default: continental US view
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(-98.5, 39.8, 15_000_000),
          })
        }

        viewerRef.current = viewer
        cesiumRef.current = Cesium
        setReady(true)
        opts.onReady?.(viewer, Cesium)
      } catch (e) {
        console.warn("[useCesiumViewer] init failed:", e)
      }
    })()

    return () => {
      cancelled = true
      try {
        viewerRef.current?.destroy()
      } catch {}
      viewerRef.current = null
      cesiumRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { containerRef, ready, viewerRef, cesiumRef, ionEnabled }
}
