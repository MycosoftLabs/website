/**
 * Cesium engine initialization (Phase 2 — CREP Earth v2)
 *
 * Single source of truth for:
 *   • Ion access token (if present)
 *   • Cesium worker/base URL (served from /cesium/ in public/)
 *   • Default scene settings that make Earth OPAQUE (non-negotiable §2)
 *   • Atmosphere + lighting presets
 *
 * Designed so callers don't have to know whether the token is present.
 * Graceful fallbacks are baked in — an unset token means no World
 * Bathymetry, but imagery + flat terrain still work.
 */

import type * as CesiumNS from "cesium"

export interface CesiumInitOptions {
  /** If true, log diagnostic messages to console */
  debug?: boolean
}

export interface CesiumInitResult {
  /** Whether an Ion token was found + configured */
  ionEnabled: boolean
  /** Cesium worker base URL that was set */
  cesiumBaseUrl: string
  /** Token scope, for debug */
  tokenSource: "env" | "meta" | "none"
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string
  }
}

/**
 * One-time init. Safe to call multiple times — only actually runs once
 * per page load (guarded by module-level flag).
 */
let _initialised = false
let _initResult: CesiumInitResult | null = null

export async function initCesium(
  Cesium: typeof CesiumNS,
  opts: CesiumInitOptions = {},
): Promise<CesiumInitResult> {
  if (_initialised && _initResult) return _initResult

  // Cesium bundles its worker JS + static assets. We ship them under
  // /public/cesium/ so MapLibre's /cesium path doesn't collide with
  // anything. Set CESIUM_BASE_URL before any Viewer is created.
  const cesiumBaseUrl = "/cesium/"
  if (typeof window !== "undefined") {
    window.CESIUM_BASE_URL = cesiumBaseUrl
  }
  // Cesium also respects a module-level property
  ;(Cesium as any).buildModuleUrl.setBaseUrl?.(cesiumBaseUrl)

  // Resolve Ion token. Order of precedence:
  //   1. NEXT_PUBLIC_CESIUM_ION_TOKEN env (build time)
  //   2. <meta name="cesium-ion-token" content="..."> server-rendered
  //   3. none → unset Cesium.Ion.defaultAccessToken
  let token: string | undefined =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN
      : undefined
  let tokenSource: CesiumInitResult["tokenSource"] = "env"

  if (!token && typeof document !== "undefined") {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="cesium-ion-token"]')
    if (meta?.content) {
      token = meta.content
      tokenSource = "meta"
    }
  }

  if (token) {
    Cesium.Ion.defaultAccessToken = token
  } else {
    // Explicitly unset so Cesium doesn't attempt ion requests with its
    // built-in demo token (which rate-limits fast).
    ;(Cesium.Ion as any).defaultAccessToken = undefined
    tokenSource = "none"
  }

  _initResult = {
    ionEnabled: !!token,
    cesiumBaseUrl,
    tokenSource,
  }
  _initialised = true

  if (opts.debug) {
    console.log("[CesiumInit]", _initResult)
  }

  return _initResult
}

/**
 * Apply scene defaults that enforce v2 non-negotiables:
 *   • Opaque Earth (no glass globe)
 *   • Depth testing against terrain
 *   • Atmosphere + ground atmosphere enabled
 *   • Lighting based on sun position (cinematic feel, matches space-weather layer)
 */
export function applyV2SceneDefaults(viewer: CesiumNS.Viewer) {
  try {
    const scene = viewer.scene
    const globe = scene.globe

    // ─── Non-negotiable: opaque planet in normal mode ───
    ;(globe.translucency as any).enabled = false
    globe.depthTestAgainstTerrain = true

    // ─── Cinematic + realistic defaults ───
    globe.showGroundAtmosphere = true
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = true
    globe.enableLighting = true
    // dynamicAtmosphereLighting is a Cesium property that adjusts ground
    // atmosphere colour based on the sun position; matches the Sun→Earth
    // correlation layer the dashboard already shows.
    ;(globe as any).dynamicAtmosphereLighting = true
    ;(globe as any).dynamicAtmosphereLightingFromSun = true

    // ─── Tune quality vs performance ───
    // Default tile cache is conservative; bump for smoother panning.
    ;(globe as any).tileCacheSize = 1000
    // Preloading: sibling tiles at current zoom keep panning fluid.
    ;(globe as any).preloadSiblings = true

    // Sun + moon are already drawn by default; ensure they stay on.
    if (scene.sun) scene.sun.show = true
    if (scene.moon) scene.moon.show = true
    if (scene.skyBox) scene.skyBox.show = true

    // Lock FOV so camera animations don't over-zoom.
    // Only PerspectiveFrustum has fov; type-guard.
    const frustum = scene.camera.frustum as any
    if (typeof frustum.fov === "number") frustum.fov = Cesium_FOV_RADIANS
  } catch (e) {
    // Non-fatal — if a Cesium version lacks one of these properties,
    // log and continue. The core opaque-Earth + depth-test bits are
    // what matters.
    console.warn("[CesiumInit] applyV2SceneDefaults: non-fatal property setter failed", e)
  }
}

// 60° FOV in radians
const Cesium_FOV_RADIANS = (60 * Math.PI) / 180
