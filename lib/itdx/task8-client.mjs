import {
  DEMO_SITUATION_CHANNEL_IDS,
  FORT_STEWART_SLICE,
  MAS_AVANI_STATUS_PATHS,
  MAS_ITDX_HEALTH_PATH,
  MAS_SITUATION_PATH,
  MAS_TASK8_PATHS,
  normalizeMasTask8,
  normalizeSituationAssessment,
} from './run-narration.mjs'

const MAS_DEFAULT = 'http://192.168.0.188:8001'

export function masBase() {
  return (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || MAS_DEFAULT).replace(/\/$/, '')
}

async function readJson(url, init) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000), ...init })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text.slice(0, 240) } }
  return { ok: response.ok, status: response.status, data }
}

async function readMasJson(url, init) {
  return readJson(url, { signal: AbortSignal.timeout(20000), ...init })
}

function task8Body(mapSlice) {
  return {
    schema: 'itdx-task8/v1',
    origin: 'SYNTHETIC_EXERCISE',
    execution: 'ADVISORY_ONLY',
    slice: FORT_STEWART_SLICE,
    map_slice: mapSlice || { slice: FORT_STEWART_SLICE },
    options: [
      { id: 'coa-1', title: 'Continue observation' },
      { id: 'coa-2', title: 'Request independent corroboration' },
      { id: 'coa-3', title: 'Restore the evidence connection' },
    ],
  }
}

export async function itdxHealth() {
  const result = await readJson(masBase() + MAS_ITDX_HEALTH_PATH).catch((error) => ({
    ok: false,
    status: 0,
    data: { error: String(error.message || error) },
  }))
  return { ...result, path: MAS_ITDX_HEALTH_PATH }
}

export async function avaniStatus() {
  const base = masBase()
  for (const path of MAS_AVANI_STATUS_PATHS) {
    const result = await readJson(base + path).catch((error) => ({
      ok: false,
      status: 0,
      data: { error: String(error.message || error) },
    }))
    if (result.ok) return { ...result, path }
  }
  return { ok: false, status: 404, path: MAS_AVANI_STATUS_PATHS[1], data: { error: 'AVANI status and health both missed' } }
}

export async function assessSituation(mapSlice) {
  const body = {
    slice: FORT_STEWART_SLICE,
    map_slice: mapSlice || null,
    origin: 'SYNTHETIC_EXERCISE',
    execution: 'ADVISORY_ONLY',
  }
  const result = await readMasJson(masBase() + MAS_SITUATION_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
  return {
    ...result,
    path: MAS_SITUATION_PATH,
    situation: result.ok ? normalizeSituationAssessment(result.data) : null,
  }
}

export async function probeMasTask8Fast(mapSlice) {
  const path = MAS_TASK8_PATHS[0]
  const post = await readMasJson(masBase() + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task8Body(mapSlice)),
  }).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
  return {
    task8: post.ok ? normalizeMasTask8(post.data, path) : null,
    probes: [{ method: 'POST', path, status: post.status, ok: post.ok }],
    health: null,
  }
}

export async function probeMasTask8(mapSlice) {
  const base = masBase()
  const probes = []
  const health = await itdxHealth()
  probes.push({ method: 'GET', path: health.path, status: health.status, ok: health.ok })
  const body = task8Body(mapSlice)

  for (const path of MAS_TASK8_PATHS) {
    const get = await readJson(base + path).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
    probes.push({ method: 'GET', path, status: get.status, ok: get.ok })
    const normalized = get.ok ? normalizeMasTask8(get.data, path) : null
    if (normalized) return { task8: normalized, probes, health: health.data }

    const post = await readJson(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
    probes.push({ method: 'POST', path, status: post.status, ok: post.ok })
    const posted = post.ok ? normalizeMasTask8(post.data, path) : null
    if (posted) return { task8: posted, probes, health: health.data }
  }
  return { task8: null, probes, health: health.data }
}

export async function evaluateMasGovernor(option) {
  const base = masBase()
  const result = await readJson(base + '/api/avani/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_agent: 'itdx-task8',
      action_type: 'observe',
      description: `${option.title || option.id}: advisory only. Synthetic environmental envelope. No actuator.`,
      risk_tier: 'low',
      ecological_impact: 0,
      reversibility: 1,
      metadata: { task: '8', option_id: option.id, origin: 'SYNTHETIC_EXERCISE', execution: 'ADVISORY_ONLY' },
    }),
  }).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
  return result
}

export async function mycaHealth() {
  const base = masBase()
  return readJson(base + '/api/myca/health').catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
}

export async function nlmBind() {
  const base = masBase()
  const health = await readJson(base + '/api/nlm/health').catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
  const checkpoints = await readJson(base + '/api/nlm/training/checkpoints').catch((error) => ({ ok: false, status: 0, data: { checkpoints: [], count: 0, error: String(error.message || error) } }))
  return { health: health.data, checkpoints: checkpoints.data, health_status: health.status, checkpoint_status: checkpoints.status }
}

function mindexBase() {
  return (process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL || 'http://192.168.0.189:8000').replace(/\/$/, '')
}

function mindexHeaders() {
  const key = (process.env.MINDEX_API_KEY || process.env.MINDEX_INTERNAL_TOKEN || '').trim()
  const headers = { Accept: 'application/json' }
  if (key) {
    headers['X-API-Key'] = key
    headers.Authorization = `Bearer ${key}`
  }
  return headers
}

function countRows(data) {
  if (!data) return 0
  if (Array.isArray(data)) return data.length
  if (Array.isArray(data.items)) return data.items.length
  if (Array.isArray(data.species)) return data.species.length
  if (Array.isArray(data.taxa)) return data.taxa.length
  if (Array.isArray(data.compounds)) return data.compounds.length
  if (Array.isArray(data.results)) return data.results.length
  if (Array.isArray(data.observations)) return data.observations.length
  if (typeof data.count === 'number') return data.count
  if (typeof data.total === 'number') return data.total
  return 0
}

function mindexSource(id, path, result) {
  const rows = countRows(result.data)
  if (result.ok && rows > 0) {
    return { id, status: 'BOUND', path, http_status: result.status, rows, note: `${rows} live MINDEX rows.`, score: null }
  }
  if (result.status === 401 || result.status === 403) {
    return { id, status: 'NOT_SUPPLIED', path, http_status: result.status, rows: 0, note: `MINDEX ${path} ${result.status} — API key rejected or missing. No invented taxonomy.`, score: null }
  }
  if (result.status === 404) {
    return { id, status: 'NOT_SUPPLIED', path, http_status: 404, rows: 0, note: `MINDEX ${path} is not mounted (404).`, score: null }
  }
  if (result.ok && rows === 0) {
    return { id, status: 'NOT_SUPPLIED', path, http_status: result.status, rows: 0, note: `MINDEX ${path} returned an empty result. Empty-state only.`, score: null }
  }
  return { id, status: 'UNQUALIFIED', path, http_status: result.status, rows: 0, note: `MINDEX ${path} failed (${result.status}). ${result.data?.error || ''}`.trim(), score: null }
}

export async function mindexHealth() {
  const base = mindexBase()
  const headers = mindexHeaders()
  const get = (path) => readJson(base + path, { headers }).catch((error) => ({
    ok: false,
    status: 0,
    data: { error: String(error.message || error) },
  }))
  const [health, taxa, compounds, search, observations] = await Promise.all([
    get('/api/mindex/health'),
    get('/api/mindex/taxa?limit=8'),
    get('/api/mindex/compounds?limit=8'),
    get('/api/mindex/unified-search/earth?q=fungi&limit=8'),
    get('/api/mindex/observations?limit=8'),
  ])
  const sources = [
    mindexSource('mindex_health', '/api/mindex/health', health),
    mindexSource('mindex_taxa', '/api/mindex/taxa', taxa),
    mindexSource('mindex_compounds', '/api/mindex/compounds', compounds),
    mindexSource('mindex_earth_search', '/api/mindex/unified-search/earth', search),
    mindexSource('mindex_observations', '/api/mindex/observations', observations),
  ]
  if (health.ok && sources[0].status === 'NOT_SUPPLIED') sources[0] = { ...sources[0], status: 'BOUND', note: 'MINDEX health ok. Row sources listed separately.', rows: 0 }
  const rows = sources.reduce((sum, source) => sum + (source.rows || 0), 0)
  return {
    base,
    health: health.data,
    health_status: health.status,
    sources,
    species_status: taxa.status,
    species_rows: sources.find((source) => source.id === 'mindex_taxa')?.rows || 0,
    empty_state: rows === 0,
    note: rows === 0
      ? 'MINDEX 189:8000 was queried. Sources without rows stay NOT_SUPPLIED — no fake taxonomy.'
      : `${rows} live MINDEX rows across queried sources.`,
  }
}

function mapsJsKeyConfigured() {
  const names = ['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'GOOGLE_MAPS_API_KEY']
  return names.some((name) => {
    const raw = (process.env[name] || '').trim()
    return Boolean(raw && !raw.includes('your-') && raw !== 'your-api-key-here')
  })
}

export function googleMapsBind() {
  const configured = mapsJsKeyConfigured()
  return {
    id: 'traffic',
    status: configured ? 'SUPPLIED' : 'NOT_SUPPLIED',
    reason: configured ? null : 'google_maps_key_missing',
    source_url: 'https://developers.google.com/maps/documentation/javascript/trafficlayer',
    configured,
    note: configured
      ? 'A Directions-capable Google Maps JS key is set. TrafficLayer may load in the browser. The key is never returned.'
      : 'google_maps_key_missing. Map Tiles / Gemini keys are not used for traffic. Traffic is not faked.',
  }
}

function overpassToGeojson(payload) {
  const features = []
  for (const element of payload?.elements || []) {
    if (!Array.isArray(element.geometry) || element.geometry.length < 2) continue
    const coords = element.geometry
      .map((point) => [Number(point.lon), Number(point.lat)])
      .filter((pair) => Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
    if (coords.length < 2) continue
    features.push({
      type: 'Feature',
      properties: {
        source: 'osm',
        highway: element.tags?.highway || null,
        name: element.tags?.name || null,
        synthetic: false,
      },
      geometry: { type: 'LineString', coordinates: coords },
    })
  }
  return { type: 'FeatureCollection', features }
}

export async function osmPublicPathways() {
  const [west, south, east, north] = FORT_STEWART_SLICE.bbox
  const query = `[out:json][timeout:12];way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${south},${west},${north},${east});out geom;`
  const result = await readJson('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(8000),
  }).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
  const geojson = result.ok ? overpassToGeojson(result.data) : { type: 'FeatureCollection', features: [] }
  const rows = geojson.features.length
  return {
    id: 'pathways',
    status: rows > 0 ? 'BOUND' : 'NOT_SUPPLIED',
    source_url: 'https://overpass-api.de/api/interpreter',
    rows,
    geojson: rows > 0 ? geojson : null,
    note: rows > 0
      ? `${rows} public OSM highway ways in the Fort Stewart bbox. Not official injects.`
      : `Public OSM Overpass returned no highway ways (${result.status}). Pathways stay NOT_SUPPLIED.`,
  }
}

export async function osmPublicBase() {
  const url = 'https://nominatim.openstreetmap.org/search?q=Fort%20Stewart%20Georgia&format=jsonv2&limit=1'
  const result = await readJson(url, {
    headers: { 'User-Agent': 'Mycosoft-ITDX-EarthSim/1.0 (public AO geocode)' },
  }).catch((error) => ({ ok: false, status: 0, data: { error: String(error.message || error) } }))
  const row = Array.isArray(result.data) ? result.data[0] : null
  if (result.ok && row?.lat && row?.lon) {
    return {
      id: 'base',
      status: 'BOUND',
      source_url: url,
      name: row.display_name || 'Fort Stewart',
      lat: Number(row.lat),
      lon: Number(row.lon),
      note: 'Public Nominatim/OSM place row for Fort Stewart. Not a live COP or FOUO installation overlay.',
    }
  }
  return {
    id: 'base',
    status: 'NOT_SUPPLIED',
    source_url: url,
    note: `Nominatim Fort Stewart lookup failed (${result.status}). Base info not invented.`,
  }
}

export async function masDeviceChips() {
  const result = await readJson(masBase() + '/api/devices').catch((error) => ({
    ok: false,
    status: 0,
    data: { error: String(error.message || error) },
  }))
  const rows = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.data?.devices)
      ? result.data.devices
      : Array.isArray(result.data?.items)
        ? result.data.items
        : []
  const chips = rows.slice(0, 12).map((device, index) => ({
    id: String(device.id || device.device_id || device.name || `device-${index}`),
    label: String(device.display_name || device.name || device.device_name || device.id || `device-${index}`),
    kind: String(device.role || device.type || device.kind || 'registry'),
    source: 'mas_device_registry',
    synthetic: false,
  }))
  return {
    id: 'vehicle_constraints',
    status: chips.length ? 'BOUND' : result.ok ? 'NOT_SUPPLIED' : 'UNQUALIFIED',
    source_url: `${masBase()}/api/devices`,
    http_status: result.status,
    chips,
    note: chips.length
      ? `${chips.length} MAS device-registry rows. Inventory only — no invented weapons or armor. Exercise tracks stay synthetic:true.`
      : `MAS /api/devices returned no inventory rows (${result.status}). Vehicle/asset limits stay NOT_SUPPLIED.`,
  }
}

export async function collectDemoSituationLayers(situation) {
  const google = googleMapsBind()
  const masChannels = situation?.channels || []
  const byId = Object.fromEntries(masChannels.map((channel) => [channel.id, channel]))
  const equipment = byId.equipment_weapons_assets
  const traffic = byId.traffic || { ...google, id: 'traffic' }
  const pathways = byId.pathways || {
    id: 'pathways',
    status: 'NOT_SUPPLIED',
    reason: 'google_maps_key_missing',
    note: 'google_maps_key_missing. Pathways not invented.',
  }
  const navigation = byId.navigation || {
    id: 'navigation',
    status: 'NOT_SUPPLIED',
    reason: 'google_maps_key_missing',
    note: 'google_maps_key_missing. Navigation ETAs not invented.',
  }
  const base = equipment?.status === 'SUPPLIED' || equipment?.status === 'BOUND'
    ? {
        id: 'base',
        status: equipment.status,
        source_url: equipment.source_url,
        note: equipment.note,
        facts: equipment.facts,
        citations: equipment.citations,
      }
    : {
        id: 'base',
        status: 'NOT_SUPPLIED',
        note: 'MAS equipment/base channel not supplied.',
      }
  const devices = {
    id: 'vehicle_constraints',
    status: equipment?.status || 'NOT_SUPPLIED',
    source_url: equipment?.source_url,
    note: equipment?.note || 'No vehicle/asset limits from MAS.',
    facts: equipment?.facts,
    chips: (equipment?.facts?.nominatim || []).map((label, index) => ({
      id: `nominatim-${index}`,
      label,
      kind: equipment?.facts?.capability_class || 'public_road',
      synthetic: false,
      live: false,
    })),
  }
  return {
    demo: [traffic, pathways, navigation, base, devices],
    google: { ...google, ...traffic, configured: google.configured },
    pathways,
    base,
    devices,
  }
}
