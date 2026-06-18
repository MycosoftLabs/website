"use client";

/**
 * Storm lightning — animated jagged bolts + ground flashes over REAL active NWS
 * thunderstorm/tornado warning cells (from /api/crep/storm-cells), with optional thunder.
 * Keyless and reliable: lightning only appears where a genuine NWS warning is active.
 *
 * Perf: a single rAF loop, only while enabled; spawns sparse bolts (each ~180ms) into two
 * GeoJSON sources; thunder is gated to in-viewport strikes, throttled, and off by default
 * (browser autoplay needs a gesture). Self-cleans on disable/unmount.
 */

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined;
interface Props { map: MapLike; enabled: boolean; sound?: boolean }

interface Cell { centroid: [number, number]; bbox: [number, number, number, number]; polygon: [number, number][] }
interface Bolt { line: [number, number][]; born: number; flash: [number, number] }

const BOLT_SRC = "storm-lightning-bolts";
const BOLT_LYR = "storm-lightning-bolt-line";
const GLOW_LYR = "storm-lightning-bolt-glow";
const FLASH_SRC = "storm-lightning-flash";
const FLASH_LYR = "storm-lightning-flash-circle";
const BOLT_LIFE = 180; // ms

function resolveMap(m: MapLike): MapLibreMap | null {
  if (!m) return null;
  if (typeof (m as MapLibreMap).getStyle === "function") return m as MapLibreMap;
  return (m as { current?: MapLibreMap | null }).current ?? null;
}

function inPoly(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

export default function StormLightningLayer({ map, enabled, sound = false }: Props) {
  const rafRef = useRef<number | null>(null);
  const cellsRef = useRef<Cell[]>([]);
  const boltsRef = useRef<Bolt[]>([]);
  const lastThunderRef = useRef(0);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  useEffect(() => {
    const m = resolveMap(map);
    if (!m || !enabled) return;
    let cancelled = false;
    let audioCtx: AudioContext | null = null;
    let lastSpawn = 0;

    const ensureLayers = () => {
      try {
        if (!m.getSource(BOLT_SRC)) m.addSource(BOLT_SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } } as never);
        if (!m.getSource(FLASH_SRC)) m.addSource(FLASH_SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } } as never);
        if (!m.getLayer(FLASH_LYR)) m.addLayer({ id: FLASH_LYR, type: "circle", source: FLASH_SRC, paint: { "circle-color": "#e0e7ff", "circle-opacity": 0.35, "circle-radius": ["get", "r"], "circle-blur": 1 } });
        if (!m.getLayer(GLOW_LYR)) m.addLayer({ id: GLOW_LYR, type: "line", source: BOLT_SRC, paint: { "line-color": "#a5b4fc", "line-width": 6, "line-opacity": 0.5, "line-blur": 4 } });
        if (!m.getLayer(BOLT_LYR)) m.addLayer({ id: BOLT_LYR, type: "line", source: BOLT_SRC, paint: { "line-color": "#ffffff", "line-width": 1.8 } });
      } catch { /* */ }
    };

    const removeLayers = () => {
      for (const id of [BOLT_LYR, GLOW_LYR, FLASH_LYR]) { try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* */ } }
      for (const id of [BOLT_SRC, FLASH_SRC]) { try { if (m.getSource(id)) m.removeSource(id); } catch { /* */ } }
    };

    const fetchCells = async () => {
      try {
        const r = await fetch("/api/crep/storm-cells", { cache: "no-store" });
        const d = await r.json();
        if (!cancelled && d?.ok) cellsRef.current = Array.isArray(d.cells) ? d.cells : [];
      } catch { /* */ }
    };

    // jagged near-vertical bolt rising from a ground point
    const makeBolt = (lng: number, lat: number): [number, number][] => {
      const segs = 5, h = 0.14 + Math.random() * 0.10;
      const pts: [number, number][] = [];
      for (let i = 0; i <= segs; i++) { const t = i / segs; const j = (Math.random() - 0.5) * 0.045 * (1 - t); pts.push([lng + j, lat + h * t]); }
      return pts;
    };

    const thunder = () => {
      if (!soundRef.current) return;
      try {
        const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
        const Ctor = C.AudioContext || C.webkitAudioContext;
        if (!Ctor) return;
        if (!audioCtx) audioCtx = new Ctor();
        const ctx = audioCtx; const dur = 1.8;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
        lp.frequency.setValueAtTime(700, ctx.currentTime); lp.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start();
      } catch { /* */ }
    };

    const frame = () => {
      if (cancelled) return;
      const now = Date.now();
      const cells = cellsRef.current;
      if (cells.length > 0 && now - lastSpawn > 90 && Math.random() < Math.min(0.9, 0.15 * cells.length)) {
        lastSpawn = now;
        const cell = cells[Math.floor(Math.random() * cells.length)];
        let lng = cell.centroid[0], lat = cell.centroid[1];
        for (let k = 0; k < 6; k++) {
          const x = cell.bbox[0] + Math.random() * (cell.bbox[2] - cell.bbox[0]);
          const y = cell.bbox[1] + Math.random() * (cell.bbox[3] - cell.bbox[1]);
          if (inPoly(x, y, cell.polygon)) { lng = x; lat = y; break; }
        }
        boltsRef.current.push({ line: makeBolt(lng, lat - 0.16), born: now, flash: [lng, lat] });
        try { const b = m.getBounds(); if (soundRef.current && b.contains([lng, lat]) && now - lastThunderRef.current > 2500) { lastThunderRef.current = now; thunder(); } } catch { /* */ }
      }
      boltsRef.current = boltsRef.current.filter((b) => now - b.born < BOLT_LIFE);
      try {
        (m.getSource(BOLT_SRC) as { setData?: (d: unknown) => void } | undefined)?.setData?.({
          type: "FeatureCollection",
          features: boltsRef.current.map((b) => ({ type: "Feature", geometry: { type: "LineString", coordinates: b.line }, properties: {} })),
        });
        (m.getSource(FLASH_SRC) as { setData?: (d: unknown) => void } | undefined)?.setData?.({
          type: "FeatureCollection",
          features: boltsRef.current.map((b) => { const age = (now - b.born) / BOLT_LIFE; return { type: "Feature", geometry: { type: "Point", coordinates: b.flash }, properties: { r: 6 + age * 22 } }; }),
        });
      } catch { /* */ }
      rafRef.current = requestAnimationFrame(frame);
    };

    const start = () => { if (cancelled) return; ensureLayers(); fetchCells(); frame(); };
    if (m.isStyleLoaded?.()) start(); else m.once("idle", start);
    const poll = window.setInterval(fetchCells, 120_000);

    return () => {
      cancelled = true;
      if (rafRef.current) { try { cancelAnimationFrame(rafRef.current); } catch { /* */ } }
      window.clearInterval(poll);
      try { audioCtx?.close(); } catch { /* */ }
      removeLayers();
      boltsRef.current = []; cellsRef.current = [];
    };
  }, [map, enabled]);

  return null;
}
