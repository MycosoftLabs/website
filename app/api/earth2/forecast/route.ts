/**
 * Earth-2 Forecast API Routes
 * February 4, 2026
 * 
 * Submit and retrieve weather forecasts from Earth-2 Atlas models
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../_lib/real-cache";

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

      if (!response.ok) throw new Error(`MAS forecast run ${runId} status ${response.status}`);
      const runData = await response.json();
      setCachedReal(`earth2:forecast:run:${runId}`, runData, { ttlMs: 10 * 60 * 1000 });
      return NextResponse.json({ ...runData, source: "mas", cached: false });
    }

    // List recent forecast runs
    const response = await fetch(`${MAS_API_URL}/api/earth2/runs?run_type=forecast`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`MAS forecast list status ${response.status}`);
    const data = await response.json();
    setCachedReal("earth2:forecast:list", data, { ttlMs: 5 * 60 * 1000 });
    return NextResponse.json({ ...data, source: "mas", cached: false });
  } catch (error) {
    console.error("Earth-2 Forecast GET error:", error);
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("run_id");
    const cached = getCachedReal(runId ? `earth2:forecast:run:${runId}` : "earth2:forecast:list");
    if (cached) {
      return NextResponse.json(
        { ...(cached.body as Record<string, unknown>), source: "cached_real", cached: true },
        { status: cached.status },
      );
    }
    return NextResponse.json(
      { runs: [], available: false, source: "none", cached: false, error: `Failed to connect to Earth-2 API: ${normalizeError(error)}` },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const startTime = body.start_time || new Date().toISOString();
    const startDate = new Date(startTime);
    const forecastHours = Number(body.forecast_hours ?? body.lead_hours ?? 168);
    const endTime = body.end_time || new Date(startDate.getTime() + forecastHours * 60 * 60 * 1000).toISOString();

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
        start_time: startTime,
        end_time: endTime,
        step_hours: body.step_hours || 6,
        variables: body.variables || ["t2m", "u10", "v10", "tp", "msl"],
        ensemble_members: body.ensemble_members || 5,
        min_lat: body.min_lat ?? body.bounds?.south ?? body.spatial_extent?.min_lat,
        max_lat: body.max_lat ?? body.bounds?.north ?? body.spatial_extent?.max_lat,
        min_lon: body.min_lon ?? body.bounds?.west ?? body.spatial_extent?.min_lon,
        max_lon: body.max_lon ?? body.bounds?.east ?? body.spatial_extent?.max_lon,
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
