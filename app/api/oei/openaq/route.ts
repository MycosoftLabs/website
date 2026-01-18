/**
 * OpenAQ Air Quality API Route
 * 
 * GET /api/oei/openaq - Fetch air quality measurements from OpenAQ
 */

import { NextRequest, NextResponse } from "next/server"
import { getOpenAQClient, OpenAQClient, type OpenAQQuery } from "@/lib/oei/connectors"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query: OpenAQQuery = {}
    
    // Location filters
    if (searchParams.get("country")) query.country = searchParams.get("country")!.split(",")
    if (searchParams.get("city")) query.city = searchParams.get("city")!.split(",")
    if (searchParams.get("location_id")) {
      query.location_id = searchParams.get("location_id")!.split(",").map(Number)
    }
    
    // Coordinates
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    if (lat && lng) {
      query.coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) }
      if (searchParams.get("radius")) query.radius = parseInt(searchParams.get("radius")!)
    }
    
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
    
    // Parameter filters
    if (searchParams.get("parameter")) query.parameter = searchParams.get("parameter")!.split(",")
    
    // Time filters
    if (searchParams.get("date_from")) query.date_from = searchParams.get("date_from")!
    if (searchParams.get("date_to")) query.date_to = searchParams.get("date_to")!
    
    // Other
    if (searchParams.get("isMobile")) query.isMobile = searchParams.get("isMobile") === "true"
    if (searchParams.get("isAnalysis")) query.isAnalysis = searchParams.get("isAnalysis") === "true"
    
    // Pagination
    if (searchParams.get("limit")) query.limit = parseInt(searchParams.get("limit")!)
    if (searchParams.get("page")) query.page = parseInt(searchParams.get("page")!)

    const client = getOpenAQClient()
    
    // Check for global PM2.5 shortcut
    if (searchParams.get("global") === "true") {
      const observations = await client.getGlobalPM25()
      
      // Add AQI category to each observation
      const enrichedObservations = observations.map(obs => ({
        ...obs,
        aqiCategory: obs.values?.pm25 ? OpenAQClient.getAQICategory(obs.values.pm25) : null,
      }))
      
      return NextResponse.json({
        success: true,
        count: observations.length,
        source: "openaq",
        observations: enrichedObservations,
      })
    }

    const observations = await client.getLatestMeasurements(query)
    
    // Add AQI category to each observation
    const enrichedObservations = observations.map(obs => ({
      ...obs,
      aqiCategory: obs.values?.pm25 ? OpenAQClient.getAQICategory(obs.values.pm25) : null,
    }))

    return NextResponse.json({
      success: true,
      count: observations.length,
      source: "openaq",
      observations: enrichedObservations,
    })
  } catch (error) {
    console.error("[API] OpenAQ error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        observations: [],
      },
      { status: 500 }
    )
  }
}
