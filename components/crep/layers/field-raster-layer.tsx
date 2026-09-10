"use client";

/**
 * Earth Simulator — generic ANIMATED gridded-field raster layer (Arraylake cubes).
 *
 * Fetches /api/crep/field/{dataset}/{variable} and drapes baked PNGs (or XYZ
 * tiles) on the live MapLibre globe. ON paints the first frame immediately,
 * then crossfades remaining frames like RainViewer. OFF removes only this
 * prefix. Empty bake → no pixels (honest empty), not UNBOUND. NO MOCK DATA.
 *
 * Image overlays stay up at globe zoom. Do not tear them down for CONUS
 * viewport / antimeridian getBounds() — that is why HRRR/MRMS looked dead.
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { FieldPlaybackSnapshot } from "@/lib/crep/fields/field-playback";
import {
  boundsIntersect,
  getLogicalViewportBounds,
  isAnimatedPaused,
  registerAnimatedLayer,
} from "@/lib/crep/viewport-memory-governor";

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined;

interface Props {
  map: MapLike;
  dataset: string;
  variable: string;
  enabled: boolean;
  opacity?: number;
  frameMs?: number;
  playing?: boolean;
  scrubIndex?: number | null;
  onPlaybackStateChange?: (snapshot: FieldPlaybackSnapshot) => void;
  minZoom?: number;
}

interface Frame { t: string | null; tiles?: string; image?: string }
type Bounds = [number, number, number, number];
interface Manifest { render: string; minZoom?: number; static?: boolean; frames: Frame[]; bounds?: Bounds | null; baked?: boolean }

type LiveDataProbe = {
  enabled: string;
  sources: string[];
  frameCount: number;
  event: string;
};

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

function publishLiveData(pfx: string, sources: string[], frameCount: number, event: string) {
  if (typeof window === "undefined") return;
  // Do not overwrite window.__crep_live_data — CREPDashboardClient owns that
  // as { enabled: string[] }. Field probe lives beside it.
  (window as unknown as { __crep_field_probe: LiveDataProbe }).__crep_field_probe = {
    enabled: pfx,
    sources,
    frameCount,
    event,
  };
}

const GLOBAL_BOUNDS: Bounds = [-180, -85, 180, 85];

export default function FieldRasterLayer({
  map,
  dataset,
  variable,
  enabled,
  opacity = 0.72,
  frameMs = 600,
  playing = true,
  scrubIndex = null,
  onPlaybackStateChange,
}: Props) {
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
      let idx = 0;
      let visibleSlot = 0;
      let frames: Frame[] = [];
      let bnds: Bounds = GLOBAL_BOUNDS;
      let built = false;

      const PFX = `crep-field-${dataset}-${variable}`;
      const stopTimer = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      const removeAll = () => {
        stopTimer();
        for (const id of layerIds) {
          try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* style may have reset */ }
        }
        for (const id of sourceIds) {
          try { if (m.getSource(id)) m.removeSource(id); } catch { /* style may have reset */ }
        }
        layerIds.length = 0;
        sourceIds.length = 0;
        built = false;
      };
      const showSlot = (slot: number) => {
        for (let j = 0; j < 2; j++) {
          try { m.setPaintProperty(`${PFX}-lyr-${j}`, "raster-opacity", j === slot ? opacity : 0); } catch { /* */ }
        }
        visibleSlot = slot;
      };

      const paintSlot = (slot: number, frame: Frame, visible: boolean) => {
        const [w, s, e, n] = bnds;
        const imageCoords: [number, number][] = [[w, n], [e, n], [e, s], [w, s]];
        let beforeId: string | undefined;
        try { beforeId = m.getStyle().layers?.find((l: { type?: string }) => l.type === "symbol")?.id; } catch { /* */ }
        const sid = `${PFX}-src-${slot}`;
        const lid = `${PFX}-lyr-${slot}`;
        const existing = m.getSource(sid) as { updateImage?: (opts: { url: string; coordinates: [number, number][] }) => void } | undefined;
        if (existing?.updateImage && frame.image) {
          try { existing.updateImage({ url: frame.image, coordinates: imageCoords }); } catch { /* keep current pixels */ }
        } else if (!existing) {
          if (frame.tiles) {
            m.addSource(sid, { type: "raster", tiles: [frame.tiles], tileSize: 256, attribution: "Mycosoft / Earthmover" } as never);
          } else if (frame.image) {
            m.addSource(sid, { type: "image", url: frame.image, coordinates: imageCoords } as never);
          } else {
            return false;
          }
          if (!sourceIds.includes(sid)) sourceIds.push(sid);
        } else if (frame.tiles) {
          try { if (m.getLayer(lid)) m.removeLayer(lid); } catch { /* */ }
          try { if (m.getSource(sid)) m.removeSource(sid); } catch { /* */ }
          m.addSource(sid, { type: "raster", tiles: [frame.tiles], tileSize: 256, attribution: "Mycosoft / Earthmover" } as never);
          if (!sourceIds.includes(sid)) sourceIds.push(sid);
        }
        if (!m.getLayer(lid)) {
          m.addLayer({
            id: lid,
            type: "raster",
            source: sid,
            interactive: false,
            paint: {
              "raster-opacity": visible ? opacity : 0,
              "raster-opacity-transition": { duration: 240 },
              "raster-fade-duration": 0,
              "raster-resampling": "linear",
            },
          }, beforeId);
        } else {
          try { m.setPaintProperty(lid, "raster-opacity", visible ? opacity : 0); } catch { /* */ }
        }
        if (!layerIds.includes(lid)) layerIds.push(lid);
        return true;
      };

      const emit = (event: FieldPlaybackSnapshot["event"]) => {
        onPlaybackStateChange?.({
          layerId: PFX,
          dataset,
          variable,
          frameIndex: idx,
          frameCount: frames.length,
          playing: playing !== false && frames.length > 1 && scrubIndex == null,
          retained: true,
          validAt: frames[idx]?.t ?? null,
          visibleLayerId: `${PFX}-lyr-${visibleSlot}`,
          event,
        });
        publishLiveData(PFX, [...sourceIds], frames.length, event);
      };

      const inView = () => {
        const view = getLogicalViewportBounds(m);
        const field = { west: bnds[0], south: bnds[1], east: bnds[2], north: bnds[3] };
        return boundsIntersect(view, field);
      };
      const hideSlots = () => {
        for (let j = 0; j < 2; j++) {
          try { m.setPaintProperty(`${PFX}-lyr-${j}`, "raster-opacity", 0); } catch { /* */ }
        }
      };
      const startAnimation = () => {
        stopTimer();
        if (playing === false || scrubIndex != null || frames.length < 2) return;
        if (isAnimatedPaused(PFX) || !inView()) {
          if (!inView()) hideSlots();
          return;
        }
        timerRef.current = setInterval(() => {
          if (cancelled || frames.length === 0) return;
          if (isAnimatedPaused(PFX) || !inView()) {
            if (!inView()) hideSlots();
            return;
          }
          idx = (idx + 1) % frames.length;
          const nextSlot = 1 - visibleSlot;
          try { paintSlot(nextSlot, frames[idx], true); } catch { /* keep current slot */ }
          showSlot(nextSlot);
          const preload = frames[(idx + 1) % frames.length];
          if (preload) {
            try { paintSlot(1 - nextSlot, preload, false); } catch { /* */ }
          }
          emit("frame-painted");
        }, Math.max(150, frameMs));
      };

      const build = () => {
        if (cancelled || frames.length === 0 || built) return;
        idx = scrubIndex != null ? Math.max(0, Math.min(frames.length - 1, scrubIndex)) : 0;
        try {
          paintSlot(0, frames[idx], true);
        } catch { /* first frame may retry on styledata */ }
        if (frames.length > 1) {
          try { paintSlot(1, frames[(idx + 1) % frames.length], false); } catch { /* first frame is enough */ }
        }
        showSlot(0);
        built = sourceIds.length > 0;
        if (built) {
          emit("frame-painted");
          startAnimation();
        }
      };

      const applyGate = () => {
        if (cancelled || !enabled || frames.length === 0) return;
        let hasFirst = false;
        try { hasFirst = Boolean(m.getSource(`${PFX}-src-0`)); } catch { hasFirst = false; }
        if (hasFirst) {
          built = true;
          return;
        }
        layerIds.length = 0;
        sourceIds.length = 0;
        built = false;
        try { build(); } catch { /* styledata / gatePoll retry */ }
      };

      const load = async () => {
        try {
          const res = await fetch(`/api/crep/field/${dataset}/${variable}`, { cache: "no-store" });
          if (!res.ok) return;
          const man: Manifest = await res.json();
          const f = Array.isArray(man.frames) ? man.frames.filter((fr) => fr.tiles || fr.image) : [];
          if (cancelled) return;
          frames = f;
          bnds = (man.bounds && man.bounds.length === 4 ? man.bounds : GLOBAL_BOUNDS) as Bounds;
          removeAll();
          idx = scrubIndex != null ? Math.max(0, Math.min(Math.max(frames.length - 1, 0), scrubIndex)) : 0;
          if (frames.length === 0) {
            publishLiveData(PFX, [], 0, "empty");
            return;
          }
          applyGate();
        } catch { /* honest empty until the next refresh */ }
      };

      m.on("styledata", applyGate);
      const onMoveEnd = () => {
        if (!inView()) {
          stopTimer();
          hideSlots();
          return;
        }
        showSlot(visibleSlot);
        startAnimation();
      };
      m.on("moveend", onMoveEnd);
      const unreg = registerAnimatedLayer(PFX, "field-raster", () => { stopTimer(); }, () => { startAnimation(); });
      load();
      const refresh = setInterval(load, 5 * 60_000);
      const gatePoll = setInterval(applyGate, 400);
      detach = () => {
        clearInterval(refresh);
        clearInterval(gatePoll);
        unreg();
        try { m.off("styledata", applyGate); m.off("moveend", onMoveEnd); } catch { /* */ }
        removeAll();
      };
    };

    const tryAttach = () => {
      if (cancelled || attached) return;
      const resolved = resolveMap(map);
      if (!resolved) return;
      attached = resolved;
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
      start(resolved);
    };

    tryAttach();
    if (!attached) poll = setInterval(tryAttach, 200);

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      detach();
    };
  }, [map, enabled, dataset, variable, opacity, frameMs, playing, scrubIndex, onPlaybackStateChange]);

  return null;
}
