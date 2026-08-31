"use client";

/**
 * FieldLayers — isolated marine-weather raster fields pulled from Earth-Sim's FIELD
 * catalog (the Arraylake "cubes"), NOT rebuilt. Each layer GETs the same-origin manifest
 * /api/crep/field/{dataset}/{variable} (registry meta + baked frames) and paints it as a
 * raster:
 *   - frame.image → a single global PNG (image source, animated via updateImage)
 *   - frame.tiles → an XYZ raster template (CONUS cubes like HRRR)
 * The PNG/tiles are baked WITH the color ramp by the data plane, so we just blend them.
 * Graceful: until the data plane bakes a cube the manifest is empty and nothing renders —
 * same no-mock contract as every other layer. The fields sit just above the basemap and
 * below the chart/device markers.
 */

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useMap } from "@/components/ui/map";
import type { LayerState, LayerKey } from "./MapFiltersPanel";
import { runWhenStyleReady } from "@/lib/psathyrella/mapReady";

const fetcher = (u: string) => fetch(u, { headers: { accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

// keep fields beneath the charts/data/markers
const BELOW = ["psa-noaa", "psa-seamark", "psa-channels-fill", "psa-cables-line", "psa-gauges-dot", "psa-life-dot", "psa-events-fill", "psa-bases-fill", "psa-devices", "psa-ndbc", "psa-buoy-pulse"];
function beforeId(map: any): string | undefined {
  for (const id of BELOW) {
    try {
      if (map.getLayer(id)) return id;
    } catch {
      /* */
    }
  }
  return undefined;
}

interface FieldCfg {
  key: LayerKey;
  dataset: string;
  variable: string;
  opacity?: number;
}

// Marine-weather cubes from FIELD_REGISTRY (era5 = global reanalysis; hrrr = CONUS forecast).
const FIELD_LAYERS: FieldCfg[] = [
  { key: "wxMrms", dataset: "mrms", variable: "refc", opacity: 0.85 }, // live 1km radar (CONUS)
  { key: "wxRadar", dataset: "hrrr", variable: "refc", opacity: 0.8 }, // radar forecast
  { key: "wxTemp", dataset: "era5", variable: "t2m", opacity: 0.65 },
  { key: "wxPrecip", dataset: "era5", variable: "tp", opacity: 0.8 },
  { key: "wxSolar", dataset: "helios", variable: "ghi", opacity: 0.6 },
  { key: "wxGpp", dataset: "alive", variable: "gpp", opacity: 0.6 },
  { key: "wxNdvi", dataset: "sentinel2", variable: "ndvi", opacity: 0.7 },
  { key: "wxBiomass", dataset: "biomass-global", variable: "agb", opacity: 0.7 },
];

function FieldRaster({ dataset, variable, enabled, opacity = 0.7 }: { dataset: string; variable: string; enabled: boolean; opacity?: number }) {
  const { map } = useMap();
  const srcId = `psa-field-${dataset}-${variable}`;
  const { data: manifest } = useSWR(enabled ? `/api/crep/field/${dataset}/${variable}` : null, fetcher, { refreshInterval: 180000, revalidateOnFocus: false });
  const frames: any[] = Array.isArray(manifest?.frames) ? manifest.frames : [];
  const bounds: number[] | null = Array.isArray(manifest?.bounds) ? manifest.bounds : null;
  const [idx, setIdx] = useState(0);

  // cycle through baked timesteps (image frames only)
  useEffect(() => {
    if (!enabled || frames.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % frames.length), 900);
    return () => clearInterval(t);
  }, [enabled, frames.length]);

  useEffect(() => {
    if (!map) return;
    const remove = () => {
      try {
        if (map.getLayer(srcId)) map.removeLayer(srcId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch {
        /* */
      }
    };
    if (!enabled || !frames.length || !bounds) {
      remove();
      return;
    }
    const frame = frames[Math.min(idx, frames.length - 1)];
    // Web Mercator can't place a raster/image corner at the poles (lat → mercator y = Infinity),
    // which throws ASYNC inside maplibre's image source (uncatchable by the try below). Clamp
    // latitude to the mercator limit and bail on any non-finite bound (e.g. a global ERA5 cube
    // baked to ±90°).
    const MAXLAT = 85.05112878;
    if (!bounds.every((v) => Number.isFinite(v))) {
      remove();
      return;
    }
    const w = bounds[0];
    const e = bounds[2];
    const n = Math.min(bounds[3], MAXLAT);
    const s = Math.max(bounds[1], -MAXLAT);
    const apply = () => {
      try {
        if (frame.image) {
          const coordinates = [[w, n], [e, n], [e, s], [w, s]];
          const src: any = map.getSource(srcId);
          if (src?.updateImage) {
            src.updateImage({ url: frame.image, coordinates });
          } else {
            map.addSource(srcId, { type: "image", url: frame.image, coordinates } as any);
            map.addLayer({ id: srcId, type: "raster", source: srcId, paint: { "raster-opacity": opacity, "raster-fade-duration": 300 } }, beforeId(map));
          }
        } else if (frame.tiles && !map.getSource(srcId)) {
          map.addSource(srcId, { type: "raster", tiles: [frame.tiles], tileSize: 256, bounds: [w, s, e, n] } as any);
          map.addLayer({ id: srcId, type: "raster", source: srcId, paint: { "raster-opacity": opacity } }, beforeId(map));
        }
      } catch {
        /* style mid-load */
      }
    };
    runWhenStyleReady(map, apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled, manifest, idx, opacity]);

  // teardown on unmount
  useEffect(() => {
    return () => {
      try {
        if (map?.getLayer(srcId)) map.removeLayer(srcId);
        if (map?.getSource(srcId)) map.removeSource(srcId);
      } catch {
        /* */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

export function FieldLayers({ layers }: { layers: LayerState }) {
  return (
    <>
      {FIELD_LAYERS.map((f) => (
        <FieldRaster key={f.key} dataset={f.dataset} variable={f.variable} enabled={!!layers[f.key]} opacity={f.opacity} />
      ))}
    </>
  );
}
