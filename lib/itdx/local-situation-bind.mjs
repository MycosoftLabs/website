/**
 * Website-local ITDX binds for the Fort Stewart exercise.
 * Fills channels MAS left blank. Never invents a live COP. No FOUO ingest.
 */
import { AO_GEOCODE_SOURCE, AO_ORIGIN_LAT, AO_ORIGIN_LNG, AO_PLACE, ASSETS, BOUNDS } from './replay-core.mjs'
import { FORT_STEWART_SLICE } from './run-narration.mjs'
import { staticDocuments, staticLabBootstrap } from './static-lab.mjs'

export const MAX_PATHWAY_FEATURES = 48
export const LOCAL_BIND_TTL_MS = 60_000

const PUBLIC_WIKI = [
  { title: 'Fort Stewart', url: 'https://en.wikipedia.org/wiki/Fort_Stewart' },
  { title: 'Hunter Army Airfield', url: 'https://en.wikipedia.org/wiki/Hunter_Army_Airfield' },
  { title: 'Hinesville, Georgia', url: 'https://en.wikipedia.org/wiki/Hinesville,_Georgia' },
]

const cache = new Map()

export function honestyStatus({ configured, ok, rows, sourceName, missingReason }) {
  if (!configured) {
    return {
      status: 'NOT_SUPPLIED',
      note: missingReason || `${sourceName} has no configured source.`,
    }
  }
  if (!ok) {
    return {
      status: 'UNQUALIFIED',
      note: `${sourceName} is configured but the request failed.`,
    }
  }
  if (!rows) {
    return {
      status: 'NO_DATA',
      note: `No data from ${sourceName} (source configured; empty result).`,
    }
  }
  return {
    status: 'BOUND',
    note: `${rows} row(s) from ${sourceName}.`,
  }
}

async function cached(key, fn) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < LOCAL_BIND_TTL_MS) return hit.value
  const value = await fn()
  cache.set(key, { at: Date.now(), value })
  return value
}

async function readJson(url, init) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(7000), ...init })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text.slice(0, 240) } }
  return { ok: response.ok, status: response.status, data }
}

function clipGeojson(geojson) {
  const features = Array.isArray(geojson?.features) ? geojson.features.slice(0, MAX_PATHWAY_FEATURES) : []
  return { type: 'FeatureCollection', features }
}

export async function bindOpenMeteoWeather() {
  return cached('weather', async () => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${AO_ORIGIN_LAT}&longitude=${AO_ORIGIN_LNG}&current=temperature_2m,wind_speed_10m,precipitation&timezone=UTC`
    const result = await readJson(url).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
    const temp = result.data?.current?.temperature_2m
    const hasTemp = typeof temp === 'number' && Number.isFinite(temp)
    const honesty = honestyStatus({ configured: true, ok: result.ok, rows: hasTemp ? 1 : 0, sourceName: 'Open-Meteo' })
    return {
      id: 'weather',
      status: honesty.status,
      source_url: url,
      note: hasTemp
        ? `${temp}°C at Fort Stewart from Open-Meteo. Cite only — not a live METOC COP.`
        : honesty.note,
      facts: {
        temperature_c: hasTemp ? temp : undefined,
        open_meteo: 'https://open-meteo.com/',
        nws: 'https://api.weather.gov',
        nws_cwa: 'JAX',
        live: false,
      },
      citations: [{ name: 'Open-Meteo', url: 'https://open-meteo.com/', count: hasTemp ? 1 : 0 }],
    }
  })
}

export async function bindPublicBiology() {
  return cached('biology', async () => {
    const [west, south, east, north] = FORT_STEWART_SLICE.bbox
    const gbifUrl = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${south},${north}&decimalLongitude=${west},${east}&kingdomKey=5&limit=0`
    const inatUrl = `https://api.inaturalist.org/v1/observations?nelat=${north}&nelng=${east}&swlat=${south}&swlng=${west}&iconic_taxa=Fungi&per_page=0`
    const [gbif, inat] = await Promise.all([
      readJson(gbifUrl).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } })),
      readJson(inatUrl).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } })),
    ])
    const gbifCount = typeof gbif.data?.count === 'number' ? gbif.data.count : 0
    const inatCount = typeof inat.data?.total_results === 'number' ? inat.data.total_results : 0
    const ok = gbif.ok || inat.ok
    const rows = gbifCount + inatCount
    const honesty = honestyStatus({ configured: true, ok, rows, sourceName: 'GBIF + iNaturalist (Fort Stewart bbox)' })
    return {
      id: 'biology',
      status: honesty.status,
      source_url: gbifUrl,
      note: rows
        ? `Public occurrence counts in the Fort Stewart bbox. Not a field collection.`
        : honesty.note,
      facts: { gbif_count: gbifCount, inaturalist_count: inatCount, live: false },
      citations: [
        { name: 'GBIF', url: 'https://www.gbif.org/', count: gbifCount },
        { name: 'iNaturalist', url: 'https://www.inaturalist.org/', count: inatCount },
      ],
    }
  })
}

export function bindPackagedCatalog() {
  const bootstrap = staticLabBootstrap()
  const documents = staticDocuments()
  const scenarios = Array.isArray(bootstrap.scenarios) ? bootstrap.scenarios : []
  const honesty = honestyStatus({
    configured: true,
    ok: true,
    rows: documents.length + scenarios.length,
    sourceName: 'packaged ITDX lab-catalog',
  })
  return {
    id: 'information',
    status: honesty.status,
    source_url: 'lib/itdx/lab-catalog/documents.json',
    note: `${documents.length} UNCLASSIFIED catalog identities · ${scenarios.length} ITDX26 training scenarios. Page bytes stay in optional 8765. FOUO Army PDFs are not ingested.`,
    facts: {
      wikipedia: PUBLIC_WIKI,
      nominatim: [AO_PLACE, 'Hunter Army Airfield', 'Hinesville, Georgia'],
      live: false,
    },
    citations: [
      ...documents.slice(0, 8).map((doc) => ({ name: doc.name, url: null, count: 1 })),
      ...PUBLIC_WIKI.map((page) => ({ name: page.title, url: page.url, count: 1 })),
    ],
  }
}

export function bindSyntheticPhysics() {
  return {
    id: 'physics',
    status: 'BOUND',
    source_url: 'lib/itdx/replay-core.mjs',
    note: `Fixed 121-sample Fort Stewart tangent-plane replay. ${ASSETS.length} authored markers. live=false.`,
    facts: { live: false, capability_class: 'synthetic_exercise' },
    citations: [{ name: 'ITDX fictional replay v1', url: null, count: 121 }],
  }
}

export function bindCrepAliases() {
  return {
    id: 'crep',
    status: 'BOUND',
    source_url: '/api/oei/aircraft',
    note: 'Earth Sim OEI aircraft/vessels aliases are wired on the website BFF. Overlay does not claim a live COP. Filters-off keeps those layers dark.',
    facts: { live: false },
    citations: [
      { name: 'OEI aircraft alias', url: '/api/oei/aircraft', count: null },
      { name: 'OEI vessels alias', url: '/api/oei/vessels', count: null },
    ],
  }
}

export function bindEarth2Honesty(configured) {
  const honesty = honestyStatus({
    configured,
    ok: configured,
    rows: configured ? 1 : 0,
    sourceName: 'Earth-2 / ERA5 BFF',
    missingReason: 'EARTH2_API_URL / Arraylake is not configured on this host.',
  })
  return {
    id: 'earth2',
    status: honesty.status,
    source_url: process.env.EARTH2_API_URL || 'http://192.168.0.249:8220',
    note: configured
      ? 'Earth-2 API URL is configured. Overlay still live=false; ERA5 is a cite, not a live COP.'
      : honesty.note,
    facts: { live: false },
  }
}

export function preferBound(masChannel, localChannel) {
  if (!masChannel) return localChannel
  if (masChannel.status === 'BOUND' || masChannel.status === 'SUPPLIED') return masChannel
  if (
    localChannel &&
    (localChannel.status === 'BOUND' ||
      localChannel.status === 'SUPPLIED' ||
      localChannel.status === 'NO_DATA' ||
      localChannel.status === 'UNQUALIFIED')
  ) {
    return { ...localChannel, mas_status: masChannel.status, mas_note: masChannel.note }
  }
  return masChannel
}

export function clipPathwayGeojson(geojson) {
  return clipGeojson(geojson)
}

export function packagedExerciseNote() {
  return {
    ao_place: AO_PLACE,
    origin: [AO_ORIGIN_LNG, AO_ORIGIN_LAT],
    geocode_source: AO_GEOCODE_SOURCE,
    bounds: BOUNDS,
    documents: staticDocuments().length,
    scenarios: staticLabBootstrap().scenarios?.length || 0,
    live: false,
    synthetic: true,
  }
}
