/**
 * RECONSTRUCTED dormant stub (see lib/geo/crep-map-fly-to.ts header). v3 Google-photorealistic
 * 3D camera bridge — Cursor's lane. All no-ops / empty state until the real bridge is synced; the
 * legacy globe never drives it and the v3 photoreal scene (separate /photo3d route) degrades to
 * "no tiles". Cursor's real version supersedes on sync.
 */
import type { Map as MapLibreMap } from "maplibre-gl"

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined

export interface V3MapCameraView {
  center?: [number, number]
  zoom?: number
  pitch?: number
  bearing?: number
  [k: string]: unknown
}

type BridgeListener = (view: V3MapCameraView | null) => void

export function publishMapCameraFromMap(_map: MapLike): void { /* v3-only no-op */ }
export function resetV3Photo3dCompositing(): void { /* v3-only no-op */ }
export function setV3MapGestureActive(_active: boolean): void { /* v3-only no-op */ }
export function setV3Photo3dLayerActive(_active: boolean): void { /* v3-only no-op */ }
export function setV3Photo3dTilesReady(_ready: boolean): void { /* v3-only no-op */ }
export function isV3Photo3dCameraMoving(): boolean { return false }

export const v3GooglePhotoBridge = {
  publishMapCameraFromMap,
  resetV3Photo3dCompositing,
  setV3MapGestureActive,
  setV3Photo3dLayerActive,
  setV3Photo3dTilesReady,
  isV3Photo3dCameraMoving,
  getLatest(): V3MapCameraView | null { return null },
  subscribe(_cb: BridgeListener): () => void { return () => { /* */ } },
}
