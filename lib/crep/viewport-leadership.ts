/**
 * Viewport Intelligence leadership LOD — zoom-aware executive display.
 * City zoom: mayor + council. State zoom: governor. No governor at city close-up.
 * May 25, 2026
 */

import type { ViewportPlaceLike } from "@/lib/crep/viewport-place"

export interface ViewportLeadershipOfficial {
  id?: string
  name: string
  office: string
  party?: string
  phones?: string[]
  emails?: string[]
  urls?: string[]
  address?: string
  image_url?: string | null
  jurisdiction_name?: string
  term_start?: string
  term_end?: string | null
}

export type ViewportLeadershipLod = "country" | "state" | "county" | "city"

/** Match CREP viewport LOD thresholds (mapZoom). City at z≥10 aligns with metro fly-to chips. */
export function resolveViewportLeadershipLod(mapZoom: number): ViewportLeadershipLod {
  if (mapZoom >= 10) return "city"
  if (mapZoom >= 8) return "county"
  if (mapZoom >= 5) return "state"
  return "country"
}

function officeLower(office: string): string {
  return office.toLowerCase()
}

export function isFederalExecutive(office: string): boolean {
  const v = officeLower(office)
  return (
    v.includes("president of the united states") ||
    v.includes("vice president of the united states")
  )
}

export function isNationalExecutive(office: string): boolean {
  const v = officeLower(office)
  return (
    isFederalExecutive(office) ||
    v.includes("prime minister") ||
    v.includes("chancellor") ||
    v.includes("president of ") ||
    v.includes("vice president") ||
    v.includes("premier") ||
    v.includes("emperor") ||
    v.includes("king of ") ||
    v.includes("queen of ") ||
    v.includes("monarch") ||
    v.includes("governor general") ||
    v.includes("general secretary") ||
    v.includes("president of mexico") ||
    v.includes("president of china") ||
    v.includes("president of the european council") ||
    v.includes("president of the european commission") ||
    v.includes("president of the european parliament")
  )
}

export function isStateExecutive(office: string): boolean {
  const v = officeLower(office)
  return (
    v.includes("governor") ||
    v.includes("lieutenant governor") ||
    v.includes("lt. governor") ||
    v.includes("lt governor")
  )
}

export function isCityExecutive(office: string): boolean {
  const v = officeLower(office)
  return (
    v.includes("mayor") ||
    v.includes("city manager") ||
    v.includes("city attorney") ||
    v.includes("vice mayor") ||
    v.includes("deputy mayor")
  )
}

export function isCityCouncil(office: string): boolean {
  const v = officeLower(office)
  return (
    v.includes("council") ||
    v.includes("councilmember") ||
    v.includes("council member") ||
    v.includes("city council") ||
    (v.includes("district") && v.includes("council"))
  )
}

export function isCountyExecutive(office: string): boolean {
  const v = officeLower(office)
  return (
    v.includes("county supervisor") ||
    v.includes("board of supervisors") ||
    v.includes("county executive") ||
    (v.includes("supervisor") && v.includes("county"))
  )
}

function leadershipTierForLod(
  office: string,
  lod: ViewportLeadershipLod,
  place?: ViewportPlaceLike | null,
): "include" | "exclude" {
  if (isCityCouncil(office)) {
    return lod === "city" ? "include" : "exclude"
  }
  if (isCityExecutive(office)) {
    if (lod === "city") return "include"
    if (lod === "county" && place?.city) return "include"
    return "exclude"
  }
  if (isCountyExecutive(office)) {
    return lod === "county" ? "include" : "exclude"
  }
  if (isStateExecutive(office)) {
    // Governor at state zoom; also at county when no city is resolved yet.
    if (lod === "state") return "include"
    if (lod === "county" && !place?.city) return "include"
    return "exclude"
  }
  if (isNationalExecutive(office)) {
    if (!place?.state && !place?.county && !place?.city && !place?.suburb) {
      return lod === "country" || lod === "state" ? "include" : "exclude"
    }
    return lod === "country" ? "include" : "exclude"
  }
  if (isCongressionalLeadership(office)) {
    return lod === "country" ? "include" : "exclude"
  }
  return "exclude"
}

function cityLeadershipSortRank(office: string): number {
  const v = officeLower(office)
  if (v.includes("mayor") && !v.includes("vice") && !v.includes("deputy")) return 0
  if (v.includes("council president") || v.includes("president of the council")) return 1
  if (v.includes("vice mayor") || v.includes("deputy mayor")) return 2
  if (v.includes("city manager")) return 3
  if (isCityCouncil(office)) {
    const district = office.match(/district\s*(\d+)/i)?.[1]
    return 10 + (district ? Number.parseInt(district, 10) : 50)
  }
  if (v.includes("city attorney")) return 80
  return 90
}

function stateLeadershipSortRank(office: string): number {
  const v = officeLower(office)
  if (v.includes("prime minister") || v.includes("premier")) return 0
  if (v.includes("chancellor")) return 0
  if (v.includes("president of ") || v.includes("general secretary")) return 0
  if (v.includes("vice president")) return 1
  if (v.includes("emperor") || v.includes("king of ") || v.includes("queen of ")) return 2
  if (v.includes("governor general")) return 3
  if (v.includes("governor") && !v.includes("lieutenant") && !v.includes("lt")) return 0
  if (v.includes("lieutenant governor") || v.includes("lt. governor") || v.includes("lt governor"))
    return 1
  return 10
}

function sortLeadershipForLod(
  officials: ViewportLeadershipOfficial[],
  lod: ViewportLeadershipLod,
): ViewportLeadershipOfficial[] {
  return [...officials].sort((a, b) => {
    const rankA =
      lod === "city"
        ? cityLeadershipSortRank(a.office)
        : lod === "state" || lod === "county"
          ? stateLeadershipSortRank(a.office)
          : 0
    const rankB =
      lod === "city"
        ? cityLeadershipSortRank(b.office)
        : lod === "state" || lod === "county"
          ? stateLeadershipSortRank(b.office)
          : 0
    if (rankA !== rankB) return rankA - rankB
    return a.name.localeCompare(b.name)
  })
}

function maxLeadershipCount(lod: ViewportLeadershipLod): number {
  switch (lod) {
    case "city":
      return 12
    case "county":
      return 6
    case "state":
      return 4
    case "country":
      return 6
  }
}

export function leadershipLodLabel(lod: ViewportLeadershipLod, place?: ViewportPlaceLike | null): string {
  switch (lod) {
    case "city":
      return place?.city ? `${place.city} leadership` : "City leadership"
    case "county":
      return place?.county ? `${place.county} leadership` : "County leadership"
    case "state":
      return place?.state ? `${place.state} leadership` : "National leadership"
    case "country":
      return "National leadership"
  }
}

/** Pick and order leadership officials appropriate for current map zoom. */
export function filterAndSortViewportLeadership(
  officials: ViewportLeadershipOfficial[],
  mapZoom: number,
  place?: ViewportPlaceLike | null,
): ViewportLeadershipOfficial[] {
  const lod = resolveViewportLeadershipLod(mapZoom)
  const filtered = officials.filter((official) => {
    const tier = leadershipTierForLod(official.office, lod, place)
    return tier === "include"
  })
  const countryCode = (place?.countryCode ?? "").trim().toUpperCase()
  if (!filtered.length && countryCode && countryCode !== "US") {
    const nationalFallback = officials.filter((official) => isNationalExecutive(official.office))
    return sortLeadershipForLod(nationalFallback, "country").slice(0, maxLeadershipCount("country"))
  }
  return sortLeadershipForLod(filtered, lod).slice(0, maxLeadershipCount(lod))
}

/** Legacy check — federal/state/city executives only (no council). */
export function isLeadershipExecutive(office: string): boolean {
  return (
    isNationalExecutive(office) ||
    isStateExecutive(office) ||
    isCityExecutive(office)
  )
}

function isFederalLegislator(office: string): boolean {
  const v = officeLower(office)
  return v.includes("u.s. senator") || v.includes("u.s. representative") || v.includes("congress")
}

function isCongressionalLeadership(office: string): boolean {
  const v = officeLower(office)
  return (
    v.includes("senate majority") ||
    v.includes("senate minority") ||
    v.includes("speaker of the u.s. house") ||
    v.includes("speaker of the house")
  )
}

/** Government section — hide executives at wrong zoom (e.g. governor at US view). May 24, 2026 */
export function officialMatchesGovernmentLod(
  office: string,
  lod: ViewportLeadershipLod,
  place?: ViewportPlaceLike | null,
): boolean {
  if (isCityExecutive(office) || isCityCouncil(office)) {
    if (lod === "city") return true
    if (lod === "county" && place?.city) return true
    return false
  }
  if (isCountyExecutive(office)) return lod === "county"
  if (isStateExecutive(office)) {
    if (lod === "state") return true
    if (lod === "county" && !place?.city) return true
    return false
  }
  if (isNationalExecutive(office)) {
    if (!place?.state && !place?.county && !place?.city && !place?.suburb) {
      return lod === "country" || lod === "state"
    }
    return lod === "country"
  }
  if (isCongressionalLeadership(office)) return lod === "country"
  if (isFederalLegislator(office)) return lod === "country" || lod === "state"
  return lod === "country" || lod === "state" || lod === "county" || lod === "city"
}
