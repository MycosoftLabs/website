import { neon } from "@neondatabase/serverless"
import { cache } from "react"
import { getSpeciesImage } from "./image-service"

// Define types for the ancestry data
export type FungalAncestry = {
  id: number
  species_id: number
  parent_id: number | null
  relationship_type: string
  divergence_time_mya: number
  confidence_level: number
  evidence_type: string
  notes: string | null
  tree_position: {
    x: number
    y: number
    z: number
  }
  created_at: string
  updated_at: string
}

export type Species = {
  id: number
  scientific_name: string
  common_name: string | null
  family: string
  description: string | null
  image_url: string | null
  characteristics: string[]
  habitat: string | null
}

// Create a SQL client using the Neon connection
const sql = neon(process.env.NEON_DATABASE_URL!)

// Get all ancestry records
export const getAllAncestryRecords = cache(async (): Promise<FungalAncestry[]> => {
  try {
    const result = await sql`
      SELECT * FROM fungal_ancestry
      ORDER BY id ASC
    `
    return result as FungalAncestry[]
  } catch (error) {
    console.error("Error fetching ancestry records:", error)
    return []
  }
})

// Get a specific ancestry record by ID
export const getAncestryById = cache(async (id: number): Promise<FungalAncestry | null> => {
  try {
    const result = await sql`
      SELECT * FROM fungal_ancestry
      WHERE id = ${id}
    `
    return result.length > 0 ? (result[0] as FungalAncestry) : null
  } catch (error) {
    console.error(`Error fetching ancestry record ${id}:`, error)
    return null
  }
})

// Get all species with their ancestry information
export const getAllSpecies = cache(async (): Promise<Species[]> => {
  try {
    const result = await sql`
      SELECT 
        id, 
        scientific_name, 
        common_name, 
        family, 
        description, 
        image_url, 
        characteristics,
        '' as habitat
      FROM species
      ORDER BY scientific_name ASC
    `

    // Process images for species that need them
    const species = result as Species[]
    for (let i = 0; i < species.length; i++) {
      if (!species[i].image_url || species[i].image_url.includes("placeholder")) {
        try {
          const imageUrl = await getSpeciesImage(species[i])
          if (imageUrl && imageUrl !== species[i].image_url) {
            // Update the database with the new image URL
            await sql`
              UPDATE species 
              SET image_url = ${imageUrl}
              WHERE id = ${species[i].id}
            `
            species[i].image_url = imageUrl
          }
        } catch (error) {
          console.error(`Error processing image for ${species[i].scientific_name}:`, error)
        }
      }
    }

    return species
  } catch (error) {
    console.error("Error fetching species:", error)
    return []
  }
})

// Get species by ID
export const getSpeciesById = cache(async (id: number): Promise<Species | null> => {
  try {
    const result = await sql`
      SELECT 
        id, 
        scientific_name, 
        common_name, 
        family, 
        description, 
        image_url, 
        characteristics,
        '' as habitat
      FROM species
      WHERE id = ${id}
    `

    if (result.length === 0) {
      return null
    }

    const species = result[0] as Species

    // Check if we need to fetch an image
    if (!species.image_url || species.image_url.includes("placeholder")) {
      try {
        const imageUrl = await getSpeciesImage(species)
        if (imageUrl && imageUrl !== species.image_url) {
          // Update the database with the new image URL
          await sql`
            UPDATE species 
            SET image_url = ${imageUrl}
            WHERE id = ${species.id}
          `
          species.image_url = imageUrl
        }
      } catch (error) {
        console.error(`Error processing image for ${species.scientific_name}:`, error)
      }
    }

    return species
  } catch (error) {
    console.error(`Error fetching species ${id}:`, error)
    return null
  }
})

// Get children of a species (direct descendants)
export const getSpeciesChildren = cache(async (speciesId: number): Promise<FungalAncestry[]> => {
  try {
    const result = await sql`
      SELECT * FROM fungal_ancestry
      WHERE parent_id = ${speciesId}
    `
    return result as FungalAncestry[]
  } catch (error) {
    console.error(`Error fetching children for species ${speciesId}:`, error)
    return []
  }
})

// Get the ancestry tree starting from a root species
export const getAncestryTree = cache(async (rootSpeciesId = 1): Promise<FungalAncestry[]> => {
  try {
    // This is a simplified implementation
    // In a real-world scenario, you might want to use a recursive CTE in PostgreSQL
    const result = await sql`
      WITH RECURSIVE ancestry_tree AS (
        SELECT * FROM fungal_ancestry WHERE species_id = ${rootSpeciesId}
        UNION ALL
        SELECT fa.* FROM fungal_ancestry fa
        JOIN ancestry_tree at ON fa.parent_id = at.species_id
      )
      SELECT * FROM ancestry_tree
    `
    return result as FungalAncestry[]
  } catch (error) {
    console.error(`Error fetching ancestry tree for species ${rootSpeciesId}:`, error)
    return []
  }
})

// Create a new ancestry record
export async function createAncestryRecord(
  data: Omit<FungalAncestry, "id" | "created_at" | "updated_at">,
): Promise<FungalAncestry | null> {
  try {
    const result = await sql`
      INSERT INTO fungal_ancestry (
        species_id, parent_id, relationship_type, divergence_time_mya,
        confidence_level, evidence_type, notes, tree_position
      ) VALUES (
        ${data.species_id}, ${data.parent_id}, ${data.relationship_type}, ${data.divergence_time_mya},
        ${data.confidence_level}, ${data.evidence_type}, ${data.notes}, ${data.tree_position}
      )
      RETURNING *
    `
    return result.length > 0 ? (result[0] as FungalAncestry) : null
  } catch (error) {
    console.error("Error creating ancestry record:", error)
    return null
  }
}

// Update an ancestry record
export async function updateAncestryRecord(id: number, data: Partial<FungalAncestry>): Promise<FungalAncestry | null> {
  try {
    // Create dynamic SET clause based on provided data
    const updates: string[] = []
    const values: any[] = []

    Object.entries(data).forEach(([key, value], index) => {
      if (key !== "id" && key !== "created_at" && key !== "updated_at") {
        updates.push(`${key} = ${index + 1}`)
        values.push(value)
      }
    })

    values.push(id) // Add ID as the last parameter

    if (updates.length === 0) return null

    const query = `
      UPDATE fungal_ancestry
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = ${values.length}
      RETURNING *
    `

    const result = await sql.query(query, values)
    return result.rows.length > 0 ? (result.rows[0] as FungalAncestry) : null
  } catch (error) {
    console.error(`Error updating ancestry record ${id}:`, error)
    return null
  }
}

// Delete an ancestry record
export async function deleteAncestryRecord(id: number): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM fungal_ancestry
      WHERE id = ${id}
    `
    return result.count > 0
  } catch (error) {
    console.error(`Error deleting ancestry record ${id}:`, error)
    return false
  }
}

// Search species by name, family, or characteristics
export const searchSpecies = cache(async (query: string): Promise<Species[]> => {
  try {
    const lowerQuery = `%${query.toLowerCase()}%`
    const result = await sql`
      SELECT 
        id, 
        scientific_name, 
        common_name, 
        family, 
        description, 
        image_url, 
        characteristics,
        '' as habitat
      FROM species
      WHERE 
        LOWER(scientific_name) LIKE ${lowerQuery} OR
        LOWER(COALESCE(common_name, '')) LIKE ${lowerQuery} OR
        LOWER(COALESCE(family, '')) LIKE ${lowerQuery}
      ORDER BY scientific_name ASC
    `
    return result as Species[]
  } catch (error) {
    console.error(`Error searching species with query "${query}":`, error)
    return []
  }
})

// Filter species by characteristic
export const filterSpeciesByCharacteristic = cache(async (characteristic: string): Promise<Species[]> => {
  try {
    const lowerCharacteristic = characteristic.toLowerCase()
    const result = await sql`
      SELECT 
        id, 
        scientific_name, 
        common_name, 
        family, 
        description, 
        image_url, 
        characteristics,
        '' as habitat
      FROM species
      WHERE 
        EXISTS (
          SELECT 1 
          FROM unnest(characteristics) as char 
          WHERE LOWER(char) = ${lowerCharacteristic}
        )
      ORDER BY scientific_name ASC
    `
    return result as Species[]
  } catch (error) {
    console.error(`Error filtering species by characteristic "${characteristic}":`, error)
    return []
  }
})
