"use client";

/**
 * Earth-2 HD weather tiles — MapLibre raster sources (Apr 13, 2026).
 * Same pyramid pattern as GIBS; URLs use `hours` aligned with grid/wind (`forecastHours`).
 * Data: real Open-Meteo forecast via MAS/Legion tile pipeline — not client mock data.
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

export interface Earth2TileRasterLayersProps {
  map: MapLibreMap | null;
  /** Forecast hour index — must match `WeatherHeatmapLayer` / `getWeatherGrid` `hours` query. */
  forecastHours: number;
  opacity: number;
  enabled: {
    t2m?: boolean;
    tp?: boolean;
    tcwv?: boolean;
  };
  /** Optional model tag forwarded as query param (MAS/Legion may log or use later). */
  model?: string;
  /** Cross-fade when hour or source changes (Phase 4 polish). */
  rasterFadeMs?: number;
}

const SPECS: Array<{
  key: keyof Earth2TileRasterLayersProps["enabled"];
  variable: string;
  sourceId: string;
  layerId: string;
}> = [
  { key: "t2m", variable: "t2m", sourceId: "earth2-tile-t2m-src", layerId: "earth2-tile-t2m" },
  { key: "tp", variable: "tp", sourceId: "earth2-tile-tp-src", layerId: "earth2-tile-tp" },
  { key: "tcwv", variable: "tcwv", sourceId: "earth2-tile-tcwv-src", layerId: "earth2-tile-tcwv" },
];

function symbolBeforeId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers || [];
  for (const l of layers) {
    if (l.type === "symbol") return l.id;
  }
  return undefined;
}

export default function Earth2TileRasterLayers({
  map,
  forecastHours,
  opacity,
  enabled,
  model,
  rasterFadeMs = 280,
}: Earth2TileRasterLayersProps) {
  const addedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!map) return;

    const addOrRefresh = () => {
      const beforeId = symbolBeforeId(map);
      const q = new URLSearchParams();
      q.set("hours", String(Math.max(0, Math.min(240, Math.round(forecastHours)))));
      if (model) q.set("model", model);
      const qs = q.toString();

      for (const spec of SPECS) {
        const on = enabled[spec.key] === true;
        const had = addedRef.current.has(spec.sourceId);

        if (!on && had) {
          if (map.getLayer(spec.layerId)) map.removeLayer(spec.layerId);
          if (map.getSource(spec.sourceId)) map.removeSource(spec.sourceId);
          addedRef.current.delete(spec.sourceId);
          continue;
        }

        if (!on) continue;

        const tileUrl = `/api/earth2/tiles/${spec.variable}/{z}/{x}/{y}?${qs}`;

        if (map.getSource(spec.sourceId)) {
          if (map.getLayer(spec.layerId)) map.removeLayer(spec.layerId);
          map.removeSource(spec.sourceId);
        }

        map.addSource(spec.sourceId, {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
          maxzoom: 12,
        });

        map.addLayer(
          {
            id: spec.layerId,
            type: "raster",
            source: spec.sourceId,
            paint: {
              "raster-opacity": opacity,
              "raster-fade-duration": rasterFadeMs,
            },
          },
          beforeId,
        );
        addedRef.current.add(spec.sourceId);
      }
    };

    if (map.isStyleLoaded()) {
      addOrRefresh();
    } else {
      map.once("styledata", addOrRefresh);
    }

    return () => {
      map.off("styledata", addOrRefresh);
      for (const spec of SPECS) {
        if (map.getLayer(spec.layerId)) map.removeLayer(spec.layerId);
        if (map.getSource(spec.sourceId)) map.removeSource(spec.sourceId);
      }
      addedRef.current.clear();
    };
  }, [map, forecastHours, enabled.t2m, enabled.tp, enabled.tcwv, model, rasterFadeMs]);

  useEffect(() => {
    if (!map) return;
    for (const spec of SPECS) {
      if (!enabled[spec.key] || !map.getLayer(spec.layerId)) continue;
      map.setPaintProperty(spec.layerId, "raster-opacity", opacity);
      map.setPaintProperty(spec.layerId, "raster-fade-duration", rasterFadeMs);
    }
  }, [map, opacity, rasterFadeMs, enabled.t2m, enabled.tp, enabled.tcwv]);

  return null;
}
