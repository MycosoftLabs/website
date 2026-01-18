/**
 * OBIS Marine Biodiversity API Route
 * 
 * GET /api/oei/obis - Fetch marine species observations from OBIS
 */

import { NextRequest, NextResponse } from "next/server"
import { getOBISClient, type OBISQuery } from "@/lib/oei/connectors"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query: OBISQuery = {}
    
    // Taxonomy filters
    if (searchParams.get("taxonid")) query.taxonid = parseInt(searchParams.get("taxonid")!)
    if (searchParams.get("scientificname")) query.scientificname = searchParams.get("scientificname")!
    
    // Location
    if (searchParams.get("areaid")) query.areaid = parseInt(searchParams.get("areaid")!)
    
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
    
    // Depth filters
    if (searchParams.get("startdepth")) query.startdepth = parseInt(searchParams.get("startdepth")!)
    if (searchParams.get("enddepth")) query.enddepth = parseInt(searchParams.get("enddepth")!)
    
    // Time filters
    if (searchParams.get("startdate")) query.startdate = searchParams.get("startdate")!
    if (searchParams.get("enddate")) query.enddate = searchParams.get("enddate")!
    if (searchParams.get("year")) query.year = parseInt(searchParams.get("year")!)
    
    // Other
    if (searchParams.get("datasetid")) query.datasetid = searchParams.get("datasetid")!
    
    // Pagination
    if (searchParams.get("size")) query.size = parseInt(searchParams.get("size")!)
    if (searchParams.get("offset")) query.offset = parseInt(searchParams.get("offset")!)

    const client = getOBISClient()
    
    // Check for deep sea shortcut
    if (searchParams.get("deepsea") === "true") {
      const entities = await client.getDeepSeaObservations(query)
      return NextResponse.json({
        success: true,
        count: entities.length,
        source: "obis",
        entities,
      })
    }

    const entities = await client.searchOccurrences(query)

    return NextResponse.json({
      success: true,
      count: entities.length,
      source: "obis",
      entities,
    })
  } catch (error) {
    console.error("[API] OBIS error:", error)
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
