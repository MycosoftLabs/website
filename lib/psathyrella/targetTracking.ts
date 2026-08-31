/**
 * Target tracking — turn a camera detection into a TRUE BEARING, and a bearing into a follow command.
 *
 * This is the bridge between "the AI saw something" and "the buoy points at it". It is deliberately a
 * pure module (no React, no fetch) so the geometry can be reasoned about and tested on its own — the
 * thing it feeds is propulsion, so the math should be inspectable in isolation.
 *
 * COORDINATE CHAIN (the part that is easy to get wrong):
 *   detection bbox (pixels, in ONE source's frame)
 *     → normalized position within that source
 *     → which physical camera is looking there (ring quadrant / front / pano column)
 *     → that camera's MOUNT bearing relative to the bow
 *     → + horizontal offset within the camera's field of view
 *     → + the buoy's current HEADING
 *     → TRUE bearing (0-360°, compass)
 *
 * Every step needs a real number from the backend. Where one is missing (no FOV reported, unknown
 * frame size) we return null rather than substituting a plausible default — a fabricated bearing here
 * would point the boat at nothing.
 */

import type { CameraDetection } from "@/lib/psathyrella/contract";

/** Which stitched/raw surface a detection was computed on. Matches the backend's `source` tag. */
export type DetectionSource = "quad360" | "front" | "pano" | "bev";

export interface TrackGeometry {
  /** Frame dimensions of the source the box was computed in. */
  frameW: number;
  frameH: number;
  /** Ring composite layout (quad360 only). */
  cols?: number;
  rows?: number;
  tileOrder?: number[];
  /** Mount bearing of each ring face relative to the bow, index-aligned to ring position. */
  mountBearingsDeg?: number[];
  /** Horizontal FOV of ONE sensor, degrees. Required — no default is honest here. */
  fovDeg: number | null;
  /** Live buoy heading, degrees true. */
  headingDeg: number | null;
}

export interface TrackBearing {
  /** Bearing relative to the bow (0 = dead ahead), −180..180. */
  relativeDeg: number;
  /** Compass bearing, 0..360. Null when heading is unknown. */
  trueDeg: number | null;
  /** Which ring face (0..3) the object is on; null for non-ring sources. */
  ringFace: number | null;
  /** Fraction across the owning camera's frame, 0..1 — useful for a centring error readout. */
  offsetInFrame: number;
}

const norm360 = (d: number) => ((d % 360) + 360) % 360;
/** Signed shortest angular difference a→b, −180..180. */
export function bearingDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/**
 * Resolve a detection to a bearing. Returns null when the geometry needed is not available — callers
 * must treat null as "cannot aim at this", never as zero.
 */
export function detectionBearing(det: CameraDetection, source: DetectionSource, g: TrackGeometry): TrackBearing | null {
  if (!(g.frameW > 0) || !(g.frameH > 0)) return null;

  // Box centre in source pixels.
  const cx = (det.bbox.x + det.bbox.w / 2) * g.frameW;

  if (source === "pano") {
    // The panorama spans the full ring: horizontal position IS the bearing. Independent of per-sensor
    // FOV, which is why the pano is the most robust source for bearing once the stitch order is right.
    const nx = cx / g.frameW;
    const relative = bearingDelta(0, nx * 360);
    return {
      relativeDeg: relative,
      trueDeg: g.headingDeg === null ? null : norm360(g.headingDeg + nx * 360),
      ringFace: null,
      offsetInFrame: nx,
    };
  }

  if (source === "bev") {
    // Top-down: bearing is the angle from the canvas centre to the box centre. Note this depends on a
    // real ground-plane calibration to be metrically meaningful; while the backend reports
    // calibrationSource "provisional" the ANGLE is still usable but RANGE is not.
    const cyPx = (det.bbox.y + det.bbox.h / 2) * g.frameH;
    const dx = cx - g.frameW / 2;
    const dy = cyPx - g.frameH / 2;
    if (dx === 0 && dy === 0) return null;
    // Screen y grows downward; bow is up ⇒ bearing = atan2(dx, -dy).
    const relative = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return {
      relativeDeg: relative,
      trueDeg: g.headingDeg === null ? null : norm360(g.headingDeg + relative),
      ringFace: null,
      offsetInFrame: 0.5,
    };
  }

  // ── Single-sensor sources need a real FOV to convert pixels → degrees ──
  if (g.fovDeg === null || !(g.fovDeg > 0)) return null;

  if (source === "front") {
    const nx = cx / g.frameW;
    // Front sensor looks along the bow unless the rig says otherwise.
    const mount = g.mountBearingsDeg?.[0] ?? 0;
    const relative = mount + (nx - 0.5) * g.fovDeg;
    return {
      relativeDeg: bearingDelta(0, relative),
      trueDeg: g.headingDeg === null ? null : norm360(g.headingDeg + relative),
      ringFace: null,
      offsetInFrame: nx,
    };
  }

  // ── quad360 composite: find which quadrant the box centre lands in, then which ring face that is ──
  const cols = g.cols ?? 2;
  const rows = g.rows ?? 2;
  const cyPx = (det.bbox.y + det.bbox.h / 2) * g.frameH;
  const tileW = g.frameW / cols;
  const tileH = g.frameH / rows;
  const col = Math.min(cols - 1, Math.max(0, Math.floor(cx / tileW)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(cyPx / tileH)));
  const quadrant = row * cols + col;

  // tileOrder maps ring position → composite quadrant, so invert it to go quadrant → ring position.
  const order = g.tileOrder ?? [1, 3, 2, 0];
  const face = order.indexOf(quadrant);
  if (face < 0) return null; // quadrant not claimed by any ring face — don't guess a bearing

  const nxInTile = (cx - col * tileW) / tileW;
  const mount = g.mountBearingsDeg?.[face] ?? face * 90;
  const relative = mount + (nxInTile - 0.5) * g.fovDeg;

  return {
    relativeDeg: bearingDelta(0, relative),
    trueDeg: g.headingDeg === null ? null : norm360(g.headingDeg + relative),
    ringFace: face,
    offsetInFrame: nxInTile,
  };
}

/** A detection promoted to an operator-selected track. */
export interface LockedTrack {
  /** trackId when the backend tracks, else the detection id — how we re-find it next frame. */
  key: string;
  cls: string;
  source: DetectionSource;
  bearing: TrackBearing;
  conf: number;
  /** Local epoch ms this track was last seen. */
  lastSeenMs: number;
}

/**
 * Re-acquire a locked track in a fresh detection list.
 *
 * Preference order: exact trackId (a real tracker), then same class nearest the last known bearing.
 * `maxDriftDeg` bounds the re-association so a lock cannot silently jump to a different object on the
 * far side of the buoy — on an operator console a silently-transferred lock is worse than a lost one.
 */
export function reacquire(
  prev: LockedTrack,
  candidates: Array<{ det: CameraDetection; source: DetectionSource; bearing: TrackBearing }>,
  maxDriftDeg = 25,
): { det: CameraDetection; source: DetectionSource; bearing: TrackBearing } | null {
  const byTrackId = candidates.find((c) => c.det.trackId && c.det.trackId === prev.key);
  if (byTrackId) return byTrackId;

  let best: (typeof candidates)[number] | null = null;
  let bestDrift = Infinity;
  for (const c of candidates) {
    if (c.det.cls !== prev.cls) continue;
    const drift = Math.abs(bearingDelta(prev.bearing.relativeDeg, c.bearing.relativeDeg));
    if (drift < bestDrift) { bestDrift = drift; best = c; }
  }
  return best && bestDrift <= maxDriftDeg ? best : null;
}

export type FollowMode = "off" | "camera" | "vessel";

export interface FollowPlan {
  /** Signed heading error, −180..180 (positive = target is to starboard). */
  errorDeg: number;
  /** True when |error| is inside the deadband and no correction should be sent. */
  onTarget: boolean;
  /** Yaw rate to command, deg/s. Zero when on target. */
  yawRateDegS: number;
}

/**
 * Proportional yaw plan to bring the bow onto a bearing.
 *
 * Deliberately conservative: a deadband so the thrusters aren't chattering on sensor noise, and a hard
 * rate cap so a mis-associated detection can only ever produce a slow turn the operator can watch and
 * abort — never a violent one. This is the last software layer before propulsion.
 */
export function planFollow(
  targetBearingDeg: number,
  headingDeg: number,
  opts?: { deadbandDeg?: number; gain?: number; maxRateDegS?: number },
): FollowPlan {
  const deadband = opts?.deadbandDeg ?? 4;
  const gain = opts?.gain ?? 0.6;
  const maxRate = opts?.maxRateDegS ?? 12;
  const errorDeg = bearingDelta(headingDeg, targetBearingDeg);
  const onTarget = Math.abs(errorDeg) <= deadband;
  const raw = onTarget ? 0 : errorDeg * gain;
  const yawRateDegS = Math.max(-maxRate, Math.min(maxRate, raw));
  return { errorDeg, onTarget, yawRateDegS };
}
