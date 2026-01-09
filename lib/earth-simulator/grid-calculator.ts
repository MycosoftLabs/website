/**
 * Grid Calculator for Earth Simulator
 * 
 * Calculates 1ft x 1ft grid cells based on zoom level and viewport.
 * Uses Web Mercator projection for accurate grid calculations.
 */

export interface Viewport {
  north: number;
  south: number;
  east: number;
  west: number;
  width: number;
  height: number;
}

export interface GridCell {
  id: string;
  centerLat: number;
  centerLon: number;
  north: number;
  south: number;
  east: number;
  west: number;
  zoomLevel: number;
  sizeMeters: number;
}

/**
 * Calculate meters per pixel at a given zoom level
 * Based on Web Mercator projection
 */
export function metersPerPixel(latitude: number, zoomLevel: number): number {
  const earthCircumference = 40075017; // meters
  const pixelsAtZoom0 = 256;
  const pixelsAtZoom = pixelsAtZoom0 * Math.pow(2, zoomLevel);
  const metersPerPixelAtEquator = earthCircumference / pixelsAtZoom;
  
  // Adjust for latitude (Web Mercator)
  return metersPerPixelAtEquator * Math.cos((latitude * Math.PI) / 180);
}

/**
 * Calculate grid cells for a viewport
 * Returns 1ft x 1ft grid cells visible in the viewport
 */
export function calculateGridCells(
  viewport: Viewport,
  zoomLevel: number
): GridCell[] {
  const cells: GridCell[] = [];
  
  // 1ft = 0.3048 meters
  const gridSizeMeters = 0.3048;
  
  // Calculate meters per pixel at center latitude
  const centerLat = (viewport.north + viewport.south) / 2;
  const mpp = metersPerPixel(centerLat, zoomLevel);
  
  // Calculate how many pixels = 1 grid cell
  const pixelsPerCell = gridSizeMeters / mpp;
  
  // Only show grid if zoomed in enough (at least 10 pixels per cell)
  if (pixelsPerCell < 10) {
    return cells; // Too zoomed out, don't show grid
  }
  
  // Calculate grid cell size in degrees
  // Approximate: 1 degree latitude ≈ 111,320 meters
  // 1 degree longitude ≈ 111,320 * cos(latitude) meters
  const latStep = gridSizeMeters / 111320;
  const lonStep = gridSizeMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));
  
  // Calculate number of cells in viewport
  const latRange = viewport.north - viewport.south;
  const lonRange = viewport.east - viewport.west;
  const cellsLat = Math.ceil(latRange / latStep);
  const cellsLon = Math.ceil(lonRange / lonStep);
  
  // Generate grid cells
  for (let i = 0; i < cellsLat; i++) {
    for (let j = 0; j < cellsLon; j++) {
      const cellNorth = viewport.south + (i + 1) * latStep;
      const cellSouth = viewport.south + i * latStep;
      const cellWest = viewport.west + j * lonStep;
      const cellEast = viewport.west + (j + 1) * lonStep;
      
      const centerLat = (cellNorth + cellSouth) / 2;
      const centerLon = (cellEast + cellWest) / 2;
      
      // Generate unique cell ID
      const cellId = `${centerLat.toFixed(8)}_${centerLon.toFixed(8)}_${zoomLevel}`;
      
      cells.push({
        id: cellId,
        centerLat,
        centerLon,
        north: cellNorth,
        south: cellSouth,
        east: cellEast,
        west: cellWest,
        zoomLevel,
        sizeMeters: gridSizeMeters,
      });
    }
  }
  
  return cells;
}

/**
 * Get grid cell ID from coordinates
 */
export function getCellId(
  lat: number,
  lon: number,
  zoomLevel: number
): string {
  // Round to grid cell center
  const gridSizeMeters = 0.3048;
  const latStep = gridSizeMeters / 111320;
  const lonStep = gridSizeMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  
  const cellLat = Math.floor(lat / latStep) * latStep + latStep / 2;
  const cellLon = Math.floor(lon / lonStep) * lonStep + lonStep / 2;
  
  return `${cellLat.toFixed(8)}_${cellLon.toFixed(8)}_${zoomLevel}`;
}

/**
 * Get viewport bounds from center point and zoom level
 */
export function getViewportFromCenter(
  centerLat: number,
  centerLon: number,
  zoomLevel: number,
  width: number,
  height: number
): Viewport {
  const mpp = metersPerPixel(centerLat, zoomLevel);
  const metersWidth = (width * mpp) / 2;
  const metersHeight = (height * mpp) / 2;
  
  // Convert meters to degrees
  const latRange = metersHeight / 111320;
  const lonRange = metersWidth / (111320 * Math.cos((centerLat * Math.PI) / 180));
  
  return {
    north: centerLat + latRange,
    south: centerLat - latRange,
    east: centerLon + lonRange,
    west: centerLon - lonRange,
    width,
    height,
  };
}
