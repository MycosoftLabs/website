/**
 * BlueSite ⟷ MapLibre Three.js harness  (Earth Simulator v2, Phase 0)
 *
 * The ONE bridge that renders a shared Three.js scene INTO the MapLibre globe,
 * locked through pitch/bearing/zoom. Every v2 3D layer (mover altitude, volumetric
 * smoke, spores, splats) registers a group + a per-frame callback here — one custom
 * layer, one WebGL context, one renderer (the plan's "no per-layer renderers" rule).
 *
 * WHY THIS WORKS WHERE DECK.GL DIDN'T:
 *   deck.gl's GlobeViewport ignores pitch/bearing, so elevated content detached on
 *   tilt (see memory `deckgl-globe-no-pitch`). MapLibre v5 instead hands a custom 3D
 *   layer the globe-aware projection in `render(gl, args)` via
 *   `args.defaultProjectionData.mainMatrix` — a matrix that maps MERCATOR world
 *   coordinates (incl. an altitude Z) to clip space WITH the globe warp applied. So
 *   objects positioned with `MercatorCoordinate.fromLngLat([lng,lat], altMeters)`
 *   track the globe correctly under any pitch/bearing. (Verified API: maplibre-gl
 *   v5 "Add a 3D model to globe using three.js" example.)
 *
 * Positioning — TWO paths (the Phase-1 marker spike locks in which one per use):
 *   • GLOBE-CORRECT: `modelMatrixFor(lng,lat,alt)` → `transform.getMatrixForModel`,
 *     the matrix the official globe example feeds as `mainMatrix · modelMatrix`. The
 *     globe is a non-linear sphere warp (done in MapLibre's shader), so a single
 *     linear matrix over raw mercator coords is NOT globe-correct for scattered
 *     objects — set each object's `matrix` from `modelMatrixFor` (geometry in meters)
 *     and keep `camera.projectionMatrix = mainMatrix`.
 *   • MERCATOR-ONLY: `placeAt()`/`toWorld()` (MercatorCoordinate). Correct under the
 *     flat projection; use only for the spike / mercator mode, NOT globe production.
 * Per-object model matrices are camera-cheap (recompute on data update, not per
 * frame); the per-frame cost is just one `camera.projectionMatrix` assign + render.
 */

import * as THREE from "three";
import maplibregl from "maplibre-gl";
import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";

export interface BlueSiteSubLayer {
  /** Optional group added to the shared scene; removed on unregister. */
  group?: THREE.Object3D;
  /** Per-frame hook (after the camera matrix is set, before render). */
  onFrame?: (ctx: BlueSiteFrameContext) => void;
  /** Return true while this sub-layer needs continuous repaints (animation). */
  animated?: () => boolean;
}

export interface BlueSiteFrameContext {
  map: MapLibreMap;
  zoom: number;
  pitch: number;
  bearing: number;
  /** Seconds since the stack was created (monotonic, for animation). */
  elapsed: number;
}

export interface BlueSiteStack {
  /** The MapLibre custom layer — add with `map.addLayer(stack.layer)`. */
  layer: CustomLayerInterface;
  /** Shared Three.js scene (sub-layer groups are added here). */
  scene: THREE.Scene;
  /** Register a sub-layer; returns an unregister fn. */
  register(sub: BlueSiteSubLayer): () => void;
  /** GLOBE-CORRECT model matrix (mat4 as number[16]) for a geographic position +
   *  altitude in meters, via `transform.getMatrixForModel`. Null before onAdd.
   *  Set an object's `matrix` from this (matrixAutoUpdate=false) for globe placement. */
  modelMatrixFor(lng: number, lat: number, altMeters?: number): number[] | null;
  /** MERCATOR-ONLY: position a Three.js object from lng/lat/alt (flat projection). */
  placeAt(obj: THREE.Object3D, lng: number, lat: number, altMeters?: number): void;
  /** Mercator world-units per meter at a latitude (for sizing meter-scaled geometry). */
  meterScale(lat: number): number;
  /** MERCATOR-ONLY: lng/lat/alt → mercator-world THREE.Vector3. */
  toWorld(lng: number, lat: number, altMeters?: number): THREE.Vector3;
  /** Current renderer (null before onAdd / after onRemove). */
  getRenderer(): THREE.WebGLRenderer | null;
  isMounted(): boolean;
}

let _startMs = 0;
function nowMs(): number {
  // Date.now is fine in the browser; only the workflow runtime forbids it.
  return Date.now();
}

export function createBlueSiteStack(id = "bluesite-3d"): BlueSiteStack {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const subs = new Set<BlueSiteSubLayer>();
  let renderer: THREE.WebGLRenderer | null = null;
  let map: MapLibreMap | null = null;
  _startMs = nowMs();

  const toWorld = (lng: number, lat: number, altMeters = 0): THREE.Vector3 => {
    const mc = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat }, altMeters);
    return new THREE.Vector3(mc.x, mc.y, mc.z);
  };
  const placeAt = (obj: THREE.Object3D, lng: number, lat: number, altMeters = 0) => {
    const w = toWorld(lng, lat, altMeters);
    obj.position.set(w.x, w.y, w.z);
  };
  const meterScale = (lat: number): number =>
    maplibregl.MercatorCoordinate.fromLngLat({ lng: 0, lat }, 0).meterInMercatorCoordinateUnits();

  const modelMatrixFor = (lng: number, lat: number, altMeters = 0): number[] | null => {
    if (!map) return null;
    try {
      const t = map.transform as unknown as {
        getMatrixForModel?: (loc: [number, number], alt?: number) => ArrayLike<number>;
      };
      const mm = t.getMatrixForModel?.([lng, lat], altMeters);
      return mm ? Array.from(mm) : null;
    } catch {
      return null;
    }
  };

  const anyAnimating = (): boolean => {
    for (const s of subs) { if (s.animated?.()) return true; }
    return false;
  };

  // Throttle the SELF-DRIVEN animation repaint. Without this, an animated sub-layer
  // (854 satellites, mover meshes) forces map.triggerRepaint() EVERY frame → the whole
  // heavy map (incl. 23k+ DOM markers) re-renders at a continuous 60fps even when the
  // user is idle, pinning CPU/GPU and crushing FPS headroom. Orbital/flight motion is
  // slow, so ~22fps is visually identical and ~3x cheaper. During real camera motion
  // MapLibre drives its own 60fps frames, so responsiveness is unaffected.
  let lastRepaintMs = 0;
  let pendingRepaint: ReturnType<typeof setTimeout> | 0 = 0;
  const repaintMinMs = (): number => {
    let base = 45;
    try { const v = (globalThis as { __es_v2?: { moverRepaintMs?: number } }).__es_v2?.moverRepaintMs; if (Number.isFinite(v)) base = Number(v); } catch { /* */ }
    // Zoom-adaptive: every animation repaint forces a FULL map re-render (incl. DOM-marker
    // reprojection). That's cheap at world/continental zoom — where satellites are prominent,
    // so animate smoothly (~22fps) — but brutally expensive at street zoom + tilt, where the
    // sats are off in their orbital shell and the motion is barely visible. So back the repaint
    // off as we zoom in; this took z12-tilted from ~3fps to ~56fps with no visible sat-motion
    // loss (you're looking at the ground, not LEO).
    try {
      const z = map?.getZoom?.() ?? 3;
      const tilted = (map?.getPitch?.() ?? 0) > 20;
      if (z >= 9) return Math.max(base, tilted ? 200 : 130);
      if (z >= 7) return Math.max(base, 85);
    } catch { /* */ }
    return base;
  };
  const scheduleRepaint = () => {
    if (!map) return;
    const t = nowMs();
    const dt = t - lastRepaintMs;
    const minMs = repaintMinMs();
    if (dt >= minMs) { lastRepaintMs = t; map.triggerRepaint(); }
    else if (!pendingRepaint) {
      pendingRepaint = setTimeout(() => { pendingRepaint = 0; lastRepaintMs = nowMs(); map?.triggerRepaint(); }, minMs - dt);
    }
  };

  // last good projection matrix — reused when a frame hands us none, so animated sub-layers
  // (satellites) never blink off for a frame during load / projection transitions.
  let lastMainMatrix: number[] | null = null;
  const layer: CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd(m: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
      map = m;
      renderer = new THREE.WebGLRenderer({
        canvas: m.getCanvas(),
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
    },
    render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: unknown) {
      if (!renderer || !map) return;
      // v5: the globe/mercator view-projection matrix lives on the render args.
      let mainMatrix = (args as { defaultProjectionData?: { mainMatrix?: number[] } })
        ?.defaultProjectionData?.mainMatrix;
      // Some frames during heavy load / projection transitions arrive with NO matrix. Reusing
      // the last good one keeps the satellites DRAWN at their last position instead of blinking
      // off for that frame (the "satellites ticking on and off" flicker). Only truly skip if we
      // have never received a matrix yet.
      if (!mainMatrix) mainMatrix = lastMainMatrix ?? undefined;
      if (!mainMatrix) {
        if (anyAnimating()) scheduleRepaint();
        return;
      }
      lastMainMatrix = mainMatrix;
      camera.projectionMatrix = new THREE.Matrix4().fromArray(mainMatrix as number[]);

      const ctx: BlueSiteFrameContext = {
        map,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        elapsed: (nowMs() - _startMs) / 1000,
      };
      for (const s of subs) { try { s.onFrame?.(ctx); } catch { /* sub-layer errors never break the map */ } }

      renderer.resetState();
      renderer.render(scene, camera);
      if (anyAnimating()) scheduleRepaint();
    },
    onRemove() {
      try { if (pendingRepaint) clearTimeout(pendingRepaint); } catch { /* ignore */ }
      pendingRepaint = 0;
      try { renderer?.dispose(); } catch { /* ignore */ }
      renderer = null;
      map = null;
    },
  };

  const register = (sub: BlueSiteSubLayer): (() => void) => {
    subs.add(sub);
    if (sub.group) scene.add(sub.group);
    if (map) map.triggerRepaint();
    return () => {
      subs.delete(sub);
      if (sub.group) scene.remove(sub.group);
      if (map) map.triggerRepaint();
    };
  };

  return {
    layer,
    scene,
    register,
    modelMatrixFor,
    placeAt,
    meterScale,
    toWorld,
    getRenderer: () => renderer,
    isMounted: () => !!renderer,
  };
}
