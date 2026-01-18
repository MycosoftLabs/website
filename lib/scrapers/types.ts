/**
 * Scraper Service Types
 * 
 * Unified type definitions for the Mycosoft scraper microservice architecture.
 * This pattern enables ingestion of data from sources without direct APIs.
 */

export interface ScraperConfig {
  id: string
  name: string
  description: string
  sourceUrl: string
  enabled: boolean
  intervalMs: number       // How often to scrape (e.g., 300000 = 5 minutes)
  retryAttempts: number
  retryDelayMs: number
  timeout: number
  category: ScraperCategory
}

export type ScraperCategory = 
  | "space_weather"
  | "fungi"
  | "flora"
  | "fauna"
  | "weather"
  | "vessels"
  | "aircraft"
  | "satellites"
  | "earth_imagery"
  | "events"
  | "pollution"

export interface ScrapedData<T = unknown> {
  id: string
  scraperId: string
  sourceUrl: string
  timestamp: string
  expiresAt: string
  data: T
  metadata: ScraperMetadata
}

export interface ScraperMetadata {
  scrapeDurationMs: number
  parseStatus: "success" | "partial" | "failed"
  errorMessage?: string
  itemCount: number
  version: string
}

export interface ScraperResult<T = unknown> {
  success: boolean
  data?: ScrapedData<T>
  error?: string
  nextScrapeAt?: string
}

// Space Weather specific types
export interface SpaceWeatherScrapedData {
  solarActivity: {
    flareClass: string
    flareRegion: string
    flareTime: string
    xrayFlux: string
  }
  solarWind: {
    speed: string
    density: string
    temperature: string
  }
  geomagneticActivity: {
    kpIndex: string
    kpForecast: string[]
    stormLevel: string
  }
  coronalHoles: {
    count: number
    positions: string[]
  }
  cme: {
    active: boolean
    arrivalTime?: string
    speed?: string
  }
  auroraForecast: {
    visibility: string
    regions: string[]
    ovalImage?: string
  }
  sunImages: {
    sdo_304?: string
    sdo_171?: string
    sdo_193?: string
    lasco_c2?: string
    lasco_c3?: string
  }
}

// Fungi observation types
export interface FungalScrapedData {
  observations: Array<{
    id: string
    species: string
    commonName?: string
    latitude: number
    longitude: number
    imageUrl?: string
    observedAt: string
    source: string
    habitat?: string
    substrate?: string
  }>
}

// Earth imagery types
export interface EarthImageryData {
  satellite: string
  capturedAt: string
  imageUrl: string
  thumbnailUrl?: string
  region?: string
  type: "visible" | "infrared" | "water_vapor" | "composite"
}

// Scraper registry entry
export interface ScraperRegistryEntry {
  config: ScraperConfig
  lastRun?: string
  lastSuccess?: string
  consecutiveFailures: number
  status: "idle" | "running" | "error" | "disabled"
}
