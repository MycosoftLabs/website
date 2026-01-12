/**
 * MINDEX Service - Connects to MINDEX API for fungal data
 * 
 * This service bridges the website to the MINDEX database API,
 * providing species, taxonomy, and telemetry data from the central
 * Mycosoft fungal knowledge graph.
 */

import { cache } from "react"

// MINDEX API Configuration
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

// Types matching MINDEX API responses
export interface MINDEXTaxon {
  id: string // UUID
  canonical_name: string
  scientific_name?: string
  rank: string
  common_name: string | null
  authority: string | null
  description: string | null
  source: string
  family?: string
  genus?: string
  metadata: {
    inat_id?: number
    ancestry?: string
    parent_id?: number
    wikipedia_url?: string
    observations_count?: number
    // Photo fields from iNaturalist sync
    default_photo?: {
      id?: number
      url?: string
      square_url?: string
      small_url?: string
      medium_url?: string
      large_url?: string
      original_url?: string
      attribution?: string
      license_code?: string
    }
    photos?: Array<{
      id?: number
      url?: string
      square_url?: string
      small_url?: string
      medium_url?: string
      large_url?: string
      attribution?: string
    }>
    // Additional metadata fields
    habitat?: string
    edibility?: string
    is_active?: boolean
    iconic_taxon_name?: string
    endemic?: boolean
    threatened?: boolean
    native?: boolean
    introduced?: boolean
  }
  traits?: Array<{
    id: string
    trait_name: string
    value_text?: string
    value_numeric?: number
    value_unit?: string
    source?: string
  }>
  created_at: string
  updated_at: string
}

export interface MINDEXPaginatedResponse<T> {
  data: T[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface MINDEXHealthResponse {
  status: string
  db: string
  timestamp: string
  service: string
  version: string
}

// Mapped species type for website consumption
export interface Species {
  id: number // iNat ID for backward compatibility
  uuid: string // MINDEX UUID
  scientific_name: string
  common_name: string | null
  family: string
  genus?: string
  description: string | null
  image_url: string | null
  characteristics: string[]
  habitat: string | null
  edibility?: string | null
  season?: string | null
  distribution?: string | null
  featured?: boolean
  observations_count?: number
  wikipedia_url?: string | null
  rank?: string
  source?: string
  ancestry?: string
  ancestors?: Array<{
    id: number
    name: string
    rank: string
    common_name?: string | null
  }>
  // Photo metadata for attribution
  photo_attribution?: string | null
  photo_license?: string | null
}

// Helper to make authenticated requests to MINDEX
async function mindexFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${MINDEX_API_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-Key": MINDEX_API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
    // Don't cache in development
    cache: process.env.NODE_ENV === "development" ? "no-store" : "default",
  })

  if (!response.ok) {
    throw new Error(`MINDEX API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Extract the best available image URL from taxon metadata
function extractImageUrl(metadata?: MINDEXTaxon["metadata"]): string | null {
  if (!metadata) return null
  
  const photo = metadata.default_photo
  if (photo) {
    // Prefer larger images for detail pages (large > medium > original > small > square > url)
    if (photo.large_url) return photo.large_url
    if (photo.medium_url) return photo.medium_url
    if (photo.original_url) return photo.original_url
    if (photo.small_url) return photo.small_url
    if (photo.square_url) return photo.square_url
    // Generic URL - try to upgrade to medium size
    if (photo.url) {
      return photo.url.replace(/\/square\./i, "/medium.").replace(/\/thumb\./i, "/medium.")
    }
  }
  
  // Fallback to photos array
  if (metadata.photos && metadata.photos.length > 0) {
    const firstPhoto = metadata.photos[0]
    if (firstPhoto.large_url) return firstPhoto.large_url
    if (firstPhoto.medium_url) return firstPhoto.medium_url
    if (firstPhoto.url) {
      return firstPhoto.url.replace(/\/square\./i, "/medium.").replace(/\/thumb\./i, "/medium.")
    }
  }
  
  return null
}

// Extract characteristics from taxon data
function extractCharacteristics(taxon: MINDEXTaxon): string[] {
  const chars: string[] = []
  const metadata = taxon.metadata
  
  // Add rank
  if (taxon.rank) {
    chars.push(taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1))
  }
  
  // Add observation-based popularity
  if (metadata?.observations_count) {
    if (metadata.observations_count > 10000) {
      chars.push("Very Common")
    } else if (metadata.observations_count > 1000) {
      chars.push("Common")
    }
  }
  
  // Add edibility if available
  if (metadata?.edibility) {
    chars.push(metadata.edibility.charAt(0).toUpperCase() + metadata.edibility.slice(1))
  }
  
  // Add traits if available
  if (taxon.traits) {
    for (const trait of taxon.traits) {
      if (trait.trait_name === "edibility" && trait.value_text) {
        chars.push(trait.value_text.charAt(0).toUpperCase() + trait.value_text.slice(1))
      }
      if (trait.trait_name === "toxicity" && trait.value_text) {
        chars.push(trait.value_text)
      }
    }
  }
  
  // Add source
  if (taxon.source) {
    chars.push(`Source: ${taxon.source}`)
  }
  
  return chars
}

// Convert MINDEX taxon to website Species format
function taxonToSpecies(taxon: MINDEXTaxon): Species {
  const metadata = taxon.metadata
  
  return {
    id: metadata?.inat_id || parseInt(taxon.id.replace(/-/g, "").slice(0, 8), 16),
    uuid: taxon.id,
    scientific_name: taxon.scientific_name || taxon.canonical_name,
    common_name: taxon.common_name,
    family: taxon.family || extractFamily(metadata?.ancestry),
    genus: taxon.genus,
    description: taxon.description,
    image_url: extractImageUrl(metadata),
    characteristics: extractCharacteristics(taxon),
    habitat: metadata?.habitat || null,
    edibility: metadata?.edibility || null,
    rank: taxon.rank,
    source: taxon.source,
    observations_count: metadata?.observations_count,
    wikipedia_url: metadata?.wikipedia_url,
    ancestry: metadata?.ancestry,
    photo_attribution: metadata?.default_photo?.attribution || null,
    photo_license: metadata?.default_photo?.license_code || null,
  }
}

// Extract family from ancestry path
function extractFamily(ancestry?: string): string {
  if (!ancestry) return "Unknown"
  // iNat ancestry format: 48460/47170/47169/...
  // We'd need to look up the family from the ancestry chain
  return "Fungi"
}

// Check MINDEX health
export async function checkMINDEXHealth(): Promise<MINDEXHealthResponse> {
  return mindexFetch<MINDEXHealthResponse>("/api/mindex/health")
}

// Get all species with pagination
export const getAllSpeciesFromMINDEX = cache(async (
  limit: number = 25,
  offset: number = 0
): Promise<{ species: Species[]; total: number }> => {
  try {
    const response = await mindexFetch<MINDEXPaginatedResponse<MINDEXTaxon>>(
      `/api/mindex/taxa?limit=${limit}&offset=${offset}&rank=species`
    )
    
    return {
      species: response.data.map(taxonToSpecies),
      total: response.pagination.total,
    }
  } catch (error) {
    console.error("Error fetching species from MINDEX:", error)
    return { species: [], total: 0 }
  }
})

// Get species by UUID
export const getSpeciesByUUID = cache(async (uuid: string): Promise<Species | null> => {
  try {
    const taxon = await mindexFetch<MINDEXTaxon>(`/api/mindex/taxa/${uuid}`)
    return taxonToSpecies(taxon)
  } catch (error) {
    console.error(`Error fetching species ${uuid} from MINDEX:`, error)
    return null
  }
})

// Get species by iNaturalist ID (common lookup method)
export const getSpeciesByInatId = cache(async (inatId: number): Promise<Species | null> => {
  try {
    // Search for species with matching inat_id in metadata
    const response = await mindexFetch<MINDEXPaginatedResponse<MINDEXTaxon>>(
      `/api/mindex/taxa?limit=1`
    )
    
    // Find matching species (simple approach - API could add inat_id filter)
    const taxon = response.data.find(t => t.metadata?.inat_id === inatId)
    return taxon ? taxonToSpecies(taxon) : null
  } catch (error) {
    console.error(`Error fetching species by iNat ID ${inatId}:`, error)
    return null
  }
})

// Search species by name
export const searchSpeciesInMINDEX = cache(async (query: string): Promise<Species[]> => {
  try {
    // MINDEX taxa endpoint supports search via query param
    const response = await mindexFetch<MINDEXPaginatedResponse<MINDEXTaxon>>(
      `/api/mindex/taxa?search=${encodeURIComponent(query)}&limit=50`
    )
    
    return response.data.map(taxonToSpecies)
  } catch (error) {
    console.error(`Error searching species in MINDEX:`, error)
    return []
  }
})

// Get species count statistics
export const getSpeciesStats = cache(async (): Promise<{
  totalSpecies: number
  totalFamilies: number
  edibleCount: number
  medicinalCount: number
}> => {
  try {
    const response = await mindexFetch<MINDEXPaginatedResponse<MINDEXTaxon>>(
      `/api/mindex/taxa?limit=1&rank=species`
    )
    
    // Get unique families count
    const familyResponse = await mindexFetch<MINDEXPaginatedResponse<MINDEXTaxon>>(
      `/api/mindex/taxa?limit=1&rank=family`
    )
    
    return {
      totalSpecies: response.pagination.total,
      totalFamilies: familyResponse.pagination.total,
      edibleCount: 0, // Would need trait-based filtering
      medicinalCount: 0, // Would need trait-based filtering
    }
  } catch (error) {
    console.error("Error fetching species stats from MINDEX:", error)
    return {
      totalSpecies: 0,
      totalFamilies: 0,
      edibleCount: 0,
      medicinalCount: 0,
    }
  }
})

// Get featured species for homepage
export const getFeaturedSpecies = cache(async (): Promise<Species[]> => {
  try {
    // Get some popular species by observation count
    const response = await mindexFetch<MINDEXPaginatedResponse<MINDEXTaxon>>(
      `/api/mindex/taxa?limit=12&rank=species`
    )
    
    // Sort by observations and mark as featured
    const species = response.data
      .map(taxonToSpecies)
      .sort((a, b) => (b.observations_count || 0) - (a.observations_count || 0))
      .slice(0, 8)
      .map(s => ({ ...s, featured: true }))
    
    return species
  } catch (error) {
    console.error("Error fetching featured species from MINDEX:", error)
    return []
  }
})

// Get species by scientific name
export const getSpeciesByName = cache(async (scientificName: string): Promise<Species | null> => {
  try {
    const response = await mindexFetch<MINDEXPaginatedResponse<MINDEXTaxon>>(
      `/api/mindex/taxa?search=${encodeURIComponent(scientificName)}&limit=1`
    )
    
    if (response.data.length === 0) return null
    
    return taxonToSpecies(response.data[0])
  } catch (error) {
    console.error(`Error fetching species by name "${scientificName}":`, error)
    return null
  }
})

// Check if MINDEX is available
export async function isMINDEXAvailable(): Promise<boolean> {
  try {
    const health = await checkMINDEXHealth()
    return health.status === "ok" && health.db === "ok"
  } catch {
    return false
  }
}
