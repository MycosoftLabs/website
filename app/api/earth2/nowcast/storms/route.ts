/**
 * Earth-2 Storm Detection API Endpoint
 * February 5, 2026
 * 
 * Provides storm cell detection and tracking data.
 * Uses radar-like reflectivity simulation for realistic storm visualization.
 */

import { NextRequest, NextResponse } from "next/server";

interface StormCell {
  id: string;
  lat: number;
  lon: number;
  reflectivity: number;  // dBZ (20-70)
  radius: number;        // km
  movement: {
    speed: number;       // m/s
    direction: number;   // degrees
  };
  type: "thunderstorm" | "supercell" | "squall" | "rain";
  intensity: "light" | "moderate" | "heavy" | "severe";
}

// Seed-based random for reproducibility with location/time
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate storm cells based on weather patterns
function generateStormCells(
  bounds: { north: number; south: number; east: number; west: number },
  seed?: number
): StormCell[] {
  const cells: StormCell[] = [];
  const baseSeed = seed ?? Date.now();
  
  // Determine number of storms based on area and "weather activity"
  const area = Math.abs(bounds.north - bounds.south) * Math.abs(bounds.east - bounds.west);
  const activityFactor = seededRandom(baseSeed * 0.01);
  
  // Storm likelihood varies by latitude (more tropical activity near equator, midlatitude storms)
  const centerLat = (bounds.north + bounds.south) / 2;
  const tropicalFactor = Math.max(0, 1 - Math.abs(centerLat) / 30);
  const midlatFactor = centerLat > 20 && centerLat < 50 ? 0.6 : 0.3;
  
  const stormChance = (tropicalFactor * 0.5 + midlatFactor) * activityFactor;
  const numStorms = Math.floor(stormChance * area * 0.15);
  
  for (let i = 0; i < Math.min(numStorms, 50); i++) {
    const cellSeed = baseSeed + i * 1000;
    
    // Random position within bounds
    const lat = bounds.south + seededRandom(cellSeed * 1.1) * (bounds.north - bounds.south);
    const lon = bounds.west + seededRandom(cellSeed * 1.2) * (bounds.east - bounds.west);
    
    // Reflectivity determines storm intensity (dBZ scale)
    // 20-35: light rain, 35-50: moderate, 50-65: heavy/severe, 65+: extreme
    const reflectivity = 20 + seededRandom(cellSeed * 1.3) * 50;
    
    // Radius based on intensity
    const baseRadius = 10 + seededRandom(cellSeed * 1.4) * 40;
    const radius = reflectivity > 50 ? baseRadius * 1.5 : baseRadius;
    
    // Movement
    const speed = 5 + seededRandom(cellSeed * 1.5) * 25;  // 5-30 m/s
    const direction = seededRandom(cellSeed * 1.6) * 360;
    
    // Determine storm type
    let type: StormCell["type"];
    if (reflectivity >= 55) {
      type = seededRandom(cellSeed * 1.7) > 0.7 ? "supercell" : "thunderstorm";
    } else if (reflectivity >= 40) {
      type = seededRandom(cellSeed * 1.8) > 0.5 ? "thunderstorm" : "squall";
    } else {
      type = "rain";
    }
    
    // Intensity level
    let intensity: StormCell["intensity"];
    if (reflectivity >= 55) intensity = "severe";
    else if (reflectivity >= 45) intensity = "heavy";
    else if (reflectivity >= 35) intensity = "moderate";
    else intensity = "light";
    
    cells.push({
      id: `storm-${i}-${Math.round(lat)}-${Math.round(lon)}`,
      lat,
      lon,
      reflectivity: Math.round(reflectivity * 10) / 10,
      radius: Math.round(radius * 10) / 10,
      movement: {
        speed: Math.round(speed * 10) / 10,
        direction: Math.round(direction),
      },
      type,
      intensity,
    });
  }
  
  return cells;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const north = parseFloat(searchParams.get("north") || "50");
  const south = parseFloat(searchParams.get("south") || "25");
  const east = parseFloat(searchParams.get("east") || "-65");
  const west = parseFloat(searchParams.get("west") || "-125");
  
  // Use forecast hour as seed modifier for temporal consistency
  const forecastHours = parseInt(searchParams.get("forecastHours") || "0", 10);
  const dateSeed = Math.floor(Date.now() / (1000 * 60 * 60)) + forecastHours; // Changes hourly
  
  const bounds = { north, south, east, west };
  const cells = generateStormCells(bounds, dateSeed);
  
  // Summary statistics
  const severeCount = cells.filter(c => c.intensity === "severe").length;
  const heavyCount = cells.filter(c => c.intensity === "heavy").length;
  const maxReflectivity = cells.reduce((max, c) => Math.max(max, c.reflectivity), 0);
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    bounds,
    forecastHours,
    cells,
    summary: {
      total: cells.length,
      severe: severeCount,
      heavy: heavyCount,
      maxReflectivity: Math.round(maxReflectivity),
    },
  });
}

export const dynamic = "force-dynamic";
