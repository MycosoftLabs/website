/**
 * Cluster Aggregator - February 6, 2026
 * 
 * Clusters nearby points for efficient rendering.
 */

export interface Point {
  id: string;
  lat: number;
  lng: number;
  properties?: Record<string, any>;
}

export interface Cluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  points: Point[];
  properties: Record<string, any>;
}

export interface ClusterOptions {
  radius: number;  // km
  minPoints?: number;
  maxZoom?: number;
}

/**
 * Simple grid-based clustering
 */
export function clusterPoints(
  points: Point[],
  options: ClusterOptions
): Cluster[] {
  const { radius, minPoints = 1 } = options;
  const clusters: Map<string, Cluster> = new Map();
  
  // Convert radius to grid cell size (approximate degrees)
  const cellSize = radius / 111;  // ~111km per degree at equator
  
  for (const point of points) {
    // Calculate grid cell
    const cellX = Math.floor(point.lng / cellSize);
    const cellY = Math.floor(point.lat / cellSize);
    const cellKey = `${cellX}:${cellY}`;
    
    if (clusters.has(cellKey)) {
      const cluster = clusters.get(cellKey)!;
      cluster.points.push(point);
      cluster.count++;
      
      // Update centroid
      cluster.lat = cluster.points.reduce((sum, p) => sum + p.lat, 0) / cluster.count;
      cluster.lng = cluster.points.reduce((sum, p) => sum + p.lng, 0) / cluster.count;
    } else {
      clusters.set(cellKey, {
        id: `cluster-${cellKey}`,
        lat: point.lat,
        lng: point.lng,
        count: 1,
        points: [point],
        properties: {},
      });
    }
  }
  
  // Filter by min points
  return Array.from(clusters.values()).filter(c => c.count >= minPoints);
}

/**
 * K-means clustering for better distribution
 */
export function kMeansCluster(
  points: Point[],
  k: number,
  iterations: number = 10
): Cluster[] {
  if (points.length <= k) {
    return points.map((p, i) => ({
      id: `cluster-${i}`,
      lat: p.lat,
      lng: p.lng,
      count: 1,
      points: [p],
      properties: {},
    }));
  }
  
  // Initialize centroids randomly
  const shuffled = [...points].sort(() => Math.random() - 0.5);
  let centroids = shuffled.slice(0, k).map(p => ({ lat: p.lat, lng: p.lng }));
  
  let assignments: number[] = new Array(points.length).fill(0);
  
  for (let iter = 0; iter < iterations; iter++) {
    // Assign points to nearest centroid
    for (let i = 0; i < points.length; i++) {
      let minDist = Infinity;
      let nearest = 0;
      
      for (let j = 0; j < centroids.length; j++) {
        const dist = haversineDistance(
          points[i].lat, points[i].lng,
          centroids[j].lat, centroids[j].lng
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = j;
        }
      }
      assignments[i] = nearest;
    }
    
    // Update centroids
    const newCentroids = centroids.map(() => ({ lat: 0, lng: 0, count: 0 }));
    
    for (let i = 0; i < points.length; i++) {
      const cluster = assignments[i];
      newCentroids[cluster].lat += points[i].lat;
      newCentroids[cluster].lng += points[i].lng;
      newCentroids[cluster].count++;
    }
    
    centroids = newCentroids.map(c => ({
      lat: c.count > 0 ? c.lat / c.count : 0,
      lng: c.count > 0 ? c.lng / c.count : 0,
    }));
  }
  
  // Build final clusters
  const clusters: Cluster[] = centroids.map((c, i) => ({
    id: `cluster-${i}`,
    lat: c.lat,
    lng: c.lng,
    count: 0,
    points: [],
    properties: {},
  }));
  
  for (let i = 0; i < points.length; i++) {
    const cluster = assignments[i];
    clusters[cluster].points.push(points[i]);
    clusters[cluster].count++;
  }
  
  return clusters.filter(c => c.count > 0);
}

function haversineDistance(
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

export default { clusterPoints, kMeansCluster };