/**
 * Eagle Eye / CCTV map glyph — neon blue camera icon, larger hit target than cell towers.
 * May 24, 2026 — Morgan: cameras must not look like purple cell-tower dots.
 */

import type { Map as MapLibreMap } from "maplibre-gl"

export const EAGLE_CAMERA_ICON_ID = "crep-eagle-camera-neon"
/** Electric neon cyan — distinct from cell towers (#c084fc) and power plants (#fbbf24). */
export const EAGLE_CAMERA_NEON = "#00f3ff"
export const EAGLE_CAMERA_GLOW = "rgba(0, 243, 255, 0.35)"

export const EAGLE_CAMERA_LAYER_PREFIX = "crep-eagle-cams"

export const EAGLE_CAMERA_LAYER_IDS = {
  hit: `${EAGLE_CAMERA_LAYER_PREFIX}-hit`,
  glow: `${EAGLE_CAMERA_LAYER_PREFIX}-glow`,
  icon: `${EAGLE_CAMERA_LAYER_PREFIX}-icon`,
  label: `${EAGLE_CAMERA_LAYER_PREFIX}-label`,
} as const

export function eagleCameraLayerIds(prefix = EAGLE_CAMERA_LAYER_PREFIX) {
  return {
    hit: `${prefix}-hit`,
    glow: `${prefix}-glow`,
    icon: `${prefix}-icon`,
    label: `${prefix}-label`,
  } as const
}

export function eagleCameraClickLayerIds(prefix = EAGLE_CAMERA_LAYER_PREFIX) {
  const ids = eagleCameraLayerIds(prefix)
  return [ids.hit, ids.icon, ids.glow] as const
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function ensureEagleCameraMapIcon(map: MapLibreMap): Promise<void> {
  if (map.hasImage(EAGLE_CAMERA_ICON_ID)) return

  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(0, 243, 255, 0.55)")
  gradient.addColorStop(0.55, "rgba(0, 243, 255, 0.12)")
  gradient.addColorStop(1, "rgba(0, 243, 255, 0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = EAGLE_CAMERA_NEON
  ctx.lineWidth = 5
  ctx.fillStyle = "#021018"
  roundRect(ctx, 26, 44, 76, 50, 10)
  ctx.fill()
  ctx.stroke()

  roundRect(ctx, 44, 28, 40, 18, 5)
  ctx.fillStyle = EAGLE_CAMERA_NEON
  ctx.fill()

  ctx.beginPath()
  ctx.arc(64, 69, 17, 0, Math.PI * 2)
  ctx.fillStyle = "#002833"
  ctx.fill()
  ctx.strokeStyle = EAGLE_CAMERA_NEON
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(64, 69, 7, 0, Math.PI * 2)
  ctx.fillStyle = EAGLE_CAMERA_NEON
  ctx.fill()

  const imageData = ctx.getImageData(0, 0, size, size)
  map.addImage(EAGLE_CAMERA_ICON_ID, imageData, { pixelRatio: 2 })
}

/** Invisible enlarged hit target — easier tap than cell-tower dots. */
export function eagleCameraHitLayer(sourceId: string, prefix = EAGLE_CAMERA_LAYER_PREFIX) {
  const ids = eagleCameraLayerIds(prefix)
  return {
    id: ids.hit,
    type: "circle" as const,
    source: sourceId,
    minzoom: 2,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2, 14,
        5, 16,
        8, 20,
        12, 24,
        16, 28,
      ],
      "circle-color": EAGLE_CAMERA_NEON,
      "circle-opacity": 0.001,
    },
  }
}

/** Soft neon halo — larger than cell-tower purple dots at every zoom. */
export function eagleCameraGlowLayer(sourceId: string, prefix = EAGLE_CAMERA_LAYER_PREFIX) {
  const ids = eagleCameraLayerIds(prefix)
  return {
    id: ids.glow,
    type: "circle" as const,
    source: sourceId,
    minzoom: 2,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2, 8,
        5, 10,
        8, 13,
        12, 16,
        16, 20,
      ],
      "circle-color": EAGLE_CAMERA_NEON,
      "circle-opacity": 0.22,
      "circle-blur": 0.85,
    },
  }
}

export function eagleCameraIconLayer(sourceId: string, prefix = EAGLE_CAMERA_LAYER_PREFIX) {
  const ids = eagleCameraLayerIds(prefix)
  return {
    id: ids.icon,
    type: "symbol" as const,
    source: sourceId,
    minzoom: 2,
    layout: {
      "icon-image": EAGLE_CAMERA_ICON_ID,
      "icon-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2, 0.42,
        5, 0.52,
        8, 0.62,
        12, 0.78,
        16, 0.95,
      ],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  }
}

export function eagleCameraLabelLayer(sourceId: string, prefix = EAGLE_CAMERA_LAYER_PREFIX) {
  const ids = eagleCameraLayerIds(prefix)
  return {
    id: ids.label,
    type: "symbol" as const,
    source: sourceId,
    minzoom: 10,
    layout: {
      "text-field": ["get", "provider"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 15, 11],
      "text-offset": [0, 1.4],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "text-optional": true,
      "text-transform": "uppercase",
      "text-letter-spacing": 0.06,
    } as Record<string, unknown>,
    paint: {
      "text-color": "#e0fdff",
      "text-halo-color": "rgba(0,0,0,0.85)",
      "text-halo-width": 1.3,
    },
  }
}

export const EAGLE_CAMERA_CLICK_LAYER_IDS = eagleCameraClickLayerIds()
