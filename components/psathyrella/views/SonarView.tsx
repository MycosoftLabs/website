"use client";

/**
 * SonarView — FISH-FINDER / depth-sounder for the Psathyrella buoy GCS.
 *
 * Three modes (segmented control, persisted per session):
 *   • DEPTH  — downward echogram: depth on Y (surface→seabed), time scrolling right→left, the
 *              seabed contour as a hard bottom return, water-column scatter, big depth readout.
 *   • FISH   — the same echogram + object/fish detection boxes + a tracked-target list.
 *   • 360°   — top-down omni sonar: range rings, a rotating sweep, contacts at (bearing, range).
 *
 * Data: a downward echosounder is the buoy's active sonar (Cursor/firmware lane). Until that
 * telemetry exists, the echogram runs as a CLEARLY-BADGED simulation (SIM) so the operator can
 * see/operate the fish-finder; `telemetry.pose.depthM` drives the live depth readout when present.
 * One rAF loop owns all canvas work, gated on document.hidden AND on this view being active.
 */

import { useEffect, useRef, useState } from "react";
import { Fish, Ruler, Radar as RadarIcon, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuoyCommand, BuoyTelemetry } from "@/lib/psathyrella/contract";
import { ViewBadge } from "@/components/psathyrella/ui";

type Mode = "DEPTH" | "FISH" | "360";
const RANGES_M = [10, 30, 60, 120] as const; // depth range presets (meters)

// Echo strength 0..1 → classic fish-finder ramp (dark blue → cyan → green → yellow → red).
function echoRGB(v: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v));
  if (t < 0.2) { const k = t / 0.2; return [4 + 8 * k, 10 + 30 * k, 30 + 90 * k]; }            // navy→blue
  if (t < 0.45) { const k = (t - 0.2) / 0.25; return [12 + 8 * k, 40 + 150 * k, 120 + 90 * k]; } // blue→cyan
  if (t < 0.65) { const k = (t - 0.45) / 0.2; return [20 + 80 * k, 190 - 20 * k, 210 - 150 * k]; } // cyan→green
  if (t < 0.85) { const k = (t - 0.65) / 0.2; return [100 + 155 * k, 170 + 40 * k, 60 - 50 * k]; } // green→yellow
  const k = (t - 0.85) / 0.15; return [255, 210 - 150 * k, 10]; // yellow→red
}

interface FishTarget { depthM: number; sizeCm: number; conf: number; ageS: number; xCol: number; }

export default function SonarView({
  telemetry,
  active = true,
  className,
}: {
  telemetry: BuoyTelemetry;
  sendCommand?: (cmd: BuoyCommand) => Promise<boolean> | void;
  /** true only while SONAR is the active center view — pauses the rAF otherwise. */
  active?: boolean;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>("DEPTH");
  const [rangeM, setRangeM] = useState<number>(30);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active); activeRef.current = active;
  const modeRef = useRef<Mode>(mode); modeRef.current = mode;
  const rangeRef = useRef(rangeM); rangeRef.current = rangeM;

  // Live pose depth (real when the echosounder/pressure sensor reports it) into a ref for the loop.
  const liveDepthRef = useRef<number | null>(telemetry.pose.depthM ?? null);
  liveDepthRef.current = telemetry.pose.depthM ?? null;
  const realDepth = telemetry.pose.depthM != null;

  // Live readouts surfaced to React (updated ~3 Hz from the loop, NOT per frame).
  const [readout, setReadout] = useState<{ depthM: number; bottomHard: number; targets: FishTarget[]; sweepDeg: number }>(
    { depthM: 0, bottomHard: 0.6, targets: [], sweepDeg: 0 }
  );

  // ── one rAF loop drives the echogram + the 360° scope ──
  useEffect(() => {
    let raf = 0;
    let lastPing = 0;
    let sweep = 0;
    let tSim = 0; // sim clock (advances only while active+visible)
    let bottom = 16; // current seabed depth (m), random-walks
    const targets: FishTarget[] = [];
    let lastReadoutPush = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if ((typeof document !== "undefined" && document.hidden) || !activeRef.current) return;

      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const w = c.width, h = c.height;
      if (w < 2 || h < 2) return;

      const m = modeRef.current;
      const range = rangeRef.current;

      if (m === "360") {
        // ── top-down omni sonar sweep ──
        sweep = (sweep + 2.2) % 360;
        ctx.fillStyle = "rgba(3,9,16,0.18)"; // fade trails
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8;
        // rings
        ctx.strokeStyle = "rgba(34,211,238,0.18)";
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
        // sweep wedge
        const a = (sweep - 90) * Math.PI / 180;
        ctx.save();
        ctx.strokeStyle = "rgba(34,211,238,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
        ctx.restore();
        // contacts (sim) — a few stable blobs lit by the sweep
        for (const t of targets) {
          const tb = (t.depthM * 37) % 360; // pseudo-bearing from the target's seed
          const tr = (t.sizeCm / 80) * R;
          const da = Math.abs(((tb - sweep + 540) % 360) - 180);
          const lit = da < 26 ? 1 - da / 26 : 0.12;
          const ta = (tb - 90) * Math.PI / 180;
          const [r, g, b] = echoRGB(0.5 + 0.5 * lit);
          ctx.fillStyle = `rgba(${r},${g},${b},${0.35 + 0.6 * lit})`;
          ctx.beginPath(); ctx.arc(cx + Math.cos(ta) * tr, cy + Math.sin(ta) * tr, 3 + 3 * lit, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        // ── downward echogram (DEPTH / FISH) ──
        // scroll left by 1px, draw a fresh ping column at the right edge each ~70ms
        const pingDue = now - lastPing > 70;
        try {
          const prev = ctx.getImageData(1, 0, w - 1, h);
          ctx.putImageData(prev, 0, 0);
        } catch { /* detached/0-size — skip a frame */ }

        if (pingDue) {
          lastPing = now;
          tSim += 0.07;
          // seabed depth random-walk, clamped into the range
          bottom += (Math.sin(tSim * 0.6) * 0.12 + (Math.random() - 0.5) * 0.25);
          bottom = Math.max(2, Math.min(range * 0.96, bottom));
          const liveD = liveDepthRef.current;
          const bottomDepth = liveD != null && liveD > 0 ? Math.min(range * 0.96, liveD) : bottom;

          // spawn/age fish targets occasionally
          if (Math.random() < 0.05 && targets.length < 7) {
            targets.push({ depthM: 1 + Math.random() * (bottomDepth - 1.5), sizeCm: 8 + Math.random() * 70, conf: 0.55 + Math.random() * 0.4, ageS: 0, xCol: w - 1 });
          }
          for (const t of targets) { t.ageS += 0.07; t.xCol -= 1; }
          for (let i = targets.length - 1; i >= 0; i--) if (targets[i].xCol < 0) targets.splice(i, 1);

          const col = w - 1;
          const yOf = (d: number) => Math.round((d / range) * h);
          // surface band + water-column scatter
          const colImg = ctx.createImageData(1, h);
          for (let y = 0; y < h; y++) {
            const d = (y / h) * range;
            let v = 0.04 + Math.random() * 0.06;                 // background noise
            if (d < bottomDepth - 0.4) v += 0.05 * Math.exp(-d / (range * 0.7)); // thermocline-ish scatter near top
            const [r, g, b] = echoRGB(v);
            const o = y * 4;
            colImg.data[o] = r; colImg.data[o + 1] = g; colImg.data[o + 2] = b; colImg.data[o + 3] = 255;
          }
          ctx.putImageData(colImg, col, 0);

          // hard bottom return (thick band) + a faint 2nd echo
          const yb = yOf(bottomDepth);
          for (let dy = 0; dy < 8 && yb + dy < h; dy++) { const [r, g, b] = echoRGB(1 - dy * 0.09); ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(col, yb + dy, 1, 1); }
          const yb2 = yOf(Math.min(range * 0.99, bottomDepth * 2));
          if (yb2 < h) { const [r, g, b] = echoRGB(0.4); ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(col, yb2, 1, 2); }

          // fish marks (arch) for any target at this column
          for (const t of targets) {
            if (t.xCol !== col) continue;
            const yf = yOf(t.depthM);
            const inten = 0.6 + t.conf * 0.4;
            const [r, g, b] = echoRGB(inten);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            const arch = Math.max(1, Math.round(t.sizeCm / 22));
            for (let dy = -arch; dy <= arch; dy++) { const yy = yf + dy; if (yy >= 0 && yy < h) ctx.fillRect(col, yy, 1, 1); }
          }

          // throttle the React readout to ~3 Hz
          if (now - lastReadoutPush > 320) {
            lastReadoutPush = now;
            setReadout({ depthM: liveD != null && liveD > 0 ? liveD : bottomDepth, bottomHard: 0.55 + 0.3 * Math.sin(tSim), targets: targets.map((t) => ({ ...t })), sweepDeg: sweep });
          }
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // size canvas to its box
  useEffect(() => {
    const c = canvasRef.current;
    const size = () => { if (!c) return; const r = c.getBoundingClientRect(); const w = Math.max(1, Math.floor(r.width)); const h = Math.max(1, Math.floor(r.height)); if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; };
    size();
    const ro = new ResizeObserver(size); if (c) ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const depthFt = readout.depthM * 3.28084;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#03070e]", className)}>
      <ViewBadge>Sonar · {mode === "360" ? "Omni 360°" : mode === "FISH" ? "Fish-finder" : "Depth-sounder"}{!realDepth && " · SIM"}</ViewBadge>

      {/* mode + range controls (top-right) */}
      <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-1.5">
        <div className="flex overflow-hidden rounded-md border border-cyan-500/25 text-[10px] font-bold uppercase tracking-wide">
          {(["DEPTH", "FISH", "360"] as Mode[]).map((mm) => (
            <button key={mm} type="button" onClick={() => setMode(mm)} className={cn("flex items-center gap-1 px-2.5 py-1 transition-colors", mode === mm ? "bg-cyan-500/20 text-cyan-100" : "bg-black/45 text-slate-400 hover:text-slate-200")}>
              {mm === "DEPTH" ? <Ruler className="h-3 w-3" /> : mm === "FISH" ? <Fish className="h-3 w-3" /> : <RadarIcon className="h-3 w-3" />}
              {mm === "360" ? "360°" : mm}
            </button>
          ))}
        </div>
        {mode !== "360" && (
          <div className="flex overflow-hidden rounded-md border border-white/10 text-[9px] font-bold uppercase tracking-wide">
            {RANGES_M.map((r) => (
              <button key={r} type="button" onClick={() => setRangeM(r)} className={cn("px-2 py-0.5", rangeM === r ? "bg-cyan-500/15 text-cyan-200" : "bg-black/40 text-slate-500 hover:text-slate-300")}>{r} m</button>
            ))}
          </div>
        )}
      </div>

      {/* big depth readout (top-left) */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg border border-cyan-500/20 bg-black/55 px-3 py-1.5 font-mono tabular-nums">
        <div className="text-[9px] uppercase tracking-[0.15em] text-cyan-400/70">Depth</div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-cyan-100">{readout.depthM > 0 ? readout.depthM.toFixed(1) : "—"}</span>
          <span className="text-[11px] text-slate-400">m</span>
          <span className="ml-1 text-[11px] text-slate-500">{readout.depthM > 0 ? `${depthFt.toFixed(0)} ft` : ""}</span>
        </div>
        {!realDepth && <div className="text-[8px] uppercase tracking-wide text-amber-400/70">simulated · awaiting echosounder</div>}
      </div>

      {/* the scope */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ imageRendering: "pixelated" }} />

      {/* depth axis labels (DEPTH/FISH) */}
      {mode !== "360" && (
        <div className="pointer-events-none absolute left-1 top-16 bottom-2 z-10 flex flex-col justify-between font-mono text-[9px] text-cyan-300/45">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (<span key={f}>{Math.round(rangeM * f)}m</span>))}
        </div>
      )}

      {/* FISH mode — tracked target list (bottom-left) */}
      {mode === "FISH" && (
        <div className="absolute bottom-3 left-3 z-20 w-44 rounded-lg border border-cyan-500/20 bg-black/55 p-2 font-mono text-[10px]">
          <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-cyan-400/70"><Fish className="h-3 w-3" /> Targets · {readout.targets.length}</div>
          {readout.targets.length === 0 ? (
            <div className="text-[9px] text-slate-500">No marks in column</div>
          ) : (
            readout.targets.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center justify-between py-0.5 text-slate-300">
                <span className="text-cyan-200">{t.depthM.toFixed(1)}m</span>
                <span>{Math.round(t.sizeCm)}cm</span>
                <span className={t.conf > 0.8 ? "text-green-300" : "text-amber-300/80"}>{Math.round(t.conf * 100)}%</span>
              </div>
            ))
          )}
          <div className="mt-1 border-t border-white/10 pt-1 text-[8px] uppercase tracking-wide text-slate-500">Heuristic detector · CNN classify when wired</div>
        </div>
      )}

      {/* 360 mode caption */}
      {mode === "360" && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/45">
          <Waves className="mr-1 inline h-3 w-3" /> Omni-directional · triangulated targets (multi-buoy when meshed)
        </div>
      )}
    </div>
  );
}
