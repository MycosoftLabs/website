/**
 * Mover-aircraft layer (Earth Simulator v2, Phase 1).
 *
 * Live AIRCRAFT as elevated, heading-rotated, screen-sized icons locked to the
 * globe at their CRUISE altitude — above the surface, below the satellites — with
 * the same fluid GPU interpolation the satellite mover uses (no ticks).
 *
 * Mirrors lib/crep/bluesite/mover-altitude-layer.ts (satellites) but:
 *   • reads window.__crep_aircraft (the live ADS-B/FR24 array, with real altitude
 *     + heading), not the SGP4 FeatureCollection;
 *   • places each plane at visualZ(altitudeMeters) — cruise (~11 km) sits just
 *     above the surface shell, far below the LEO satellite shell;
 *   • rotates each icon to its heading (true_track) in the fragment shader so the
 *     plane points along its track;
 *   • dedups on the aircraft-array reference so the fallback timer never resets
 *     the interpolation with unchanged positions (the satellite stutter fix).
 *
 * Its own BlueSite stack (one Points draw); kept separate from the satellite mover
 * so the proven satellite code is untouched. Gated OFF by default with the rest of
 * v2; viewport/LOD handled by the v1 aircraft pump that feeds __crep_aircraft.
 */

import * as THREE from "three";
import { createBlueSiteStack } from "./three-maplibre-layer";

const EARTH_R_M = 6_371_000;
const MAX_AIRCRAFT = 6000;
const TICK_MS = 2500;
const DEG2RAD = Math.PI / 180;

// Same altitude-compression shell as the satellite mover, so planes + sats share
// one consistent vertical scale: cruise (~11 km) → a thin shell just off the
// surface; LEO (~550 km) sits ~14× higher. Planes can never appear above sats.
function visualZ(altMeters: number): number {
  const a = Math.max(0, Number(altMeters) || 0);
  return Math.min(EARTH_R_M * 0.06 * Math.log10(1 + a / 60_000), EARTH_R_M * 0.16);
}
// Colour by altitude band: low/approach amber, climb/descent green, cruise cyan.
function bandColor(altM: number, out: Float32Array, o: number): void {
  if (altM < 2500) { out[o] = 0.984; out[o + 1] = 0.749; out[o + 2] = 0.141; }       // amber
  else if (altM < 8000) { out[o] = 0.486; out[o + 1] = 0.910; out[o + 2] = 0.467; }  // green
  else { out[o] = 0.133; out[o + 1] = 0.827; out[o + 2] = 0.933; }                    // cyan (cruise)
}

const VERT = `
attribute vec3 aPrev;
attribute vec3 aColor;
attribute float aHeading;
uniform float uF;
uniform float uSize;
varying vec3 vColor;
varying float vHeading;
void main() {
  vColor = aColor;
  vHeading = aHeading;
  vec3 p = mix(aPrev, position, uF);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize;
}`;
// Rotate the icon's sampling UV by the plane's heading so the nose points along
// its track. (Icon art points "up"/north by default.)
const FRAG = `
uniform sampler2D uMap;
varying vec3 vColor;
varying float vHeading;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float c = cos(vHeading), s = sin(vHeading);
  uv = mat2(c, -s, s, c) * uv + 0.5;
  vec4 t = texture2D(uMap, uv);
  if (t.a < 0.18) discard;
  gl_FragColor = vec4(vColor, t.a);
}`;

export interface MoverAircraftHandle { dispose: () => void; }

interface AircraftRow { id: string; lng: number; lat: number; alt: number; heading: number; name?: string }

function readAircraft(): AircraftRow[] {
  const arr = (window as any).__crep_aircraft;
  if (!Array.isArray(arr)) return [];
  const out: AircraftRow[] = [];
  for (const e of arr) {
    if (!e) continue;
    // OpenSky/FR24 entities nest position under e.location {latitude,longitude,altitude};
    // stay robust to flattened + GeoJSON shapes too.
    const loc = e.location ?? {};
    const lng = Number(e.lng ?? e.lon ?? e.longitude ?? loc.longitude ?? loc.lng ?? e.geometry?.coordinates?.[0] ?? e.properties?.lng);
    const lat = Number(e.lat ?? e.latitude ?? loc.latitude ?? loc.lat ?? e.geometry?.coordinates?.[1] ?? e.properties?.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const alt = Number(e.altitude ?? loc.altitude ?? e.properties?.altitude ?? e.geo_altitude ?? e.baro_altitude ?? 10500) || 10500;
    const heading = Number(e.heading ?? e.properties?.heading ?? e.true_track ?? e.properties?.track ?? loc.heading ?? 0) || 0;
    const id = String(e.id ?? e.icao24 ?? e.properties?.icao24 ?? e.properties?.id ?? `${lng},${lat}`);
    out.push({ id, lng, lat, alt, heading, name: e.name ?? e.callsign ?? e.properties?.callsign });
  }
  return out;
}

export function mountMoverAircraftLayer(map: any): MoverAircraftHandle {
  const stack = createBlueSiteStack("bluesite-aircraft");
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;

  const tex = new THREE.TextureLoader().load("/crep/icons/aircraft.png", () => { try { map.triggerRepaint?.(); } catch { /* */ } });
  tex.colorSpace = THREE.SRGBColorSpace;

  const cur = new Float32Array(MAX_AIRCRAFT * 3);
  const prev = new Float32Array(MAX_AIRCRAFT * 3);
  const colors = new Float32Array(MAX_AIRCRAFT * 3);
  const headings = new Float32Array(MAX_AIRCRAFT);
  const geom = new THREE.BufferGeometry();
  const curAttr = new THREE.BufferAttribute(cur, 3).setUsage(THREE.DynamicDrawUsage);
  const prevAttr = new THREE.BufferAttribute(prev, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  const hdgAttr = new THREE.BufferAttribute(headings, 1).setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute("position", curAttr);
  geom.setAttribute("aPrev", prevAttr);
  geom.setAttribute("aColor", colAttr);
  geom.setAttribute("aHeading", hdgAttr);
  geom.setDrawRange(0, 0);

  const material = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uF: { value: 1 }, uSize: { value: 13 * dpr } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthTest: true, depthWrite: false,
  });
  const points = new THREE.Points(geom, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);

  let prevById = new Map<string, [number, number, number]>();
  const pick: Array<{ id: string; x: number; y: number; z: number; name?: string }> = [];
  const geoOf: Array<{ lng: number; lat: number; alt: number }> = [];
  let count = 0;
  let lastTickMs = Date.now();
  let lastInterval = TICK_MS;
  let lastBuiltRef: unknown = null;
  const tmp = new THREE.Matrix4();
  const v = new THREE.Vector3();

  const rebuild = (force = false) => {
    const ref = (window as any).__crep_aircraft;
    if (!force && ref === lastBuiltRef && count > 0) return; // dedup on the array ref
    lastBuiltRef = ref;
    const rows = readAircraft();
    const n = Math.min(rows.length, MAX_AIRCRAFT);
    const nextById = new Map<string, [number, number, number]>();
    pick.length = 0; geoOf.length = 0;
    let w = 0;
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      const mm = stack.modelMatrixFor(r.lng, r.lat, visualZ(r.alt));
      if (!mm) continue;
      v.setFromMatrixPosition(tmp.fromArray(mm));
      const o = w * 3;
      cur[o] = v.x; cur[o + 1] = v.y; cur[o + 2] = v.z;
      const p = prevById.get(r.id);
      if (p) { prev[o] = p[0]; prev[o + 1] = p[1]; prev[o + 2] = p[2]; }
      else { prev[o] = v.x; prev[o + 1] = v.y; prev[o + 2] = v.z; }
      bandColor(r.alt, colors, o);
      headings[w] = r.heading * DEG2RAD;
      nextById.set(r.id, [v.x, v.y, v.z]);
      pick.push({ id: r.id, x: v.x, y: v.y, z: v.z, name: r.name });
      geoOf.push({ lng: r.lng, lat: r.lat, alt: r.alt });
      w++;
    }
    prevById = nextById;
    count = w;
    geom.setDrawRange(0, w);
    curAttr.needsUpdate = true; prevAttr.needsUpdate = true; colAttr.needsUpdate = true; hdgAttr.needsUpdate = true;
    const nowMs = Date.now();
    lastInterval = Math.max(TICK_MS, Math.min(TICK_MS * 2, nowMs - lastTickMs));
    lastTickMs = nowMs;
    material.uniforms.uF.value = 0;
    try { map.triggerRepaint?.(); } catch { /* */ }
  };

  // Recompute world positions in place at the current camera WITHOUT resetting the
  // interpolation (camera-dependence safety, e.g. after moveend).
  const recomputeWorld = () => {
    for (let i = 0; i < count; i++) {
      const g = geoOf[i];
      const mm = stack.modelMatrixFor(g.lng, g.lat, visualZ(g.alt));
      if (!mm) continue;
      v.setFromMatrixPosition(tmp.fromArray(mm));
      const o = i * 3;
      prev[o] += v.x - cur[o]; prev[o + 1] += v.y - cur[o + 1]; prev[o + 2] += v.z - cur[o + 2];
      cur[o] = v.x; cur[o + 1] = v.y; cur[o + 2] = v.z;
      pick[i].x = v.x; pick[i].y = v.y; pick[i].z = v.z;
    }
    curAttr.needsUpdate = true; prevAttr.needsUpdate = true;
    try { map.triggerRepaint?.(); } catch { /* */ }
  };

  stack.register({
    group,
    animated: () => count > 0,
    onFrame: () => {
      const f = Math.min(1.2, (Date.now() - lastTickMs) / lastInterval);
      material.uniforms.uF.value = f;
    },
  });
  try { map.addLayer(stack.layer); } catch (e) { console.warn("[bluesite-aircraft] addLayer", e); }

  const nativeIds = ["crep-live-aircraft-dot", "crep-live-aircraft-glow"];
  const setNative = (vis: "visible" | "none") => {
    for (const id of nativeIds) {
      try { if (map.getLayer(id) && (map.getLayoutProperty(id, "visibility") ?? "visible") !== vis) map.setLayoutProperty(id, "visibility", vis); } catch { /* */ }
    }
  };

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
      if (cw <= 0) continue;
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
    try { window.dispatchEvent(new CustomEvent("crep:asset:select", { detail: { kind: "aircraft", id: hit.id } })); } catch { /* */ }
  };
  let lastHover = 0;
  const onMove = (e: any) => {
    const now = Date.now();
    if (now - lastHover < 60) return;
    lastHover = now;
    const hit = projectNearest(e.point.x, e.point.y, 14);
    try { map.getCanvas().style.cursor = hit ? "pointer" : ""; } catch { /* */ }
  };
  const onMoveEnd = () => { recomputeWorld(); };

  let fallbackTimer = 0;
  let hideTimer = 0;
  let started = false;
  // The v1 aircraft pump publishes __crep_aircraft as a NEW array each poll; rebuild
  // only on that new reference (the fallback timer no-ops otherwise). The pump also
  // owns viewport/LOD culling, so we render exactly what it decides to paint.
  const onAcData = (e: any) => {
    if (e?.sourceId === "crep-live-aircraft") rebuild();
  };
  const start = () => {
    if (started) return;
    started = true;
    rebuild(true);
    setNative("none");
    map.on("data", onAcData);
    fallbackTimer = window.setInterval(() => rebuild(), 2500);
    hideTimer = window.setInterval(() => setNative("none"), 1000);
    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.on("moveend", onMoveEnd);
  };
  const onData = (e: any) => {
    if (e?.sourceId === "crep-live-aircraft" || (Array.isArray((window as any).__crep_aircraft) && (window as any).__crep_aircraft.length)) {
      map.off("data", onData); start();
    }
  };
  if (Array.isArray((window as any).__crep_aircraft) && (window as any).__crep_aircraft.length) start();
  else map.on("data", onData);

  (window as any).__crep_aircraftMover = { rebuild, count: () => count, pickAt: (x: number, y: number) => projectNearest(x, y, 16) };

  return {
    dispose: () => {
      try { window.clearInterval(fallbackTimer); } catch { /* */ }
      try { window.clearInterval(hideTimer); } catch { /* */ }
      try { map.off("data", onData); map.off("data", onAcData); map.off("click", onClick); map.off("mousemove", onMove); map.off("moveend", onMoveEnd); } catch { /* */ }
      try { map.getCanvas().style.cursor = ""; } catch { /* */ }
      try { setNative("visible"); } catch { /* */ }
      try { if (map.getLayer("bluesite-aircraft")) map.removeLayer("bluesite-aircraft"); } catch { /* */ }
      try { geom.dispose(); material.dispose(); tex.dispose(); } catch { /* */ }
      try { delete (window as any).__crep_aircraftMover; } catch { /* */ }
    },
  };
}
