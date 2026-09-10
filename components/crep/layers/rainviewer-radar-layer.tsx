"use client";

/**
 * Live animated weather radar (RainViewer) for the Earth Simulator MapLibre map.
 *
 * Two-slot animation (same as FieldRasterLayer): only the current + next radar
 * mosaic stay on the style. Twelve stacked global sources were the OOM path.
 * Tiles stay viewport-culled by MapLibre. Pause on tilt/rotate/hidden-tab /
 * governor pressure — do not unmount (that is why radar flickered).
 *
 * No API key. No mock frames. Honest empty if RainViewer is down.
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  registerAnimatedLayer,
  isAnimatedPaused,
} from "@/lib/crep/viewport-memory-governor";

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined;

interface Props {
  map: MapLike;
  enabled: boolean;
  opacity?: number;
  frameMs?: number;
}

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";
const TILE = 256;
const COLOR_SCHEME = 4;
const OPTIONS = "1_1";
const MOVE_START = ["movestart", "zoomstart", "dragstart", "rotatestart", "pitchstart"];
const MOVE_END = ["moveend", "zoomend"];

function resolveMap(m: MapLike): MapLibreMap | null {
  if (m && typeof (m as MapLibreMap).getStyle === "function") return m as MapLibreMap;
  const fromRef = m && typeof m === "object" && "current" in m
    ? (m as { current?: MapLibreMap | null }).current
    : null;
  if (fromRef && typeof fromRef.getStyle === "function") return fromRef;
  if (typeof window !== "undefined") {
    const globalMap = (window as unknown as { __crep_map?: MapLibreMap }).__crep_map;
    if (globalMap && typeof globalMap.getStyle === "function") return globalMap;
  }
  return null;
}

export default function RainViewerRadarLayer({ map, enabled, opacity = 0.7, frameMs = 500 }: Props) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let attached: MapLibreMap | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let detach = () => {};

    const start = (m: MapLibreMap) => {
      const layerIds: string[] = [];
      const sourceIds: string[] = [];
      let frames: Array<{ time: number; path: string }> = [];
      let host = "https://tilecache.rainviewer.com";
      let idx = 0;
      let visibleSlot = 0;
      let moving = false;

      const stopTimer = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      const removeAll = () => {
        stopTimer();
        for (const id of layerIds) { try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* */ } }
        for (const id of sourceIds) { try { if (m.getSource(id)) m.removeSource(id); } catch { /* */ } }
        layerIds.length = 0;
        sourceIds.length = 0;
      };
      const tileUrl = (frame: { path: string }) =>
        `${host}${frame.path}/${TILE}/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`;

      const paintSlot = (slot: number, frame: { path: string }, visible: boolean) => {
        const sid = `rainviewer-src-${slot}`;
        const lid = `rainviewer-lyr-${slot}`;
        let beforeId: string | undefined;
        try { beforeId = m.getStyle().layers?.find((l: { type?: string }) => l.type === "symbol")?.id; } catch { /* */ }
        try {
          if (m.getLayer(lid)) m.removeLayer(lid);
          if (m.getSource(sid)) m.removeSource(sid);
        } catch { /* */ }
        m.addSource(sid, {
          type: "raster",
          tiles: [tileUrl(frame)],
          tileSize: TILE,
          maxzoom: 7,
          attribution: "RainViewer",
        } as never);
        if (!sourceIds.includes(sid)) sourceIds.push(sid);
        m.addLayer({
          id: lid,
          type: "raster",
          source: sid,
          interactive: false,
          paint: {
            "raster-opacity": visible ? opacity : 0,
            "raster-opacity-transition": { duration: 240 },
            "raster-fade-duration": 0,
          },
        }, beforeId);
        if (!layerIds.includes(lid)) layerIds.push(lid);
      };

      const showSlot = (slot: number) => {
        for (let j = 0; j < 2; j++) {
          try { m.setPaintProperty(`rainviewer-lyr-${j}`, "raster-opacity", j === slot ? opacity : 0); } catch { /* */ }
        }
        visibleSlot = slot;
      };

      const wantRun = () => !cancelled && enabled && frames.length > 1 && !moving && !isAnimatedPaused("weatherRadar");
      const startTimer = () => {
        stopTimer();
        if (!wantRun()) return;
        timerRef.current = setInterval(() => {
          if (!wantRun()) return;
          idx = (idx + 1) % frames.length;
          const nextSlot = 1 - visibleSlot;
          try { paintSlot(nextSlot, frames[idx], true); } catch { /* keep current */ }
          showSlot(nextSlot);
        }, Math.max(150, frameMs));
      };

      const build = () => {
        if (cancelled || frames.length === 0) return;
        try { paintSlot(0, frames[idx], true); } catch { /* */ }
        if (frames.length > 1) {
          try { paintSlot(1, frames[(idx + 1) % frames.length], false); } catch { /* */ }
        }
        showSlot(0);
        startTimer();
        if (typeof window !== "undefined") {
          (window as unknown as { __crep_radar_probe: { sources: string[]; frames: number; event: string } }).__crep_radar_probe = {
            sources: [...sourceIds],
            frames: frames.length,
            event: "frame-painted",
          };
        }
      };

      const loadAndBuild = async () => {
        try {
          const res = await fetch(RAINVIEWER_API, { cache: "no-store" });
          if (!res.ok) return;
          const d = await res.json();
          host = d?.host || host;
          const past = Array.isArray(d?.radar?.past) ? d.radar.past : [];
          const nowcast = Array.isArray(d?.radar?.nowcast) ? d.radar.nowcast : [];
          const next = [...past, ...nowcast].slice(-12);
          if (cancelled || next.length === 0) return;
          frames = next;
          idx = 0;
          removeAll();
          const startBuild = () => build();
          if (m.isStyleLoaded?.()) startBuild(); else m.once("idle", startBuild);
        } catch { /* honest empty */ }
      };

      const onMoveStart = () => { moving = true; stopTimer(); };
      const onMoveEnd = () => { moving = false; if (wantRun()) startTimer(); };
      for (const ev of MOVE_START) m.on(ev as never, onMoveStart);
      for (const ev of MOVE_END) m.on(ev as never, onMoveEnd);

      const unreg = registerAnimatedLayer(
        "weatherRadar",
        "radar",
        () => { stopTimer(); },
        () => { if (wantRun()) startTimer(); },
      );

      loadAndBuild();
      const refreshTimer = setInterval(loadAndBuild, 5 * 60_000);
      detach = () => {
        cancelled = true;
        clearInterval(refreshTimer);
        unreg();
        try {
          for (const ev of MOVE_START) m.off(ev as never, onMoveStart);
          for (const ev of MOVE_END) m.off(ev as never, onMoveEnd);
        } catch { /* */ }
        removeAll();
      };
    };

    const tryAttach = () => {
      if (cancelled || attached) return;
      const resolved = resolveMap(map);
      if (!resolved) return;
      attached = resolved;
      if (poll) { clearInterval(poll); poll = null; }
      start(resolved);
    };

    tryAttach();
    if (!attached) poll = setInterval(tryAttach, 200);

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      detach();
    };
  }, [map, enabled, opacity, frameMs]);

  return null;
}
