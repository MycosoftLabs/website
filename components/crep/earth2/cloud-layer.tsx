"use client";

/**
 * Cloud Cover Layer Component
 * February 5, 2026
 * 
 * Renders cloud cover visualization on MapLibre
 * Uses total column water vapor (tcwv) and humidity data
 * 
 * FIXED: Proper source management and realistic cloud visualization
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface CloudLayerProps {
  map: any;
  visible: boolean;
  forecastHours: number;
  opacity: number;
  onDataLoaded?: (data: { coverage: number }) => void;
}

const LAYER_ID = "earth2-clouds";
const SOURCE_ID = "earth2-clouds-source";

// Debounce helper
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function CloudLayer({
  map,
  visible,
  forecastHours,
  opacity,
  onDataLoaded,
}: CloudLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const clientRef = useRef(getEarth2Client());
  
  const debouncedHours = useDebouncedValue(forecastHours, 300);

  const updateData = useCallback(async () => {
    if (!map || !visible) return;
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;

    try {
      const mapBounds = map.getBounds();
      const bounds: GeoBounds = {
        north: Math.min(85, mapBounds.getNorth()),
        south: Math.max(-85, mapBounds.getSouth()),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      };

      const { grid, min, max } = await clientRef.current.getWeatherGrid({
        variable: "tcwv",
        forecastHours: debouncedHours,
        bounds,
        resolution: 0.5,
      });

      const cloudData = generateCloudGeoJSON(grid, bounds, min, max);
      
      let cloudyPixels = 0;
      for (const row of grid) {
        for (const val of row) {
          if (val > 25) cloudyPixels++;
        }
      }
      const coverage = (cloudyPixels / (grid.length * (grid[0]?.length || 1))) * 100;
      onDataLoaded?.({ coverage });

      // Check if source exists - UPDATE it
      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(cloudData);
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: cloudData,
        });

        map.addLayer({
          id: LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": ["*", ["get", "cloudOpacity"], opacity * 0.8],
          },
        });
      }

      layerAddedRef.current = true;
    } catch (error) {
      console.error("[Earth-2] Cloud layer error:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, debouncedHours, opacity, onDataLoaded]);

  useEffect(() => {
    if (!map) return;
    const handleSetup = () => {
      if (visible) {
        updateData();
      } else {
        try {
          if (map.getLayer(LAYER_ID)) {
            map.setLayoutProperty(LAYER_ID, "visibility", "none");
          }
        } catch {}
      }
    };

    if (map.isStyleLoaded()) {
      handleSetup();
    } else {
      map.once("style.load", handleSetup);
    }
  }, [map, visible, updateData]);

  useEffect(() => {
    if (visible && map && layerAddedRef.current) {
      updateData();
    }
  }, [debouncedHours, visible, map, updateData]);

  useEffect(() => {
    if (!map) return;
    try {
      if (map.getLayer(LAYER_ID)) {
        map.setLayoutProperty(LAYER_ID, "visibility", visible ? "visible" : "none");
      }
    } catch {}
  }, [map, visible]);

  useEffect(() => {
    if (map?.getLayer?.(LAYER_ID)) {
      try {
        map.setPaintProperty(LAYER_ID, "fill-opacity", ["*", ["get", "cloudOpacity"], opacity * 0.8]);
      } catch {}
    }
  }, [map, opacity]);

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

// Generate cloud colors based on density/type
function getCloudColor(value: number, density: number): string {
  // Clouds range from bright white (thin) to gray (thick storm clouds)
  if (density > 0.8) return "#9ca3af"; // Dark gray - storm clouds
  if (density > 0.6) return "#d1d5db"; // Medium gray - thick clouds
  if (density > 0.4) return "#e5e7eb"; // Light gray - cumulus
  return "#f3f4f6"; // Very light - cirrus/thin clouds
}

function generateCloudGeoJSON(
  grid: number[][],
  bounds: GeoBounds,
  min: number,
  max: number
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = grid.length;
  const lonSteps = grid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;
  
  // Normalize range
  const range = Math.max(1, max - min);

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = grid[i][j];
      // Convert humidity to cloud density (0-70 kg/m² range)
      const normalizedValue = (value - min) / range;
      const cloudDensity = Math.min(1, Math.max(0, (value - 20) / 45));
      
      if (cloudDensity < 0.15) continue; // Skip clear areas

      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;
      
      // Vary cloud appearance based on density
      const color = getCloudColor(value, cloudDensity);
      const cloudOpacity = 0.3 + cloudDensity * 0.5; // Range 0.3-0.8

      features.push({
        type: "Feature",
        properties: {
          value: Math.round(value * 10) / 10,
          color,
          cloudOpacity,
          density: Math.round(cloudDensity * 100),
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

export default CloudLayer;
