/**
 * Earth-2 Weather Grid API
 * February 10, 2026
 *
 * Returns weather grid data for map visualization
 * Priority: MAS -> Open-Meteo -> Cached Real -> Error
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../../_lib/real-cache";
import { getOpenMeteoClient, VARIABLE_MAPPING } from "@/lib/weather/open-meteo-client";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const variable = searchParams.get("variable") || "t2m";
  const hours = parseInt(searchParams.get("hours") || "0");
  const north = parseFloat(searchParams.get("north") || "85");
  const south = parseFloat(searchParams.get("south") || "-85");
  const east = parseFloat(searchParams.get("east") || "180");
  const west = parseFloat(searchParams.get("west") || "-180");
  const resolution = parseFloat(searchParams.get("resolution") || "0.5");
  const preferOpenMeteo = searchParams.get("source") === "open-meteo";

  const cacheKey = `earth2:grid:${variable}:${hours}:${north}:${south}:${east}:${west}:${resolution}`;

  // Try MAS first (unless Open-Meteo is explicitly preferred)
  if (!preferOpenMeteo) {
    try {
      const query = new URLSearchParams({
        variable,
        hours: String(hours),
        north: String(north),
        south: String(south),
        east: String(east),
        west: String(west),
        resolution: String(resolution),
      });
      const response = await fetch(`${MAS_API_URL}/api/earth2/layers?${query.toString()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.grid && Array.isArray(data.grid) && data.grid.length > 0) {
          setCachedReal(cacheKey, data, { ttlMs: 5 * 60 * 1000 });
          return NextResponse.json({ ...data, source: "mas", cached: false });
        }
      }
    } catch {
      // MAS failed, continue to Open-Meteo fallback
    }
  }

  // Try Open-Meteo as fallback or primary source
  try {
    const openMeteoClient = getOpenMeteoClient({ timeout: 30000 });

    // Choose appropriate model based on region
    // GFS is better for US/North America, standard forecast for global
    const isUSRegion = west >= -130 && east <= -60 && south >= 20 && north <= 55;

    const gridData = isUSRegion
      ? await openMeteoClient.getGFSGrid({
          variable,
          hours,
          north,
          south,
          east,
          west,
          resolution: Math.max(resolution, 1), // Open-Meteo needs coarser resolution
        })
      : await openMeteoClient.getWeatherGrid({
          variable,
          hours,
          north,
          south,
          east,
          west,
          resolution: Math.max(resolution, 1),
        });

    if (gridData.grid.length > 0) {
      // Transform to match expected format
      const responseData = {
        grid: gridData.grid,
        variable: gridData.variable,
        unit: gridData.unit,
        timestamp: gridData.timestamp,
        bounds: gridData.bounds,
        resolution: gridData.resolution,
        model: gridData.model,
        available: true,
      };

      setCachedReal(cacheKey, responseData, { ttlMs: 10 * 60 * 1000 }); // Cache for 10 min
      return NextResponse.json({ ...responseData, source: "open-meteo", cached: false });
    }
  } catch (openMeteoError) {
    console.warn("Open-Meteo fallback failed:", normalizeError(openMeteoError));
  }

  // Try cached data as final fallback
  const cached = getCachedReal(cacheKey);
  if (cached) {
    return NextResponse.json(
      { ...(cached.body as Record<string, unknown>), source: "cached_real", cached: true },
      { status: cached.status }
    );
  }

  // All sources failed
  return NextResponse.json(
    {
      grid: [],
      source: "none",
      available: false,
      cached: false,
      error: "Weather grid unavailable from all sources (MAS, Open-Meteo)",
      supportedVariables: Object.keys(VARIABLE_MAPPING),
    },
    { status: 503 }
  );
}

export const dynamic = "force-dynamic";
