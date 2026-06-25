"use client";

/**
 * Earth Simulator — ANIMATED wind-particle layer for Arraylake vector cubes
 * (ERA5 10 m wind, HRRR 10 m wind, GEO stereo wind).
 *
 * Fetches the frame manifest from /api/crep/field/{dataset}/{variable}; each frame is
 * a velocity-grid JSON baked by the data plane:
 *   { width, height, bounds:[w,s,e,n], u:Float[], v:Float[] }   // row-major, north→south
 * Advects particles in GEO space (lng/lat), projecting each to screen via map.project()
 * every frame, so the flow tracks the globe through pan/zoom. Fading trails give the
 * classic earth.nullschool / windy look. Canvas overlay, no API key.
 *
 * LOD / VIEWPORT (matches the live-radar rules + the extra gates a canvas needs):
 *   - mounted by the parent behind `shouldRenderHeavyOverlays` (defers past first-paint,
 *     pauses during camera animation on the non-v3 path) — same as RainViewer;
 *   - PAUSES the rAF on movestart/zoomstart/… and resumes on settle (covers the v3-globe
 *     path where the mount gate does NOT pause, and is cheaper than re-mounting);
 *   - enforces the registry `minZoom` floor (tears the loop down below it);
 *   - device-class particle cap (fewer on phones/tablets, mover-cap analog).
 *
 * Mount one per enabled wind field:
 *   <FieldWindLayer map={mapRef} dataset="geo-stereo-wind" variable="wind" enabled={on} minZoom={0} />
 * Self-cleans. Renders nothing until the cube is baked.
 *
 * NOTE: particle positions are globe-correct (projected per-frame); the streak segment is
 * a screen-space approximation accurate at low/moderate tilt. A fully globe-locked WebGL
 * particle layer is the BlueSite v2 upgrade (lib/crep/bluesite).
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined;

interface Props {
  map: MapLike;
  dataset: string;
  variable: string;
  enabled: boolean;
  particles?: number;
  /** trail persistence per frame (0..1); higher = longer trails. */
  trail?: number;
  /** registry zoom floor — below this the particle loop tears down (radar-style LOD). */
  minZoom?: number;
}

interface Grid { width: number; height: number; bounds: [number, number, number, number]; u: number[]; v: number[] }

const MOVE_START = ["movestart", "zoomstart", "dragstart", "rotatestart", "pitchstart"];
const MOVE_END = ["moveend", "zoomend"];

function resolveMap(m: MapLike): MapLibreMap | null {
  if (!m) return null;
  if (typeof (m as MapLibreMap).getStyle === "function") return m as MapLibreMap;
  return (m as { current?: MapLibreMap | null }).current ?? null;
}

export default function FieldWindLayer({ map, dataset, variable, enabled, particles = 3500, trail = 0.92, minZoom = 0 }: Props) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const m = resolveMap(map);
    if (!m || !enabled) return;
    let cancelled = false;

    const container = m.getCanvasContainer();
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { position: "absolute", top: "0", left: "0", pointerEvents: "none", zIndex: "4" });
    canvas.className = `crep-wind-${dataset}-${variable}`;
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let grid: Grid | null = null;
    let parts: Array<{ lng: number; lat: number; age: number }> = [];
    const MAX_AGE = 70;
    let lastT = 0;      // previous frame timestamp → device-independent (dt-scaled) advection
    let moving = false; // true while the camera is animating → pause the loop (radar-style)
    // device-class cap — fewer particles on phones/tablets (analogous to the mover render caps).
    const cap = Math.max(
      400,
      Math.round(particles * (typeof window !== "undefined" && window.innerWidth < 768 ? 0.4 : typeof window !== "undefined" && window.innerWidth < 1100 ? 0.7 : 1)),
    );

    const dpr = () => { const c = m.getCanvas(); return (c.width || 1) / (c.clientWidth || 1); };
    const sizeCanvas = () => {
      const c = m.getCanvas();
      canvas.width = c.width; canvas.height = c.height;
      canvas.style.width = `${c.clientWidth}px`; canvas.style.height = `${c.clientHeight}px`;
    };
    sizeCanvas();
    const clearCanvas = () => { try { ctx?.clearRect(0, 0, canvas.width, canvas.height); } catch { /* */ } };

    const randParticle = () => {
      const b = m.getBounds();
      return {
        lng: b.getWest() + Math.random() * (b.getEast() - b.getWest()),
        lat: b.getSouth() + Math.random() * (b.getNorth() - b.getSouth()),
        age: Math.floor(Math.random() * MAX_AGE),
      };
    };
    const seed = () => { parts = Array.from({ length: cap }, randParticle); };

    // bilinear sample of u/v (m/s) at lng/lat, or null outside the grid.
    const sample = (lng: number, lat: number): [number, number] | null => {
      if (!grid) return null;
      const [w, s, e, n] = grid.bounds;
      if (lng < w || lng > e || lat < s || lat > n) return null;
      const fx = ((lng - w) / (e - w)) * (grid.width - 1);
      const fy = ((n - lat) / (n - s)) * (grid.height - 1); // row 0 = north
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, grid.width - 1), y1 = Math.min(y0 + 1, grid.height - 1);
      const tx = fx - x0, ty = fy - y0;
      const at = (x: number, y: number, arr: number[]) => arr[y * grid!.width + x];
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const u = lerp(lerp(at(x0, y0, grid.u), at(x1, y0, grid.u), tx), lerp(at(x0, y1, grid.u), at(x1, y1, grid.u), tx), ty);
      const v = lerp(lerp(at(x0, y0, grid.v), at(x1, y0, grid.v), tx), lerp(at(x0, y1, grid.v), at(x1, y1, grid.v), tx), ty);
      if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
      return [u, v];
    };

    const speedColor = (sp: number) => {
      const t = Math.min(1, sp / 40); // 0..40 m/s
      if (t < 0.5) return `rgba(${Math.round(140 + t * 180)},230,255,0.85)`;
      return `rgba(255,${Math.round(255 - (t - 0.5) * 260)},${Math.round(180 - (t - 0.5) * 170)},0.9)`;
    };

    const step = () => {
      if (cancelled) return;
      if (ctx && grid) {
        // fade previous frame for trails
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0,0,0,${1 - trail})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
        const d = dpr();
        const zoom = m.getZoom();
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        const dtf = lastT ? Math.min(3, (now - lastT) / 16.67) : 1; // frame-time factor → speed is device-independent
        lastT = now;
        const moveScale = (0.05 / Math.pow(1.7, Math.max(0, zoom - 2))) * dtf; // deg per (m/s·frame @60fps), shrinks zooming in
        ctx.lineWidth = 1.1 * d;
        for (const p of parts) {
          const uv = sample(p.lng, p.lat);
          if (!uv || p.age > MAX_AGE) { Object.assign(p, randParticle()); p.age = 0; continue; }
          const [u, v] = uv;
          const sp = Math.hypot(u, v);
          const p0 = m.project([p.lng, p.lat]);
          p.lng += (u * moveScale) / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180));
          p.lat += v * moveScale;
          p.age += 1;
          const p1 = m.project([p.lng, p.lat]);
          if (!p0 || !p1) continue;
          ctx.strokeStyle = speedColor(sp);
          ctx.beginPath();
          ctx.moveTo(p0.x * d, p0.y * d);
          ctx.lineTo(p1.x * d, p1.y * d);
          ctx.stroke();
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };

    // radar-style LOD: run only when loaded, enabled, not mid-camera-move, and at/above the floor.
    const wantRun = () => !cancelled && enabled && grid != null && !moving && m.getZoom() >= minZoom;
    const startLoop = () => { if (rafRef.current == null && wantRun()) { lastT = 0; rafRef.current = requestAnimationFrame(step); } };
    const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
    const reGate = () => { if (wantRun()) startLoop(); else { stopLoop(); clearCanvas(); } };

    const onMoveStart = () => { moving = true; stopLoop(); };
    const onMoveEnd = () => { moving = false; reGate(); };

    const loadGrid = async () => {
      try {
        const res = await fetch(`/api/crep/field/${dataset}/${variable}`, { cache: "no-store" });
        if (!res.ok) return;
        const man = await res.json();
        const frames: any[] = Array.isArray(man.frames) ? man.frames.filter((f: any) => f.grid) : [];
        if (cancelled || frames.length === 0) return; // not baked yet
        const g = await fetch(frames[frames.length - 1].grid, { cache: "force-cache" });
        if (!g.ok) return;
        const data = await g.json();
        if (cancelled || !Array.isArray(data?.u) || !Array.isArray(data?.v)) return;
        grid = data as Grid;
        seed();
        reGate();
      } catch { /* */ }
    };

    const onResize = () => { sizeCanvas(); };
    m.on("resize", onResize);
    for (const ev of MOVE_START) m.on(ev as never, onMoveStart);
    for (const ev of MOVE_END) m.on(ev as never, onMoveEnd);
    loadGrid();
    const refresh = setInterval(loadGrid, 5 * 60_000);

    return () => {
      cancelled = true;
      clearInterval(refresh);
      stopLoop();
      try {
        m.off("resize", onResize);
        for (const ev of MOVE_START) m.off(ev as never, onMoveStart);
        for (const ev of MOVE_END) m.off(ev as never, onMoveEnd);
      } catch { /* */ }
      try { container.removeChild(canvas); } catch { /* */ }
    };
  }, [map, enabled, dataset, variable, particles, trail, minZoom]);

  return null;
}
