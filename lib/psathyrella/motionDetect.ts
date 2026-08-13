/**
 * motionDetect — model-free motion detection for the Psathyrella camera feeds.
 *
 * WHAT THIS REPORTS, AND WHAT IT REFUSES TO REPORT
 * This module answers exactly one question: "did the pixels in this part of the frame change?"
 * A "mover" here means SOMETHING CHANGED HERE. Nothing more. There is no model, no vocabulary and no
 * notion of identity anywhere in this file — it never emits a class name, a threat level, a track
 * identity, or a confidence-in-a-label, and nothing downstream may present a mover as though it had
 * one. The classifier and the OPERATOR decide what a mover is; this module only guarantees that a
 * moving thing cannot be INVISIBLE merely because no model was trained on it.
 *
 * WHY IT EXISTS
 * The buoy's detector is a closed-vocabulary fine-tune (vessel / person / bird / debris / buoy /
 * swimmer / nav-lights). Anything outside that label set produces no box, and every layer downstream
 * is box-driven — so an unlabelled object is not merely "unclassified", it is ABSENT from the
 * console. An unknown mover is precisely what an operator most needs to see: a periscope, a drifting
 * container, a small craft at range, a spinning object nobody trained on. Motion must therefore be
 * detected INDEPENDENTLY of classification. That is the whole purpose of this file.
 *
 * METHOD
 * Block-based frame differencing on a downsampled luma grid. Deliberately simple and cheap: it runs
 * in the browser over live video, next to a canvas blit loop that is already spending the frame
 * budget. No optical flow, no background model, no per-pixel work at full resolution.
 *
 * MEASURED LIMITS (see LIMITS section at the foot of this file before trusting a negative)
 * A negative from this module is not proof that nothing moved. The block grid, the cell threshold and
 * the camera-motion gate each have a floor, and they are stated in numbers there rather than implied.
 *
 * PURITY
 * No React, no DOM access beyond the ImageData the caller hands in, no clock, no randomness. Given
 * the same inputs this file always produces the same output, so its behaviour can be reasoned about
 * and tested in isolation — which matters, because what it feeds is an operator's picture of what is
 * around the boat.
 */

export interface MotionCell {
  col: number;
  row: number;
  score: number;
}

export interface MotionFrame {
  /** Normalized 0..1 boxes of coherent moving regions, merged from adjacent active cells. */
  movers: Array<{ x: number; y: number; w: number; h: number; score: number; cells: number }>;
  /** Fraction of cells that changed. High => the CAMERA moved, not the scene. */
  changedRatio: number;
  /** True when the whole view shifted (buoy heave/roll/yaw or a stream reconnect) — movers are NOT trustworthy this frame. */
  globalMotion: boolean;
  /**
   * The cells that crossed `cellThreshold`, in raster order, with their post-DC-removal scores.
   * Only active cells are listed — a full grid dump would allocate one object per cell per sample for
   * data that is almost entirely zeros. Under global motion this is most of the grid, which is itself
   * the honest signal that the whole view moved.
   */
  cells: MotionCell[];
}

export interface MotionConfig {
  cols?: number;
  rows?: number;
  cellThreshold?: number;
  globalRatio?: number;
  minCells?: number;
}

export const DEFAULT_MOTION_CONFIG: Required<MotionConfig> = {
  /** 32x18 keeps the 16:9 aspect of the camera surfaces, so a cell is square and a box is not skewed. */
  cols: 32,
  rows: 18,
  /**
   * Absolute change in normalized luma (0..1) for a cell to count as active. ~6% of full scale sits
   * above MJPEG blocking noise and sensor grain on this hardware while still catching a low-contrast
   * grey object against grey sea. Measured headroom: per-pixel sensor noise of +/-16/255 lands at a
   * per-cell difference of at most 0.023 after the block mean — a factor of ~2.6 below this line.
   */
  cellThreshold: 0.06,
  /** Fraction of active cells above which frame-wide change is assumed; see FRAME-WIDE CHANGE below. */
  globalRatio: 0.35,
  /** Minimum active cells in one merged region before it is a mover; see SPATIAL COHERENCE below. */
  minCells: 3,
};

/*
 * Internal constants. Deliberately NOT part of MotionConfig: they are properties of the discriminator
 * itself rather than operator-facing sensitivity, and every one of them is justified by a measured
 * case in the adversarial harness. Exposing them as knobs would invite tuning that silently breaks
 * the separation between "the view moved" and "something in the view moved".
 */

/** Cells of displacement searched when asking whether the CAMERA moved. +/-3 of 32 columns is ~9% of the field of view between samples — more yaw than a moored hull makes at 4 Hz. */
const SHIFT_SEARCH = 3;
/** A displaced comparison must at least halve the undisplaced residual before the change may be blamed on the camera. */
const SHIFT_EXPLAINS = 0.5;
/** Change must span this fraction of BOTH axes before it can be blamed on the camera; a lone object, however large, does not span the frame. */
const DISPERSION_MIN = 0.6;
/** One region must hold this share of all active cells to count as a single contact rather than frame-wide change. */
const DOMINANT_SHARE = 0.7;
/** ...and its swept box must cover no more than this fraction of the frame. Past that, "the view is dominated by change" is the honest reading. */
const CONTACT_BBOX_MAX = 0.6;
/** Boxes bigger than this fraction of the frame must prove they are filled by their own change; see SCATTER below. */
const SCATTER_BBOX_MIN = 0.1;
/** ...by having at least this share of their bounding box actually active. Measured: incoherent speckle fills 0.15-0.28, real objects 0.67-1.00. */
const SCATTER_FILL_MIN = 0.35;

const num = (v: number | undefined, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/**
 * Downsample an ImageData to a luma grid (cols*rows, row-major, values 0..1).
 *
 * Exposed separately so callers can cache the previous grid cheaply: the grid is a few hundred
 * floats, whereas holding the previous full ImageData would cost megabytes per feed and force a
 * second full-resolution copy every sample.
 *
 * Chroma is dropped on purpose. Colour casts from water, haze and auto-white-balance are common on
 * this platform and are not motion; luma alone is both cheaper and less twitchy.
 */
export function lumaGrid(img: ImageData, cols: number, rows: number): Float32Array {
  const c = Math.max(1, Math.floor(cols));
  const r = Math.max(1, Math.floor(rows));
  const out = new Float32Array(c * r);
  const w = img ? img.width : 0;
  const h = img ? img.height : 0;
  const data = img ? img.data : null;
  // Degenerate frame (video element not up yet, element sized 0x0, stream between reconnects): a
  // zero grid differences to zero, i.e. "no motion". The alternative — reading uninitialized or
  // partial pixels — would fire a burst of fake movers exactly when the feed comes back.
  if (!data || w <= 0 || h <= 0) return out;

  for (let ry = 0; ry < r; ry++) {
    const y0 = Math.floor((ry * h) / r);
    // Clamp each block to at least one pixel tall so a grid finer than the frame still produces a
    // value per cell rather than silent zeros that read as "this region never changes".
    const y1 = Math.min(h, Math.max(y0 + 1, Math.floor(((ry + 1) * h) / r)));
    for (let cx = 0; cx < c; cx++) {
      const x0 = Math.floor((cx * w) / c);
      const x1 = Math.min(w, Math.max(x0 + 1, Math.floor(((cx + 1) * w) / c)));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        let p = (y * w + x0) * 4;
        for (let x = x0; x < x1; x++) {
          // Rec.601 luma.
          sum += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
          n += 1;
          p += 4;
        }
      }
      // Normalize to 0..1 so `cellThreshold` is a FRACTION OF FULL SCALE. One threshold then works at
      // any exposure instead of being tuned in raw 0..255 units against one lighting condition.
      out[ry * c + cx] = n > 0 ? sum / (n * 255) : 0;
    }
  }
  return out;
}

/*
 * Scratch buffers for the differencing, dilation and connected-component passes, reused across calls
 * so the hot path does not allocate typed arrays per sample per feed.
 *
 * Safe despite being module state: diffGrids is fully synchronous (no await, no callback into caller
 * code), so two invocations can never interleave on the browser's single thread, and every buffer is
 * fully rewritten or cleared on entry. Output therefore depends only on the arguments — the function
 * stays deterministic.
 */
let scratchSize = 0;
let scratchDiff = new Float32Array(0);
let scratchActive = new Uint8Array(0);
let scratchGrown = new Uint8Array(0);
let scratchLabel = new Uint8Array(0);
let scratchStack = new Int32Array(0);

function ensureScratch(n: number): void {
  if (scratchSize >= n) return;
  scratchSize = n;
  scratchDiff = new Float32Array(n);
  scratchActive = new Uint8Array(n);
  scratchGrown = new Uint8Array(n);
  scratchLabel = new Uint8Array(n);
  scratchStack = new Int32Array(n);
}

function emptyFrame(): MotionFrame {
  // Freshly constructed rather than a shared constant: callers hold onto MotionFrames across renders,
  // and a shared mutable object would let one consumer's edit surface in another's overlay.
  return { movers: [], changedRatio: 0, globalMotion: false, cells: [] };
}

/**
 * Mean absolute difference between `curr` and `prev` displaced by (dx,dy), over a fixed interior
 * margin, with that displacement's own DC term removed.
 *
 * The margin is the same for every displacement so the comparison is fair: cells near the border have
 * no counterpart inside the previous frame when the view moves, and letting each displacement pick its
 * own region would reward large displacements for measuring less of the picture.
 */
function shiftedResidual(
  prev: Float32Array,
  curr: Float32Array,
  c: number,
  r: number,
  dx: number,
  dy: number,
  margin: number,
): number {
  let sum = 0;
  let n = 0;
  for (let y = margin; y < r - margin; y++) {
    for (let x = margin; x < c - margin; x++) {
      sum += curr[y * c + x] - prev[(y - dy) * c + (x - dx)];
      n += 1;
    }
  }
  if (n === 0) return 0;
  const dc = sum / n;
  let acc = 0;
  for (let y = margin; y < r - margin; y++) {
    for (let x = margin; x < c - margin; x++) {
      acc += Math.abs(curr[y * c + x] - prev[(y - dy) * c + (x - dx)] - dc);
    }
  }
  return acc / n;
}

/**
 * Did the CAMERA move? True when the previous picture reappears DISPLACED — i.e. some non-zero shift
 * explains the change far better than no shift at all.
 *
 * This is the only test that actually separates "the view moved" from "something in the view moved",
 * because it is the only one that looks for the previous content rather than guessing from how much
 * of the frame changed. Counting changed cells cannot do it: a moored hull yawing over a part-textured
 * sea changed 27-33% of cells in measurement — under any threshold that a large near object also
 * clears — so a count-only rule must either emit a half-frame phantom box during yaw or go blind to
 * anything big. Cost is ~30k float ops on the coarse grid, at 4 Hz, which is noise next to the blit.
 */
function cameraShifted(
  prev: Float32Array,
  curr: Float32Array,
  c: number,
  r: number,
  cellThreshold: number,
): boolean {
  const margin = SHIFT_SEARCH;
  // Too small to search honestly: with no interior left, every displacement measures a different few
  // cells and "best" becomes meaningless. Fall through to the frame-wide test instead of guessing.
  if (c <= 2 * margin + 2 || r <= 2 * margin + 2) return false;

  const base = shiftedResidual(prev, curr, c, r, 0, 0, margin);
  // Nothing substantial to explain. Without this floor a featureless scene (fog, flat overcast sea)
  // would let any displacement "explain" a residual of near-zero and every real contact on a plain
  // background would be dismissed as camera motion.
  if (base < cellThreshold * 0.5) return false;

  let best = Infinity;
  for (let dy = -margin; dy <= margin; dy++) {
    for (let dx = -margin; dx <= margin; dx++) {
      if (dx === 0 && dy === 0) continue;
      const res = shiftedResidual(prev, curr, c, r, dx, dy, margin);
      if (res < best) best = res;
    }
  }
  return best <= SHIFT_EXPLAINS * base;
}

interface Region {
  count: number;
  scoreSum: number;
  minC: number;
  maxC: number;
  minR: number;
  maxR: number;
}

/**
 * Difference two luma grids and merge coherent change into movers.
 *
 * `cols`/`rows` are the authoritative grid shape (they must match how the grids were built);
 * `cfg.cols`/`cfg.rows` are ignored here — they exist for the caller's grid construction, and
 * silently re-shaping a grid we did not build would scramble every box.
 */
export function diffGrids(
  prev: Float32Array,
  curr: Float32Array,
  cols: number,
  rows: number,
  cfg?: MotionConfig,
): MotionFrame {
  const c = Math.max(1, Math.floor(cols));
  const r = Math.max(1, Math.floor(rows));
  const n = c * r;
  const cellThreshold = num(cfg?.cellThreshold, DEFAULT_MOTION_CONFIG.cellThreshold);
  const globalRatio = num(cfg?.globalRatio, DEFAULT_MOTION_CONFIG.globalRatio);
  const minCells = Math.max(1, Math.floor(num(cfg?.minCells, DEFAULT_MOTION_CONFIG.minCells)));

  // A short/absent grid means the caller has no valid previous frame (first sample, resized grid,
  // stream restart). Report nothing rather than differencing mismatched geometry into fake contacts.
  if (!prev || !curr || prev.length < n || curr.length < n) return emptyFrame();

  ensureScratch(n);

  // Pass 1: signed per-cell difference, and its mean (the DC term).
  let dcSum = 0;
  for (let i = 0; i < n; i++) {
    const d = curr[i] - prev[i];
    scratchDiff[i] = d;
    dcSum += d;
  }
  // EXPOSURE / AGC REJECTION: a marine camera re-exposes constantly — sun off the water, a cloud
  // crossing, an MJPEG gain step. That shifts EVERY cell by the same amount. Subtracting the mean
  // signed difference removes exactly that uniform component, so a brightness step produces zero
  // change instead of lighting up the whole grid and tripping global motion every time the light
  // shifts (which trains an operator to ignore the indicator). It only removes the UNIFORM part:
  // a real pan leaves large positive and negative residuals and still trips the tests below.
  // Measured: uniform steps of +/-0.01 to +/-0.30, and multiplicative gain steps up to +20%, all
  // produce changedRatio exactly 0. A +35% gain clips the sky and does trip frame-wide change —
  // reported as such, with no movers invented.
  // Caveat: a mover that fills much of the frame biases this term — but at that size global change is
  // already the honest answer for the frame.
  const dc = dcSum / n;

  // Pass 2: magnitude after DC removal, and the active mask.
  let activeCount = 0;
  for (let i = 0; i < n; i++) {
    // Each grid cell already holds the MEAN luma of its block, so this is the absolute difference of
    // block means — mean-absolute-difference per cell, on a 0..1 scale.
    const a = Math.abs(scratchDiff[i] - dc);
    scratchDiff[i] = a;
    const on = a >= cellThreshold ? 1 : 0;
    scratchActive[i] = on;
    activeCount += on;
  }

  const changedRatio = activeCount / n;
  const cells: MotionCell[] = [];
  for (let i = 0; i < n; i++) {
    if (scratchActive[i] === 1) cells.push({ col: i % c, row: (i / c) | 0, score: scratchDiff[i] });
  }
  // Nothing crossed the threshold. Say so plainly instead of running discriminators over an empty
  // mask (and dividing by an active count of zero).
  if (activeCount === 0) return { movers: [], changedRatio: 0, globalMotion: false, cells };

  // How far the change spreads across each axis. Frame-wide causes (the hull yawing, a stream
  // reconnect, an AGC step that clips) touch most columns AND most rows. A single object — even one
  // held close enough to fill half the picture — does not, because it is contiguous and bounded.
  let colSpan = 0;
  let rowSpan = 0;
  for (let x = 0; x < c; x++) {
    for (let y = 0; y < r; y++) {
      if (scratchActive[y * c + x] === 1) {
        colSpan += 1;
        break;
      }
    }
  }
  for (let y = 0; y < r; y++) {
    const base = y * c;
    for (let x = 0; x < c; x++) {
      if (scratchActive[base + x] === 1) {
        rowSpan += 1;
        break;
      }
    }
  }
  const dispersed = colSpan / c >= DISPERSION_MIN && rowSpan / r >= DISPERSION_MIN;

  // CAMERA MOTION: the previous picture reappearing displaced. Requiring dispersion first is what
  // keeps a genuine contact safe: on a low-texture sea a lone object translating by one cell IS a
  // one-cell shift of the only thing in the picture, and without the dispersion precondition the
  // shift test would dismiss the single most important detection this module exists to make.
  const shifted = dispersed && cameraShifted(prev, curr, c, r, cellThreshold);

  // SPATIAL COHERENCE: a single isolated hot cell is noise — JPEG blocking, sun sparkle on wavetops,
  // sensor grain, a raindrop on the dome. A real object of any consequence occupies more than one
  // cell and its cells touch. Flood-fill into connected regions and keep only regions of >= minCells
  // ACTIVE cells.
  //
  // The fill runs on the active mask GROWN by one cell (8-connectivity), for a reason that is easy to
  // miss and that made the first version of this file blind to exactly the objects it was written for:
  // a moving opaque object only changes pixels at its LEADING AND TRAILING EDGES. Its interior looks
  // the same in both frames, so it cancels. A 2x2 object stepping one cell right produces two 2-cell
  // slivers with an unchanged column between them — two regions of 2, both below minCells, i.e.
  // NOTHING REPORTED. Growing by one cell bridges that gap so the object surfaces as one region.
  // Membership is grown; the count, the score and the box are measured on the ORIGINAL active cells
  // only, so growing never invents area and never lets an isolated noise cell reach minCells.
  //
  // Growth is EARNED: only a cell that already has an active neighbour reaches out. An edge sliver of
  // a real object is at least two cells tall, so it always qualifies; a lone speckle from sparkle or
  // block noise does not, and therefore cannot reach across a gap to find two more speckles and pass
  // minCells between them. Measured: unconditional growth trebled the false-positive rate at the
  // noise amplitude that sits exactly on cellThreshold (12/40 samples vs 0/40) for no gain on any
  // object case.
  scratchGrown.fill(0, 0, n);
  for (let i = 0; i < n; i++) {
    if (scratchActive[i] !== 1) continue;
    const cc = i % c;
    const rr = (i / c) | 0;
    let hasNeighbour = false;
    for (let dRow = -1; dRow <= 1 && !hasNeighbour; dRow++) {
      const nr = rr + dRow;
      if (nr < 0 || nr >= r) continue;
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        const nc = cc + dCol;
        if (nc < 0 || nc >= c) continue;
        if (scratchActive[nr * c + nc] === 1) {
          hasNeighbour = true;
          break;
        }
      }
    }
    if (!hasNeighbour) {
      // Still a member of the mask (so it is counted and can be seen), just without reach.
      scratchGrown[i] = 1;
      continue;
    }
    for (let dRow = -1; dRow <= 1; dRow++) {
      const nr = rr + dRow;
      if (nr < 0 || nr >= r) continue;
      for (let dCol = -1; dCol <= 1; dCol++) {
        const nc = cc + dCol;
        if (nc < 0 || nc >= c) continue;
        scratchGrown[nr * c + nc] = 1;
      }
    }
  }

  scratchLabel.fill(0, 0, n);
  const regions: Region[] = [];
  let largest = -1;
  for (let seed = 0; seed < n; seed++) {
    if (scratchGrown[seed] !== 1 || scratchLabel[seed] === 1) continue;
    // Explicit stack, not recursion: a large region would otherwise blow the JS stack and take the
    // console down with it. Each cell is labelled at PUSH time, so it is pushed at most once and the
    // stack can never exceed n.
    let sp = 0;
    scratchStack[sp++] = seed;
    scratchLabel[seed] = 1;
    const reg: Region = { count: 0, scoreSum: 0, minC: c, maxC: -1, minR: r, maxR: -1 };
    while (sp > 0) {
      const idx = scratchStack[--sp];
      const cc = idx % c;
      const rr = (idx / c) | 0;
      if (scratchActive[idx] === 1) {
        reg.count += 1;
        reg.scoreSum += scratchDiff[idx];
        if (cc < reg.minC) reg.minC = cc;
        if (cc > reg.maxC) reg.maxC = cc;
        if (rr < reg.minR) reg.minR = rr;
        if (rr > reg.maxR) reg.maxR = rr;
      }
      // 8-connectivity: an object moving diagonally leaves a diagonal trail of active cells, and
      // 4-connectivity would split that one contact into several.
      for (let dRow = -1; dRow <= 1; dRow++) {
        const nr = rr + dRow;
        if (nr < 0 || nr >= r) continue;
        for (let dCol = -1; dCol <= 1; dCol++) {
          if (dRow === 0 && dCol === 0) continue;
          const nc = cc + dCol;
          if (nc < 0 || nc >= c) continue;
          const nIdx = nr * c + nc;
          if (scratchGrown[nIdx] !== 1 || scratchLabel[nIdx] === 1) continue;
          scratchLabel[nIdx] = 1;
          scratchStack[sp++] = nIdx;
        }
      }
    }
    if (reg.count === 0) continue;
    if (largest < 0 || reg.count > regions[largest].count) largest = regions.length;
    regions.push(reg);
  }

  // FRAME-WIDE CHANGE: most of the grid changed and it is NOT one bounded region. A stream reconnect,
  // an AGC step that clips, a yaw too fast for the shift search, or heavy noise all land here. None of
  // it is a contact, and emitting a screenful of boxes ("everything is moving") is worse than emitting
  // nothing: it hides the real contact in noise and invites a maneuver against a phantom.
  //
  // The exemption matters as much as the rule. A large object CLOSE to the lens — the case that
  // started this file, a spinning object held in frame — changes a large fraction of cells too, and a
  // count-only rule swallowed it whole. So a change that is one dominant, bounded region is reported
  // as the mover it is, at any cell count.
  const largestBoxCells =
    largest >= 0
      ? (regions[largest].maxC - regions[largest].minC + 1) * (regions[largest].maxR - regions[largest].minR + 1)
      : 0;
  const dominant =
    largest >= 0 && regions[largest].count >= DOMINANT_SHARE * activeCount && largestBoxCells <= CONTACT_BBOX_MAX * n;
  const frameWide = changedRatio > globalRatio && !dominant;

  // SCATTER: change speckled across the view rather than gathered into a thing. Independent per-cell
  // change percolates — at ~20% of cells active, 8-connected regions link up into ONE region whose box
  // spans the entire frame while being barely a fifth filled. Left alone that is emitted as a single
  // mover covering 100% of the picture: a phantom contact the size of the sea, sitting under the
  // frame-wide cell-count gate the whole time (measured changedRatio 0.24 against a 0.35 gate).
  // A box only earns the name "region" if its own active cells fill it. Measured fills: incoherent
  // speckle 0.15-0.28, a moving 2x2 object 0.67, a large textured object 0.79, an edge sliver 1.00.
  // Small boxes are exempt — a handful of cells has no meaningful fill statistic, and minCells plus
  // the consumer's temporal persistence already govern them.
  const scattered =
    largest >= 0 &&
    largestBoxCells > SCATTER_BBOX_MIN * n &&
    regions[largest].count < SCATTER_FILL_MIN * largestBoxCells;

  if (shifted || frameWide || scattered) {
    // Report the condition, drop the movers, and let the UI say the view moved. `cells` is still
    // returned: the operator is owed the fact that change was seen, even when none of it can honestly
    // be attributed to an object.
    return { movers: [], changedRatio, globalMotion: true, cells };
  }

  const movers: MotionFrame["movers"] = [];
  for (const reg of regions) {
    if (reg.count < minCells) continue;
    // Merge the region into ONE normalized box covering its active cells, inclusive of the last cell.
    movers.push({
      x: reg.minC / c,
      y: reg.minR / r,
      w: (reg.maxC - reg.minC + 1) / c,
      h: (reg.maxR - reg.minR + 1) / r,
      score: reg.scoreSum / reg.count,
      cells: reg.count,
    });
  }

  // Strongest first so a UI that shows only the top few shows the most changed. Ties break on
  // position, keeping the order fully determined by the input rather than by flood-fill order.
  movers.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);

  return { movers, changedRatio, globalMotion: false, cells };
}

/*
 * LIMITS — measured, not estimated. A negative from this module is not proof that nothing moved, and
 * anything built on top of it should be written as though the operator will read these numbers.
 *
 * 1. SIZE FLOOR. A region must reach `minCells` ACTIVE cells (default 3). Because a moving opaque
 *    object only changes its leading and trailing edges, the smallest reliably reported object is
 *    about 2x2 cells of the grid — with the default 32x18 grid, roughly 6% of frame width. A contact
 *    smaller than one cell only shifts that cell's block mean by its own area fraction times its
 *    contrast, so a distant small craft can sit under `cellThreshold` and go unreported. Raising
 *    `cols`/`rows` lowers this floor at a linear cost in work per sample.
 * 2. CONTRAST FLOOR. A cell must change by `cellThreshold` (default 0.06 of full scale). Measured
 *    against per-pixel sensor noise of +/-16/255, which reaches only 0.023 per cell after the block
 *    mean, that is ~2.6x of headroom — but a genuinely low-contrast object against sea of the same
 *    luma is under it and will not be reported.
 * 3. CAMERA MOTION SUPPRESSES CONTACTS. When the shift test fires, movers are dropped for that
 *    sample by design, so a contact is not reported during hull yaw beyond ~1 grid cell between
 *    samples. On a hull that moves often this is a real duty-cycle cost. Motion-COMPENSATED
 *    differencing (differencing against the displaced previous grid) would recover it and is the
 *    obvious next step, but it changes what `globalMotion` means to every consumer, so it is left as
 *    a deliberate decision for the console rather than taken silently here.
 * 4. VERY LARGE OBJECTS. A swept region covering more than 60% of the frame is reported as frame-wide
 *    change rather than as a mover. Below that it is reported as a mover at any size.
 * 5. INCOHERENT NOISE AT THE THRESHOLD. Both frames carry noise, so the quantity being thresholded is
 *    the DIFFERENCE of two noisy frames — about twice the per-frame amplitude. In a narrow band where
 *    that difference lands exactly on `cellThreshold` (measured: 0.04 of full scale per frame, +/-
 *    0.005) chance clusters reach minCells and survive persistence in roughly 40% of samples, with
 *    boxes up to ~10% of the frame. Below the band nothing is emitted; above it the change is
 *    recognized as frame-wide or as scatter and reported as such, with no movers. For scale, the
 *    measured per-cell difference from this sensor path is 0.023 at a generous +/-16/255 of per-pixel
 *    noise — roughly half the band — so it takes visibly degraded imagery to get there. It was left
 *    open deliberately: closing it means raising the contrast floor, and on this console a missed
 *    unknown mover costs more than a small box in a picture the operator can see is degraded.
 * 6. SCATTER SUPPRESSES CONTACTS. When change is speckled across the view (heavy compression churn,
 *    rain on the dome), the frame is reported as global change and NO movers are emitted — including
 *    a genuine contact that happens to share the frame. The picture is degraded and the module says
 *    so rather than picking a favourite.
 */
