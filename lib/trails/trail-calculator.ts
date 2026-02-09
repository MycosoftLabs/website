/**
 * Trail Calculator - February 6, 2026
 * 
 * Calculates trail paths and transformations.
 */

import type { TrailPoint } from './trail-renderer';

export interface TrailMetrics {
  totalDistance: number;  // km
  avgSpeed: number;       // km/h
  maxSpeed: number;       // km/h
  minAltitude: number;
  maxAltitude: number;
  duration: number;       // ms
}

/**
 * Calculate distance between two points (Haversine)
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Calculate trail metrics
 */
export function calculateTrailMetrics(points: TrailPoint[]): TrailMetrics {
  if (points.length === 0) {
    return {
      totalDistance: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      minAltitude: 0,
      maxAltitude: 0,
      duration: 0,
    };
  }
  
  let totalDistance = 0;
  let maxSpeed = 0;
  let minAltitude = Infinity;
  let maxAltitude = -Infinity;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    totalDistance += dist;
    
    const dt = (curr.timestamp - prev.timestamp) / 3600000;  // hours
    if (dt > 0) {
      const speed = dist / dt;
      if (speed > maxSpeed) maxSpeed = speed;
    }
    
    if (curr.altitude !== undefined) {
      if (curr.altitude < minAltitude) minAltitude = curr.altitude;
      if (curr.altitude > maxAltitude) maxAltitude = curr.altitude;
    }
  }
  
  const duration = points[points.length - 1].timestamp - points[0].timestamp;
  const avgSpeed = duration > 0 ? totalDistance / (duration / 3600000) : 0;
  
  return {
    totalDistance,
    avgSpeed,
    maxSpeed,
    minAltitude: minAltitude === Infinity ? 0 : minAltitude,
    maxAltitude: maxAltitude === -Infinity ? 0 : maxAltitude,
    duration,
  };
}

/**
 * Smooth trail points using moving average
 */
export function smoothTrail(
  points: TrailPoint[],
  windowSize: number = 3
): TrailPoint[] {
  if (points.length <= windowSize) return points;
  
  const smoothed: TrailPoint[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length - 1, i + halfWindow);
    
    let sumLat = 0, sumLng = 0, sumAlt = 0, altCount = 0;
    
    for (let j = start; j <= end; j++) {
      sumLat += points[j].lat;
      sumLng += points[j].lng;
      if (points[j].altitude !== undefined) {
        sumAlt += points[j].altitude;
        altCount++;
      }
    }
    
    const count = end - start + 1;
    smoothed.push({
      lat: sumLat / count,
      lng: sumLng / count,
      timestamp: points[i].timestamp,
      altitude: altCount > 0 ? sumAlt / altCount : points[i].altitude,
      speed: points[i].speed,
    });
  }
  
  return smoothed;
}

/**
 * Simplify trail using Ramer-Douglas-Peucker algorithm
 */
export function simplifyTrail(
  points: TrailPoint[],
  epsilon: number = 0.0001
): TrailPoint[] {
  if (points.length <= 2) return points;
  
  let maxDist = 0;
  let maxIdx = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  if (maxDist > epsilon) {
    const left = simplifyTrail(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyTrail(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  
  return [start, end];
}

function perpendicularDistance(
  point: TrailPoint,
  lineStart: TrailPoint,
  lineEnd: TrailPoint
): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  
  const norm = Math.sqrt(dx * dx + dy * dy);
  if (norm === 0) return haversineDistance(point.lat, point.lng, lineStart.lat, lineStart.lng);
  
  return Math.abs(
    dy * point.lng - dx * point.lat + lineEnd.lng * lineStart.lat - lineEnd.lat * lineStart.lng
  ) / norm;
}

export default {
  haversineDistance,
  calculateBearing,
  calculateTrailMetrics,
  smoothTrail,
  simplifyTrail,
};