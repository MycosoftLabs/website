import { getFungiDetails, searchFungi } from "./inaturalist"
import { searchMycoBank, getMycoBankDetails } from "./mycobank"
import { searchFungiDB, getFungiDBDetails } from "./fungidb"
import { getWikipediaImage } from "./wikipedia"

export interface AggregatedSpeciesData {
  id: string
  scientificName: string
  commonNames: string[]
  description: string
  taxonomy: any
  images: any[]
  sources: {
    iNaturalist?: any
    mycoBank?: any
    fungiDB?: any
    wikipedia?: any
  }
  lastUpdated: string
}

/**
 * Aggregate species data from multiple sources
 * Priority: iNaturalist > MycoBank > FungiDB > Wikipedia
 */
export async function aggregateSpeciesData(
  speciesId: string,
  scientificName?: string,
): Promise<AggregatedSpeciesData | null> {
  try {
    const sources: any = {}

    // Fetch from iNaturalist (primary source)
    try {
      const iNatData = await getFungiDetails(speciesId)
      sources.iNaturalist = iNatData
    } catch (error) {
      console.warn("iNaturalist fetch failed:", error)
    }

    // Fetch from MycoBank (nomenclature)
    if (scientificName) {
      try {
        const mycoBankData = await getMycoBankDetails(scientificName)
        sources.mycoBank = mycoBankData
      } catch (error) {
        console.warn("MycoBank fetch failed:", error)
      }
    }

    // Fetch from FungiDB (genomics)
    if (scientificName) {
      try {
        const fungiDBData = await getFungiDBDetails(scientificName)
        sources.fungiDB = fungiDBData
      } catch (error) {
        console.warn("FungiDB fetch failed:", error)
      }
    }

    // Fetch Wikipedia image
    if (scientificName) {
      try {
        const wikiImage = await getWikipediaImage(scientificName)
        sources.wikipedia = { image: wikiImage }
      } catch (error) {
        console.warn("Wikipedia fetch failed:", error)
      }
    }

    // Merge data with priority
    const aggregated: AggregatedSpeciesData = {
      id: speciesId,
      scientificName: sources.iNaturalist?.scientificName || scientificName || "",
      commonNames: sources.iNaturalist?.commonName
        ? [sources.iNaturalist.commonName]
        : sources.mycoBank?.common_names || [],
      description:
        sources.iNaturalist?.description || sources.mycoBank?.description || sources.fungiDB?.description || "",
      taxonomy: sources.iNaturalist?.taxonomy || sources.mycoBank?.taxonomy || {},
      images: sources.iNaturalist?.images || [],
      sources,
      lastUpdated: new Date().toISOString(),
    }

    // Add Wikipedia image if available and not already in images
    if (sources.wikipedia?.image && aggregated.images.length === 0) {
      aggregated.images.push({
        url: sources.wikipedia.image,
        attribution: "Wikipedia",
        license_code: "CC-BY-SA",
        type: "primary",
      })
    }

    return aggregated
  } catch (error) {
    console.error("Error aggregating species data:", error)
    return null
  }
}

/**
 * Search across all sources and aggregate results
 */
export async function aggregateSearchResults(query: string) {
  try {
    const [iNatResults, mycoBankResults, fungiDBResults] = await Promise.allSettled([
      searchFungi(query),
      searchMycoBank(query),
      searchFungiDB(query),
    ])

    return {
      query,
      results: {
        iNaturalist: iNatResults.status === "fulfilled" ? iNatResults.value.results || [] : [],
        mycoBank: mycoBankResults.status === "fulfilled" ? mycoBankResults.value : [],
        fungiDB: fungiDBResults.status === "fulfilled" ? fungiDBResults.value : [],
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error aggregating search results:", error)
    return {
      query,
      results: {
        iNaturalist: [],
        mycoBank: [],
        fungiDB: [],
      },
      error: "Failed to aggregate search results",
    }
  }
}
