"use client";

/**
 * Live animated weather radar (RainViewer) for the Earth Simulator MapLibre map.
 *
 * Fetches RainViewer's public weather-maps manifest (past + nowcast radar frames) and
 * renders them as stacked MapLibre raster layers, cycling opacity frame-by-frame so the
 * precipitation visibly MOVES — "live weather motion". Tiles are browser-cached after the
 * first loop, so the animation is smooth. No API key.
 *
 * Mount one of these gated by a toggle: <RainViewerRadarLayer map={mapRef} enabled={on} />.
 * Self-cleans on disable/unmount (removes every layer + source, stops the timer).
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined;

interface Props {
  map: MapLike;
  enabled: boolean;
  opacity?: number;
  /** ms per frame — lower = faster weather motion. */
  frameMs?: number;
}

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";
const TILE = 256;
const COLOR_SCHEME = 4;   // "The Weather Channel" palette — readable on a dark basemap
const OPTIONS = "1_1";    // smooth + snow

function resolveMap(m: MapLike): MapLibreMap | null {
  if (!m) return null;
  if (typeof (m as MapLibreMap).getStyle === "function") return m as MapLibreMap;
  return (m as { current?: MapLibreMap | null }).current ?? null;
}

export default function RainViewerRadarLayer({ map, enabled, opacity = 0.7, frameMs = 500 }: Props) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const m = resolveMap(map);
    if (!m || !enabled) return;
    let cancelled = false;
    const layerIds: string[] = [];
    const sourceIds: string[] = [];
    let idx = 0;

    const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

    const removeAll = () => {
      stopTimer();
      for (const id of layerIds) { try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* */ } }
      for (const id of sourceIds) { try { if (m.getSource(id)) m.removeSource(id); } catch { /* */ } }
      layerIds.length = 0; sourceIds.length = 0;
    };

    const showFrame = (i: number) => {
      for (let j = 0; j < layerIds.length; j++) {
        try { m.setPaintProperty(layerIds[j], "raster-opacity", j === i ? opacity : 0); } catch { /* */ }
      }
    };

    const build = (host: string, frames: Array<{ time: number; path: string }>) => {
      if (cancelled || frames.length === 0) return;
      // Keep radar beneath the labels/markers (first symbol layer) so it never covers icons.
      let beforeId: string | undefined;
      try { beforeId = m.getStyle().layers?.find((l: { type?: string }) => l.type === "symbol")?.id; } catch { /* */ }
      frames.forEach((f, i) => {
        const sid = `rainviewer-src-${i}`;
        const lid = `rainviewer-lyr-${i}`;
        const url = `${host}${f.path}/${TILE}/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`;
        try {
          // RainViewer's radar mosaic only has data through zoom 7. Requesting z8+ returns a
          // literal gray "Zoom Level Not Supported" placeholder PNG. Declaring maxzoom: 7 makes
          // MapLibre upscale the z7 tile at every higher zoom (blurry-but-present radar, like all
          // other weather maps) instead of fetching the placeholder. THIS is the fix for the boxes.
          if (!m.getSource(sid)) m.addSource(sid, { type: "raster", tiles: [url], tileSize: TILE, maxzoom: 7, attribution: "RainViewer" } as never);
          sourceIds.push(sid);
          if (!m.getLayer(lid)) {
            m.addLayer({
              id: lid, type: "raster", source: sid,
              // Hard-cut frame swaps: only the single visible frame ever paints (MapLibre skips
              // raster layers at opacity 0), and there is NO continuous opacity transition pinning
              // the map in a repaint loop. Big FPS win + reads as more obviously animated.
              paint: { "raster-opacity": i === idx ? opacity : 0, "raster-opacity-transition": { duration: 0 }, "raster-fade-duration": 0 },
            }, beforeId);
          }
          layerIds.push(lid);
        } catch { /* */ }
      });
      showFrame(idx);
      stopTimer();
      timerRef.current = setInterval(() => {
        if (cancelled || layerIds.length === 0) return;
        idx = (idx + 1) % layerIds.length;
        showFrame(idx);
      }, Math.max(150, frameMs));
    };

    const loadAndBuild = async () => {
      try {
        const res = await fetch(RAINVIEWER_API, { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        const host: string = d?.host || "https://tilecache.rainviewer.com";
        const past = Array.isArray(d?.radar?.past) ? d.radar.past : [];
        const nowcast = Array.isArray(d?.radar?.nowcast) ? d.radar.nowcast : [];
        const frames = [...past, ...nowcast].slice(-12);
        if (cancelled || frames.length === 0) return;
        removeAll();   // drop the previous frame set, then rebuild with the fresh radar
        idx = 0;
        const start = () => build(host, frames);
        if (m.isStyleLoaded?.()) start(); else m.once("idle", start);
      } catch { /* */ }
    };

    loadAndBuild();
    // Pull fresh RainViewer frames every 5 min so a user who sits on the page keeps seeing NEW
    // radar (RainViewer publishes a new past/nowcast frame every ~10 min) — not a frozen loop.
    const refreshTimer = setInterval(loadAndBuild, 5 * 60_000);

    return () => { cancelled = true; clearInterval(refreshTimer); removeAll(); };
  }, [map, enabled, opacity, frameMs]);

  return null;
}
