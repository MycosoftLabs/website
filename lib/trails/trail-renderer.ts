/**
 * Trail Renderer - February 6, 2026
 * 
 * Renders entity movement trails with fading effects.
 */

export interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: number;  // Unix ms
  altitude?: number;
  speed?: number;
}

export interface TrailStyle {
  type: 'fading_line' | 'dotted_path' | 'wake' | 'orbit_arc';
  color: string | ((point: TrailPoint, index: number) => string);
  width: number;
  fadeDuration: number;  // ms
  dashArray?: number[];
}

export interface Trail {
  id: string;
  entityType: string;
  points: TrailPoint[];
  style: TrailStyle;
}

export const DEFAULT_STYLES: Record<string, TrailStyle> = {
  aircraft: {
    type: 'fading_line',
    color: '#3b82f6',
    width: 2,
    fadeDuration: 5 * 60 * 1000,  // 5 minutes
  },
  vessel: {
    type: 'wake',
    color: '#10b981',
    width: 3,
    fadeDuration: 30 * 60 * 1000,  // 30 minutes
  },
  satellite: {
    type: 'orbit_arc',
    color: '#8b5cf6',
    width: 1,
    fadeDuration: 90 * 60 * 1000,  // 90 minutes (full orbit)
    dashArray: [5, 5],
  },
  wildlife: {
    type: 'dotted_path',
    color: '#f59e0b',
    width: 1,
    fadeDuration: 24 * 60 * 60 * 1000,  // 24 hours
    dashArray: [2, 4],
  },
};

/**
 * Calculate opacity based on age
 */
export function calculateOpacity(
  pointTime: number,
  currentTime: number,
  fadeDuration: number
): number {
  const age = currentTime - pointTime;
  if (age <= 0) return 1;
  if (age >= fadeDuration) return 0;
  return 1 - (age / fadeDuration);
}

/**
 * Get color with gradient based on altitude or speed
 */
export function getGradientColor(
  point: TrailPoint,
  entityType: string,
  colorBy: 'altitude' | 'speed' | 'time'
): string {
  const baseColor = DEFAULT_STYLES[entityType]?.color || '#3b82f6';
  
  if (colorBy === 'altitude' && point.altitude !== undefined) {
    // Blue (low) -> Green (mid) -> Red (high)
    const normalizedAlt = Math.min(point.altitude / 40000, 1);  // Max ~40km
    
    if (normalizedAlt < 0.5) {
      const t = normalizedAlt * 2;
      return `rgb(${Math.round(59 * (1-t))}, ${Math.round(130 + 125 * t)}, ${Math.round(246 * (1-t) + 100 * t)})`;
    } else {
      const t = (normalizedAlt - 0.5) * 2;
      return `rgb(${Math.round(255 * t)}, ${Math.round(255 * (1-t))}, ${Math.round(100 * (1-t))})`;
    }
  }
  
  if (colorBy === 'speed' && point.speed !== undefined) {
    // Slow = green, fast = red
    const normalizedSpeed = Math.min(point.speed / 500, 1);  // Max ~500 knots
    return `rgb(${Math.round(255 * normalizedSpeed)}, ${Math.round(200 * (1 - normalizedSpeed))}, 50)`;
  }
  
  return typeof baseColor === 'string' ? baseColor : baseColor(point, 0);
}

/**
 * Prepare trail segments for rendering
 */
export function prepareTrailSegments(
  trail: Trail,
  currentTime: number = Date.now()
): Array<{
  start: TrailPoint;
  end: TrailPoint;
  opacity: number;
  color: string;
}> {
  const segments: Array<{
    start: TrailPoint;
    end: TrailPoint;
    opacity: number;
    color: string;
  }> = [];
  
  const { points, style } = trail;
  if (points.length < 2) return segments;
  
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    
    const opacity = calculateOpacity(start.timestamp, currentTime, style.fadeDuration);
    if (opacity <= 0) continue;
    
    const color = typeof style.color === 'function' 
      ? style.color(start, i)
      : style.color;
    
    segments.push({ start, end, opacity, color });
  }
  
  return segments;
}

/**
 * Interpolate position at specific time
 */
export function interpolatePosition(
  trail: Trail,
  targetTime: number
): TrailPoint | null {
  const { points } = trail;
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];
  
  // Find surrounding points
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    if (targetTime >= p1.timestamp && targetTime <= p2.timestamp) {
      const t = (targetTime - p1.timestamp) / (p2.timestamp - p1.timestamp);
      
      return {
        lat: p1.lat + (p2.lat - p1.lat) * t,
        lng: p1.lng + (p2.lng - p1.lng) * t,
        timestamp: targetTime,
        altitude: p1.altitude !== undefined && p2.altitude !== undefined
          ? p1.altitude + (p2.altitude - p1.altitude) * t
          : undefined,
        speed: p1.speed !== undefined && p2.speed !== undefined
          ? p1.speed + (p2.speed - p1.speed) * t
          : undefined,
      };
    }
  }
  
  // Return last point if target is after trail
  if (targetTime > points[points.length - 1].timestamp) {
    return points[points.length - 1];
  }
  
  return points[0];
}

export default {
  DEFAULT_STYLES,
  calculateOpacity,
  getGradientColor,
  prepareTrailSegments,
  interpolatePosition,
};