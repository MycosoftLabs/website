"use client";

/**
 * Cloud Cover Layer Component
 * February 5, 2026
 * 
 * Renders cloud cover visualization on MapLibre
 * Uses total column water vapor (tcwv) and humidity data
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

export function CloudLayer({
  map,
  visible,
  forecastHours,
  opacity,
  onDataLoaded,
}: CloudLayerProps) {
  const layerAddedRef = useRef(false);
  const clientRef = useRef(getEarth2Client());

  const setupLayer = useCallback(async () => {
    if (!map) return;

    try {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch {}

    if (!visible) {
      layerAddedRef.current = false;
      return;
    }

    try {
      const mapBounds = map.getBounds();
      const bounds: GeoBounds = {
        north: Math.min(85, mapBounds.getNorth()),
        south: Math.max(-85, mapBounds.getSouth()),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      };

      // Fetch humidity/water vapor data for cloud visualization
      const { grid, min, max } = await clientRef.current.getWeatherGrid({
        variable: "tcwv",
        forecastHours,
        bounds,
        resolution: 0.5,
      });

      // Generate cloud GeoJSON
      const cloudData = generateCloudGeoJSON(grid, bounds, min, max);
      
      // Calculate coverage percentage
      let cloudyPixels = 0;
      for (const row of grid) {
        for (const val of row) {
          if (val > 25) cloudyPixels++; // >25 kg/m² = cloudy
        }
      }
      const coverage = (cloudyPixels / (grid.length * (grid[0]?.length || 1))) * 100;
      onDataLoaded?.({ coverage });

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
          "fill-opacity": ["*", ["get", "opacity"], opacity],
        },
      });

      layerAddedRef.current = true;
      console.log(`[Earth-2] Cloud layer: ${cloudData.features.length} cells, ${coverage.toFixed(1)}% coverage`);
    } catch (error) {
      console.error("[Earth-2] Cloud layer error:", error);
    }
  }, [map, visible, forecastHours, opacity, onDataLoaded]);

  useEffect(() => {
    if (!map) return;
    if (map.isStyleLoaded()) {
      setupLayer();
    } else {
      map.once("style.load", setupLayer);
    }
    return () => {
      try {
        if (map?.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map, visible, forecastHours, setupLayer]);

  useEffect(() => {
    if (map?.getLayer?.(LAYER_ID)) {
      try {
        map.setPaintProperty(LAYER_ID, "fill-opacity", ["*", ["get", "opacity"], opacity]);
      } catch {}
    }
  }, [map, opacity]);

  return null;
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

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = grid[i][j];
      // Convert humidity to cloud opacity (0-70 kg/m² range)
      const cloudOpacity = Math.min(1, Math.max(0, (value - 15) / 50));
      
      if (cloudOpacity < 0.1) continue; // Skip clear areas

      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;

      features.push({
        type: "Feature",
        properties: {
          value,
          color: "#ffffff",
          opacity: cloudOpacity * 0.7,
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
