import { tempDB } from "@/lib/temp-db-singleton"
import { getSearchTracker } from "./search-tracker"
import { put } from "@vercel/blob"

// Define collection names
export const SPECIES_COLLECTION = "species"
export const TREE_DATA_COLLECTION = "tree_data"

// In-memory cache
// const tempDB: Record<string, any> = {} // Removed duplicate declaration

/**
 * Cache data with a specific key in a collection
 */
export async function cacheData(collection: string, key: string, data: any): Promise<void> {
  try {
    // Store in memory first
    if (!tempDB[collection]) {
      tempDB[collection] = {}
    }
    tempDB[collection][key] = data

    // Then persist to blob storage
    const blobName = `${collection}/${key}.json`
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" })
    await put(blobName, blob, { access: "public" })
  } catch (error) {
    console.error(`Error caching data for ${collection}/${key}:`, error)
    // Still keep in-memory cache even if blob storage fails
  }
}

/**
 * Get cached data by key from a collection
 */
export async function getCachedData(collection: string, key: string): Promise<any | null> {
  try {
    // Try memory cache first
    if (tempDB[collection]?.[key]) {
      return tempDB[collection][key]
    }

    // Then try blob storage
    const blobName = `${collection}/${key}.json`
    try {
      const response = await fetch(`https://public.blob.vercel-storage.com/${blobName}`)

      if (response.ok) {
        const data = await response.json()

        // Update memory cache
        if (!tempDB[collection]) {
          tempDB[collection] = {}
        }
        tempDB[collection][key] = data

        return data
      }
    } catch (blobError) {
      console.error(`Error retrieving from blob for ${collection}/${key}:`, blobError)
    }

    return null
  } catch (error) {
    console.error(`Error retrieving cached data for ${collection}/${key}:`, error)
    return null
  }
}

/**
 * Cache tree data for a specific root species
 */
export async function cacheTreeData(rootSpeciesId: string, treeData: any): Promise<void> {
  return cacheData(TREE_DATA_COLLECTION, rootSpeciesId, treeData)
}

/**
 * Get cached tree data for a specific root species
 */
export async function getCachedTreeData(rootSpeciesId: string): Promise<any | null> {
  return getCachedData(TREE_DATA_COLLECTION, rootSpeciesId)
}

/**
 * Cache species data
 */
export async function cacheSpeciesData(speciesId: string, speciesData: any): Promise<void> {
  return cacheData(SPECIES_COLLECTION, speciesId, speciesData)
}

/**
 * Get cached species data
 */
export async function getCachedSpeciesData(speciesId: string): Promise<any | null> {
  return getCachedData(SPECIES_COLLECTION, speciesId)
}

// Define cache collection names
const COLLECTIONS = {
  SPECIES: "cached_species",
  COMPOUNDS: "cached_compounds",
  SEARCH_RESULTS: "cached_search_results",
  ARTICLES: "cached_articles",
  API_STATUS: "api_status",
  TOP_SEARCHES: "top_searches",
  TREE_DATA: "cached_tree_data", // Add cache for interactive 3D tree visualization
}

// Initialize cache collections
export function initCacheCollections() {
  // Initialize collections if they don't exist
  Object.values(COLLECTIONS).forEach((collection) => {
    tempDB.initCollection(collection, [], ["id", "query", "timestamp"])
  })
}

// Initialize cache on import
initCacheCollections()

// Cache expiration times
const CACHE_TTL = {
  SPECIES: 7 * 24 * 60 * 60 * 1000, // 7 days
  COMPOUNDS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SEARCH_RESULTS: 24 * 60 * 60 * 1000, // 1 day
  ARTICLES: 3 * 24 * 60 * 60 * 1000, // 3 days
  API_STATUS: 5 * 60 * 1000, // 5 minutes
  TREE_DATA: 24 * 60 * 60 * 1000, // 1 day - TTL for the 3D tree visualization data
}

// Helper function to store data in Vercel Blob
async function storeInBlob(key: string, data: any): Promise<void> {
  try {
    const blob = await put(key, JSON.stringify(data), {
      access: "public",
    })
    console.log(`Stored data in Blob at ${blob.url}`)
  } catch (error) {
    console.error(`Failed to store data in Blob for key ${key}`, error)
  }
}

// Helper function to retrieve data from Vercel Blob
async function retrieveFromBlob(key: string): Promise<any | null> {
  try {
    const response = await fetch(`https://public.blob.vercel-storage.com/${key}`)
    if (response.ok) {
      const text = await response.text()
      return JSON.parse(text)
    }
    return null
  } catch (error) {
    console.error(`Failed to retrieve data from Blob for key ${key}`, error)
    return null
  }
}

// Cache compound data
export async function cacheCompoundData(id: string, data: any): Promise<void> {
  try {
    const existingData = await tempDB.findOne(COLLECTIONS.COMPOUNDS, { id })

    if (existingData) {
      await tempDB.updateOne(
        COLLECTIONS.COMPOUNDS,
        { id },
        {
          $set: {
            data,
            timestamp: Date.now(),
          },
        },
      )
    } else {
      await tempDB.insertOne(COLLECTIONS.COMPOUNDS, {
        id,
        data,
        timestamp: Date.now(),
      })
    }

    // Store in Blob asynchronously
    storeInBlob(`compound-${id}.json`, data)

    console.log(`Cached compound data for ID: ${id}`)
  } catch (error) {
    console.error(`Failed to cache compound data for ID: ${id}`, error)
  }
}

// Get cached compound data
export async function getCachedCompoundData(id: string): Promise<any | null> {
  try {
    // Try to retrieve from Blob first
    const blobData = await retrieveFromBlob(`compound-${id}.json`)
    if (blobData) {
      console.log(`Using Blob cached compound data for ID: ${id}`)
      return blobData
    }

    const cachedData = await tempDB.findOne(COLLECTIONS.COMPOUNDS, { id })

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL.COMPOUNDS) {
      console.log(`Using cached compound data for ID: ${id}`)
      return cachedData.data
    }

    return null
  } catch (error) {
    console.error(`Failed to get cached compound data for ID: ${id}`, error)
    return null
  }
}

// Cache search results
export async function cacheSearchResults(query: string, results: any[]): Promise<void> {
  try {
    const normalizedQuery = query.toLowerCase().trim()
    const existingData = await tempDB.findOne(COLLECTIONS.SEARCH_RESULTS, { query: normalizedQuery })

    if (existingData) {
      await tempDB.updateOne(
        COLLECTIONS.SEARCH_RESULTS,
        { query: normalizedQuery },
        {
          $set: {
            results,
            timestamp: Date.now(),
          },
        },
      )
    } else {
      await tempDB.insertOne(COLLECTIONS.SEARCH_RESULTS, {
        query: normalizedQuery,
        results,
        timestamp: Date.now(),
      })
    }

    // Store in Blob asynchronously
    storeInBlob(`search-${normalizedQuery}.json`, results)

    // Update top searches
    await updateTopSearches(normalizedQuery)

    console.log(`Cached search results for query: ${normalizedQuery}`)
  } catch (error) {
    console.error(`Failed to cache search results for query: ${query}`, error)
  }
}

// Get cached search results
export async function getCachedSearchResults(query: string): Promise<any[] | null> {
  try {
    const normalizedQuery = query.toLowerCase().trim()

    // Try to retrieve from Blob first
    const blobData = await retrieveFromBlob(`search-${normalizedQuery}.json`)
    if (blobData) {
      console.log(`Using Blob cached search results for query: ${normalizedQuery}`)
      return blobData
    }

    const cachedData = await tempDB.findOne(COLLECTIONS.SEARCH_RESULTS, { query: normalizedQuery })

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL.SEARCH_RESULTS) {
      console.log(`Using cached search results for query: ${normalizedQuery}`)
      return cachedData.results
    }

    return null
  } catch (error) {
    console.error(`Failed to get cached search results for query: ${query}`, error)
    return null
  }
}

// Cache article data
export async function cacheArticleData(id: string, data: any): Promise<void> {
  try {
    const existingData = await tempDB.findOne(COLLECTIONS.ARTICLES, { id })

    if (existingData) {
      await tempDB.updateOne(
        COLLECTIONS.ARTICLES,
        { id },
        {
          $set: {
            data,
            timestamp: Date.now(),
          },
        },
      )
    } else {
      await tempDB.insertOne(COLLECTIONS.ARTICLES, {
        id,
        data,
        timestamp: Date.now(),
      })
    }

    // Store in Blob asynchronously
    storeInBlob(`article-${id}.json`, data)

    console.log(`Cached article data for ID: ${id}`)
  } catch (error) {
    console.error(`Failed to cache article data for ID: ${id}`, error)
  }
}

// Get cached article data
export async function getCachedArticleData(id: string): Promise<any | null> {
  try {
    // Try to retrieve from Blob first
    const blobData = await retrieveFromBlob(`article-${id}.json`)
    if (blobData) {
      console.log(`Using Blob cached article data for ID: ${id}`)
      return blobData
    }

    const cachedData = await tempDB.findOne(COLLECTIONS.ARTICLES, { id })

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL.ARTICLES) {
      console.log(`Using cached article data for ID: ${id}`)
      return cachedData.data
    }

    return null
  } catch (error) {
    console.error(`Failed to get cached article data for ID: ${id}`, error)
    return null
  }
}

// Update API status
export async function updateApiStatus(apiName: string, isAvailable: boolean): Promise<void> {
  try {
    const existingStatus = await tempDB.findOne(COLLECTIONS.API_STATUS, { apiName })

    if (existingStatus) {
      await tempDB.updateOne(
        COLLECTIONS.API_STATUS,
        { apiName },
        {
          $set: {
            isAvailable,
            lastChecked: Date.now(),
            lastChanged: existingStatus.isAvailable !== isAvailable ? Date.now() : existingStatus.lastChanged,
          },
        },
      )
    } else {
      await tempDB.insertOne(COLLECTIONS.API_STATUS, {
        apiName,
        isAvailable,
        lastChecked: Date.now(),
        lastChanged: Date.now(),
      })
    }

    // If API just went down, trigger contingency
    if (!isAvailable && (!existingStatus || existingStatus.isAvailable)) {
      console.log(`API ${apiName} is down. Triggering contingency...`)
      triggerContingency(apiName)
    }
  } catch (error) {
    console.error(`Failed to update API status for ${apiName}`, error)
  }
}

// Get API status
export async function getApiStatus(apiName: string): Promise<{ isAvailable: boolean; lastChecked: number } | null> {
  try {
    const status = await tempDB.findOne(COLLECTIONS.API_STATUS, { apiName })

    if (status && Date.now() - status.lastChecked < CACHE_TTL.API_STATUS) {
      return {
        isAvailable: status.isAvailable,
        lastChecked: status.lastChecked,
      }
    }

    return null
  } catch (error) {
    console.error(`Failed to get API status for ${apiName}`, error)
    return null
  }
}

// Update top searches
async function updateTopSearches(query: string): Promise<void> {
  try {
    const normalizedQuery = query.toLowerCase().trim()
    const existingQuery = await tempDB.findOne(COLLECTIONS.TOP_SEARCHES, { query: normalizedQuery })

    if (existingQuery) {
      await tempDB.updateOne(
        COLLECTIONS.TOP_SEARCHES,
        { query: normalizedQuery },
        {
          $set: {
            count: existingQuery.count + 1,
            lastSearched: Date.now(),
          },
        },
      )
    } else {
      await tempDB.insertOne(COLLECTIONS.TOP_SEARCHES, {
        query: normalizedQuery,
        count: 1,
        lastSearched: Date.now(),
      })
    }
  } catch (error) {
    console.error(`Failed to update top searches for query: ${query}`, error)
  }
}

// Get top searches
export async function getTopSearches(limit = 20): Promise<string[]> {
  try {
    const topSearches = await tempDB.find(COLLECTIONS.TOP_SEARCHES)

    // Sort by count (descending)
    topSearches.sort((a, b) => b.count - a.count)

    return topSearches.slice(0, limit).map((item) => item.query)
  } catch (error) {
    console.error("Failed to get top searches", error)
    return []
  }
}

// Trigger contingency when API fails
async function triggerContingency(apiName: string): Promise<void> {
  try {
    console.log(`Running contingency for ${apiName}...`)

    // Get top searches to cache
    const topSearches = await getTopSearches(50)

    // For iNaturalist API failure
    if (apiName === "iNaturalist") {
      // Cache top species from our mapping
      const { SPECIES_MAPPING } = require("../services/species-mapping")

      // Cache all species in our mapping
      for (const species of Object.values(SPECIES_MAPPING)) {
        if (species.iNaturalistId) {
          // Check if we already have cached data
          const cachedData = await getCachedSpeciesData(species.iNaturalistId)

          if (!cachedData) {
            // Create fallback data from our mapping
            const fallbackData = {
              id: species.iNaturalistId,
              commonName: species.commonNames[0],
              scientificName: species.scientificName,
              description: species.description || "",
              taxonomy: species.taxonomy || {
                kingdom: "Fungi",
                phylum: "",
                class: "",
                order: "",
                family: "",
                genus: "",
                species: species.scientificName,
              },
              characteristics: species.characteristics || {},
              images: (species.defaultImages || []).map((img: any) => ({
                ...img,
                taxon_id: species.iNaturalistId,
                source: "mycosoft" as const,
              })),
              references: [
                {
                  title: "View on iNaturalist",
                  url: `https://www.inaturalist.org/taxa/${species.iNaturalistId}`,
                  type: "database" as const,
                },
              ],
              lastUpdated: new Date().toISOString(),
            }

            await cacheSpeciesData(species.iNaturalistId, fallbackData)
          }
        }
      }

      // Cache search results for top searches
      for (const query of topSearches) {
        const cachedResults = await getCachedSearchResults(query)

        if (!cachedResults) {
          // Generate fallback results from our mapping
          const fallbackResults = Object.values(SPECIES_MAPPING)
            .filter((species: any) => {
              const normalizedQuery = query.toLowerCase()
              return (
                species.commonNames.some((name: string) => name.toLowerCase().includes(normalizedQuery)) ||
                species.scientificName.toLowerCase().includes(normalizedQuery) ||
                species.searchTerms?.some((term: string) => term.toLowerCase().includes(normalizedQuery))
              )
            })
            .map((species: any) => ({
              id: species.iNaturalistId,
              name: species.scientificName,
              preferred_common_name: species.commonNames[0],
              iconic_taxon_name: "Fungi",
              rank: "species",
              is_active: true,
              matched_term: species.commonNames[0],
              default_photo: {
                medium_url: species.imageUrl || "",
                attribution: "© Mycosoft",
              },
            }))

          await cacheSearchResults(query, fallbackResults)
        }
      }
    }

    // For Elsevier API failure
    if (apiName === "Elsevier") {
      // Cache fallback article data
      const { MOCK_ARTICLES } = require("../services/elsevier")

      for (const article of MOCK_ARTICLES) {
        await cacheArticleData(article.doi, article)
      }
    }

    // For ChemSpider API failure
    if (apiName === "ChemSpider") {
      // Cache all compounds in our mapping
      const { COMPOUND_MAPPING } = require("../data/compounds")

      for (const compound of Object.values(COMPOUND_MAPPING)) {
        await cacheCompoundData(compound.id, compound)
      }
    }

    // Cache all species, compounds, and search terms from previous user searches
    const searchTracker = getSearchTracker()
    const allSearchMetrics = searchTracker.searchHistory

    // Cache all species and compound data
    const { SPECIES_MAPPING } = require("../services/species-mapping")
    for (const species of Object.values(SPECIES_MAPPING)) {
      if (species.iNaturalistId) {
        await cacheSpeciesData(species.iNaturalistId, species)
      }
    }

    const { COMPOUND_MAPPING } = require("../data/compounds")
    for (const compound of Object.values(COMPOUND_MAPPING)) {
      await cacheCompoundData(compound.id, compound)
    }

    // Cache all search terms
    for (const metric of allSearchMetrics) {
      const query = metric.query
      const cachedResults = await getCachedSearchResults(query)
      if (!cachedResults) {
        // Generate fallback results from our mapping
        const fallbackResults = Object.values(SPECIES_MAPPING)
          .filter((species: any) => {
            const normalizedQuery = query.toLowerCase()
            return (
              species.commonNames.some((name: string) => name.toLowerCase().includes(normalizedQuery)) ||
              species.scientificName.toLowerCase().includes(normalizedQuery) ||
              species.searchTerms?.some((term: string) => term.toLowerCase().includes(normalizedQuery))
            )
          })
          .map((species: any) => ({
            id: species.iNaturalistId,
            name: species.scientificName,
            preferred_common_name: species.commonNames[0],
            iconic_taxon_name: "Fungi",
            rank: "species",
            is_active: true,
            matched_term: species.commonNames[0],
            default_photo: {
              medium_url: species.imageUrl || "",
              attribution: "© Mycosoft",
            },
          }))

        await cacheSearchResults(query, fallbackResults)
      }
    }

    console.log(`Contingency completed for ${apiName}`)
  } catch (error) {
    console.error(`Failed to run contingency for ${apiName}`, error)
  }
}

// Check API availability
export async function checkApiAvailability(): Promise<void> {
  // Check iNaturalist API
  try {
    const response = await fetch(`${require("../constants").INATURALIST_API}/ping`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })

    await updateApiStatus("iNaturalist", response.ok)
  } catch (error) {
    await updateApiStatus("iNaturalist", false)
  }

  // We can't directly check Elsevier API without authentication,
  // so we'll use a simple mock check for demonstration
  await updateApiStatus("Elsevier", Math.random() > 0.1) // 90% chance of being available

  // Same for ChemSpider
  await updateApiStatus("ChemSpider", Math.random() > 0.1) // 90% chance of being available
}

// Periodic cache maintenance
export async function runCacheMaintenance(): Promise<void> {
  try {
    console.log("Running cache maintenance...")

    // Check API availability
    await checkApiAvailability()

    // Cache top searches
    const topSearches = await getTopSearches(20)
    for (const query of topSearches) {
      // Refresh search cache if needed
      const cachedResults = await getCachedSearchResults(query)
      if (!cachedResults) {
        // This will be handled by the search function when needed
        console.log(`Search cache for "${query}" will be refreshed on next search`)
      }
    }

    console.log("Cache maintenance completed")
  } catch (error) {
    console.error("Failed to run cache maintenance", error)
  }
}

// Initialize cache maintenance interval (every 15 minutes)
let maintenanceInterval: NodeJS.Timeout | null = null

export function startCacheMaintenance(): void {
  if (typeof window === "undefined" && !maintenanceInterval) {
    // Only run on server
    maintenanceInterval = setInterval(runCacheMaintenance, 15 * 60 * 1000)
    runCacheMaintenance() // Run immediately on start
    console.log("Cache maintenance scheduled")
  }
}

// Stop cache maintenance
export function stopCacheMaintenance(): void {
  if (maintenanceInterval) {
    clearInterval(maintenanceInterval)
    maintenanceInterval = null
    console.log("Cache maintenance stopped")
  }
}
