import { NextRequest, NextResponse } from "next/server"

import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MINDEX_BASE = env.mindexApiBaseUrl.replace(/\/$/, "")

// Valid ingestion types for CREP data (gate only — each must map to MINDEX below)
const VALID_TYPES = [
  "aircraft",
  "vessels",
  "satellites",
  "events",
  "weather",
  "telemetry",
  "lightning",
  "military",
  "fires",
  "smoke",
  "spores",
  "debris",
  "ports",
  "submarine-cables",
  "transmission-lines",
  "power-plants",
  "cell-towers",
  "radio-stations",
  "radar",
  "factories",
  "orbital-objects",
  "nature-observations",
  "gbif-occurrences",
  "obis-occurrences",
  "air-quality",
  "earthspots",
] as const

type IngestType = (typeof VALID_TYPES)[number]

/** Uses POST /api/mindex/observations/bulk */
const OBSERVATION_INGEST_TYPES = new Set<string>([
  "nature-observations",
  "gbif-occurrences",
  "obis-occurrences",
])

/**
 * CREP ingest type → MINDEX earth `layer` (see mindex_api/routers/earth.py `insert_queries`).
 * Types not listed here are rejected with 422 until wired.
 *
 * Broad environmental / event sinks use `facilities` (infra.facilities) so lat/lng points persist
 * without new PostGIS tables; refine with dedicated layers when schemas exist.
 */
const EARTH_LAYER_BY_TYPE: Partial<Record<string, string>> = {
  ports: "ports",
  aircraft: "aircraft",
  vessels: "vessels",
  satellites: "satellites",
  military: "military",
  events: "facilities",
  weather: "facilities",
  telemetry: "facilities",
  lightning: "facilities",
  fires: "facilities",
  smoke: "facilities",
  spores: "facilities",
  debris: "satellites",
  "air-quality": "facilities",
  earthspots: "facilities",
  "transmission-lines": "power_grid",
  "power-plants": "facilities",
  factories: "facilities",
  "cell-towers": "antennas",
  "radio-stations": "antennas",
  radar: "antennas",
  "orbital-objects": "satellites",
  "submarine-cables": "facilities",
}

function ingestTimeoutMs(): number {
  const raw = process.env.MINDEX_INGEST_TIMEOUT_MS
  const n = raw ? parseInt(raw, 10) : 120000
  if (!Number.isFinite(n)) return 120000
  return Math.min(Math.max(n, 5000), 600000)
}

function mindexAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  const internal = env.mindexInternalToken?.trim()
  if (internal) {
    h["X-Internal-Token"] = internal
  }
  if (env.mindexApiKey) {
    h["X-API-Key"] = env.mindexApiKey
  }
  return h
}

interface IngestPayload {
  source: string
  timestamp?: string
  data: Record<string, unknown>[] | Record<string, unknown>
  metadata?: Record<string, unknown>
}

function pickNum(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseFloat(v)
      if (Number.isFinite(n)) return n
    }
  }
  return undefined
}

function pickLatLng(item: Record<string, unknown>): { lat: number; lng: number } | null {
  const lat = pickNum(item.lat, item.latitude, item.Latitude)
  const lng = pickNum(item.lng, item.longitude, item.lon, item.Longitude)
  if (lat === undefined || lng === undefined) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function stripCoordsForProps(item: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...item }
  delete copy.lat
  delete copy.lng
  delete copy.latitude
  delete copy.longitude
  delete copy.lon
  delete copy.Latitude
  delete copy.Longitude
  return copy
}

function toEarthIngestPayload(
  ingestType: string,
  earthLayer: string,
  body: IngestPayload,
): { layer: string; entities: Record<string, unknown>[] } {
  const dataArray = Array.isArray(body.data) ? body.data : [body.data]
  const entities: Record<string, unknown>[] = []
  let i = 0
  for (const raw of dataArray) {
    const item = raw as Record<string, unknown>
    const coords = pickLatLng(item)
    if (!coords) {
      i += 1
      continue
    }
    const idStr =
      item.id !== undefined
        ? String(item.id)
        : item.source_id !== undefined
          ? String(item.source_id)
          : `${ingestType}-${body.source}-${i}`
    const nameRaw =
      (typeof item.name === "string" && item.name.trim()) ||
      (typeof item.title === "string" && item.title.trim()) ||
      idStr
    const props = stripCoordsForProps(item)
    entities.push({
      source: body.source,
      source_id: idStr,
      name: nameRaw,
      entity_type:
        (typeof item.entity_type === "string" && item.entity_type.trim()) ||
        ingestType.replace(/-/g, "_"),
      lat: coords.lat,
      lng: coords.lng,
      occurred_at: body.timestamp ?? null,
      properties: props,
    })
    i += 1
  }
  return { layer: earthLayer, entities }
}

function toBulkObservationsPayload(ingestType: string, body: IngestPayload): { observations: Record<string, unknown>[] } {
  const dataArray = Array.isArray(body.data) ? body.data : [body.data]
  const observations = dataArray.map((raw, index) => {
    const item = raw as Record<string, unknown>
    const coords = pickLatLng(item)
    const sid =
      (typeof item.source_id === "string" && item.source_id) ||
      (item.id !== undefined ? String(item.id) : `${ingestType}-${body.source}-${index}`)
    return {
      source:
        (typeof item.source === "string" && item.source) || body.source,
      source_id: sid,
      observed_at:
        (typeof item.observed_at === "string" && item.observed_at) ||
        body.timestamp ||
        new Date().toISOString(),
      observer: typeof item.observer === "string" ? item.observer : undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      taxon_name: typeof item.taxon_name === "string" ? item.taxon_name : undefined,
      taxon_common_name:
        typeof item.taxon_common_name === "string" ? item.taxon_common_name : undefined,
      taxon_inat_id: typeof item.taxon_inat_id === "number" ? item.taxon_inat_id : undefined,
      iconic_taxon_name:
        typeof item.iconic_taxon_name === "string" ? item.iconic_taxon_name : undefined,
      photos: Array.isArray(item.photos) ? item.photos : [],
      notes: typeof item.notes === "string" ? item.notes : undefined,
      metadata: {
        ingest_type: ingestType,
        ...(typeof item.metadata === "object" && item.metadata !== null
          ? (item.metadata as Record<string, unknown>)
          : {}),
        ...(body.metadata ?? {}),
      },
    }
  })
  return { observations }
}

/**
 * POST /api/mindex/ingest/[type]
 * Proxies CREP collectors to real MINDEX writers:
 * - obs.* → /api/mindex/observations/bulk
 * - earth registry → /api/mindex/earth/ingest
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params

  if (!VALID_TYPES.includes(type as IngestType)) {
    return NextResponse.json(
      {
        error: "Invalid ingestion type",
        valid_types: VALID_TYPES,
        received: type,
      },
      { status: 400 },
    )
  }

  const hasAuth = Boolean(env.mindexInternalToken?.trim() || env.mindexApiKey)
  if (!hasAuth) {
    return NextResponse.json(
      {
        error: "Server misconfiguration",
        detail:
          "Set MINDEX_INTERNAL_TOKEN (or INTERNAL_API_SECRET) and/or MINDEX_API_KEY so the proxy can authenticate to MINDEX.",
      },
      { status: 503 },
    )
  }

  let body: IngestPayload
  try {
    body = (await request.json()) as IngestPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.source || body.data === undefined || body.data === null) {
    return NextResponse.json(
      { error: "Missing required fields: source, data" },
      { status: 400 },
    )
  }

  const tmo = ingestTimeoutMs()
  const headers = mindexAuthHeaders()

  try {
    if (OBSERVATION_INGEST_TYPES.has(type)) {
      const payload = toBulkObservationsPayload(type, body)
      const res = await fetch(`${MINDEX_BASE}/api/mindex/observations/bulk`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(tmo),
      })
      const text = await res.text()
      if (!res.ok) {
        let detail: unknown = text
        try {
          detail = JSON.parse(text)
        } catch {
          /* keep text */
        }
        return NextResponse.json(
          {
            error: "MINDEX observations/bulk rejected the request",
            upstream_status: res.status,
            detail,
            type,
            source: body.source,
          },
          { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
        )
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = { raw: text }
      }
      return NextResponse.json({
        success: true,
        mode: "observations/bulk",
        type,
        source: body.source,
        submitted: payload.observations.length,
        mindex_response: parsed,
        timestamp: new Date().toISOString(),
      })
    }

    const earthLayer = EARTH_LAYER_BY_TYPE[type]
    if (!earthLayer) {
      return NextResponse.json(
        {
          error: "This ingest type is not wired to a MINDEX writer yet",
          type,
          observation_types: [...OBSERVATION_INGEST_TYPES],
          earth_wired_types: Object.keys(EARTH_LAYER_BY_TYPE),
        },
        { status: 422 },
      )
    }

    const earthPayload = toEarthIngestPayload(type, earthLayer, body)
    if (earthPayload.entities.length === 0) {
      return NextResponse.json(
        {
          error: "No rows with valid lat/lng; nothing sent to MINDEX",
          type,
          source: body.source,
        },
        { status: 400 },
      )
    }

    const res = await fetch(`${MINDEX_BASE}/api/mindex/earth/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify(earthPayload),
      signal: AbortSignal.timeout(tmo),
    })
    const text = await res.text()
    if (!res.ok) {
      let detail: unknown = text
      try {
        detail = JSON.parse(text)
      } catch {
        /* keep text */
      }
      return NextResponse.json(
        {
          error: "MINDEX earth/ingest rejected the request",
          upstream_status: res.status,
          detail,
          type,
          source: body.source,
          layer: earthLayer,
        },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      )
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { raw: text }
    }
    return NextResponse.json({
      success: true,
      mode: "earth/ingest",
      type,
      layer: earthLayer,
      source: body.source,
      entity_count: earthPayload.entities.length,
      mindex_response: parsed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`Ingestion error for ${type}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Ingestion failed",
        details: String(error),
        type,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/mindex/ingest/[type]
 * Historical stub pointed at a non-existent MINDEX path — return explicit not-implemented.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params

  if (!VALID_TYPES.includes(type as IngestType)) {
    return NextResponse.json(
      { error: "Invalid type", valid_types: VALID_TYPES },
      { status: 400 },
    )
  }

  return NextResponse.json(
    {
      error: "Query via this route is not implemented",
      hint: "Use MINDEX Worldview or earth map endpoints for reads; this route is write-only.",
      type,
    },
    { status: 501 },
  )
}
