import { INATURALIST_API } from "@/lib/constants"

export interface INaturalistPhoto {
  url: string
  attribution: string
  license_code: string
  medium_url: string
  large_url: string
  taxon_id?: string
  observation_id?: string
  photo_id?: string
}

export interface INaturalistTaxon {
  id: number
  name: string
  preferred_common_name: string
  wikipedia_url: string
  default_photo: {
    medium_url: string
    large_url: string
    attribution: string
    license_code: string
    url: string
  } | null
  ancestor_ids: number[]
  observations_count: number
  is_active: boolean
  rank: string
  rank_level: number
  matched_term?: string
  iconic_taxon_name?: string
  photos?: INaturalistPhoto[]
}

interface INaturalistTaxonomy {
  kingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  species: string
  ancestor_ids: number[]
}

// Update the getSpeciesPhotos function to prioritize high-quality images
async function fetchWithRetry(url: string, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      if (!response.ok) {
        if (response.status === 503) {
          // Retry on 503 Service Unavailable
          console.warn(`Attempt ${i + 1} failed with status ${response.status}. Retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          delay *= 2 // Exponential backoff
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      } else {
        return response
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error)
      if (i === retries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
  throw new Error("Failed to fetch after multiple retries")
}

export async function getSpeciesPhotos(taxonId: string, limit = 12): Promise<INaturalistPhoto[]> {
  try {
    // First try to get photos from the taxon endpoint
    const taxonResponse = await fetchWithRetry(`${INATURALIST_API}/taxa/${taxonId}?all_photos=true`)
    if (!taxonResponse.ok) {
      throw new Error(`iNaturalist API error: ${taxonResponse.status}`)
    }

    const taxonData = await taxonResponse.json()
    if (!taxonData.results?.[0]) {
      throw new Error("Species not found")
    }

    const taxonPhotos = taxonData.results[0]?.taxon_photos || []

    // Then get photos from observations with proper filtering
    const params = new URLSearchParams({
      taxon_id: taxonId,
      per_page: limit.toString(),
      order_by: "quality_grade",
      quality_grade: "research",
      photos: "true",
      licensed: "true",
    })

    const obsResponse = await fetchWithRetry(`${INATURALIST_API}/observations?${params.toString()}`)
    if (!obsResponse.ok) {
      throw new Error(`iNaturalist API error: ${obsResponse.status}`)
    }

    const obsData = await obsResponse.json()
    const observationPhotos = obsData.results
      .filter((obs: any) => obs.photos && obs.photos.length > 0)
      .map((obs: any) => obs.photos[0])

    // Combine and deduplicate photos with proper tagging
    const allPhotos = [...taxonPhotos, ...observationPhotos]
      .filter((photo: any) => photo && photo.url)
      .map((photo: any) => ({
        url: photo.original_url || photo.large_url || photo.url,
        medium_url: photo.medium_url || photo.url,
        large_url: photo.large_url || photo.url,
        attribution: photo.attribution || "© iNaturalist",
        license_code: photo.license_code || "CC-BY-NC",
        taxon_id: taxonId,
        observation_id: photo.observation_id,
        photo_id: photo.id,
      }))

    // Remove duplicates and validate images
    const uniquePhotos = await validateAndFilterPhotos(allPhotos)

    return uniquePhotos.slice(0, limit)
  } catch (error) {
    console.error("Error fetching species photos:", error)
    return [] // Return empty array instead of throwing
  }
}

// Add image validation function
async function validateAndFilterPhotos(photos: any[]): Promise<INaturalistPhoto[]> {
  const validatedPhotos = await Promise.all(
    photos.map(async (photo) => {
      try {
        // Check if image exists and is accessible
        const response = await fetch(photo.url, { method: "HEAD" })
        if (!response.ok) {
          console.warn(`Invalid image URL: ${photo.url}`)
          return null
        }

        // Ensure all required fields are present
        if (!photo.url || !photo.attribution || !photo.taxon_id) {
          console.warn(`Missing required fields for photo: ${JSON.stringify(photo)}`)
          return null
        }

        return photo
      } catch (error) {
        console.warn(`Error validating photo: ${error}`)
        return null
      }
    }),
  )

  return validatedPhotos.filter((photo): photo is INaturalistPhoto => photo !== null)
}

export async function getFullTaxonomy(taxonId: string): Promise<INaturalistTaxonomy> {
  try {
    const response = await fetch(`${INATURALIST_API}/taxa/${taxonId}`)
    if (!response.ok) throw new Error(`iNaturalist API error: ${response.status}`)

    const data = await response.json()
    const taxon = data.results[0]

    if (!taxon) throw new Error("Taxon not found")

    // Get complete ancestry
    const ancestryResponse = await fetch(`${INATURALIST_API}/taxa/${taxon.ancestor_ids.join(",")}`)
    if (!ancestryResponse.ok) throw new Error("Failed to fetch taxonomy")

    const ancestryData = await ancestryResponse.json()
    const ancestors = ancestryData.results

    // Build complete taxonomy
    const taxonomy: INaturalistTaxonomy = {
      kingdom: "Fungi", // Always Fungi for our purposes
      phylum: "",
      class: "",
      order: "",
      family: "",
      genus: "",
      species: taxon.name,
      ancestor_ids: taxon.ancestor_ids,
    }

    // Map ancestor ranks to our taxonomy structure
    ancestors.forEach((ancestor: any) => {
      if (ancestor.rank === "phylum") taxonomy.phylum = ancestor.name
      if (ancestor.rank === "class") taxonomy.class = ancestor.name
      if (ancestor.rank === "order") taxonomy.order = ancestor.name
      if (ancestor.rank === "family") taxonomy.family = ancestor.name
      if (ancestor.rank === "genus") taxonomy.genus = ancestor.name
    })

    return taxonomy
  } catch (error) {
    console.error("Error fetching taxonomy:", error)
    throw error
  }
}

// Get conservation status and other metadata
export async function getSpeciesMetadata(taxonId: string) {
  try {
    const response = await fetch(`${INATURALIST_API}/taxa/${taxonId}`)
    if (!response.ok) throw new Error(`iNaturalist API error: ${response.status}`)

    const data = await response.json()
    const taxon = data.results[0]

    if (!taxon) throw new Error("Taxon not found")

    return {
      conservationStatus: taxon.conservation_status?.status_name || "Not evaluated",
      observationsCount: taxon.observations_count || 0,
      wikipediaSummary: taxon.wikipedia_summary,
      interactions: taxon.interactions || [],
      commonName: taxon.preferred_common_name,
    }
  } catch (error) {
    console.error("Error fetching species metadata:", error)
    throw error
  }
}

// Add getFungiDetails function
export async function getFungiDetails(id: string) {
  try {
    // Validate ID
    if (!id || !/^\d+$/.test(id)) {
      throw new Error("Invalid species ID")
    }

    // Get basic taxonomy and metadata
    const [taxonomyData, metadataResponse, photosResponse] = await Promise.all([
      getFullTaxonomy(id),
      getSpeciesMetadata(id),
      getSpeciesPhotos(id),
    ])

    if (!taxonomyData || !metadataResponse) {
      throw new Error("Species not found")
    }

    // Combine all data
    return {
      id,
      commonName: metadataResponse.commonName || taxonomyData.species,
      scientificName: taxonomyData.species,
      description: metadataResponse.wikipediaSummary || "",
      taxonomy: taxonomyData,
      characteristics: {
        habitat: [],
        season: [],
        edibility: "Information not available",
        ecology: "Information not available",
      },
      images: photosResponse.map((photo) => ({
        url: photo.url,
        medium_url: photo.medium_url,
        large_url: photo.large_url,
        attribution: photo.attribution,
        license_code: photo.license_code,
        type: "primary" as const,
        taxon_id: photo.taxon_id,
        source_url: `https://www.inaturalist.org/photos/${photo.photo_id}`,
      })),
      references: [
        {
          title: "View on iNaturalist",
          url: `https://www.inaturalist.org/taxa/${id}`,
          type: "database" as const,
        },
      ],
      lastUpdated: new Date().toISOString(),
      interactions: metadataResponse.interactions || [],
      conservationStatus: metadataResponse.conservationStatus,
      observationsCount: metadataResponse.observationsCount,
    }
  } catch (error) {
    console.error("Error fetching fungi details:", error)
    throw error
  }
}

// Define FUNGI_TAXON_ID
const FUNGI_TAXON_ID = "47170"

// Add timeout and retry logic to searchFungi
export async function searchFungi(query: string, retries = 3): Promise<any> {
  const timeout = 5000 // 5 second timeout

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(
        `${INATURALIST_API}/taxa/autocomplete?q=${encodeURIComponent(query)}&taxon_id=${FUNGI_TAXON_ID}`,
        {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        },
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`iNaturalist API error on attempt ${attempt + 1}: ${response.status}`)
        // Do not throw error, return empty results
        return { results: [] }
      }

      const data = await response.json()
      return { results: data.results || [] }
    } catch (error) {
      console.error(`iNaturalist search failed (attempt ${attempt + 1}):`, error)
      if (attempt === retries) {
        console.error("iNaturalist search failed after multiple retries:", error)
        return { results: [] }
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // Fallback to empty results if all retries fail
  return { results: [] }
}
