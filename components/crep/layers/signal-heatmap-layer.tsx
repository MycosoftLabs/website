"use client";

/**
 * Signal Strength Heatmap Layer
 *
 * Visualizes approximate cellular/radio signal coverage based on
 * cell tower locations and estimated range. Critical for MycoBrain
 * device placement planning.
 *
 * Uses canvas-based heatmap rendering on MapLibre.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

interface SignalHeatmapProps {
  map: MapLibreMap | null;
  enabled?: boolean;
  towers: Array<{ lat: number; lng: number; type?: string; height?: number }>;
  opacity?: number;
  signalType?: "cellular" | "radio" | "wifi"; // Different range estimates
}

const SOURCE_ID = "crep-signal-heatmap-source";
const LAYER_ID = "crep-signal-heatmap-layer";

// Approximate signal ranges by type (in degrees, ~111km per degree at equator)
const SIGNAL_RANGE: Record<string, number> = {
  cellular: 0.15, // ~15km
  radio: 0.5,     // ~50km
  wifi: 0.005,    // ~500m
};

// Generate heatmap GeoJSON from tower locations
function generateHeatmapData(
  towers: SignalHeatmapProps["towers"],
  signalType: string,
): GeoJSON.FeatureCollection {
  const range = SIGNAL_RANGE[signalType] || SIGNAL_RANGE.cellular;

  return {
    type: "FeatureCollection",
    features: towers.map((tower) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [tower.lng, tower.lat],
      },
      properties: {
        intensity: tower.height ? Math.min(1, (tower.height / 100) * 0.8 + 0.2) : 0.6,
        range,
      },
    })),
  };
}

export default function SignalHeatmapLayer({
  map,
  enabled = false,
  towers,
  opacity = 0.4,
  signalType = "cellular",
}: SignalHeatmapProps) {
  const addedRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    // Guard against map torn down between mount and async callback
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function");

    const addLayer = () => {
      if (!mapReady()) return;
      if (enabled && towers.length > 0) {
        const geojson = generateHeatmapData(towers, signalType);

        if (map.getSource(SOURCE_ID)) {
          (map.getSource(SOURCE_ID) as any).setData(geojson);
        } else {
          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: geojson,
          });
        }

        if (!map.getLayer(LAYER_ID)) {
          map.addLayer({
            id: LAYER_ID,
            type: "heatmap",
            source: SOURCE_ID,
            paint: {
              // Increase weight based on intensity property
              "heatmap-weight": ["get", "intensity"],
              // Increase radius based on zoom and signal type range
              "heatmap-radius": [
                "interpolate", ["linear"], ["zoom"],
                2, signalType === "radio" ? 15 : signalType === "wifi" ? 3 : 8,
                6, signalType === "radio" ? 30 : signalType === "wifi" ? 8 : 20,
                10, signalType === "radio" ? 60 : signalType === "wifi" ? 15 : 40,
                14, signalType === "radio" ? 100 : signalType === "wifi" ? 25 : 70,
              ],
              // Color ramp from transparent to signal-strength colors
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(0,0,0,0)",
                0.1, "rgba(0,0,255,0.1)",
                0.3, "rgba(0,255,255,0.3)",
                0.5, "rgba(0,255,0,0.5)",
                0.7, "rgba(255,255,0,0.7)",
                0.9, "rgba(255,128,0,0.9)",
                1, "rgba(255,0,0,1)",
              ],
              "heatmap-opacity": opacity,
              "heatmap-intensity": [
                "interpolate", ["linear"], ["zoom"],
                0, 0.5,
                6, 1,
                10, 2,
              ],
            },
          });
        }

        addedRef.current = true;
      } else if (!enabled && addedRef.current) {
        if (map.getLayer(LAYER_ID)) try { map.removeLayer(LAYER_ID); } catch {}
        if (map.getSource(SOURCE_ID)) try { map.removeSource(SOURCE_ID); } catch {}
        addedRef.current = false;
      }
    };

    if (map.isStyleLoaded()) {
      addLayer();
    } else {
      map.once("style.load", addLayer);
    }

    return () => {
      if (!mapReady()) return;
      try { if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID); } catch {}
      try { if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID); } catch {}
      addedRef.current = false;
    };
  }, [map, enabled, towers, opacity, signalType]);

  // Update opacity
  useEffect(() => {
    if (!map || !addedRef.current) return;
    if (!(map as any).style || typeof map.getLayer !== "function") return;
    try {
      if (map.getLayer(LAYER_ID)) {
        map.setPaintProperty(LAYER_ID, "heatmap-opacity", opacity);
      }
    } catch {}
  }, [map, opacity]);

  return null;
}
