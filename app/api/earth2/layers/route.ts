/**
 * Earth-2 Layers API Routes
 * February 4, 2026
 * 
 * Visualization layers for CREP Dashboard and Earth Simulator
 */

import { NextRequest, NextResponse } from "next/server";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const layerId = searchParams.get("layer_id");
    const layerType = searchParams.get("type");

    // Get available layers from MAS
    const response = await fetch(`${MAS_API_URL}/api/earth2/layers`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      // Return default layers if MAS is unavailable
      return NextResponse.json({
        layers: [
          {
            id: "earth2_temperature",
            name: "Temperature (2m)",
            type: "forecast",
            variable: "t2m",
            colormap: "temperature",
            available: false,
          },
          {
            id: "earth2_wind",
            name: "Wind Speed (10m)",
            type: "forecast",
            variable: "wind_speed_10m",
            colormap: "wind",
            available: false,
          },
          {
            id: "earth2_precipitation",
            name: "Precipitation",
            type: "forecast",
            variable: "tp",
            colormap: "precipitation",
            available: false,
          },
          {
            id: "earth2_radar",
            name: "Radar Reflectivity",
            type: "nowcast",
            variable: "radar_reflectivity",
            colormap: "radar",
            available: false,
          },
          {
            id: "earth2_spore",
            name: "Spore Concentration",
            type: "spore_dispersal",
            colormap: "spore",
            available: false,
          },
        ],
        source: "default",
      });
    }

    const data = await response.json();
    
    // Filter by type if specified
    if (layerType) {
      data.layers = data.layers.filter((l: any) => l.type === layerType);
    }

    // Filter by specific layer if requested
    if (layerId) {
      data.layers = data.layers.filter((l: any) => l.id === layerId);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Earth-2 Layers GET error:", error);
    return NextResponse.json(
      { 
        layers: [],
        error: "Failed to fetch Earth-2 layers",
        source: "error"
      },
      { status: 503 }
    );
  }
}

// POST to update/create visualization layers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${MAS_API_URL}/api/earth2/layers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to update layer" },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Earth-2 Layers POST error:", error);
    return NextResponse.json(
      { error: "Failed to update Earth-2 layer" },
      { status: 500 }
    );
  }
}
