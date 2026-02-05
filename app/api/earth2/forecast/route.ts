/**
 * Earth-2 Forecast API Routes
 * February 4, 2026
 * 
 * Submit and retrieve weather forecasts from Earth-2 Atlas models
 */

import { NextRequest, NextResponse } from "next/server";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  // Debug log to confirm route is being hit
  console.log("[Earth-2 Forecast] GET request received");
  
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("run_id");

    if (runId) {
      // Get specific forecast run
      const response = await fetch(
        `${MAS_API_URL}/api/earth2/forecast/${runId}`,
        {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: "Forecast not found", run_id: runId },
          { status: response.status }
        );
      }

      return NextResponse.json(await response.json());
    }

    // List recent forecast runs
    const response = await fetch(`${MAS_API_URL}/api/earth2/runs?run_type=forecast`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      // Return mock data when MAS backend is unavailable
      console.log("[Earth-2 Forecast] MAS backend unavailable, returning mock data");
      return NextResponse.json({
        runs: [],
        message: "MAS Earth-2 API unavailable - no forecast runs cached",
        available: false,
      });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Earth-2 Forecast GET error:", error);
    return NextResponse.json(
      { error: "Failed to connect to Earth-2 API" },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.model) {
      body.model = "atlas_era5"; // Default model
    }

    // Submit forecast request
    const response = await fetch(`${MAS_API_URL}/api/earth2/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: body.model,
        start_time: body.start_time || new Date().toISOString(),
        lead_hours: body.lead_hours || 168, // 7 days default
        step_hours: body.step_hours || 6,
        variables: body.variables || ["t2m", "u10", "v10", "tp", "msl"],
        ensemble_members: body.ensemble_members || 5,
        spatial_extent: body.spatial_extent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to submit forecast", details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Earth-2 Forecast POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit forecast request" },
      { status: 500 }
    );
  }
}
