/**
 * Earth-2 API Routes - Base Endpoint
 * February 4, 2026
 * 
 * Proxies requests to MAS backend Earth-2 API
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "./_lib/real-cache";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";
const CACHE_KEY = "earth2:status";

export async function GET(request: NextRequest) {
  try {
    // GET /api/earth2 - Status check
    const response = await fetch(`${MAS_API_URL}/api/earth2/status`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`MAS status ${response.status}`);

    const data = await response.json();
    setCachedReal(CACHE_KEY, data, { ttlMs: 2 * 60 * 1000 });
    return NextResponse.json({ ...data, source: "mas", cached: false });
  } catch (error) {
    console.error("Earth-2 API error:", error);
    const cached = getCachedReal(CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { ...(cached.body as Record<string, unknown>), source: "cached_real", cached: true },
        { status: cached.status },
      );
    }
    return NextResponse.json({
      available: false,
      status: "offline",
      source: "none",
      cached: false,
      message: `MAS Earth-2 API not reachable: ${normalizeError(error)}`,
    }, { status: 503 });
  }
}
