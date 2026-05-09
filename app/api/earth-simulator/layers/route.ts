import { NextRequest, NextResponse } from "next/server";
import { TtlCache, roundedNumber } from "@/lib/server/ttl-cache";

/**
 * Layer Data Aggregation API
 * 
 * Aggregates data from all sources for layer visualization.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const layerCache = new TtlCache<unknown>(256, 2 * 60_000);
const RESPONSE_HEADERS = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const bounds = {
    north: parseFloat(searchParams.get("north") || "0"),
    south: parseFloat(searchParams.get("south") || "0"),
    east: parseFloat(searchParams.get("east") || "0"),
    west: parseFloat(searchParams.get("west") || "0"),
  };
  const layers = searchParams.get("layers")?.split(",") || ["mycelium"];
  const key = [
    "layers",
    layers.slice().sort().join(","),
    roundedNumber(bounds.north, 3),
    roundedNumber(bounds.south, 3),
    roundedNumber(bounds.east, 3),
    roundedNumber(bounds.west, 3),
  ].join("|");
  const cached = layerCache.get(key);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { ...RESPONSE_HEADERS, "X-Earth-Simulator-Cache": "hit" },
    });
  }

  try {
    const layerData: Record<string, any> = {};

    // Fetch data for each requested layer
    for (const layer of layers) {
      switch (layer) {
        case "mycelium":
          // Fetch mycelium probability data
          // This would aggregate from multiple grid cells
          layerData.mycelium = {
            type: "probability",
            data: [], // Would contain grid cell probabilities
          };
          break;

        case "heat":
          // Fetch temperature/heat data from NASA/NOAA
          layerData.heat = {
            type: "temperature",
            data: [], // Would contain temperature data
          };
          break;

        case "organisms":
          // Fetch organism observations from iNaturalist
          try {
            const obsResponse = await fetch(
              `${request.nextUrl.origin}/api/earth-simulator/inaturalist?action=bounds&nelat=${bounds.north}&nelng=${bounds.east}&swlat=${bounds.south}&swlng=${bounds.west}&per_page=100`,
              {
                signal: AbortSignal.timeout(8_000),
                next: { revalidate: 120 },
              }
            );
            const obsData = await obsResponse.json();
            layerData.organisms = {
              type: "observations",
              data: obsData.observations || [],
            };
          } catch (error) {
            console.error("Error fetching organisms:", error);
            layerData.organisms = { type: "observations", data: [] };
          }
          break;

        case "weather":
          // Fetch weather data from NOAA
          layerData.weather = {
            type: "weather",
            data: [], // Would contain weather data
          };
          break;

        default:
          break;
      }
    }

    const payload = {
      success: true,
      bounds,
      layers: layerData,
      timestamp: new Date().toISOString(),
    };
    layerCache.set(key, payload);
    return NextResponse.json(payload, {
      headers: { ...RESPONSE_HEADERS, "X-Earth-Simulator-Cache": "miss" },
    });
  } catch (error) {
    console.error("Layer aggregation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
