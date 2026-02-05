/**
 * Earth-2 Weather Grid API
 * February 5, 2026
 * 
 * Returns weather grid data for map visualization
 * Generates realistic, dynamic data locally if MAS backend unavailable
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

export const dynamic = "force-dynamic";

// Noise function for realistic weather patterns
function noise2D(x: number, y: number, timeSeed: number, scale: number = 1): number {
  const sx = x * scale;
  const sy = y * scale;
  return (
    Math.sin(sx * 0.7 + sy * 0.5 + timeSeed) * 0.5 +
    Math.sin(sx * 1.3 - sy * 0.8 + timeSeed * 1.3) * 0.3 +
    Math.sin(sx * 2.1 + sy * 1.7 + timeSeed * 0.7) * 0.2
  );
}

function generateWeatherGrid(
  variable: string,
  forecastHours: number,
  bounds: { north: number; south: number; east: number; west: number },
  resolution: number
): { grid: number[][]; min: number; max: number } {
  const latSteps = Math.min(50, Math.max(15, Math.ceil((bounds.north - bounds.south) / resolution)));
  const lonSteps = Math.min(80, Math.max(25, Math.ceil((bounds.east - bounds.west) / resolution)));
  const grid: number[][] = [];

  let min = Infinity;
  let max = -Infinity;
  
  // Time-based seed for weather systems that move
  const timeSeed = Date.now() / (1000 * 60 * 60); // Changes hourly
  const forecastOffset = forecastHours * 0.15; // Weather moves with time
  
  // Weather system positions that move with forecast
  const weatherSystems = [
    { lon: -95 + forecastOffset * 0.8, lat: 42, radius: 8, intensity: 1.0 },
    { lon: -85 + forecastOffset * 0.6, lat: 35, radius: 6, intensity: 0.8 },
    { lon: -75 + forecastOffset * 0.5, lat: 45, radius: 10, intensity: 0.9 },
    { lon: -110 + forecastOffset * 0.4, lat: 38, radius: 7, intensity: 0.7 },
    { lon: -120 + forecastOffset * 0.3, lat: 48, radius: 9, intensity: 0.85 },
  ];

  for (let i = 0; i < latSteps; i++) {
    const row: number[] = [];
    const lat = bounds.south + ((bounds.north - bounds.south) * i) / latSteps;
    const latRad = (lat * Math.PI) / 180;

    for (let j = 0; j < lonSteps; j++) {
      const lon = bounds.west + ((bounds.east - bounds.west) * j) / lonSteps;
      
      let value: number;
      const latFactor = Math.cos(latRad);
      
      // Multi-scale noise patterns
      const largeScale = noise2D(lon + forecastOffset, lat, timeSeed, 0.05);
      const medScale = noise2D(lon + forecastOffset * 1.5, lat, timeSeed, 0.15);
      const smallScale = noise2D(lon + forecastOffset * 2, lat, timeSeed, 0.4);
      
      // Weather system influence
      let systemInfluence = 0;
      for (const sys of weatherSystems) {
        const dx = lon - sys.lon;
        const dy = lat - sys.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < sys.radius) {
          systemInfluence += sys.intensity * (1 - dist / sys.radius);
        }
      }

      switch (variable) {
        case "t2m": // Temperature in Celsius
          const baseTemp = -30 + latFactor * 55 + 10;
          const hourOfDay = (forecastHours % 24);
          const diurnal = Math.sin((hourOfDay - 6) * Math.PI / 12) * 8;
          const systemCooling = systemInfluence * -5;
          const tempVariation = largeScale * 8 + medScale * 4;
          value = baseTemp + diurnal + systemCooling + tempVariation;
          break;
          
        case "tp": // Total precipitation in mm
          const precipBase = Math.max(0, systemInfluence * 15);
          const precipNoise = Math.max(0, medScale * 10 + smallScale * 5);
          const moistureFactor = Math.max(0, noise2D(lon, lat, timeSeed, 0.08) + 0.3);
          value = (precipBase + precipNoise) * moistureFactor;
          if (value < 0.1) value = 0;
          break;
          
        case "tcwv": // Total column water vapor (kg/m²)
          const baseMoisture = 20 + latFactor * 25;
          const moistureVariation = largeScale * 15 + medScale * 8;
          const systemMoisture = systemInfluence * 20;
          value = Math.max(5, baseMoisture + moistureVariation + systemMoisture);
          break;
          
        case "sp": // Surface pressure in Pa
          const basePressure = 101325;
          const pressurePattern = largeScale * 2000 + medScale * 500;
          const systemLow = systemInfluence * -1500;
          value = basePressure + pressurePattern + systemLow;
          break;
          
        default:
          value = 50 + largeScale * 30 + medScale * 15;
      }

      row.push(Math.round(value * 100) / 100);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    grid.push(row);
  }

  return { grid, min, max };
}
