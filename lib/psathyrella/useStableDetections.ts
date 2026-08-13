"use client";

/**
 * useStableDetections — hold detection boxes on screen across the gaps between polls.
 *
 * WHAT THIS IS, PRECISELY
 * This is a RENDERING HOLD. It is not tracking, it is not persistence of truth, and it is not a
 * filter. The Jetson currently has NO tracker: detections arrive as an independent JSON snapshot at
 * roughly 1 Hz with no `trackId`, so every poll is a fresh, unrelated list. The overlay redraws from
 * that list, which means a contact the detector happens to miss on one tick disappears and reappears
 * — Morgan's report is literally "objects disappear". A box that blinks at 1 Hz is unreadable, and an
 * unreadable overlay trains the operator to ignore the detector.
 *
 * So: when a detection stops being reported we keep DRAWING it, unchanged, for a short window, and we
 * mark it `stale` with its real `ageMs` so the renderer can dim it. That is the whole contract.
 *
 * WHAT IT DELIBERATELY DOES NOT DO — each of these would be inventing data:
 *  - It never MOVES a held box. No velocity, no extrapolation, no smoothing. Without a tracker we
 *    have no motion estimate; a predicted box is a contact drawn where nothing was ever observed.
 *    A held box is frozen at the last pixels the detector actually reported it on.
 *  - It never renders a stale box identically to a fresh one. `stale` + `ageMs` are mandatory output,
 *    because showing the operator something the detector is NOT currently reporting, with no way to
 *    tell, is worse than the flicker it fixes.
 *  - It never rewrites `id`, `cls`, `conf` or `bbox`. Every StableDetection carries a real
 *    CameraDetection the Jetson emitted verbatim, so nothing downstream can mistake the hold for a
 *    tracker's output. In particular `trackId` stays exactly as the backend sent it (usually null) —
 *    we do not mint one.
 *  - It never merges two contacts. If an object moves far enough between polls that the boxes no
 *    longer overlap, the hold cannot know they are the same object, so both are shown: the old one
 *    stale and dying, the new one fresh. Two honest boxes beat one invented association.
 *
 * MATCHING. Each poll is matched against the held set by IoU (default 0.4) plus the same maritime
 * handling group (`classifyDetection().group`), so a box does not "refresh" off an unrelated contact
 * that happens to sit in the same pixels — a vessel must not inherit a person's box, and vice versa.
 *
 * AGEING. Ages are recomputed on every input change, which at 1 Hz is every poll. Between polls a
 * single timer fires at the next expiry boundary so a held box always vanishes within `holdMs` even
 * if the feed dies completely — that is the case that matters most: when the detector goes away, its
 * last frame must NOT stay frozen on the console pretending to be current.
 *
 * WHAT COUNTS AS "THE DETECTOR REPORTED THIS AGAIN"
 * A React prop arrives on every parent render, not on every detector poll, and the surrounding
 * console re-renders constantly (telemetry, zoom, pan). The sibling overlay is already wired as
 * `detections={contacts.map(...)}` — a NEW array of equal content on every render. If each of those
 * counted as a fresh report, a DEAD detector's last frame would be re-stamped as current forever:
 * boxes pinned at ageMs 0, never stale, never expiring. That is precisely the failure this module
 * exists to prevent, so identity alone cannot be the trigger. An input that is content-identical to
 * the last one we processed is therefore treated as the SAME report (see `sameReport`) and does not
 * refresh anything. Callers should still pass a memoized array — this guard is the safety net, not
 * a licence to rebuild the list every render.
 *
 * The residual cost of that rule: if the backend genuinely re-sends a byte-identical frame, its
 * boxes age and eventually drop instead of staying lit. That is the safe direction — a repeated
 * identical payload IS a stalled pipeline as far as this console can tell, and under-claiming
 * beats asserting currency we cannot support.
 */

import { useEffect, useState } from "react";
import type { CameraDetection } from "@/lib/psathyrella/contract";
import { classifyDetection } from "@/lib/psathyrella/maritimeOntology";

/** A detection as drawn: the detector's own record, plus how old it is and whether it is being held. */
export interface StableDetection extends CameraDetection {
  /** Ms since the DETECTOR last reported this detection. 0 = reported in the current frame. */
  ageMs: number;
  /** True when the detector is no longer reporting it and we are only holding it on screen. */
  stale: boolean;
}

/**
 * Default hold window. ~2.5 s spans two missed polls at the observed 1 Hz cadence — long enough that
 * a single dropped frame is invisible, short enough that a box cannot linger past the point where an
 * operator would reasonably still believe it.
 */
export const DEFAULT_HOLD_MS = 2500;
/** Default IoU to call two boxes the same object. 0.4 tolerates real frame-to-frame drift at 1 Hz. */
export const DEFAULT_MATCH_IOU = 0.4;

/** One detection being held, with the wall-clock time the detector last reported it. */
export interface HeldDetection {
  det: CameraDetection;
  lastSeenMs: number;
}

type Box = CameraDetection["bbox"];

/** Intersection-over-union of two normalized boxes. 0 for degenerate or non-finite input. */
function boxIoU(a: Box, b: Box): number {
  if (!a || !b) return 0;
  if (!(a.w > 0) || !(a.h > 0) || !(b.w > 0) || !(b.h > 0)) return 0;
  if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return 0;
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Advance the held set by one detector frame. Pure — exported so the association and expiry rules can
 * be exercised directly, without a renderer, which is the only way to prove the ageing behaviour.
 *
 * `prev` entries that survive unmatched are returned BY REFERENCE, so a caller can cheaply detect
 * "nothing actually changed" by identity.
 */
export function advanceHeld(
  prev: readonly HeldDetection[],
  incoming: readonly CameraDetection[],
  nowMs: number,
  holdMs: number,
  matchIoU: number,
): HeldDetection[] {
  // 1. Expire: anything the detector has not reported inside the hold window is dropped outright.
  const survivors = prev.filter((h) => nowMs - h.lastSeenMs <= holdMs);

  // Memoized per call — the ontology lookup is cheap but runs O(held x incoming) times below.
  const groupCache = new Map<string, string>();
  const groupOf = (cls: string): string => {
    const hit = groupCache.get(cls);
    if (hit !== undefined) return hit;
    const group = classifyDetection(cls).group;
    groupCache.set(cls, group);
    return group;
  };

  // 2. Score every (held, incoming) pair eligible to be the same physical object.
  const pairs: { heldIdx: number; inIdx: number; iou: number }[] = [];
  for (let heldIdx = 0; heldIdx < survivors.length; heldIdx++) {
    const held = survivors[heldIdx];
    for (let inIdx = 0; inIdx < incoming.length; inIdx++) {
      const next = incoming[inIdx];
      // Different ring tiles are different cameras pointing different ways. On the quad360 composite
      // their normalized boxes can overlap numerically while looking at opposite sides of the buoy, so
      // an IoU match across tiles would refresh a bow contact off an aft one.
      if ((held.det.tile ?? null) !== (next.tile ?? null)) continue;
      // Same handling lane only — a "vessel" box must never be refreshed by a "person_in_water" one.
      if (groupOf(held.det.cls) !== groupOf(next.cls)) continue;
      const iou = boxIoU(held.det.bbox, next.bbox);
      if (iou >= matchIoU) pairs.push({ heldIdx, inIdx, iou });
    }
  }

  // 3. Greedy best-first, strictly one-to-one: the strongest overlap claims its pair first, so a
  //    tight match can never be stolen by a marginal one that happened to be iterated earlier.
  pairs.sort((a, b) => b.iou - a.iou);
  const heldTaken = new Array<boolean>(survivors.length).fill(false);
  const inTaken = new Array<boolean>(incoming.length).fill(false);
  // Start from the previous ORDER so the overlay's box order is stable between polls.
  const next: HeldDetection[] = survivors.slice();
  for (const pair of pairs) {
    if (heldTaken[pair.heldIdx] || inTaken[pair.inIdx]) continue;
    heldTaken[pair.heldIdx] = true;
    inTaken[pair.inIdx] = true;
    // Refreshed: adopt the NEW record wholesale. The held one is discarded rather than blended —
    // the current frame is the truth, and averaging two frames would draw a box on neither.
    next[pair.heldIdx] = { det: incoming[pair.inIdx], lastSeenMs: nowMs };
  }

  // 4. Unmatched incoming detections are genuinely new contacts; they join at the end.
  for (let inIdx = 0; inIdx < incoming.length; inIdx++) {
    if (!inTaken[inIdx]) next.push({ det: incoming[inIdx], lastSeenMs: nowMs });
  }

  // 5. The Jetson's `id` is documented as per-FRAME, so a fresh frame can reuse an id we are still
  //    holding on a stale box elsewhere. Two boxes with one id would collide as React keys and
  //    double-draw one contact, so the stale claimant yields — a live report always outranks a held one.
  const freshIds = new Set<string>();
  for (const entry of next) {
    if (entry.lastSeenMs === nowMs) freshIds.add(entry.det.id);
  }
  return next.filter((entry) => entry.lastSeenMs === nowMs || !freshIds.has(entry.det.id));
}

/** Project the held set into what the overlay draws. Pure; exported alongside `advanceHeld` for tests. */
export function projectHeld(held: readonly HeldDetection[], nowMs: number): StableDetection[] {
  return held.map((entry) => {
    // `stale` is decided by WHETHER THE DETECTOR REPORTED IT at the instant this projection
    // describes, not by the arithmetic of the age. Deriving it from `ageMs > 0` looks equivalent but
    // is not: the age is clamped at 0, so a dropped contact would render as FRESH whenever the wall
    // clock steps backwards (NTP). A held box indistinguishable from a live one is the one output
    // this module must never produce.
    // RESIDUAL, stated rather than papered over: two DIFFERENT reports processed inside the same
    // millisecond share one timestamp, so a contact dropped by the second reads fresh until the next
    // poll. At the observed ~1 Hz cadence that needs two distinct frames 1 ms apart, and it corrects
    // itself on the following poll. Closing it entirely means carrying a "was in the latest frame"
    // flag on HeldDetection, which changes that exported shape — do it if the feed ever bursts.
    const stale = entry.lastSeenMs !== nowMs;
    // Clamped so a backwards clock cannot print a negative age; `stale` above already carries the
    // truth in that case, and the age is a lower bound, never an overstatement of freshness.
    const ageMs = Math.max(0, nowMs - entry.lastSeenMs);
    return { ...entry.det, ageMs, stale };
  });
}

/**
 * Is `next` the same detector report as `prev`, handed to us again?
 *
 * Compares the fields that define a reported detection. Deliberately NOT a tolerance compare: this
 * answers "did the caller hand us the identical payload" (a re-render), and real inference output
 * jitters in the confidence and box floats between genuine frames, so an exact match is the signal.
 */
function sameReport(prev: readonly CameraDetection[], next: readonly CameraDetection[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a === b) continue;
    if (!a || !b) return false;
    if (a.id !== b.id || a.cls !== b.cls || a.conf !== b.conf) return false;
    if ((a.tile ?? null) !== (b.tile ?? null)) return false;
    if ((a.trackId ?? null) !== (b.trackId ?? null)) return false;
    const p = a.bbox;
    const q = b.bbox;
    if (!p || !q) { if (p !== q) return false; continue; }
    if (p.x !== q.x || p.y !== q.y || p.w !== q.w || p.h !== q.h) return false;
  }
  return true;
}

interface Snapshot {
  /** Identity of the input array this snapshot was derived from — the change trigger. */
  src: readonly CameraDetection[] | null;
  holdMs: number;
  matchIoU: number;
  held: HeldDetection[];
  out: StableDetection[];
}

export function useStableDetections(
  detections: CameraDetection[],
  opts?: { holdMs?: number; matchIoU?: number },
): StableDetection[] {
  const holdMs = opts?.holdMs ?? DEFAULT_HOLD_MS;
  const matchIoU = opts?.matchIoU ?? DEFAULT_MATCH_IOU;

  const [snap, setSnap] = useState<Snapshot>(() => {
    const now = Date.now();
    const held = advanceHeld([], detections, now, holdMs, matchIoU);
    return { src: detections, holdMs, matchIoU, held, out: projectHeld(held, now) };
  });

  // Derive during render rather than in an effect: an effect would paint one frame WITHOUT the boxes
  // that just arrived, which is the same flicker this hook exists to remove. This is React's
  // documented "adjust state when a prop changes" path — one setState per input change, and the guard
  // below (src identity) terminates it immediately. No refs are mutated here, so a StrictMode double
  // render recomputes the same thing instead of double-ageing the held set.
  let out = snap.out;
  const settingsChanged = snap.holdMs !== holdMs || snap.matchIoU !== matchIoU;
  if (snap.src !== detections || settingsChanged) {
    // A new array of identical content is a re-render, not a detector report. Fall through without
    // touching the held set — and WITHOUT adopting the new identity, so the next render compares
    // against the last real report rather than against this echo of it. (Adopting it would mean a
    // state update on every parent render; the compare is a few dozen field reads instead.)
    if (settingsChanged || !sameReport(snap.src ?? [], detections)) {
      const now = Date.now();
      const held = advanceHeld(snap.held, detections, now, holdMs, matchIoU);
      out = projectHeld(held, now);
      setSnap({ src: detections, holdMs, matchIoU, held, out });
    }
  }

  useEffect(() => {
    if (snap.held.length === 0) return;
    // One timer, armed for the NEXT box to cross the hold window. Not an interval: a periodic tick
    // would re-render the console for no operator-visible gain, but without this timer a held box
    // would freeze on screen forever the moment the poll stops — the exact failure this must not have.
    let earliestExpiryMs = Infinity;
    for (const entry of snap.held) earliestExpiryMs = Math.min(earliestExpiryMs, entry.lastSeenMs + snap.holdMs);
    const delayMs = Math.max(0, earliestExpiryMs - Date.now()) + 1; // +1ms so we land past the boundary
    const timer = setTimeout(() => {
      const now = Date.now();
      setSnap((prev) => {
        const held = advanceHeld(prev.held, [], now, prev.holdMs, prev.matchIoU);
        // Nothing actually expired (clock skew, a re-armed timer) — return the same object so this
        // does not become a self-feeding render loop.
        if (held.length === prev.held.length && held.every((entry, i) => entry === prev.held[i])) return prev;
        return { ...prev, held, out: projectHeld(held, now) };
      });
    }, delayMs);
    return () => clearTimeout(timer);
  }, [snap]);

  return out;
}
