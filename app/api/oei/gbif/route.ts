/**
 * GBIF Biodiversity API Route
 * 
 * GET /api/oei/gbif - Fetch biodiversity observations from GBIF
 */

import { NextRequest, NextResponse } from "next/server"
import { getGBIFClient, type GBIFQuery } from "@/lib/oei/connectors"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query: GBIFQuery = {}
    
    // Taxonomy filters
    if (searchParams.get("kingdom")) query.kingdom = searchParams.get("kingdom")!
    if (searchParams.get("phylum")) query.phylum = searchParams.get("phylum")!
    if (searchParams.get("class")) query.class = searchParams.get("class")!
    if (searchParams.get("order")) query.order = searchParams.get("order")!
    if (searchParams.get("family")) query.family = searchParams.get("family")!
    if (searchParams.get("genus")) query.genus = searchParams.get("genus")!
    if (searchParams.get("species")) query.species = searchParams.get("species")!
    if (searchParams.get("scientificName")) query.scientificName = searchParams.get("scientificName")!
    
    // Location
    if (searchParams.get("country")) query.country = searchParams.get("country")!
    
    // Bounds
    const north = searchParams.get("north")
    const south = searchParams.get("south")
    const east = searchParams.get("east")
    const west = searchParams.get("west")
    if (north && south && east && west) {
      query.bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
      }
    }
    
    // Time
    if (searchParams.get("year")) query.year = searchParams.get("year")!
    
    // Other
    if (searchParams.get("basisOfRecord")) {
      query.basisOfRecord = searchParams.get("basisOfRecord") as GBIFQuery["basisOfRecord"]
    }
    if (searchParams.get("hasCoordinate")) {
      query.hasCoordinate = searchParams.get("hasCoordinate") === "true"
    }
    if (searchParams.get("mediaType")) {
      query.mediaType = searchParams.get("mediaType") as GBIFQuery["mediaType"]
    }
    
    // Pagination
    if (searchParams.get("limit")) query.limit = parseInt(searchParams.get("limit")!)
    if (searchParams.get("offset")) query.offset = parseInt(searchParams.get("offset")!)

    const client = getGBIFClient()
    
    // Check for fungi-specific shortcut
    if (searchParams.get("fungi") === "true") {
      const entities = await client.searchFungi(query)
      return NextResponse.json({
        success: true,
        count: entities.length,
        source: "gbif",
        entities,
      })
    }

    const entities = await client.searchOccurrences({
      ...query,
      hasCoordinate: query.hasCoordinate ?? true, // Default to only georeferenced
    })

    return NextResponse.json({
      success: true,
      count: entities.length,
      source: "gbif",
      entities,
    })
  } catch (error) {
    console.error("[API] GBIF error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        entities: [],
      },
      { status: 500 }
    )
  }
}
