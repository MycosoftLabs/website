/**
 * True-3D mover engine (Earth Simulator v2, Phase 1).
 *
 * Renders live movers as actual 3D MESHES oriented in true 3D (surface-normal → heading
 * yaw) so the nose/bow points along-track from ANY camera angle — the fix for flat
 * camera-facing sprites. One config-driven engine, instantiated for AIRCRAFT, VESSELS and
 * SATELLITES (procedural low-poly geometry each; a photoreal glTF/STL can later swap into
 * the buildGeometry fn unchanged). Built on the globe-locked BlueSite harness.
 *
 * Shared behaviour for every mover class:
 *  • Zoom-adaptive scale — ~constant on-screen px when zoomed out (small, not crowding),
 *    real-world proportions once you fly close.
 *  • Pitch gate — looking straight down, 3D depth is imperceptible → draw NOTHING (zero
 *    work); 3D only switches on when the camera is TILTED. Big resource saver.
 *  • Flat↔3D handoff — while the meshes are active, hide the v1 flat representation so
 *    movers never double-draw; restore on flatten (respecting the filter toggle).
 *  • FPS governor — never drag the frame rate under the floor: shrink the instance budget,
 *    and if even the minimum can't hold, suspend the meshes → flat fallback.
 *
 * Gated OFF by default (movers3d flag).
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createBlueSiteStack } from "./three-maplibre-layer";

const DEG2RAD = Math.PI / 180;
const EARTH_R_M = 6_371_000;
const TICK_MS = 2500; // data refresh cadence (matches the v1 pumps)

// Altitude-compression shell: planes sit just off the surface, sats up in their LEO/MEO/GEO
// shell, vessels at 0. One curve handles all (alt 0 → 0, ~10km → low, ~550km → ~0.06R).
function visualZ(altMeters: number): number {
  const a = Math.max(0, Number(altMeters) || 0);
  return Math.min(EARTH_R_M * 0.06 * Math.log10(1 + a / 60_000), EARTH_R_M * 0.16);
}

function readNum(...vals: unknown[]): number {
  for (const x of vals) { const n = Number(x); if (Number.isFinite(n)) return n; }
  return NaN;
}

// Great-circle bearing (deg from north) — used to orient movers that carry no heading
// field (vessels sometimes, satellites always) from their prev→cur motion.
function bearingDeg(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const p1 = lat1 * DEG2RAD, p2 = lat2 * DEG2RAD, dl = (lng2 - lng1) * DEG2RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.atan2(y, x) / DEG2RAD;
}

interface MoverRow { id: string; lng: number; lat: number; alt: number; heading: number; name?: string }

// ── geometry builders (METRES, local frame: +Y forward/along-track, +Z up, +X right) ──

function buildAirlinerGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const fuselage = new THREE.CylinderGeometry(2.4, 2.4, 46, 12); parts.push(fuselage); // along +Y
  const nose = new THREE.ConeGeometry(2.4, 9, 12); nose.translate(0, 27.5, 0); parts.push(nose);
  const tailcone = new THREE.ConeGeometry(2.4, 7, 12); tailcone.rotateZ(Math.PI); tailcone.translate(0, -26.5, 0); parts.push(tailcone);
  const wing = new THREE.BoxGeometry(56, 1.6, 8); wing.translate(0, -1, -1.5); parts.push(wing);
  const fin = new THREE.BoxGeometry(1.4, 9, 9); fin.translate(0, -22, 5); parts.push(fin);
  const stab = new THREE.BoxGeometry(20, 1.2, 5); stab.translate(0, -23, 0); parts.push(stab);
  const merged = mergeGeometries(parts, false) ?? fuselage;
  for (const p of parts) if (p !== merged) p.dispose();
  return merged;
}

function buildShipGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hull = new THREE.BoxGeometry(13, 64, 8); parts.push(hull);                                  // beam×length×height
  const bow = new THREE.ConeGeometry(6.5, 16, 4); bow.translate(0, 40, 0); parts.push(bow);          // 4-sided bow, apex +Y
  const house = new THREE.BoxGeometry(11, 14, 9); house.translate(0, -16, 8.5); parts.push(house);   // deckhouse aft
  const funnel = new THREE.CylinderGeometry(2.2, 2.8, 7, 8); funnel.translate(0, -22, 14); parts.push(funnel);
  const merged = mergeGeometries(parts, false) ?? hull;
  for (const p of parts) if (p !== merged) p.dispose();
  return merged;
}

function buildSatelliteGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bus = new THREE.BoxGeometry(10, 12, 10); parts.push(bus);                                    // central body
  const panelL = new THREE.BoxGeometry(26, 9, 0.6); panelL.translate(-19, 0, 0); parts.push(panelL); // solar wing -X
  const panelR = new THREE.BoxGeometry(26, 9, 0.6); panelR.translate(19, 0, 0); parts.push(panelR);  // solar wing +X
  const dish = new THREE.CylinderGeometry(4, 4, 1.5, 12); dish.rotateX(Math.PI / 2); dish.translate(0, 7, -6); parts.push(dish);
  const merged = mergeGeometries(parts, false) ?? bus;
  for (const p of parts) if (p !== merged) p.dispose();
  return merged;
}

// ── data readers ──

function readArray(windowVar: string, defaultAlt: number): MoverRow[] {
  const arr = (window as unknown as Record<string, unknown>)[windowVar];
  if (!Array.isArray(arr)) return [];
  const out: MoverRow[] = [];
  for (const e of arr) {
    if (!e) continue;
    const loc = (e.location ?? {}) as Record<string, unknown>;
    const lng = readNum(e.lng, e.lon, e.longitude, loc.longitude, loc.lng, e.geometry?.coordinates?.[0], e.properties?.lng, e.properties?.longitude);
    const lat = readNum(e.lat, e.latitude, loc.latitude, loc.lat, e.geometry?.coordinates?.[1], e.properties?.lat, e.properties?.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const alt = readNum(e.altitude, loc.altitude, e.properties?.altitude, e.geo_altitude, e.baro_altitude);
    const heading = readNum(e.heading, e.true_track, e.course, e.cog, e.true_heading, e.properties?.heading, e.properties?.course, e.properties?.cog, loc.heading);
    const id = String(e.id ?? e.icao24 ?? e.mmsi ?? e.properties?.mmsi ?? e.properties?.icao24 ?? e.properties?.id ?? `${lng},${lat}`);
    out.push({ id, lng, lat, alt: Number.isFinite(alt) ? alt : defaultAlt, heading, name: e.name ?? e.callsign ?? e.shipname ?? e.properties?.name ?? e.properties?.callsign });
  }
  return out;
}

function readFeatureCollection(windowVar: string, defaultAlt: number): MoverRow[] {
  const fc = (window as unknown as Record<string, any>)[windowVar];
  const feats: any[] = fc?.features ?? [];
  const out: MoverRow[] = [];
  for (const f of feats) {
    const c = f?.geometry?.coordinates;
    if (!c) continue;
    out.push({ id: String(f?.properties?.id ?? f?.id ?? `${c[0]},${c[1]}`), lng: c[0], lat: c[1], alt: Number.isFinite(c[2]) ? c[2] : defaultAlt, heading: NaN, name: f?.properties?.name });
  }
  return out;
}

type Band = (altM: number) => [number, number, number];
// Aircraft = a single YELLOW, matching the v1 flat plane icons (Morgan: "yellow like they
// were as icons"), not altitude bands — the green mid-band read wrong.
const aircraftBand: Band = () => [0.98, 0.80, 0.20];
const vesselBand: Band = () => [0.08, 0.72, 0.65]; // teal
const satBand: Band = (altM) => { const km = altM / 1000; return km >= 20000 ? [0.98, 0.75, 0.14] : km >= 2000 ? [0.66, 0.33, 0.97] : [0.13, 0.83, 0.93]; };

export interface Mover3DConfig {
  layerId: string;
  read: () => MoverRow[];
  sourceRef: () => unknown;   // the raw window var (array/FC) — for cheap dedup: rebuild only on a new ref
  buildGeometry: () => THREE.BufferGeometry;
  baseColor: number;
  band: Band;
  charLen: number;            // characteristic geometry size in m (for the screen-size scale)
  toggleLayerId: string;      // the v1 layer-registry id for this class's filter (aviation/ships/satellites)
  nativeLayerIds: string[];   // flat representation(s) to hide while 3D is active
  maxInstances: number;
  minZoom: number;            // don't render the 3D meshes below this zoom (perf for far classes like sats)
  headingFromMotion: boolean; // derive heading from prev→cur when the row has none
}

export interface Mover3DHandle { dispose: () => void }

/** Generic engine — one InstancedMesh of `cfg.buildGeometry`, governed + pitch-gated. */
export function mountMover3D(map: any, cfg: Mover3DConfig): Mover3DHandle {
  const stack = createBlueSiteStack(cfg.layerId);
  const geometry = cfg.buildGeometry();
  const material = new THREE.MeshLambertMaterial({ color: cfg.baseColor });
  const MAX = cfg.maxInstances;
  const inst = new THREE.InstancedMesh(geometry, material, MAX);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.count = 0;
  inst.frustumCulled = false;
  inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  const group = new THREE.Group();
  group.add(inst);
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(0.5, 1, 0.8);
  group.add(key, new THREE.AmbientLight(0xffffff, 0.55));
  const setBand = (i: number, altM: number) => { const [r, g, b] = cfg.band(altM); inst.setColorAt(i, new THREE.Color(r, g, b)); };

  // ── zoom-adaptive scale (constant ~targetPx when far, real size when near) ──
  const TARGET_PX = () => { try { const v = (window as any).__es_v2?.moverTargetPx; return Number.isFinite(v) ? Number(v) : 14; } catch { return 14; } };
  const SCALE_MULT = () => { try { const v = (window as any).__es_v2?.moverScale; return Number.isFinite(v) ? Number(v) : 1; } catch { return 1; } };
  const SCALE_MAX = () => { try { const v = (window as any).__es_v2?.moverScaleMax; return Number.isFinite(v) ? Number(v) : 12000; } catch { return 12000; } };
  const computeScale = (): number => {
    let zoom = 3, lat = 0;
    try { zoom = map.getZoom?.() ?? 3; lat = map.getCenter?.()?.lat ?? 0; } catch { /* */ }
    const mpp = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
    const kScreen = (TARGET_PX() * mpp) / cfg.charLen;
    return Math.max(1, Math.min(SCALE_MAX(), kScreen * SCALE_MULT()));
  };
  const HEAD_SIGN = () => { try { const v = (window as any).__es_v2?.moverHeadingSign; return v === 1 || v === -1 ? v : -1; } catch { return -1; } };
  const HEAD_OFFSET = () => { try { const v = (window as any).__es_v2?.moverHeadingOffsetDeg; return Number.isFinite(v) ? Number(v) * DEG2RAD : 0; } catch { return 0; } };
  const PITCH_MIN = () => { try { const v = (window as any).__es_v2?.moverPitchMin; return Number.isFinite(v) ? Number(v) : 12; } catch { return 12; } };

  const classEnabled = (): boolean => {
    try {
      const ls = (window as any).__crep_layers?.();
      if (Array.isArray(ls)) { const l = ls.find((x: any) => x && x.id === cfg.toggleLayerId); if (l) return l.enabled !== false; }
    } catch { /* */ }
    return true;
  };
  const shouldRender = (): boolean => {
    try {
      if ((map.getPitch?.() ?? 0) < PITCH_MIN()) return false;
      if ((map.getZoom?.() ?? 0) < cfg.minZoom) return false;
      if (!classEnabled()) return false;
    } catch { /* */ }
    return true;
  };

  // flat↔3D handoff — hide the flat representation while meshes are the active one
  let iHidNative = false;
  const setNativeHidden = (hide: boolean) => {
    for (const id of cfg.nativeLayerIds) { try { if (map.getLayer?.(id)) map.setLayoutProperty(id, "visibility", hide ? "none" : "visible"); } catch { /* */ } }
    iHidNative = hide;
  };
  const updateHandoff = (render3D: boolean) => {
    if (render3D) { if (!iHidNative) setNativeHidden(true); }
    else if (iHidNative) { if (classEnabled()) setNativeHidden(false); else iHidNative = false; }
  };

  // ── FPS governor (never drag FPS under the floor) ──
  const FPS_FLOOR = () => { try { const v = (window as any).__es_v2?.moverFpsFloor; return Number.isFinite(v) ? Number(v) : 33; } catch { return 33; } };
  const FPS_HEALTHY = 50;
  let renderBudget = MAX, suspended = false, healthy = 0, lastGovMs = 0;
  const readFps = () => { try { const f = (window as any).__crep_fps; return f && Number.isFinite(f.fps) ? f.fps : 60; } catch { return 60; } };
  const governor = () => {
    const now = Date.now();
    if (now - lastGovMs < 500) return;
    lastGovMs = now;
    const fps = readFps(), floor = FPS_FLOOR();
    healthy = fps >= FPS_HEALTHY ? healthy + 1 : 0;
    if (fps < floor) { renderBudget = Math.max(60, Math.floor(renderBudget * 0.6)); if (renderBudget <= 60 && fps < floor - 6) suspended = true; }
    else if (fps >= FPS_HEALTHY) { if (suspended) { if (healthy >= 4) { suspended = false; renderBudget = 100; } } else renderBudget = Math.min(MAX, renderBudget + 100); }
  };

  // per-mover anchors for smooth interpolation between ~2.5s ticks
  let prevGeo = new Map<string, { lng: number; lat: number }>();
  let curGeo: Array<{ lng: number; lat: number; alt: number; heading: number; plng: number; plat: number }> = [];
  let lastTickMs = Date.now(), lastInterval = TICK_MS, lastSrc: unknown = -1, count = 0;
  const mTmp = new THREE.Matrix4(), yawTmp = new THREE.Matrix4(), scaleTmp = new THREE.Matrix4();

  const rebuild = (force = false) => {
    if (!shouldRender()) { if (count !== 0) { count = 0; inst.count = 0; inst.instanceMatrix.needsUpdate = true; } return; }
    const src = cfg.sourceRef();
    if (!force && src === lastSrc && count > 0) return; // dedup on the source ref — only a real new data tick rebuilds (cheap between ticks)
    lastSrc = src;
    const rows = cfg.read();
    const n = Math.min(rows.length, MAX);
    const next = new Map<string, { lng: number; lat: number }>();
    curGeo = [];
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      const p = prevGeo.get(r.id);
      curGeo.push({ lng: r.lng, lat: r.lat, alt: r.alt, heading: r.heading, plng: p ? p.lng : r.lng, plat: p ? p.lat : r.lat });
      next.set(r.id, { lng: r.lng, lat: r.lat });
      setBand(i, r.alt);
    }
    prevGeo = next;
    count = n;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    const nowMs = Date.now();
    lastInterval = Math.max(TICK_MS, Math.min(TICK_MS * 2, nowMs - lastTickMs));
    lastTickMs = nowMs;
    dataTick++;
    try { map.triggerRepaint?.(); } catch { /* */ }
  };

  const place = () => {
    governor();
    const render3D = shouldRender() && !suspended;
    updateHandoff(render3D);
    if (!render3D) { if (inst.count !== 0) { inst.count = 0; inst.instanceMatrix.needsUpdate = true; } return; }
    const f = Math.min(1.2, (Date.now() - lastTickMs) / lastInterval);
    const s = computeScale(), sign = HEAD_SIGN(), off = HEAD_OFFSET();
    const budget = Math.min(count, renderBudget);
    let w = 0;
    for (let i = 0; i < budget; i++) {
      const g = curGeo[i];
      const lng = g.plng + (g.lng - g.plng) * f;
      const lat = g.plat + (g.lat - g.plat) * f;
      const mm = stack.modelMatrixFor(lng, lat, visualZ(g.alt));
      if (!mm) continue;
      let hdg = g.heading;
      if ((!Number.isFinite(hdg) || cfg.headingFromMotion) && (g.lng !== g.plng || g.lat !== g.plat)) hdg = bearingDeg(g.plng, g.plat, g.lng, g.lat);
      if (!Number.isFinite(hdg)) hdg = 0;
      mTmp.fromArray(mm);
      yawTmp.makeRotationZ(sign * hdg * DEG2RAD + off);
      scaleTmp.makeScale(s, s, s);
      mTmp.multiply(yawTmp).multiply(scaleTmp);
      inst.setMatrixAt(w, mTmp);
      w++;
    }
    inst.count = w;
    inst.instanceMatrix.needsUpdate = true;
    try { (window as any).__crep_movers3d_perf = { fps: readFps(), renderBudget, suspended, count: w, layer: cfg.layerId }; } catch { /* */ }
  };

  let raf = 0, interval: any = 0;
  const tick = () => { rebuild(); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  interval = setInterval(() => rebuild(), 1000);
  const onMoveEnd = () => { try { map.triggerRepaint?.(); } catch { /* */ } };
  try { map.on?.("moveend", onMoveEnd); } catch { /* */ }
  const unregister = stack.register({ group, animated: () => count > 0, onFrame: () => place() });
  try { map.addLayer?.(stack.layer); } catch (e) { console.warn(`[bluesite] ${cfg.layerId} addLayer`, e); }
  rebuild(true);

  return {
    dispose() {
      try { if (iHidNative && classEnabled()) setNativeHidden(false); } catch { /* */ }
      try { cancelAnimationFrame(raf); } catch { /* */ }
      try { clearInterval(interval); } catch { /* */ }
      try { map.off?.("moveend", onMoveEnd); } catch { /* */ }
      try { unregister(); } catch { /* */ }
      try { if (map.getLayer?.(stack.layer.id)) map.removeLayer(stack.layer.id); } catch { /* */ }
      try { geometry.dispose(); material.dispose(); } catch { /* */ }
    },
  };
}

// ── class instances ─────────────────────────────────────────────────────────

/** AIRCRAFT — procedural airliner, cruise shell. */
export function mountMover3DLayer(map: any): Mover3DHandle {
  return mountMover3D(map, {
    layerId: "bluesite-movers3d-aircraft",
    read: () => readArray("__crep_aircraft", 10500),
    sourceRef: () => (window as any).__crep_aircraft,
    buildGeometry: buildAirlinerGeometry,
    baseColor: 0xf5c518, band: aircraftBand, charLen: 55,
    toggleLayerId: "aviation", nativeLayerIds: ["crep-live-aircraft-dot", "crep-live-aircraft-glow"],
    // minZoom 7: at world/continental view show the flat YELLOW v1 icons (small, not crowding);
    // the true-3D meshes only switch in once you're zoomed to where you can fly up to a plane.
    maxInstances: 1200, minZoom: 7, headingFromMotion: false,
  });
}

/** VESSELS — procedural ship at the sea surface. */
export function mountVessel3DLayer(map: any): Mover3DHandle {
  return mountMover3D(map, {
    layerId: "bluesite-movers3d-vessel",
    read: () => readArray("__crep_vessels", 0),
    sourceRef: () => (window as any).__crep_vessels,
    buildGeometry: buildShipGeometry,
    baseColor: 0x16d6c0, band: vesselBand, charLen: 64,
    toggleLayerId: "ships", nativeLayerIds: ["crep-live-vessels-dot", "crep-live-vessels-glow"],
    // same as aircraft: flat dots at world view, 3D ship meshes once zoomed in close.
    maxInstances: 1000, minZoom: 7, headingFromMotion: true,
  });
}

/** SATELLITES — procedural satellite (bus + solar wings), orbital shell. Gated to
 *  regional+ zoom so we never draw thousands of meshes at world view (sprites cover that);
 *  hides the v1 elevated-sprite sat layer while active so they don't double-draw. */
export function mountSatellite3DLayer(map: any): Mover3DHandle {
  return mountMover3D(map, {
    layerId: "bluesite-movers3d-sat",
    read: () => readFeatureCollection("__crep_sat_fc", 550_000),
    sourceRef: () => (window as any).__crep_sat_fc,
    buildGeometry: buildSatelliteGeometry,
    baseColor: 0x8a5cf6, band: satBand, charLen: 44,
    toggleLayerId: "satellites", nativeLayerIds: ["bluesite-movers"],
    maxInstances: 800, minZoom: 3.5, headingFromMotion: true,
  });
}
