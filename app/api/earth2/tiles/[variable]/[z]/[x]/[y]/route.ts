/**
 * Earth-2 Weather Tile Generator
 * February 5, 2026
 * 
 * Generates weather visualization tiles for MapLibre
 * Simulates temperature, precipitation, and other variables
 */

import { NextRequest, NextResponse } from "next/server";

// Color scales for different weather variables
const COLOR_SCALES = {
  temperature: [
    { value: -30, color: [49, 54, 149] },   // Dark blue - cold
    { value: -10, color: [116, 173, 209] }, // Light blue
    { value: 0, color: [171, 217, 233] },   // Pale blue
    { value: 10, color: [224, 243, 248] },  // Very light blue
    { value: 20, color: [254, 224, 144] },  // Light yellow
    { value: 30, color: [253, 174, 97] },   // Orange
    { value: 40, color: [244, 109, 67] },   // Red-orange
    { value: 50, color: [215, 48, 39] },    // Dark red - hot
  ],
  precipitation: [
    { value: 0, color: [255, 255, 255, 0] },   // Transparent
    { value: 0.1, color: [198, 219, 239, 100] }, // Very light blue
    { value: 1, color: [158, 202, 225, 150] },   // Light blue
    { value: 5, color: [107, 174, 214, 180] },   // Medium blue
    { value: 10, color: [66, 146, 198, 200] },   // Blue
    { value: 25, color: [33, 113, 181, 220] },   // Dark blue
    { value: 50, color: [8, 69, 148, 255] },     // Very dark blue
  ],
  humidity: [
    { value: 0, color: [255, 245, 235, 100] },
    { value: 40, color: [253, 208, 162, 150] },
    { value: 70, color: [253, 141, 60, 200] },
    { value: 100, color: [217, 72, 1, 255] },
  ],
};

// Simple noise function for realistic patterns
function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

// Interpolate between colors based on value
function interpolateColor(
  value: number,
  scale: { value: number; color: number[] }[]
): number[] {
  // Find the two colors to interpolate between
  for (let i = 0; i < scale.length - 1; i++) {
    if (value <= scale[i + 1].value) {
      const t = (value - scale[i].value) / (scale[i + 1].value - scale[i].value);
      const c1 = scale[i].color;
      const c2 = scale[i + 1].color;
      return [
        Math.round(c1[0] + t * (c2[0] - c1[0])),
        Math.round(c1[1] + t * (c2[1] - c1[1])),
        Math.round(c1[2] + t * (c2[2] - c1[2])),
        c1[3] !== undefined && c2[3] !== undefined
          ? Math.round(c1[3] + t * (c2[3] - c1[3]))
          : 180,
      ];
    }
  }
  const last = scale[scale.length - 1].color;
  return [last[0], last[1], last[2], last[3] ?? 180];
}

// Generate weather value based on tile coordinates and time
function generateWeatherValue(
  variable: string,
  x: number,
  y: number,
  z: number,
  hours: number
): number {
  // Use tile coords and time to generate semi-realistic patterns
  const scale = Math.pow(2, z);
  const worldX = (x / scale) * 360 - 180; // longitude
  const worldY = 90 - (y / scale) * 180;  // latitude
  
  // Base temperature varies with latitude (cold at poles, warm at equator)
  const latitudeFactor = Math.cos((worldY * Math.PI) / 180);
  
  // Add time-based variation
  const timeFactor = Math.sin((hours / 24) * Math.PI * 2) * 0.2;
  
  // Add some noise for realism
  const noiseFactor = noise(x * 0.1, y * 0.1, hours) * 0.3;
  
  switch (variable) {
    case "temperature":
      // Temperature: -30 to 50°C
      return -30 + latitudeFactor * 60 + timeFactor * 10 + noiseFactor * 20 + 15;
    case "precipitation":
      // Precipitation: 0 to 50 mm/hr (spotty)
      const precip = noise(x * 0.2, y * 0.2, hours * 0.1) * 50;
      return precip > 10 ? precip : 0; // Make it spotty
    case "humidity":
      // Humidity: 0 to 100%
      return 30 + latitudeFactor * 40 + noiseFactor * 30;
    default:
      return 0;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ variable: string; z: string; x: string; y: string }> }
) {
  const { variable, z, x, y } = await params;
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get("hours") || "0");
  
  const zNum = parseInt(z);
  const xNum = parseInt(x);
  const yNum = parseInt(y.replace(".png", ""));
  
  // Get the color scale for this variable
  const scale = COLOR_SCALES[variable as keyof typeof COLOR_SCALES] || COLOR_SCALES.temperature;
  
  // Generate a 256x256 tile
  const TILE_SIZE = 256;
  const pixels = new Uint8Array(TILE_SIZE * TILE_SIZE * 4);
  
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      // Calculate world position for this pixel
      const subX = xNum + px / TILE_SIZE;
      const subY = yNum + py / TILE_SIZE;
      
      // Generate weather value with some smoothing
      const value = generateWeatherValue(variable, subX, subY, zNum, hours);
      
      // Get color from scale
      const color = interpolateColor(value, scale);
      
      // Set pixel
      const idx = (py * TILE_SIZE + px) * 4;
      pixels[idx] = color[0];     // R
      pixels[idx + 1] = color[1]; // G
      pixels[idx + 2] = color[2]; // B
      pixels[idx + 3] = color[3]; // A
    }
  }
  
  // Create a simple PNG-like response
  // For a real implementation, use sharp or canvas to create proper PNG
  // Here we return raw RGBA data with a custom content type that MapLibre can handle
  
  // Actually, MapLibre expects a proper image. Let's create a simple BMP-like structure
  // Or better yet, return a redirect to a colored placeholder
  
  // For now, let's generate a simple colored placeholder based on average value
  const avgValue = generateWeatherValue(variable, xNum + 0.5, yNum + 0.5, zNum, hours);
  const avgColor = interpolateColor(avgValue, scale);
  
  // Create a 1x1 PNG that will be stretched
  // This is a workaround - in production you'd use proper tile generation
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(${avgColor[0]},${avgColor[1]},${avgColor[2]},${avgColor[3]/255});stop-opacity:${avgColor[3]/255}" />
          <stop offset="50%" style="stop-color:rgba(${avgColor[0]+20},${avgColor[1]+10},${avgColor[2]},${avgColor[3]/255});stop-opacity:${avgColor[3]/255}" />
          <stop offset="100%" style="stop-color:rgba(${avgColor[0]-10},${avgColor[1]-20},${avgColor[2]+10},${avgColor[3]/255});stop-opacity:${avgColor[3]/255}" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" fill="url(#grad)" />
    </svg>
  `;
  
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
    },
  });
}
