"use client";

/**
 * useMotionDetect — samples a live camera surface and reports MOTION, never identity.
 *
 * This hook is the browser-side half of the model-free motion path. It watches an element that is
 * already showing decoded video (the tile <canvas>, or the MJPEG <img>) and reports regions where
 * the picture CHANGED. It carries no model and no vocabulary: a mover is "something changed here",
 * full stop. It must never be surfaced with a class name, a threat, or anything that reads as a
 * classification — the closed-vocabulary detector and the OPERATOR decide what a mover is. The point
 * of this path is only that a moving object cannot be invisible just because nothing was trained on
 * it.
 *
 * COST: sampling happens on a small offscreen canvas (160x90), never on the full-size frame. A
 * full-resolution getImageData every tick forces a GPU->CPU readback and stalls the tile blit loop
 * that is drawing the operator's video; downscaling in the drawImage is done by the compositor and
 * costs almost nothing. Default 4 Hz — motion does not need 20 Hz, and the frame budget is shared.
 *
 * HONESTY UNDER FAILURE: "no movers" and "cannot read the pixels" must not look the same on an
 * operator console. A tainted canvas (a cross-origin stream served without CORS headers) can never be
 * read, so instead of reporting a permanent, confident "all clear" this hook stops and reports
 * enabled=false, letting the UI say motion detection is unavailable.
 */

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_MOTION_CONFIG,
  diffGrids,
  lumaGrid,
  type MotionConfig,
  type MotionFrame,
} from "@/lib/psathyrella/motionDetect";

export interface MotionState {
  movers: MotionFrame["movers"];
  globalMotion: boolean;
  changedRatio: number;
  enabled: boolean;
  sampledAtMs: number | null;
}

/**
 * Offscreen sample size. 160x90 keeps 16:9 and still gives ~5x5 source pixels per cell at the default
 * 32x18 grid — enough for a block mean to be stable, small enough that the readback is negligible.
 */
const SAMPLE_W = 160;
const SAMPLE_H = 90;

/** Shared empty list so a quiet scene does not allocate (and does not churn consumer memoization). */
const NO_MOVERS: MotionFrame["movers"] = [];

type Mover = MotionFrame["movers"][number];

interface Candidate extends Mover {
  /** Consecutive samples this region has been seen in. */
  hits: number;
}

interface InternalState {
  movers: MotionFrame["movers"];
  globalMotion: boolean;
  changedRatio: number;
  sampledAtMs: number | null;
  /** Latched when the pixels are unreadable (tainted canvas) — surfaced as enabled=false. */
  blocked: boolean;
}

const INITIAL: InternalState = {
  movers: NO_MOVERS,
  globalMotion: false,
  changedRatio: 0,
  sampledAtMs: null,
  blocked: false,
};

/** Frame dimensions of whichever element kind we were handed; 0 when it has nothing to draw yet. */
function frameSize(el: HTMLCanvasElement | HTMLImageElement): { w: number; h: number } {
  // Duck-typed rather than instanceof: this module is imported under SSR where HTMLImageElement is
  // not defined, and an instanceof against an undefined global throws.
  if ("naturalWidth" in el) {
    const img = el as HTMLImageElement;
    // An <img> mid-load draws as nothing; treat it as no frame rather than differencing blank pixels.
    if (!img.complete) return { w: 0, h: 0 };
    return { w: img.naturalWidth || 0, h: img.naturalHeight || 0 };
  }
  return { w: el.width || 0, h: el.height || 0 };
}

/** A tainted-canvas read. Permanent for that source, so it is worth latching rather than retrying. */
function isSecurityError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "SecurityError";
}

/** Travel allowed between samples before two regions are no longer "the same thing", in grid cells. */
const MATCH_SLACK_CELLS = 2;
/** How much a region may grow or shrink between samples and still be the same thing. */
const MATCH_SIZE_RATIO = 4;

/**
 * "Still the same region" for temporal matching: the boxes must OVERLAP, allowing two grid cells of
 * travel, and must be of comparable size.
 *
 * Requiring overlap rather than centre proximity is what makes the persistence filter actually filter.
 * A centre-distance rule with a fixed floor accepts any region that lands anywhere within a couple of
 * cells, so incoherent change — which throws up chance clusters in different places every sample —
 * keeps finding *a* partner and grows a streak it never earned. Measured on this harness: with the
 * centre-distance rule, per-cell noise sitting on the threshold was reported as a mover in 23 of 25
 * samples; requiring overlap drops that while leaving real contacts untouched.
 *
 * Two cells of slack is well beyond real contact motion at 4 Hz: a 20 kt craft at 500 m crosses about
 * 0.15 cells per sample at the default grid, and even a 10 m/s object at 50 m crosses about 1.5.
 */
function near(a: Mover, b: Mover, slackX: number, slackY: number): boolean {
  const overlapX = a.x - slackX <= b.x + b.w && b.x - slackX <= a.x + a.w;
  const overlapY = a.y - slackY <= b.y + b.h && b.y - slackY <= a.y + a.h;
  if (!overlapX || !overlapY) return false;
  const ca = Math.max(1, a.cells);
  const cb = Math.max(1, b.cells);
  return Math.max(ca, cb) <= MATCH_SIZE_RATIO * Math.min(ca, cb);
}

function centreDist(a: Mover, b: Mover): number {
  const dx = a.x + a.w / 2 - (b.x + b.w / 2);
  const dy = a.y + a.h / 2 - (b.y + b.h / 2);
  return Math.hypot(dx, dy);
}

export function useMotionDetect(
  getFrame: () => HTMLCanvasElement | HTMLImageElement | null,
  opts?: { enabled?: boolean; hz?: number; cfg?: MotionConfig; persistFrames?: number },
): MotionState {
  const enabled = opts?.enabled !== false;
  const [state, setState] = useState<InternalState>(INITIAL);

  // The caller almost always passes an inline arrow and an inline cfg object. Holding the getter in a
  // ref and depending on PRIMITIVES below keeps a parent re-render from tearing down and restarting
  // the sampling loop (which would reset every persistence streak and hide movers indefinitely).
  const getFrameRef = useRef(getFrame);
  getFrameRef.current = getFrame;

  const cols = Math.max(2, Math.floor(opts?.cfg?.cols ?? DEFAULT_MOTION_CONFIG.cols));
  const rows = Math.max(2, Math.floor(opts?.cfg?.rows ?? DEFAULT_MOTION_CONFIG.rows));
  const cellThreshold = opts?.cfg?.cellThreshold ?? DEFAULT_MOTION_CONFIG.cellThreshold;
  const globalRatio = opts?.cfg?.globalRatio ?? DEFAULT_MOTION_CONFIG.globalRatio;
  const minCells = opts?.cfg?.minCells ?? DEFAULT_MOTION_CONFIG.minCells;
  // Clamped: below 0.5 Hz motion arrives too late to act on, above 15 Hz we are competing with the
  // video blit for the same main thread.
  const periodMs = Math.round(1000 / Math.min(15, Math.max(0.5, opts?.hz ?? 4)));
  const persistFrames = Math.max(1, Math.floor(opts?.persistFrames ?? 3));

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    // A previous element may have been unreadable; a re-enable or a new source deserves a fresh try.
    // Returning the same object when nothing is latched makes React bail out, so this costs no render.
    setState((s) => (s.blocked ? { ...s, blocked: false } : s));

    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let prevGrid: Float32Array | null = null;
    let candidates: Candidate[] = [];
    // Mirrors how many movers are currently in state, so the "clear once" below never has to read
    // state from inside this closure.
    let showing = 0;
    const cfg: MotionConfig = { cellThreshold, globalRatio, minCells };
    // Match slack in normalized units, derived from the grid actually in use.
    const slackX = MATCH_SLACK_CELLS / cols;
    const slackY = MATCH_SLACK_CELLS / rows;

    const resetTracking = () => {
      // Drop the reference frame too: differencing across a gap (hidden tab, stream restart) compares
      // two unrelated pictures and would burst fake movers the moment sampling resumes.
      prevGrid = null;
      candidates = [];
    };

    const clearIfShowing = () => {
      if (showing === 0) return;
      showing = 0;
      // Not a sample, so this does not violate the one-setState-per-sample budget; it fires at most
      // once per interruption and stops stale boxes sitting over live video.
      setState((s) => (s.movers.length === 0 && !s.globalMotion ? s : { ...s, movers: NO_MOVERS, globalMotion: false }));
    };

    const schedule = () => {
      if (!stop) timer = setTimeout(tick, periodMs);
    };

    function tick(): void {
      if (stop) return;
      try {
        // Nobody is looking: stop burning main-thread time behind a hidden tab.
        if (document.hidden) {
          resetTracking();
          clearIfShowing();
          schedule();
          return;
        }

        const el = getFrameRef.current ? getFrameRef.current() : null;
        const size = el ? frameSize(el) : null;
        // No element, not loaded yet, or zero-size: skip the sample entirely. Never throw.
        if (!el || !size || size.w <= 0 || size.h <= 0) {
          resetTracking();
          clearIfShowing();
          schedule();
          return;
        }

        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.width = SAMPLE_W;
          canvas.height = SAMPLE_H;
          // willReadFrequently keeps the surface CPU-side; without it every getImageData is a GPU
          // readback stall right next to the video blit.
          ctx = canvas.getContext("2d", { willReadFrequently: true });
        }
        if (!ctx) {
          // No 2D context means these pixels can never be sampled, for the same reason a tainted
          // canvas cannot: it is a permanent property of this surface, not a dropped frame. Looping
          // on it would emit an endless, confident "no movers" that an operator reads as all-clear.
          stop = true;
          showing = 0;
          setState((s) => ({ ...s, movers: NO_MOVERS, globalMotion: false, blocked: true }));
          return;
        }

        ctx.drawImage(el, 0, 0, SAMPLE_W, SAMPLE_H);
        const img = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
        const grid = lumaGrid(img, cols, rows);

        // First good sample only establishes the reference — there is nothing to difference yet.
        if (!prevGrid) {
          prevGrid = grid;
          schedule();
          return;
        }

        const frame = diffGrids(prevGrid, grid, cols, rows, cfg);
        prevGrid = grid;

        // TEMPORAL PERSISTENCE: require the same region in >= persistFrames CONSECUTIVE samples.
        // Water sparkle, JPEG shimmer and a single dropped frame are not persistent; a real object —
        // a spinning one included — is. The trade is latency for trust: at 4 Hz and persistFrames=3 a
        // new contact surfaces ~0.75 s late. On this console that is the right side of the trade —
        // boxes that blink on and off over open water teach an operator to disbelieve the overlay,
        // and a disbelieved overlay is worth less than none. Lower persistFrames if reaction time
        // matters more than false positives for a given surface.
        const raw = frame.movers;
        const used = new Array<boolean>(raw.length).fill(false);
        const next: Candidate[] = [];
        for (const cand of candidates) {
          let best = -1;
          let bestD = Infinity;
          for (let i = 0; i < raw.length; i++) {
            if (used[i]) continue;
            const d = centreDist(cand, raw[i]);
            if (d < bestD && near(cand, raw[i], slackX, slackY)) {
              bestD = d;
              best = i;
            }
          }
          // Unmatched candidates are DROPPED, not decayed: the requirement is consecutive sightings,
          // and a decaying counter would let intermittent sparkle accumulate into a reported mover.
          // Under globalMotion frame.movers is empty by design, so a heave resets every streak — the
          // picture that follows a hull movement has to earn its contacts again.
          if (best < 0) continue;
          used[best] = true;
          const m = raw[best];
          next.push({ ...m, hits: Math.min(cand.hits + 1, 255) });
        }
        for (let i = 0; i < raw.length; i++) {
          if (!used[i]) next.push({ ...raw[i], hits: 1 });
        }
        candidates = next;

        const reported: MotionFrame["movers"] = [];
        for (const cand of next) {
          if (cand.hits < persistFrames) continue;
          reported.push({ x: cand.x, y: cand.y, w: cand.w, h: cand.h, score: cand.score, cells: cand.cells });
        }

        showing = reported.length;
        // Exactly ONE setState per sample.
        setState({
          movers: reported.length > 0 ? reported : NO_MOVERS,
          globalMotion: frame.globalMotion,
          changedRatio: frame.changedRatio,
          sampledAtMs: Date.now(),
          blocked: false,
        });
        schedule();
      } catch (err) {
        if (isSecurityError(err)) {
          // Tainted canvas: these pixels are unreadable for good. Stop sampling and say so, rather
          // than emitting a permanent "no movers" that an operator would read as "all clear".
          stop = true;
          setState((s) => ({ ...s, movers: NO_MOVERS, globalMotion: false, blocked: true }));
          return;
        }
        // Anything else (element detached mid-draw, decode error, transient context loss) is treated
        // as a lost sample. Never take the console down over a video frame.
        resetTracking();
        schedule();
      }
    }

    tick();

    return () => {
      stop = true;
      if (timer !== null) clearTimeout(timer);
      canvas = null;
      ctx = null;
      prevGrid = null;
      candidates = [];
    };
  }, [enabled, periodMs, persistFrames, cols, rows, cellThreshold, globalRatio, minCells]);

  return {
    movers: state.movers,
    globalMotion: state.globalMotion,
    changedRatio: state.changedRatio,
    enabled: enabled && !state.blocked,
    sampledAtMs: state.sampledAtMs,
  };
}
