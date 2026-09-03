"use client";

/**
 * SonarView — FISH-FINDER / depth-sounder for the Psathyrella buoy GCS.
 *
 * Three modes (segmented control, persisted per session):
 *   • DEPTH  — downward echogram: depth on Y (surface→seabed), time scrolling right→left, a seabed
 *              contour as a hard bottom return, water-column scatter, big depth readout.
 *   • FISH   — the same echogram + a tracked-mark list.
 *   • 360°   — top-down omni scope: range rings only. NO omni sonar is fitted to this hull.
 *
 * WHAT IS REAL ON THIS VIEW — do not overstate it. Nothing is. `BuoyTelemetry` carries no
 * echosounder and no omni-sonar field; the only sonar-adjacent scalar is `pose.depthM`, and that is
 * the buoy's OWN submersion depth, not a seabed range.
 *
 * So the echogram is a walkthrough demo and runs ONLY inside the sanctioned, watermarked SIMULATION
 * mode (`telemetry.simulated === true` — contract.ts's single declared exception to the no-mock-data
 * policy). On a live buoy the scope renders STANDBY, because an operator has to be able to tell
 * "nothing is fitted" from "fitted and quiet".
 *
 * TWO INCIDENTS THIS FILE IS SHAPED BY — do not undo either:
 *   1. The 360° scope used to re-project each demo fish's random depth/size as a BEARING and a
 *      RANGE, lit by a rotating sweep and captioned "triangulated targets (multi-buoy when meshed)".
 *      Nothing triangulated anything and no sensor measured any of it — a dot at an invented range
 *      on a tactical polar display, which is the exact fabrication class deleted from BlueSightView.
 *      The scope now plots no contacts at all, in any mode, simulated or not.
 *   2. Every SIM marker here was gated on `telemetry.pose.depthM != null`. That is inverted: sim.ts
 *      always emits a depthM, so the marker vanished precisely in SIM mode, while one real pressure
 *      reading of 0.4 m un-badged an echogram that was still 100% Math.random(). A simulation marker
 *      is driven by `telemetry.simulated` and by nothing else, ever.
 *
 * One rAF loop owns all canvas work, gated on document.hidden AND on this view being active.
 */

import { useEffect, useRef, useState } from "react";
import { Fish, Ruler, Radar as RadarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuoyCommand, BuoyTelemetry } from "@/lib/fusarium/gcs/contract";
import { NoFeed, ViewBadge } from "@/components/fusarium/gcs/ui";

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

const SCOPE_BG = "#03070e";

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

  /**
   * The ONE gate on synthetic content. Not `pose.depthM`, not "the echosounder hasn't landed yet":
   * `telemetry.simulated` is the only flag contract.ts sanctions for mock data, and the badge, the
   * watermark and the draw loop all read this same flag so they can never disagree.
   */
  const sim = telemetry.simulated;
  const simRef = useRef(sim); simRef.current = sim;

  /**
   * Fish marks are echogram artefacts, so they must not outlive the echogram. They used to live in
   * the rAF closure and were only aged inside the DEPTH/FISH branch, so marks spawned before a
   * switch to 360° froze on the scope indefinitely. A ref lets us clear them on every mode/SIM flip.
   */
  const targetsRef = useRef<FishTarget[]>([]);

  // Readouts surfaced to React (~3 Hz from the loop, NOT per frame). Simulation values only.
  const [readout, setReadout] = useState<{ simSeabedM: number; targets: FishTarget[] }>({ simSeabedM: 0, targets: [] });

  useEffect(() => {
    targetsRef.current = [];
    setReadout({ simSeabedM: 0, targets: [] });
  }, [mode, sim]);

  // ── one rAF loop drives the echogram + the 360° scope ──
  useEffect(() => {
    let raf = 0;
    let lastPing = 0;
    let tSim = 0; // sim clock (advances only while active+visible)
    let bottom = 16; // simulated seabed depth (m), random-walks
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
        // Empty by construction. No omni sonar exists on this hull, so this branch draws a graticule
        // — a frame of reference — and NEVER a contact, not even in SIM. The rotating sweep went with
        // the fabricated contacts: an animated sweep is itself a claim that a scanner is turning.
        // The NoFeed overlay carries the words; rings alone would read as a working scope, clear.
        ctx.fillStyle = SCOPE_BG;
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8;
        ctx.strokeStyle = "rgba(34,211,238,0.12)";
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
        return;
      }

      if (!simRef.current) {
        // Live buoy, and the contract has no echosounder field: there is nothing to scroll. Blank the
        // scope and let the STANDBY overlay say why, rather than painting a seabed nobody measured.
        ctx.fillStyle = SCOPE_BG;
        ctx.fillRect(0, 0, w, h);
        return;
      }

      // ── SIMULATED downward echogram (DEPTH / FISH) — demo only, watermarked below ──
      // scroll left by 1px, draw a fresh ping column at the right edge each ~70ms
      const pingDue = now - lastPing > 70;
      try {
        const prev = ctx.getImageData(1, 0, w - 1, h);
        ctx.putImageData(prev, 0, 0);
      } catch { /* detached/0-size — skip a frame */ }

      if (!pingDue) return;
      lastPing = now;
      tSim += 0.07;

      const targets = targetsRef.current;

      // Seabed random-walk, clamped into the range. `pose.depthM` deliberately does NOT feed this:
      // it is the buoy's own submersion depth, and drawing it as the hard-bottom return would
      // present a vehicle scalar as a bathymetric measurement — a different quantity entirely.
      bottom += (Math.sin(tSim * 0.6) * 0.12 + (Math.random() - 0.5) * 0.25);
      bottom = Math.max(2, Math.min(range * 0.96, bottom));
      const bottomDepth = bottom;

      // spawn/age fish marks occasionally
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
        setReadout({ simSeabedM: bottomDepth, targets: targets.map((t) => ({ ...t })) });
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

  // Two different quantities, never blended into one number: the pose scalar is how deep the BUOY is
  // sitting, the sim value is a synthetic seabed. Whichever is on screen gets named as what it is.
  const liveDepthM = telemetry.pose.depthM != null && telemetry.pose.depthM > 0 ? telemetry.pose.depthM : null;
  const simSeabedM = sim && readout.simSeabedM > 0 ? readout.simSeabedM : null;
  const shownDepthM = liveDepthM ?? simSeabedM;
  const depthFt = shownDepthM != null ? shownDepthM * 3.28084 : null;
  const depthLabel = sim ? "Depth · sim" : liveDepthM != null ? "Buoy depth" : "Depth";
  /**
   * ALWAYS rendered — it used to vanish the moment a real pose depth arrived, taking the view's only
   * sim disclosure with it, and a provenance caption that can disappear is not a disclosure.
   *
   * In SIM it reads "simulated" whichever number is showing, because sim.ts emits a pose.depthM too:
   * gating this on the value's origin rather than on `sim` is how the old badge ended up inverted.
   */
  const depthNote = sim
    ? "simulated · no echosounder fitted"
    : liveDepthM != null
      ? "pose sensor · buoy submersion, not a seabed range"
      : "no depth source reporting";

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#03070e]", className)}>
      <ViewBadge>Sonar · {mode === "360" ? "Omni 360°" : mode === "FISH" ? "Fish-finder" : "Depth-sounder"}{sim && " · SIM"}</ViewBadge>

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

      {/* Big depth readout. Anchored at top-12, NOT top-3: ViewBadge owns left-3 top-3 (ui.tsx) and
          this box's bg-black/55 used to paint straight over it, smearing the mode name and the SIM
          marker under a translucent panel. Every other view in this console leaves top-left to the badge. */}
      <div className="pointer-events-none absolute left-3 top-12 z-20 rounded-lg border border-cyan-500/20 bg-black/55 px-3 py-1.5 font-mono tabular-nums">
        <div className="text-[9px] uppercase tracking-[0.15em] text-cyan-400/70">{depthLabel}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-cyan-100">{shownDepthM != null ? shownDepthM.toFixed(1) : "—"}</span>
          <span className="text-[11px] text-slate-400">m</span>
          <span className="ml-1 text-[11px] text-slate-500">{depthFt != null ? `${depthFt.toFixed(0)} ft` : ""}</span>
        </div>
        <div className={cn("text-[8px] uppercase tracking-wide", sim ? "text-amber-400/80" : "text-slate-500")}>{depthNote}</div>
      </div>

      {/* the scope */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ imageRendering: "pixelated" }} />

      {/* Depth axis labels (DEPTH/FISH). top-28 clears the badge + depth readout stacked above; in
          FISH the target list at bottom-8 used to bury the deepest one or two range labels. */}
      {mode !== "360" && (
        <div className={cn("pointer-events-none absolute left-1 top-28 z-10 flex flex-col justify-between font-mono text-[9px] text-cyan-300/45", mode === "FISH" ? "bottom-36" : "bottom-7")}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (<span key={f}>{Math.round(rangeM * f)}m</span>))}
        </div>
      )}

      {/* FISH mode — simulated mark list. Rendered ONLY under `sim`, because outside SIM there is no
          echosounder to detect anything with and the STANDBY overlay below is the honest answer. */}
      {mode === "FISH" && sim && (
        <div className="absolute bottom-8 left-3 z-20 w-44 rounded-lg border border-amber-500/30 bg-black/55 p-2 font-mono text-[10px]">
          <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-cyan-400/70">
            <span className="flex items-center gap-1"><Fish className="h-3 w-3" /> Marks · {readout.targets.length}</span>
            <span className="rounded bg-amber-500/20 px-1 font-bold text-amber-200">Sim</span>
          </div>
          {readout.targets.length === 0 ? (
            <div className="text-[9px] text-slate-500">No marks in column</div>
          ) : (
            // The per-mark confidence percentage is gone with the footer that justified it: a "%"
            // beside a depth and a size reads as detector output, and these marks are Math.random().
            readout.targets.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center justify-between py-0.5 text-slate-300">
                <span className="text-cyan-200">{t.depthM.toFixed(1)}m</span>
                <span>{Math.round(t.sizeCm)}cm</span>
              </div>
            ))
          )}
          {/* Was "Heuristic detector · CNN classify when wired" — which asserts a detector ran over
              these marks. None did, and none exists. */}
          <div className="mt-1 border-t border-white/10 pt-1 text-[8px] uppercase tracking-wide text-amber-400/70">Synthetic marks · no detector wired</div>
        </div>
      )}

      {/* Live buoy, no sonar in the contract. Say that the scope is blank because nothing is fitted —
          a blank scope on an operator console is otherwise read as a swept, clear picture. */}
      {mode !== "360" && !sim && (
        <NoFeed label="No echosounder fitted" sub="the buoy reports no sonar telemetry — a blank scope is not an all-clear" />
      )}

      {/* 360° carries no contacts in any mode. See incident 1 in the file header before adding any. */}
      {mode === "360" && (
        <NoFeed label="No omni sonar fitted" sub="nothing scans this circle — an empty scope is not an all-clear" />
      )}

      {/* Full-width and always on screen while the echogram is synthetic. A 10px corner chip is not a
          disclosure for a full-screen fabricated scope, and this one cannot be occluded or scrolled
          away by the canvas the way an on-canvas watermark would be (the echogram scrolls its own pixels). */}
      {sim && mode !== "360" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 border-t border-amber-500/40 bg-amber-500/15 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200">
          Simulation · synthetic echogram · no echosounder fitted
        </div>
      )}
    </div>
  );
}
