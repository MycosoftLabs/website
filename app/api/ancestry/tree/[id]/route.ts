import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Mock tree data structure for different root species
const mockTreeData: Record<string, any> = {
  "1": {
    id: "root",
    name: "Agaricales",
    children: [
      {
        id: "1",
        name: "Agaricaceae",
        children: [
          { id: "1.1", name: "Agaricus bisporus", distance: 0.05 },
          { id: "1.2", name: "Lepiota cristata", distance: 0.07 },
        ],
        distance: 0.1,
      },
      {
        id: "2",
        name: "Amanitaceae",
        children: [
          { id: "2.1", name: "Amanita muscaria", distance: 0.06 },
          { id: "2.2", name: "Amanita phalloides", distance: 0.08 },
        ],
        distance: 0.15,
      },
      {
        id: "3",
        name: "Psathyrellaceae",
        children: [
          { id: "3.1", name: "Coprinopsis cinerea", distance: 0.09 },
          { id: "3.2", name: "Psathyrella candolleana", distance: 0.11 },
        ],
        distance: 0.2,
      },
    ],
  },
  "2": {
    id: "root",
    name: "Boletales",
    children: [
      {
        id: "1",
        name: "Boletaceae",
        children: [
          { id: "1.1", name: "Boletus edulis", distance: 0.04 },
          { id: "1.2", name: "Leccinum scabrum", distance: 0.06 },
        ],
        distance: 0.12,
      },
      {
        id: "2",
        name: "Suillaceae",
        children: [
          { id: "2.1", name: "Suillus luteus", distance: 0.05 },
          { id: "2.2", name: "Suillus grevillei", distance: 0.07 },
        ],
        distance: 0.14,
      },
    ],
  },
  "3": {
    id: "root",
    name: "Polyporales",
    children: [
      {
        id: "1",
        name: "Polyporaceae",
        children: [
          { id: "1.1", name: "Trametes versicolor", distance: 0.06 },
          { id: "1.2", name: "Fomes fomentarius", distance: 0.08 },
        ],
        distance: 0.11,
      },
      {
        id: "2",
        name: "Ganodermataceae",
        children: [
          { id: "2.1", name: "Ganoderma lucidum", distance: 0.07 },
          { id: "2.2", name: "Ganoderma applanatum", distance: 0.09 },
        ],
        distance: 0.13,
      },
    ],
  },
  "4": {
    id: "root",
    name: "Russulales",
    children: [
      {
        id: "1",
        name: "Russulaceae",
        children: [
          { id: "1.1", name: "Russula emetica", distance: 0.05 },
          { id: "1.2", name: "Lactarius deliciosus", distance: 0.07 },
        ],
        distance: 0.1,
      },
      {
        id: "2",
        name: "Stereaceae",
        children: [
          { id: "2.1", name: "Stereum hirsutum", distance: 0.06 },
          { id: "2.2", name: "Stereum ostrea", distance: 0.08 },
        ],
        distance: 0.12,
      },
    ],
  },
  "5": {
    id: "root",
    name: "Medicinal Fungi",
    children: [
      {
        id: "1",
        name: "Polyporaceae",
        children: [
          { id: "1.1", name: "Trametes versicolor", distance: 0.06 },
          { id: "1.2", name: "Ganoderma lucidum", distance: 0.08 },
        ],
        distance: 0.11,
      },
      {
        id: "2",
        name: "Hericiaceae",
        children: [
          { id: "2.1", name: "Hericium erinaceus", distance: 0.07 },
          { id: "2.2", name: "Hericium coralloides", distance: 0.09 },
        ],
        distance: 0.13,
      },
      {
        id: "3",
        name: "Hymenochaetaceae",
        children: [
          { id: "3.1", name: "Inonotus obliquus", distance: 0.08 },
          { id: "3.2", name: "Phellinus linteus", distance: 0.1 },
        ],
        distance: 0.15,
      },
    ],
  },
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // In a real application, we would query the database here
    // For now, we'll use mock data based on the ID
    let treeData

    try {
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
        console.warn("Table phylogeny_trees does not exist. Using mock data.")
        treeData = mockTreeData[id] || mockTreeData["1"]
        return NextResponse.json(treeData)
      }

      const result = await sql`
        SELECT * FROM phylogeny_trees WHERE root_species_id = ${id} LIMIT 1
      `

      if (result.rows.length > 0) {
        treeData = result.rows[0].tree_data
        console.log("Successfully fetched tree data from the database.")
      } else {
        // Fall back to mock data if not in database
        treeData = mockTreeData[id] || mockTreeData["1"] // Default to Agaricales if ID not found
        console.log("Using mock tree data as no data found in database.")
      }
    } catch (dbError: any) {
      console.error("Database error:", dbError)
      console.error("Database error stack:", dbError.stack)
      console.error("Database connection string:", process.env.NEON_DATABASE_URL) // Log the connection string
      // Fall back to mock data if database query fails
      treeData = mockTreeData[id] || mockTreeData["1"]
      console.log("Using mock tree data due to database error.")
    }

    return NextResponse.json(treeData)
  } catch (error: any) {
    console.error("Error fetching tree data:", error)
    console.error("Error fetching tree data stack:", error.stack)
    return NextResponse.json({ error: "Failed to fetch tree data" }, { status: 500 })
  }
}
