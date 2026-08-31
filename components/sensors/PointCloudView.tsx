"use client";

/**
 * PointCloudView — REAL 3D colored LiDAR point cloud (Ouster), device-agnostic.
 *
 * Renders a PointCloudFrame (flat XYZ + per-point color, sensor/body frame, meters) as a true
 * three.js THREE.Points cloud with orbit/pan/zoom — the tower-mounted 3D view, NOT a radar circle.
 * The buoy lidar, the drone lidar, any device's pointcloud capability feed the same component.
 *
 * FREEZE-SAFE (the ScopePPI/SonarView discipline, plus WebGL-context hygiene):
 *   - ONE owned WebGLRenderer + geometry + material; buffers preallocated to MAX_POINTS and updated
 *     IN PLACE each frame (never reallocated). Data arrives via a ref, never effect deps.
 *   - rAF renders ONLY when active && !hidden && (new frame OR user orbiting) — idle-cull, so a
 *     static cloud costs nothing and a hidden tile costs nothing.
 *   - Full teardown on unmount: cancelAnimationFrame, controls/geometry/material/renderer.dispose(),
 *     forceContextLoss(), remove canvas, ResizeObserver.disconnect() — no leaked GL context (browsers
 *     cap ~16; the MapLibre globe already holds one).
 *   - Zero per-frame React setState; the point-count/nearest HUD is throttled to ~3 Hz.
 *
 * Until the Jetson/ouster-sdk edge ships real frames, a clearly-BADGED sim cloud renders so the
 * viewer is operable; a live PointCloudFrame (active:true) replaces it with no code change.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cn } from "@/lib/utils";
import type { PointCloudFrame, PointColorScheme } from "@/lib/sensors/frames";
import { ViewBadge } from "@/components/psathyrella/ui";

const MAX_POINTS = 120_000;

// intensity/height 0..1 → Ouster-ish ramp (deep blue → cyan → green → yellow → red/white)
function ramp(v: number, out: THREE.Color) {
  const t = Math.max(0, Math.min(1, v));
  let r: number, g: number, b: number;
  if (t < 0.25) { const k = t / 0.25; r = 0.03 + 0.05 * k; g = 0.08 + 0.3 * k; b = 0.35 + 0.55 * k; }
  else if (t < 0.5) { const k = (t - 0.25) / 0.25; r = 0.08; g = 0.38 + 0.5 * k; b = 0.9 - 0.3 * k; }
  else if (t < 0.72) { const k = (t - 0.5) / 0.22; r = 0.08 + 0.5 * k; g = 0.88; b = 0.6 - 0.5 * k; }
  else if (t < 0.88) { const k = (t - 0.72) / 0.16; r = 0.58 + 0.42 * k; g = 0.88 - 0.1 * k; b = 0.1; }
  else { const k = (t - 0.88) / 0.12; r = 1; g = 0.78 + 0.22 * k; b = 0.1 + 0.7 * k; }
  out.setRGB(r, g, b);
}

// Build a plausible sim scene (water plane + a vessel + buoy mast + scattered returns), colored by
// height/reflectivity, so the 3D viewer is demonstrable before the real Ouster feed lands.
function fillSim(pos: Float32Array, col: Float32Array, tSec: number): number {
  const c = new THREE.Color();
  let n = 0;
  const push = (x: number, y: number, z: number, v: number) => {
    if (n >= MAX_POINTS) return;
    pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z;
    ramp(v, c); col[n * 3] = c.r; col[n * 3 + 1] = c.g; col[n * 3 + 2] = c.b; n++;
  };
  // water surface: 60m x 40m grid of returns, gentle swell, low reflectivity
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 60 - 5, y = Math.random() * 40 - 20;
    const z = Math.sin(x * 0.3 + tSec) * 0.15 + Math.cos(y * 0.4 + tSec * 0.7) * 0.12 + (Math.random() - 0.5) * 0.05;
    push(x, y, z, 0.12 + Math.abs(z) * 0.3);
  }
  // a vessel hull ~25m ahead, slightly to port — brighter reflectivity
  const vx = 24 + Math.sin(tSec * 0.2) * 1.5, vy = 6;
  for (let i = 0; i < 4000; i++) {
    const lx = (Math.random() - 0.5) * 9, ly = (Math.random() - 0.5) * 3;
    const hz = Math.max(0, 2.2 - Math.abs(lx) * 0.35) * Math.random();
    push(vx + lx, vy + ly, 0.2 + hz, 0.7 + Math.random() * 0.3);
  }
  // buoy mast/structure near origin (vertical column of returns)
  for (let i = 0; i < 1500; i++) { const a = Math.random() * Math.PI * 2, rr = 0.25 + Math.random() * 0.15; push(Math.cos(a) * rr, Math.sin(a) * rr, Math.random() * 3.2, 0.85); }
  // a buoy/marker off to starboard
  for (let i = 0; i < 800; i++) { const a = Math.random() * Math.PI * 2; push(14 + Math.cos(a) * 0.6, -8 + Math.sin(a) * 0.6, Math.random() * 1.6, 0.95); }
  return n;
}

export default function PointCloudView({ frame, active = true, className }: { frame: PointCloudFrame | null; active?: boolean; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<PointCloudFrame | null>(frame);
  dataRef.current = frame;
  const activeRef = useRef(active); activeRef.current = active;
  const [hud, setHud] = useState<{ pts: number; nearestM: number | null; sim: boolean }>({ pts: 0, nearestM: null, sim: true });
  const [scheme, setScheme] = useState<PointColorScheme>("reflectivity");
  const schemeRef = useRef(scheme); schemeRef.current = scheme;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power", alpha: false });
    renderer.setClearColor(0x03070e, 1);
    const mobile = (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) || window.innerWidth < 900;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    const canvas = renderer.domElement;
    canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block";
    canvas.style.touchAction = "none"; // OrbitControls owns touch (drag-orbit / pinch-zoom) — no page-scroll hijack on iPad
    wrap.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
    camera.up.set(0, 0, 1); // Ouster sensor frame is Z-up
    camera.position.set(-9, -1, 6);
    camera.lookAt(14, 0, 0);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.12;
    controls.target.set(10, 0, 0.5);
    controls.minDistance = 2; controls.maxDistance = 200;

    // static chrome: ground grid + axes
    const grid = new THREE.GridHelper(120, 24, 0x1d4d63, 0x0e2030); // center line cyan-ish, grid dim
    grid.geometry.rotateX(Math.PI / 2); // grid into X-Y plane (Z up)
    (grid.material as THREE.Material).opacity = 0.18; (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    const positions = new Float32Array(MAX_POINTS * 3);
    const colors = new Float32Array(MAX_POINTS * 3);
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3); posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(colors, 3); colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("color", colAttr);
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({ size: 0.09, sizeAttenuation: true, vertexColors: true });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const ro = new ResizeObserver(() => {
      const w = Math.max(1, wrap.clientWidth), h = Math.max(1, wrap.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      needsRender = true;
    });
    ro.observe(wrap);

    let raf = 0;
    let lastSeq = -1;
    let lastHud = 0;
    let needsRender = true;
    const tmp = new THREE.Color();

    const loadFrame = (now: number) => {
      const f = dataRef.current;
      let count = 0;
      let sim = false;
      let nearest: number | null = null;
      if (f && f.active && f.count > 0 && f.positions) {
        // real frame: copy positions; color from precomputed colors OR intensity+scheme
        count = Math.min(f.count, mobile ? 45_000 : MAX_POINTS);
        const fp = f.positions as ArrayLike<number>;
        for (let i = 0; i < count * 3; i++) positions[i] = fp[i];
        if (f.colors) { const fc = f.colors as ArrayLike<number>; for (let i = 0; i < count * 3; i++) colors[i] = fc[i]; }
        else { const inten = (f.intensity as ArrayLike<number>) || null; for (let i = 0; i < count; i++) { ramp(inten ? inten[i] : 0.5, tmp); colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b; } }
        // nearest obstacle (skip the mast near origin)
        let min = Infinity; for (let i = 0; i < count; i++) { const x = positions[i * 3], y = positions[i * 3 + 1]; const d = Math.hypot(x, y); if (d > 1.2 && d < min) min = d; }
        nearest = Number.isFinite(min) ? min : null;
        lastSeq = f.seq;
      } else {
        sim = true;
        count = fillSim(positions, colors, now / 1000);
        nearest = 12; // sim starboard marker
      }
      posAttr.needsUpdate = true; colAttr.needsUpdate = true;
      geo.setDrawRange(0, count);
      needsRender = true;
      if (now - lastHud > 320) { lastHud = now; setHud({ pts: count, nearestM: nearest, sim }); }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || !activeRef.current) return;
      const f = dataRef.current;
      const isSim = !(f && f.active && f.count > 0);
      // refresh data: sim animates each frame; real data only when a new seq arrives
      if (isSim || (f && f.seq !== lastSeq)) loadFrame(now);
      const orbiting = controls.update(); // returns true while damping/moving
      if (needsRender || orbiting) { renderer.render(scene, camera); needsRender = false; }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      // Bulletproof teardown — a throw here must NEVER escape into React's commit phase.
      try { cancelAnimationFrame(raf); } catch { /* */ }
      try { ro.disconnect(); } catch { /* */ }
      try { controls.dispose(); } catch { /* */ }
      try { geo.dispose(); mat.dispose(); grid.geometry.dispose(); (grid.material as THREE.Material).dispose(); } catch { /* */ }
      try { renderer.dispose(); renderer.forceContextLoss(); } catch { /* */ }
      try { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch { /* */ }
      void disposed;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#03070e]", className)}>
      <ViewBadge>LiDAR · Ouster 3D point cloud{hud.sim ? " · SIM" : ""}</ViewBadge>
      <div ref={wrapRef} className="absolute inset-0" />
      {/* color-scheme + readout */}
      <div className="pointer-events-auto absolute right-2 top-2 z-20 flex flex-col items-end gap-1">
        <div className="flex overflow-hidden rounded-md border border-cyan-500/25 text-[8px] font-bold uppercase tracking-wide">
          {(["reflectivity", "range", "signal", "height"] as PointColorScheme[]).map((s) => (
            <button key={s} type="button" onClick={() => setScheme(s)} className={cn("px-1.5 py-0.5", scheme === s ? "bg-cyan-500/20 text-cyan-100" : "bg-black/45 text-slate-400 hover:text-slate-200")}>{s.slice(0, 4)}</button>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded border border-cyan-500/20 bg-black/55 px-2 py-1 font-mono text-[9px] tabular-nums text-cyan-200/85">
        <span>{hud.pts.toLocaleString()} pts</span>
        <span className="ml-2">nearest {hud.nearestM != null ? `${hud.nearestM.toFixed(1)} m` : "—"}</span>
        {hud.sim && <span className="ml-2 uppercase text-amber-400/70">sim · awaiting Ouster</span>}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 z-10 font-mono text-[8px] uppercase tracking-[0.15em] text-cyan-300/40">drag orbit · scroll zoom</div>
    </div>
  );
}
