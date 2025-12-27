import { type NextRequest, NextResponse } from "next/server"
import { getAncestryById, getSpeciesById, getSpeciesChildren, getAncestryTree } from "@/lib/services/ancestry-service"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")

    if (type === "species") {
      const species = await getSpeciesById(id)
      if (!species) {
        return NextResponse.json({ error: "Species not found" }, { status: 404 })
      }
      return NextResponse.json({ species })
    } else if (type === "children") {
      const children = await getSpeciesChildren(id)
      return NextResponse.json({ children })
    } else if (type === "tree") {
      const tree = await getAncestryTree(id)
      return NextResponse.json({ tree })
    } else {
      const ancestry = await getAncestryById(id)
      if (!ancestry) {
        return NextResponse.json({ error: "Ancestry record not found" }, { status: 404 })
      }
      return NextResponse.json({ ancestry })
    }
  } catch (error) {
    console.error(`Error in ancestry/${params.id} API:`, error)
    return NextResponse.json({ error: "Failed to fetch ancestry data" }, { status: 500 })
  }
}
