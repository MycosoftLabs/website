/**
 * Earth Grid System - NatureOS
 * 
 * Creates a 24x24 inch equivalent grid covering all land areas
 * Each tile has a unique ID for tracking observations, mycelium networks, etc.
 * 
 * Grid Resolution Options:
 * - 1 degree ≈ 111 km at equator (coarse)
 * - 0.1 degree ≈ 11 km (medium) 
 * - 0.01 degree ≈ 1.1 km (fine)
 * - 0.001 degree ≈ 111 m (ultra-fine)
 * 
 * For "24x24 inch tiles" we interpret this as ~0.5 degree grid cells
 * which creates manageable tile counts for land areas
 */

// Grid configuration
export const GRID_CONFIG = {
  // Tile size in degrees (0.5° ≈ 55km at equator, reasonable for visualization)
  tileSizeDegrees: 0.5,
  
  // Alternative sizes
  sizes: {
    coarse: 1.0,      // ~111 km - 64,800 potential tiles globally
    medium: 0.5,      // ~55 km - 259,200 potential tiles globally  
    fine: 0.1,        // ~11 km - 6,480,000 potential tiles globally
    ultraFine: 0.01,  // ~1.1 km - 648,000,000 potential tiles
  },
  
  // Earth bounds
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
};

// Known ocean regions (simplified bounding boxes for filtering)
// These are approximate - for production, use actual coastline data
const OCEAN_REGIONS = [
  // Pacific Ocean (main body)
  { name: "Pacific Central", minLat: -60, maxLat: 60, minLon: -180, maxLon: -100 },
  { name: "Pacific West", minLat: -60, maxLat: 60, minLon: 100, maxLon: 180 },
  
  // Atlantic Ocean
  { name: "Atlantic North", minLat: 0, maxLat: 65, minLon: -80, maxLon: -5 },
  { name: "Atlantic South", minLat: -60, maxLat: 0, minLon: -70, maxLon: 20 },
  
  // Indian Ocean
  { name: "Indian", minLat: -60, maxLat: 25, minLon: 20, maxLon: 120 },
  
  // Arctic Ocean
  { name: "Arctic", minLat: 75, maxLat: 90, minLon: -180, maxLon: 180 },
  
  // Southern Ocean
  { name: "Southern", minLat: -90, maxLat: -60, minLon: -180, maxLon: 180 },
];

// Major landmass bounding boxes (for positive filtering)
const LAND_REGIONS = [
  // North America
  { name: "North America", minLat: 15, maxLat: 85, minLon: -170, maxLon: -50 },
  
  // South America
  { name: "South America", minLat: -56, maxLat: 15, minLon: -82, maxLon: -34 },
  
  // Europe
  { name: "Europe", minLat: 35, maxLat: 72, minLon: -25, maxLon: 65 },
  
  // Africa
  { name: "Africa", minLat: -35, maxLat: 38, minLon: -18, maxLon: 52 },
  
  // Asia
  { name: "Asia", minLat: 0, maxLat: 78, minLon: 25, maxLon: 180 },
  { name: "Asia East", minLat: 0, maxLat: 55, minLon: -180, maxLon: -165 }, // Far east wraps
  
  // Australia & Oceania
  { name: "Australia", minLat: -50, maxLat: -10, minLon: 110, maxLon: 180 },
  { name: "New Zealand", minLat: -48, maxLat: -34, minLon: 165, maxLon: 180 },
  
  // Antarctica (land under ice)
  { name: "Antarctica", minLat: -90, maxLat: -60, minLon: -180, maxLon: 180 },
  
  // Major Islands
  { name: "Greenland", minLat: 59, maxLat: 84, minLon: -74, maxLon: -11 },
  { name: "Iceland", minLat: 63, maxLat: 67, minLon: -25, maxLon: -13 },
  { name: "UK Ireland", minLat: 49, maxLat: 61, minLon: -11, maxLon: 3 },
  { name: "Japan", minLat: 24, maxLat: 46, minLon: 122, maxLon: 154 },
  { name: "Philippines", minLat: 4, maxLat: 21, minLon: 116, maxLon: 127 },
  { name: "Indonesia", minLat: -11, maxLat: 6, minLon: 95, maxLon: 141 },
  { name: "Madagascar", minLat: -26, maxLat: -12, minLon: 43, maxLon: 51 },
  { name: "Sri Lanka", minLat: 5, maxLat: 10, minLon: 79, maxLon: 82 },
  { name: "Taiwan", minLat: 21, maxLat: 26, minLon: 119, maxLon: 122 },
  { name: "Cuba Caribbean", minLat: 17, maxLat: 24, minLon: -85, maxLon: -74 },
  { name: "New Guinea", minLat: -11, maxLat: 0, minLon: 130, maxLon: 151 },
];

export interface GridTile {
  id: string;
  lat: number;
  lon: number;
  latEnd: number;
  lonEnd: number;
  centerLat: number;
  centerLon: number;
  region?: string;
  isLand: boolean;
  areaKm2: number;
}

export interface GridStats {
  totalTiles: number;
  landTiles: number;
  oceanTiles: number;
  tileSizeDegrees: number;
  approximateTileSizeKm: number;
}

/**
 * Generate a unique tile ID from coordinates
 * Format: L{lat}_{lon} where lat/lon are grid indices
 */
export function generateTileId(lat: number, lon: number, tileSize: number = GRID_CONFIG.tileSizeDegrees): string {
  const latIndex = Math.floor((lat + 90) / tileSize);
  const lonIndex = Math.floor((lon + 180) / tileSize);
  return `T${latIndex.toString().padStart(3, '0')}_${lonIndex.toString().padStart(3, '0')}`;
}

/**
 * Parse a tile ID back to coordinates
 */
export function parseTileId(tileId: string, tileSize: number = GRID_CONFIG.tileSizeDegrees): { lat: number; lon: number } | null {
  const match = tileId.match(/^T(\d+)_(\d+)$/);
  if (!match) return null;
  
  const latIndex = parseInt(match[1], 10);
  const lonIndex = parseInt(match[2], 10);
  
  return {
    lat: latIndex * tileSize - 90,
    lon: lonIndex * tileSize - 180,
  };
}

/**
 * Check if a point is within any land region
 */
export function isLandPoint(lat: number, lon: number): boolean {
  for (const region of LAND_REGIONS) {
    if (lat >= region.minLat && lat <= region.maxLat &&
        lon >= region.minLon && lon <= region.maxLon) {
      return true;
    }
  }
  return false;
}

/**
 * Get the region name for a point
 */
export function getRegionName(lat: number, lon: number): string | undefined {
  for (const region of LAND_REGIONS) {
    if (lat >= region.minLat && lat <= region.maxLat &&
        lon >= region.minLon && lon <= region.maxLon) {
      return region.name;
    }
  }
  return undefined;
}

/**
 * Calculate approximate area of a tile in km²
 * (varies with latitude due to Earth's curvature)
 */
export function calculateTileArea(lat: number, tileSize: number): number {
  const R = 6371; // Earth radius in km
  const latRad = (lat * Math.PI) / 180;
  const tileSizeRad = (tileSize * Math.PI) / 180;
  
  // Width varies with latitude
  const width = R * tileSizeRad * Math.cos(latRad);
  // Height is constant
  const height = R * tileSizeRad;
  
  return Math.abs(width * height);
}

/**
 * Generate all land tiles for a given viewport or globally
 */
export function generateLandTiles(
  bounds?: { north: number; south: number; east: number; west: number },
  tileSize: number = GRID_CONFIG.tileSizeDegrees
): GridTile[] {
  const tiles: GridTile[] = [];
  
  const minLat = bounds?.south ?? GRID_CONFIG.minLat;
  const maxLat = bounds?.north ?? GRID_CONFIG.maxLat;
  const minLon = bounds?.west ?? GRID_CONFIG.minLon;
  const maxLon = bounds?.east ?? GRID_CONFIG.maxLon;
  
  // Snap to grid
  const startLat = Math.floor(minLat / tileSize) * tileSize;
  const startLon = Math.floor(minLon / tileSize) * tileSize;
  
  for (let lat = startLat; lat < maxLat; lat += tileSize) {
    for (let lon = startLon; lon < maxLon; lon += tileSize) {
      const centerLat = lat + tileSize / 2;
      const centerLon = lon + tileSize / 2;
      
      // Check if this tile is on land
      const isLand = isLandPoint(centerLat, centerLon);
      
      if (isLand) {
        tiles.push({
          id: generateTileId(lat, lon, tileSize),
          lat,
          lon,
          latEnd: lat + tileSize,
          lonEnd: lon + tileSize,
          centerLat,
          centerLon,
          region: getRegionName(centerLat, centerLon),
          isLand: true,
          areaKm2: calculateTileArea(centerLat, tileSize),
        });
      }
    }
  }
  
  return tiles;
}

/**
 * Get grid statistics
 */
export function getGridStats(tileSize: number = GRID_CONFIG.tileSizeDegrees): GridStats {
  const latTiles = Math.ceil(180 / tileSize);
  const lonTiles = Math.ceil(360 / tileSize);
  const totalTiles = latTiles * lonTiles;
  
  // Approximate land coverage (29% of Earth)
  const landTiles = Math.round(totalTiles * 0.29);
  
  return {
    totalTiles,
    landTiles,
    oceanTiles: totalTiles - landTiles,
    tileSizeDegrees: tileSize,
    approximateTileSizeKm: 111 * tileSize, // Approximate at equator
  };
}

/**
 * Get tiles within a viewport (for rendering)
 */
export function getTilesInViewport(
  north: number,
  south: number,
  east: number,
  west: number,
  tileSize: number = GRID_CONFIG.tileSizeDegrees,
  maxTiles: number = 1000
): GridTile[] {
  const tiles = generateLandTiles({ north, south, east, west }, tileSize);
  
  // Limit tiles for performance
  if (tiles.length > maxTiles) {
    // Use a larger tile size if too many
    const newTileSize = tileSize * 2;
    return generateLandTiles({ north, south, east, west }, newTileSize).slice(0, maxTiles);
  }
  
  return tiles;
}

/**
 * Convert GeoJSON polygon for a tile
 */
export function tileToGeoJSON(tile: GridTile): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {
      id: tile.id,
      region: tile.region,
      areaKm2: tile.areaKm2,
      centerLat: tile.centerLat,
      centerLon: tile.centerLon,
    },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [tile.lon, tile.lat],
        [tile.lonEnd, tile.lat],
        [tile.lonEnd, tile.latEnd],
        [tile.lon, tile.latEnd],
        [tile.lon, tile.lat], // Close the polygon
      ]],
    },
  };
}

/**
 * Convert all tiles to GeoJSON FeatureCollection
 */
export function tilesToGeoJSON(tiles: GridTile[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: tiles.map(tileToGeoJSON),
  };
}
