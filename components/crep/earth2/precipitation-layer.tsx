"use client";

/**
 * Precipitation Layer Component
 * February 4, 2026
 * 
 * Renders rain, snow, and precipitation intensity on MapLibre
 * Uses Earth-2 total precipitation (tp) and temperature (t2m) data
 * 
 * ENHANCED: Wind-direction rain streaks, snow vs rain differentiation,
 * intensity-based particle density, realistic weather animations
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
  onDataLoaded?: (data: { totalPrecip: number; maxIntensity: number; coverage: number; snowCoverage: number }) => void;
}

const FILL_LAYER_ID = "earth2-precip-fill";
const INTENSITY_LAYER_ID = "earth2-precip-intensity";
const DROPS_LAYER_ID = "earth2-precip-drops";
const SNOW_LAYER_ID = "earth2-precip-snow";
const STREAK_LAYER_ID = "earth2-precip-streaks";
const SOURCE_ID = "earth2-precip-source";
const DROPS_SOURCE_ID = "earth2-precip-drops-source";
const SNOW_SOURCE_ID = "earth2-precip-snow-source";
const STREAK_SOURCE_ID = "earth2-precip-streak-source";

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

// Snow colors
const SNOW_COLORS = {
  light: "#e0f0ff",
  moderate: "#c0e0ff",
  heavy: "#a0d0ff",
  blizzard: "#80c0ff",
};

function getPrecipColor(value: number): string {
  for (let i = PRECIP_COLORS.length - 1; i >= 0; i--) {
    if (value >= PRECIP_COLORS[i].value) {
      return PRECIP_COLORS[i].color;
    }
  }
  return PRECIP_COLORS[0].color;
}

function getSnowColor(value: number): string {
  if (value >= 15) return SNOW_COLORS.blizzard;
  if (value >= 5) return SNOW_COLORS.heavy;
  if (value >= 1) return SNOW_COLORS.moderate;
  return SNOW_COLORS.light;
}

function getPrecipIntensity(value: number): string {
  if (value >= 25) return "extreme";
  if (value >= 10) return "heavy";
  if (value >= 2.5) return "moderate";
  if (value >= 0.5) return "light";
  if (value >= 0.1) return "drizzle";
  return "none";
}

// Debounce helper
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
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
  const fetchingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const dataRef = useRef<{
    precipGrid: number[][];
    tempGrid: number[][];
    windData: any[];
    bounds: GeoBounds;
  } | null>(null);
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

      // Fetch precipitation, temperature, and wind data in parallel
      const [precipResult, tempResult, windVectors] = await Promise.all([
        clientRef.current.getWeatherGrid({
          variable: "tp",
          forecastHours: debouncedHours,
          bounds,
          resolution: 0.5,
        }),
        clientRef.current.getWeatherGrid({
          variable: "t2m",
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

      const { grid: precipGrid } = precipResult;
      const { grid: tempGrid } = tempResult;
      
      // Store data for animation
      dataRef.current = { precipGrid, tempGrid, windData: windVectors, bounds };

      let totalPrecip = 0;
      let maxIntensity = 0;
      let precipCells = 0;
      let snowCells = 0;
      const totalCells = precipGrid.length * (precipGrid[0]?.length || 1);

      for (let i = 0; i < precipGrid.length; i++) {
        for (let j = 0; j < precipGrid[i].length; j++) {
          const val = precipGrid[i][j];
          const temp = tempGrid[i]?.[j] ?? 10;
          totalPrecip += val;
          maxIntensity = Math.max(maxIntensity, val);
          if (val >= 0.1) {
            precipCells++;
            if (temp <= 2) snowCells++; // Snow when temp <= 2°C
          }
        }
      }

      const coverage = (precipCells / totalCells) * 100;
      const snowCoverage = (snowCells / totalCells) * 100;
      onDataLoaded?.({ totalPrecip, maxIntensity, coverage, snowCoverage });

      const precipData = generatePrecipGeoJSON(precipGrid, tempGrid, bounds);

      // Check if source exists - UPDATE it
      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(precipData);
        updateAnimatedLayers(map, precipGrid, tempGrid, windVectors, bounds, phaseRef.current, precipType);
      } else {
        // First time - create sources and layers
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: precipData,
        });

        map.addLayer({
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": opacity * 0.6,
          },
        });

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

        // Create animated layers
        createAnimatedLayers(map, precipGrid, tempGrid, windVectors, bounds, opacity, precipType);
      }

      layerAddedRef.current = true;

      // Start animation loop
      if (showAnimation && !animationRef.current) {
        const animate = () => {
          phaseRef.current += 0.05;
          if (dataRef.current) {
            const { precipGrid, tempGrid, windData, bounds } = dataRef.current;
            updateAnimatedLayers(map, precipGrid, tempGrid, windData, bounds, phaseRef.current, precipType);
          }
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    } catch (error) {
      console.error("[Earth-2] Precipitation layer error:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, debouncedHours, opacity, showAnimation, precipType, onDataLoaded]);

  useEffect(() => {
    if (!map) return;
    const handleSetup = () => {
      if (visible) {
        updateData();
      } else {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        try {
          [FILL_LAYER_ID, INTENSITY_LAYER_ID, DROPS_LAYER_ID, SNOW_LAYER_ID, STREAK_LAYER_ID].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
          });
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
      [FILL_LAYER_ID, INTENSITY_LAYER_ID, DROPS_LAYER_ID, SNOW_LAYER_ID, STREAK_LAYER_ID].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      });
    } catch {}
  }, [map, visible]);

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

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      try {
        [DROPS_LAYER_ID, SNOW_LAYER_ID, STREAK_LAYER_ID, INTENSITY_LAYER_ID, FILL_LAYER_ID].forEach(id => {
          if (map?.getLayer?.(id)) map.removeLayer(id);
        });
        [DROPS_SOURCE_ID, SNOW_SOURCE_ID, STREAK_SOURCE_ID, SOURCE_ID].forEach(id => {
          if (map?.getSource?.(id)) map.removeSource(id);
        });
      } catch {}
    };
  }, [map]);

  return null;
}

function createAnimatedLayers(
  map: any,
  precipGrid: number[][],
  tempGrid: number[][],
  windData: any[],
  bounds: GeoBounds,
  opacity: number,
  precipType: string
) {
  // Rain drops layer
  if (precipType === "all" || precipType === "rain") {
    const rainData = generateRainDrops(precipGrid, tempGrid, windData, bounds, 0);
    map.addSource(DROPS_SOURCE_ID, { type: "geojson", data: rainData });
    map.addLayer({
      id: DROPS_LAYER_ID,
      type: "circle",
      source: DROPS_SOURCE_ID,
      paint: {
        "circle-radius": ["get", "size"],
        "circle-color": ["get", "color"],
        "circle-opacity": ["*", ["get", "opacity"], opacity],
        "circle-blur": 0.2,
      },
    });
  }

  // Snow layer
  if (precipType === "all" || precipType === "snow") {
    const snowData = generateSnowflakes(precipGrid, tempGrid, bounds, 0);
    map.addSource(SNOW_SOURCE_ID, { type: "geojson", data: snowData });
    map.addLayer({
      id: SNOW_LAYER_ID,
      type: "symbol",
      source: SNOW_SOURCE_ID,
      layout: {
        "text-field": "❄",
        "text-size": ["get", "size"],
        "text-allow-overlap": true,
        "text-rotate": ["get", "rotation"],
      },
      paint: {
        "text-color": ["get", "color"],
        "text-opacity": ["*", ["get", "opacity"], opacity],
      },
    });
  }

  // Rain streak layer (wind-driven)
  if (precipType === "all" || precipType === "rain") {
    const streakData = generateRainStreaks(precipGrid, tempGrid, windData, bounds, 0);
    map.addSource(STREAK_SOURCE_ID, { type: "geojson", data: streakData });
    map.addLayer({
      id: STREAK_LAYER_ID,
      type: "line",
      source: STREAK_SOURCE_ID,
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "width"],
        "line-opacity": ["*", ["get", "opacity"], opacity * 0.4],
      },
    });
  }
}

function updateAnimatedLayers(
  map: any,
  precipGrid: number[][],
  tempGrid: number[][],
  windData: any[],
  bounds: GeoBounds,
  phase: number,
  precipType: string
) {
  try {
    if ((precipType === "all" || precipType === "rain") && map.getSource(DROPS_SOURCE_ID)) {
      const rainData = generateRainDrops(precipGrid, tempGrid, windData, bounds, phase);
      map.getSource(DROPS_SOURCE_ID).setData(rainData);
    }
    
    if ((precipType === "all" || precipType === "snow") && map.getSource(SNOW_SOURCE_ID)) {
      const snowData = generateSnowflakes(precipGrid, tempGrid, bounds, phase);
      map.getSource(SNOW_SOURCE_ID).setData(snowData);
    }
    
    if ((precipType === "all" || precipType === "rain") && map.getSource(STREAK_SOURCE_ID)) {
      const streakData = generateRainStreaks(precipGrid, tempGrid, windData, bounds, phase);
      map.getSource(STREAK_SOURCE_ID).setData(streakData);
    }
  } catch {}
}

function generatePrecipGeoJSON(
  precipGrid: number[][],
  tempGrid: number[][],
  bounds: GeoBounds
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = precipGrid.length;
  const lonSteps = precipGrid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = precipGrid[i][j];
      if (value < 0.1) continue;

      const temp = tempGrid[i]?.[j] ?? 10;
      const isSnow = temp <= 2;
      const color = isSnow ? getSnowColor(value) : getPrecipColor(value);
      const intensity = getPrecipIntensity(value);
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;

      features.push({
        type: "Feature",
        properties: {
          value: Math.round(value * 10) / 10,
          color,
          intensity,
          isSnow,
          temp: Math.round(temp),
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
  precipGrid: number[][],
  tempGrid: number[][],
  windData: any[],
  bounds: GeoBounds,
  phase: number
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = precipGrid.length;
  const lonSteps = precipGrid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;
  
  // Calculate average wind
  let avgWindDir = 180;
  let avgWindSpeed = 5;
  if (windData.length > 0) {
    avgWindDir = windData.reduce((sum, w) => sum + (w.direction || 0), 0) / windData.length;
    avgWindSpeed = windData.reduce((sum, w) => sum + (w.speed || 0), 0) / windData.length;
  }

  for (let i = 0; i < latSteps; i += 2) {
    for (let j = 0; j < lonSteps; j += 2) {
      const value = precipGrid[i][j];
      const temp = tempGrid[i]?.[j] ?? 10;
      
      if (value < 0.5 || temp <= 2) continue; // Skip light/snow

      const dropCount = Math.min(8, Math.ceil(value / 3));
      const baseLat = bounds.south + i * latStep;
      const baseLon = bounds.west + j * lonStep;

      for (let d = 0; d < dropCount; d++) {
        const dropPhase = (phase + d * 0.5 + i * 0.1 + j * 0.1) % 3;
        const fallProgress = dropPhase / 3;
        
        // Wind drift
        const windRad = (avgWindDir * Math.PI) / 180;
        const driftX = Math.sin(windRad) * avgWindSpeed * 0.0002 * fallProgress;
        const driftY = Math.cos(windRad) * avgWindSpeed * 0.0002 * fallProgress;

        const dropLat = baseLat + Math.random() * latStep - latStep * fallProgress + driftY;
        const dropLon = baseLon + Math.random() * lonStep + driftX;
        
        // Opacity based on fall position
        const dropOpacity = Math.sin(fallProgress * Math.PI) * 0.8;

        features.push({
          type: "Feature",
          properties: {
            value,
            color: value > 10 ? "#4a9eda" : "#7ec8e3",
            size: 2 + (value > 10 ? 3 : 1),
            opacity: dropOpacity,
          },
          geometry: {
            type: "Point",
            coordinates: [dropLon, dropLat],
          },
        });
      }
    }
  }

  return { type: "FeatureCollection", features };
}

function generateSnowflakes(
  precipGrid: number[][],
  tempGrid: number[][],
  bounds: GeoBounds,
  phase: number
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = precipGrid.length;
  const lonSteps = precipGrid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  for (let i = 0; i < latSteps; i += 2) {
    for (let j = 0; j < lonSteps; j += 2) {
      const value = precipGrid[i][j];
      const temp = tempGrid[i]?.[j] ?? 10;
      
      if (value < 0.3 || temp > 2) continue; // Only snow when cold

      const flakeCount = Math.min(6, Math.ceil(value / 4));
      const baseLat = bounds.south + i * latStep;
      const baseLon = bounds.west + j * lonStep;

      for (let f = 0; f < flakeCount; f++) {
        const flakePhase = (phase * 0.5 + f * 0.8 + i * 0.2 + j * 0.2) % 4;
        const fallProgress = flakePhase / 4;
        
        // Gentle drift
        const driftX = Math.sin(phase + f) * 0.001;
        const driftY = -latStep * fallProgress;

        const flakeLat = baseLat + Math.random() * latStep + driftY;
        const flakeLon = baseLon + Math.random() * lonStep + driftX;
        
        // Tumbling rotation
        const rotation = (phase * 30 + f * 60) % 360;
        
        // Opacity
        const flakeOpacity = Math.sin(fallProgress * Math.PI) * 0.9;

        features.push({
          type: "Feature",
          properties: {
            value,
            color: getSnowColor(value),
            size: 10 + value * 0.5,
            opacity: flakeOpacity,
            rotation,
          },
          geometry: {
            type: "Point",
            coordinates: [flakeLon, flakeLat],
          },
        });
      }
    }
  }

  return { type: "FeatureCollection", features };
}

function generateRainStreaks(
  precipGrid: number[][],
  tempGrid: number[][],
  windData: any[],
  bounds: GeoBounds,
  phase: number
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const latSteps = precipGrid.length;
  const lonSteps = precipGrid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;
  
  // Calculate average wind
  let avgWindDir = 180;
  let avgWindSpeed = 10;
  if (windData.length > 0) {
    avgWindDir = windData.reduce((sum, w) => sum + (w.direction || 0), 0) / windData.length;
    avgWindSpeed = windData.reduce((sum, w) => sum + (w.speed || 0), 0) / windData.length;
  }

  for (let i = 0; i < latSteps; i += 3) {
    for (let j = 0; j < lonSteps; j += 3) {
      const value = precipGrid[i][j];
      const temp = tempGrid[i]?.[j] ?? 10;
      
      if (value < 2 || temp <= 2) continue; // Only moderate+ rain

      const baseLat = bounds.south + i * latStep + Math.random() * latStep;
      const baseLon = bounds.west + j * lonStep + Math.random() * lonStep;
      
      // Streak direction based on wind
      const windRad = (avgWindDir * Math.PI) / 180;
      const streakLength = 0.01 + (avgWindSpeed / 50) * 0.02;
      
      // Animated streak position
      const streakPhase = (phase + i * 0.1 + j * 0.1) % 2;
      const animOffset = streakPhase * streakLength;
      
      const endLat = baseLat - streakLength * 0.5 - animOffset;
      const endLon = baseLon + Math.sin(windRad) * streakLength * 0.3;
      
      const streakOpacity = Math.sin(streakPhase * Math.PI) * (value / 50);

      features.push({
        type: "Feature",
        properties: {
          color: "#6eb8e8",
          width: 1 + value * 0.05,
          opacity: streakOpacity,
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [baseLon, baseLat],
            [endLon, endLat],
          ],
        },
      });
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
      <div className="flex items-center gap-2 mt-1 text-gray-400">
        <span>❄ Snow (temp ≤2°C)</span>
      </div>
    </div>
  );
}

export default PrecipitationLayer;
