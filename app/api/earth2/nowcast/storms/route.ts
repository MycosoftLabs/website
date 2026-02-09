/**
 * Earth-2 Storm Detection API Endpoint
 * February 5, 2026
 * 
 * Provides storm cell detection and tracking data.
 * Uses MAS real data with cached-real fallback only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../../_lib/real-cache";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const north = parseFloat(searchParams.get("north") || "50");
  const south = parseFloat(searchParams.get("south") || "25");
  const east = parseFloat(searchParams.get("east") || "-65");
  const west = parseFloat(searchParams.get("west") || "-125");
  
  const forecastHours = parseInt(searchParams.get("forecastHours") || "0", 10);
  const query = new URLSearchParams({
    north: String(north),
    south: String(south),
    east: String(east),
    west: String(west),
    forecastHours: String(forecastHours),
  });
  const cacheKey = `earth2:storms:${query.toString()}`;

  try {
    const response = await fetch(`${MAS_API_URL}/api/earth2/nowcast/storms?${query.toString()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`MAS storms status ${response.status}`);
    const data = await response.json();
    setCachedReal(cacheKey, data, { ttlMs: 5 * 60 * 1000 });
    return NextResponse.json({ ...data, source: "mas", cached: false });
  } catch (error) {
    const cached = getCachedReal(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ...(cached.body as Record<string, unknown>), source: "cached_real", cached: true },
        { status: cached.status },
      );
    }
    return NextResponse.json(
      {
        success: false,
        cells: [],
        source: "none",
        cached: false,
        available: false,
        error: `Earth-2 storm data unavailable: ${normalizeError(error)}`,
      },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
