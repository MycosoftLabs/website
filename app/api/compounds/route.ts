import { NextResponse } from "next/server"
import { find, findOne } from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      // Get a single compound by ID
      const compound = await findOne("compounds", { id })

      if (!compound) {
        return NextResponse.json({ error: "Compound not found" }, { status: 404 })
      }

      return NextResponse.json(compound)
    } else {
      // Get all compounds with optional filtering
      const filter: Record<string, any> = {}

      // Add any search filters from query params
      const name = searchParams.get("name")
      if (name) {
        filter.$or = [{ name: { $regex: name, $options: "i" } }, { formula: { $regex: name, $options: "i" } }]
      }

      const type = searchParams.get("type")
      if (type) {
        filter.type = type
      }

      const compounds = await find("compounds", filter)
      return NextResponse.json(compounds)
    }
  } catch (error) {
    console.error("Compounds API error:", error)
    return NextResponse.json({ error: "Failed to fetch compound data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (!action) {
      return NextResponse.json({ error: "Action parameter is required" }, { status: 400 })
    }

    switch (action) {
      case "search":
        const { query } = await request.json()
        const results = await find("compounds", {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { formula: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ],
        })
        return NextResponse.json(results)

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Compounds API error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
