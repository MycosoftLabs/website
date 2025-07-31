import { NextResponse } from "next/server"
import type * as THREE from "three"

interface Node {
  id: string
  name: string
  children?: Node[]
  distance?: number
  parent?: Node
  position?: THREE.Vector3
  object?: THREE.Object3D
}

// Mock tree data for development
const MOCK_TREE_DATA: Node = {
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
}

export async function GET(request: Request, { params }: { params: { rootId: string } }) {
  try {
    const { rootId } = params

    // Simulate fetching data from a database or external source
    // For now, we'll just return the mock data
    console.log(`Fetching tree data for root ID: ${rootId}`)

    // Ensure the response is valid JSON
    return NextResponse.json(MOCK_TREE_DATA)
  } catch (error) {
    console.error("Error in ancestry API route:", error)
    return NextResponse.json({ error: "Failed to fetch tree data" }, { status: 500 })
  }
}
