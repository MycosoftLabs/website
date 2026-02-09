/**
 * Heatmap Generator - February 6, 2026
 * 
 * Generates heatmap data from point distributions.
 */

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight?: number;
}

export interface HeatmapOptions {
  radius: number;      // Influence radius in pixels
  maxIntensity?: number;
  gradient?: Record<number, string>;
}

export interface HeatmapData {
  points: HeatmapPoint[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  maxWeight: number;
}

const DEFAULT_GRADIENT: Record<number, string> = {
  0.0: '#0000ff',
  0.25: '#00ffff',
  0.5: '#00ff00',
  0.75: '#ffff00',
  1.0: '#ff0000',
};

/**
 * Prepare points for heatmap rendering
 */
export function prepareHeatmapData(
  points: HeatmapPoint[],
  options?: Partial<HeatmapOptions>
): HeatmapData {
  if (points.length === 0) {
    return {
      points: [],
      bounds: { north: 90, south: -90, east: 180, west: -180 },
      maxWeight: 0,
    };
  }
  
  // Calculate bounds and max weight
  let north = -90, south = 90, east = -180, west = 180;
  let maxWeight = 0;
  
  for (const point of points) {
    if (point.lat > north) north = point.lat;
    if (point.lat < south) south = point.lat;
    if (point.lng > east) east = point.lng;
    if (point.lng < west) west = point.lng;
    
    const weight = point.weight || 1;
    if (weight > maxWeight) maxWeight = weight;
  }
  
  return {
    points: points.map(p => ({
      lat: p.lat,
      lng: p.lng,
      weight: p.weight || 1,
    })),
    bounds: { north, south, east, west },
    maxWeight,
  };
}

/**
 * Generate heatmap canvas for Leaflet/Mapbox
 */
export function generateHeatmapCanvas(
  data: HeatmapData,
  width: number,
  height: number,
  options: HeatmapOptions
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;
  
  const { radius, maxIntensity = data.maxWeight, gradient = DEFAULT_GRADIENT } = options;
  const { bounds } = data;
  
  // Draw each point
  for (const point of data.points) {
    const x = ((point.lng - bounds.west) / (bounds.east - bounds.west)) * width;
    const y = ((bounds.north - point.lat) / (bounds.north - bounds.south)) * height;
    
    const intensity = (point.weight || 1) / maxIntensity;
    
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Apply color gradient
  const imageData = ctx.getImageData(0, 0, width, height);
  const gradientColors = createGradientLookup(gradient);
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i + 3];
    if (alpha > 0) {
      const color = gradientColors[Math.min(255, alpha)];
      imageData.data[i] = color.r;
      imageData.data[i + 1] = color.g;
      imageData.data[i + 2] = color.b;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function createGradientLookup(
  gradient: Record<number, string>
): Array<{ r: number; g: number; b: number }> {
  const lookup: Array<{ r: number; g: number; b: number }> = [];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [stop, color] of Object.entries(gradient)) {
    grad.addColorStop(parseFloat(stop), color);
  }
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  
  const imageData = ctx.getImageData(0, 0, 256, 1).data;
  for (let i = 0; i < 256; i++) {
    lookup.push({
      r: imageData[i * 4],
      g: imageData[i * 4 + 1],
      b: imageData[i * 4 + 2],
    });
  }
  
  return lookup;
}

export default { prepareHeatmapData, generateHeatmapCanvas };