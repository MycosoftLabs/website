import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {

    // In a real application, we would query the database here
    let treeData

    try {
      if (!process.env.NEON_DATABASE_URL) {
        return NextResponse.json(
          { error: "NEON_DATABASE_URL is not configured", code: "CONFIG_MISSING" },
          { status: 503 },
        )
      }

      // Try to get data from database
      console.log("Attempting to connect to the database with Neon...")
      const sql = neon(process.env.NEON_DATABASE_URL!) // Ensure correct import and initialization
      console.log("Neon client initialized.")

      // Check if the table exists before querying
      const tableCheckResult = await sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = 'phylogeny_trees'
        )
      `

      if (!tableCheckResult[0].exists) {
        return NextResponse.json(
          { error: "Table phylogeny_trees does not exist", code: "NOT_CONFIGURED" },
          { status: 501 },
        )
      }

      const result = await sql`
        SELECT * FROM phylogeny_trees WHERE root_species_id = ${id} LIMIT 1
      `

      if (result.rows.length > 0) {
        treeData = result.rows[0].tree_data
        console.log("Successfully fetched tree data from the database.")
      } else {
        return NextResponse.json({ error: "Tree not found", code: "NOT_FOUND", id }, { status: 404 })
      }
    } catch (dbError: any) {
      console.error("Database error:", dbError)
      console.error("Database error stack:", dbError.stack)
      return NextResponse.json(
        { error: "Database error", code: "DB_ERROR", details: dbError?.message || String(dbError) },
        { status: 500 },
      )
    }

    return NextResponse.json(treeData)
  } catch (error: any) {
    console.error("Error fetching tree data:", error)
    console.error("Error fetching tree data stack:", error.stack)
    return NextResponse.json({ error: "Failed to fetch tree data" }, { status: 500 })
  }
}
