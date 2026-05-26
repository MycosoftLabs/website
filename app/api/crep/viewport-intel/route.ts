import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import {
  boundsCenter,
  buildJurisdictionStackFromPlace,
  mergeJurisdictionStacks,
  placeNeedsEnrichment,
  reverseGeocodePlace,
  resolveViewportGeographyLod,
  resolveMacroRegionLabel,
  type ViewportPlaceLike,
} from "@/lib/crep/viewport-place"
import { fetchCivicFallback } from "@/lib/crep/civic-fallback"

export const dynamic = "force-dynamic"
export const revalidate = 86400

const MINDEX_API = resolveMindexServerBaseUrl()
const MINDEX_TIMEOUT_MS = 12_000

function finiteNumber(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizePlace(raw: Record<string, unknown> | null | undefined): ViewportPlaceLike | null {
  if (!raw) return null
  return {
    displayName: String(raw.display_name || raw.displayName || ""),
    country: raw.country as string | undefined,
    countryCode: (raw.country_code || raw.countryCode) as string | undefined,
    state: raw.state as string | undefined,
    county: raw.county as string | undefined,
    city: raw.city as string | undefined,
    suburb: raw.suburb as string | undefined,
    postcode: raw.postcode as string | undefined,
    lat: Number(raw.lat),
    lng: Number(raw.lng),
  }
}

async function enrichPlaceFromBounds(
  place: ViewportPlaceLike | null,
  bounds: { north: number; south: number; east: number; west: number },
  mapZoom = 4,
): Promise<{ place: ViewportPlaceLike | null; jurisdiction_stack: ReturnType<typeof buildJurisdictionStackFromPlace> }> {
  let resolved = place
  const geographyLod = resolveViewportGeographyLod(mapZoom, bounds)
  if (placeNeedsEnrichment(resolved)) {
    const center = boundsCenter(bounds)
    const geocoded = await reverseGeocodePlace(center.lat, center.lng, geographyLod)
    if (geocoded) {
      resolved = {
        ...geocoded,
        ...resolved,
        displayName: resolved?.displayName || geocoded.displayName,
        city: resolved?.city || geocoded.city,
        county: resolved?.county || geocoded.county,
        state: resolved?.state || geocoded.state,
        country: resolved?.country || geocoded.country,
        countryCode: resolved?.countryCode || geocoded.countryCode,
      }
    }
  }
  const stackFromPlace = buildJurisdictionStackFromPlace(
    resolved,
    resolveMacroRegionLabel(bounds, mapZoom),
  )
  return { place: resolved, jurisdiction_stack: stackFromPlace }
}

function buildEmptyCivicResponse(
  bounds: { north: number; south: number; east: number; west: number },
  enriched: Awaited<ReturnType<typeof enrichPlaceFromBounds>>,
  startedAt: number,
  status: string,
) {
  const totalMs = Date.now() - startedAt
  return NextResponse.json(
    {
      ok: enriched.place != null,
      generatedAt: new Date().toISOString(),
      bounds,
      center: boundsCenter(bounds),
      place: enriched.place,
      jurisdiction_stack: enriched.jurisdiction_stack,
      civic: { officials: [], offices: [], elections: [], status },
      facilities: { facilities: [], status: "unavailable" },
      officials: [],
      elections: [],
      legislation: [],
      finance_lobbying: [],
      budgets_debt_defense: [],
      media_gallery: [],
      meta: {
        timings: { totalMs, budgetMs: 1200, withinBudget: totalMs <= 1200 },
      },
    },
    { status: 200 },
  )
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now()
  const q = req.nextUrl.searchParams
  const north = finiteNumber(q.get("north"), 0)
  const south = finiteNumber(q.get("south"), 0)
  const east = finiteNumber(q.get("east"), 0)
  const west = finiteNumber(q.get("west"), 0)
  const zoom = finiteNumber(q.get("zoom"), 4)

  const bounds = {
    north: Math.max(north, south),
    south: Math.min(north, south),
    east,
    west,
  }

  const params = new URLSearchParams({
    north: String(bounds.north),
    south: String(bounds.south),
    east: String(bounds.east),
    west: String(bounds.west),
    zoom: String(zoom),
  })

  // Geocode only when MINDEX place is missing — canonical civic data is MINDEX-first.
  const geocodePromise = enrichPlaceFromBounds(null, bounds, zoom)

  try {
    const internalTokenRaw =
      process.env.MINDEX_INTERNAL_TOKEN ||
      process.env.MINDEX_INTERNAL_TOKENS ||
      ""
    const internalToken = internalTokenRaw.includes(",")
      ? internalTokenRaw.split(",")[0]?.trim()
      : internalTokenRaw.trim()

    let upstreamOk = false
    let body: Record<string, unknown> | null = null

    try {
      const upstream = await fetch(`${MINDEX_API}/api/mindex/civic/viewport-intel?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          ...(internalToken ? { "X-Internal-Token": internalToken } : {}),
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        signal: AbortSignal.timeout(MINDEX_TIMEOUT_MS),
        next: { revalidate: 86400 },
      })
      upstreamOk = upstream.ok
      if (upstream.ok) {
        body = (await upstream.json()) as Record<string, unknown>
      }
    } catch {
      upstreamOk = false
    }

    const geocoded = await geocodePromise

    if (!upstreamOk || !body) {
      const fallback = await fetchCivicFallback({
        state: geocoded.place?.state,
        city: geocoded.place?.city,
        county: geocoded.place?.county,
        country: geocoded.place?.country,
      })
      if (fallback.officials.length) {
        const totalMs = Date.now() - startedAt
        return NextResponse.json({
          ok: true,
          generatedAt: new Date().toISOString(),
          lod: "viewport",
          bounds,
          center: boundsCenter(bounds),
          place: geocoded.place,
          jurisdiction_stack: geocoded.jurisdiction_stack,
          civic: {
            officials: fallback.officials,
            offices: [],
            elections: fallback.elections,
            status: "fallback",
          },
          facilities: { facilities: [], status: "unavailable" },
          officials: fallback.officials,
          elections: fallback.elections,
          legislation: fallback.legislation,
          finance_lobbying: [],
          budgets_debt_defense: [],
          media_gallery: fallback.officials
            .filter((o) => o.image_url)
            .map((o) => ({
              entity_type: "official",
              entity_id: o.id,
              image_url: o.image_url,
              source: "civic-fallback",
            })),
          meta: {
            dedupeConfidence: 0.72,
            freshnessUtc: new Date().toISOString(),
            timings: { totalMs, budgetMs: 1200, withinBudget: totalMs <= 1200 },
            civicFallback: true,
          },
        })
      }
      return buildEmptyCivicResponse(bounds, geocoded, startedAt, "unavailable")
    }

    const totalMs = Date.now() - startedAt
    const officials = Array.isArray(body?.representatives) ? body.representatives : []
    const offices = Array.isArray(body?.offices) ? body.offices : []
    const elections = Array.isArray(body?.elections) ? body.elections : []
    const facilities = Array.isArray(body?.facilities) ? body.facilities : []

    const mindexPlace = normalizePlace(body?.place as Record<string, unknown> | undefined)
    const mindexPlaceComplete = Boolean(mindexPlace && !placeNeedsEnrichment(mindexPlace))
    const enriched = mindexPlaceComplete
      ? { place: mindexPlace, jurisdiction_stack: buildJurisdictionStackFromPlace(mindexPlace) }
      : await enrichPlaceFromBounds(mindexPlace, bounds)
    const jurisdiction_stack = mergeJurisdictionStacks(
      Array.isArray(body?.jurisdiction_stack) ? body.jurisdiction_stack : [],
      mergeJurisdictionStacks(
        enriched.jurisdiction_stack,
        mindexPlaceComplete ? enriched.jurisdiction_stack : geocoded.jurisdiction_stack,
      ),
    )

    let mappedOfficials = officials.map((official: Record<string, unknown>) => ({
      id: official.id,
      name: official.name,
      office: official.office,
      party: official.party,
      phones: official.phones || [],
      emails: official.emails || [],
      urls: official.urls || [],
      address: official.address,
      image_url: official.image_url ?? null,
      jurisdiction_name: official.jurisdiction_name,
      term_start: official.term_start,
      term_end: official.term_end,
    }))
    let mergedElections = elections
    let mergedLegislation = Array.isArray(body?.legislation) ? body.legislation : []

    if (!mappedOfficials.length) {
      const fallback = await fetchCivicFallback({
        state: enriched.place?.state ?? geocoded.place?.state,
        city: enriched.place?.city ?? geocoded.place?.city,
        county: enriched.place?.county ?? geocoded.place?.county,
        country: enriched.place?.country ?? geocoded.place?.country,
      })
      if (fallback.officials.length) {
        mappedOfficials = fallback.officials
        if (!mergedElections.length) mergedElections = fallback.elections
        if (!mergedLegislation.length) mergedLegislation = fallback.legislation
      }
    }

    const response = NextResponse.json({
      ok: true,
      generatedAt: body?.generated_at || new Date().toISOString(),
      lod: body?.lod || "viewport",
      bounds: body?.bounds ?? bounds,
      center: body?.center ?? boundsCenter(bounds),
      place: enriched.place ?? (mindexPlaceComplete ? mindexPlace : geocoded.place),
      civic: {
        officials: mappedOfficials,
        offices,
        elections: mergedElections,
        status: mappedOfficials.length || mergedElections.length ? "live" : "empty",
      },
      facilities: {
        facilities,
        status: facilities.length ? "live" : "empty",
      },
      jurisdiction_stack,
      officials: mappedOfficials,
      elections: mergedElections,
      legislation: mergedLegislation,
      finance_lobbying: Array.isArray(body?.finance_lobbying) ? body.finance_lobbying : [],
      budgets_debt_defense: Array.isArray(body?.budgets_debt_defense) ? body.budgets_debt_defense : [],
      media_gallery: mappedOfficials.some((o) => o.image_url)
        ? mappedOfficials
            .filter((o) => o.image_url)
            .map((o) => ({
              entity_type: "official",
              entity_id: o.id,
              image_url: o.image_url,
              source: "viewport-intel",
            }))
        : Array.isArray(body?.media_gallery) ? body.media_gallery : [],
      meta: {
        dedupeConfidence: (body?.meta as Record<string, unknown> | undefined)?.dedupe_confidence ?? 0.8,
        freshnessUtc: (body?.meta as Record<string, unknown> | undefined)?.freshness_utc || new Date().toISOString(),
        timings: {
          totalMs,
          budgetMs: 1200,
          withinBudget: totalMs <= 1200,
        },
      },
    })
    response.headers.set("Server-Timing", `total;dur=${totalMs}`)
    response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800")
    return response
  } catch (error) {
    const geocoded = await geocodePromise
    try {
      const fallback = await fetchCivicFallback({
        state: geocoded.place?.state,
        city: geocoded.place?.city,
        county: geocoded.place?.county,
        country: geocoded.place?.country,
      })
      if (fallback.officials.length) {
        const totalMs = Date.now() - startedAt
        return NextResponse.json({
          ok: true,
          generatedAt: new Date().toISOString(),
          lod: "viewport",
          bounds,
          center: boundsCenter(bounds),
          place: geocoded.place,
          jurisdiction_stack: geocoded.jurisdiction_stack,
          civic: {
            officials: fallback.officials,
            offices: [],
            elections: fallback.elections,
            status: "fallback",
          },
          facilities: { facilities: [], status: "unavailable" },
          officials: fallback.officials,
          elections: fallback.elections,
          legislation: fallback.legislation,
          finance_lobbying: [],
          budgets_debt_defense: [],
          media_gallery: fallback.officials
            .filter((o) => o.image_url)
            .map((o) => ({
              entity_type: "official",
              entity_id: o.id,
              image_url: o.image_url,
              source: "civic-fallback",
            })),
          meta: {
            dedupeConfidence: 0.72,
            freshnessUtc: new Date().toISOString(),
            timings: { totalMs, budgetMs: 1200, withinBudget: totalMs <= 1200 },
            civicFallback: true,
          },
        })
      }
    } catch {
      /* fall through to empty */
    }
    const response = buildEmptyCivicResponse(bounds, geocoded, startedAt, "unavailable")
    response.headers.set("Server-Timing", `total;dur=${Date.now() - startedAt}`)
    return response
  }
}
