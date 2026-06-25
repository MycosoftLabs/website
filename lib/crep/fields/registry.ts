/**
 * Earth Simulator — Arraylake gridded-FIELD registry (the "cubes").
 *
 * Companion to lib/crep/feeds/registry.ts. Where FEED_REGISTRY describes discrete
 * VECTOR sources (points/polygons), this describes the continuous GRIDDED model
 * cubes in the `mycosoft` Arraylake org (ERA5, HRRR, MRMS, Helios solar, ALIVE
 * GPP, canopy height, biomass, Sentinel-2, GEO stereo wind). Each is rendered as
 * an ANIMATED field: a scalar variable → time-looped raster heatmap, or a vector
 * (u/v) variable → wind-particle flow.
 *
 * TWO-PLANE CONTRACT (arraylake/zarr are server-side Python; they never enter the
 * browser bundle):
 *   1. DATA PLANE (Cursor / server, authed): scripts/arraylake/bake_field.py reads
 *      repo → variable[time,lat,lon] → bakes per-timestep PNG tiles (scalar) or a
 *      velocity-grid JSON (wind) + a manifest.json → ARRAYLAKE_FIELD_BASE storage.
 *   2. VIEW PLANE (this repo): /api/crep/field/[dataset]/[variable] serves the
 *      manifest; <FieldRasterLayer> / <FieldWindLayer> animate it. Until a cube is
 *      baked the BFF returns an empty manifest and the layer renders nothing — the
 *      same graceful-degrade contract as the feed proxy. NO MOCK DATA.
 *
 * Everything here is ADDITIVE + flag-gated (NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS) and
 * defaults OFF. Toggle off → byte-for-byte v1.
 *
 * `zarrVar` / `timeDim` are the actual array/coordinate names inside each cube and
 * are marked VERIFY — confirm them against scripts/arraylake/introspect.py output
 * before the bake job runs (they're best-guess from each product's documented
 * variable names; the bake reads them straight from these configs).
 */

export type FieldRender = "raster" | "wind"
export type FieldGroup =
  | "weather"
  | "solar"
  | "carbon"
  | "vegetation"
  | "wind"
  | "imagery"

/** A color ramp as normalized [0..1] stops → CSS color. Baked into the PNG by the
 *  data plane AND used by the view plane for the legend. */
export type Ramp = Array<[number, string]>

export interface FieldVariable {
  /** our stable key, used in the layer id + BFF path (e.g. "t2m"). */
  key: string
  /** VERIFY: the zarr array name inside the cube (e.g. "2m_temperature"). */
  zarrVar: string
  /** for wind: VERIFY the v-component array name; u goes in zarrVar. */
  zarrVarV?: string
  name: string
  unit?: string
  render: FieldRender
  /** physical [min,max] the ramp spans (scalar only). */
  valueRange?: [number, number]
  /** normalized color ramp (scalar only). */
  ramp?: Ramp
  /** wind only: [min,max] speed (m/s) for the particle speed→color/length. */
  speedRange?: [number, number]
  /** never true — fields are additive. Present for symmetry with FeedConfig. */
  default_on?: false
}

export interface FieldDataset {
  /** our id, used in the BFF path + layer ids (e.g. "era5"). */
  id: string
  /** the arraylake repo, e.g. "mycosoft/era5". The bake job reads this. */
  repo: string
  name: string
  group: FieldGroup
  provider: string
  coverage: "global" | "conus" | string
  /** single-epoch cube (no time animation) — render the one frame, no scrubber. */
  static?: boolean
  /** VERIFY: the name of the time coordinate (e.g. "time", "valid_time"). */
  timeDim?: string
  /** how many of the most-recent timesteps to bake/animate (live cubes). */
  frames?: number
  /** map zoom floor — CONUS/high-res cubes read in further than global ones. */
  minZoom?: number
  /** native CRS for projected CONUS cubes before reproject to EPSG:4326 (VERIFY via introspect). */
  nativeCrs?: string
  /** force EPSG:4326 reproject even when coverage is not conus */
  reproject?: boolean
  variables: FieldVariable[]
  notes?: string
}

// ─── shared color ramps (normalized 0..1) ────────────────────────────────────
const RAMP_TEMP: Ramp = [
  [0, "#2c3e8c"], [0.25, "#4ea0d6"], [0.5, "#e8e6c8"], [0.75, "#e8893b"], [1, "#a01010"],
] // cool→warm (coolwarm), good for 2m temperature
const RAMP_PRECIP: Ramp = [
  [0, "rgba(0,0,0,0)"], [0.15, "#9ad0f0"], [0.45, "#2f7fd0"], [0.75, "#6a3fd0"], [1, "#d040b0"],
]
const RAMP_REFLECTIVITY: Ramp = [
  [0, "rgba(0,0,0,0)"], [0.2, "#04e9e7"], [0.4, "#019ff4"], [0.55, "#02fd02"],
  [0.7, "#fdf802"], [0.85, "#fd0000"], [1, "#fd00fd"],
] // NWS dBZ palette
const RAMP_SOLAR: Ramp = [
  [0, "#10082a"], [0.35, "#6a1b9a"], [0.65, "#e8762b"], [0.85, "#ffd23f"], [1, "#fffbe0"],
]
const RAMP_GPP: Ramp = [
  [0, "#5a4632"], [0.3, "#c9b458"], [0.6, "#6fae34"], [1, "#0b5d1e"],
] // bare→productive vegetation
const RAMP_NDVI: Ramp = [
  [0, "#a05a2c"], [0.4, "#e8d24a"], [0.7, "#5fae34"], [1, "#0b5d1e"],
]
const RAMP_CANOPY: Ramp = [
  [0, "#e6f0d8"], [0.4, "#7cc35a"], [0.7, "#2f8f3e"], [1, "#0f4a1e"],
]
const RAMP_BIOMASS: Ramp = [
  [0, "#efe4c8"], [0.35, "#cdb86a"], [0.65, "#5f9e44"], [1, "#0c4d22"],
]

/**
 * The owned `mycosoft` Arraylake org (locked Jun 24 2026). 10 repos. All OFF by
 * default; lit only when the data plane has baked the variable + the master flag
 * is on. Variables are the 1–3 highest-value animatable fields per cube.
 */
export const FIELD_REGISTRY: FieldDataset[] = [
  {
    id: "era5",
    repo: "mycosoft/era5",
    name: "ERA5 Reanalysis (ECMWF)",
    group: "weather",
    provider: "ECMWF / Earthmover",
    coverage: "global",
    timeDim: "time", // VERIFY
    frames: 24,
    minZoom: 0,
    notes: "86-yr hourly reanalysis, 43 vars. The 'time machine' baseline. Bake a rolling recent window for live view; historical scrubbing is a deeper bake.",
    variables: [
      { key: "t2m", zarrVar: "2m_temperature", name: "2 m Temperature", unit: "K", render: "raster", valueRange: [233, 318], ramp: RAMP_TEMP },
      { key: "wind10m", zarrVar: "10m_u_component_of_wind", zarrVarV: "10m_v_component_of_wind", name: "10 m Wind", unit: "m/s", render: "wind", speedRange: [0, 25] },
      { key: "tp", zarrVar: "total_precipitation", name: "Total Precipitation", unit: "m", render: "raster", valueRange: [0, 0.02], ramp: RAMP_PRECIP },
    ],
  },
  {
    id: "hrrr",
    repo: "mycosoft/noa-hrrr-forcast48hr",
    name: "HRRR 48 h Forecast (NOAA)",
    group: "weather",
    provider: "NOAA / Dynamical.org",
    coverage: "conus",
    reproject: true,
    timeDim: "time", // VERIFY (likely "time" with a "lead_time"/"step" dim)
    frames: 48,
    minZoom: 2,
    notes: "3 km CONUS forecast → +48h. Forward-time scrub: watch storms ARRIVE. Higher-res than RainViewer nowcast.",
    variables: [
      { key: "t2m", zarrVar: "temperature_2m", name: "2 m Temperature", unit: "K", render: "raster", valueRange: [243, 318], ramp: RAMP_TEMP },
      { key: "refc", zarrVar: "composite_reflectivity", name: "Composite Reflectivity", unit: "dBZ", render: "raster", valueRange: [5, 75], ramp: RAMP_REFLECTIVITY },
      { key: "wind10m", zarrVar: "u_component_of_wind_10m", zarrVarV: "v_component_of_wind_10m", name: "10 m Wind", unit: "m/s", render: "wind", speedRange: [0, 30] },
    ],
  },
  {
    id: "helios",
    repo: "mycosoft/helios-solar-irradiance",
    name: "Helios Solar Irradiance (Zeus AI)",
    group: "solar",
    provider: "Zeus AI / Earthmover",
    coverage: "global",
    timeDim: "time", // VERIFY
    frames: 18,
    minZoom: 0,
    notes: "6 h / 6 km global GHI/DNI/DHI forecast. Overlay our EIA solar plants → production now/next-6h.",
    variables: [
      { key: "ghi", zarrVar: "ghi", name: "Global Horizontal Irradiance", unit: "W/m²", render: "raster", valueRange: [0, 1000], ramp: RAMP_SOLAR },
    ],
  },
  {
    id: "alive",
    repo: "mycosoft/ALIVE-hourly",
    name: "ALIVE GPP (UW-Madison / GOES-R)",
    group: "carbon",
    provider: "ALIVE ABI / Earthmover",
    coverage: "global",
    timeDim: "time", // VERIFY
    frames: 24,
    minZoom: 0,
    notes: "Gross Primary Productivity (photosynthesis / carbon uptake), hourly. The diurnal 'breathing' of vegetation. Carbon-IN arm of the cycle.",
    variables: [
      { key: "gpp", zarrVar: "GPP", name: "Gross Primary Productivity", unit: "µmol CO₂ m⁻² s⁻¹", render: "raster", valueRange: [0, 30], ramp: RAMP_GPP },
    ],
  },
  {
    id: "canopy-height",
    repo: "mycosoft/canopy-height",
    name: "Canopy Height (Meta / WRI)",
    group: "vegetation",
    provider: "Meta + WRI / Earthmover",
    coverage: "global",
    static: true,
    minZoom: 3,
    notes: "1 m global canopy height (single epoch). Static → biomass/structure heatmap (3D extrusion is a later enhancement). Fungal-habitat layer.",
    variables: [
      { key: "height", zarrVar: "canopy_height", name: "Canopy Height", unit: "m", render: "raster", valueRange: [0, 40], ramp: RAMP_CANOPY },
    ],
  },
  {
    id: "sentinel2",
    repo: "mycosoft/global-sentinel2-mosaics",
    name: "Sentinel-2 Mosaics (ESA)",
    group: "imagery",
    provider: "ESA Copernicus / Earthmover",
    coverage: "global",
    timeDim: "time", // VERIFY — seasonal/annual mosaic index if present
    frames: 4,
    minZoom: 2,
    notes: "10 m optical mosaics. Bake true-color RGB (base imagery) + derived NDVI (greening pulse). Temporal mosaics → seasonal change loop.",
    variables: [
      { key: "ndvi", zarrVar: "ndvi", name: "NDVI (greenness)", unit: "", render: "raster", valueRange: [-0.1, 0.9], ramp: RAMP_NDVI },
      // RGB true-color is baked as a direct image (no ramp) — render: raster, valueRange/ramp omitted, the baker writes a 3-band PNG.
      { key: "truecolor", zarrVar: "B04,B03,B02", name: "True Color (10 m)", render: "raster" },
    ],
  },
  {
    id: "geo-stereo-wind",
    repo: "mycosoft/GEO-stero-wind",
    name: "GEO Stereo Wind (AMVs)",
    group: "wind",
    provider: "Geostationary stereo / Earthmover",
    coverage: "global",
    timeDim: "time", // VERIFY
    frames: 12,
    minZoom: 0,
    notes: "Satellite-OBSERVED, height-resolved atmospheric motion vectors. THE wind-particle showcase; maps to v2 altitude shells. Advection source-of-truth for smoke/spores.",
    variables: [
      { key: "wind", zarrVar: "u", zarrVarV: "v", name: "Atmospheric Motion (wind)", unit: "m/s", render: "wind", speedRange: [0, 60] },
    ],
  },
  {
    id: "biomass-sample",
    repo: "mycosoft/biomass-atlas-sample",
    name: "Biomass Atlas (sample)",
    group: "carbon",
    provider: "Earthmover (sample)",
    coverage: "global",
    static: true,
    minZoom: 2,
    notes: "Above-ground biomass carbon stock — SAMPLE subset for fast iteration. Same loader/shader as global-aboveground-biomass; repoint BFF for prod.",
    variables: [
      { key: "agb", zarrVar: "agb", name: "Above-ground Biomass", unit: "Mg/ha", render: "raster", valueRange: [0, 400], ramp: RAMP_BIOMASS },
    ],
  },
  {
    id: "biomass-global",
    repo: "mycosoft/global-aboveground-biomass",
    name: "Above-ground Biomass (global)",
    group: "carbon",
    provider: "ESA-CCI/GEDI class / Earthmover",
    coverage: "global",
    static: true,
    minZoom: 1,
    notes: "Production global AGB carbon stock. Carbon-STORED arm of the cycle (with ALIVE GPP = carbon-IN, fungal data = carbon-OUT).",
    variables: [
      { key: "agb", zarrVar: "agb", name: "Above-ground Biomass", unit: "Mg/ha", render: "raster", valueRange: [0, 500], ramp: RAMP_BIOMASS },
    ],
  },
  {
    id: "mrms",
    repo: "mycosoft/noaa-mrms-conus-hourly",
    name: "MRMS Radar (NOAA, 1 km CONUS)",
    group: "weather",
    provider: "NOAA / Dynamical.org",
    coverage: "conus",
    reproject: true,
    timeDim: "time", // VERIFY
    frames: 24,
    minZoom: 2,
    notes: "1 km observed radar truth — composite reflectivity + precip rate. Upgrade of RainViewer for CONUS. 'Now' arm of the precip time-triad (ERA5 past / MRMS now / HRRR next).",
    variables: [
      { key: "refc", zarrVar: "MergedReflectivityQCComposite", name: "Composite Reflectivity", unit: "dBZ", render: "raster", valueRange: [5, 75], ramp: RAMP_REFLECTIVITY },
      { key: "precip_rate", zarrVar: "PrecipRate", name: "Precip Rate", unit: "mm/h", render: "raster", valueRange: [0, 50], ramp: RAMP_PRECIP },
    ],
  },
]

/** field group → CREP layer-panel category. All field cubes live under the dedicated
 *  "nature" panel section (the Arraylake gridded fields), mirroring FEED_GROUP_CATEGORY. */
export const FIELD_GROUP_CATEGORY: Record<FieldGroup, string> = {
  weather: "nature",
  solar: "nature",
  carbon: "nature",
  vegetation: "nature",
  wind: "nature",
  imagery: "nature",
}

/** master flag — the whole field framework is dark unless this is "1". */
export const ARRAYLAKE_FIELDS_FLAG = "NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS"

/** stable layer id for one dataset+variable (used in LayerConfig + the BFF path). */
export function fieldLayerId(datasetId: string, varKey: string): string {
  return `crep-field-${datasetId}-${varKey}`
}

/** flat [dataset, variable] pairs — one toggleable map layer each. */
export function fieldLayerList(): Array<{ dataset: FieldDataset; variable: FieldVariable; layerId: string }> {
  const out: Array<{ dataset: FieldDataset; variable: FieldVariable; layerId: string }> = []
  for (const d of FIELD_REGISTRY) {
    for (const v of d.variables) out.push({ dataset: d, variable: v, layerId: fieldLayerId(d.id, v.key) })
  }
  return out
}
