"use client";

/**
 * Aurora Forecast Overlay — NOAA SWPC aurora probability map
 *
 * Renders the NOAA aurora forecast image as a MapLibre ImageSource
 * overlay at the correct polar geographic bounds. Semi-transparent,
 * toggleable. Refreshes every 30 minutes.
 */

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

interface AuroraOverlayProps {
  map: MapLibreMap | null;
  enabled?: boolean;
  opacity?: number;
}

const AURORA_SOURCE_N = "crep-aurora-north";
const AURORA_LAYER_N = "crep-aurora-north-layer";
const AURORA_SOURCE_S = "crep-aurora-south";
const AURORA_LAYER_S = "crep-aurora-south-layer";

// Aurora images cover approximately 40-90° latitude
const BOUNDS_NORTH: [number, number, number, number] = [-180, 40, 180, 90]; // [west, south, east, north]
const BOUNDS_SOUTH: [number, number, number, number] = [-180, -90, 180, -40];

const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

export default function AuroraOverlay({ map, enabled = false, opacity = 0.5 }: AuroraOverlayProps) {
  const [auroraData, setAuroraData] = useState<{
    northernHemisphere?: string;
    southernHemisphere?: string;
  } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const addedRef = useRef(false);

  // Fetch aurora data
  useEffect(() => {
    if (!enabled) return;

    const fetchAurora = async () => {
      try {
        const res = await fetch("/api/oei/space-weather/aurora", {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return;
        const data = await res.json();
        setAuroraData(data.aurora || null);
      } catch (e) {
        console.warn("[CREP/Aurora] Failed to fetch aurora data:", e);
      }
    };

    fetchAurora();
    intervalRef.current = setInterval(fetchAurora, REFRESH_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  // Render to MapLibre
  useEffect(() => {
    if (!map || !enabled || !auroraData) {
      // Remove if disabled
      if (map && addedRef.current) {
        for (const [layer, source] of [
          [AURORA_LAYER_N, AURORA_SOURCE_N],
          [AURORA_LAYER_S, AURORA_SOURCE_S],
        ]) {
          if (map.getLayer(layer)) try { map.removeLayer(layer); } catch {}
          if (map.getSource(source)) try { map.removeSource(source); } catch {}
        }
        addedRef.current = false;
      }
      return;
    }

    const addOverlays = () => {
      // Northern hemisphere
      if (auroraData.northernHemisphere) {
        if (!map.getSource(AURORA_SOURCE_N)) {
          map.addSource(AURORA_SOURCE_N, {
            type: "image",
            url: auroraData.northernHemisphere,
            coordinates: [
              [BOUNDS_NORTH[0], BOUNDS_NORTH[3]], // top-left
              [BOUNDS_NORTH[2], BOUNDS_NORTH[3]], // top-right
              [BOUNDS_NORTH[2], BOUNDS_NORTH[1]], // bottom-right
              [BOUNDS_NORTH[0], BOUNDS_NORTH[1]], // bottom-left
            ],
          });
        }
        if (!map.getLayer(AURORA_LAYER_N)) {
          map.addLayer({
            id: AURORA_LAYER_N,
            type: "raster",
            source: AURORA_SOURCE_N,
            paint: {
              "raster-opacity": opacity,
              "raster-fade-duration": 500,
            },
          });
        }
      }

      // Southern hemisphere
      if (auroraData.southernHemisphere) {
        if (!map.getSource(AURORA_SOURCE_S)) {
          map.addSource(AURORA_SOURCE_S, {
            type: "image",
            url: auroraData.southernHemisphere,
            coordinates: [
              [BOUNDS_SOUTH[0], BOUNDS_SOUTH[3]], // top-left
              [BOUNDS_SOUTH[2], BOUNDS_SOUTH[3]], // top-right
              [BOUNDS_SOUTH[2], BOUNDS_SOUTH[1]], // bottom-right
              [BOUNDS_SOUTH[0], BOUNDS_SOUTH[1]], // bottom-left
            ],
          });
        }
        if (!map.getLayer(AURORA_LAYER_S)) {
          map.addLayer({
            id: AURORA_LAYER_S,
            type: "raster",
            source: AURORA_SOURCE_S,
            paint: {
              "raster-opacity": opacity,
              "raster-fade-duration": 500,
            },
          });
        }
      }

      addedRef.current = true;
    };

    // Resilient pattern: try immediately, fall back to styledata listener
    const tryAdd = () => {
      if (!map.isStyleLoaded()) return;
      addOverlays();
    };
    tryAdd();
    map.on("styledata", tryAdd);

    return () => {
      map.off("styledata", tryAdd);
      if (map && addedRef.current) {
        for (const [layer, source] of [
          [AURORA_LAYER_N, AURORA_SOURCE_N],
          [AURORA_LAYER_S, AURORA_SOURCE_S],
        ]) {
          if (map.getLayer(layer)) try { map.removeLayer(layer); } catch {}
          if (map.getSource(source)) try { map.removeSource(source); } catch {}
        }
        addedRef.current = false;
      }
    };
  }, [map, enabled, auroraData, opacity]);

  // Update opacity
  useEffect(() => {
    if (!map || !addedRef.current) return;
    for (const layerId of [AURORA_LAYER_N, AURORA_LAYER_S]) {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", opacity);
      }
    }
  }, [map, opacity]);

  return null;
}
