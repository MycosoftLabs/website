import { neon } from "@neondatabase/serverless"

// Initialize the SQL client with the database URL
const sql = neon(process.env.NEON_DATABASE_URL || "")

export async function getFungi() {
  try {
    const fungi = await sql`
      SELECT * FROM fungi
      ORDER BY scientific_name ASC
    `
    return fungi
  } catch (error) {
    console.error("Error fetching fungi:", error)
    return []
  }
}

export async function getFungiById(id: number) {
  try {
    const [fungi] = await sql`
      SELECT * FROM fungi
      WHERE id = ${id}
    `

    if (!fungi) return null

    // Get characteristics
    const [characteristics] = await sql`
      SELECT * FROM fungi_characteristics
      WHERE fungi_id = ${id}
    `

    // Get images
    const images = await sql`
      SELECT * FROM fungi_images
      WHERE fungi_id = ${id}
      ORDER BY is_primary DESC
    `

    // Get taxonomy
    const [taxonomy] = await sql`
      SELECT * FROM taxonomic_classification
      WHERE fungi_id = ${id}
    `

    return {
      ...fungi,
      characteristics,
      images,
      taxonomy,
    }
  } catch (error) {
    console.error(`Error fetching fungi with ID ${id}:`, error)
    return null
  }
}

export async function searchFungi(query: string) {
  try {
    const fungi = await sql`
      SELECT * FROM fungi
      WHERE 
        scientific_name ILIKE ${"%" + query + "%"} OR
        common_name ILIKE ${"%" + query + "%"} OR
        family ILIKE ${"%" + query + "%"} OR
        genus ILIKE ${"%" + query + "%"} OR
        description ILIKE ${"%" + query + "%"}
      ORDER BY scientific_name ASC
    `
    return fungi
  } catch (error) {
    console.error("Error searching fungi:", error)
    return []
  }
}

export async function filterFungi(filters: Record<string, string>) {
  try {
    let query = `
      SELECT * FROM fungi
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (filters.edibility && filters.edibility !== "any") {
      query += ` AND edibility ILIKE $${paramIndex}`
      params.push("%" + filters.edibility + "%")
      paramIndex++
    }

    if (filters.habitat && filters.habitat !== "any") {
      query += ` AND habitat ILIKE $${paramIndex}`
      params.push("%" + filters.habitat + "%")
      paramIndex++
    }

    if (filters.season && filters.season !== "any") {
      query += ` AND season ILIKE $${paramIndex}`
      params.push("%" + filters.season + "%")
      paramIndex++
    }

    if (filters.family && filters.family !== "any") {
      query += ` AND family ILIKE $${paramIndex}`
      params.push("%" + filters.family + "%")
      paramIndex++
    }

    query += ` ORDER BY scientific_name ASC`

    const fungi = await sql.query(query, params)
    return fungi.rows
  } catch (error) {
    console.error("Error filtering fungi:", error)
    return []
  }
}

export async function getUniqueValues(field: string) {
  try {
    const result = await sql`
      SELECT DISTINCT ${sql(field)} as value
      FROM fungi
      WHERE ${sql(field)} IS NOT NULL
      ORDER BY value ASC
    `
    return result.map((row) => row.value)
  } catch (error) {
    console.error(`Error getting unique values for ${field}:`, error)
    return []
  }
}
