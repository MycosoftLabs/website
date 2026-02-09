/**
 * Earth-2 Nowcast API Routes
 * February 4, 2026
 * 
 * Short-range (0-6 hour) nowcasting using StormScope model
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../_lib/real-cache";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("run_id");

    if (runId) {
      // Get specific nowcast run
      const response = await fetch(
        `${MAS_API_URL}/api/earth2/runs/${runId}`,
        {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      if (!response.ok) throw new Error(`MAS nowcast run ${runId} status ${response.status}`);
      const runData = await response.json();
      setCachedReal(`earth2:nowcast:run:${runId}`, runData, { ttlMs: 10 * 60 * 1000 });
      return NextResponse.json({ ...runData, source: "mas", cached: false });
    }

    // List recent nowcast runs
    const response = await fetch(
      `${MAS_API_URL}/api/earth2/runs?run_type=nowcast`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) throw new Error(`MAS nowcast list status ${response.status}`);
    const data = await response.json();
    setCachedReal("earth2:nowcast:list", data, { ttlMs: 5 * 60 * 1000 });
    return NextResponse.json({ ...data, source: "mas", cached: false });
  } catch (error) {
    console.error("Nowcast GET error:", error);
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("run_id");
    const cacheKey = runId ? `earth2:nowcast:run:${runId}` : "earth2:nowcast:list";
    const cached = getCachedReal(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ...(cached.body as Record<string, unknown>), source: "cached_real", cached: true },
        { status: cached.status },
      );
    }
    return NextResponse.json(
      { runs: [], available: false, source: "none", cached: false, message: `Failed to connect to Earth-2 Nowcast API: ${normalizeError(error)}` },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bounds = body.bounds ?? {};
    const normalized = {
      min_lat: body.min_lat ?? bounds.south,
      max_lat: body.max_lat ?? bounds.north,
      min_lon: body.min_lon ?? bounds.west,
      max_lon: body.max_lon ?? bounds.east,
    };

    // Validate required fields
    const requiredFields = ["min_lat", "max_lat", "min_lon", "max_lon"] as const;
    for (const field of requiredFields) {
      if (normalized[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Submit nowcast request
    const response = await fetch(`${MAS_API_URL}/api/earth2/nowcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        min_lat: normalized.min_lat,
        max_lat: normalized.max_lat,
        min_lon: normalized.min_lon,
        max_lon: normalized.max_lon,
        lead_time_hours: body.lead_time_hours ?? Math.max(1, Math.ceil((body.forecast_minutes ?? 360) / 60)),
        time_step_minutes: body.time_step_minutes ?? body.step_minutes ?? 30,
        variables: body.variables,
        include_satellite: body.include_satellite ?? true,
        include_radar: body.include_radar ?? true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to run nowcast", details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Nowcast POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit nowcast request" },
      { status: 500 }
    );
  }
}
