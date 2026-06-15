/**
 * Mover-altitude layer (Earth Simulator v2, Phase 1) — the real payoff of the
 * verified globe-lock spike. Renders live SATELLITES as elevated icons at their
 * orbital-tier altitude, locked to the globe through pitch/rotate.
 *
 * Sizing: icons are POINTS with `sizeAttenuation:false`, i.e. a constant PIXEL
 * size — they never balloon as you zoom (the spike spheres ballooned because they
 * were a fixed WORLD size). One draw call for the whole constellation.
 *
 * Occlusion: `depthTest:true` shares MapLibre's globe depth buffer, so satellites
 * on the FAR side of the planet are hidden by the globe (no see-through).
 *
 * Positioning: each satellite placed via the proven globe path —
 * `stack.modelMatrixFor(lng,lat, visualZ(altMeters))` (memory
 * earth-sim-v2-globe-3d-verified) — tracking the pitched/rotated globe. Real
 * altitude is log-compressed into a thin shell so LEO hugs the surface, GEO stays close.
 *
 * Memory: ONE pre-allocated GPU buffer (MAX_SATS), updated IN PLACE every ~2.5s
 * from `window.__crep_sat_fc` — no per-tick allocation (the churn that crashed the
 * dev server). Movement is a 2.5s step (the SGP4 cadence v1 also uses); smoothing
 * is a later refinement. Planes/vessels (heading-rotated) come next via instancing.
 */

import * as THREE from "three";
import { createBlueSiteStack } from "./three-maplibre-layer";

const EARTH_R_M = 6_371_000;
const MAX_SATS = 4000;

/** Compress real altitude into a thin shell hugging the globe. */
function visualZ(altMeters: number): number {
  const a = Math.max(0, Number(altMeters) || 0);
  return Math.min(EARTH_R_M * 0.06 * Math.log10(1 + a / 60_000), EARTH_R_M * 0.16);
}

/** LEO cyan / MEO purple / GEO amber (0..1 RGB). */
function tierColor(altKm: number, out: THREE.Color): void {
  if (altKm >= 20000) out.setRGB(0.984, 0.749, 0.141);
  else if (altKm >= 2000) out.setRGB(0.659, 0.333, 0.969);
  else out.setRGB(0.133, 0.827, 0.933);
}

export interface MoverAltitudeHandle {
  dispose: () => void;
}

export function mountMoverAltitudeLayer(map: any): MoverAltitudeHandle {
  const stack = createBlueSiteStack("bluesite-movers");

  const tex = new THREE.TextureLoader().load("/crep/icons/satellite.png", () => {
    try { map.triggerRepaint?.(); } catch { /* ignore */ }
  });
  tex.colorSpace = THREE.SRGBColorSpace;

  // ONE pre-allocated buffer, updated in place (no per-tick allocation).
  const positions = new Float32Array(MAX_SATS * 3);
  const colors = new Float32Array(MAX_SATS * 3);
  const geom = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute("position", posAttr);
  geom.setAttribute("color", colAttr);
  geom.setDrawRange(0, 0);

  const material = new THREE.PointsMaterial({
    map: tex,
    size: 24,                 // pixels (screen-constant)
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.2,
    depthTest: true,          // globe occludes far-side satellites
    depthWrite: false,
  });
  const points = new THREE.Points(geom, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);

  const tmp = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const col = new THREE.Color();
  let lastCount = 0;

  const rebuild = () => {
    const feats: any[] = (window as any).__crep_sat_fc?.features ?? [];
    const n = Math.min(feats.length, MAX_SATS);
    let w = 0;
    for (let i = 0; i < n; i++) {
      const c = feats[i]?.geometry?.coordinates;
      if (!c) continue;
      const mm = stack.modelMatrixFor(c[0], c[1], visualZ(c[2] ?? 0));
      if (!mm) continue;
      v.setFromMatrixPosition(tmp.fromArray(mm));
      positions[w * 3] = v.x; positions[w * 3 + 1] = v.y; positions[w * 3 + 2] = v.z;
      const altKm = Number(feats[i]?.properties?.altitude_km ?? (c[2] ?? 0) / 1000) || 0;
      tierColor(altKm, col);
      colors[w * 3] = col.r; colors[w * 3 + 1] = col.g; colors[w * 3 + 2] = col.b;
      w++;
    }
    geom.setDrawRange(0, w);
    posAttr.needsUpdate = true; // full 48KB upload — trivial; drawRange limits render
    colAttr.needsUpdate = true;
    lastCount = w;
    try { map.triggerRepaint?.(); } catch { /* ignore */ }
  };

  stack.register({ group });
  try { map.addLayer(stack.layer); } catch (e) { console.warn("[bluesite-movers] addLayer", e); }

  const nativeIds = ["crep-live-satellites-dot", "crep-live-satellites-glow"];
  const setNative = (vis: "visible" | "none") => {
    for (const id of nativeIds) { try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis); } catch { /* ignore */ } }
  };

  let timer = 0;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    rebuild();
    setNative("none");
    timer = window.setInterval(rebuild, 2500);
  };
  const onData = (e: any) => {
    if (e?.sourceId === "crep-live-satellites" || (window as any).__crep_sat_fc?.features?.length) {
      map.off("data", onData);
      start();
    }
  };
  if ((window as any).__crep_sat_fc?.features?.length) start();
  else map.on("data", onData);

  (window as any).__crep_movers = { rebuild, count: () => lastCount };

  return {
    dispose: () => {
      try { window.clearInterval(timer); } catch { /* ignore */ }
      try { map.off("data", onData); } catch { /* ignore */ }
      try { setNative("visible"); } catch { /* ignore */ }
      try { if (map.getLayer("bluesite-movers")) map.removeLayer("bluesite-movers"); } catch { /* ignore */ }
      try { geom.dispose(); material.dispose(); tex.dispose(); } catch { /* ignore */ }
      try { delete (window as any).__crep_movers; } catch { /* ignore */ }
    },
  };
}
