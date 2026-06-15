/**
 * BlueSite feature flags (Earth Simulator v2, Phase 0).
 *
 * Everything v2 is OFF by default. A flag is ON when ANY of these say so, in
 * priority order: runtime `window.__es_v2` override → URL query param → build-time
 * `NEXT_PUBLIC_*` env. The master `bluesite` switch must be on for any sub-flag to
 * take effect. Mirrors the v1 pattern (`window.__crep_enableDeckSatElevation`,
 * `NEXT_PUBLIC_CREP_*`).
 */

export interface BlueSiteFlags {
  bluesite: boolean; // master v2 switch
  moverAltitude: boolean; // ?es3d
  smoke: boolean; // ?smoke
  clouds3d: boolean; // ?clouds3d
  spores3d: boolean; // ?spores3d
  tiles3d: boolean; // ?tiles3d
  gisLab: boolean; // ?gisLab
  bathymetry: boolean; // ?bathymetry
  /** Phase-0 spike: mount one test marker to verify the globe-lock. */
  spike: boolean; // ?es3dspike
}

type FlagKey = keyof BlueSiteFlags;

const QUERY_KEY: Record<FlagKey, string> = {
  bluesite: "bluesite",
  moverAltitude: "es3d",
  smoke: "smoke",
  clouds3d: "clouds3d",
  spores3d: "spores3d",
  tiles3d: "tiles3d",
  gisLab: "gisLab",
  bathymetry: "bathymetry",
  spike: "es3dspike",
};

const ENV_FLAG: Partial<Record<FlagKey, string | undefined>> = {
  bluesite: process.env.NEXT_PUBLIC_ES_BLUESITE,
  gisLab: process.env.NEXT_PUBLIC_EARTH_SIM_GIS_LAB,
};

function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

export function getBlueSiteFlags(): BlueSiteFlags {
  const out = {
    bluesite: false,
    moverAltitude: false,
    smoke: false,
    clouds3d: false,
    spores3d: false,
    tiles3d: false,
    gisLab: false,
    bathymetry: false,
    spike: false,
  } as BlueSiteFlags;

  const keys = Object.keys(out) as FlagKey[];

  // 1) build-time env
  for (const k of keys) {
    if (truthy(ENV_FLAG[k])) out[k] = true;
  }

  if (typeof window === "undefined") return out;

  // 2) URL query params
  try {
    const sp = new URLSearchParams(window.location.search);
    for (const k of keys) {
      if (sp.has(QUERY_KEY[k]) && truthy(sp.get(QUERY_KEY[k]) ?? "1")) out[k] = true;
    }
  } catch { /* ignore */ }

  // 3) runtime override (highest priority; can also force-OFF)
  const ov = (window as unknown as { __es_v2?: Partial<BlueSiteFlags> }).__es_v2;
  if (ov && typeof ov === "object") {
    for (const k of keys) {
      if (typeof ov[k] === "boolean") out[k] = ov[k] as boolean;
    }
  }

  // master gate: sub-flags only matter when bluesite is on
  if (!out.bluesite) {
    for (const k of keys) { if (k !== "bluesite") out[k] = false; }
  }
  return out;
}
