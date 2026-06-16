/**
 * True-3D mover layer (Earth Simulator v2, Phase 1).
 *
 * Replaces the flat camera-facing billboard sprites with actual 3D MESHES oriented in
 * true 3D — surface-normal (up) → heading (yaw) — so a plane's NOSE points along its
 * track from ANY camera angle (tilt / orbit / side-on). A screen-facing sprite can't
 * do that; this can. Built on the globe-locked BlueSite harness (three-maplibre-layer).
 *
 * v1 scope: AIRCRAFT. Procedural low-poly airliner (nose / swept wings / tail), one
 * geometry rendered as an InstancedMesh (1 draw call for thousands). Per-instance
 * matrix = modelMatrixFor(lng,lat,altShell) · yaw(heading) · scale. Smooth: positions
 * interpolate per-frame between the ~2.5 s data ticks. Perf: LOD-gated to near zoom +
 * capped; thousands of glTF airliners at world view would melt the GPU.
 *
 * A photoreal glTF/STL model can later swap into buildAirlinerGeometry() unchanged —
 * the engine (placement / orientation / interpolation / LOD / picking) stays the same.
 *
 * Gated OFF by default (window.__es_v2.movers3d / the "3D Movers" toggle).
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createBlueSiteStack } from "./three-maplibre-layer";

const DEG2RAD = Math.PI / 180;
const EARTH_R_M = 6_371_000;
const MAX = 1200;          // hard cap on 3D instances (perf)
const TICK_MS = 2500;      // data refresh cadence (matches the v1 aircraft pump)

// Same altitude-compression shell as the sprite movers so planes sit just off the
// surface, far below the satellite shell.
function visualZ(altMeters: number): number {
  const a = Math.max(0, Number(altMeters) || 0);
  return Math.min(EARTH_R_M * 0.06 * Math.log10(1 + a / 60_000), EARTH_R_M * 0.16);
}

function readNum(...vals: unknown[]): number {
  for (const x of vals) { const n = Number(x); if (Number.isFinite(n)) return n; }
  return NaN;
}

interface AircraftRow { id: string; lng: number; lat: number; alt: number; heading: number; name?: string }

function readAircraft(): AircraftRow[] {
  const arr = (window as unknown as { __crep_aircraft?: unknown }).__crep_aircraft;
  if (!Array.isArray(arr)) return [];
  const out: AircraftRow[] = [];
  for (const e of arr) {
    if (!e) continue;
    const loc = (e.location ?? {}) as Record<string, unknown>;
    const lng = readNum(e.lng, e.lon, e.longitude, loc.longitude, loc.lng, e.geometry?.coordinates?.[0], e.properties?.lng);
    const lat = readNum(e.lat, e.latitude, loc.latitude, loc.lat, e.geometry?.coordinates?.[1], e.properties?.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const alt = readNum(e.altitude, loc.altitude, e.properties?.altitude, e.geo_altitude, e.baro_altitude) || 10500;
    const heading = readNum(e.heading, e.properties?.heading, e.true_track, e.properties?.track, loc.heading) || 0;
    const id = String(e.id ?? e.icao24 ?? e.properties?.icao24 ?? e.properties?.id ?? `${lng},${lat}`);
    out.push({ id, lng, lat, alt, heading, name: e.name ?? e.callsign ?? e.properties?.callsign });
  }
  return out;
}

/**
 * Low-poly airliner as ONE merged geometry. Built in METERS in a local frame:
 *   +Y = nose / forward (so heading 0 = north),  +Z = up,  +X = right wing.
 * Scaled up at instance time for on-globe visibility (real ~60 m would be a speck).
 */
function buildAirlinerGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const fuselage = new THREE.CylinderGeometry(2.4, 2.4, 46, 12);
  fuselage.rotateX(Math.PI / 2);            // cylinder default is along Y → make it along… keep along Y (forward)
  fuselage.rotateX(-Math.PI / 2);           // (net: along +Y, the forward axis)
  parts.push(fuselage);
  const nose = new THREE.ConeGeometry(2.4, 9, 12); nose.translate(0, 27.5, 0); parts.push(nose);
  const tailcone = new THREE.ConeGeometry(2.4, 7, 12); tailcone.rotateZ(Math.PI); tailcone.translate(0, -26.5, 0); parts.push(tailcone);
  // wings (swept slightly back): flat box across X, set a touch below centre
  const wing = new THREE.BoxGeometry(56, 1.6, 8); wing.translate(0, -1, -1.5); parts.push(wing);
  // vertical tail fin (in the +Z/up, at the back)
  const fin = new THREE.BoxGeometry(1.4, 9, 9); fin.translate(0, -22, 5); parts.push(fin);
  // horizontal stabilisers at the tail
  const stab = new THREE.BoxGeometry(20, 1.2, 5); stab.translate(0, -23, 0); parts.push(stab);
  const merged = mergeGeometries(parts, false) ?? fuselage;
  for (const p of parts) if (p !== merged) p.dispose();
  return merged;
}

export interface Mover3DHandle { dispose: () => void; }

export function mountMover3DLayer(map: any): Mover3DHandle {
  const stack = createBlueSiteStack("bluesite-movers3d");
  const geometry = buildAirlinerGeometry();
  const material = new THREE.MeshLambertMaterial({ color: 0x46e8ee }); // cruise-cyan; band-colored per instance below
  const inst = new THREE.InstancedMesh(geometry, material, MAX);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.count = 0;
  inst.frustumCulled = false;
  const group = new THREE.Group();
  group.add(inst);
  // simple two-light rig so the 3D shape reads (Lambert needs light)
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(0.5, 1, 0.8);
  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  group.add(key, amb);
  // per-instance altitude band colour
  inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  const setBand = (i: number, altM: number) => {
    let r = 0.13, g = 0.83, b = 0.93;                 // cruise cyan
    if (altM < 2500) { r = 0.98; g = 0.75; b = 0.14; }      // amber (approach/ground)
    else if (altM < 8000) { r = 0.49; g = 0.91; b = 0.47; } // green (climb/descent)
    inst.setColorAt(i, new THREE.Color(r, g, b));
  };

  // ── Zoom-adaptive scale ──────────────────────────────────────────────────
  // A plane is ~60 m — a sub-pixel speck over a continent. So we DON'T draw it at
  // real size when zoomed out; we hold a ~constant on-screen PIXEL size (visible but
  // small, not crowding the map). As you fly closer, real-world size eventually
  // exceeds that pixel target and takes over — so the proportions become physically
  // accurate the nearer you get. scaleFactor = clamp(targetPx · metresPerPixel /
  // charLen, realFloor, max). (charLen = the geometry's characteristic size in m.)
  const CHAR_LEN = 55; // ≈ airliner wingspan in metres (geometry is built ~real-size)
  const TARGET_PX = () => { try { const v = (window as any).__es_v2?.moverTargetPx; return Number.isFinite(v) ? Number(v) : 14; } catch { return 14; } };
  const SCALE_MULT = () => { try { const v = (window as any).__es_v2?.moverScale; return Number.isFinite(v) ? Number(v) : 1; } catch { return 1; } };
  const SCALE_MAX = () => { try { const v = (window as any).__es_v2?.moverScaleMax; return Number.isFinite(v) ? Number(v) : 12000; } catch { return 12000; } };
  const computeScale = (): number => {
    let zoom = 3, lat = 0;
    try { zoom = map.getZoom?.() ?? 3; lat = map.getCenter?.()?.lat ?? 0; } catch { /* */ }
    // Web-Mercator ground resolution (good approximation for on-screen size near the
    // viewport centre on the globe); shrinks as you zoom in.
    const mpp = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
    const kScreen = (TARGET_PX() * mpp) / CHAR_LEN;
    // floor at 1 = real size (so close-up = accurate proportions); cap keeps the
    // flat tangent-plane geometry from spanning enough of the globe to look wrong.
    return Math.max(1, Math.min(SCALE_MAX(), kScreen * SCALE_MULT()));
  };
  const HEAD_SIGN = () => { try { const v = (window as any).__es_v2?.moverHeadingSign; return v === 1 || v === -1 ? v : -1; } catch { return -1; } };
  const HEAD_OFFSET = () => { try { const v = (window as any).__es_v2?.moverHeadingOffsetDeg; return Number.isFinite(v) ? Number(v) * DEG2RAD : 0; } catch { return 0; } };

  // per-mover geo anchors for smooth per-frame interpolation
  let prevGeo = new Map<string, { lng: number; lat: number }>();
  let rows: AircraftRow[] = [];
  let curGeo: Array<{ id: string; lng: number; lat: number; alt: number; heading: number; plng: number; plat: number }> = [];
  let lastTickMs = Date.now();
  let lastInterval = TICK_MS;
  let lastRef: unknown = null;
  let count = 0;

  const mTmp = new THREE.Matrix4();
  const yawTmp = new THREE.Matrix4();
  const scaleTmp = new THREE.Matrix4();

  // ── Visibility gate ──────────────────────────────────────────────────────
  // Two reasons to draw NOTHING (and do zero work):
  //  1. Top-down / flat view (pitch < threshold) — 3D depth is imperceptible looking
  //     straight down, and the v1 flat sprite/symbol layer already shows the planes.
  //     So the heavy instanced 3D only "switches on" once the camera tilts to an angle.
  //     This is the big resource saver on the common flat view.
  //  2. The aircraft filter is OFF — mirror the v1 `crep-live-aircraft-dot` visibility so
  //     toggling planes off in the UI also hides these meshes.
  const PITCH_MIN = () => { try { const v = (window as any).__es_v2?.moverPitchMin; return Number.isFinite(v) ? Number(v) : 12; } catch { return 12; } };
  // Authoritative aircraft-filter state — the React layer registry, NOT the map layer's
  // visibility (which we write ourselves below, so reading it back would be ambiguous).
  const aircraftEnabled = (): boolean => {
    try {
      const ls = (window as any).__crep_layers?.();
      if (Array.isArray(ls)) { const av = ls.find((l: any) => l && l.id === "aviation"); if (av) return av.enabled !== false; }
    } catch { /* */ }
    return true;
  };
  const shouldRender = (): boolean => {
    try {
      if ((map.getPitch?.() ?? 0) < PITCH_MIN()) return false; // flat/top-down → flat sprites handle it
      if (!aircraftEnabled()) return false;                    // aircraft filter off → hide meshes
    } catch { /* */ }
    return true;
  };

  // Flat ↔ 3D handoff: while the 3D meshes are the active representation (tilted + aircraft
  // on), HIDE the v1 flat aircraft symbols so we never double-draw planes. Restore them when
  // we go flat again — but only if aircraft is still enabled (else the v1 toggle owns the
  // "none" state and we must not un-hide what the user turned off).
  const NATIVE_AC = ["crep-live-aircraft-dot", "crep-live-aircraft-glow"];
  let iHidNative = false;
  const setNativeHidden = (hide: boolean) => {
    for (const id of NATIVE_AC) { try { if (map.getLayer?.(id)) map.setLayoutProperty(id, "visibility", hide ? "none" : "visible"); } catch { /* */ } }
    iHidNative = hide;
  };
  const updateHandoff = (render3D: boolean) => {
    if (render3D) { if (!iHidNative) setNativeHidden(true); }
    else if (iHidNative) { if (aircraftEnabled()) setNativeHidden(false); else iHidNative = false; }
  };

  const rebuild = (force = false) => {
    if (!shouldRender()) { if (count !== 0) { count = 0; inst.count = 0; inst.instanceMatrix.needsUpdate = true; } return; }
    const ref = (window as unknown as { __crep_aircraft?: unknown }).__crep_aircraft;
    if (!force && ref === lastRef && count > 0) return; // dedup on the array ref (stutter-safe)
    lastRef = ref;
    rows = readAircraft();
    const n = Math.min(rows.length, MAX);
    const next = new Map<string, { lng: number; lat: number }>();
    curGeo = [];
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      const p = prevGeo.get(r.id);
      curGeo.push({ id: r.id, lng: r.lng, lat: r.lat, alt: r.alt, heading: r.heading, plng: p ? p.lng : r.lng, plat: p ? p.lat : r.lat });
      next.set(r.id, { lng: r.lng, lat: r.lat });
      setBand(i, r.alt);
    }
    prevGeo = next;
    count = n;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    const nowMs = Date.now();
    lastInterval = Math.max(TICK_MS, Math.min(TICK_MS * 2, nowMs - lastTickMs));
    lastTickMs = nowMs;
    try { map.triggerRepaint?.(); } catch { /* */ }
  };

  // ── FPS governor ─────────────────────────────────────────────────────────
  // Perf contract: the 3D movers must NEVER drag the frame rate under ~30. We watch the
  // page FPS (window.__crep_fps) and shed load progressively: shrink how many 3D planes we
  // draw, and if even the minimum can't hold the floor, SUSPEND the meshes and fall back to
  // the cheap flat v1 sprites (restored via the handoff) so planes still show. Recovery is
  // gradual + hysteretic (needs sustained healthy FPS) to avoid oscillation.
  const FPS_FLOOR = () => { try { const v = (window as any).__es_v2?.moverFpsFloor; return Number.isFinite(v) ? Number(v) : 33; } catch { return 33; } };
  const FPS_HEALTHY = 50;
  let renderBudget = MAX;     // adaptive cap on rendered instances
  let suspended = false;      // hard fallback → flat sprites
  let healthy = 0;            // consecutive healthy gov ticks
  let lastGovMs = 0;
  const readFps = () => { try { const f = (window as any).__crep_fps; return f && Number.isFinite(f.fps) ? f.fps : 60; } catch { return 60; } };
  const governor = () => {
    const now = Date.now();
    if (now - lastGovMs < 500) return;   // re-tune at most ~2×/sec
    lastGovMs = now;
    const fps = readFps();
    const floor = FPS_FLOOR();
    healthy = fps >= FPS_HEALTHY ? healthy + 1 : 0;
    if (fps < floor) {
      renderBudget = Math.max(80, Math.floor(renderBudget * 0.6));
      if (renderBudget <= 80 && fps < floor - 6) suspended = true;  // still drowning at min → flat fallback
    } else if (fps >= FPS_HEALTHY) {
      if (suspended) { if (healthy >= 4) { suspended = false; renderBudget = 120; } } // sustained healthy → resume gently
      else renderBudget = Math.min(MAX, renderBudget + 120);
    }
    try { (window as any).__crep_movers3d_perf = { fps, renderBudget, suspended }; } catch { /* */ }
  };

  // place every instance at its (interpolated) geo position, oriented by heading
  const place = () => {
    governor();
    const render3D = shouldRender() && !suspended;
    updateHandoff(render3D);
    if (!render3D) { if (inst.count !== 0) { inst.count = 0; inst.instanceMatrix.needsUpdate = true; } return; }
    const f = Math.min(1.2, (Date.now() - lastTickMs) / lastInterval);
    const s = computeScale();
    const sign = HEAD_SIGN();
    const off = HEAD_OFFSET();
    const budget = Math.min(count, renderBudget);
    let w = 0;
    for (let i = 0; i < budget; i++) {
      const g = curGeo[i];
      const lng = g.plng + (g.lng - g.plng) * f;
      const lat = g.plat + (g.lat - g.plat) * f;
      const mm = stack.modelMatrixFor(lng, lat, visualZ(g.alt));
      if (!mm) continue;
      mTmp.fromArray(mm);                                   // globe placement (east/north/up frame, metres)
      yawTmp.makeRotationZ(sign * g.heading * DEG2RAD + off); // yaw about local up
      scaleTmp.makeScale(s, s, s);
      mTmp.multiply(yawTmp).multiply(scaleTmp);
      inst.setMatrixAt(w, mTmp);
      w++;
    }
    inst.count = w;
    inst.instanceMatrix.needsUpdate = true;
  };

  let raf = 0;
  let interval: any = 0;
  const tick = () => { rebuild(); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  interval = setInterval(() => rebuild(), 1000); // backstop when tab hidden (rAF paused)

  const onMoveEnd = () => { try { map.triggerRepaint?.(); } catch { /* */ } };
  try { map.on?.("moveend", onMoveEnd); } catch { /* */ }

  const unregister = stack.register({
    group,
    animated: () => count > 0,
    onFrame: () => { place(); },
  });

  try { map.addLayer?.(stack.layer); } catch { /* */ }
  rebuild(true);

  return {
    dispose() {
      // restore the v1 flat aircraft layer if we hid it for the handoff (so turning the
      // 3D movers off doesn't leave the planes invisible) — unless aircraft is filtered off.
      try { if (iHidNative && aircraftEnabled()) setNativeHidden(false); } catch { /* */ }
      try { cancelAnimationFrame(raf); } catch { /* */ }
      try { clearInterval(interval); } catch { /* */ }
      try { map.off?.("moveend", onMoveEnd); } catch { /* */ }
      try { unregister(); } catch { /* */ }
      try { if (map.getLayer?.(stack.layer.id)) map.removeLayer(stack.layer.id); } catch { /* */ }
      try { geometry.dispose(); material.dispose(); } catch { /* */ }
    },
  };
}
