"use client";

/**
 * Weather Heatmap Layer Component
 * February 5, 2026
 * 
 * Renders temperature/precipitation overlay on MapLibre using fill layers
 * Fetches real data from Earth-2 API with intelligent fallback
 * 
 * FIXED: Proper source management to prevent flickering
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type WeatherVariable, type GeoBounds } from "@/lib/earth2/client";

interface WeatherHeatmapLayerProps {
  map: any; // MapLibre Map instance
  visible: boolean;
  variable: "temperature" | "precipitation" | "humidity";
  forecastHours: number;
  opacity: number;
  model?: "atlas-era5" | "stormscope" | "corrdiff" | "fourcastnet";
  onDataLoaded?: (data: { min: number; max: number; variable: string }) => void;
  onError?: (error: string) => void;
}

const LAYER_ID = "earth2-weather-heatmap";
const SOURCE_ID = "earth2-weather-source";

// Debounce helper
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Color scales for different variables (NOAA-style)
const COLOR_SCALES = {
  temperature: [
    { value: -40, color: "#1a0033" },
    { value: -30, color: "#313695" },
    { value: -20, color: "#4575b4" },
    { value: -10, color: "#74add1" },
    { value: 0, color: "#abd9e9" },
    { value: 10, color: "#e0f3f8" },
    { value: 15, color: "#ffffbf" },
    { value: 20, color: "#fee090" },
    { value: 25, color: "#fdae61" },
    { value: 30, color: "#f46d43" },
    { value: 35, color: "#d73027" },
    { value: 40, color: "#a50026" },
    { value: 50, color: "#67001f" },
  ],
  precipitation: [
    { value: 0, color: "rgba(255,255,255,0)" },
    { value: 0.1, color: "#c6e6f2" },
    { value: 1, color: "#9ecae1" },
    { value: 2.5, color: "#6baed6" },
    { value: 5, color: "#4292c6" },
    { value: 10, color: "#2171b5" },
    { value: 15, color: "#08519c" },
    { value: 25, color: "#08306b" },
    { value: 50, color: "#041f4a" },
  ],
  humidity: [
    { value: 0, color: "#fff5eb" },
    { value: 20, color: "#fee6ce" },
    { value: 40, color: "#fdd0a2" },
    { value: 60, color: "#fdae6b" },
    { value: 80, color: "#fd8d3c" },
    { value: 90, color: "#e6550d" },
    { value: 100, color: "#a63603" },
  ],
};

// Map UI variable to API variable
const VARIABLE_MAP: Record<string, WeatherVariable> = {
  temperature: "t2m",
  precipitation: "tp",
  humidity: "tcwv",
};

function getColorForValue(value: number, scale: { value: number; color: string }[]): string {
  for (let i = scale.length - 1; i >= 0; i--) {
    if (value >= scale[i].value) {
      if (i === scale.length - 1) return scale[i].color;
      // Interpolate between this and next color
      return scale[i].color;
    }
  }
  return scale[0].color;
}

export function WeatherHeatmapLayer({
  map,
  visible,
  variable,
  forecastHours,
  opacity,
  model = "atlas-era5",
  onDataLoaded,
  onError,
}: WeatherHeatmapLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const lastFetchKey = useRef("");
  const clientRef = useRef(getEarth2Client());
  
  // Debounce forecastHours to prevent rapid updates during timeline scrubbing
  const debouncedHours = useDebouncedValue(forecastHours, 300);
  
  // Update data function - uses setData() for existing sources
  const updateData = useCallback(async () => {
    if (!map || !visible) return;
    if (fetchingRef.current) return; // Prevent concurrent fetches
    
    const fetchKey = `${variable}-${debouncedHours}`;
    if (fetchKey === lastFetchKey.current && layerAddedRef.current) return;
    
    fetchingRef.current = true;

    try {
      const mapBounds = map.getBounds();
      const bounds: GeoBounds = {
        north: Math.min(85, mapBounds.getNorth()),
        south: Math.max(-85, mapBounds.getSouth()),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      };

      const apiVariable = VARIABLE_MAP[variable] || "t2m";
      
      const { grid, min, max } = await clientRef.current.getWeatherGrid({
        variable: apiVariable,
        forecastHours: debouncedHours,
        bounds,
        resolution: 0.5,
      });

      const weatherData = generateWeatherGeoJSON(grid, bounds, variable, min, max);

      // Check if source exists - UPDATE it, don't recreate
      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(weatherData);
      } else {
        // First time - create source and layer
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: weatherData,
        });

        const layerConfig = {
          id: LAYER_ID,
          type: "fill" as const,
          source: SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": opacity * 0.65,
          },
        };
        
        try {
          if (map.getLayer("waterway")) {
            map.addLayer(layerConfig, "waterway");
          } else {
            map.addLayer(layerConfig);
          }
        } catch {
          map.addLayer(layerConfig);
        }
      }

      layerAddedRef.current = true;
      lastFetchKey.current = fetchKey;
      onDataLoaded?.({ min, max, variable });
    } catch (error) {
      console.error("[Earth-2] Weather layer error:", error);
      onError?.(String(error));
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, variable, debouncedHours, opacity, onDataLoaded, onError]);

  // Initial setup and visibility changes
  useEffect(() => {
    if (!map) return;

    const handleSetup = () => {
      if (visible) {
        updateData();
      } else {
        // Hide layers when not visible
        try {
          if (map.getLayer(LAYER_ID)) {
            map.setLayoutProperty(LAYER_ID, "visibility", "none");
          }
        } catch {}
        layerAddedRef.current = false;
      }
    };

    if (map.isStyleLoaded()) {
      handleSetup();
    } else {
      map.once("style.load", handleSetup);
    }
  }, [map, visible, updateData]);

  // Update when debounced hours change
  useEffect(() => {
    if (visible && map && layerAddedRef.current) {
      updateData();
    }
  }, [debouncedHours, visible, map, updateData]);

  // Show layer when it becomes visible
  useEffect(() => {
    if (!map) return;
    try {
      if (map.getLayer(LAYER_ID)) {
        map.setLayoutProperty(LAYER_ID, "visibility", visible ? "visible" : "none");
      }
    } catch {}
  }, [map, visible]);

  // Update opacity
  useEffect(() => {
    if (map?.getLayer?.(LAYER_ID)) {
      try {
        map.setPaintProperty(LAYER_ID, "fill-opacity", opacity * 0.65);
      } catch {}
    }
  }, [map, opacity]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      try {
        if (map?.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map]);

  return null;
}

// Generate GeoJSON grid from data
function generateWeatherGeoJSON(
  grid: number[][],
  bounds: GeoBounds,
  variable: string,
  dataMin: number,
  dataMax: number
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const scale = COLOR_SCALES[variable as keyof typeof COLOR_SCALES] || COLOR_SCALES.temperature;
  
  const latSteps = grid.length;
  const lonSteps = grid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = grid[i][j];
      const color = getColorForValue(value, scale);
      
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;

      features.push({
        type: "Feature",
        properties: {
          value: Math.round(value * 10) / 10,
          color,
          variable,
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [lon, lat],
            [lon + lonStep, lat],
            [lon + lonStep, lat + latStep],
            [lon, lat + latStep],
            [lon, lat],
          ]],
        },
      });
    }
  }
  
  return { type: "FeatureCollection", features };
}

// Helper component for legend
export function WeatherLegend({
  variable,
  min,
  max,
}: {
  variable: "temperature" | "precipitation" | "humidity";
  min?: number;
  max?: number;
}) {
  const scale = COLOR_SCALES[variable];
  const units = {
    temperature: "°C",
    precipitation: "mm/hr",
    humidity: "kg/m²",
  };

  return (
    <div className="bg-black/80 rounded px-2 py-1.5 text-[10px]">
      <div className="text-emerald-400 mb-1 capitalize flex items-center gap-2">
        <span>{variable}</span>
        {min !== undefined && max !== undefined && (
          <span className="text-gray-400">
            ({min.toFixed(1)} - {max.toFixed(1)} {units[variable]})
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {scale.map((item, i) => (
          <div
            key={i}
            className="w-4 h-3"
            style={{ backgroundColor: item.color }}
            title={`${item.value}${units[variable]}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-gray-500 mt-0.5">
        <span>{scale[0].value}{units[variable]}</span>
        <span>{scale[scale.length - 1].value}{units[variable]}</span>
      </div>
    </div>
  );
}

export default WeatherHeatmapLayer;
