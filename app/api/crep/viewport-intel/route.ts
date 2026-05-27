import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import {
  boundsCenter,
  buildJurisdictionStackFromPlace,
  mergeJurisdictionStacks,
  placeNeedsEnrichment,
  reverseGeocodePlace,
  resolveLocalViewportPlaceHint,
  resolveViewportGeographyLod,
  resolveMacroRegionLabel,
  type ViewportPlaceLike,
} from "@/lib/crep/viewport-place"
import { fetchCivicFallback } from "@/lib/crep/civic-fallback"
import { resolveCivicFacilityHintsForViewport } from "@/lib/crep/civic-facility-hints"
import {
  countryGovernmentOfficialWithDefaults,
  resolveGovernmentProfilesForViewport,
  type CountryGovernmentProfile,
} from "@/lib/crep/country-government-profiles"

export const dynamic = "force-dynamic"
export const revalidate = 86400

const MINDEX_API = resolveMindexServerBaseUrl()
const MINDEX_TIMEOUT_MS = 900

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

function normalizeCountryCode(code?: string | null): string {
  return (code ?? "").trim().toUpperCase()
}

function countryNamesConflict(a?: ViewportPlaceLike | null, b?: ViewportPlaceLike | null): boolean {
  const codeA = normalizeCountryCode(a?.countryCode)
  const codeB = normalizeCountryCode(b?.countryCode)
  if (codeA && codeB && codeA !== codeB) return true
  const nameA = (a?.country ?? "").trim().toLowerCase()
  const nameB = (b?.country ?? "").trim().toLowerCase()
  return Boolean(nameA && nameB && nameA !== nameB)
}

function mergeAuthoritativePlace(
  current: ViewportPlaceLike | null,
  candidate: ViewportPlaceLike | null,
): ViewportPlaceLike | null {
  if (!candidate) return current
  if (!current || countryNamesConflict(current, candidate)) {
    return {
      ...current,
      ...candidate,
      displayName: candidate.displayName || current?.displayName,
    }
  }
  return {
    ...candidate,
    ...current,
    displayName: current.displayName || candidate.displayName,
    city: current.city || candidate.city,
    county: current.county || candidate.county,
    state: current.state || candidate.state,
    country: current.country || candidate.country,
    countryCode: current.countryCode || candidate.countryCode,
  }
}

function centerAppearsInsideUnitedStates(bounds: { north: number; south: number; east: number; west: number }): boolean {
  const center = boundsCenter(bounds)
  return center.lat >= 18 && center.lat <= 72 && center.lng >= -170 && center.lng <= -52
}

function shouldUseUnitedStatesFallback(
  place: ViewportPlaceLike | null | undefined,
  bounds: { north: number; south: number; east: number; west: number },
) {
  const code = normalizeCountryCode(place?.countryCode)
  const country = (place?.country ?? "").toLowerCase()
  if (code && code !== "US") return false
  if (country && !country.includes("united states")) return false
  if (code === "US" || country.includes("united states")) return true
  return centerAppearsInsideUnitedStates(bounds)
}

function buildGovernmentPayload(profiles: CountryGovernmentProfile[]) {
  if (!profiles.length) return null
  return {
    profiles: profiles.map((profile) => ({
      key: profile.key,
      name: profile.name,
      countryCode: profile.countryCode,
      flagUrl: profile.flagUrl,
      sealUrls: profile.sealUrls,
      governmentType: profile.governmentType,
      politicalSystem: profile.politicalSystem,
    })),
    primaryProfile: profiles[0],
    tabs: profiles.flatMap((profile) =>
      profile.governmentTabs.map((tab) => ({
        ...tab,
        id: `${profile.key}:${tab.id}`,
        label: profiles.length > 1 ? `${profile.key} ${tab.label}` : tab.label,
        shortLabel: profiles.length > 1 ? `${profile.key} ${tab.shortLabel}` : tab.shortLabel,
      })),
    ),
    politics: profiles.flatMap((profile) => profile.politics),
  }
}

function profileOfficials(profiles: CountryGovernmentProfile[]) {
  return profiles.flatMap((profile) => profile.leadership.map(countryGovernmentOfficialWithDefaults))
}

function profileElectionRecords(profiles: CountryGovernmentProfile[]) {
  return profiles.flatMap((profile) =>
    profile.politics
      .filter((item) => item.kind === "election")
      .map((item) => ({
        id: item.id,
        name: item.title,
        jurisdiction_name: profile.name,
        source_url: item.url,
      })),
  )
}

function profileLegislationRecords(profiles: CountryGovernmentProfile[]) {
  return profiles.flatMap((profile) =>
    profile.politics
      .filter((item) => item.kind === "legislation" || item.kind === "institution")
      .map((item) => ({
        id: item.id,
        name: item.title,
        status: item.subtitle ?? "tracked",
        source: "country-government-profile",
        source_url: item.url,
      })),
  )
}

function fallbackFromProfiles(profiles: CountryGovernmentProfile[]) {
  return {
    officials: profileOfficials(profiles),
    elections: profileElectionRecords(profiles),
    legislation: profileLegislationRecords(profiles),
  }
}

function facilityFallbackForViewport(input: {
  place?: ViewportPlaceLike | null
  bounds: { north: number; south: number; east: number; west: number }
}) {
  return resolveCivicFacilityHintsForViewport({
    place: input.place,
    bounds: input.bounds,
    limit: 12,
  })
}

async function fetchFallbackForViewport(input: {
  profiles: CountryGovernmentProfile[]
  place: ViewportPlaceLike | null | undefined
  bounds: { north: number; south: number; east: number; west: number }
}) {
  const { profiles, place, bounds } = input
  const useUnitedStatesFallback = shouldUseUnitedStatesFallback(place, bounds)
  if (profiles.length && !useUnitedStatesFallback) return fallbackFromProfiles(profiles)
  if (!useUnitedStatesFallback && !place?.country) {
    return { officials: [], elections: [], legislation: [] }
  }
  return fetchCivicFallback({
    state: place?.state,
    city: place?.city,
    county: place?.county,
    country: place?.country,
  })
}

function mergeOfficials(primary: any[], additions: any[]) {
  const merged = new Map<string, any>()
  for (const official of [...primary, ...additions]) {
    const key = `${official.office ?? ""}|${official.name ?? ""}`.toLowerCase()
    if (!key.trim()) continue
    merged.set(key, { ...merged.get(key), ...official })
  }
  return Array.from(merged.values())
}

async function enrichPlaceFromBounds(
  place: ViewportPlaceLike | null,
  bounds: { north: number; south: number; east: number; west: number },
  mapZoom = 4,
): Promise<{ place: ViewportPlaceLike | null; jurisdiction_stack: ReturnType<typeof buildJurisdictionStackFromPlace> }> {
  let resolved = place
  const geographyLod = resolveViewportGeographyLod(mapZoom, bounds)
  const center = boundsCenter(bounds)
  const localHint = resolveLocalViewportPlaceHint(center.lat, center.lng)
  if (localHint) {
    resolved = mergeAuthoritativePlace(resolved, localHint)
  }
  if (placeNeedsEnrichment(resolved)) {
    const geocoded = await reverseGeocodePlace(center.lat, center.lng, geographyLod)
    if (geocoded) {
      resolved = mergeAuthoritativePlace(resolved, geocoded)
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
  mapZoom = 4,
) {
  const totalMs = Date.now() - startedAt
  const profiles = resolveGovernmentProfilesForViewport({
    place: enriched.place,
    jurisdictionStack: enriched.jurisdiction_stack,
    macroRegion: resolveMacroRegionLabel(bounds, mapZoom),
  })
  const government = buildGovernmentPayload(profiles)
  const officials = profileOfficials(profiles)
  const profileElections = profileElectionRecords(profiles)
  const profileLegislation = profileLegislationRecords(profiles)
  const facilityHints = facilityFallbackForViewport({ place: enriched.place, bounds })
  return NextResponse.json(
    {
      ok: enriched.place != null,
      generatedAt: new Date().toISOString(),
      bounds,
      center: boundsCenter(bounds),
      place: enriched.place,
      jurisdiction_stack: enriched.jurisdiction_stack,
      government,
      government_profiles: profiles,
      civic: { officials, offices: [], elections: profileElections, status },
      facilities: {
        facilities: facilityHints,
        status: facilityHints.length ? "civic-fallback" : "unavailable",
      },
      officials,
      elections: profileElections,
      legislation: profileLegislation,
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
      const profiles = resolveGovernmentProfilesForViewport({
        place: geocoded.place,
        jurisdictionStack: geocoded.jurisdiction_stack,
        macroRegion: resolveMacroRegionLabel(bounds, zoom),
      })
      const profileLeadership = profileOfficials(profiles)
      const government = buildGovernmentPayload(profiles)
      const fallback = await fetchFallbackForViewport({
        profiles,
        place: geocoded.place,
        bounds,
      })
      if (fallback.officials.length) {
        const officialsWithProfiles = mergeOfficials(fallback.officials, profileLeadership)
        const facilityHints = facilityFallbackForViewport({ place: geocoded.place, bounds })
        const totalMs = Date.now() - startedAt
        return NextResponse.json({
          ok: true,
          generatedAt: new Date().toISOString(),
          lod: "viewport",
          bounds,
          center: boundsCenter(bounds),
          place: geocoded.place,
          jurisdiction_stack: geocoded.jurisdiction_stack,
          government,
          government_profiles: profiles,
          civic: {
            officials: officialsWithProfiles,
            offices: [],
            elections: fallback.elections,
            status: "fallback",
          },
          facilities: {
            facilities: facilityHints,
            status: facilityHints.length ? "civic-fallback" : "unavailable",
          },
          officials: officialsWithProfiles,
          elections: fallback.elections,
          legislation: fallback.legislation,
          finance_lobbying: [],
          budgets_debt_defense: [],
          media_gallery: officialsWithProfiles
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
      return buildEmptyCivicResponse(bounds, geocoded, startedAt, "unavailable", zoom)
    }

    const totalMs = Date.now() - startedAt
    const officials = Array.isArray(body?.representatives) ? body.representatives : []
    const offices = Array.isArray(body?.offices) ? body.offices : []
    const elections = Array.isArray(body?.elections) ? body.elections : []
    const facilities = Array.isArray(body?.facilities) ? body.facilities : []

    const mindexPlace = normalizePlace(body?.place as Record<string, unknown> | undefined)
    const mindexPlaceComplete = Boolean(mindexPlace && !placeNeedsEnrichment(mindexPlace))
    const enrichedRaw = mindexPlaceComplete
      ? { place: mindexPlace, jurisdiction_stack: buildJurisdictionStackFromPlace(mindexPlace) }
      : await enrichPlaceFromBounds(mindexPlace, bounds)
    const authoritativePlace = mergeAuthoritativePlace(enrichedRaw.place, geocoded.place)
    const enriched = {
      place: authoritativePlace,
      jurisdiction_stack: buildJurisdictionStackFromPlace(
        authoritativePlace,
        resolveMacroRegionLabel(bounds, zoom),
      ),
    }
    const jurisdiction_stack = mergeJurisdictionStacks(
      Array.isArray(body?.jurisdiction_stack) ? body.jurisdiction_stack : [],
      mergeJurisdictionStacks(
        enriched.jurisdiction_stack,
        mindexPlaceComplete ? enriched.jurisdiction_stack : geocoded.jurisdiction_stack,
      ),
    )
    const profiles = resolveGovernmentProfilesForViewport({
      place: enriched.place,
      jurisdictionStack: jurisdiction_stack,
      macroRegion: resolveMacroRegionLabel(bounds, zoom),
    })
    const government = buildGovernmentPayload(profiles)
    const profileLeadership = profileOfficials(profiles)

    let mappedOfficials: any[] = officials.map((official: Record<string, unknown>) => ({
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

    mappedOfficials = mergeOfficials(mappedOfficials, profileLeadership)

    const fallbackPlace = {
      ...(geocoded.place ?? {}),
      ...(enriched.place ?? {}),
      state: enriched.place?.state ?? geocoded.place?.state,
      city: enriched.place?.city ?? geocoded.place?.city,
      county: enriched.place?.county ?? geocoded.place?.county,
      country: enriched.place?.country ?? geocoded.place?.country,
      countryCode: enriched.place?.countryCode ?? geocoded.place?.countryCode,
    } as ViewportPlaceLike
    const shouldUseUsFallback = shouldUseUnitedStatesFallback(fallbackPlace, bounds)
    if (!officials.length || shouldUseUsFallback || (!profiles.length && !mappedOfficials.length)) {
      const fallback = await fetchFallbackForViewport({
        profiles,
        place: fallbackPlace,
        bounds,
      })
      if (fallback.officials.length) {
        mappedOfficials = mergeOfficials(mappedOfficials, fallback.officials)
        if (!mergedElections.length) mergedElections = fallback.elections
        if (!mergedLegislation.length) mergedLegislation = fallback.legislation
      }
    }
    const facilityHints = facilities.length
      ? []
      : facilityFallbackForViewport({ place: enriched.place ?? fallbackPlace, bounds })
    const mergedFacilities = facilities.length ? facilities : facilityHints

    const response = NextResponse.json({
      ok: true,
      generatedAt: body?.generated_at || new Date().toISOString(),
      lod: body?.lod || "viewport",
      bounds: body?.bounds ?? bounds,
      center: body?.center ?? boundsCenter(bounds),
      place: enriched.place ?? (mindexPlaceComplete ? mindexPlace : geocoded.place),
      government,
      government_profiles: profiles,
      civic: {
        officials: mappedOfficials,
        offices,
        elections: mergedElections,
        status: mappedOfficials.length || mergedElections.length ? "live" : "empty",
      },
      facilities: {
        facilities: mergedFacilities,
        status: facilities.length ? "live" : facilityHints.length ? "civic-fallback" : "empty",
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
      const profiles = resolveGovernmentProfilesForViewport({
        place: geocoded.place,
        jurisdictionStack: geocoded.jurisdiction_stack,
        macroRegion: resolveMacroRegionLabel(bounds, zoom),
      })
      const government = buildGovernmentPayload(profiles)
      const profileLeadership = profileOfficials(profiles)
      const fallback = await fetchFallbackForViewport({
        profiles,
        place: geocoded.place,
        bounds,
      })
      if (fallback.officials.length) {
        const officialsWithProfiles = mergeOfficials(fallback.officials, profileLeadership)
        const facilityHints = facilityFallbackForViewport({ place: geocoded.place, bounds })
        const totalMs = Date.now() - startedAt
        return NextResponse.json({
          ok: true,
          generatedAt: new Date().toISOString(),
          lod: "viewport",
          bounds,
          center: boundsCenter(bounds),
          place: geocoded.place,
          jurisdiction_stack: geocoded.jurisdiction_stack,
          government,
          government_profiles: profiles,
          civic: {
            officials: officialsWithProfiles,
            offices: [],
            elections: fallback.elections,
            status: "fallback",
          },
          facilities: {
            facilities: facilityHints,
            status: facilityHints.length ? "civic-fallback" : "unavailable",
          },
          officials: officialsWithProfiles,
          elections: fallback.elections,
          legislation: fallback.legislation,
          finance_lobbying: [],
          budgets_debt_defense: [],
          media_gallery: officialsWithProfiles
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
    const response = buildEmptyCivicResponse(bounds, geocoded, startedAt, "unavailable", zoom)
    response.headers.set("Server-Timing", `total;dur=${Date.now() - startedAt}`)
    return response
  }
}
