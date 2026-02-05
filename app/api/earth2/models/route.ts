/**
 * Earth-2 Models API Routes
 * February 4, 2026
 * 
 * List available Earth-2 AI models
 */

import { NextRequest, NextResponse } from "next/server";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${MAS_API_URL}/api/earth2/models`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      // Return default model list if MAS is unavailable
      return NextResponse.json({
        models: [
          {
            id: "atlas_era5",
            name: "Atlas ERA5",
            type: "forecast",
            description: "Medium-range global forecast (0-15 days)",
            variables: 75,
            resolution: 0.25,
            available: false,
          },
          {
            id: "atlas_gfs",
            name: "Atlas GFS",
            type: "forecast",
            description: "Medium-range forecast with GFS initialization",
            variables: 75,
            resolution: 0.25,
            available: false,
          },
          {
            id: "stormscope_goes_mrms",
            name: "StormScope GOES-MRMS",
            type: "nowcast",
            description: "Short-range hazardous weather nowcast (0-6 hours)",
            resolution: 0.0125,
            available: false,
          },
          {
            id: "corrdiff",
            name: "CorrDiff",
            type: "downscale",
            description: "AI downscaling (500x faster than physics)",
            available: false,
          },
          {
            id: "healda",
            name: "HealDA",
            type: "assimilation",
            description: "Global data assimilation in seconds",
            available: false,
          },
        ],
        source: "default",
      });
    }

    const data = await response.json();
    return NextResponse.json({ ...data, source: "mas" });
  } catch (error) {
    console.error("Earth-2 Models GET error:", error);
    return NextResponse.json(
      { models: [], error: "Failed to fetch Earth-2 models" },
      { status: 503 }
    );
  }
}
