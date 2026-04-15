"use client";

/**
 * Weather overlay — bilinear raster on MapLibre image source (Apr 15, 2026).
 * Replaces coarse GeoJSON cell fills with a smooth RGBA texture aligned to bounds.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type WeatherVariable, type GeoBounds } from "@/lib/earth2/client";
import { gridToRasterCanvas } from "@/lib/earth2/grid-raster";
import { rasterDimensions } from "@/lib/earth2/resolution-from-filter";

interface WeatherHeatmapLayerProps {
  map: any;
  visible: boolean;
  variable: "temperature" | "precipitation" | "humidity";
  forecastHours: number;
  opacity: number;
  /** Degrees between samples — from CREP filter (smaller = denser API grid) */
  resolutionDeg?: number;
  model?: "atlas-era5" | "stormscope" | "corrdiff" | "fourcastnet";
  onDataLoaded?: (data: { min: number; max: number; variable: string }) => void;
  onError?: (error: string) => void;
}

const LAYER_ID = "earth2-weather-raster";
const SOURCE_ID = "earth2-weather-raster-src";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

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

const VARIABLE_MAP: Record<string, WeatherVariable> = {
  temperature: "t2m",
  precipitation: "tp",
  humidity: "tcwv",
};

export function WeatherHeatmapLayer({
  map,
  visible,
  variable,
  forecastHours,
  opacity,
  resolutionDeg = 0.22,
  onDataLoaded,
  onError,
}: WeatherHeatmapLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const lastFetchKey = useRef("");
  const clientRef = useRef(getEarth2Client());
  const debouncedHours = useDebouncedValue(forecastHours, 300);

  const updateData = useCallback(async () => {
    if (!map || !visible) return;
    if (fetchingRef.current) return;
    const fetchKey = `${variable}-${debouncedHours}-${resolutionDeg}`;
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
        resolution: resolutionDeg,
      });

      const el = map.getContainer?.() as HTMLElement | undefined;
      const { w, h } = rasterDimensions(el?.clientWidth ?? 1024, el?.clientHeight ?? 768);
      const stops = COLOR_SCALES[variable as keyof typeof COLOR_SCALES] || COLOR_SCALES.temperature;
      const canvas = gridToRasterCanvas({
        grid,
        bounds,
        colorStops: stops,
        width: w,
        height: h,
        validPredicate: (v) => Number.isFinite(v),
      });
      const dataUrl = canvas.toDataURL("image/png");

      const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
        [bounds.west, bounds.north],
        [bounds.east, bounds.north],
        [bounds.east, bounds.south],
        [bounds.west, bounds.south],
      ];

      const beforeId = map.getLayer("waterway") ? "waterway" : undefined;
      const existing = map.getSource(SOURCE_ID) as
        | { updateImage?: (o: { url: string; coordinates: typeof coordinates }) => void }
        | undefined;

      if (existing && typeof existing.updateImage === "function") {
        existing.updateImage({ url: dataUrl, coordinates });
      } else {
        try {
          if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        } catch {}
        try {
          if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        } catch {}
        map.addSource(SOURCE_ID, { type: "image", url: dataUrl, coordinates });
        map.addLayer(
          {
            id: LAYER_ID,
            type: "raster",
            source: SOURCE_ID,
            paint: {
              "raster-opacity": opacity * 0.92,
              "raster-fade-duration": 0,
            },
          },
          beforeId,
        );
      }

      layerAddedRef.current = true;
      lastFetchKey.current = fetchKey;
      onDataLoaded?.({ min, max, variable });
    } catch (error) {
      console.error("[Earth-2] Weather raster error:", error);
      onError?.(String(error));
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, variable, debouncedHours, opacity, resolutionDeg, onDataLoaded, onError]);

  useEffect(() => {
    if (!map) return;
    const handleSetup = () => {
      if (visible) updateData();
      else {
        try {
          if (map.getLayer(LAYER_ID)) map.setLayoutProperty(LAYER_ID, "visibility", "none");
        } catch {}
      }
    };
    if (map.isStyleLoaded()) handleSetup();
    else map.once("style.load", handleSetup);
  }, [map, visible, updateData]);

  useEffect(() => {
    if (!map || !visible) return;
    const onMoveEnd = () => {
      lastFetchKey.current = "";
      updateData();
    };
    map.on("moveend", onMoveEnd);
    return () => {
      try {
        map.off("moveend", onMoveEnd);
      } catch {}
    };
  }, [map, visible, updateData]);

  useEffect(() => {
    if (visible && map && layerAddedRef.current) updateData();
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
        map.setPaintProperty(LAYER_ID, "raster-opacity", opacity * 0.92);
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
        <span>
          {scale[0].value}
          {units[variable]}
        </span>
        <span>
          {scale[scale.length - 1].value}
          {units[variable]}
        </span>
      </div>
    </div>
  );
}

export default WeatherHeatmapLayer;
