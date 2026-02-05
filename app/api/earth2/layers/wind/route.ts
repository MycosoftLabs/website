/**
 * Earth-2 Wind Vectors API
 * February 5, 2026
 * 
 * Returns wind vector data for map visualization
 * Generates realistic global circulation patterns
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

export const dynamic = "force-dynamic";

// Noise function for wind perturbations
function windNoise(x: number, y: number, timeSeed: number, scale: number = 1): number {
  const sx = x * scale;
  const sy = y * scale;
  return (
    Math.sin(sx * 0.8 + sy * 0.6 + timeSeed) * 0.6 +
    Math.sin(sx * 1.5 - sy * 1.0 + timeSeed * 1.2) * 0.4
  );
}

function generateWindVectors(
  forecastHours: number,
  bounds: { north: number; south: number; east: number; west: number }
): { u: number[][]; v: number[][]; speed: number[][]; direction: number[][] } {
  const latSteps = 20;
  const lonSteps = 35;
  const u: number[][] = [];
  const v: number[][] = [];
  const speed: number[][] = [];
  const direction: number[][] = [];
  
  // Time-based seed for wind patterns that evolve
  const timeSeed = Date.now() / (1000 * 60 * 60);
  const forecastOffset = forecastHours * 0.1;

  for (let i = 0; i < latSteps; i++) {
    const uRow: number[] = [];
    const vRow: number[] = [];
    const speedRow: number[] = [];
    const dirRow: number[] = [];
    const lat = bounds.south + ((bounds.north - bounds.south) * i) / latSteps;
    const latRad = (lat * Math.PI) / 180;

    for (let j = 0; j < lonSteps; j++) {
      const lon = bounds.west + ((bounds.east - bounds.west) * j) / lonSteps;
      
      let uVal: number, vVal: number;
      
      // Global circulation patterns
      const absLat = Math.abs(lat);
      
      if (absLat < 30) {
        // Trade winds (easterly) - NE in Northern Hemisphere, SE in Southern
        const tradeStrength = 8 + windNoise(lon, lat, timeSeed, 0.1) * 4;
        uVal = -tradeStrength; // Easterly
        vVal = (lat > 0 ? -2 : 2) + windNoise(lon, lat, timeSeed, 0.15) * 3;
      } else if (absLat < 60) {
        // Westerlies - strongest around 40-50 degrees
        const westStrength = 12 + (1 - Math.abs(absLat - 45) / 15) * 8;
        uVal = westStrength + windNoise(lon, lat, timeSeed, 0.12) * 6;
        vVal = windNoise(lon + 10, lat, timeSeed, 0.08) * 8;
        // Add jet stream influence
        if (absLat > 35 && absLat < 55) {
          uVal += 5 * Math.sin(lon * 0.05 + forecastOffset);
        }
      } else {
        // Polar easterlies
        const polarStrength = 5 + windNoise(lon, lat, timeSeed, 0.1) * 3;
        uVal = -polarStrength;
        vVal = windNoise(lon, lat, timeSeed, 0.15) * 4;
      }
      
      // Add synoptic-scale perturbations (weather systems)
      const pertU = windNoise(lon + forecastOffset * 5, lat, timeSeed, 0.03) * 8;
      const pertV = windNoise(lon, lat + forecastOffset * 5, timeSeed, 0.03) * 6;
      uVal += pertU;
      vVal += pertV;

      const s = Math.sqrt(uVal * uVal + vVal * vVal);
      // Meteorological direction (direction wind is coming FROM)
      const d = (270 - Math.atan2(vVal, uVal) * (180 / Math.PI) + 360) % 360;

      uRow.push(Math.round(uVal * 10) / 10);
      vRow.push(Math.round(vVal * 10) / 10);
      speedRow.push(Math.round(s * 10) / 10);
      dirRow.push(Math.round(d));
    }

    u.push(uRow);
    v.push(vRow);
    speed.push(speedRow);
    direction.push(dirRow);
  }

  return { u, v, speed, direction };
}
