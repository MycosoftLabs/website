/**
 * Earth-2 Weather Grid API
 * February 5, 2026
 * 
 * Returns weather grid data for map visualization
 * Generates data locally if MAS backend unavailable
 */

import { NextRequest, NextResponse } from "next/server";

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

  try {
    // Try MAS backend first
    const response = await fetch(
      `${MAS_API_URL}/api/earth2/layers?variable=${variable}&hours=${hours}`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.grid) {
        return NextResponse.json(data);
      }
    }
  } catch (error) {
    console.log("[Earth-2] MAS unavailable, generating local grid");
  }

  // Generate local weather grid data
  const grid = generateWeatherGrid(variable, hours, { north, south, east, west }, resolution);
  
  return NextResponse.json(grid);
}

function generateWeatherGrid(
  variable: string,
  forecastHours: number,
  bounds: { north: number; south: number; east: number; west: number },
  resolution: number
): { grid: number[][]; min: number; max: number } {
  const latSteps = Math.max(10, Math.ceil((bounds.north - bounds.south) / resolution));
  const lonSteps = Math.max(20, Math.ceil((bounds.east - bounds.west) / resolution));
  const grid: number[][] = [];

  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < latSteps; i++) {
    const row: number[] = [];
    const lat = bounds.south + ((bounds.north - bounds.south) * i) / latSteps;

    for (let j = 0; j < lonSteps; j++) {
      const lon = bounds.west + ((bounds.east - bounds.west) * j) / lonSteps;
      
      let value: number;
      const latFactor = Math.cos((lat * Math.PI) / 180);
      const noise = Math.sin(lon * 0.1 + lat * 0.1 + forecastHours * 0.05) * 0.3;
      const diurnal = Math.sin((forecastHours % 24) * Math.PI / 12) * 5;

      switch (variable) {
        case "t2m": // Temperature (Celsius)
          value = -30 + latFactor * 60 + noise * 15 + diurnal + 15;
          break;
        case "tp": // Precipitation (mm)
          value = Math.max(0, (noise + 0.3) * 20);
          break;
        case "tcwv": // Total column water vapor (kg/m²)
          value = 20 + latFactor * 30 + noise * 10;
          break;
        case "sp": // Surface pressure (Pa)
          value = 101325 + noise * 2000;
          break;
        default:
          value = 50 + noise * 20;
      }

      row.push(value);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    grid.push(row);
  }

  return { grid, min, max };
}
