"use client";

/**
 * Precipitation Layer Component
 * February 5, 2026
 * 
 * Renders rain, snow, and precipitation intensity on MapLibre
 * Uses Earth-2 total precipitation (tp) data with animated rain effects
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface PrecipitationLayerProps {
  map: any;
  visible: boolean;
  forecastHours: number;
  opacity: number;
  showAnimation?: boolean;
  precipType?: "all" | "rain" | "snow" | "mixed";
  onDataLoaded?: (data: { totalPrecip: number; maxIntensity: number; coverage: number }) => void;
}

const FILL_LAYER_ID = "earth2-precip-fill";
const INTENSITY_LAYER_ID = "earth2-precip-intensity";
const DROPS_LAYER_ID = "earth2-precip-drops";
const SOURCE_ID = "earth2-precip-source";
const DROPS_SOURCE_ID = "earth2-precip-drops-source";

// Precipitation color scale (NOAA radar style)
const PRECIP_COLORS = [
  { value: 0, color: "rgba(0,0,0,0)" },
  { value: 0.1, color: "#a0d6a0" },    // Light drizzle - light green
  { value: 0.5, color: "#50b850" },    // Drizzle - green
  { value: 1, color: "#28a428" },      // Light rain - darker green
  { value: 2.5, color: "#ffff00" },    // Moderate rain - yellow
  { value: 5, color: "#ffc800" },      // Rain - orange-yellow
  { value: 10, color: "#ff9600" },     // Heavy rain - orange
  { value: 15, color: "#ff0000" },     // Very heavy - red
  { value: 25, color: "#c80000" },     // Intense - dark red
  { value: 50, color: "#780078" },     // Extreme - purple
  { value: 100, color: "#ff00ff" },    // Torrential - magenta
];

function getPrecipColor(value: number): string {
  for (let i = PRECIP_COLORS.length - 1; i >= 0; i--) {
    if (value >= PRECIP_COLORS[i].value) {
      return PRECIP_COLORS[i].color;
    }
  }
  return PRECIP_COLORS[0].color;
}

function getPrecipIntensity(value: number): string {
  if (value >= 25) return "extreme";
  if (value >= 10) return "heavy";
  if (value >= 2.5) return "moderate";
  if (value >= 0.5) return "light";
  if (value >= 0.1) return "drizzle";
  return "none";
}

export function PrecipitationLayer({
  map,
  visible,
  forecastHours,
  opacity,
  showAnimation = true,
  precipType = "all",
  onDataLoaded,
}: PrecipitationLayerProps) {
  const layerAddedRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const dropsRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const clientRef = useRef(getEarth2Client());

  const setupLayer = useCallback(async () => {
    if (!map) return;

    // Cleanup existing layers
    try {
      if (map.getLayer(DROPS_LAYER_ID)) map.removeLayer(DROPS_LAYER_ID);
      if (map.getLayer(INTENSITY_LAYER_ID)) map.removeLayer(INTENSITY_LAYER_ID);
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getSource(DROPS_SOURCE_ID)) map.removeSource(DROPS_SOURCE_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch {}

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

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

      console.log(`[Earth-2] Fetching precipitation data: ${forecastHours}h forecast`);

      // Fetch precipitation data
      const { grid, min, max } = await clientRef.current.getWeatherGrid({
        variable: "tp",
        forecastHours,
        bounds,
        resolution: 0.5,
      });

      // Calculate statistics
      let totalPrecip = 0;
      let maxIntensity = 0;
      let precipCells = 0;
      const totalCells = grid.length * (grid[0]?.length || 1);

      for (const row of grid) {
        for (const val of row) {
          totalPrecip += val;
          maxIntensity = Math.max(maxIntensity, val);
          if (val >= 0.1) precipCells++;
        }
      }

      const coverage = (precipCells / totalCells) * 100;
      onDataLoaded?.({ totalPrecip, maxIntensity, coverage });

      // Generate precipitation GeoJSON
      const precipData = generatePrecipGeoJSON(grid, bounds);
      console.log(`[Earth-2] Precipitation: ${precipData.features.length} cells, max=${maxIntensity.toFixed(1)}mm, ${coverage.toFixed(1)}% coverage`);

      // Add main precipitation source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: precipData,
      });

      // Add fill layer for precipitation areas
      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": opacity * 0.6,
        },
      });

      // Add intensity outlines for heavy precipitation
      map.addLayer({
        id: INTENSITY_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: [">=", ["get", "value"], 5],
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "interpolate",
            ["linear"],
            ["get", "value"],
            5, 1,
            25, 3,
            50, 5,
          ],
          "line-opacity": opacity * 0.8,
        },
      });

      // Add animated rain drops if enabled
      if (showAnimation && precipCells > 0) {
        const dropsData = generateRainDrops(grid, bounds);
        dropsRef.current = dropsData;

        map.addSource(DROPS_SOURCE_ID, {
          type: "geojson",
          data: dropsData,
        });

        map.addLayer({
          id: DROPS_LAYER_ID,
          type: "circle",
          source: DROPS_SOURCE_ID,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "size"],
              1, 2,
              3, 4,
              5, 6,
            ],
            "circle-color": ["get", "color"],
            "circle-opacity": ["*", ["get", "opacity"], opacity],
            "circle-blur": 0.3,
          },
        });

        // Start animation
        startAnimation(map);
      }

      layerAddedRef.current = true;
    } catch (error) {
      console.error("[Earth-2] Precipitation layer error:", error);
    }
  }, [map, visible, forecastHours, opacity, showAnimation, onDataLoaded]);

  const startAnimation = useCallback((mapInstance: any) => {
    if (!dropsRef.current) return;

    let frame = 0;
    const animate = () => {
      if (!dropsRef.current || !mapInstance.getSource(DROPS_SOURCE_ID)) return;

      frame++;
      const updatedFeatures = dropsRef.current.features.map((feature: any) => {
        const props = feature.properties;
        const speed = props.speed || 1;
        const phase = (frame * speed * 0.1 + props.phase) % 1;
        
        return {
          ...feature,
          properties: {
            ...props,
            opacity: Math.sin(phase * Math.PI) * 0.8,
          },
        };
      });

      try {
        mapInstance.getSource(DROPS_SOURCE_ID).setData({
          type: "FeatureCollection",
          features: updatedFeatures,
        });
      } catch {}

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

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
        if (map?.getLayer?.(DROPS_LAYER_ID)) map.removeLayer(DROPS_LAYER_ID);
        if (map?.getLayer?.(INTENSITY_LAYER_ID)) map.removeLayer(INTENSITY_LAYER_ID);
        if (map?.getLayer?.(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
        if (map?.getSource?.(DROPS_SOURCE_ID)) map.removeSource(DROPS_SOURCE_ID);
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map, visible, forecastHours, setupLayer]);

  useEffect(() => {
    if (!map) return;
    try {
      if (map.getLayer(FILL_LAYER_ID)) {
        map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", opacity * 0.6);
      }
      if (map.getLayer(INTENSITY_LAYER_ID)) {
        map.setPaintProperty(INTENSITY_LAYER_ID, "line-opacity", opacity * 0.8);
      }
    } catch {}
  }, [map, opacity]);

  return null;
}

function generatePrecipGeoJSON(
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
      if (value < 0.1) continue; // Skip dry areas

      const color = getPrecipColor(value);
      const intensity = getPrecipIntensity(value);
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;

      features.push({
        type: "Feature",
        properties: {
          value: Math.round(value * 10) / 10,
          color,
          intensity,
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

function generateRainDrops(
  grid: number[][],
  bounds: GeoBounds
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = grid.length;
  const lonSteps = grid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  for (let i = 0; i < latSteps; i += 2) {
    for (let j = 0; j < lonSteps; j += 2) {
      const value = grid[i][j];
      if (value < 0.5) continue;

      const dropCount = Math.min(5, Math.ceil(value / 5));
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;

      for (let d = 0; d < dropCount; d++) {
        features.push({
          type: "Feature",
          properties: {
            value,
            color: value > 10 ? "#4a9eda" : "#7ec8e3",
            size: 1 + Math.random() * (value > 10 ? 4 : 2),
            speed: 0.5 + Math.random() * 1.5,
            phase: Math.random(),
            opacity: 0.5,
          },
          geometry: {
            type: "Point",
            coordinates: [
              lon + Math.random() * lonStep,
              lat + Math.random() * latStep,
            ],
          },
        });
      }
    }
  }

  return { type: "FeatureCollection", features };
}

// Precipitation Legend Component
export function PrecipitationLegend() {
  return (
    <div className="bg-black/80 rounded px-2 py-1.5 text-[10px]">
      <div className="text-blue-400 mb-1">Precipitation (mm/hr)</div>
      <div className="flex items-center gap-0.5">
        {PRECIP_COLORS.slice(1).map((item, i) => (
          <div
            key={i}
            className="w-3 h-3"
            style={{ backgroundColor: item.color }}
            title={`≥${item.value} mm/hr`}
          />
        ))}
      </div>
      <div className="flex justify-between text-gray-500 mt-0.5">
        <span>Light</span>
        <span>Heavy</span>
        <span>Extreme</span>
      </div>
    </div>
  );
}

export default PrecipitationLayer;
