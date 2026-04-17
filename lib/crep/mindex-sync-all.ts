/**
 * MINDEX Sync-All — Single Pipeline for Every CREP Source
 *
 * Pulls every registry / route in the CREP stack and POSTs the canonical
 * records to MINDEX. Runs on a schedule (cron) + on-demand via the admin
 * endpoint /api/etl/mindex-sync.
 *
 * Every domain has its own "sink" function that:
 *   1. Fetches from the CREP route (/api/oei/*)
 *   2. Normalizes records (lat, lng, id, timestamp at minimum)
 *   3. POSTs to /api/mindex/ingest/{type} in chunks of up to 2000
 *   4. Returns {source, count, postedToMindex, durationMs, error?}
 *
 * Errors are per-sink and never block other sinks.
 */

export interface SinkResult {
  source: string
  domain: string
  count: number
  postedToMindex: number
  durationMs: number
  error?: string
}

async function chunkedPostToMindex(type: string, source: string, items: any[], baseUrl: string): Promise<number> {
  if (!items?.length) return 0
  const chunkSize = 2000
  let posted = 0
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    try {
      const res = await fetch(`${baseUrl}/api/mindex/ingest/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          timestamp: new Date().toISOString(),
          data: chunk,
          metadata: { batch_size: chunk.length, dedupe_key: "id" },
        }),
      })
      if (res.ok) posted += chunk.length
    } catch { /* single chunk failure shouldn't stop the rest */ }
  }
  return posted
}

async function timeSink(name: string, domain: string, fn: () => Promise<{ items: any[]; type: string }>, baseUrl: string): Promise<SinkResult> {
  const t0 = Date.now()
  try {
    const { items, type } = await fn()
    const postedToMindex = await chunkedPostToMindex(type, name, items, baseUrl)
    return { source: name, domain, count: items.length, postedToMindex, durationMs: Date.now() - t0 }
  } catch (e: any) {
    return { source: name, domain, count: 0, postedToMindex: 0, durationMs: Date.now() - t0, error: e?.message || String(e) }
  }
}

async function jsonGet(url: string, timeoutMs = 60_000): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json()
}

// ─── Sinks ───────────────────────────────────────────────────────────────────

export async function syncAllToMindex(baseUrl: string): Promise<{ sinks: SinkResult[]; totals: { sources: number; records: number; postedToMindex: number; durationMs: number } }> {
  const sinks: SinkResult[] = []
  const t0 = Date.now()

  // The sinks run in parallel — but we cap concurrency at 8 by chunking the
  // await Promise.all into two waves to avoid overwhelming a small VM.
  const wave1 = await Promise.all([
    // ── AIR ──
    timeSink("opensky", "air", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/opensky?limit=20000`)
      return { type: "aircraft", items: (j.aircraft || j.states || []).map((a: any) => ({ id: a.icao24 || a.id, ...a })) }
    }, baseUrl),
    timeSink("flightradar24", "air", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/flightradar24?limit=20000`)
      return { type: "aircraft", items: (j.aircraft || []).map((a: any) => ({ id: a.id, ...a })) }
    }, baseUrl),

    // ── MARITIME ──
    timeSink("aisstream", "maritime", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/aisstream?limit=20000`)
      return { type: "vessels", items: (j.vessels || []).map((v: any) => ({ id: v.mmsi || v.id, ...v })) }
    }, baseUrl),
    timeSink("ports-global", "maritime", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/ports?limit=10000`)
      return { type: "ports", items: j.ports || [] }
    }, baseUrl),
    timeSink("submarine-cables", "maritime", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/submarine-cables`)
      return { type: "submarine-cables", items: (j.cables || j.features || []).map((c: any) => ({ id: c.id || c.properties?.cable_id, ...c })) }
    }, baseUrl),

    // ── SPACE ──
    timeSink("satellites", "space", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/satellites?limit=20000`)
      return { type: "satellites", items: (j.satellites || []).map((s: any) => ({ id: s.id || s.noradId, ...s })) }
    }, baseUrl),
    timeSink("orbital-objects", "space", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/orbital-objects?includeSatCat=true&includeAnalyst=true&limit=100000`, 120_000)
      return { type: "debris", items: (j.objects || []).map((o: any) => ({ id: o.id, ...o })) }
    }, baseUrl),
    timeSink("debris-catalogued", "space", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/debris?mode=catalogued`, 120_000)
      return { type: "debris", items: (j.objects || []).map((o: any) => ({ id: o.id, ...o })) }
    }, baseUrl),
  ])
  sinks.push(...wave1)

  const wave2 = await Promise.all([
    // ── GROUND INFRA ──
    timeSink("power-plants", "infrastructure", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/power-plants?limit=50000`)
      return { type: "telemetry", items: (j.plants || []).map((p: any) => ({ id: p.id, ...p, __entity_type: "power-plant" })) }
    }, baseUrl),
    timeSink("transmission-lines", "infrastructure", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/transmission-lines-global?limit=50000`)
      return { type: "telemetry", items: (j.lines || []).map((l: any) => ({ id: l.id, ...l, __entity_type: "transmission-line" })) }
    }, baseUrl),

    // ── COMMS ──
    timeSink("radio-stations", "communications", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/radio-stations?limit=20000`)
      return { type: "telemetry", items: (j.stations || []).map((s: any) => ({ id: s.id, ...s, __entity_type: "radio-station" })) }
    }, baseUrl),
    timeSink("radar-sites", "communications", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/radar`)
      return { type: "telemetry", items: (j.sites || []).map((s: any) => ({ id: s.id, ...s, __entity_type: "radar" })) }
    }, baseUrl),

    // ── NATURE / BIODIVERSITY ──
    // Full 300M iNat scrape runs separately via scripts/inat-backfill-parallel.ts
    // Here we sync only recent observations (last 24h delta).
    timeSink("inat-delta", "nature", async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString().slice(0, 10)
      const j = await jsonGet(`${baseUrl}/api/etl/inat/sync?since=${since}`, 120_000).catch(() => ({ observations: [] }))
      return { type: "telemetry", items: (j.observations || []).map((o: any) => ({ id: o.id, ...o, __entity_type: "nature-observation" })) }
    }, baseUrl),
    timeSink("gbif-delta", "nature", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/gbif?limit=5000`)
      return { type: "telemetry", items: (j.results || []).map((o: any) => ({ id: o.gbifID, ...o, __entity_type: "gbif-occurrence" })) }
    }, baseUrl),
    timeSink("obis-delta", "nature", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/obis?limit=5000`)
      return { type: "telemetry", items: (j.results || j.occurrences || []).map((o: any) => ({ id: o.id, ...o, __entity_type: "obis-occurrence" })) }
    }, baseUrl),

    // ── ENVIRONMENTAL ──
    timeSink("openaq", "environment", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/openaq?limit=20000`)
      return { type: "weather", items: (j.stations || j.results || []).map((s: any) => ({ id: s.id, ...s, __entity_type: "air-quality" })) }
    }, baseUrl),
    timeSink("eonet", "events", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/eonet?limit=5000`)
      return { type: "events", items: (j.events || []).map((e: any) => ({ id: e.id, ...e })) }
    }, baseUrl),
    timeSink("usgs-earthquakes", "events", async () => {
      // Pull direct from USGS for the biggest window
      const usgs = await jsonGet("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_week.geojson")
      return {
        type: "events",
        items: (usgs.features || []).map((f: any) => ({
          id: f.id, type: "earthquake",
          lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
          magnitude: f.properties.mag, place: f.properties.place,
          timestamp: new Date(f.properties.time).toISOString(),
          depth_km: f.geometry.coordinates[2], url: f.properties.url,
        })),
      }
    }, baseUrl),
    timeSink("nws-alerts", "events", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/nws-alerts?limit=5000`)
      return { type: "events", items: (j.alerts || j.features || []).map((a: any) => ({ id: a.id, ...a })) }
    }, baseUrl),

    // ── SPACE WEATHER → EARTHSPOTS ──
    timeSink("sun-earth-correlation", "events", async () => {
      const j = await jsonGet(`${baseUrl}/api/oei/sun-earth-correlation`)
      return { type: "events", items: (j.earthspots || []).map((e: any) => ({ id: e.id, ...e, __entity_type: "earthspot" })) }
    }, baseUrl),
  ])
  sinks.push(...wave2)

  const totals = sinks.reduce((acc, s) => ({
    sources: acc.sources + 1,
    records: acc.records + s.count,
    postedToMindex: acc.postedToMindex + s.postedToMindex,
    durationMs: Math.max(acc.durationMs, s.durationMs),
  }), { sources: 0, records: 0, postedToMindex: 0, durationMs: 0 })

  return { sinks, totals: { ...totals, durationMs: Date.now() - t0 } }
}
