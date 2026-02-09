/**
 * Earth-2 Spore Dispersal API Routes
 * February 4, 2026
 * 
 * Spore dispersal modeling combining Earth-2 weather with MINDEX data
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../_lib/real-cache";

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

      if (!response.ok) throw new Error(`MAS spore run ${runId} status ${response.status}`);
      const runData = await response.json();
      setCachedReal(`earth2:spore:run:${runId}`, runData, { ttlMs: 10 * 60 * 1000 });
      return NextResponse.json({ ...runData, source: "mas", cached: false });
    }

    // If hours parameter is provided, return zone data from MAS only
    if (searchParams.has("hours")) {
      const zonesResponse = await fetch(
        `${MAS_API_URL}/api/earth2/spore-dispersal?hours=${hours}`,
        {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );
      if (!zonesResponse.ok) throw new Error(`MAS spore zones status ${zonesResponse.status}`);
      const zonesData = await zonesResponse.json();
      setCachedReal(`earth2:spore:zones:${hours}`, zonesData, { ttlMs: 10 * 60 * 1000 });
      return NextResponse.json({ ...zonesData, source: "mas", cached: false });
    }

    // List recent spore dispersal runs
    const response = await fetch(
      `${MAS_API_URL}/api/earth2/runs?run_type=spore_dispersal`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) throw new Error(`MAS spore list status ${response.status}`);
    const listData = await response.json();
    setCachedReal("earth2:spore:list", listData, { ttlMs: 5 * 60 * 1000 });
    return NextResponse.json({ ...listData, source: "mas", cached: false });
  } catch (error) {
    console.error("Spore Dispersal GET error:", error);
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("run_id");
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    const cacheKey = runId
      ? `earth2:spore:run:${runId}`
      : searchParams.has("hours")
        ? `earth2:spore:zones:${hours}`
        : "earth2:spore:list";
    const cached = getCachedReal(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ...(cached.body as Record<string, unknown>), source: "cached_real", cached: true },
        { status: cached.status },
      );
    }
    return NextResponse.json(
      { runs: [], zones: [], source: "none", cached: false, available: false, message: `Failed to connect to Earth-2 Spore Dispersal API: ${normalizeError(error)}` },
      { status: 503 },
    );
  }
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
