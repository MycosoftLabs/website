"use client";

/**
 * GIBS Base Layers — Landsat, MODIS Terra, VIIRS Night Lights
 *
 * Adds NASA GIBS satellite imagery as semi-transparent raster overlays
 * on the MapLibre map. Each layer is toggleable with opacity control.
 * MODIS refreshes daily (URL includes date param).
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { GIBS_LAYER_CONFIGS, type GibsLayerConfig } from "@/lib/crep/gibs-layers";

interface GibsBaseLayersProps {
  map: MapLibreMap | null;
  enabledLayers: {
    modis?: boolean;
    viirs?: boolean;
    landsat?: boolean;
    airs?: boolean;
  };
  opacity?: number; // 0-1, applied to all enabled GIBS layers
}

export default function GibsBaseLayers({ map, enabledLayers, opacity = 0.4 }: GibsBaseLayersProps) {
  const addedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!map) return;

    // Wait for map style to load
    const addLayers = () => {
      for (const [key, config] of Object.entries(GIBS_LAYER_CONFIGS)) {
        const enabled = enabledLayers[key as keyof typeof enabledLayers] ?? false;
        const sourceExists = addedRef.current.has(config.sourceId);

        if (enabled && !sourceExists) {
          const tileUrl = config.getTileUrl();
          if (!tileUrl) continue;

          // Add raster source
          if (!map.getSource(config.sourceId)) {
            map.addSource(config.sourceId, {
              type: "raster",
              tiles: [tileUrl],
              tileSize: 256,
              maxzoom: config.maxZoom,
              attribution: "NASA GIBS",
            });
          }

          // Add raster layer — insert BELOW labels/markers for blending
          if (!map.getLayer(config.layerId)) {
            // Find first symbol layer to insert below it
            const layers = map.getStyle()?.layers || [];
            let beforeId: string | undefined;
            for (const l of layers) {
              if (l.type === "symbol") {
                beforeId = l.id;
                break;
              }
            }

            map.addLayer(
              {
                id: config.layerId,
                type: "raster",
                source: config.sourceId,
                paint: {
                  "raster-opacity": config.opacity ?? opacity,
                  "raster-fade-duration": 300,
                },
              },
              beforeId,
            );
          }

          addedRef.current.add(config.sourceId);
        } else if (!enabled && sourceExists) {
          // Remove layer and source
          if (map.getLayer(config.layerId)) {
            map.removeLayer(config.layerId);
          }
          if (map.getSource(config.sourceId)) {
            map.removeSource(config.sourceId);
          }
          addedRef.current.delete(config.sourceId);
        }

        // Update opacity on existing layers
        if (enabled && map.getLayer(config.layerId)) {
          map.setPaintProperty(config.layerId, "raster-opacity", config.opacity ?? opacity);
        }
      }
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.once("style.load", addLayers);
    }

    return () => {
      // Cleanup on unmount
      for (const config of Object.values(GIBS_LAYER_CONFIGS)) {
        if (map.getLayer(config.layerId)) {
          try { map.removeLayer(config.layerId); } catch {}
        }
        if (map.getSource(config.sourceId)) {
          try { map.removeSource(config.sourceId); } catch {}
        }
      }
      addedRef.current.clear();
    };
  }, [map, enabledLayers, opacity]);

  return null; // Renders directly to MapLibre, no DOM output
}
