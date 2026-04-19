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

  // Apr 19, 2026 (Morgan: "all satellite images are blinking on and off
  // all eonet viirs modis landsat airs all blinking"):
  //
  // Old code had:
  //   useEffect(() => { ...add/remove... ; return () => removeAllLayers() },
  //            [map, enabledLayers, opacity])
  // and `enabledLayers` was passed as an inline object literal from the
  // parent. Every parent render → new object reference → React sees deps
  // changed → effect reruns → cleanup removes EVERY GIBS layer → new
  // render adds them back → BLINK (sometimes many times per second).
  //
  // Fix: track each layer's enabled flag as PRIMITIVE deps so the effect
  // only reruns when one actually toggles. And drop the cleanup's
  // "remove-all-layers" sledgehammer — the body already adds + removes
  // per toggle state. Real unmount cleanup only fires on a separate
  // effect keyed on `map` alone.
  const { modis, viirs, landsat, airs } = enabledLayers;

  useEffect(() => {
    if (!map) return;

    const addOrRemove = () => {
      const flags: Record<string, boolean> = {
        modis: !!modis, viirs: !!viirs, landsat: !!landsat, airs: !!airs,
      };
      for (const [key, config] of Object.entries(GIBS_LAYER_CONFIGS)) {
        const enabled = flags[key] ?? false;
        const sourceExists = addedRef.current.has(config.sourceId);

        if (enabled && !sourceExists) {
          const tileUrl = config.getTileUrl();
          if (!tileUrl) continue;
          if (!map.getSource(config.sourceId)) {
            map.addSource(config.sourceId, {
              type: "raster",
              tiles: [tileUrl],
              tileSize: 256,
              maxzoom: config.maxZoom,
              attribution: "NASA GIBS",
            });
          }
          if (!map.getLayer(config.layerId)) {
            const layers = map.getStyle()?.layers || [];
            let beforeId: string | undefined;
            for (const l of layers) {
              if (l.type === "symbol") { beforeId = l.id; break; }
            }
            map.addLayer(
              {
                id: config.layerId,
                type: "raster",
                source: config.sourceId,
                paint: {
                  "raster-opacity": config.opacity ?? opacity,
                  "raster-fade-duration": 0,
                },
              },
              beforeId,
            );
          }
          addedRef.current.add(config.sourceId);
        } else if (!enabled && sourceExists) {
          if (map.getLayer(config.layerId)) {
            try { map.removeLayer(config.layerId); } catch { /* ignore */ }
          }
          if (map.getSource(config.sourceId)) {
            try { map.removeSource(config.sourceId); } catch { /* ignore */ }
          }
          addedRef.current.delete(config.sourceId);
        }

        if (enabled && map.getLayer(config.layerId)) {
          map.setPaintProperty(config.layerId, "raster-opacity", config.opacity ?? opacity);
        }
      }
    };

    if (map.isStyleLoaded()) {
      addOrRemove();
    } else {
      map.once("style.load", addOrRemove);
    }
  }, [map, modis, viirs, landsat, airs, opacity]);

  // True unmount cleanup — map ref itself going away means either a
  // full page unmount or a map teardown; either way, the GIBS layers
  // should vanish with it.
  useEffect(() => {
    if (!map) return;
    return () => {
      for (const config of Object.values(GIBS_LAYER_CONFIGS)) {
        try { if (map.getLayer(config.layerId)) map.removeLayer(config.layerId); } catch { /* ignore */ }
        try { if (map.getSource(config.sourceId)) map.removeSource(config.sourceId); } catch { /* ignore */ }
      }
      addedRef.current.clear();
    };
  }, [map]);

  return null; // Renders directly to MapLibre, no DOM output
}
