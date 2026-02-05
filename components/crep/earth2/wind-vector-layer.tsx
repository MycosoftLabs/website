"use client";

/**
 * Wind Vector Layer Component
 * February 5, 2026
 * 
 * Renders wind direction and speed on MapLibre using symbol layers
 * Fetches real wind data from Earth-2 API (u10, v10 components)
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface WindVectorLayerProps {
  map: any; // MapLibre Map instance
  visible: boolean;
  forecastHours: number;
  opacity: number;
  animated?: boolean;
  density?: "low" | "medium" | "high";
  showSpeedColors?: boolean;
  onDataLoaded?: (stats: { minSpeed: number; maxSpeed: number; avgSpeed: number }) => void;
}

const LAYER_ID = "earth2-wind-vectors";
const STREAM_LAYER_ID = "earth2-wind-streams";
const SOURCE_ID = "earth2-wind-source";

// Wind speed color scale (Beaufort scale inspired)
const SPEED_COLORS = [
  { speed: 0, color: "#a8dadc" },    // Calm
  { speed: 5, color: "#457b9d" },    // Light breeze
  { speed: 10, color: "#1d3557" },   // Gentle breeze
  { speed: 15, color: "#e9c46a" },   // Moderate breeze
  { speed: 20, color: "#f4a261" },   // Fresh breeze
  { speed: 25, color: "#e76f51" },   // Strong breeze
  { speed: 30, color: "#d62828" },   // Near gale
  { speed: 40, color: "#9d0208" },   // Storm
];

function getWindColor(speed: number): string {
  for (let i = SPEED_COLORS.length - 1; i >= 0; i--) {
    if (speed >= SPEED_COLORS[i].speed) {
      return SPEED_COLORS[i].color;
    }
  }
  return SPEED_COLORS[0].color;
}

export function WindVectorLayer({
  map,
  visible,
  forecastHours,
  opacity,
  animated = true,
  density = "medium",
  showSpeedColors = true,
  onDataLoaded,
}: WindVectorLayerProps) {
  const layerAddedRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef(getEarth2Client());
  
  const setupLayer = useCallback(async () => {
    if (!map) return;
    
    // Remove existing layers/source
    try {
      if (map.getLayer(STREAM_LAYER_ID)) map.removeLayer(STREAM_LAYER_ID);
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch {
      // Ignore cleanup errors
    }

    // Stop animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (!visible) {
      layerAddedRef.current = false;
      return;
    }

    setIsLoading(true);

    try {
      // Get current map bounds
      const mapBounds = map.getBounds();
      const bounds: GeoBounds = {
        north: Math.min(85, mapBounds.getNorth()),
        south: Math.max(-85, mapBounds.getSouth()),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      };

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
      const avgSpeed = totalSpeed / count;
      onDataLoaded?.({ minSpeed, maxSpeed, avgSpeed });

      // Convert to GeoJSON
      const geoJsonData = windToGeoJSON(windData, bounds, density);

      // Add GeoJSON source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geoJsonData,
      });

      // Add wind streamlines (subtle lines showing flow direction)
      if (animated) {
        map.addLayer({
          id: STREAM_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          filter: ["==", ["geometry-type"], "LineString"],
          paint: {
            "line-color": showSpeedColors ? ["get", "color"] : "#4a9eda",
            "line-width": [
              "interpolate",
              ["linear"],
              ["get", "speed"],
              0, 1,
              15, 2,
              30, 3,
            ],
            "line-opacity": opacity * 0.4,
          },
        });
      }

      // Add arrow symbols
      map.addLayer({
        id: LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "Point"],
        layout: {
          "symbol-placement": "point",
          "text-field": "→",
          "text-size": [
            "interpolate",
            ["linear"],
            ["get", "speed"],
            0, 14,
            15, 20,
            30, 28,
          ],
          "text-rotate": ["get", "rotation"],
          "text-rotation-alignment": "map",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": showSpeedColors ? ["get", "color"] : "#4a9eda",
          "text-opacity": opacity,
          "text-halo-color": "rgba(0,0,0,0.6)",
          "text-halo-width": 1,
        },
      });

      layerAddedRef.current = true;
      console.log(`[Earth-2] Wind vectors: ${geoJsonData.features.length} points, ${forecastHours}h, speed range=[${minSpeed.toFixed(1)}, ${maxSpeed.toFixed(1)}] m/s`);
    } catch (error) {
      console.error("[Earth-2] Wind vector error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [map, visible, forecastHours, opacity, animated, density, showSpeedColors, onDataLoaded]);

  useEffect(() => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      setupLayer();
    } else {
      map.once("style.load", setupLayer);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      try {
        if (map?.getLayer?.(STREAM_LAYER_ID)) map.removeLayer(STREAM_LAYER_ID);
        if (map?.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [map, visible, forecastHours, density, setupLayer]);

  // Update opacity
  useEffect(() => {
    if (!map) return;
    try {
      if (map.getLayer(LAYER_ID)) {
        map.setPaintProperty(LAYER_ID, "text-opacity", opacity);
      }
      if (map.getLayer(STREAM_LAYER_ID)) {
        map.setPaintProperty(STREAM_LAYER_ID, "line-opacity", opacity * 0.4);
      }
    } catch {
      // Ignore
    }
  }, [map, opacity]);

  return null;
}

// Convert wind data to GeoJSON
function windToGeoJSON(
  windData: { u: number[][]; v: number[][]; speed: number[][]; direction: number[][] },
  bounds: GeoBounds,
  density: "low" | "medium" | "high"
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  const latSteps = windData.u.length;
  const lonSteps = windData.u[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  // Density settings
  const skipFactor = density === "low" ? 3 : density === "medium" ? 2 : 1;

  for (let i = 0; i < latSteps; i += skipFactor) {
    for (let j = 0; j < lonSteps; j += skipFactor) {
      const lat = bounds.south + (i + 0.5) * latStep;
      const lon = bounds.west + (j + 0.5) * lonStep;
      
      const u = windData.u[i][j];
      const v = windData.v[i][j];
      const speed = windData.speed[i][j];
      const direction = windData.direction[i][j];
      
      // MapLibre rotates clockwise from east, so we need to adjust
      const rotation = 90 - direction;
      const color = getWindColor(speed);

      // Add arrow point
      features.push({
        type: "Feature",
        properties: {
          u: Math.round(u * 10) / 10,
          v: Math.round(v * 10) / 10,
          speed: Math.round(speed * 10) / 10,
          direction: Math.round(direction),
          rotation,
          color,
        },
        geometry: {
          type: "Point",
          coordinates: [lon, lat],
        },
      });

      // Add streamline
      const lineLength = 0.5 + (speed / 30) * 1.5; // Longer lines for stronger winds
      const endLat = lat + lineLength * Math.sin(direction * Math.PI / 180);
      const endLon = lon + lineLength * Math.cos(direction * Math.PI / 180) / Math.cos(lat * Math.PI / 180);

      features.push({
        type: "Feature",
        properties: { speed, color },
        geometry: {
          type: "LineString",
          coordinates: [[lon, lat], [endLon, endLat]],
        },
      });
    }
  }
  
  return { type: "FeatureCollection", features };
}

// Wind legend component
export function WindLegend() {
  return (
    <div className="bg-black/80 rounded px-2 py-1.5 text-[10px]">
      <div className="text-emerald-400 mb-1">Wind Speed (m/s)</div>
      <div className="flex items-center gap-0.5">
        {SPEED_COLORS.map((item, i) => (
          <div
            key={i}
            className="w-4 h-3"
            style={{ backgroundColor: item.color }}
            title={`≥${item.speed} m/s`}
          />
        ))}
      </div>
      <div className="flex justify-between text-gray-500 mt-0.5">
        <span>Calm</span>
        <span>Storm</span>
      </div>
    </div>
  );
}

export default WindVectorLayer;
