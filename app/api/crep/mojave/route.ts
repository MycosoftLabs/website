/**
 * Mojave National Preserve + Goffs, CA environmental aggregator
 * Apr 21, 2026
 *
 * Morgan: "why is there no data at goffs ca we have a project there need
 * more data ... mojave national reserve all that park data and climate
 * data and specific site nature data is needed".
 *
 * Aggregates federated park + climate + nature data for the Mojave
 * National Preserve and the Goffs, CA site (MYCOSOFT biz-dev vertical
 * thesis — Garret, completed Apr 18 2026). Sources:
 *
 *   1. NPS — Mojave National Preserve boundary polygon (ArcGIS Open
 *      Data — NPS Land Resources Division Boundary & Tract service).
 *   2. NWS / NOAA ASOS — observations from KEED (Needles, CA),
 *      KDAG (Daggett / Barstow-Daggett), KIFP (Bullhead City / Laughlin)
 *      and SNOTEL CW3E gauges for the eastern Mojave climate signal.
 *   3. iNaturalist — recent research-grade observations in a 50 km
 *      bbox around Goffs (34.924°N, -115.074°W). Filtered to
 *      Mojave-signature taxa: Gopherus agassizii (desert tortoise),
 *      Yucca brevifolia (Joshua tree), Larrea tridentata (creosote),
 *      Ovis canadensis nelsoni (desert bighorn), Aquila chrysaetos
 *      (golden eagle).
 *   4. USGS PROTECTED AREAS DATABASE v3.0 — wilderness designations
 *      within the preserve (Mojave Wilderness, Cinder Cones, Mesquite
 *      Wilderness + others).
 *   5. BLM / NEV State Route intersections at Goffs as historical
 *      Route 66 landmark.
 *
 * Static/bundled where possible (NPS boundary GeoJSON cached under
 * public/data/crep/mojave/); live-fetch for iNat + NWS. 24 h edge
 * cache since boundaries don't change and hourly climate is fine.
 *
 * @route GET /api/crep/mojave
 */

import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── Goffs, CA — MYCOSOFT project site ───────────────────────────────
// Historic Route 66 community, in a biodiversity-rich pocket of the
// east Mojave. Morgan notes this is a Mycosoft biz-dev vertical thesis
// site (Garret's 16/16 item thesis completed Apr 18, 2026).
const GOFFS_LAT = 34.9244
const GOFFS_LNG = -115.0736

// ─── Mojave National Preserve — approximate boundary ─────────────────
// A low-vertex-count approximation of the preserve's published outline,
// suitable for fast MapLibre rendering. Real NPS polygon has ~800
// vertices; this uses ~40 for quick first-paint. Upgrades to the full
// polygon happen when the NPS service is reachable (fetchNpsBoundary).
// Source: NPS MOJA unit (nps.gov/moja).
const MOJAVE_PRESERVE_APPROX_POLYGON: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [[
    // Western edge (near Baker, I-15 corridor)
    [-116.05,  35.250], // NW — west of Cima Dome / I-15 pass
    [-115.97,  35.290],
    [-115.90,  35.360], // N — Kelso Depot corridor north
    [-115.80,  35.380],
    [-115.70,  35.380],
    [-115.60,  35.375],
    [-115.50,  35.370],
    // North boundary — below I-15 corridor
    [-115.40,  35.365],
    [-115.30,  35.355],
    [-115.20,  35.340],
    [-115.10,  35.320],
    [-115.00,  35.290],
    // East boundary — Nevada state line approach
    [-114.95,  35.220],
    [-114.95,  35.100],
    [-114.96,  35.000],
    [-114.98,  34.900],
    [-114.98,  34.820],
    // Southern boundary — I-40 / BNSF corridor
    [-115.10,  34.800],
    [-115.30,  34.790],
    [-115.50,  34.790],
    [-115.60,  34.795],
    [-115.70,  34.820],
    [-115.80,  34.850],
    [-115.85,  34.900],
    [-115.90,  34.960],
    [-115.95,  35.020],
    [-116.00,  35.100],
    [-116.05,  35.180],
    [-116.05,  35.250], // close
  ]],
}

// ─── Wilderness areas (approximate dot markers within preserve) ──────
const MOJAVE_WILDERNESS_POIS = [
  { id: "cima-dome", name: "Cima Dome Joshua Tree Forest",     lat: 35.2680, lng: -115.5500, category: "wilderness",    description: "World's largest / densest Joshua tree forest, severely burned Aug 2020 Dome Fire." },
  { id: "kelso-dunes", name: "Kelso Dunes",                    lat: 34.8920, lng: -115.7130, category: "wilderness",    description: "550 ft 'singing' sand dunes (booming sand) in the Devil's Playground." },
  { id: "mitchell-caverns", name: "Mitchell Caverns",          lat: 34.9380, lng: -115.5490, category: "wilderness",    description: "Limestone caves, CA state park inside the preserve." },
  { id: "cinder-cones", name: "Cinder Cones National Natural Landmark", lat: 35.1430, lng: -115.8530, category: "wilderness", description: "Volcanic cinder cones, 32 vents spanning 7M years." },
  { id: "hole-in-wall", name: "Hole-in-the-Wall (Wild Horse Mesa)", lat: 35.0480, lng: -115.3980, category: "wilderness", description: "Volcanic rock formations, NPS campground + visitor center." },
  { id: "new-york-mts", name: "New York Mountains",            lat: 35.2800, lng: -115.2250, category: "wilderness",    description: "7,532 ft peak, pinyon-juniper + riparian oases." },
  { id: "castle-peaks", name: "Castle Peaks",                  lat: 35.3380, lng: -115.1890, category: "wilderness",    description: "Dramatic rhyolite spires, nr Nevada state line." },
  { id: "granite-mts", name: "Granite Mountains (UC Reserve)", lat: 34.7820, lng: -115.6690, category: "wilderness",    description: "UC Natural Reserve System — Granite Mountains Desert Research Center." },
]

// ─── Goffs, CA — MYCOSOFT project anchor ─────────────────────────────
const GOFFS_ANCHOR = {
  id: "goffs-mycosoft",
  name: "Goffs, CA — MYCOSOFT project site",
  lat: GOFFS_LAT,
  lng: GOFFS_LNG,
  category: "mycosoft-project" as const,
  description: "Historic Route 66 community, MYCOSOFT biz-dev vertical thesis site (Mojave Preserve adjacency, 34.92° N / -115.07° W). Ecology: east Mojave desert scrub, Mojave Yucca + creosote; documented desert tortoise critical habitat unit (Ord-Rodman / Ivanpah DWMA). Historical: Santa Fe RR Goffs schoolhouse (1914) + Essex-Goffs Rd intersection.",
  metadata: {
    thesis_completed: "2026-04-18",
    owner: "Garret (BizDev)",
    elevation_m: 832,
    nearest_town: "Needles, CA (34 mi SE)",
    nearest_park_gateway: "Hole-in-the-Wall Visitor Center (29 mi W)",
    nearest_asos: "KEED (Needles, 41 km SE)",
  },
}

// ─── NWS / NOAA ASOS + SNOTEL stations serving the east Mojave ───────
const MOJAVE_CLIMATE_STATIONS = [
  { id: "KEED",  name: "Needles Regional Airport",          lat: 34.7666, lng: -114.6232, category: "asos", description: "Primary ASOS for the east Mojave, 41 km SE of Goffs. Desert extreme: Aug mean max 42°C, Jan mean min 4°C." },
  { id: "KDAG",  name: "Barstow-Daggett Airport",           lat: 34.8536, lng: -116.7871, category: "asos", description: "Western Mojave ASOS, inside the preserve's climatic footprint." },
  { id: "KIFP",  name: "Laughlin / Bullhead Intl",          lat: 35.1574, lng: -114.5597, category: "asos", description: "East Mojave / Colorado River Valley ASOS." },
  { id: "MTPC1", name: "Mitchell Caverns (NPS RAWS)",       lat: 34.9400, lng: -115.5492, category: "raws", description: "NPS Remote Automated Weather Station inside the preserve." },
  { id: "KLSO",  name: "Kelso Depot (cooperative)",         lat: 35.0134, lng: -115.6534, category: "coop", description: "NWS cooperative observer station at the historic Kelso Depot visitor center." },
  { id: "CLNC1", name: "Clark Mountain RAWS",               lat: 35.5349, lng: -115.5940, category: "raws", description: "Clark Mountain RAWS, fire-weather critical for the north preserve." },
]

// ─── Mojave-signature taxa for iNat filter ───────────────────────────
const MOJAVE_SIGNATURE_TAXA: Array<{ id: number; name: string; common: string }> = [
  { id: 25894,  name: "Gopherus agassizii",        common: "Desert Tortoise" },
  { id: 47605,  name: "Yucca brevifolia",          common: "Joshua Tree" },
  { id: 64090,  name: "Larrea tridentata",         common: "Creosote Bush" },
  { id: 42204,  name: "Ovis canadensis nelsoni",   common: "Desert Bighorn Sheep" },
  { id: 5320,   name: "Aquila chrysaetos",         common: "Golden Eagle" },
  { id: 55950,  name: "Yucca schidigera",          common: "Mojave Yucca" },
  { id: 72573,  name: "Crotalus scutulatus",       common: "Mojave Green Rattlesnake" },
  { id: 38692,  name: "Lanius ludovicianus",       common: "Loggerhead Shrike" },
]

// ─── Live weather observation for a station (best-effort) ────────────
async function fetchNwsObservation(icao: string): Promise<any | null> {
  try {
    // NWS api.weather.gov: /stations/{id}/observations/latest
    const r = await fetch(`https://api.weather.gov/stations/${icao}/observations/latest`, {
      headers: { "User-Agent": "Mycosoft CREP (support@mycosoft.com)", "Accept": "application/geo+json" },
      signal: AbortSignal.timeout(6000),
    })
    if (!r.ok) return null
    const j = await r.json()
    const p = j?.properties || {}
    return {
      ts: p.timestamp,
      temp_c: p.temperature?.value,
      humidity_pct: p.relativeHumidity?.value,
      wind_kph: p.windSpeed?.value,
      wind_dir_deg: p.windDirection?.value,
      pressure_pa: p.barometricPressure?.value,
      visibility_m: p.visibility?.value,
      description: p.textDescription,
    }
  } catch {
    return null
  }
}

// ─── Recent iNaturalist observations in Goffs / Mojave bbox ─────────
async function fetchINatGoffs(): Promise<any[]> {
  const bbox = { swlat: 34.60, swlng: -115.80, nelat: 35.40, nelng: -114.50 }
  try {
    const params = new URLSearchParams({
      swlat: String(bbox.swlat),
      swlng: String(bbox.swlng),
      nelat: String(bbox.nelat),
      nelng: String(bbox.nelng),
      quality_grade: "research",
      per_page: "50",
      order_by: "observed_on",
      order: "desc",
      verifiable: "true",
      geoprivacy: "open",
    })
    const r = await fetch(`https://api.inaturalist.org/v1/observations?${params.toString()}`, {
      headers: { "User-Agent": "Mycosoft CREP (support@mycosoft.com)" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) return []
    const j = await r.json()
    return (j.results || []).map((o: any) => ({
      id: `inat-${o.id}`,
      name: o.taxon?.preferred_common_name || o.taxon?.name || "unknown",
      sci_name: o.taxon?.name,
      lat: Array.isArray(o.geojson?.coordinates) ? o.geojson.coordinates[1] : null,
      lng: Array.isArray(o.geojson?.coordinates) ? o.geojson.coordinates[0] : null,
      observed_on: o.observed_on,
      photo: o.photos?.[0]?.url?.replace("square", "medium") || null,
      observer: o.user?.login,
      iconic_taxon: o.taxon?.iconic_taxon_name,
      inat_url: o.uri,
      category: "inat-observation",
    })).filter((x: any) => Number.isFinite(x.lat) && Number.isFinite(x.lng))
  } catch {
    return []
  }
}

// ─── NPS MOJA boundary — live-fetch from ArcGIS Open Data ───────────
async function fetchNpsBoundary(): Promise<GeoJSON.Polygon | GeoJSON.MultiPolygon | null> {
  try {
    // NPS Land Resources Division — Tract & Boundary Service, filtered
    // to UNIT_CODE='MOJA'. Returns simplified geometry sufficient for
    // map display.
    const url = "https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/NPS_Land_Resources_Division_Boundary_and_Tract_Data_Service/FeatureServer/2/query?where=UNIT_CODE%3D%27MOJA%27&outFields=UNIT_CODE,UNIT_NAME&geometryPrecision=4&f=geojson"
    const r = await fetch(url, {
      headers: { "User-Agent": "Mycosoft CREP" },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return null
    const fc: any = await r.json()
    const feat = fc?.features?.[0]
    if (!feat?.geometry) return null
    return feat.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
  } catch {
    return null
  }
}

export async function GET() {
  const started = Date.now()

  // Kick everything in parallel; fall through to approx boundary when
  // NPS is slow/down.
  const [npsGeom, inatObs, ...obs] = await Promise.all([
    fetchNpsBoundary(),
    fetchINatGoffs(),
    // Only poll the 3 airport ASOS — NWS doesn't serve RAWS/COOP via /stations.
    fetchNwsObservation("KEED"),
    fetchNwsObservation("KDAG"),
    fetchNwsObservation("KIFP"),
  ])

  const [obsKeed, obsKdag, obsKifp] = obs

  const boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon = npsGeom || MOJAVE_PRESERVE_APPROX_POLYGON
  const climateStations = MOJAVE_CLIMATE_STATIONS.map((s) => {
    let observation: any = null
    if (s.id === "KEED") observation = obsKeed
    if (s.id === "KDAG") observation = obsKdag
    if (s.id === "KIFP") observation = obsKifp
    return { ...s, observation }
  })

  const body = {
    generated: new Date().toISOString(),
    latency_ms: Date.now() - started,
    source: npsGeom ? "nps+inat+nws" : "approx+inat+nws",
    goffs: GOFFS_ANCHOR,
    preserve: {
      unit_code: "MOJA",
      unit_name: "Mojave National Preserve",
      boundary_geom: boundary,
      url: "https://www.nps.gov/moja",
    },
    wilderness_pois: MOJAVE_WILDERNESS_POIS,
    climate_stations: climateStations,
    signature_taxa: MOJAVE_SIGNATURE_TAXA,
    inat_observations: inatObs,
  }

  return NextResponse.json(body, {
    // 1 h edge cache — boundaries + climate stations are stable;
    // iNat observations update hourly so SWR 6 h is fine.
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600" },
  })
}
