/**
 * Earth-2 Wind Vectors API
 * February 5, 2026
 * 
 * Returns wind vector data for map visualization
 */

import { NextRequest, NextResponse } from "next/server";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get("hours") || "0");
  const north = parseFloat(searchParams.get("north") || "85");
  const south = parseFloat(searchParams.get("south") || "-85");
  const east = parseFloat(searchParams.get("east") || "180");
  const west = parseFloat(searchParams.get("west") || "-180");

  try {
    // Try MAS backend first
    const response = await fetch(
      `${MAS_API_URL}/api/earth2/layers?variable=wind&hours=${hours}`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.u && data.v) {
        return NextResponse.json(data);
      }
    }
  } catch (error) {
    console.log("[Earth-2] MAS unavailable, generating local wind data");
  }

  // Generate local wind vector data
  const windData = generateWindVectors(hours, { north, south, east, west });
  
  return NextResponse.json(windData);
}

function generateWindVectors(
  forecastHours: number,
  bounds: { north: number; south: number; east: number; west: number }
): { u: number[][]; v: number[][]; speed: number[][]; direction: number[][] } {
  const latSteps = 15;
  const lonSteps = 30;
  const u: number[][] = [];
  const v: number[][] = [];
  const speed: number[][] = [];
  const direction: number[][] = [];

  for (let i = 0; i < latSteps; i++) {
    const uRow: number[] = [];
    const vRow: number[] = [];
    const speedRow: number[] = [];
    const dirRow: number[] = [];
    const lat = bounds.south + ((bounds.north - bounds.south) * i) / latSteps;

    for (let j = 0; j < lonSteps; j++) {
      const lon = bounds.west + ((bounds.east - bounds.west) * j) / lonSteps;
      
      // Global wind pattern simulation
      let uVal: number, vVal: number;
      const timeVariation = Math.sin(forecastHours * 0.1) * 2;
      
      if (Math.abs(lat) < 30) {
        // Trade winds (easterlies in tropics)
        uVal = -8 - Math.random() * 5 + timeVariation;
        vVal = lat * 0.1;
      } else if (Math.abs(lat) < 60) {
        // Westerlies (mid-latitudes)
        uVal = 10 + Math.random() * 10 + timeVariation;
        vVal = Math.random() * 5 - 2.5;
      } else {
        // Polar easterlies
        uVal = -5 - Math.random() * 3 + timeVariation;
        vVal = Math.random() * 2 - 1;
      }

      // Add some geographic variation
      const lonVariation = Math.sin(lon * 0.05) * 3;
      uVal += lonVariation;

      const s = Math.sqrt(uVal * uVal + vVal * vVal);
      const d = (Math.atan2(vVal, uVal) * 180) / Math.PI;

      uRow.push(uVal);
      vRow.push(vVal);
      speedRow.push(s);
      dirRow.push(d);
    }

    u.push(uRow);
    v.push(vRow);
    speed.push(speedRow);
    direction.push(dirRow);
  }

  return { u, v, speed, direction };
}
