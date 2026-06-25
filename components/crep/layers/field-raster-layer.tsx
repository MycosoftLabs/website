"use client";

/**
 * Earth Simulator — generic ANIMATED gridded-field raster layer (Arraylake cubes).
 *
 * Sibling of rainviewer-radar-layer.tsx, but config-driven. Fetches a frame manifest
 * from /api/crep/field/{dataset}/{variable} (baked by the data plane) and renders each
 * per-timestep frame as a stacked MapLibre raster layer, cycling opacity frame-by-frame
 * with a crossfade so the field visibly MOVES — temperature sweeping, reflectivity
 * pulsing, solar irradiance tracking the day/night terminator, NDVI greening.
 *
 * A frame is either:
 *   - { tiles: "<XYZ {z}/{x}/{y} template>" }  → raster tile source (native viewport-culled)
 *   - { image: "<single PNG>" } + manifest.bounds → image source draped on the globe
 *
 * LOD / VIEWPORT (matches the live-radar rules): the parent mounts this behind
 * `shouldRenderHeavyOverlays` (defers past first-paint + pauses during camera animation),
 * exactly like RainViewer. On top of that — because an IMAGE source is always fully
 * decoded (no native tile culling) — this enforces the registry's per-dataset `minZoom`
 * (tears the layer DOWN below the floor) and, for REGIONAL cubes, a viewport-intersection
 * gate (drops the source when the user pans away). Global cubes skip the viewport gate.
 *
 * Self-cleans on disable/unmount. Renders NOTHING (no error) until the cube is baked
 * — the graceful-degrade contract shared with the feed proxy. NO MOCK DATA.
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined;

interface Props {
  map: MapLike;
  dataset: string;
  variable: string;
  enabled: boolean;
  opacity?: number;
  frameMs?: number;
  /** when set, freeze on this frame index instead of auto-playing (external scrubber). */
  scrubIndex?: number | null;
  /** registry zoom floor — below this the layer tears down (radar-style LOD). */
  minZoom?: number;
}

interface Frame { t: string | null; tiles?: string; image?: string }
type Bounds = [number, number, number, number];
interface Manifest { render: string; minZoom?: number; static?: boolean; frames: Frame[]; bounds?: Bounds | null; baked?: boolean }

function resolveMap(m: MapLike): MapLibreMap | null {
  if (!m) return null;
  if (typeof (m as MapLibreMap).getStyle === "function") return m as MapLibreMap;
  return (m as { current?: MapLibreMap | null }).current ?? null;
}

const GLOBAL_BOUNDS: Bounds = [-180, -85, 180, 85];

export default function FieldRasterLayer({ map, dataset, variable, enabled, opacity = 0.72, frameMs = 600, scrubIndex = null, minZoom = 0 }: Props) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const m = resolveMap(map);
    if (!m || !enabled) return;
    let cancelled = false;
    const layerIds: string[] = [];
    const sourceIds: string[] = [];
    let idx = 0;
    let frames: Frame[] = [];
    let bnds: Bounds = GLOBAL_BOUNDS;
    let built = false;

    const PFX = `crep-field-${dataset}-${variable}`;
    const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    const removeAll = () => {
      stopTimer();
      for (const id of layerIds) { try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* */ } }
      for (const id of sourceIds) { try { if (m.getSource(id)) m.removeSource(id); } catch { /* */ } }
      layerIds.length = 0; sourceIds.length = 0; built = false;
    };
    const showFrame = (i: number) => {
      for (let j = 0; j < layerIds.length; j++) {
        try { m.setPaintProperty(layerIds[j], "raster-opacity", j === i ? opacity : 0); } catch { /* */ }
      }
    };

    const build = () => {
      if (cancelled || frames.length === 0) return;
      const [w, s, e, n] = bnds;
      const imageCoords: [number, number][] = [[w, n], [e, n], [e, s], [w, s]];
      // keep fields beneath the labels/markers (first symbol layer) so they never cover icons.
      let beforeId: string | undefined;
      try { beforeId = m.getStyle().layers?.find((l: { type?: string }) => l.type === "symbol")?.id; } catch { /* */ }
      frames.forEach((f, i) => {
        const sid = `${PFX}-src-${i}`;
        const lid = `${PFX}-lyr-${i}`;
        try {
          if (!m.getSource(sid)) {
            if (f.tiles) m.addSource(sid, { type: "raster", tiles: [f.tiles], tileSize: 256, attribution: "Mycosoft / Earthmover" } as never);
            else if (f.image) m.addSource(sid, { type: "image", url: f.image, coordinates: imageCoords } as never);
            else return;
          }
          sourceIds.push(sid);
          if (!m.getLayer(lid)) {
            m.addLayer({
              id: lid, type: "raster", source: sid,
              paint: {
                "raster-opacity": i === idx ? opacity : 0,
                "raster-opacity-transition": { duration: 320 },
                "raster-fade-duration": 0,
                "raster-resampling": "linear",
              },
            }, beforeId);
          }
          layerIds.push(lid);
        } catch { /* */ }
      });
      showFrame(idx);
      stopTimer();
      if (scrubIndex == null && layerIds.length > 1) {
        timerRef.current = setInterval(() => {
          if (cancelled || layerIds.length === 0) return;
          idx = (idx + 1) % layerIds.length;
          showFrame(idx);
        }, Math.max(150, frameMs));
      }
      built = true;
    };

    // Global cubes always pass; regional cubes gate on viewport overlap (radar gets this
    // free from tile sources — our image frames do not).
    const isGlobal = () => bnds[0] <= -179 && bnds[2] >= 179 && bnds[1] <= -60 && bnds[3] >= 60;
    const inView = () => {
      if (isGlobal()) return true;
      try {
        const b = m.getBounds();
        return !(bnds[2] < b.getWest() || bnds[0] > b.getEast() || bnds[3] < b.getSouth() || bnds[1] > b.getNorth());
      } catch { return true; }
    };

    // radar-style LOD: build only when at/above the zoom floor AND in view; tear down below.
    const applyGate = () => {
      if (cancelled || !enabled) return;
      const ok = frames.length > 0 && m.getZoom() >= minZoom && inView();
      if (ok && !built) {
        const start = () => build();
        if (m.isStyleLoaded?.()) start(); else m.once("idle", start);
      } else if (!ok && built) {
        removeAll();
      }
    };

    const load = async () => {
      try {
        const res = await fetch(`/api/crep/field/${dataset}/${variable}`, { cache: "no-store" });
        if (!res.ok) return;
        const man: Manifest = await res.json();
        const f = Array.isArray(man.frames) ? man.frames.filter((fr) => fr.tiles || fr.image) : [];
        if (cancelled) return;
        frames = f;                                    // not baked yet → [] → renders nothing
        bnds = (man.bounds && man.bounds.length === 4 ? man.bounds : GLOBAL_BOUNDS) as Bounds;
        removeAll();
        idx = scrubIndex != null ? Math.max(0, Math.min(frames.length - 1, scrubIndex)) : 0;
        applyGate();
      } catch { /* */ }
    };

    // moveend fires after pan AND zoom → one gate handles both (zoom floor + viewport).
    m.on("moveend", applyGate);
    load();
    const refresh = setInterval(load, 5 * 60_000);

    return () => {
      cancelled = true;
      clearInterval(refresh);
      try { m.off("moveend", applyGate); } catch { /* */ }
      removeAll();
    };
  }, [map, enabled, dataset, variable, opacity, frameMs, scrubIndex, minZoom]);

  return null;
}
