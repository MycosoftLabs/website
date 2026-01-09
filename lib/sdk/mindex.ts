/**
 * MINDEX SDK
 * 
 * TypeScript SDK for interacting with MINDEX API
 * Provides type-safe access to fungal intelligence database
 */

const MINDEX_BASE_URL = process.env.NEXT_PUBLIC_MINDEX_API_URL || "/api/natureos/mindex"

export interface MINDEXTaxon {
  id: number
  canonical_name: string
  common_name?: string
  rank: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  observations_count?: number
  external_ids?: Record<string, string>
}

export interface MINDEXObservation {
  id: number
  taxon?: {
    canonical_name: string
    common_name?: string
    rank: string
  }
  observed_at: string
  location?: {
    type: string
    coordinates: [number, number]
  }
  photos?: string[]
  observer?: string
  source: string
  external_id?: string
}

export interface MINDEXStats {
  total_taxa: number
  total_observations: number
  taxa_by_source: Record<string, number>
  observations_by_source: Record<string, number>
  observations_with_location: number
  observations_with_images: number
  taxa_with_observations: number
  observation_date_range?: {
    earliest: string
    latest: string
  }
}

export interface SearchOptions {
  query: string
  type?: "all" | "taxa" | "observations" | "compounds"
  limit?: number
}

export interface SearchResults {
  taxa: MINDEXTaxon[]
  observations: MINDEXObservation[]
  compounds: any[]
  total: number
}

/**
 * MINDEX SDK Client
 */
export class MINDEXClient {
  private baseURL: string

  constructor(baseURL: string = MINDEX_BASE_URL) {
    this.baseURL = baseURL
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<MINDEXStats> {
    const response = await fetch(`${this.baseURL}/stats`)
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * Search across MINDEX database
   */
  async search(options: SearchOptions): Promise<SearchResults> {
    const params = new URLSearchParams({
      q: options.query,
      type: options.type || "all",
      limit: String(options.limit || 50),
    })

    const response = await fetch(`${this.baseURL}/search?${params}`)
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.results
  }

  /**
   * Get all taxa (with optional filters)
   */
  async getTaxa(filters?: {
    search?: string
    rank?: string
    family?: string
    limit?: number
    offset?: number
  }): Promise<{ taxa: MINDEXTaxon[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.search) params.set("search", filters.search)
    if (filters?.rank) params.set("rank", filters.rank)
    if (filters?.family) params.set("family", filters.family)
    if (filters?.limit) params.set("limit", String(filters.limit))
    if (filters?.offset) params.set("offset", String(filters.offset))

    const response = await fetch(`${this.baseURL}/taxa?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch taxa: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * Get specific taxon by ID
   */
  async getTaxon(id: number): Promise<MINDEXTaxon> {
    const response = await fetch(`${this.baseURL}/taxa/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch taxon: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * Get observations (with optional filters)
   */
  async getObservations(filters?: {
    taxonId?: number
    hasLocation?: boolean
    hasPhotos?: boolean
    limit?: number
    offset?: number
  }): Promise<{ observations: MINDEXObservation[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.taxonId) params.set("taxon_id", String(filters.taxonId))
    if (filters?.hasLocation) params.set("has_location", "true")
    if (filters?.hasPhotos) params.set("has_photos", "true")
    if (filters?.limit) params.set("limit", String(filters.limit))
    if (filters?.offset) params.set("offset", String(filters.offset))

    const response = await fetch(`${this.baseURL}/observations?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch observations: ${response.statusText}`)
    }
    
    const data = await response.json()
    return {
      observations: data.observations || [],
      total: data.total || data.observations?.length || 0,
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    const response = await fetch(`${this.baseURL}/health`)
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * Get compounds (when available)
   */
  async getCompounds(filters?: {
    search?: string
    source?: string
    limit?: number
  }): Promise<any[]> {
    const params = new URLSearchParams()
    if (filters?.search) params.set("search", filters.search)
    if (filters?.limit) params.set("limit", String(filters.limit))

    const response = await fetch(`${this.baseURL}/compounds?${params}`)
    if (!response.ok) return []
    
    const data = await response.json()
    return data.compounds || []
  }
}

/**
 * Create a MINDEX client instance
 */
export function createMINDEXClient(baseURL?: string): MINDEXClient {
  return new MINDEXClient(baseURL)
}

/**
 * Default export for convenient usage
 */
const mindex = createMINDEXClient()
export default mindex






























