// app/api/ancestry/route.ts
import { NextResponse } from "next/server"
import { MOCK_SPECIES_DATA } from "@/lib/data/mock-species" // Import mock data
import type { Species } from "@/types/ancestry"

// Function to simulate searching species
async function searchSpecies(query: string): Promise<Species[]> {
  // Simulate a database query
  const normalizedQuery = query.toLowerCase()
  const results = MOCK_SPECIES_DATA.filter((species) => {
    return (
      species.name.toLowerCase().includes(normalizedQuery) ||
      species.description.toLowerCase().includes(normalizedQuery)
    )
  })
  return results
}

// Function to simulate filtering species by characteristic
async function filterSpeciesByCharacteristic(characteristic: string): Promise<Species[]> {
  // Simulate filtering based on a characteristic
  const normalizedCharacteristic = characteristic.toLowerCase()
  const results = MOCK_SPECIES_DATA.filter((species) => {
    return species.characteristics.some((char) => char.toLowerCase().includes(normalizedCharacteristic))
  })
  return results
}

// Function to simulate getting all species
async function getAllSpecies(): Promise<Species[]> {
  // Simulate fetching all species from a database
  return MOCK_SPECIES_DATA
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  const filter = searchParams.get("filter")

  try {
    let species: Species[]

    if (query) {
      species = await searchSpecies(query)
    } else if (filter && filter !== "All") {
      species = await filterSpeciesByCharacteristic(filter)
    } else {
      species = await getAllSpecies()
    }

    return NextResponse.json({ species })
  } catch (error) {
    console.error("Error in ancestry API route:", error)
    return NextResponse.json({ error: "Failed to fetch species data" }, { status: 500 })
  }
}
