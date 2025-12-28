import { NextRequest, NextResponse } from "next/server"

const INATURALIST_API = "https://api.inaturalist.org/v1"

// Local curated species data for quick access
const CURATED_SPECIES = [
  { id: "47170", name: "Turkey Tail", scientific: "Trametes versicolor", family: "Polyporaceae", edible: false, medicinal: true },
  { id: "48701", name: "Lion's Mane", scientific: "Hericium erinaceus", family: "Hericiaceae", edible: true, medicinal: true },
  { id: "55545", name: "Reishi", scientific: "Ganoderma lucidum", family: "Ganodermataceae", edible: false, medicinal: true },
  { id: "48212", name: "Chanterelle", scientific: "Cantharellus cibarius", family: "Cantharellaceae", edible: true, medicinal: false },
  { id: "48091", name: "Morel", scientific: "Morchella esculenta", family: "Morchellaceae", edible: true, medicinal: false },
  { id: "62750", name: "Shiitake", scientific: "Lentinula edodes", family: "Omphalotaceae", edible: true, medicinal: true },
  { id: "48494", name: "Oyster Mushroom", scientific: "Pleurotus ostreatus", family: "Pleurotaceae", edible: true, medicinal: false },
  { id: "48105", name: "Porcini", scientific: "Boletus edulis", family: "Boletaceae", edible: true, medicinal: false },
  { id: "53716", name: "Fly Agaric", scientific: "Amanita muscaria", family: "Amanitaceae", edible: false, medicinal: false },
  { id: "55932", name: "Chaga", scientific: "Inonotus obliquus", family: "Hymenochaetaceae", edible: false, medicinal: true },
  { id: "63559", name: "Maitake", scientific: "Grifola frondosa", family: "Meripilaceae", edible: true, medicinal: true },
  { id: "117622", name: "Cordyceps", scientific: "Cordyceps militaris", family: "Cordycipitaceae", edible: false, medicinal: true },
]

interface Species {
  id: string
  name: string
  scientific: string
  family: string
  observations: number
  edible: boolean
  medicinal: boolean
  imageUrl?: string
}

// Fetch real species data from iNaturalist
async function fetchFromINaturalist(query?: string, limit: number = 50): Promise<Species[]> {
  try {
    const params = new URLSearchParams({
      taxon_id: "47170", // Fungi kingdom ancestor
      rank: "species",
      per_page: String(Math.min(limit, 100)),
      order: "desc",
      order_by: "observations_count",
    })

    if (query) {
      params.set("q", query)
    }

    const response = await fetch(`${INATURALIST_API}/taxa?${params}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 600 }, // Cache for 10 minutes
    })

    if (!response.ok) {
      console.error("iNaturalist API error:", response.status)
      return []
    }

    const data = await response.json()

    return (data.results || []).map((taxon: any) => ({
      id: String(taxon.id),
      name: taxon.preferred_common_name || taxon.name,
      scientific: taxon.name,
      family: taxon.ancestors?.find((a: any) => a.rank === "family")?.name || "Unknown",
      observations: taxon.observations_count || 0,
      edible: isEdible(taxon.name),
      medicinal: isMedicinal(taxon.name),
      imageUrl: taxon.default_photo?.medium_url || "",
    }))
  } catch (error) {
    console.error("Failed to fetch from iNaturalist:", error)
    return []
  }
}

// Check if species is known to be edible
function isEdible(scientific: string): boolean {
  const edibleSpecies = [
    "hericium", "cantharellus", "morchella", "lentinula", "pleurotus",
    "boletus edulis", "grifola", "agaricus", "laetiporus", "coprinus",
    "craterellus", "hydnum", "sparassis", "calvatia", "lycoperdon",
  ]
  return edibleSpecies.some((s) => scientific.toLowerCase().includes(s))
}

// Check if species is known to be medicinal
function isMedicinal(scientific: string): boolean {
  const medicinalSpecies = [
    "trametes", "hericium", "ganoderma", "cordyceps", "inonotus",
    "lentinula", "grifola", "agaricus blazei", "phellinus", "poria",
  ]
  return medicinalSpecies.some((s) => scientific.toLowerCase().includes(s))
}

// Enhance curated species with real observation counts
async function enhanceCuratedSpecies(): Promise<Species[]> {
  const enhanced: Species[] = []

  for (const species of CURATED_SPECIES) {
    try {
      const response = await fetch(
        `${INATURALIST_API}/observations?taxon_id=${species.id}&per_page=0`,
        { next: { revalidate: 3600 } }
      )
      const data = await response.json()

      const taxonResponse = await fetch(
        `${INATURALIST_API}/taxa/${species.id}`,
        { next: { revalidate: 3600 } }
      )
      const taxonData = await taxonResponse.json()
      const taxon = taxonData.results?.[0]

      enhanced.push({
        ...species,
        observations: data.total_results || 0,
        imageUrl: taxon?.default_photo?.medium_url || "",
      })
    } catch {
      enhanced.push({ ...species, observations: 0 })
    }
  }

  return enhanced
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")?.toLowerCase()
  const limit = parseInt(searchParams.get("limit") || "50")
  const edible = searchParams.get("edible")
  const medicinal = searchParams.get("medicinal")

  let results: Species[] = []

  if (query) {
    // Search iNaturalist for matching species
    results = await fetchFromINaturalist(query, limit)
  } else {
    // Return popular/curated species with real data
    results = await enhanceCuratedSpecies()
  }

  // Apply filters
  if (edible === "true") results = results.filter((s) => s.edible)
  if (medicinal === "true") results = results.filter((s) => s.medicinal)

  return NextResponse.json({
    total: results.length,
    species: results.slice(0, limit),
    sources: ["iNaturalist", "MINDEX"],
    realData: true,
  })
}
