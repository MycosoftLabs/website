/**
 * Contingency data sources for when primary APIs fail
 * This provides fallback data to ensure search results are always available
 */

import { COMPOUND_MAPPING } from "@/lib/data/compounds"
import { SPECIES_MAPPING } from "@/lib/services/species-mapping"
import type { SearchResult, FungiSpecies, Compound } from "@/types/search"

// Fallback data sources
const DATA_SOURCES = {
  // External APIs that can be used as fallbacks
  apis: {
    fungi: ["https://api.inaturalist.org/v1", "https://api.gbif.org/v1", "https://api.mushroomobserver.org"],
    compounds: [
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug",
      "https://api.chemspider.com",
      "https://api.openmolecules.org",
    ],
    research: ["https://api.crossref.org", "https://api.semanticscholar.org", "https://api.unpaywall.org"],
  },

  // Static data repositories
  repositories: {
    fungi: [
      "https://github.com/mycosoftorg/fungi-data",
      "https://mycosoftorg.github.io/species-database/",
      "https://data.mycosoft.org/species/",
    ],
    compounds: [
      "https://github.com/mycosoftorg/compound-data",
      "https://mycosoftorg.github.io/compound-database/",
      "https://data.mycosoft.org/compounds/",
    ],
  },

  // Web scraping targets (only public data)
  webSources: {
    fungi: [
      "https://www.inaturalist.org/taxa/",
      "https://www.mycobank.org/page/Simple%20names/",
      "https://mushroomobserver.org/name/show/",
    ],
    compounds: [
      "https://pubchem.ncbi.nlm.nih.gov/compound/",
      "https://www.chemspider.com/Chemical-Structure.",
      "https://en.wikipedia.org/wiki/",
    ],
  },
}

/**
 * Get fallback search results when primary search fails
 */
export async function getFallbackSearchResults(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const normalizedQuery = query.toLowerCase()

  // Try local data first
  try {
    // Search species mapping
    const speciesResults = Object.values(SPECIES_MAPPING)
      .filter(
        (species) =>
          species.commonNames.some((name) => name.toLowerCase().includes(normalizedQuery)) ||
          species.scientificName.toLowerCase().includes(normalizedQuery) ||
          species.searchTerms?.some((term) => term.toLowerCase().includes(normalizedQuery)),
      )
      .map((species) => ({
        id: species.iNaturalistId,
        title: species.commonNames[0],
        description: species.description || `A species of fungi (${species.scientificName})`,
        type: "fungi" as const,
        url: `/species/${species.iNaturalistId}`,
        source: "Mycosoft" as const,
      }))

    results.push(...speciesResults)

    // Search compound mapping
    const compoundResults = Object.values(COMPOUND_MAPPING)
      .filter(
        (compound) =>
          compound.name.toLowerCase().includes(normalizedQuery) ||
          compound.description.toLowerCase().includes(normalizedQuery) ||
          compound.biologicalActivity.some((activity) => activity.toLowerCase().includes(normalizedQuery)),
      )
      .map((compound) => ({
        id: compound.id,
        title: compound.name,
        description: compound.description,
        type: "compound" as const,
        url: `/compounds/${compound.id}`,
        source: "Mycosoft" as const,
        metadata: {
          formula: compound.formula,
          molecularWeight: compound.molecularWeight,
          sourceSpecies: compound.sourceSpecies,
        },
      }))

    results.push(...compoundResults)
  } catch (error) {
    console.error("Error getting fallback results from local data:", error)
  }

  // If no results, try to generate some based on common search patterns
  if (results.length === 0) {
    // Add some generic results based on query patterns
    if (normalizedQuery.includes("medicinal") || normalizedQuery.includes("health")) {
      results.push({
        id: "generic-medicinal",
        title: "Medicinal Mushrooms",
        description: "Explore fungi with medicinal properties and health benefits",
        type: "fungi" as const,
        url: "/categories/medicinal",
        source: "Mycosoft" as const,
      })
    }

    if (normalizedQuery.includes("compound") || normalizedQuery.includes("chemical")) {
      results.push({
        id: "generic-compounds",
        title: "Fungal Compounds Database",
        description: "Browse our comprehensive database of bioactive fungal compounds",
        type: "compound" as const,
        url: "/compounds",
        source: "Mycosoft" as const,
      })
    }

    if (
      normalizedQuery.includes("research") ||
      normalizedQuery.includes("study") ||
      normalizedQuery.includes("paper")
    ) {
      results.push({
        id: "generic-research",
        title: "Mycology Research Papers",
        description: "Access the latest research in mycology and fungal science",
        type: "paper" as const,
        url: "/research",
        source: "Elsevier" as const,
      })
    }
  }

  return results
}

/**
 * Get fallback species data when primary API fails
 */
export async function getFallbackSpeciesData(id: string): Promise<FungiSpecies | null> {
  // Check if we have this species in our mapping
  const knownSpecies = Object.values(SPECIES_MAPPING).find((species) => species.iNaturalistId === id)

  if (knownSpecies) {
    return {
      id: knownSpecies.iNaturalistId,
      commonName: knownSpecies.commonNames[0],
      scientificName: knownSpecies.scientificName,
      description: knownSpecies.description || "",
      taxonomy: knownSpecies.taxonomy || {
        kingdom: "Fungi",
        phylum: "",
        class: "",
        order: "",
        family: "",
        genus: "",
        species: knownSpecies.scientificName,
      },
      characteristics: knownSpecies.characteristics || {},
      images: [],
      references: [],
      lastUpdated: new Date().toISOString(),
      iNaturalistId: knownSpecies.iNaturalistId,
    }
  }

  return null
}

/**
 * Get fallback compound data when primary API fails
 */
export async function getFallbackCompoundData(id: string): Promise<Compound | null> {
  // Check if we have this compound in our mapping
  const knownCompound = Object.values(COMPOUND_MAPPING).find((compound) => compound.id === id)

  if (knownCompound) {
    return {
      id: knownCompound.id,
      name: knownCompound.name,
      formula: knownCompound.formula,
      molecularWeight: knownCompound.molecularWeight,
      chemicalClass: knownCompound.chemicalClass,
      description: knownCompound.description,
      biologicalActivity: knownCompound.biologicalActivity,
      foundIn: knownCompound.sourceSpecies.map((species) => {
        const speciesData = Object.values(SPECIES_MAPPING).find((s) => s.scientificName === species)
        return {
          id: speciesData?.iNaturalistId || "unknown",
          scientificName: species,
          commonName: speciesData?.commonNames[0] || species,
        }
      }),
      safety: {
        classification: "Research compound",
        warnings: ["Limited human studies available"],
      },
    }
  }

  return null
}

/**
 * Check if external APIs are available
 */
export async function checkApiAvailability(): Promise<Record<string, boolean>> {
  const availability: Record<string, boolean> = {}

  // Check iNaturalist API
  try {
    const response = await fetch("https://api.inaturalist.org/v1/ping", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })
    availability.iNaturalist = response.ok
  } catch (error) {
    availability.iNaturalist = false
  }

  // Check PubChem API
  try {
    const response = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/aspirin/cids/JSON", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    })
    availability.pubchem = response.ok
  } catch (error) {
    availability.pubchem = false
  }

  return availability
}
