"use client";

/**
 * CREP GIBS EO Overlays
 * March 10, 2026
 *
 * Renders NASA GIBS satellite imagery layers (MODIS, VIIRS, AIRS, Landsat)
 * as MapLibre raster overlays on top of the CREP map basemap.
 * Each layer is added/removed based on eoImageryFilter toggles.
 */

import { useEffect, useRef } from "react";
import { GIBS_LAYER_CONFIGS, type GibsLayerConfig } from "@/lib/crep/gibs-layers";

export interface EoImageryFilter {
  showModis?: boolean;
  showViirs?: boolean;
  showAirs?: boolean;
  showLandsat?: boolean;
  showEonet?: boolean;
}

interface CrepGibsEoOverlaysProps {
  map: { addSource: Function; addLayer: Function; removeLayer: Function; removeSource: Function; getLayer: Function; getSource: Function; isStyleLoaded: Function; once: Function } | null;
  eoImageryFilter: EoImageryFilter;
  /** Optional: insert before this layer id (e.g. "waterway" to keep labels on top) */
  beforeId?: string | null;
}

export function CrepGibsEoOverlays({ map, eoImageryFilter, beforeId }: CrepGibsEoOverlaysProps) {
  const addedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!map) return;

    const addOrRemoveLayer = (config: GibsLayerConfig, visible: boolean) => {
      const { sourceId, layerId } = config;
      const tileUrl = config.getTileUrl();

      if (!visible) {
        try {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          addedRef.current.delete(layerId);
        } catch {}
        return;
      }

      if (!tileUrl) return;

      const ensureStyleLoaded = (fn: () => void) => {
        if (map.isStyleLoaded()) {
          fn();
        } else {
          map.once("style.load", fn);
        }
      };

      ensureStyleLoaded(() => {
        try {
          if (map.getSource(sourceId)) return;

          map.addSource(sourceId, {
            type: "raster",
            tiles: [tileUrl],
            tileSize: 256,
            scheme: "xyz",
            maxzoom: config.maxZoom,
          });

          const layerConfig = {
            id: layerId,
            type: "raster",
            source: sourceId,
            minzoom: 0,
            maxzoom: config.maxZoom,
            paint: {
              "raster-opacity": config.opacity ?? 0.8,
            },
          };

          if (beforeId && map.getLayer(beforeId)) {
            map.addLayer(layerConfig, beforeId);
          } else {
            map.addLayer(layerConfig);
          }
          addedRef.current.add(layerId);
        } catch (e) {
          console.warn(`[CREP GIBS] Failed to add ${config.label}:`, e);
        }
      });
    };

    addOrRemoveLayer(GIBS_LAYER_CONFIGS.modis, !!eoImageryFilter.showModis);
    addOrRemoveLayer(GIBS_LAYER_CONFIGS.viirs, !!eoImageryFilter.showViirs);
    addOrRemoveLayer(GIBS_LAYER_CONFIGS.airs, !!eoImageryFilter.showAirs);
    addOrRemoveLayer(GIBS_LAYER_CONFIGS.landsat, !!eoImageryFilter.showLandsat);
  }, [map, eoImageryFilter.showModis, eoImageryFilter.showViirs, eoImageryFilter.showAirs, eoImageryFilter.showLandsat, beforeId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!map) return;
      Object.values(GIBS_LAYER_CONFIGS).forEach((config) => {
        try {
          if (map.getLayer(config.layerId)) map.removeLayer(config.layerId);
          if (map.getSource(config.sourceId)) map.removeSource(config.sourceId);
        } catch {}
      });
      addedRef.current.clear();
    };
  }, [map]);

  return null;
}
