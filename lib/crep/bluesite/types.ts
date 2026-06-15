/**
 * BlueSite shared models (Earth Simulator v2, Phase 0).
 *
 * One effect model for every animated v2 system (smoke, fire, spore, cloud,
 * weather, emission) — fed from the live sources the v1 map already fetches.
 */

export type BlueSiteEffectType =
  | "smoke"
  | "fire"
  | "spore"
  | "cloud"
  | "weather"
  | "emission";

export interface BlueSiteEffect {
  id: string;
  type: BlueSiteEffectType;
  /** "FIRMS" | "HRRR" | "EONET" | "MINDEX" | "Earth2" | "AirNow" | ... */
  source: string;
  lat: number;
  lng: number;
  /** Base altitude in meters. */
  altitudeMeters: number;
  radiusMeters: number;
  /** 0..1 — drives particle count / volumetric density. */
  intensity: number;
  /** Wind for advection: [east m/s, north m/s]. */
  windVector: [number, number];
  /** Epoch ms — used for timeline scrubbing + decay. */
  timestamp: number;
  /** Fade rate per second (0 = persistent). */
  decay: number;
  /** RGB 0..255. */
  color: [number, number, number];
  /** Source freshness 0..1 (optional). */
  health?: number;
}

/** v2 layer keys added to the existing CREP toggle system. */
export const BLUESITE_LAYER_KEYS = [
  "bluesite3d",
  "moverAltitude",
  "volumetricSmoke",
  "volumetricClouds",
  "sporeField3d",
  "photoTiles",
  "bathymetry",
] as const;
export type BlueSiteLayerKey = (typeof BLUESITE_LAYER_KEYS)[number];

/** Altitude bands (mercator-Z meters) the mover layer snaps entities into. */
export const ALT_BANDS = {
  subsurface: -2000,
  seaSurface: 0,
  ground: 0,
  cruise: 11_000, // commercial aircraft cruise
  leo: 550_000,
  meo: 20_200_000,
  geo: 35_786_000,
} as const;
