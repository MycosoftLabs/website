"use client"

/**
 * Photorealistic 3D Tiles — Google Map Tiles API + Cesium Ion — Apr 20, 2026
 *
 * Morgan: "i gave cursor to add the cesium ion key i enabled map tiles
 * api cursor already has key".
 *
 * Renders photorealistic 3D city meshes via Google's Photorealistic 3D
 * Tiles (the same mesh that powers Google Earth 3D buildings) and/or
 * Cesium Ion assets. Uses deck.gl's Tile3DLayer with loaders.gl's
 * Tiles3DLoader / CesiumIonLoader, mounted as a dedicated MapboxOverlay
 * on the MapLibre map.
 *
 * Env vars (any of, reads both public + server-prefixed names):
 *   Google Map Tiles API key:
 *     NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY
 *     NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY
 *     NEXT_PUBLIC_GOOGLE_3D_TILES_KEY
 *   Cesium Ion token:
 *     NEXT_PUBLIC_CESIUM_ION_TOKEN
 *     NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN
 *
 * Behavior:
 *   • When either key is set AND toggle is on, attaches a Tile3DLayer
 *     via its own MapboxOverlay. LOD auto-managed by loaders.gl.
 *   • No-op when keys not set (just mounts an empty effect + logs once).
 *   • Preferred backend is Google (photorealistic worldwide); falls
 *     back to Cesium Ion photorealistic asset (2275207) if only the
 *     Ion token is present.
 *   • Compatible with MapLibre globe projection — Tile3DLayer aligns
 *     in ECEF when globe is on.
 *
 * The EntityDeckLayer singleton MapboxOverlay was removed from the
 * dashboard (all entities now native MapLibre layers), so this
 * component's own MapboxOverlay doesn't collide.
 */

import { useEffect, useRef } from "react"
import { MapboxOverlay } from "@deck.gl/mapbox"
import { Tile3DLayer } from "@deck.gl/geo-layers"
import { Tiles3DLoader, CesiumIonLoader } from "@loaders.gl/3d-tiles"
import type { Map as MapLibreMap, IControl } from "maplibre-gl"

const GOOGLE_TILES_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_3D_TILES_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAP_TILES ||
  ""

const CESIUM_ION_TOKEN =
  process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ||
  process.env.NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_CESIUM_TOKEN ||
  ""

// Cesium Ion asset IDs:
// 2275207 = Google Photorealistic 3D Tiles (proxied via Ion partnership)
// 96188   = Cesium World Terrain (global DEM)
const CESIUM_ASSET_PHOTOREALISTIC = 2275207

export interface Photorealistic3DProps {
  map: MapLibreMap | null
  enabled: boolean
  opacity?: number
  /** Which backend when both keys are available. Default "auto". */
  preferred?: "google" | "cesium-ion" | "auto"
}

function resolveBackend(preferred: Photorealistic3DProps["preferred"]): "google" | "cesium-ion" | "none" {
  const hasGoogle = !!GOOGLE_TILES_KEY
  const hasCesium = !!CESIUM_ION_TOKEN
  if (preferred === "google" && hasGoogle) return "google"
  if (preferred === "cesium-ion" && hasCesium) return "cesium-ion"
  if (hasGoogle) return "google"
  if (hasCesium) return "cesium-ion"
  return "none"
}

export default function Photorealistic3DTiles({
  map,
  enabled,
  opacity = 1,
  preferred = "auto",
}: Photorealistic3DProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null)

  useEffect(() => {
    if (!map) return
    if (!enabled) {
      if (overlayRef.current) {
        try { map.removeControl(overlayRef.current as unknown as IControl) } catch { /* ignore */ }
        overlayRef.current = null
      }
      return
    }

    const backend = resolveBackend(preferred)
    if (backend === "none") {
      console.warn(
        "[Photorealistic3D] No key set — layer stays idle. " +
        "Expected NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY or NEXT_PUBLIC_CESIUM_ION_TOKEN.",
      )
      return
    }

    // Build the 3D Tiles layer.
    let layer: any
    if (backend === "google") {
      layer = new Tile3DLayer({
        id: "photorealistic-google-3d-tiles",
        data: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_TILES_KEY}`,
        loader: Tiles3DLoader,
        loadOptions: {
          "3d-tiles": { loadGLTF: true },
          fetch: { headers: { "X-GOOG-MAPS-API-VERSION": "v1" } },
        },
        opacity,
        pickable: false,
        _subLayerProps: {
          scenegraph: { _lighting: "pbr" },
        },
      } as any)
    } else {
      // cesium-ion
      layer = new Tile3DLayer({
        id: "photorealistic-cesium-ion-3d-tiles",
        data: CESIUM_ASSET_PHOTOREALISTIC,
        loader: CesiumIonLoader,
        loadOptions: {
          "cesium-ion": { accessToken: CESIUM_ION_TOKEN },
        },
        opacity,
        pickable: false,
      } as any)
    }

    // Mount a dedicated non-interleaved MapboxOverlay so the 3D tiles
    // render ABOVE the basemap but below UI markers. Using non-interleaved
    // avoids the "one interleaved overlay per map" constraint and keeps
    // this layer cleanly separable when the user toggles it off.
    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [layer],
    })
    try {
      map.addControl(overlay as unknown as IControl)
      overlayRef.current = overlay
      console.log(`[Photorealistic3D] ${backend} layer attached (opacity=${opacity})`)
    } catch (e: any) {
      console.warn("[Photorealistic3D] failed to attach overlay:", e?.message || e)
    }

    return () => {
      if (overlayRef.current) {
        try { map.removeControl(overlayRef.current as unknown as IControl) } catch { /* ignore */ }
        overlayRef.current = null
      }
    }
  }, [map, enabled, opacity, preferred])

  return null
}

/**
 * Status helper for UI badges / toggle tooltips — tells the dashboard
 * which backend is active and whether the toggle will do anything.
 */
export function photorealistic3DStatus(preferred: Photorealistic3DProps["preferred"] = "auto") {
  const backend = resolveBackend(preferred)
  return {
    keyAvailable: backend !== "none",
    backend,
    googleConfigured: !!GOOGLE_TILES_KEY,
    cesiumConfigured: !!CESIUM_ION_TOKEN,
  }
}
