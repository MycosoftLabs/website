/**
 * Earth-2 Nowcast API Routes
 * February 4, 2026
 * 
 * Short-range (0-6 hour) nowcasting using StormScope model
 */

import { NextRequest, NextResponse } from "next/server";

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

      if (!response.ok) {
        return NextResponse.json(
          { error: "Nowcast run not found", run_id: runId },
          { status: response.status }
        );
      }

      return NextResponse.json(await response.json());
    }

    // List recent nowcast runs
    const response = await fetch(
      `${MAS_API_URL}/api/earth2/runs?run_type=nowcast`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.log("[Earth-2 Nowcast] MAS backend unavailable, returning mock data");
      return NextResponse.json({
        runs: [],
        message: "MAS Earth-2 Nowcast API unavailable",
        available: false,
      });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Nowcast GET error:", error);
    return NextResponse.json({
      runs: [],
      message: "Failed to connect to Earth-2 Nowcast API",
      available: false,
    });
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

    // Submit nowcast request
    const response = await fetch(`${MAS_API_URL}/api/earth2/nowcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        min_lat: body.min_lat,
        max_lat: body.max_lat,
        min_lon: body.min_lon,
        max_lon: body.max_lon,
        lead_time_hours: body.lead_time_hours || 6,
        time_step_minutes: body.time_step_minutes || 30,
        variables: body.variables || ["radar_reflectivity", "satellite_ir"],
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
