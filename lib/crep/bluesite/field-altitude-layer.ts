"use client";

/**
 * Earth Simulator v3 — TRUE-3D wind-field particle layer (BlueSite / Three.js).
 *
 * The 3D-globe upgrade of the 2D canvas layer `components/crep/layers/field-wind-layer.tsx`.
 * Consumes the SAME data contract — the velocity-grid manifest from
 * `/api/crep/field/{dataset}/{variable}` (`frames[].grid` → `{width,height,bounds,u,v}`) — and
 * renders a `THREE.Points` particle field advected by the wind, mounted on the globe through the
 * BlueSite harness (`createBlueSiteStack` / `three-maplibre-layer.ts`). One registry, one bake,
 * two renderers: MapLibre canvas (v2) + this (v3).
 *
 * ── STATUS / HANDOFF (Cursor) ────────────────────────────────────────────────────────────────
 * Structure is complete and type-clean, but it is INTENTIONALLY UNMOUNTED. Mount it for v3
 * (gate on `isV3GlobeEngine`) and VISUALLY TUNE two things on the running v3 globe:
 *   1. GLOBE-WARP positioning (see writePos below) — accept the mercator approximation, add a
 *      globe-warp vertex shader, or keep per-object matrices for a coarse grid. Iterate visually.
 *   2. Particle count / altitude shell / size / speed-scale — tune for FPS + look on the photoreal
 *      basemap. Prefer passing the SHARED BlueSite stack (one WebGL context) rather than a private one.
 * Driven by the same toggle state: mount when `layers.find(l => l.id === fieldLayerId(ds, v)).enabled`
 * and `v.render === "wind"`. Tear down via the returned disposer. Do NOT fork the data layer.
 */

import * as THREE from "three";
import type { Map as MapLibreMap } from "maplibre-gl";
import { createBlueSiteStack, type BlueSiteStack, type BlueSiteFrameContext } from "./three-maplibre-layer";

interface Grid { width: number; height: number; bounds: [number, number, number, number]; u: number[]; v: number[] }

export interface FieldWindAltitudeOptions {
  dataset: string;
  variable: string;
  /** Share the global BlueSite stack (preferred — one WebGL context). If omitted, a private stack
   *  + custom layer is created and added to the map. */
  stack?: BlueSiteStack;
  /** Particle count (tune down on weak GPUs). */
  particles?: number;
  /** Visual altitude shell in meters (lift the flow off the surface). */
  altitudeMeters?: number;
  /** Max m/s for the speed→color ramp. */
  maxSpeed?: number;
}

/** Mount a 3D wind-particle field on the globe. Returns a disposer. */
export function mountFieldWindAltitude(map: MapLibreMap, opts: FieldWindAltitudeOptions): () => void {
  const { dataset, variable } = opts;
  const N = Math.max(500, opts.particles ?? 6000);
  const ALT = opts.altitudeMeters ?? 15000;
  const MAX_SPEED = opts.maxSpeed ?? 40;
  const MAX_AGE = 90;

  const ownStack = !opts.stack;
  const stack = opts.stack ?? createBlueSiteStack(`bluesite-field-${dataset}-${variable}`);

  let grid: Grid | null = null;
  let disposed = false;
  let unregister: (() => void) | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  // particle state (geo-space), parallel to the geometry buffers
  const lng = new Float32Array(N);
  const lat = new Float32Array(N);
  const age = new Float32Array(N);
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 2.2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // points span the globe; never frustum-cull the whole field

  const inBounds = (lo: number, la: number) => {
    if (!grid) return false;
    const [w, s, e, n] = grid.bounds;
    return lo >= w && lo <= e && la >= s && la <= n;
  };
  const randLng = () => { const b = grid!.bounds; return b[0] + Math.random() * (b[2] - b[0]); };
  const randLat = () => { const b = grid!.bounds; return b[1] + Math.random() * (b[3] - b[1]); };

  // bilinear sample of u/v (m/s) at lng/lat (row 0 = north), or null outside the grid.
  const sample = (lo: number, la: number): [number, number] | null => {
    if (!grid) return null;
    const [w, s, e, n] = grid.bounds;
    if (lo < w || lo > e || la < s || la > n) return null;
    const fx = ((lo - w) / (e - w)) * (grid.width - 1);
    const fy = ((n - la) / (n - s)) * (grid.height - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, grid.width - 1), y1 = Math.min(y0 + 1, grid.height - 1);
    const tx = fx - x0, ty = fy - y0;
    const at = (x: number, y: number, a: number[]) => a[y * grid!.width + x];
    const lp = (a: number, b: number, t: number) => a + (b - a) * t;
    const u = lp(lp(at(x0, y0, grid.u), at(x1, y0, grid.u), tx), lp(at(x0, y1, grid.u), at(x1, y1, grid.u), tx), ty);
    const vv = lp(lp(at(x0, y0, grid.v), at(x1, y0, grid.v), tx), lp(at(x0, y1, grid.v), at(x1, y1, grid.v), tx), ty);
    return Number.isFinite(u) && Number.isFinite(vv) ? [u, vv] : null;
  };

  const seed = (i: number) => { lng[i] = randLng(); lat[i] = randLat(); age[i] = Math.random() * MAX_AGE; };

  const writePos = (i: number) => {
    // GLOBE-WARP NOTE (Cursor visual-tuning TODO): toWorld() is MERCATOR space. The globe is a
    // non-linear sphere warp applied in MapLibre's shader, so thousands of scattered points placed
    // via one camera matrix drift slightly near the limb. mover-altitude uses the same pragmatic
    // path for the satellite shell. Tune on the running v3 globe: (a) accept the approximation
    // (fine at low/moderate zoom — start here); (b) a custom vertex shader applying the globe warp;
    // (c) per-object modelMatrixFor (globe-correct but one matrix/point is infeasible at this count).
    const wld = stack.toWorld(lng[i], lat[i], ALT);
    positions[i * 3] = wld.x; positions[i * 3 + 1] = wld.y; positions[i * 3 + 2] = wld.z;
  };
  const writeColor = (i: number, speed: number) => {
    const t = Math.min(1, speed / MAX_SPEED); // cyan → white → amber
    colors[i * 3] = t < 0.5 ? 0.5 + t : 1;
    colors[i * 3 + 1] = Math.max(0, t < 0.5 ? 0.9 : 1 - (t - 0.5) * 0.9);
    colors[i * 3 + 2] = Math.max(0, t < 0.5 ? 1 : 0.7 - (t - 0.5) * 1.2);
  };

  let lastElapsed = 0;
  const onFrame = (ctx: BlueSiteFrameContext) => {
    if (!grid) return;
    const dt = Math.min(0.1, Math.max(0, ctx.elapsed - lastElapsed));
    lastElapsed = ctx.elapsed;
    // deg/sec per m/s, shrinking as you zoom in (parity with the 2D layer's feel)
    const moveScale = (3.2 / Math.pow(1.7, Math.max(0, ctx.zoom - 2))) * dt;
    for (let i = 0; i < N; i++) {
      const uv = sample(lng[i], lat[i]);
      if (!uv || age[i] > MAX_AGE) { seed(i); writePos(i); writeColor(i, 0); continue; }
      const sp = Math.hypot(uv[0], uv[1]);
      lng[i] += (uv[0] * moveScale) / Math.max(0.2, Math.cos((lat[i] * Math.PI) / 180));
      lat[i] += uv[1] * moveScale;
      age[i] += 1;
      if (!inBounds(lng[i], lat[i])) seed(i);
      writePos(i);
      writeColor(i, sp);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  };

  unregister = stack.register({ group: points, onFrame, animated: () => true });

  const loadGrid = async () => {
    try {
      const res = await fetch(`/api/crep/field/${dataset}/${variable}`, { cache: "no-store" });
      if (!res.ok) return;
      const man = await res.json();
      const frames: Array<{ grid?: string }> = Array.isArray(man.frames) ? man.frames.filter((f: { grid?: string }) => f.grid) : [];
      if (disposed || frames.length === 0) return; // not baked yet → render nothing
      const g = await fetch(frames[frames.length - 1].grid as string, { cache: "force-cache" });
      if (!g.ok) return;
      const data = await g.json();
      if (disposed || !Array.isArray(data?.u) || !Array.isArray(data?.v)) return;
      grid = data as Grid;
      for (let i = 0; i < N; i++) { seed(i); writePos(i); writeColor(i, 0); }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      map.triggerRepaint();
    } catch { /* */ }
  };

  // If we created a private stack, mount its custom layer (idle-gated for style readiness).
  const addOwnLayer = () => { try { if (ownStack && !map.getLayer(stack.layer.id)) map.addLayer(stack.layer); } catch { /* */ } };
  if (ownStack) { if (map.isStyleLoaded?.()) addOwnLayer(); else map.once("idle", addOwnLayer); }

  loadGrid();
  refreshTimer = setInterval(loadGrid, 5 * 60_000);

  return () => {
    disposed = true;
    if (refreshTimer) clearInterval(refreshTimer);
    try { unregister?.(); } catch { /* */ }
    try { if (ownStack && map.getLayer(stack.layer.id)) map.removeLayer(stack.layer.id); } catch { /* */ }
    try { geometry.dispose(); material.dispose(); } catch { /* */ }
  };
}
