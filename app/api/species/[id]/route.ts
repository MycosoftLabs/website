import { NextRequest, NextResponse } from "next/server"

const INATURALIST_API = "https://api.inaturalist.org/v1"

// Fetch real species data from iNaturalist
async function fetchFromINaturalist(id: string) {
  try {
    const response = await fetch(`${INATURALIST_API}/taxa/${id}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) return null

    const data = await response.json()
    const taxon = data.results?.[0]

    if (!taxon) return null

    // Get observation count
    const obsResponse = await fetch(
      `${INATURALIST_API}/observations?taxon_id=${id}&per_page=0`,
      { next: { revalidate: 3600 } }
    )
    const obsData = await obsResponse.json().catch(() => ({ total_results: 0 }))

    return {
      id: String(taxon.id),
      name: taxon.preferred_common_name || taxon.name,
      scientificName: taxon.name,
      family: taxon.ancestors?.find((a: any) => a.rank === "family")?.name || "Unknown",
      order: taxon.ancestors?.find((a: any) => a.rank === "order")?.name || "Unknown",
      class: taxon.ancestors?.find((a: any) => a.rank === "class")?.name || "Agaricomycetes",
      phylum: taxon.ancestors?.find((a: any) => a.rank === "phylum")?.name || "Basidiomycota",
      kingdom: "Fungi",
      description: taxon.wikipedia_summary || `${taxon.name} is a species of fungus.`,
      habitat: extractHabitat(taxon),
      distribution: taxon.establishment_means?.description || "Distribution data from iNaturalist observations",
      edibility: "Consult expert sources before consuming any wild mushroom",
      medicinal: checkMedicinal(taxon.name),
      medicinalProperties: getMedicinalProperties(taxon.name),
      activeCompounds: getActiveCompounds(taxon.name),
      ecology: taxon.wikipedia_summary?.includes("saprob") ? "Saprobic" : 
               taxon.wikipedia_summary?.includes("mycorrhiz") ? "Mycorrhizal" : 
               taxon.wikipedia_summary?.includes("parasit") ? "Parasitic" : "Unknown",
      season: "Varies by region",
      conservation: taxon.conservation_status?.status_name || "Not Evaluated",
      images: taxon.default_photo ? [
        taxon.default_photo.medium_url,
        taxon.default_photo.original_url,
      ].filter(Boolean) : [],
      observations: obsData.total_results || 0,
      researchPapers: 0, // Would need separate API
      sources: ["iNaturalist", "Wikipedia"],
      wikipediaUrl: taxon.wikipedia_url,
      iNaturalistUrl: `https://www.inaturalist.org/taxa/${id}`,
      realData: true,
    }
  } catch (error) {
    console.error("iNaturalist fetch error:", error)
    return null
  }
}

function extractHabitat(taxon: any): string {
  if (taxon.wikipedia_summary) {
    const habitatMatch = taxon.wikipedia_summary.match(/found (on|in|growing on) ([^.]+)/i)
    if (habitatMatch) return habitatMatch[0]
  }
  return "Various habitats - see iNaturalist for detailed observations"
}

// Known medicinal species mapping
const MEDICINAL_SPECIES: Record<string, { properties: string[], compounds: string[] }> = {
  "trametes versicolor": {
    properties: ["Immunomodulatory", "Antitumor", "Antioxidant", "Prebiotic"],
    compounds: ["Polysaccharide-K (PSK)", "Polysaccharopeptide (PSP)", "Beta-glucans"],
  },
  "hericium erinaceus": {
    properties: ["Neurotrophic", "Neuroprotective", "Cognitive enhancement", "Anti-inflammatory"],
    compounds: ["Hericenones", "Erinacines", "Beta-glucans"],
  },
  "ganoderma lucidum": {
    properties: ["Immunomodulatory", "Adaptogenic", "Hepatoprotective", "Antitumor"],
    compounds: ["Ganoderic acids", "Beta-glucans", "Triterpenoids"],
  },
  "cordyceps militaris": {
    properties: ["Energy enhancement", "Antioxidant", "Anti-aging", "Immunomodulatory"],
    compounds: ["Cordycepin", "Adenosine", "Polysaccharides"],
  },
  "inonotus obliquus": {
    properties: ["Antioxidant", "Anti-inflammatory", "Antitumor", "Immunomodulatory"],
    compounds: ["Betulinic acid", "Melanin", "Polysaccharides"],
  },
  "lentinula edodes": {
    properties: ["Immunomodulatory", "Antiviral", "Cholesterol-lowering"],
    compounds: ["Lentinan", "Eritadenine", "Beta-glucans"],
  },
  "grifola frondosa": {
    properties: ["Immunomodulatory", "Antitumor", "Blood sugar regulation"],
    compounds: ["D-fraction", "Beta-glucans", "Polysaccharides"],
  },
}

function checkMedicinal(name: string): boolean {
  return Object.keys(MEDICINAL_SPECIES).some(
    (species) => name.toLowerCase().includes(species.split(" ")[0])
  )
}

function getMedicinalProperties(name: string): string[] {
  for (const [species, data] of Object.entries(MEDICINAL_SPECIES)) {
    if (name.toLowerCase().includes(species.split(" ")[0])) {
      return data.properties
    }
  }
  return []
}

function getActiveCompounds(name: string): string[] {
  for (const [species, data] of Object.entries(MEDICINAL_SPECIES)) {
    if (name.toLowerCase().includes(species.split(" ")[0])) {
      return data.compounds
    }
  }
  return []
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch real data from iNaturalist
  const species = await fetchFromINaturalist(id)

  if (species) {
    return NextResponse.json(species)
  }

  // Fallback for when iNaturalist doesn't have the taxon
  return NextResponse.json({
    id,
    name: `Species #${id}`,
    scientificName: `Unknown taxon ${id}`,
    family: "Unknown",
    order: "Unknown",
    class: "Unknown",
    phylum: "Unknown",
    kingdom: "Fungi",
    description: `Species data for taxon ID ${id} could not be retrieved from iNaturalist. The ID may be invalid or the service may be temporarily unavailable.`,
    habitat: "Unknown",
    distribution: "Unknown",
    edibility: "Unknown - do not consume",
    medicinal: false,
    medicinalProperties: [],
    activeCompounds: [],
    ecology: "Unknown",
    season: "Unknown",
    conservation: "Data Deficient",
    images: [],
    observations: 0,
    researchPapers: 0,
    sources: [],
    realData: false,
    error: "Species not found in iNaturalist database",
  }, { status: 404 })
}
