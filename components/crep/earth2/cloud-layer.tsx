"use client";

/**
 * Cloud Cover Layer Component
 * February 4, 2026
 * 
 * Renders animated cloud cover visualization on MapLibre
 * Uses total column water vapor (tcwv) and humidity data
 * 
 * ENHANCED: Cloud movement animation based on wind vectors,
 * volumetric opacity gradients, realistic cloud edges
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface CloudLayerProps {
  map: any;
  visible: boolean;
  forecastHours: number;
  opacity: number;
  showAnimation?: boolean;
  showShadows?: boolean;
  onDataLoaded?: (data: { coverage: number }) => void;
}

const LAYER_ID = "earth2-clouds";
const SHADOW_LAYER_ID = "earth2-clouds-shadow";
const SOURCE_ID = "earth2-clouds-source";
const SHADOW_SOURCE_ID = "earth2-clouds-shadow-source";

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
  showAnimation = true,
  showShadows = true,
  onDataLoaded,
}: CloudLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const cloudDataRef = useRef<{ grid: number[][]; bounds: GeoBounds; min: number; max: number; windData: any[] } | null>(null);
  const phaseRef = useRef(0);
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

      // Fetch cloud data and wind data in parallel
      const [cloudResult, windVectors] = await Promise.all([
        clientRef.current.getWeatherGrid({
          variable: "tcwv",
          forecastHours: debouncedHours,
          bounds,
          resolution: 0.5,
        }),
        clientRef.current.getWindVectors({
          forecastHours: debouncedHours,
          bounds,
          resolution: 1,
        }),
      ]);

      const { grid, min, max } = cloudResult;
      
      // Store data for animation
      cloudDataRef.current = { grid, bounds, min, max, windData: windVectors };

      const cloudData = generateCloudGeoJSON(grid, bounds, min, max, windVectors, phaseRef.current);
      
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

        // Add shadow layer first (renders below clouds)
        if (showShadows) {
          const shadowData = generateShadowGeoJSON(grid, bounds, min, max);
          map.addSource(SHADOW_SOURCE_ID, {
            type: "geojson",
            data: shadowData,
          });
          
          map.addLayer({
            id: SHADOW_LAYER_ID,
            type: "fill",
            source: SHADOW_SOURCE_ID,
            paint: {
              "fill-color": "#000000",
              "fill-opacity": ["*", ["get", "shadowOpacity"], opacity * 0.15],
            },
          });
        }

        // Main cloud layer
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

      // Start animation loop if enabled
      if (showAnimation && !animationRef.current) {
        const animate = () => {
          if (cloudDataRef.current) {
            phaseRef.current += 0.02; // Slow drift
            const { grid, bounds, min, max, windData } = cloudDataRef.current;
            const animatedData = generateCloudGeoJSON(grid, bounds, min, max, windData, phaseRef.current);
            const source = map.getSource(SOURCE_ID);
            if (source) {
              source.setData(animatedData);
            }
          }
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    } catch (error) {
      console.error("[Earth-2] Cloud layer error:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, debouncedHours, opacity, showAnimation, showShadows, onDataLoaded]);

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
          if (map.getLayer(SHADOW_LAYER_ID)) {
            map.setLayoutProperty(SHADOW_LAYER_ID, "visibility", "none");
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
      if (map.getLayer(SHADOW_LAYER_ID)) {
        map.setLayoutProperty(SHADOW_LAYER_ID, "visibility", visible ? "visible" : "none");
      }
    } catch {}
  }, [map, visible]);

  useEffect(() => {
    if (map?.getLayer?.(LAYER_ID)) {
      try {
        map.setPaintProperty(LAYER_ID, "fill-opacity", ["*", ["get", "cloudOpacity"], opacity * 0.8]);
      } catch {}
    }
    if (map?.getLayer?.(SHADOW_LAYER_ID)) {
      try {
        map.setPaintProperty(SHADOW_LAYER_ID, "fill-opacity", ["*", ["get", "shadowOpacity"], opacity * 0.15]);
      } catch {}
    }
  }, [map, opacity]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      try {
        if (map?.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map?.getLayer?.(SHADOW_LAYER_ID)) map.removeLayer(SHADOW_LAYER_ID);
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
        if (map?.getSource?.(SHADOW_SOURCE_ID)) map.removeSource(SHADOW_SOURCE_ID);
      } catch {}
    };
  }, [map]);

  return null;
}

// Generate cloud colors based on density/type with volumetric gradients
function getCloudColor(value: number, density: number, phase: number): string {
  // Add subtle variation based on phase for volumetric effect
  const variation = Math.sin(phase + value * 0.1) * 5;
  
  // Clouds range from bright white (thin) to gray (thick storm clouds)
  if (density > 0.8) {
    const gray = Math.floor(156 + variation);
    return `rgb(${gray}, ${gray + 3}, ${gray + 7})`; // Dark gray - storm clouds, slight blue tint
  }
  if (density > 0.6) {
    const gray = Math.floor(209 + variation);
    return `rgb(${gray}, ${gray + 2}, ${gray + 5})`;
  }
  if (density > 0.4) {
    const gray = Math.floor(229 + variation);
    return `rgb(${gray}, ${gray + 2}, ${gray + 4})`;
  }
  const gray = Math.floor(243 + variation);
  return `rgb(${gray}, ${gray + 1}, ${gray + 2})`; // Very light - cirrus/thin clouds
}

function generateCloudGeoJSON(
  grid: number[][],
  bounds: GeoBounds,
  min: number,
  max: number,
  windData: any[],
  phase: number
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = grid.length;
  const lonSteps = grid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;
  
  // Normalize range
  const range = Math.max(1, max - min);

  // Calculate average wind for cloud drift
  let avgWindU = 0, avgWindV = 0;
  if (windData.length > 0) {
    windData.forEach(w => {
      const rad = (w.direction || 0) * Math.PI / 180;
      avgWindU += Math.sin(rad) * (w.speed || 0);
      avgWindV += Math.cos(rad) * (w.speed || 0);
    });
    avgWindU /= windData.length;
    avgWindV /= windData.length;
  }
  
  // Drift offset based on wind and phase
  const driftLon = avgWindU * phase * 0.0001;
  const driftLat = avgWindV * phase * 0.0001;

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = grid[i][j];
      // Convert humidity to cloud density (0-70 kg/m² range)
      const cloudDensity = Math.min(1, Math.max(0, (value - 20) / 45));
      
      if (cloudDensity < 0.15) continue; // Skip clear areas

      // Base position with wind drift animation
      const baseLat = bounds.south + i * latStep;
      const baseLon = bounds.west + j * lonStep;
      
      const lat = baseLat + driftLat;
      const lon = baseLon + driftLon;
      
      // Add edge variation for more natural cloud shapes
      const edgeVariation = Math.sin(i * 0.5 + j * 0.7 + phase) * 0.1;
      const adjustedStep = latStep * (1 + edgeVariation * 0.2);
      
      // Volumetric opacity - pulsing effect for depth
      const volumetricPulse = Math.sin(phase * 2 + i * 0.3 + j * 0.4) * 0.05;
      const cloudOpacity = (0.3 + cloudDensity * 0.5 + volumetricPulse);
      
      // Vary cloud appearance based on density with phase
      const color = getCloudColor(value, cloudDensity, phase);

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
            [lon + lonStep, lat + adjustedStep],
            [lon, lat + adjustedStep],
            [lon, lat],
          ]],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

// Generate shadow layer (offset from clouds to simulate sun angle)
function generateShadowGeoJSON(
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
  
  // Shadow offset (sun from southeast)
  const shadowOffsetLat = -latStep * 0.3;
  const shadowOffsetLon = lonStep * 0.3;

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = grid[i][j];
      const cloudDensity = Math.min(1, Math.max(0, (value - 20) / 45));
      
      if (cloudDensity < 0.3) continue; // Only thick clouds cast shadows

      const lat = bounds.south + i * latStep + shadowOffsetLat;
      const lon = bounds.west + j * lonStep + shadowOffsetLon;
      
      const shadowOpacity = cloudDensity * 0.5; // Darker shadows for thicker clouds

      features.push({
        type: "Feature",
        properties: {
          shadowOpacity,
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

// Cloud legend component
export function CloudLegend({ coverage }: { coverage: number }) {
  return (
    <div className="bg-black/80 rounded px-3 py-2 text-xs space-y-1">
      <div className="text-gray-300 font-medium">Cloud Cover</div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-3 rounded" style={{ background: "linear-gradient(to right, #f3f4f6, #9ca3af)" }} />
        <span className="text-gray-400">Thin → Storm</span>
      </div>
      <div className="text-gray-400">
        Coverage: <span className="text-white">{coverage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default CloudLayer;
