/**
 * CelesTrak TLE Scraper
 * 
 * Fetches and caches Two-Line Element (TLE) data from CelesTrak for satellite tracking.
 * This scraper runs periodically to keep TLE data fresh and avoid timeout issues
 * when requesting data on-demand.
 */

import { BaseScraper, type ScraperResult, type ScraperConfig } from "./base-scraper"
import { getCache } from "./cache"

interface TLEData {
  OBJECT_NAME: string
  OBJECT_ID: string
  NORAD_CAT_ID: number
  EPOCH: string
  MEAN_MOTION: number
  ECCENTRICITY: number
  INCLINATION: number
  RA_OF_ASC_NODE: number
  ARG_OF_PERICENTER: number
  MEAN_ANOMALY: number
  CLASSIFICATION_TYPE: string
  ELEMENT_SET_NO: number
  REV_AT_EPOCH: number
  BSTAR: number
  MEAN_MOTION_DOT: number
  MEAN_MOTION_DDOT: number
}

interface CelesTrakCategory {
  group: string
  name: string
  description: string
}

const CELESTRAK_CATEGORIES: CelesTrakCategory[] = [
  { group: "stations", name: "Space Stations", description: "ISS, Tiangong, etc." },
  { group: "starlink", name: "Starlink", description: "SpaceX Starlink constellation" },
  { group: "oneweb", name: "OneWeb", description: "OneWeb constellation" },
  { group: "weather", name: "Weather", description: "Weather satellites" },
  { group: "gnss", name: "GNSS", description: "GPS, GLONASS, Galileo, BeiDou" },
  { group: "active", name: "Active", description: "All active satellites" },
]

export class CelesTrakScraper extends BaseScraper {
  private tleCache: Map<string, TLEData[]> = new Map()
  private lastFetch: Map<string, number> = new Map()

  constructor() {
    super({
      name: "celestrak-tle",
      category: "satellites",
      interval: 3600000, // 1 hour - TLE data doesn't change frequently
      retryDelay: 60000,
      maxRetries: 3,
      timeout: 30000, // 30 second timeout
    })
  }

  async scrape(): Promise<ScraperResult> {
    const results: ScraperResult = {
      success: true,
      data: {},
      metadata: {
        categories: [],
        totalSatellites: 0,
        timestamp: new Date().toISOString(),
      },
    }

    const cache = getCache()
    let totalSatellites = 0

    // Fetch each category
    for (const category of CELESTRAK_CATEGORIES) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 25000)

        const response = await fetch(
          `https://celestrak.org/NORAD/elements/gp.php?GROUP=${category.group}&FORMAT=JSON`,
          {
            signal: controller.signal,
            headers: {
              "Accept": "application/json",
              "User-Agent": "NatureOS/1.0 (contact@mycosoft.io)",
            },
          }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn(`[CelesTrak] Failed to fetch ${category.group}: ${response.status}`)
          continue
        }

        const tleData: TLEData[] = await response.json()
        
        // Store in internal cache
        this.tleCache.set(category.group, tleData)
        this.lastFetch.set(category.group, Date.now())

        // Store in shared cache with long TTL
        cache.set(`celestrak_${category.group}`, tleData, 7200000) // 2 hour TTL

        results.data[category.group] = {
          name: category.name,
          description: category.description,
          count: tleData.length,
          fetchedAt: new Date().toISOString(),
        }

        totalSatellites += tleData.length
        results.metadata.categories.push(category.group)

        console.log(`[CelesTrak] Fetched ${tleData.length} satellites for ${category.group}`)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.warn(`[CelesTrak] Timeout fetching ${category.group}`)
        } else {
          console.error(`[CelesTrak] Error fetching ${category.group}:`, error)
        }
        results.data[category.group] = { error: "Failed to fetch", cached: this.tleCache.has(category.group) }
      }
    }

    results.metadata.totalSatellites = totalSatellites
    results.success = totalSatellites > 0

    return results
  }

  /**
   * Get cached TLE data for a category
   */
  getTLEData(group: string): TLEData[] | null {
    // Try internal cache first
    if (this.tleCache.has(group)) {
      return this.tleCache.get(group)!
    }

    // Try shared cache
    const cache = getCache()
    const cached = cache.get<TLEData[]>(`celestrak_${group}`)
    if (cached) {
      return cached
    }

    return null
  }

  /**
   * Get all cached TLE data
   */
  getAllTLEData(): Map<string, TLEData[]> {
    return this.tleCache
  }

  /**
   * Get cache status
   */
  getCacheStatus(): Record<string, { count: number; age: number; fresh: boolean }> {
    const status: Record<string, { count: number; age: number; fresh: boolean }> = {}
    const maxAge = 3600000 // 1 hour

    for (const category of CELESTRAK_CATEGORIES) {
      const data = this.tleCache.get(category.group)
      const lastFetch = this.lastFetch.get(category.group)
      const age = lastFetch ? Date.now() - lastFetch : Infinity

      status[category.group] = {
        count: data?.length || 0,
        age: Math.round(age / 1000),
        fresh: age < maxAge,
      }
    }

    return status
  }
}

// Singleton instance
let scraperInstance: CelesTrakScraper | null = null

export function getCelesTrakScraper(): CelesTrakScraper {
  if (!scraperInstance) {
    scraperInstance = new CelesTrakScraper()
  }
  return scraperInstance
}

/**
 * Get cached TLE data without triggering scrape
 */
export function getCachedTLE(group: string): TLEData[] | null {
  return getCelesTrakScraper().getTLEData(group)
}
