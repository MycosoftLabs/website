/**
 * Earth-2 Wind Vectors API
 * February 5, 2026
 * 
 * Returns wind vector data for map visualization
 * Uses MAS real data with cached-real fallback only
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../../_lib/real-cache";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get("hours") || "0");
  const north = parseFloat(searchParams.get("north") || "85");
  const south = parseFloat(searchParams.get("south") || "-85");
  const east = parseFloat(searchParams.get("east") || "180");
  const west = parseFloat(searchParams.get("west") || "-180");

  const cacheKey = `earth2:wind:${hours}:${north}:${south}:${east}:${west}`;
  try {
    const query = new URLSearchParams({
      variable: "wind",
      hours: String(hours),
      north: String(north),
      south: String(south),
      east: String(east),
      west: String(west),
    });
    const response = await fetch(`${MAS_API_URL}/api/earth2/layers?${query.toString()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`MAS wind status ${response.status}`);
    const data = await response.json();
    if (!data.u || !data.v) throw new Error("MAS wind response missing vector payload");
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
      { u: [], v: [], speed: [], direction: [], source: "none", available: false, cached: false, error: `Earth-2 wind unavailable: ${normalizeError(error)}` },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
