/**
 * Earth-2 API Routes - Base Endpoint
 * February 4, 2026
 * 
 * Proxies requests to MAS backend Earth-2 API
 */

import { NextRequest, NextResponse } from "next/server";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  try {
    // GET /api/earth2 - Status check
    const response = await fetch(`${MAS_API_URL}/api/earth2/status`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.log("[Earth-2] MAS backend unavailable, returning status");
      return NextResponse.json({
        available: false,
        status: "unavailable",
        message: "MAS Earth-2 API not connected",
        models: ["atlas", "stormscope", "corrdiff", "healda"],
        endpoints: ["/api/earth2/models", "/api/earth2/layers", "/api/earth2/forecast", "/api/earth2/nowcast"],
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Earth-2 API error:", error);
    return NextResponse.json({
      available: false,
      status: "offline",
      message: "MAS Earth-2 API not reachable",
      models: ["atlas", "stormscope", "corrdiff", "healda"],
    });
  }
}
