"use client";

/**
 * Trajectory Lines Component for CREP Dashboard
 * 
 * Renders animated trajectory lines for aircraft (airport-to-airport)
 * and vessels (port-to-port) on the MapLibre map.
 * Uses useMap() hook to access the MapLibre map instance.
 */

import { useEffect, useRef, useMemo } from "react";
import { useMap } from "@/components/ui/map";
import { getAirport, hasAirport } from "@/lib/data/airports";
import type { AircraftEntity, VesselEntity } from "@/types/oei";

interface TrajectoryLinesProps {
  aircraft?: AircraftEntity[];
  vessels?: VesselEntity[];
  showFlightPaths?: boolean;
  showShipRoutes?: boolean;
}

// Major world ports for vessel trajectory rendering
const PORTS: Record<string, { lat: number; lng: number; name: string }> = {
  "OAKLAND CA": { lat: 37.7952, lng: -122.2782, name: "Port of Oakland" },
  "LONG BEACH CA": { lat: 33.7544, lng: -118.2166, name: "Port of Long Beach" },
  "SAN DIEGO CA": { lat: 32.6789, lng: -117.1089, name: "Port of San Diego" },
  "SAUSALITO CA": { lat: 37.8591, lng: -122.4853, name: "Sausalito Harbor" },
  "SF BAY": { lat: 37.8199, lng: -122.4783, name: "San Francisco Bay" },
  "MONTEREY CA": { lat: 36.6051, lng: -121.8942, name: "Monterey Harbor" },
  "NEW YORK NY": { lat: 40.6892, lng: -74.0445, name: "Port of New York" },
  "MIAMI FL": { lat: 25.7617, lng: -80.1918, name: "Port of Miami" },
  "HOUSTON TX": { lat: 29.7604, lng: -95.3698, name: "Port of Houston" },
  "ROTTERDAM NL": { lat: 51.9496, lng: 4.1453, name: "Port of Rotterdam" },
  "SOUTHAMPTON UK": { lat: 50.9097, lng: -1.4044, name: "Port of Southampton" },
  "ABERDEEN UK": { lat: 57.1497, lng: -2.0943, name: "Port of Aberdeen" },
  "HAMBURG DE": { lat: 53.5511, lng: 9.9937, name: "Port of Hamburg" },
  "SHANGHAI CN": { lat: 31.2304, lng: 121.4737, name: "Port of Shanghai" },
  "BUSAN KR": { lat: 35.1028, lng: 129.0403, name: "Port of Busan" },
  "TOKYO JP": { lat: 35.6584, lng: 139.7454, name: "Port of Tokyo" },
  "SINGAPORE SG": { lat: 1.2655, lng: 103.8200, name: "Port of Singapore" },
  "SUEZ EG": { lat: 29.9668, lng: 32.5498, name: "Port of Suez" },
  "BAHRAIN BH": { lat: 26.2361, lng: 50.5860, name: "Port of Bahrain" },
  "SANTOS BR": { lat: -23.9618, lng: -46.3322, name: "Port of Santos" },
  "PUNTA ARENAS CL": { lat: -53.1548, lng: -70.9111, name: "Port of Punta Arenas" },
  "CAPE TOWN ZA": { lat: -33.9249, lng: 18.4241, name: "Port of Cape Town" },
  "VALLETTA MT": { lat: 35.8989, lng: 14.5146, name: "Port of Valletta" },
  "SYDNEY AU": { lat: -33.8688, lng: 151.2093, name: "Port of Sydney" },
  "CAIRNS AU": { lat: -16.9186, lng: 145.7781, name: "Port of Cairns" },
};

// Calculate great circle path points
function getGreatCirclePoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  numPoints: number = 50
): [number, number][] {
  const points: [number, number][] = [];
  
  const lat1 = (start.lat * Math.PI) / 180;
  const lon1 = (start.lng * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;
  const lon2 = (end.lng * Math.PI) / 180;
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    
    const d = 2 * Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );
    
    if (d === 0) {
      points.push([start.lng, start.lat]);
      continue;
    }
    
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    
    const lat = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2));
    const lon = Math.atan2(y, x);
    
    points.push([(lon * 180) / Math.PI, (lat * 180) / Math.PI]);
  }
  
  return points;
}

export function TrajectoryLines({
  aircraft = [],
  vessels = [],
  showFlightPaths = true,
  showShipRoutes = true,
}: TrajectoryLinesProps) {
  const { map, isLoaded } = useMap();
  const sourceAddedRef = useRef(false);

  // Calculate flight trajectory GeoJSON
  const flightTrajectories = useMemo(() => {
    if (!showFlightPaths) return { type: "FeatureCollection" as const, features: [] };
    
    const features = aircraft
      .filter(a => a.origin && a.destination && hasAirport(a.origin) && hasAirport(a.destination))
      .slice(0, 100) // Limit for performance
      .map(a => {
        const origin = getAirport(a.origin!);
        const dest = getAirport(a.destination!);
        
        if (!origin || !dest) return null;
        
        // Get current position
        const currentLng = a.location?.longitude ?? (a.location?.coordinates?.[0]);
        const currentLat = a.location?.latitude ?? (a.location?.coordinates?.[1]);
        
        if (typeof currentLng !== "number" || typeof currentLat !== "number") return null;
        
        // Create path from current position to destination (remaining route)
        const pathPoints = getGreatCirclePoints(
          { lat: currentLat, lng: currentLng },
          { lat: dest.lat, lng: dest.lng },
          30
        );
        
        return {
          type: "Feature" as const,
          properties: {
            flightId: a.id,
            callsign: a.callsign || a.name,
            origin: a.origin,
            destination: a.destination,
            altitude: a.altitude,
            type: "flight",
          },
          geometry: {
            type: "LineString" as const,
            coordinates: pathPoints,
          },
        };
      })
      .filter(Boolean);
    
    return { type: "FeatureCollection" as const, features };
  }, [aircraft, showFlightPaths]);

  // Calculate ship trajectory GeoJSON
  const shipTrajectories = useMemo(() => {
    if (!showShipRoutes) return { type: "FeatureCollection" as const, features: [] };
    
    const features = vessels
      .filter(v => v.destination && v.destination in PORTS)
      .slice(0, 50) // Limit for performance
      .map(v => {
        const dest = PORTS[v.destination || ""];
        
        if (!dest) return null;
        
        // Get current position
        const currentLng = v.location?.longitude ?? (v.location?.coordinates?.[0]);
        const currentLat = v.location?.latitude ?? (v.location?.coordinates?.[1]);
        
        if (typeof currentLng !== "number" || typeof currentLat !== "number") return null;
        
        // Create path from current position to destination port
        const pathPoints = getGreatCirclePoints(
          { lat: currentLat, lng: currentLng },
          { lat: dest.lat, lng: dest.lng },
          20
        );
        
        return {
          type: "Feature" as const,
          properties: {
            vesselId: v.id,
            name: v.name,
            destination: v.destination,
            mmsi: v.mmsi,
            type: "ship",
          },
          geometry: {
            type: "LineString" as const,
            coordinates: pathPoints,
          },
        };
      })
      .filter(Boolean);
    
    return { type: "FeatureCollection" as const, features };
  }, [vessels, showShipRoutes]);

  // Add/update trajectory layers on map
  useEffect(() => {
    if (!map || !isLoaded) return;

    const setupLayers = () => {
      // Flight trajectories
      if (!map.getSource("flight-trajectories")) {
        map.addSource("flight-trajectories", {
          type: "geojson",
          data: flightTrajectories as GeoJSON.FeatureCollection,
        });
        
        map.addLayer({
          id: "flight-trajectory-lines",
          type: "line",
          source: "flight-trajectories",
          paint: {
            "line-color": "#ff69b4", // Pink to match aircraft markers
            "line-width": 1.5,
            "line-opacity": 0.6,
            "line-dasharray": [4, 4], // Dotted line
          },
        });
      } else {
        (map.getSource("flight-trajectories") as maplibregl.GeoJSONSource).setData(
          flightTrajectories as GeoJSON.FeatureCollection
        );
      }

      // Ship trajectories
      if (!map.getSource("ship-trajectories")) {
        map.addSource("ship-trajectories", {
          type: "geojson",
          data: shipTrajectories as GeoJSON.FeatureCollection,
        });
        
        map.addLayer({
          id: "ship-trajectory-lines",
          type: "line",
          source: "ship-trajectories",
          paint: {
            "line-color": "#00ffff", // Cyan to match vessel markers
            "line-width": 2,
            "line-opacity": 0.5,
            "line-dasharray": [6, 3], // Dashed line
          },
        });
      } else {
        (map.getSource("ship-trajectories") as maplibregl.GeoJSONSource).setData(
          shipTrajectories as GeoJSON.FeatureCollection
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
          if (map.getLayer("flight-trajectory-lines")) {
            map.removeLayer("flight-trajectory-lines");
          }
          if (map.getSource("flight-trajectories")) {
            map.removeSource("flight-trajectories");
          }
          if (map.getLayer("ship-trajectory-lines")) {
            map.removeLayer("ship-trajectory-lines");
          }
          if (map.getSource("ship-trajectories")) {
            map.removeSource("ship-trajectories");
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [map, isLoaded, flightTrajectories, shipTrajectories]);

  // Toggle visibility based on props
  useEffect(() => {
    if (!map || !isLoaded || !sourceAddedRef.current) return;

    try {
      if (map.getLayer("flight-trajectory-lines")) {
        map.setLayoutProperty(
          "flight-trajectory-lines",
          "visibility",
          showFlightPaths ? "visible" : "none"
        );
      }
      if (map.getLayer("ship-trajectory-lines")) {
        map.setLayoutProperty(
          "ship-trajectory-lines",
          "visibility",
          showShipRoutes ? "visible" : "none"
        );
      }
    } catch {
      // Layer might not exist yet
    }
  }, [map, isLoaded, showFlightPaths, showShipRoutes]);

  // This component doesn't render any DOM elements
  // It only manipulates the MapLibre map instance
  return null;
}
