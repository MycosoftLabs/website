import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

const MINDEX_API = resolveMindexServerBaseUrl()

function finiteNumber(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now()
  const q = req.nextUrl.searchParams
  const north = finiteNumber(q.get("north"), 0)
  const south = finiteNumber(q.get("south"), 0)
  const east = finiteNumber(q.get("east"), 0)
  const west = finiteNumber(q.get("west"), 0)
  const zoom = finiteNumber(q.get("zoom"), 4)

  const params = new URLSearchParams({
    north: String(Math.max(north, south)),
    south: String(Math.min(north, south)),
    east: String(east),
    west: String(west),
    zoom: String(zoom),
  })

  try {
    const internalTokenRaw =
      process.env.MINDEX_INTERNAL_TOKEN ||
      process.env.MINDEX_INTERNAL_TOKENS ||
      ""
    const internalToken = internalTokenRaw.includes(",")
      ? internalTokenRaw.split(",")[0]?.trim()
      : internalTokenRaw.trim()
    const upstream = await fetch(`${MINDEX_API}/api/mindex/civic/viewport-intel?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        ...(internalToken ? { "X-Internal-Token": internalToken } : {}),
        "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    })

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "mindex_civic_unavailable",
          status: upstream.status,
          generatedAt: new Date().toISOString(),
          civic: { officials: [], offices: [], elections: [], status: "mindex_error" },
          facilities: { facilities: [], status: "mindex_error" },
        },
        { status: 200 },
      )
    }

    const body = await upstream.json()
    const totalMs = Date.now() - startedAt
    const officials = Array.isArray(body?.representatives) ? body.representatives : []
    const offices = Array.isArray(body?.offices) ? body.offices : []
    const elections = Array.isArray(body?.elections) ? body.elections : []
    const facilities = Array.isArray(body?.facilities) ? body.facilities : []
    const providerLineage = Array.isArray(body?.meta?.source_lineage) ? body.meta.source_lineage : []

    const response = NextResponse.json({
      ok: true,
      generatedAt: body?.generated_at || new Date().toISOString(),
      lod: body?.lod || "viewport",
      bounds: body?.bounds,
      center: body?.center,
      place: body?.place
        ? {
            displayName: body.place.display_name || body.place.displayName || "",
            country: body.place.country,
            countryCode: body.place.country_code || body.place.countryCode,
            state: body.place.state,
            county: body.place.county,
            city: body.place.city,
            suburb: body.place.suburb,
            postcode: body.place.postcode,
            lat: body.place.lat,
            lng: body.place.lng,
          }
        : null,
      civic: {
        officials: officials.map((official: Record<string, unknown>) => ({
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
        })),
        offices,
        elections,
        status: "mindex_unified_live",
      },
      facilities: {
        facilities,
        status: "mindex_unified_live",
      },
      // Production contract for right-panel viewport intelligence.
      jurisdiction_stack: Array.isArray(body?.jurisdiction_stack)
        ? body.jurisdiction_stack
        : [],
      officials: Array.isArray(body?.officials)
        ? body.officials
        : officials.map((official: any) => ({
            id: official.id,
            name: official.name,
            office: official.office,
            geo: null,
            image_url: official.image_url ?? null,
            contacts: {
              phones: official.phones || [],
              emails: official.emails || [],
              urls: official.urls || [],
              address: official.address || null,
            },
            source: official.provider_records?.[0] || "provider",
            last_updated: body?.meta?.freshness_utc || new Date().toISOString(),
            confidence_score: body?.meta?.dedupe_confidence ?? 0.8,
          })),
      elections,
      legislation: Array.isArray(body?.legislation) ? body.legislation : [],
      finance_lobbying: Array.isArray(body?.finance_lobbying) ? body.finance_lobbying : [],
      budgets_debt_defense: Array.isArray(body?.budgets_debt_defense) ? body.budgets_debt_defense : [],
      media_gallery: Array.isArray(body?.media_gallery) ? body.media_gallery : [],
      provenance: providerLineage,
      freshness: {
        generated_at: body?.generated_at || new Date().toISOString(),
        source_freshness_utc: body?.meta?.freshness_utc || new Date().toISOString(),
      },
      meta: {
        sourceLineage: providerLineage,
        dedupeConfidence: body?.meta?.dedupe_confidence ?? 0.8,
        freshnessUtc: body?.meta?.freshness_utc || new Date().toISOString(),
        timings: {
          totalMs,
          budgetMs: 1200,
          withinBudget: totalMs <= 1200,
        },
      },
    })
    response.headers.set("Server-Timing", `total;dur=${totalMs}`)
    return response
  } catch (error) {
    const totalMs = Date.now() - startedAt
    const response = NextResponse.json(
      {
        ok: false,
        error: (error as Error)?.message || "viewport_intel_failed",
        generatedAt: new Date().toISOString(),
        civic: { officials: [], offices: [], elections: [], status: "mindex_fetch_failed" },
        facilities: { facilities: [], status: "mindex_fetch_failed" },
        meta: {
          sourceLineage: [],
          dedupeConfidence: 0,
          freshnessUtc: new Date().toISOString(),
          timings: {
            totalMs,
            budgetMs: 1200,
            withinBudget: false,
          },
        },
      },
      { status: 200 },
    )
    response.headers.set("Server-Timing", `total;dur=${totalMs}`)
    return response
  }
}
