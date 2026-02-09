/**
 * Hexbin Aggregator - February 6, 2026
 * 
 * Aggregates points into hexagonal bins.
 */

export interface HexbinOptions {
  radius: number;  // Hex radius in km
  colorScale?: (count: number) => string;
}

export interface Hexbin {
  id: string;
  centerLat: number;
  centerLng: number;
  vertices: Array<{ lat: number; lng: number }>;
  count: number;
  density: number;
  properties: Record<string, any>;
}

export interface Point {
  lat: number;
  lng: number;
  properties?: Record<string, any>;
}

/**
 * Calculate hex grid and aggregate points
 */
export function aggregateToHexbins(
  points: Point[],
  options: HexbinOptions
): Hexbin[] {
  const { radius } = options;
  const hexes: Map<string, Hexbin> = new Map();
  
  // Hex geometry constants
  const hexHeight = radius * 2;
  const hexWidth = Math.sqrt(3) * radius;
  
  // Convert to degrees (approximate)
  const latDegPerKm = 1 / 111;
  const hexHeightDeg = hexHeight * latDegPerKm;
  const hexWidthDeg = hexWidth * latDegPerKm;
  
  for (const point of points) {
    // Calculate hex coordinates
    const col = Math.floor(point.lng / hexWidthDeg);
    const row = Math.floor(point.lat / (hexHeightDeg * 0.75));
    
    // Offset for even/odd rows
    const offset = row % 2 === 0 ? 0 : hexWidthDeg / 2;
    const adjustedCol = Math.floor((point.lng - offset) / hexWidthDeg);
    
    const hexKey = `${adjustedCol}:${row}`;
    
    if (hexes.has(hexKey)) {
      const hex = hexes.get(hexKey)!;
      hex.count++;
    } else {
      const centerLng = adjustedCol * hexWidthDeg + offset + hexWidthDeg / 2;
      const centerLat = row * (hexHeightDeg * 0.75) + hexHeightDeg / 2;
      
      hexes.set(hexKey, {
        id: `hex-${hexKey}`,
        centerLat,
        centerLng,
        vertices: calculateHexVertices(centerLat, centerLng, radius),
        count: 1,
        density: 0,
        properties: {},
      });
    }
  }
  
  // Calculate density
  const maxCount = Math.max(...Array.from(hexes.values()).map(h => h.count));
  for (const hex of hexes.values()) {
    hex.density = maxCount > 0 ? hex.count / maxCount : 0;
  }
  
  return Array.from(hexes.values());
}

function calculateHexVertices(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): Array<{ lat: number; lng: number }> {
  const vertices: Array<{ lat: number; lng: number }> = [];
  const latDegPerKm = 1 / 111;
  const lngDegPerKm = 1 / (111 * Math.cos(centerLat * Math.PI / 180));
  
  for (let i = 0; i < 6; i++) {
    const angle = (60 * i - 30) * Math.PI / 180;
    vertices.push({
      lat: centerLat + radiusKm * Math.sin(angle) * latDegPerKm,
      lng: centerLng + radiusKm * Math.cos(angle) * lngDegPerKm,
    });
  }
  
  return vertices;
}

/**
 * Get color for density value
 */
export function getDensityColor(density: number): string {
  // Blue to yellow to red gradient
  if (density < 0.33) {
    const t = density / 0.33;
    return `rgb(${Math.round(65 * t)}, ${Math.round(105 + 150 * t)}, ${Math.round(225 - 150 * t)})`;
  } else if (density < 0.66) {
    const t = (density - 0.33) / 0.33;
    return `rgb(${Math.round(65 + 190 * t)}, ${Math.round(255 - 55 * t)}, ${Math.round(75 - 75 * t)})`;
  } else {
    const t = (density - 0.66) / 0.34;
    return `rgb(${Math.round(255)}, ${Math.round(200 - 200 * t)}, ${Math.round(0)})`;
  }
}

export default { aggregateToHexbins, getDensityColor };