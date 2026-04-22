"use client"

/**
 * GooglePhoto3DScene — Apr 22, 2026
 *
 * Morgan: "why have you not fully added rendering of clouds 3d buildings
 * shadows all from threejs new update code and google maps full apis"
 *
 * Photorealistic 3D view powered by:
 *   - Google Photorealistic 3D Tiles (3d-tiles-renderer GoogleCloudAuthPlugin)
 *   - @takram/three-atmosphere — Bruneton atmospheric scattering sky + sun
 *   - @takram/three-geospatial — WGS84 ellipsoid helpers
 *   - three.js r184 + @react-three/fiber v9
 *
 * Delivered as a standalone route at /dashboard/crep/photo3d so the core
 * MapLibre CREP globe stays untouched. Next iteration adds a MapLibre
 * custom-layer integration so these tiles can be rendered alongside the
 * live aircraft / vessel / satellite layers.
 */

import { Canvas, useThree } from "@react-three/fiber"
import { TilesRenderer, TilesPlugin, GlobeControls } from "3d-tiles-renderer/r3f"
import { GoogleCloudAuthPlugin, TilesFadePlugin } from "3d-tiles-renderer/plugins"
import { Atmosphere, Sky, SkyLight, SunLight, Stars } from "@takram/three-atmosphere/r3f"
import { useEffect, useMemo, useRef } from "react"
import { Geodetic } from "@takram/three-geospatial"
import { Vector3, PerspectiveCamera } from "three"

const GOOGLE_3D_TILES_URL = "https://tile.googleapis.com/v1/3dtiles/root.json"

// San Diego default anchor — matches Project Oyster + Goffs proximity so
// operators land somewhere meaningful out of the box.
const DEFAULT_LNG = -117.1611
const DEFAULT_LAT = 32.7157
const DEFAULT_ALT_M = 600

function useECEFSpawn(lng: number, lat: number, alt: number) {
  return useMemo(() => {
    const g = new Geodetic(
      (lng * Math.PI) / 180,
      (lat * Math.PI) / 180,
      alt,
    )
    return g.toECEF()
  }, [lng, lat, alt])
}

function CameraInit({ target }: { target: Vector3 }) {
  const { camera } = useThree()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    // Position the camera ~2 km out from the target in the ENU-up direction
    const pc = camera as PerspectiveCamera
    pc.near = 10
    pc.far = 5e8
    pc.updateProjectionMatrix()
    const up = target.clone().normalize()
    pc.position.copy(target).addScaledVector(up, 2000)
    pc.lookAt(target)
    done.current = true
  }, [camera, target])
  return null
}

export default function GooglePhoto3DScene() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY || ""
  const spawn = useECEFSpawn(DEFAULT_LNG, DEFAULT_LAT, DEFAULT_ALT_M)

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white p-6 text-sm font-mono">
        NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY not configured — 3D tiles unavailable.
      </div>
    )
  }

  return (
    <Canvas
      shadows
      frameloop="demand"
      gl={{ antialias: true, logarithmicDepthBuffer: true }}
      camera={{ fov: 55, near: 10, far: 5e8 }}
    >
      <CameraInit target={spawn} />

      {/* Photorealistic Google 3D Tiles (WGS84 ECEF) */}
      <TilesRenderer url={GOOGLE_3D_TILES_URL}>
        <TilesPlugin plugin={GoogleCloudAuthPlugin} apiToken={apiKey} />
        <TilesPlugin plugin={TilesFadePlugin} fadeDuration={250} />
      </TilesRenderer>

      {/* Atmospheric scattering + sun + stars */}
      <Atmosphere>
        <Sky />
        <SunLight />
        <SkyLight />
        <Stars />
      </Atmosphere>

      {/* Globe controls — ECEF-aware orbit/zoom around the Earth */}
      <GlobeControls />
    </Canvas>
  )
}
