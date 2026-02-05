/**
 * Earth-2 Spore Dispersal API Routes
 * February 4, 2026
 * 
 * Spore dispersal modeling combining Earth-2 weather with MINDEX data
 */

import { NextRequest, NextResponse } from "next/server";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("run_id");
    const hours = parseInt(searchParams.get("hours") || "24");

    if (runId) {
      // Get specific spore dispersal run
      const response = await fetch(
        `${MAS_API_URL}/api/earth2/runs/${runId}`,
        {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: "Spore dispersal run not found", run_id: runId },
          { status: response.status }
        );
      }

      return NextResponse.json(await response.json());
    }

    // If hours parameter is provided, return zones data
    if (searchParams.has("hours")) {
      try {
        const response = await fetch(
          `${MAS_API_URL}/api/earth2/spore-dispersal?hours=${hours}`,
          {
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }
        );

        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch {
        // Fall through to generate local data
      }

      // Generate local spore zones
      return NextResponse.json({
        zones: generateSporeZones(hours),
        forecastHours: hours,
        available: true,
        source: "local",
      });
    }

    // List recent spore dispersal runs
    const response = await fetch(
      `${MAS_API_URL}/api/earth2/runs?run_type=spore_dispersal`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.log("[Earth-2 Spore Dispersal] MAS backend unavailable, returning mock data");
      return NextResponse.json({
        runs: [],
        zones: generateSporeZones(hours),
        message: "MAS Earth-2 Spore Dispersal API unavailable",
        available: false,
      });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Spore Dispersal GET error:", error);
    return NextResponse.json({
      runs: [],
      zones: generateSporeZones(24),
      message: "Failed to connect to Earth-2 Spore Dispersal API",
      available: false,
    });
  }
}

function generateSporeZones(forecastHours: number) {
  const seed = forecastHours * 0.1;
  
  const baseZones = [
    { lat: 41.5, lon: -93.0, radius: 150, species: "Fusarium graminearum", risk: "high" },
    { lat: 40.0, lon: -89.5, radius: 100, species: "Fusarium oxysporum", risk: "moderate" },
    { lat: 47.5, lon: -122.0, radius: 80, species: "Amanita muscaria", risk: "low" },
    { lat: 45.5, lon: -123.0, radius: 120, species: "Cantharellus cibarius", risk: "low" },
    { lat: 37.5, lon: -122.5, radius: 90, species: "Armillaria mellea", risk: "moderate" },
    { lat: 34.0, lon: -118.5, radius: 70, species: "Agaricus bisporus", risk: "low" },
    { lat: 33.5, lon: -84.5, radius: 110, species: "Ganoderma lucidum", risk: "moderate" },
    { lat: 30.0, lon: -81.5, radius: 130, species: "Aspergillus flavus", risk: "high" },
    { lat: 42.5, lon: -71.0, radius: 85, species: "Trametes versicolor", risk: "low" },
    { lat: 40.7, lon: -74.0, radius: 60, species: "Pleurotus ostreatus", risk: "low" },
    // San Diego area
    { lat: 32.7, lon: -117.1, radius: 100, species: "Psilocybe cyanescens", risk: "moderate" },
    { lat: 32.9, lon: -116.8, radius: 70, species: "Boletus edulis", risk: "low" },
  ];

  return baseZones.map((zone, i) => ({
    id: `zone-${i}`,
    lat: zone.lat,
    lon: zone.lon,
    radius: zone.radius * (1 + seed * 0.1),
    concentration: 1000 + Math.random() * 5000,
    riskLevel: zone.risk,
    species: zone.species,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["min_lat", "max_lat", "min_lon", "max_lon"];
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Submit spore dispersal request
    const response = await fetch(`${MAS_API_URL}/api/earth2/spore-dispersal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        min_lat: body.min_lat,
        max_lat: body.max_lat,
        min_lon: body.min_lon,
        max_lon: body.max_lon,
        start_time: body.start_time,
        end_time: body.end_time,
        species_filter: body.species_filter || null,
        include_precipitation: body.include_precipitation ?? true,
        include_humidity: body.include_humidity ?? true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to run spore dispersal model", details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Spore Dispersal POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit spore dispersal request" },
      { status: 500 }
    );
  }
}
