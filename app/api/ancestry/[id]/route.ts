import { type NextRequest, NextResponse } from "next/server"
import { getSpeciesByUUID, isMINDEXAvailable } from "@/lib/services/mindex-service"

/**
 * Species detail API - NO MOCK DATA.
 * Returns real data from MINDEX, local DB, or iNaturalist only.
 * Returns 404 when no data available (per ancestry overhaul plan).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")

    // Check if ID is a UUID (MINDEX format) or integer (legacy format)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam)
    const id = isUUID ? 0 : Number.parseInt(idParam)

    if (!isUUID && isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // PRIORITY 1: Try MINDEX API first (UUID-based)
    if (isUUID || type === "species") {
      try {
        const mindexAvailable = await isMINDEXAvailable()
        if (mindexAvailable) {
          if (isUUID) {
            const species = await getSpeciesByUUID(idParam)
            if (species) {
              return NextResponse.json({
                species,
                source: "mindex",
                data_quality: species.metadata?.data_quality ?? null,
              })
            }
          }
        }
      } catch (mindexError) {
        console.log("MINDEX not available:", mindexError instanceof Error ? mindexError.message : "Unknown")
      }
    }

    // PRIORITY 2: Try local Neon database
    try {
      const { getAncestryById, getSpeciesById, getSpeciesChildren, getAncestryTree } = await import(
        "@/lib/services/ancestry-service"
      )

      if (type === "species") {
        const species = await getSpeciesById(id)
        if (species) {
          return NextResponse.json({ species, source: "database" })
        }
      } else if (type === "children") {
        const children = await getSpeciesChildren(id)
        return NextResponse.json({ children, source: "database" })
      } else if (type === "tree") {
        const tree = await getAncestryTree(id)
        return NextResponse.json({ tree, source: "database" })
      } else {
        const ancestry = await getAncestryById(id)
        if (ancestry) {
          return NextResponse.json({ ancestry, source: "database" })
        }
      }
    } catch (dbError) {
      console.log("Database not available:", dbError instanceof Error ? dbError.message : "Unknown")
    }

    // PRIORITY 3: Try iNaturalist for integer IDs (real external API)
    if ((type === "species" || !type) && !isUUID && id > 0) {
      try {
        const inatResponse = await fetch(
          `https://api.inaturalist.org/v1/taxa/${id}`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(5000),
          }
        )
        if (inatResponse.ok) {
          const inatData = await inatResponse.json()
          if (inatData.results && inatData.results.length > 0) {
            const taxon = inatData.results[0]
            const inatSpecies = {
              id: taxon.id,
              scientific_name: taxon.name || "Unknown",
              common_name: taxon.preferred_common_name || taxon.english_common_name || null,
              family: taxon.iconic_taxon_name || "Fungi",
              description: taxon.wikipedia_summary || `${taxon.name} is a species of ${taxon.iconic_taxon_name || "fungus"}.`,
              image_url: taxon.default_photo?.medium_url || taxon.default_photo?.url || null,
              characteristics: [
                taxon.rank ? taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1) : null,
                taxon.observations_count > 1000 ? "Well documented" : "Rare",
                taxon.is_active ? "Active" : null,
              ].filter(Boolean),
              habitat: taxon.conservation_status?.place?.display_name || null,
              edibility: null,
              season: null,
              distribution: null,
              observations_count: taxon.observations_count,
              wikipedia_url: taxon.wikipedia_url,
              rank: taxon.rank,
              ancestry: taxon.ancestry,
              ancestors: taxon.ancestors?.map(
                (a: { id: number; name: string; rank: string; preferred_common_name?: string }) => ({
                  id: a.id,
                  name: a.name,
                  rank: a.rank,
                  common_name: a.preferred_common_name,
                })
              ),
            }
            return NextResponse.json({ species: inatSpecies, source: "inaturalist" })
          }
        }
      } catch (inatError) {
        console.log("iNaturalist fetch failed:", inatError instanceof Error ? inatError.message : "Unknown")
      }
    }

    // NO FALLBACK - return proper 404 when no real data
    if (type === "children") {
      return NextResponse.json({ children: [], source: "empty", message: "No children data available" })
    }
    if (type === "tree") {
      return NextResponse.json({ tree: [], source: "empty", message: "No tree data available" })
    }

    return NextResponse.json({ error: "Species not found" }, { status: 404 })
  } catch (error) {
    console.error(`Error in ancestry/${idParam} API:`, error)
    return NextResponse.json({ error: "Failed to fetch ancestry data" }, { status: 500 })
  }
}
