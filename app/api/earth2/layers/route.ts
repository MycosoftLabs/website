/**
 * Earth-2 Layers API Routes
 * February 4, 2026
 * 
 * Visualization layers for CREP Dashboard and Earth Simulator
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../_lib/real-cache";

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

    if (!response.ok) throw new Error(`MAS layers ${response.status}`);

    const data = await response.json();
    const cacheKey = `earth2:layers:${layerId ?? "all"}:${layerType ?? "all"}`;
    setCachedReal(cacheKey, data, { ttlMs: 5 * 60 * 1000 });
    
    // Filter by type if specified
    if (layerType) {
      data.layers = data.layers.filter((l: any) => l.type === layerType);
    }

    // Filter by specific layer if requested
    if (layerId) {
      data.layers = data.layers.filter((l: any) => l.id === layerId);
    }

    return NextResponse.json({ ...data, source: "mas", cached: false });
  } catch (error) {
    console.error("Earth-2 Layers GET error:", error);
    const { searchParams } = new URL(request.url);
    const cacheKey = `earth2:layers:${searchParams.get("layer_id") ?? "all"}:${searchParams.get("type") ?? "all"}`;
    const cached = getCachedReal(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ...(cached.body as Record<string, unknown>), source: "cached_real", cached: true },
        { status: cached.status },
      );
    }
    return NextResponse.json(
      { 
        layers: [],
        error: `Failed to fetch Earth-2 layers: ${normalizeError(error)}`,
        source: "none",
        available: false,
        cached: false
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
