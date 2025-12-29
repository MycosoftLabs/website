import { NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

interface MINDEXTaxon {
  id: string
  canonical_name: string
  scientific_name?: string
  common_name: string | null
  family?: string
  genus?: string
  rank: string
  source: string
  description?: string
  metadata?: {
    inat_id?: number
    ancestry?: string
    parent_id?: number
    wikipedia_url?: string
    observations_count?: number
    default_photo?: {
      url?: string
      medium_url?: string
    }
    photos?: Array<{ url: string }>
    habitat?: string
    edibility?: string
  }
}

// Transform MINDEX taxon to ancestry species format
function transformToSpecies(taxon: MINDEXTaxon, index: number) {
  const metadata = taxon.metadata || {}
  
  // Extract characteristics from metadata
  const characteristics: string[] = []
  if (taxon.rank) characteristics.push(taxon.rank)
  if (metadata.observations_count && metadata.observations_count > 1000) characteristics.push("Common")
  if (metadata.observations_count && metadata.observations_count > 10000) characteristics.push("Very Common")
  if (taxon.source) characteristics.push(`Source: ${taxon.source}`)
  
  // Try to get image from metadata
  let imageUrl = null
  if (metadata.default_photo?.medium_url) {
    imageUrl = metadata.default_photo.medium_url
  } else if (metadata.default_photo?.url) {
    imageUrl = metadata.default_photo.url.replace("square", "medium")
  } else if (metadata.photos && metadata.photos.length > 0) {
    imageUrl = metadata.photos[0].url
  }
  
  // Extract family from ancestry if not available
  let family = taxon.family || "Unknown"
  
  return {
    id: index + 1, // Use numeric ID for compatibility
    uuid: taxon.id,
    scientific_name: taxon.scientific_name || taxon.canonical_name,
    common_name: taxon.common_name,
    family,
    description: taxon.description || null,
    image_url: imageUrl,
    characteristics,
    habitat: metadata.habitat || null,
    edibility: metadata.edibility || null,
    source: taxon.source,
    observations_count: metadata.observations_count || 0,
    wikipedia_url: metadata.wikipedia_url || null,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")?.toLowerCase()
  const filter = searchParams.get("filter")
  const category = searchParams.get("category")
  const limit = parseInt(searchParams.get("limit") || "100")

  try {
    // First, try to get data from MINDEX
    let url = `${MINDEX_API_URL}/api/mindex/taxa?per_page=${limit}`
    
    if (query) {
      // Use search endpoint for queries
      url = `${MINDEX_API_URL}/api/mindex/search?q=${encodeURIComponent(query)}&limit=${limit}`
    }

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MINDEX_API_KEY,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (response.ok) {
      const data = await response.json()
      
      // Handle search results vs taxa list
      let taxa: MINDEXTaxon[] = []
      if (data.local_results) {
        // Search response
        taxa = [...(data.local_results || []), ...(data.api_results || [])]
      } else if (data.data) {
        // Taxa list response
        taxa = data.data
      }

      if (taxa.length > 0) {
        let species = taxa.map((taxon, index) => transformToSpecies(taxon, index))

        // Apply filters
        if (filter && filter !== "All") {
          species = species.filter((s) =>
            s.characteristics.some((c) => c.toLowerCase().includes(filter.toLowerCase()))
          )
        }

        if (category && category !== "all") {
          species = species.filter((s) => {
            const chars = s.characteristics.map((c) => c.toLowerCase())
            switch (category) {
              case "edible":
                return chars.includes("edible") || s.edibility === "edible"
              case "medicinal":
                return chars.includes("medicinal")
              case "poisonous":
                return chars.includes("poisonous") || chars.includes("toxic")
              default:
                return true
            }
          })
        }

        return NextResponse.json({
          species,
          total: species.length,
          source: "mindex",
        })
      }
    }

    // If MINDEX failed or returned no results, try direct search
    console.log("MINDEX query failed, trying fallback sources...")

  } catch (error) {
    console.log("MINDEX connection error:", error instanceof Error ? error.message : "Unknown error")
  }

  // Fallback: Query external APIs directly for real data
  try {
    const species = await fetchFromExternalAPIs(query || "fungi", limit)
    if (species.length > 0) {
      return NextResponse.json({
        species,
        total: species.length,
        source: "external_api",
      })
    }
  } catch (error) {
    console.log("External API error:", error)
  }

  // Last resort: Return minimal fallback data with message
  return NextResponse.json({
    species: [],
    total: 0,
    source: "none",
    message: "MINDEX service not running. Start it with: docker-compose -f docker-compose.mindex.yml up -d",
  })
}

// Fetch from external APIs directly (iNaturalist, GBIF)
async function fetchFromExternalAPIs(query: string, limit: number) {
  const species: any[] = []

  try {
    // Try iNaturalist
    const inatResponse = await fetch(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=${limit}&taxon_id=47170`,
      {
        headers: {
          "User-Agent": "MYCOSOFT-Ancestry/1.0 (https://mycosoft.io)",
          "Accept": "application/json",
        },
      }
    )

    if (inatResponse.ok) {
      const data = await inatResponse.json()
      for (const taxon of data.results || []) {
        species.push({
          id: taxon.id,
          scientific_name: taxon.name,
          common_name: taxon.preferred_common_name || null,
          family: taxon.family || "Unknown",
          description: taxon.wikipedia_summary || null,
          image_url: taxon.default_photo?.medium_url || null,
          characteristics: [
            taxon.rank || "species",
            `${taxon.observations_count || 0} observations`,
          ],
          habitat: null,
          source: "iNaturalist",
          observations_count: taxon.observations_count || 0,
        })
      }
    }
  } catch (error) {
    console.error("iNaturalist fetch error:", error)
  }

  // Try GBIF if iNaturalist didn't return enough
  if (species.length < limit) {
    try {
      const gbifResponse = await fetch(
        `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&limit=${limit - species.length}&kingdom=Fungi`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      )

      if (gbifResponse.ok) {
        const data = await gbifResponse.json()
        for (const taxon of data.results || []) {
          species.push({
            id: taxon.key,
            scientific_name: taxon.scientificName || taxon.canonicalName,
            common_name: taxon.vernacularName || null,
            family: taxon.family || "Unknown",
            description: taxon.description || null,
            image_url: null,
            characteristics: [
              taxon.rank || "SPECIES",
              taxon.taxonomicStatus || "ACCEPTED",
            ],
            habitat: null,
            source: "GBIF",
            observations_count: taxon.numDescendants || 0,
          })
        }
      }
    } catch (error) {
      console.error("GBIF fetch error:", error)
    }
  }

  return species
}
