/**
 * designate — turn "the operator touched here" into "that object".
 *
 * Tap-to-designate is how a pilot hands a contact to the console without a mouse and without hunting
 * through a list: touch the thing on the video, get the detection that is there. That makes this file
 * a targeting input, so the standard it is held to is different from a normal hit-test — a tap that
 * resolves to the WRONG box designates the wrong target, and the operator has no way to notice,
 * because the box they meant is right next to the box they got.
 *
 * Two responsibilities, both pure (no React, no DOM, no fetch, deterministic):
 *
 *  1. `pointFromEvent` — invert the render transform, exactly. The rendered pixel the finger landed on
 *     has to be turned back into the SOURCE-frame coordinate the detector was working in. Every step
 *     of the forward transform must be undone in reverse order and with the same constants that
 *     DetectionOverlay uses to draw; if the two ever disagree, the boxes the operator sees and the
 *     boxes this module tests against are in different coordinate systems.
 *
 *  2. `designateAt` — pick the object at that coordinate, preferring the tightest box that actually
 *     contains the point, and refusing to designate anything when the tap is not near a detection.
 *     Returning "nothing" is a valid, useful answer; returning a plausible-looking wrong contact is not.
 *
 * THE FORWARD TRANSFORM (TargetView, mirrored by DetectionOverlay.placeDetections):
 *   a wrapper div fills the element and carries `transform: scale(zoom)` with
 *   `transformOrigin: ${50 + panX*45}% ${50 + panY*45}%`; inside it an <img class="h-full w-full
 *   object-contain"> letterboxes the source frame. So source px → element px is:
 *      fit:   p = a + srcPx * k,  k = min(view/src) for contain, max(view/src) for cover
 *      zoom:  e = p * z + origin * (1 - z)
 *   and this file walks that backwards.
 *
 * CALLER CONTRACT — `rect` MUST be the UNTRANSFORMED container's box (the element the overlay covers,
 * i.e. the same box DetectionOverlay measures), NOT the transformed wrapper's. `getBoundingClientRect()`
 * on the scaled/rotated element returns its POST-transform box, and feeding that in here would undo
 * the zoom twice and silently shift every tap. In TargetView's DOM that means the `relative` flex
 * container that holds both the transformed <div> and the overlay — never the transformed <div>.
 *
 * KNOWN LIMIT — ROTATION. TargetView can also apply `rotate(rotateDeg)` in the same transform. This
 * signature carries no rotation term, so the mapping below is only correct at 0°. Measured against a
 * real engine (Chrome 148) at zoom 2: a contact at source (0.700, 0.300) renders at rot=180 where
 * this function reports (0.300, 0.700) — the point-symmetric object, i.e. a confident designation of
 * the wrong contact. So the caller must gate designate off whenever `rotateDeg !== 0`.
 * Do NOT "fix" this by inverting rotation here alone: DetectionOverlay's placement math has no
 * rotation term either, so today the drawn boxes are rotated out of register with the video by the
 * same amount. While both ignore rotation they stay mutually consistent, and tapping a DRAWN BOX
 * still returns that box. Un-rotating only this side would break that agreement and make box taps
 * wrong too. Rotation support belongs in both files, in one change, or in neither.
 */

import type { CameraDetection } from "@/lib/psathyrella/contract";
import { classifyDetection } from "@/lib/psathyrella/maritimeOntology";

/** A point on the video in normalized 0..1 SOURCE-frame space — the same space `bbox` lives in. */
export interface DesignatePoint {
  x: number;
  y: number;
}

export interface DesignateResult {
  detection: CameraDetection | null;
  /** Always populated, always operator-facing: why this contact (or why none). */
  reason: string;
}

/**
 * Default pick radius when the tap misses every box, in normalized frame units — ~8% of the frame.
 * Small enough that it cannot reach across the frame and grab an unrelated contact, large enough to
 * forgive a fingertip on a small distant box.
 */
export const DEFAULT_MAX_DISTANCE = 0.08;

/** The one string the operator sees when nothing was designated. Kept verbatim and shared. */
const NO_DETECTION_REASON = "no detection at that point";

/**
 * Map a click/touch in RENDERED element coords to normalized SOURCE-frame coords.
 *
 * Returns null when the point is not on the image at all — most commonly the letterbox bars of an
 * object-contain fit, which are element pixels that show no source pixel. Null is a real answer
 * ("you tapped the black bar"), never a clamped guess at the nearest edge.
 */
export function pointFromEvent(
  rect: { width: number; height: number },
  clientX: number,
  clientY: number,
  elementLeft: number,
  elementTop: number,
  fit: "cover" | "contain",
  srcW: number,
  srcH: number,
  zoom?: number,
  panX?: number,
  panY?: number,
): DesignatePoint | null {
  const viewW = rect?.width ?? 0;
  const viewH = rect?.height ?? 0;
  // An unmeasured element or an un-reported frame size means we do not know the mapping. Refuse.
  if (!(viewW > 0) || !(viewH > 0)) return null;
  if (!(srcW > 0) || !(srcH > 0)) return null;
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  if (!Number.isFinite(elementLeft) || !Number.isFinite(elementTop)) return null;

  const z = zoom ?? 1;
  if (!Number.isFinite(z) || z <= 0) return null;
  const px = clientX - elementLeft;
  const py = clientY - elementTop;

  // ── Undo the CSS scale about its transformOrigin ──
  // Forward: e = p*z + o*(1 - z). Inverse: p = (e - o)/z + o.
  // The 45 is not arbitrary: TargetView's origin is `${50 + pan*45}%`, i.e. pan ±1 walks the origin to
  // 5%/95% rather than the edges, so a fully panned view still keeps image on both sides.
  const originX = ((50 + (panX ?? 0) * 45) / 100) * viewW;
  const originY = ((50 + (panY ?? 0) * 45) / 100) * viewH;
  const unzoomedX = (px - originX) / z + originX;
  const unzoomedY = (py - originY) / z + originY;

  // ── Undo the object-fit ──
  // contain letterboxes (k = min → bars), cover centre-crops (k = max → overflow). Both centre the
  // image, so the offset is half the leftover in each axis — matching `object-fit`'s default position.
  const k = fit === "contain" ? Math.min(viewW / srcW, viewH / srcH) : Math.max(viewW / srcW, viewH / srcH);
  if (!(k > 0) || !Number.isFinite(k)) return null;
  const drawnW = srcW * k;
  const drawnH = srcH * k;
  const offsetX = (viewW - drawnW) / 2;
  const offsetY = (viewH - drawnH) / 2;

  const nx = (unzoomedX - offsetX) / drawnW;
  const ny = (unzoomedY - offsetY) / drawnH;
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
  // Outside the image: letterbox bar (contain), or pushed off the source by a zoom-out (cover).
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;

  return { x: nx, y: ny };
}

/**
 * Choose the detection under a point.
 *
 * Rule 1 — smallest CONTAINING box wins. A small contact inside a large one (a person on a vessel, a
 * float against a breakwater) is the thing the operator was aiming at; the big box is the thing they
 * would have hit by accident. Area, not distance, decides this, because a large box's centre can be
 * closer to the tap than the small box the finger is actually inside.
 *
 * Rule 2 — otherwise the nearest box centre, but only within `maxDistance`. Beyond that we designate
 * nothing. A bounded miss is recoverable; a silently reassigned target is not.
 */
export function designateAt(
  point: DesignatePoint,
  detections: CameraDetection[],
  opts?: { maxDistance?: number },
): DesignateResult {
  const maxDistance = opts?.maxDistance ?? DEFAULT_MAX_DISTANCE;

  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return { detection: null, reason: "tap could not be mapped onto the image" };
  }
  if (!detections || detections.length === 0) {
    return { detection: null, reason: NO_DETECTION_REASON };
  }

  let contained: CameraDetection | null = null;
  let containedArea = Infinity;
  let nearest: CameraDetection | null = null;
  let nearestDistance = Infinity;

  for (const det of detections) {
    const box = det?.bbox;
    if (!box) continue;
    // Degenerate or malformed boxes are skipped rather than repaired — a zero-area box is not a thing
    // an operator can designate, and inventing an extent for it would be inventing the contact.
    if (!(box.w > 0) || !(box.h > 0)) continue;
    if (!Number.isFinite(box.x) || !Number.isFinite(box.y)) continue;

    const inside =
      point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;
    if (inside) {
      const area = box.w * box.h;
      // Strict `<` keeps ties deterministic: with equal areas the FIRST detection in the list wins, so
      // the same tap on the same frame always designates the same contact.
      if (area < containedArea) {
        containedArea = area;
        contained = det;
      }
      continue;
    }

    const centreX = box.x + box.w / 2;
    const centreY = box.y + box.h / 2;
    // Euclidean in NORMALIZED space, so on a 16:9 frame a vertical unit is physically shorter than a
    // horizontal one. That is deliberate: `maxDistance` is a fraction-of-frame budget, and matching the
    // space `bbox` is expressed in keeps this comparable to the boxes it is measuring against.
    const distance = Math.hypot(point.x - centreX, point.y - centreY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = det;
    }
  }

  if (contained) {
    return {
      detection: contained,
      reason: `designated ${operatorLabel(contained)} — tap was inside its box`,
    };
  }
  if (nearest && nearestDistance <= maxDistance) {
    return {
      detection: nearest,
      reason: `designated ${operatorLabel(nearest)} — nothing directly under the tap; nearest box centre ${nearestDistance.toFixed(3)} of a frame away`,
    };
  }
  return { detection: null, reason: NO_DETECTION_REASON };
}

/**
 * Operator-facing name for a detection.
 *
 * Routed through the maritime ontology on purpose: this string goes on the console next to a
 * designated target, and the raw detector class is COCO, so it can read "TOILET" or "COUCH". The
 * ontology demotes those to "Unclassified contact" instead of printing nonsense beside a target.
 */
function operatorLabel(det: CameraDetection): string {
  const label = classifyDetection(det.cls).displayLabel;
  const conf = Number.isFinite(det.conf) ? Math.max(0, Math.min(1, det.conf)) : null;
  return conf === null ? label : `${label} (conf ${conf.toFixed(2)})`;
}
