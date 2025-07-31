import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Initialize the SQL client with the database URL
const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "")

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      // Get a single species by ID
      const species = await sql`
        SELECT * FROM species WHERE id = ${Number.parseInt(id, 10)}
      `

      if (species.length === 0) {
        return NextResponse.json({ error: "Species not found" }, { status: 404 })
      }

      return NextResponse.json(species[0])
    }

    // For listing/searching species
    const search = searchParams.get("search") || ""
    const sort = searchParams.get("sort") || "scientific_name"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "9", 10)
    const offset = (page - 1) * limit

    // Count total matching species
    const searchPattern = `%${search}%`
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM species
      WHERE 
        scientific_name ILIKE ${searchPattern} OR
        common_name ILIKE ${searchPattern} OR
        family ILIKE ${searchPattern} OR
        description ILIKE ${searchPattern}
    `

    const total = Number.parseInt(countResult[0].total, 10)

    // Get species with pagination
    let sortField = "scientific_name"
    if (sort === "common_name") sortField = "common_name"
    else if (sort === "family") sortField = "family"

    // Using tagged template syntax for dynamic sorting
    let species
    if (sortField === "scientific_name") {
      species = await sql`
        SELECT *
        FROM species
        WHERE 
          scientific_name ILIKE ${searchPattern} OR
          common_name ILIKE ${searchPattern} OR
          family ILIKE ${searchPattern} OR
          description ILIKE ${searchPattern}
        ORDER BY scientific_name ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (sortField === "common_name") {
      species = await sql`
        SELECT *
        FROM species
        WHERE 
          scientific_name ILIKE ${searchPattern} OR
          common_name ILIKE ${searchPattern} OR
          family ILIKE ${searchPattern} OR
          description ILIKE ${searchPattern}
        ORDER BY common_name ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      species = await sql`
        SELECT *
        FROM species
        WHERE 
          scientific_name ILIKE ${searchPattern} OR
          common_name ILIKE ${searchPattern} OR
          family ILIKE ${searchPattern} OR
          description ILIKE ${searchPattern}
        ORDER BY family ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    return NextResponse.json({
      species,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error fetching species:", error)
    return NextResponse.json({ error: "Failed to fetch species data" }, { status: 500 })
  }
}
