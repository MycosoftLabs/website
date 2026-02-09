/**
 * Earth-2 Models API Routes
 * February 4, 2026
 * 
 * List available Earth-2 AI models
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../_lib/real-cache";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";
const CACHE_KEY = "earth2:models";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${MAS_API_URL}/api/earth2/models`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`MAS models ${response.status}`);

    const data = await response.json();
    setCachedReal(CACHE_KEY, data, { ttlMs: 10 * 60 * 1000 });
    return NextResponse.json({ ...data, source: "mas", cached: false });
  } catch (error) {
    console.error("Earth-2 Models GET error:", error);
    const cached = getCachedReal(CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { ...(cached.body as Record<string, unknown>), source: "cached_real", cached: true },
        { status: cached.status },
      );
    }
    return NextResponse.json(
      { models: [], source: "none", cached: false, available: false, error: `Failed to fetch Earth-2 models: ${normalizeError(error)}` },
      { status: 503 }
    );
  }
}
