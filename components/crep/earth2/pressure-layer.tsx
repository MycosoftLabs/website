"use client";

/**
 * Pressure Layer Component
 * February 5, 2026
 * 
 * Renders atmospheric pressure contours (isobars) on MapLibre
 * Uses mean sea level pressure (msl) data from Earth-2
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface PressureLayerProps {
  map: any;
  visible: boolean;
  forecastHours: number;
  opacity: number;
  showLabels?: boolean;
  showHighLow?: boolean;
  onDataLoaded?: (data: { minPressure: number; maxPressure: number }) => void;
}

const CONTOUR_LAYER_ID = "earth2-pressure-contours";
const LABEL_LAYER_ID = "earth2-pressure-labels";
const HL_LAYER_ID = "earth2-pressure-hl";
const SOURCE_ID = "earth2-pressure-source";

// Pressure colors for fill (optional background)
const PRESSURE_COLORS = {
  low: "#5c7cfa",     // Blue for low pressure
  normal: "#868e96",  // Gray for normal
  high: "#ff6b6b",    // Red for high pressure
};

export function PressureLayer({
  map,
  visible,
  forecastHours,
  opacity,
  showLabels = true,
  showHighLow = true,
  onDataLoaded,
}: PressureLayerProps) {
  const layerAddedRef = useRef(false);
  const clientRef = useRef(getEarth2Client());

  const setupLayer = useCallback(async () => {
    if (!map) return;

    try {
      if (map.getLayer(HL_LAYER_ID)) map.removeLayer(HL_LAYER_ID);
      if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
      if (map.getLayer(CONTOUR_LAYER_ID)) map.removeLayer(CONTOUR_LAYER_ID);
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

      // Fetch pressure data (using surface pressure, convert to hPa)
      const { grid, min, max } = await clientRef.current.getWeatherGrid({
        variable: "sp",
        forecastHours,
        bounds,
        resolution: 0.5,
      });

      // Convert Pa to hPa
      const minPressure = min / 100;
      const maxPressure = max / 100;
      onDataLoaded?.({ minPressure, maxPressure });

      // Generate pressure features (contours and H/L markers)
      const pressureData = generatePressureGeoJSON(grid, bounds);
      console.log(`[Earth-2] Pressure: ${pressureData.features.length} features, range=${minPressure.toFixed(0)}-${maxPressure.toFixed(0)} hPa`);

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: pressureData,
      });

      // Add contour lines
      map.addLayer({
        id: CONTOUR_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "type"], "contour"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["==", ["get", "major"], true], 2,
            1,
          ],
          "line-opacity": opacity * 0.7,
          "line-dasharray": [
            "case",
            ["==", ["get", "major"], true],
            ["literal", [1]],
            ["literal", [2, 2]],
          ],
        },
      });

      // Add pressure labels
      if (showLabels) {
        map.addLayer({
          id: LABEL_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["==", ["get", "type"], "label"],
          layout: {
            "text-field": ["concat", ["get", "pressure"], " hPa"],
            "text-size": 10,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "symbol-placement": "point",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 1,
            "text-opacity": opacity,
          },
        });
      }

      // Add High/Low markers
      if (showHighLow) {
        map.addLayer({
          id: HL_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["in", ["get", "type"], ["literal", ["high", "low"]]],
          layout: {
            "text-field": ["get", "symbol"],
            "text-size": 24,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": [
              "case",
              ["==", ["get", "type"], "high"], "#ff6b6b",
              "#5c7cfa",
            ],
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-opacity": opacity,
          },
        });
      }

      layerAddedRef.current = true;
    } catch (error) {
      console.error("[Earth-2] Pressure layer error:", error);
    }
  }, [map, visible, forecastHours, opacity, showLabels, showHighLow, onDataLoaded]);

  useEffect(() => {
    if (!map) return;
    if (map.isStyleLoaded()) {
      setupLayer();
    } else {
      map.once("style.load", setupLayer);
    }
    return () => {
      try {
        if (map?.getLayer?.(HL_LAYER_ID)) map.removeLayer(HL_LAYER_ID);
        if (map?.getLayer?.(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
        if (map?.getLayer?.(CONTOUR_LAYER_ID)) map.removeLayer(CONTOUR_LAYER_ID);
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map, visible, forecastHours, setupLayer]);

  useEffect(() => {
    if (!map) return;
    try {
      if (map.getLayer(CONTOUR_LAYER_ID)) {
        map.setPaintProperty(CONTOUR_LAYER_ID, "line-opacity", opacity * 0.7);
      }
      if (map.getLayer(LABEL_LAYER_ID)) {
        map.setPaintProperty(LABEL_LAYER_ID, "text-opacity", opacity);
      }
      if (map.getLayer(HL_LAYER_ID)) {
        map.setPaintProperty(HL_LAYER_ID, "text-opacity", opacity);
      }
    } catch {}
  }, [map, opacity]);

  return null;
}

function generatePressureGeoJSON(
  grid: number[][],
  bounds: GeoBounds
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = grid.length;
  const lonSteps = grid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  // Find local minima (Low pressure) and maxima (High pressure)
  const threshold = 3; // Grid cells to check around
  
  for (let i = threshold; i < latSteps - threshold; i += 4) {
    for (let j = threshold; j < lonSteps - threshold; j += 4) {
      const centerValue = grid[i][j] / 100; // Convert to hPa
      const lat = bounds.south + (i + 0.5) * latStep;
      const lon = bounds.west + (j + 0.5) * lonStep;

      // Check if this is a local minimum or maximum
      let isMin = true;
      let isMax = true;
      
      for (let di = -threshold; di <= threshold; di++) {
        for (let dj = -threshold; dj <= threshold; dj++) {
          if (di === 0 && dj === 0) continue;
          const neighborValue = grid[i + di]?.[j + dj] / 100;
          if (neighborValue !== undefined) {
            if (neighborValue <= centerValue) isMin = false;
            if (neighborValue >= centerValue) isMax = false;
          }
        }
      }

      if (isMin && centerValue < 1010) {
        features.push({
          type: "Feature",
          properties: {
            type: "low",
            symbol: "L",
            pressure: Math.round(centerValue),
          },
          geometry: { type: "Point", coordinates: [lon, lat] },
        });
      }

      if (isMax && centerValue > 1020) {
        features.push({
          type: "Feature",
          properties: {
            type: "high",
            symbol: "H",
            pressure: Math.round(centerValue),
          },
          geometry: { type: "Point", coordinates: [lon, lat] },
        });
      }

      // Add pressure labels at regular intervals
      if (i % 8 === 0 && j % 8 === 0) {
        features.push({
          type: "Feature",
          properties: {
            type: "label",
            pressure: Math.round(centerValue),
          },
          geometry: { type: "Point", coordinates: [lon, lat] },
        });
      }
    }
  }

  // Generate simplified isobar contours
  const contourLevels = [980, 990, 1000, 1010, 1013, 1020, 1030, 1040];
  
  for (let i = 0; i < latSteps - 1; i++) {
    for (let j = 0; j < lonSteps - 1; j++) {
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;
      const value = grid[i][j] / 100;
      const nextValue = grid[i][j + 1] ? grid[i][j + 1] / 100 : value;

      for (const level of contourLevels) {
        if ((value <= level && nextValue >= level) || (value >= level && nextValue <= level)) {
          const isMajor = level % 10 === 0;
          features.push({
            type: "Feature",
            properties: {
              type: "contour",
              level,
              major: isMajor,
              color: level < 1013 ? "#5c7cfa" : "#ff6b6b",
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [lon, lat],
                [lon + lonStep, lat + latStep * 0.5],
              ],
            },
          });
        }
      }
    }
  }

  return { type: "FeatureCollection", features };
}

export function PressureLegend() {
  return (
    <div className="bg-black/80 rounded px-2 py-1.5 text-[10px]">
      <div className="text-gray-300 mb-1">Pressure (hPa)</div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-blue-400 font-bold">L</span>
          <span className="text-gray-400">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-400 font-bold">H</span>
          <span className="text-gray-400">High</span>
        </div>
      </div>
    </div>
  );
}

export default PressureLayer;
