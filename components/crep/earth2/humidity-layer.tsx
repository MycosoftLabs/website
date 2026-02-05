"use client";

/**
 * Humidity Layer Component
 * February 5, 2026
 * 
 * Renders relative humidity visualization on MapLibre
 * Uses Earth-2 2m relative humidity (r2) or derived from dewpoint
 */

import { useEffect, useRef, useCallback } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface HumidityLayerProps {
  map: any;
  visible: boolean;
  forecastHours: number;
  opacity: number;
  onDataLoaded?: (data: { avgHumidity: number; minHumidity: number; maxHumidity: number }) => void;
}

const LAYER_ID = "earth2-humidity";
const SOURCE_ID = "earth2-humidity-source";

// Humidity color scale (dry to humid)
const HUMIDITY_COLORS = [
  { value: 0, color: "#8b4513" },    // Saddlebrown - very dry
  { value: 20, color: "#d2691e" },   // Chocolate - dry
  { value: 40, color: "#f0e68c" },   // Khaki - moderate
  { value: 60, color: "#90ee90" },   // Light green - comfortable
  { value: 75, color: "#20b2aa" },   // Light sea green - humid
  { value: 85, color: "#4169e1" },   // Royal blue - very humid
  { value: 95, color: "#00008b" },   // Dark blue - saturated
];

function getHumidityColor(value: number): string {
  for (let i = HUMIDITY_COLORS.length - 1; i >= 0; i--) {
    if (value >= HUMIDITY_COLORS[i].value) {
      if (i === HUMIDITY_COLORS.length - 1) return HUMIDITY_COLORS[i].color;
      
      // Interpolate between colors
      const t = (value - HUMIDITY_COLORS[i].value) / 
                (HUMIDITY_COLORS[i + 1].value - HUMIDITY_COLORS[i].value);
      return interpolateColor(HUMIDITY_COLORS[i].color, HUMIDITY_COLORS[i + 1].color, t);
    }
  }
  return HUMIDITY_COLORS[0].color;
}

function interpolateColor(color1: string, color2: string, t: number): string {
  // Simple hex color interpolation
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;
  
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function getHumidityLabel(value: number): string {
  if (value >= 95) return "Saturated";
  if (value >= 85) return "Very Humid";
  if (value >= 75) return "Humid";
  if (value >= 60) return "Comfortable";
  if (value >= 40) return "Moderate";
  if (value >= 20) return "Dry";
  return "Very Dry";
}

export function HumidityLayer({
  map,
  visible,
  forecastHours,
  opacity,
  onDataLoaded,
}: HumidityLayerProps) {
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

      console.log(`[Earth-2] Fetching humidity data: ${forecastHours}h forecast`);

      // Fetch humidity data (using tcwv as proxy for humidity visualization)
      const { grid, min, max } = await clientRef.current.getWeatherGrid({
        variable: "tcwv",
        forecastHours,
        bounds,
        resolution: 0.5,
      });

      // Convert tcwv (0-70 kg/m²) to humidity percentage (0-100%)
      const humidityGrid = grid.map(row => 
        row.map(val => Math.min(100, (val / 60) * 100))
      );

      // Calculate statistics
      let sum = 0;
      let minH = 100;
      let maxH = 0;
      let count = 0;

      for (const row of humidityGrid) {
        for (const val of row) {
          sum += val;
          minH = Math.min(minH, val);
          maxH = Math.max(maxH, val);
          count++;
        }
      }

      const avgHumidity = count > 0 ? sum / count : 0;
      onDataLoaded?.({ avgHumidity, minHumidity: minH, maxHumidity: maxH });

      // Generate humidity GeoJSON
      const humidityData = generateHumidityGeoJSON(humidityGrid, bounds);
      console.log(`[Earth-2] Humidity: ${humidityData.features.length} cells, range=${minH.toFixed(0)}-${maxH.toFixed(0)}%`);

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: humidityData,
      });

      // Add layer with beforeId to ensure proper layering
      const layerConfig: any = {
        id: LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": opacity * 0.55,
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

      layerAddedRef.current = true;
    } catch (error) {
      console.error("[Earth-2] Humidity layer error:", error);
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
        map.setPaintProperty(LAYER_ID, "fill-opacity", opacity * 0.55);
      } catch {}
    }
  }, [map, opacity]);

  return null;
}

function generateHumidityGeoJSON(
  grid: number[][],
  bounds: GeoBounds
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = grid.length;
  const lonSteps = grid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = grid[i][j];
      const color = getHumidityColor(value);
      const label = getHumidityLabel(value);
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;

      features.push({
        type: "Feature",
        properties: {
          value: Math.round(value),
          color,
          label,
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

export function HumidityLegend() {
  return (
    <div className="bg-black/80 rounded px-2 py-1.5 text-[10px]">
      <div className="text-cyan-400 mb-1">Humidity (%)</div>
      <div className="flex items-center gap-0.5">
        {HUMIDITY_COLORS.map((item, i) => (
          <div
            key={i}
            className="w-3 h-3"
            style={{ backgroundColor: item.color }}
            title={`${item.value}%`}
          />
        ))}
      </div>
      <div className="flex justify-between text-gray-500 mt-0.5">
        <span>Dry</span>
        <span>Humid</span>
        <span>Saturated</span>
      </div>
    </div>
  );
}

export default HumidityLayer;
