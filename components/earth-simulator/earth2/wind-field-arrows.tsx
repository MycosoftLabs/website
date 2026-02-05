"use client";

/**
 * Wind Field Arrows Component
 * February 5, 2026
 * 
 * 3D wind vector visualization on CesiumJS globe
 * Fetches real wind data (u10/v10) from Earth-2 API
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface WindFieldArrowsProps {
  viewer: any; // Cesium.Viewer
  visible: boolean;
  forecastHours: number;
  opacity: number;
  altitude?: number;
  density?: "low" | "medium" | "high";
  animated?: boolean;
  colorBySpeed?: boolean;
  onDataLoaded?: (stats: { minSpeed: number; maxSpeed: number; avgSpeed: number }) => void;
}

// Wind speed color scale
const WIND_COLORS = [
  { speed: 0, color: [168, 218, 220] },   // Light blue - calm
  { speed: 5, color: [69, 123, 157] },    // Blue - light
  { speed: 10, color: [29, 53, 87] },     // Dark blue - moderate
  { speed: 15, color: [233, 196, 106] },  // Yellow - fresh
  { speed: 20, color: [244, 162, 97] },   // Orange - strong
  { speed: 25, color: [231, 111, 81] },   // Red-orange - very strong
  { speed: 30, color: [214, 40, 40] },    // Red - near gale
  { speed: 40, color: [157, 2, 8] },      // Dark red - storm
];

function getWindColor(speed: number): [number, number, number] {
  for (let i = WIND_COLORS.length - 1; i >= 0; i--) {
    if (speed >= WIND_COLORS[i].speed) {
      return WIND_COLORS[i].color as [number, number, number];
    }
  }
  return WIND_COLORS[0].color as [number, number, number];
}

export function WindFieldArrows({
  viewer,
  visible,
  forecastHours,
  opacity,
  altitude = 10000,
  density = "medium",
  animated = true,
  colorBySpeed = true,
  onDataLoaded,
}: WindFieldArrowsProps) {
  const entitiesRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef(getEarth2Client());

  const createWindField = useCallback(async () => {
    if (!viewer || !visible) return;

    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    // Clean up existing entities
    entitiesRef.current.forEach((entity) => {
      viewer.entities.remove(entity);
    });
    entitiesRef.current = [];

    // Stop animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsLoading(true);

    try {
      // Get camera view bounds
      const rectangle = viewer.camera.computeViewRectangle();
      const bounds: GeoBounds = rectangle ? {
        north: Math.min(85, Cesium.Math.toDegrees(rectangle.north)),
        south: Math.max(-85, Cesium.Math.toDegrees(rectangle.south)),
        east: Cesium.Math.toDegrees(rectangle.east),
        west: Cesium.Math.toDegrees(rectangle.west),
      } : { north: 85, south: -85, east: 180, west: -180 };

      // Fetch wind vectors from Earth-2 API
      const windData = await clientRef.current.getWindVectors({
        forecastHours,
        bounds,
      });

      // Calculate statistics
      let minSpeed = Infinity, maxSpeed = -Infinity, totalSpeed = 0, count = 0;
      for (const row of windData.speed) {
        for (const s of row) {
          minSpeed = Math.min(minSpeed, s);
          maxSpeed = Math.max(maxSpeed, s);
          totalSpeed += s;
          count++;
        }
      }
      const avgSpeed = count > 0 ? totalSpeed / count : 0;
      onDataLoaded?.({ minSpeed, maxSpeed, avgSpeed });

      // Density settings
      const skipFactor = density === "low" ? 4 : density === "medium" ? 2 : 1;
      
      const latSteps = windData.u.length;
      const lonSteps = windData.u[0]?.length || 1;
      const latStep = (bounds.north - bounds.south) / latSteps;
      const lonStep = (bounds.east - bounds.west) / lonSteps;

      for (let i = 0; i < latSteps; i += skipFactor) {
        for (let j = 0; j < lonSteps; j += skipFactor) {
          const lat = bounds.south + (i + 0.5) * latStep;
          const lon = bounds.west + (j + 0.5) * lonStep;
          
          const u = windData.u[i][j];
          const v = windData.v[i][j];
          const speed = windData.speed[i][j];
          const direction = windData.direction[i][j];

          // Arrow length based on speed
          const arrowLength = 0.5 + (speed / 30) * 2;
          const endLat = lat + arrowLength * Math.sin(direction * Math.PI / 180);
          const endLon = lon + arrowLength * Math.cos(direction * Math.PI / 180) / Math.cos(lat * Math.PI / 180);

          const [r, g, b] = colorBySpeed ? getWindColor(speed) : [100, 180, 255];
          const color = Cesium.Color.fromBytes(r, g, b, Math.round(opacity * 200));

          // Wind arrow polyline
          const arrowEntity = viewer.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                lon, lat, altitude,
                endLon, endLat, altitude,
              ]),
              width: 2 + (speed / 20) * 2,
              material: new Cesium.PolylineArrowMaterialProperty(color),
            },
            properties: {
              type: "wind_vector",
              speed,
              direction,
              u,
              v,
            },
          });
          entitiesRef.current.push(arrowEntity);

          // Wind speed label at high zoom
          if (speed > 15) {
            const labelEntity = viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(lon, lat, altitude + 500),
              label: {
                text: `${speed.toFixed(0)} m/s`,
                font: "10px sans-serif",
                fillColor: Cesium.Color.WHITE,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineWidth: 1,
                outlineColor: Cesium.Color.BLACK,
                pixelOffset: new Cesium.Cartesian2(0, -10),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
              },
            });
            entitiesRef.current.push(labelEntity);
          }
        }
      }

      // Animate wind particles
      if (animated) {
        animateWindParticles(viewer, windData, bounds, altitude, opacity, Cesium, animationRef);
      }

      console.log(`[Earth-2] Wind field: ${entitiesRef.current.length} vectors, speed range=[${minSpeed.toFixed(1)}, ${maxSpeed.toFixed(1)}] m/s`);
    } catch (error) {
      console.error("[Earth-2] Wind field error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [viewer, visible, forecastHours, opacity, altitude, density, animated, colorBySpeed, onDataLoaded]);

  useEffect(() => {
    createWindField();

    return () => {
      entitiesRef.current.forEach((entity) => {
        if (viewer) viewer.entities.remove(entity);
      });
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [createWindField, viewer]);

  return null;
}

// Animate wind particles for visual effect
function animateWindParticles(
  viewer: any,
  windData: { u: number[][]; v: number[][]; speed: number[][] },
  bounds: GeoBounds,
  altitude: number,
  opacity: number,
  Cesium: any,
  animationRef: React.MutableRefObject<number | null>
) {
  const particles: any[] = [];
  const numParticles = 50;
  
  // Create initial particles
  for (let i = 0; i < numParticles; i++) {
    const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
    const lon = bounds.west + Math.random() * (bounds.east - bounds.west);
    
    const particle = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, altitude + 500),
      point: {
        pixelSize: 4,
        color: Cesium.Color.fromCssColorString("rgba(255,255,255,0.6)"),
      },
    });
    
    particles.push({
      entity: particle,
      lat,
      lon,
      age: Math.random() * 100,
    });
  }

  const latSteps = windData.u.length;
  const lonSteps = windData.u[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  const animate = () => {
    particles.forEach((p) => {
      // Get wind at particle position
      const i = Math.floor((p.lat - bounds.south) / latStep);
      const j = Math.floor((p.lon - bounds.west) / lonStep);
      
      if (i >= 0 && i < latSteps && j >= 0 && j < lonSteps) {
        const u = windData.u[i][j];
        const v = windData.v[i][j];
        
        // Move particle
        p.lon += u * 0.0001;
        p.lat += v * 0.0001;
        p.age++;
        
        // Reset if out of bounds or too old
        if (p.lat < bounds.south || p.lat > bounds.north ||
            p.lon < bounds.west || p.lon > bounds.east || p.age > 200) {
          p.lat = bounds.south + Math.random() * (bounds.north - bounds.south);
          p.lon = bounds.west + Math.random() * (bounds.east - bounds.west);
          p.age = 0;
        }
        
        // Update position
        p.entity.position = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, altitude + 500);
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  animationRef.current = requestAnimationFrame(animate);
}

export default WindFieldArrows;
