"use client";

/**
 * Satellite Orbit Lines Component for CREP Dashboard
 * 
 * Renders satellite ground tracks (orbit projections) on the MapLibre map.
 * Shows the orbital path of satellites based on their orbital parameters.
 * Uses useMap() hook to access the MapLibre map instance.
 */

import { useEffect, useRef, useMemo } from "react";
import { useMap } from "@/components/ui/map";
import type { SatelliteEntity } from "@/lib/oei/connectors/satellite-tracking";

interface SatelliteOrbitLinesProps {
  satellites?: SatelliteEntity[];
  showOrbits?: boolean;
  showSelected?: string | null; // If provided, only show orbit for this satellite ID
}

/**
 * Calculate ground track points for a satellite orbit
 * Based on simplified orbital mechanics
 */
function calculateGroundTrack(
  satellite: SatelliteEntity,
  numPoints: number = 100
): [number, number][] {
  const points: [number, number][] = [];
  
  const periodMinutes = satellite.orbitalParams?.period || 90;
  const inclination = satellite.orbitalParams?.inclination || 45;
  
  // Get current position
  const currentLng = satellite.estimatedPosition?.longitude ?? satellite.location?.longitude ?? 0;
  const currentLat = satellite.estimatedPosition?.latitude ?? satellite.location?.latitude ?? 0;
  
  // Earth rotation rate in degrees per minute
  const earthRotationRate = 360 / 1440; // 1440 minutes per day
  
  // Orbital angular velocity in degrees per minute
  const orbitalRate = 360 / periodMinutes;
  
  // Calculate ground track for one full orbit
  for (let i = -numPoints / 2; i <= numPoints / 2; i++) {
    const t = i / (numPoints / 2); // -1 to 1
    const orbitAngle = t * 180; // -180 to 180 degrees in orbit
    
    // Simplified latitude calculation based on inclination
    const lat = inclination * Math.sin((orbitAngle * Math.PI) / 180);
    
    // Simplified longitude calculation
    // Account for Earth rotation vs satellite motion
    const effectiveRate = orbitalRate - earthRotationRate;
    const lngOffset = (orbitAngle / orbitalRate) * effectiveRate;
    let lng = currentLng + lngOffset;
    
    // Wrap longitude to -180 to 180
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    
    // Clamp latitude
    const clampedLat = Math.max(-85, Math.min(85, lat));
    
    points.push([lng, clampedLat]);
  }
  
  return points;
}

/**
 * Get orbit color based on satellite type
 */
function getOrbitColor(satellite: SatelliteEntity): string {
  const orbitType = satellite.orbitType?.toUpperCase() || "";
  const objectType = satellite.objectType?.toLowerCase() || "";
  
  if (objectType.includes("station")) return "#fbbf24"; // amber for space stations
  if (objectType.includes("weather")) return "#3b82f6"; // blue for weather
  if (objectType.includes("navigation") || objectType.includes("gps")) return "#22c55e"; // green for GPS
  if (objectType.includes("communication") || objectType.includes("starlink")) return "#06b6d4"; // cyan for comms
  if (objectType.includes("debris") || objectType.includes("rocket")) return "#ef4444"; // red for debris
  if (orbitType.includes("GEO")) return "#a855f7"; // purple for geostationary
  if (orbitType.includes("MEO")) return "#3b82f6"; // blue for medium orbit
  if (orbitType.includes("LEO")) return "#22c55e"; // green for low orbit
  
  return "#8b5cf6"; // default purple
}

export function SatelliteOrbitLines({
  satellites = [],
  showOrbits = true,
  showSelected = null,
}: SatelliteOrbitLinesProps) {
  const { map, isLoaded } = useMap();
  const sourceAddedRef = useRef(false);

  // Calculate orbit GeoJSON for all satellites or selected satellite
  const orbitGeoJSON = useMemo(() => {
    if (!showOrbits) return { type: "FeatureCollection" as const, features: [] };
    
    // Filter satellites to render orbits for
    let satsToRender = satellites
      .filter(s => s.estimatedPosition || s.location)
      .filter(s => s.orbitalParams?.period && s.orbitalParams?.inclination);
    
    // If a specific satellite is selected, only show that one
    if (showSelected) {
      satsToRender = satsToRender.filter(s => s.id === showSelected);
    } else {
      // Otherwise, limit to important satellites (space stations, selected, etc.)
      // to avoid visual clutter
      satsToRender = satsToRender
        .filter(s => {
          const objType = s.objectType?.toLowerCase() || "";
          const name = s.name?.toLowerCase() || "";
          // Only show orbits for notable satellites
          return (
            objType.includes("station") ||
            name.includes("iss") ||
            name.includes("tiangong") ||
            name.includes("hubble") ||
            name.includes("james webb") ||
            name.includes("goes") ||
            name.includes("noaa")
          );
        })
        .slice(0, 10); // Maximum 10 orbits to avoid clutter
    }
    
    const features = satsToRender.map(sat => {
      const trackPoints = calculateGroundTrack(sat);
      const color = getOrbitColor(sat);
      
      return {
        type: "Feature" as const,
        properties: {
          satelliteId: sat.id,
          name: sat.name,
          orbitType: sat.orbitType,
          objectType: sat.objectType,
          color,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: trackPoints,
        },
      };
    });
    
    return { type: "FeatureCollection" as const, features };
  }, [satellites, showOrbits, showSelected]);

  // Add/update orbit layers on map
  useEffect(() => {
    if (!map || !isLoaded) return;

    const setupLayers = () => {
      // Satellite orbit ground tracks
      if (!map.getSource("satellite-orbits")) {
        map.addSource("satellite-orbits", {
          type: "geojson",
          data: orbitGeoJSON as GeoJSON.FeatureCollection,
        });
        
        // Add orbit line layer
        map.addLayer({
          id: "satellite-orbit-lines",
          type: "line",
          source: "satellite-orbits",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 1.5,
            "line-opacity": 0.4,
            "line-dasharray": [8, 4], // Dashed line
          },
        });
        
        // Add glow effect layer
        map.addLayer({
          id: "satellite-orbit-glow",
          type: "line",
          source: "satellite-orbits",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 4,
            "line-opacity": 0.15,
            "line-blur": 3,
          },
        }, "satellite-orbit-lines"); // Insert below the main line
      } else {
        (map.getSource("satellite-orbits") as maplibregl.GeoJSONSource).setData(
          orbitGeoJSON as GeoJSON.FeatureCollection
        );
      }

      sourceAddedRef.current = true;
    };

    if (map.loaded()) {
      setupLayers();
    } else {
      map.on("load", setupLayers);
    }

    return () => {
      // Cleanup layers and sources on unmount
      if (map && sourceAddedRef.current) {
        try {
          if (map.getLayer("satellite-orbit-glow")) {
            map.removeLayer("satellite-orbit-glow");
          }
          if (map.getLayer("satellite-orbit-lines")) {
            map.removeLayer("satellite-orbit-lines");
          }
          if (map.getSource("satellite-orbits")) {
            map.removeSource("satellite-orbits");
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [map, isLoaded, orbitGeoJSON]);

  // Toggle visibility based on props
  useEffect(() => {
    if (!map || !isLoaded || !sourceAddedRef.current) return;

    try {
      if (map.getLayer("satellite-orbit-lines")) {
        map.setLayoutProperty(
          "satellite-orbit-lines",
          "visibility",
          showOrbits ? "visible" : "none"
        );
      }
      if (map.getLayer("satellite-orbit-glow")) {
        map.setLayoutProperty(
          "satellite-orbit-glow",
          "visibility",
          showOrbits ? "visible" : "none"
        );
      }
    } catch {
      // Layer might not exist yet
    }
  }, [map, isLoaded, showOrbits]);

  // This component doesn't render any DOM elements
  // It only manipulates the MapLibre map instance
  return null;
}
