/**
 * Mover-altitude layer (Earth Simulator v2, Phase 1).
 *
 * Live SATELLITES as elevated, screen-sized icons locked to the globe at their
 * orbital-tier altitude — FLUID and SELECTABLE.
 *
 * FLUID MOTION (no 2.5s ticks): SGP4 publishes new positions to
 * window.__crep_sat_fc every ~2.5s. Each satellite keeps its PREVIOUS and CURRENT
 * world position; a custom shader lerps `mix(prev, current, uF)` every frame with a
 * per-frame factor uF = elapsed/interval, and the layer requests continuous repaint
 * (animated). Result: a continuous sweep between updates, not a click. (~2.5s of
 * latency, invisible for orbits.)
 *
 * SCREEN-SIZED ICONS: gl_PointSize in physical pixels → constant on-screen size, no
 * ballooning. depthTest shares MapLibre's globe depth → far-side sats are occluded.
 *
 * SELECTABLE: each sat's current world position is projected to screen with the
 * globe matrix on click/hover; the nearest within a pixel threshold dispatches
 * `crep:asset:select` (the existing bridge opens the detail widget) and hover sets a
 * pointer cursor.
 *
 * Positioning: world pos via `stack.modelMatrixFor(lng,lat, visualZ(altM))` (memory
 * earth-sim-v2-globe-3d-verified), recomputed on each SGP4 tick + on moveend (cheap
 * safety for any camera-dependence). Buffers are pre-allocated + updated in place.
 */

import * as THREE from "three";
import { createBlueSiteStack } from "./three-maplibre-layer";

const EARTH_R_M = 6_371_000;
const MAX_SATS = 4000;
const TICK_MS = 2500;

function visualZ(altMeters: number): number {
  const a = Math.max(0, Number(altMeters) || 0);
  return Math.min(EARTH_R_M * 0.06 * Math.log10(1 + a / 60_000), EARTH_R_M * 0.16);
}
function tierColor(altKm: number, out: Float32Array, o: number): void {
  if (altKm >= 20000) { out[o] = 0.984; out[o + 1] = 0.749; out[o + 2] = 0.141; }       // amber
  else if (altKm >= 2000) { out[o] = 0.659; out[o + 1] = 0.333; out[o + 2] = 0.969; }   // purple
  else { out[o] = 0.133; out[o + 1] = 0.827; out[o + 2] = 0.933; }                       // cyan
}

const VERT = `
attribute vec3 aPrev;
attribute vec3 aColor;
uniform float uF;
uniform float uSize;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec3 p = mix(aPrev, position, uF);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize;
}`;
const FRAG = `
uniform sampler2D uMap;
varying vec3 vColor;
void main() {
  vec4 t = texture2D(uMap, gl_PointCoord);
  if (t.a < 0.18) discard;
  gl_FragColor = vec4(vColor, t.a);
}`;

export interface MoverAltitudeHandle { dispose: () => void; }

export function mountMoverAltitudeLayer(map: any): MoverAltitudeHandle {
  const stack = createBlueSiteStack("bluesite-movers");
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;

  const tex = new THREE.TextureLoader().load("/crep/icons/satellite.png", () => { try { map.triggerRepaint?.(); } catch { /* */ } });
  tex.colorSpace = THREE.SRGBColorSpace;

  const cur = new Float32Array(MAX_SATS * 3);
  const prev = new Float32Array(MAX_SATS * 3);
  const colors = new Float32Array(MAX_SATS * 3);
  const geom = new THREE.BufferGeometry();
  const curAttr = new THREE.BufferAttribute(cur, 3).setUsage(THREE.DynamicDrawUsage);
  const prevAttr = new THREE.BufferAttribute(prev, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute("position", curAttr);
  geom.setAttribute("aPrev", prevAttr);
  geom.setAttribute("aColor", colAttr);
  geom.setDrawRange(0, 0);

  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uF: { value: 1 }, uSize: { value: 11 * dpr } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthTest: true, depthWrite: false,
  });
  const points = new THREE.Points(geom, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);

  // Elevated 3D orbit trajectories — the orbit paths rendered AT ALTITUDE (x/y/z),
  // not flat ground-tracks, so each satellite flies along its real trajectory arc.
  const orbitGeom = new THREE.BufferGeometry();
  orbitGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
  orbitGeom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
  const orbitMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.35, depthTest: true, depthWrite: false,
  });
  const orbitLines = new THREE.LineSegments(orbitGeom, orbitMat);
  orbitLines.frustumCulled = false;
  group.add(orbitLines);

  // id -> last world position (for prev/current matching across ticks)
  let prevById = new Map<string, [number, number, number]>();
  // pick list: parallel to draw range, current world pos + id + meta
  const pick: Array<{ id: string; x: number; y: number; z: number; name?: string }> = [];
  const geoOf: Array<{ lng: number; lat: number; alt: number }> = []; // for moveend recompute
  let count = 0;
  let lastTickMs = Date.now();
  const tmp = new THREE.Matrix4();
  const v = new THREE.Vector3();

  const rebuild = () => {
    const feats: any[] = (window as any).__crep_sat_fc?.features ?? [];
    const n = Math.min(feats.length, MAX_SATS);
    const nextById = new Map<string, [number, number, number]>();
    pick.length = 0; geoOf.length = 0;
    let w = 0;
    for (let i = 0; i < n; i++) {
      const f = feats[i];
      const c = f?.geometry?.coordinates;
      if (!c) continue;
      const id = String(f?.properties?.id ?? f?.id ?? i);
      const altM = c[2] ?? 0;
      const mm = stack.modelMatrixFor(c[0], c[1], visualZ(altM));
      if (!mm) continue;
      v.setFromMatrixPosition(tmp.fromArray(mm));
      const o = w * 3;
      cur[o] = v.x; cur[o + 1] = v.y; cur[o + 2] = v.z;
      const p = prevById.get(id);
      if (p) { prev[o] = p[0]; prev[o + 1] = p[1]; prev[o + 2] = p[2]; }
      else { prev[o] = v.x; prev[o + 1] = v.y; prev[o + 2] = v.z; }
      tierColor(Number(f?.properties?.altitude_km ?? altM / 1000) || 0, colors, o);
      nextById.set(id, [v.x, v.y, v.z]);
      pick.push({ id, x: v.x, y: v.y, z: v.z, name: f?.properties?.name });
      geoOf.push({ lng: c[0], lat: c[1], alt: altM });
      w++;
    }
    prevById = nextById;
    count = w;
    geom.setDrawRange(0, w);
    curAttr.needsUpdate = true; prevAttr.needsUpdate = true; colAttr.needsUpdate = true;
    lastTickMs = Date.now();
    material.uniforms.uF.value = 0;
    rebuildOrbits();
    try { map.triggerRepaint?.(); } catch { /* */ }
  };

  // Recompute world positions in place at the current camera (safety for any
  // camera-dependence of getMatrixForModel) WITHOUT resetting the interpolation.
  const recomputeWorld = () => {
    for (let i = 0; i < count; i++) {
      const g = geoOf[i];
      const mm = stack.modelMatrixFor(g.lng, g.lat, visualZ(g.alt));
      if (!mm) continue;
      v.setFromMatrixPosition(tmp.fromArray(mm));
      const o = i * 3;
      // shift prev by the same delta so the lerp stays smooth
      prev[o] += v.x - cur[o]; prev[o + 1] += v.y - cur[o + 1]; prev[o + 2] += v.z - cur[o + 2];
      cur[o] = v.x; cur[o + 1] = v.y; cur[o + 2] = v.z;
      pick[i].x = v.x; pick[i].y = v.y; pick[i].z = v.z;
    }
    curAttr.needsUpdate = true; prevAttr.needsUpdate = true;
    try { map.triggerRepaint?.(); } catch { /* */ }
  };

  // Build elevated 3D orbit arcs from the SGP4 orbit paths (the ~200 sats with
  // computed tracks), at altitude via the same visualZ shell. One LineSegments draw.
  const rebuildOrbits = () => {
    const feats: any[] = (window as any).__crep_sat_orbit_fc?.features ?? [];
    const pos: number[] = [];
    const colArr: number[] = [];
    const tc = new Float32Array(3);
    for (const f of feats) {
      const coords = f?.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      let px = 0, py = 0, pz = 0, has = false;
      for (let i = 0; i < coords.length; i++) {
        const pt = coords[i];
        const mm = stack.modelMatrixFor(pt[0], pt[1], visualZ(pt[2] ?? 0));
        if (!mm) { has = false; continue; }
        v.setFromMatrixPosition(tmp.fromArray(mm));
        if (has) {
          tierColor(Number(pt[2] ?? 0) / 1000, tc, 0);
          pos.push(px, py, pz, v.x, v.y, v.z);
          colArr.push(tc[0], tc[1], tc[2], tc[0], tc[1], tc[2]);
        }
        px = v.x; py = v.y; pz = v.z; has = true;
      }
    }
    orbitGeom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    orbitGeom.setAttribute("color", new THREE.Float32BufferAttribute(colArr, 3));
    try { map.triggerRepaint?.(); } catch { /* */ }
  };

  // animate: continuous repaint + per-frame interpolation factor
  stack.register({
    group,
    animated: () => count > 0,
    onFrame: () => {
      const f = Math.min(1, (Date.now() - lastTickMs) / TICK_MS);
      material.uniforms.uF.value = f;
    },
  });
  // Insert BELOW the surface event/species/device markers so elevated satellites
  // never cover the priority surface data (the user: "can't cause harm to the
  // events or species icons"). DOM markers are already above the WebGL canvas.
  const beforeCandidates = [
    "crep-mycosoft-devices-glow", "crep-earthquakes-dot", "crep-volcanoes-dot",
    "crep-wildfires-dot", "crep-events_human-heat", "crep-live-satellites-glow",
  ];
  let beforeId: string | undefined;
  for (const id of beforeCandidates) { try { if (map.getLayer(id)) { beforeId = id; break; } } catch { /* */ } }
  try { map.addLayer(stack.layer, beforeId); } catch (e) { console.warn("[bluesite-movers] addLayer", e); }

  const nativeIds = ["crep-live-satellites-dot", "crep-live-satellites-glow", "crep-live-satellite-orbits-line"];
  const setNative = (vis: "visible" | "none") => {
    for (const id of nativeIds) {
      try { if (map.getLayer(id) && (map.getLayoutProperty(id, "visibility") ?? "visible") !== vis) map.setLayoutProperty(id, "visibility", vis); } catch { /* */ }
    }
  };

  // ── picking: project current world pos to screen, match cursor ──
  const projectNearest = (px: number, py: number, thresholdPx: number): { id: string } | null => {
    const mat = map.transform?.getProjectionData?.({ applyGlobeMatrix: true })?.mainMatrix;
    if (!mat) return null;
    const cv = map.getCanvas();
    const W = cv.clientWidth, H = cv.clientHeight;
    let best: { id: string } | null = null;
    let bestD = thresholdPx * thresholdPx;
    for (let i = 0; i < pick.length; i++) {
      const it = pick[i];
      const cx = mat[0] * it.x + mat[4] * it.y + mat[8] * it.z + mat[12];
      const cy = mat[1] * it.x + mat[5] * it.y + mat[9] * it.z + mat[13];
      const cw = mat[3] * it.x + mat[7] * it.y + mat[11] * it.z + mat[15];
      if (cw <= 0) continue; // behind camera
      const sx = (cx / cw * 0.5 + 0.5) * W;
      const sy = (1 - (cy / cw * 0.5 + 0.5)) * H;
      const dx = sx - px, dy = sy - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = { id: it.id }; }
    }
    return best;
  };
  const onClick = (e: any) => {
    const hit = projectNearest(e.point.x, e.point.y, 16);
    if (!hit) return;
    (window as any).__crep_justPickedAt = Date.now();
    try { window.dispatchEvent(new CustomEvent("crep:asset:select", { detail: { kind: "satellite", id: hit.id } })); } catch { /* */ }
  };
  let lastHover = 0;
  const onMove = (e: any) => {
    const now = Date.now();
    if (now - lastHover < 60) return;
    lastHover = now;
    const hit = projectNearest(e.point.x, e.point.y, 14);
    try { map.getCanvas().style.cursor = hit ? "pointer" : ""; } catch { /* */ }
  };
  const onMoveEnd = () => { recomputeWorld(); rebuildOrbits(); };

  let timer = 0;
  let hideTimer = 0;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    rebuild();
    setNative("none");
    timer = window.setInterval(rebuild, TICK_MS);
    // The v1 layer system re-asserts the native sat layers visible on its own
    // re-renders; keep re-hiding (no-op when already hidden) so we never show two
    // satellite sets. (Jun 15 2026 — "I'm seeing both of them".)
    hideTimer = window.setInterval(() => setNative("none"), 1000);
    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.on("moveend", onMoveEnd);
  };
  const onData = (e: any) => {
    if (e?.sourceId === "crep-live-satellites" || (window as any).__crep_sat_fc?.features?.length) { map.off("data", onData); start(); }
  };
  if ((window as any).__crep_sat_fc?.features?.length) start();
  else map.on("data", onData);

  (window as any).__crep_movers = { rebuild, count: () => count, pickAt: (x: number, y: number) => projectNearest(x, y, 16) };

  return {
    dispose: () => {
      try { window.clearInterval(timer); } catch { /* */ }
      try { window.clearInterval(hideTimer); } catch { /* */ }
      try { map.off("data", onData); map.off("click", onClick); map.off("mousemove", onMove); map.off("moveend", onMoveEnd); } catch { /* */ }
      try { map.getCanvas().style.cursor = ""; } catch { /* */ }
      try { setNative("visible"); } catch { /* */ }
      try { if (map.getLayer("bluesite-movers")) map.removeLayer("bluesite-movers"); } catch { /* */ }
      try { geom.dispose(); material.dispose(); tex.dispose(); orbitGeom.dispose(); orbitMat.dispose(); } catch { /* */ }
      try { delete (window as any).__crep_movers; } catch { /* */ }
    },
  };
}
