/**
 * fusionFrame — project EVERY sensor onto ONE buoy-centric polar frame, then associate by bearing.
 *
 * This is the engine behind BlueSight's FUSION mode. Morgan's definition of the feature is the spec:
 * "BlueSight is a fusion of radar, lidar, Wi-Fi sense, and camera that an AI can see. It's not just
 * widgets showing each one individually." Four separate scopes are four separate pictures; this module
 * makes one picture, in one frame of reference, so a camera identity and a radar range can be the same
 * object instead of two unrelated marks on two unrelated canvases.
 *
 * ══ THE RULE THAT DEFINES THIS MODULE ═════════════════════════════════════════════════════════════
 * Every sensor projects into ONE polar frame: BEARING × RANGE, bow-up, own-heading applied so the
 * true bearing is a compass bearing. What each sensor may contribute to that frame is fixed by what it
 * physically measures:
 *
 *   radar   → bearing + range   (native; the reference sensor)
 *   lidar   → bearing + range   (native)
 *   tof     → bearing (fixed mount face) + precise short range (VL53L1X ring / TF-Luna slots)
 *   rangefinder → bearing (fixed mount / boresight) + measured range (CORVON CV50 under-camera)
 *   mmwave  → bearing + range, both measured (LD2450 cartesian x/y). ~6 m, movement only — it
 *             resolves motion, never identity, and it is **not radar**
 *   camera  → bearing DERIVED from pixels — **NO RANGE, EVER**
 *   wifi    → bearing ONLY if the backend measured an angle of arrival (it has no AoA hardware
 *             today, so in practice: nothing) — **RANGE NEVER**
 *   motion  → bearing only, from the same camera geometry — no range, no identity
 *
 * A camera contact therefore carries `rangeM: null` and a `wedgeHalfDeg`, and a renderer must draw it
 * as a bearing WEDGE running to the edge of the plot, explicitly marked range-unknown. It must NEVER
 * become a dot at a guessed radius. Plotting an invented range on a tactical display is precisely the
 * fabrication class that was deleted from BlueSightView (it used to synthesize "detection" boxes from
 * a contact's bearing and array index, with size and "confidence" from signal strength). Range on this
 * display is always attributed to the sensor that measured it — never averaged with a bearing-only
 * contact, never estimated, never carried over from a previous frame.
 *
 * ══ INVARIANT THE RENDERER RELIES ON ══════════════════════════════════════════════════════════════
 * `rangeM === null` ⟺ the contact came from a bearing-only sensor. A radar/lidar/tof/mmwave return with no
 * usable range is DROPPED during projection rather than emitted with a null range, so the two
 * conditions really are equivalent for anything this module builds. Renderers should still branch on
 * `plottableRangeM(c)` rather than on `rangeM` directly: it additionally requires the sensor to be one
 * that MEASURES range, so the dot-vs-wedge decision stays correct even for a contact this module did
 * not build. `wedgeHalfDeg` may also be null on a bearing-only contact — that means the angular WIDTH
 * is unknown (draw a hairline ray), not that the contact has a range.
 *
 * ══ HEADING ═══════════════════════════════════════════════════════════════════════════════════════
 * `FusionInput.headingDeg` is the SINGLE authority for the frame. `TrackGeometry.headingDeg` is
 * ignored for the true bearing even though `detectionBearing` computes one from it — two heading
 * sources for one instant can put two sensors' views of the same object on two different compass
 * bearings, which is exactly the error this module exists to prevent. `bearingTrueDeg = heading +
 * bearingRelDeg` (mod 360), and it is null whenever the heading is unknown.
 *
 * Pure module: no React, no fetch, no clock, no side effects, deterministic.
 */

import type { CameraDetection, ContactKind, SensorContact } from "@/lib/psathyrella/contract";
import { classifyDetection } from "@/lib/psathyrella/maritimeOntology";
import {
  bearingDelta,
  detectionBearing,
  type DetectionSource,
  type TrackGeometry,
} from "@/lib/psathyrella/targetTracking";

export type FusionSensor = "radar" | "lidar" | "tof" | "rangefinder" | "mmwave" | "camera" | "wifi" | "motion";

/**
 * The sensors that physically MEASURE range. Exported because it is the rule, not an implementation
 * detail: a range may only ever be attributed to — or drawn for — a member of this set.
 *
 * `projectToFusion` already guarantees a camera/wifi/motion contact carries `rangeM: null`, but that
 * only protects contacts this module built. Checking membership here as well means the rule survives
 * a caller that assembles `FusionContact`s some other way, and a sensor added to `FusionSensor` and
 * forgotten here fails SAFE: it renders as a bearing, never as an invented position.
 */
export const RANGE_MEASURING: ReadonlySet<FusionSensor> = new Set<FusionSensor>([
  "radar",
  "lidar",
  "tof",
  "rangefinder",
  "mmwave",
]);

/**
 * The range a contact may legitimately be PLOTTED at: its own measurement, and only if its sensor is
 * one that measures range. Null means "bearing only" — draw a wedge, never a dot at a radius.
 */
export function plottableRangeM(c: Pick<FusionContact, "sensor" | "rangeM">): number | null {
  return c.rangeM !== null && RANGE_MEASURING.has(c.sensor) ? c.rangeM : null;
}

export interface FusionContact {
  id: string;
  sensor: FusionSensor;
  label: string;
  group: string;
  bearingTrueDeg: number | null;
  bearingRelDeg: number;
  /** null when the sensor cannot measure range. NEVER invent one. */
  rangeM: number | null;
  /** angular half-width for bearing-only contacts, degrees. */
  wedgeHalfDeg: number | null;
  conf: number | null;
  strength: number | null;
  raw?: unknown;
}

export interface FusedTrack {
  id: string;
  bearingTrueDeg: number | null;
  bearingRelDeg: number;
  /** Range attributed ONLY to sensors that measure it; null if none did. */
  rangeM: number | null;
  rangeFromSensor: FusionSensor | null;
  sensors: FusionSensor[];
  label: string;
  group: string;
  corroborated: boolean;
  members: FusionContact[];
  assessment: string;
}

/**
 * One fixed-mount time-of-flight face (VL53L1X ring face, or a TF-Luna slot).
 *
 * `rangeM: null` is the honest reading of a face whose hardware is absent or that got no return. Such
 * a face is NOT a contact and is dropped — a dot drawn for it would invent an obstacle on a bearing
 * the buoy permanently points at.
 */
export interface TofFaceInput {
  id: string;
  /** Fixed mount bearing of the face relative to the bow. */
  bearingRelDeg: number;
  rangeM: number | null;
  label?: string | null;
  /** Backend status verbatim (e.g. "hardware_absent"), for the caller's legend — not interpreted here. */
  status?: string | null;
  /** 0..1 return quality when the backend reports one. */
  quality?: number | null;
}

/**
 * One target slot from the HLK-LD2450 24 GHz mmWave module (`/mmwave`).
 *
 * It reports a cartesian x/y in millimetres per slot, from which the backend derives bearing and
 * range — so unlike the camera this genuinely MEASURES both, and unlike the ToF ring its bearing is
 * not fixed by the mount. That is why it gets its own sensor lane rather than riding on `tof`.
 *
 * ⚠ It is NOT radar, and must never be labelled as such. It is a ~6 m human-movement sensor; an
 * operator who reads "radar: no contacts" as clear water has been misled by the label, not the data.
 *
 * An empty slot arrives as `valid: false` with nulls. Such a slot is NOT a contact and is dropped —
 * `xMm/yMm` of 0/0 means "slot empty", and plotting it would put a permanent contact on the bow.
 */
export interface MmwaveTargetInput {
  id: string;
  /** Backend-derived bearing relative to the bow. Null ⇒ no solution, slot dropped. */
  bearingRelDeg: number | null;
  rangeM: number | null;
  /** Closing/opening speed in cm/s, sign-magnitude decoded upstream. Carried for the caller's readout. */
  speedCmS?: number | null;
  valid?: boolean | null;
  label?: string | null;
}

/**
 * One CORVON CV50 (or peer) under-camera / boresight single-point rangefinder reading.
 *
 * Own provenance lane — NOT `"tof"`. The VL53L1X ring is a ~4 m face array behind an I²C mux; the CV50
 * is a <2° pencil beam to 50 m co-mounted with the camera. Folding them into one `FusionSensor`
 * would conflate instruments in `rangeFromSensor` and assessment text.
 *
 * `rangeM: null` (hardware absent, dead zone, unverified protocol, over-range, weak return) is NOT a
 * contact — drop it. `bearingRelDeg` is the mount bearing relative to the bow; the reader does not
 * pre-rotate heading (same contract as TF-Luna). Association with a camera contact is the fusion
 * layer's job via the angular gate, not something asserted here.
 */
export interface RangefinderInput {
  id: string;
  /** Fixed mount bearing relative to the bow (e.g. CV50 `mountBearingDeg`). */
  bearingRelDeg: number;
  rangeM: number | null;
  label?: string | null;
  /** Backend status verbatim (e.g. "hardware_absent", "port_unassigned") — not interpreted here. */
  status?: string | null;
  /** 0..1 return quality when the backend reports one. */
  quality?: number | null;
}

/** A detector box plus the geometry needed to turn its pixels into an angle. */
export interface CameraDetectionInput {
  det: CameraDetection;
  source: DetectionSource;
  geometry: TrackGeometry;
}

/**
 * One radio heard by WiFi-sense.
 *
 * `bearingRelDeg` is null unless the backend genuinely measured an angle of arrival; a null bearing is
 * DROPPED. RSSI is not a direction and it is not a distance over water, so there is deliberately no
 * range field on this input at all — there is nothing a caller could pass that we would plot.
 */
export interface WifiContactInput {
  id: string;
  bearingRelDeg: number | null;
  label?: string | null;
  /** 0..1 normalized signal strength when the backend reports one. */
  strength?: number | null;
  /** Angular uncertainty of the AoA solution, degrees. Null ⇒ unknown width, never widened to a guess. */
  bearingSigmaDeg?: number | null;
}

/**
 * A frame-differencing mover from `useMotionDetect`.
 *
 * Motion carries NO vocabulary: "something changed in this direction". It never gets a class, and its
 * `score` is a change magnitude, not a confidence.
 */
export interface MotionMoverInput {
  id: string;
  mover: { x: number; y: number; w: number; h: number; score?: number | null };
  source: DetectionSource;
  geometry: TrackGeometry;
}

export interface FusionInput {
  /** Own-ship heading, degrees true. The single authority for this frame — see the header note. */
  headingDeg: number | null;
  radar?: SensorContact[];
  lidar?: SensorContact[];
  tof?: TofFaceInput[];
  rangefinder?: RangefinderInput[];
  mmwave?: MmwaveTargetInput[];
  cameraDetections?: CameraDetectionInput[];
  wifi?: WifiContactInput[];
  motion?: MotionMoverInput[];
}

/**
 * Seeding / attribution order. Radar is the reference sensor (it is the one that natively measures the
 * pair this whole frame is built from), so it seeds clusters first and, when several range-measuring
 * sensors land on one track, it is the range that gets attributed. One rule, applied everywhere:
 * the operator can always predict which sensor owns the number on screen.
 */
const SENSOR_PRIORITY: readonly FusionSensor[] = [
  "radar",
  "lidar",
  "rangefinder",
  "tof",
  "mmwave",
  "camera",
  "wifi",
  "motion",
];

/**
 * Which sensor's LABEL wins when several see the same object. The camera is the only sensor here that
 * classifies anything, so it leads — but an "Unclassified contact" from the camera loses to a named
 * radar/lidar track, because a real identification beats a demoted one whatever produced it.
 */
const IDENTITY_PRIORITY: readonly FusionSensor[] = [
  "camera",
  "radar",
  "lidar",
  "rangefinder",
  "tof",
  "mmwave",
  "wifi",
  "motion",
];

/** Operator-facing sensor names. Used in `assessment`, so they must read as English, not as ids. */
const SENSOR_NAME: Record<FusionSensor, string> = {
  radar: "Radar",
  lidar: "LiDAR",
  tof: "ToF",
  // Under-camera pencil beam (CORVON CV50). Not "ToF" — that name is the VL53L1X ring / TF-Luna lane.
  rangefinder: "Rangefinder",
  // Deliberately not "Radar". Naming a 6 m human-movement sensor "radar" invites an operator to read
  // "no contacts" as clear water out to the horizon.
  mmwave: "mmWave",
  camera: "Camera",
  wifi: "WiFi-sense",
  motion: "Motion",
};

/**
 * ContactKind → handling lane, so a radar/lidar return is coloured and routed by the same vocabulary
 * the camera ontology uses. Deliberately conservative: "landmass" and "obstacle" both land in the
 * hazard lane (things you can hit), and an RF emitter is a signal, not a vessel.
 */
const KIND_GROUP: Record<ContactKind, string> = {
  vessel: "vessel",
  obstacle: "hazard",
  buoy: "aid_to_navigation",
  acoustic: "signal",
  wifi: "signal",
  landmass: "hazard",
  unknown: "unknown",
};

const KIND_LABEL: Record<ContactKind, string> = {
  vessel: "Vessel",
  obstacle: "Obstacle",
  buoy: "Buoy / navigation mark",
  acoustic: "Acoustic contact",
  wifi: "RF emitter",
  landmass: "Landmass",
  unknown: "Unclassified contact",
};

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A 0..1 score. Out-of-range values are malformed, not clamped — clamping invents a reading. */
const unit = (v: unknown): number | null => {
  const n = fin(v);
  return n !== null && n >= 0 && n <= 1 ? n : null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/** Format a range for an operator sentence. Metres below a km, then km — never more precision than measured. */
function rangeText(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : m >= 100 ? `${Math.round(m)} m` : `${m.toFixed(1)} m`;
}

/** Format a bearing for an operator sentence, saying plainly which frame it is in. */
function bearingText(c: { bearingTrueDeg: number | null; bearingRelDeg: number }): string {
  const rel = `${String(Math.round(c.bearingRelDeg)).padStart(3, "0")}° rel`;
  return c.bearingTrueDeg === null ? `${rel} (heading unknown — no true bearing)` : `${String(Math.round(c.bearingTrueDeg)).padStart(3, "0")}°T / ${rel}`;
}

/**
 * Angular half-width of a camera/motion box, in degrees.
 *
 * Per-source, because the pixel→angle scale is not the same on every surface:
 *  - pano: the strip spans the whole ring, so a box's width IS a fraction of 360° and no per-sensor
 *    FOV is involved at all.
 *  - bev: top-down, so the subtended angle depends on where the box sits — computed from the actual
 *    angles to its left and right edges rather than from any FOV.
 *  - front / quad360: a single sensor's frame, so the scale is that sensor's horizontal FOV. With no
 *    FOV reported there is no scale, and `detectionBearing` has already refused the bearing for the
 *    same reason — so this returns null and the contact is dropped upstream.
 */
function wedgeHalfDegFor(
  bbox: { x: number; y: number; w: number; h: number },
  source: DetectionSource,
  g: TrackGeometry,
): number | null {
  const bw = fin(bbox?.w);
  if (bw === null || bw <= 0) return null;

  if (source === "pano") return Math.min(180, (bw * 360) / 2);

  if (source === "bev") {
    const frameW = fin(g?.frameW);
    const frameH = fin(g?.frameH);
    const bx = fin(bbox.x);
    const by = fin(bbox.y);
    const bh = fin(bbox.h);
    if (frameW === null || frameH === null || bx === null || by === null || bh === null) return null;
    if (frameW <= 0 || frameH <= 0) return null;
    // Angle to each vertical edge of the box, measured at the box's own centre row. Screen y grows
    // downward and the bow is up, so bearing = atan2(dx, -dy) — the same convention detectionBearing
    // uses for this surface.
    const cy = (by + bh / 2) * frameH - frameH / 2;
    const x1 = bx * frameW - frameW / 2;
    const x2 = (bx + bw) * frameW - frameW / 2;
    if (x1 === 0 && cy === 0) return null;
    const a1 = (Math.atan2(x1, -cy) * 180) / Math.PI;
    const a2 = (Math.atan2(x2, -cy) * 180) / Math.PI;
    return Math.min(180, Math.abs(bearingDelta(a1, a2)) / 2);
  }

  const fov = fin(g?.fovDeg);
  if (fov === null || fov <= 0) return null;
  return Math.min(180, (bw * fov) / 2);
}

/** Mint a collision-free contact id without losing the backend's stable identity for the common case. */
function claimId(seen: Set<string>, base: string): string {
  if (!seen.has(base)) {
    seen.add(base);
    return base;
  }
  let n = 2;
  while (seen.has(`${base}#${n}`)) n += 1;
  const id = `${base}#${n}`;
  seen.add(id);
  return id;
}

/**
 * Project every supplied sensor reading into the shared polar frame.
 *
 * Anything that cannot be placed honestly is DROPPED, never defaulted:
 *  - a radar/lidar return missing a bearing or a range
 *  - a ToF face with no return (hardware absent)
 *  - a camera/motion box whose geometry cannot yield an angle (typically a null `fovDeg`)
 *  - a WiFi radio with no measured angle of arrival
 * The caller is responsible for telling the operator that a sensor reported nothing — a dropped
 * reading must be visible as an absent sensor, not as an empty screen.
 */
export function projectToFusion(input: FusionInput): FusionContact[] {
  const heading = fin(input?.headingDeg);
  const trueOf = (rel: number): number | null => (heading === null ? null : norm360(heading + rel));
  const out: FusionContact[] = [];
  const seen = new Set<string>();

  // ── radar + lidar: the sensors that natively measure the whole polar pair ────────────────────────
  const pushScope = (list: SensorContact[] | undefined, sensor: "radar" | "lidar"): void => {
    for (const c of Array.isArray(list) ? list : []) {
      const bearing = fin(c?.bearingDeg);
      const range = fin(c?.rangeM);
      // Half a polar coordinate is not a contact. Supplying the missing half is the fabrication.
      if (bearing === null || range === null || range < 0) continue;
      const kind: ContactKind = (c.kind in KIND_GROUP ? c.kind : "unknown") as ContactKind;
      // `classifiedAs` is a DETECTOR string (NLM/YOLO), so it goes through the maritime ontology —
      // that is what demotes a COCO leaf. `label`/`kind` are the backend's own track vocabulary and
      // must NOT be run through it: "obstacle" is not a COCO class, and the ontology would demote a
      // perfectly good radar track to "Unclassified contact".
      const detected = str(c.classifiedAs);
      const classified = detected === null ? null : classifyDetection(detected);
      out.push({
        id: claimId(seen, `${sensor}:${str(c.id) ?? String(out.length)}`),
        sensor,
        label: classified?.displayLabel ?? str(c.label) ?? KIND_LABEL[kind],
        group: classified?.group ?? KIND_GROUP[kind],
        bearingTrueDeg: trueOf(norm360(bearing)),
        bearingRelDeg: norm360(bearing),
        rangeM: range,
        wedgeHalfDeg: null, // a measured position is a point, not a sector
        conf: null,
        strength: unit(c.strength),
        raw: c,
      });
    }
  };
  pushScope(input?.radar, "radar");
  pushScope(input?.lidar, "lidar");

  // ── ToF faces: a fixed bearing and a precise short range ────────────────────────────────────────
  for (const f of Array.isArray(input?.tof) ? input.tof : []) {
    const rel = fin(f?.bearingRelDeg);
    const range = fin(f?.rangeM);
    // A face with no return is not a contact. The endpoint reports rangeM null while the hardware is
    // absent, and a dot for it would put a permanent obstacle on a fixed bearing off the bow.
    if (rel === null || range === null || range <= 0) continue;
    out.push({
      id: claimId(seen, `tof:${str(f.id) ?? String(Math.round(rel))}`),
      sensor: "tof",
      label: str(f.label) ?? "Proximity return",
      group: "hazard", // a thing within a few metres of the hull is handled as an obstruction
      bearingTrueDeg: trueOf(norm360(rel)),
      bearingRelDeg: norm360(rel),
      rangeM: range,
      wedgeHalfDeg: null,
      conf: null,
      strength: unit(f.quality),
      raw: f,
    });
  }

  // ── rangefinder: fixed mount / boresight bearing + measured range (CORVON CV50, etc.) ───────────
  // Own lane from `"tof"`: a null/absent range is not a contact. When the Jetson reports
  // configured_absent / protocol unverified, `rangeM` stays null upstream and nothing is emitted.
  for (const r of Array.isArray(input?.rangefinder) ? input.rangefinder : []) {
    const rel = fin(r?.bearingRelDeg);
    const range = fin(r?.rangeM);
    if (rel === null || range === null || range <= 0) continue;
    out.push({
      id: claimId(seen, `rangefinder:${str(r.id) ?? String(Math.round(rel))}`),
      sensor: "rangefinder",
      label: str(r.label) ?? "Rangefinder return",
      group: "hazard",
      bearingTrueDeg: trueOf(norm360(rel)),
      bearingRelDeg: norm360(rel),
      rangeM: range,
      wedgeHalfDeg: null,
      conf: null,
      strength: unit(r.quality),
      raw: r,
    });
  }

  // ── mmWave: a measured bearing AND a measured range, from a 6 m human-movement sensor ───────────
  // The LD2450 reports three fixed target slots. An unoccupied slot arrives as valid:false with nulls
  // (and, on the wire, x/y of 0/0), so anything short of a real solution is dropped rather than
  // plotted at the origin. It detects MOVEMENT, not identity — see the group choice below.
  for (const t of Array.isArray(input?.mmwave) ? input.mmwave : []) {
    if (t?.valid === false) continue;
    const rel = fin(t?.bearingRelDeg);
    const range = fin(t?.rangeM);
    if (rel === null || range === null || range <= 0) continue;
    out.push({
      id: claimId(seen, `mmwave:${str(t.id) ?? String(Math.round(rel))}`),
      label: str(t.label) ?? "mmWave mover",
      sensor: "mmwave",
      // NOT "hazard" and NOT "vessel". This sensor resolves motion, never identity, and on open water
      // it will track wave crests and floating debris as readily as a person. Promoting that to a
      // hazard or a contact class would be the GCS inventing a classification the hardware cannot make.
      group: "unknown",
      bearingTrueDeg: trueOf(norm360(rel)),
      bearingRelDeg: norm360(rel),
      rangeM: range,
      wedgeHalfDeg: null,
      conf: null,
      strength: null,
      raw: t,
    });
  }

  // ── camera: a bearing out of pixels, and NOTHING else ───────────────────────────────────────────
  for (const entry of Array.isArray(input?.cameraDetections) ? input.cameraDetections : []) {
    if (!entry?.det || !entry.geometry) continue;
    const b = detectionBearing(entry.det, entry.source, entry.geometry);
    // detectionBearing returns null exactly when the geometry needed to convert pixels to degrees is
    // missing — most often a null fovDeg on a single-sensor surface. DROP it. A guessed camera bearing
    // paints a wedge across water where nothing is, and the operator has no way to tell.
    if (!b) continue;
    const rel = norm360(b.relativeDeg);
    const classified = classifyDetection(entry.det.cls);
    out.push({
      id: claimId(seen, `camera:${entry.source}:${str(entry.det.trackId) ?? str(entry.det.id) ?? String(out.length)}`),
      sensor: "camera",
      label: classified.displayLabel,
      group: classified.group,
      bearingTrueDeg: trueOf(rel),
      bearingRelDeg: rel,
      // A CAMERA HAS NO RANGE. Not "unknown yet", not "estimated from box size" — none. Note that the
      // contract carries an optional `det.rangeM`; it is deliberately NOT read here. If a stereo or
      // calibrated-BEV ranging path ever lands it arrives as its own range-measuring sensor with its
      // own provenance, rather than smuggling a number in under the camera's name.
      rangeM: null,
      wedgeHalfDeg: wedgeHalfDegFor(entry.det.bbox, entry.source, entry.geometry),
      conf: unit(entry.det.conf),
      strength: null,
      raw: entry.det,
    });
  }

  // ── motion: a direction something changed in. No class, no range ────────────────────────────────
  for (const m of Array.isArray(input?.motion) ? input.motion : []) {
    if (!m?.mover || !m.geometry) continue;
    // detectionBearing takes a CameraDetection; a mover is the same box in the same space, so we
    // borrow the geometry path rather than duplicating the coordinate chain. The synthetic cls/conf
    // exist only to satisfy the type and are never surfaced — motion carries no vocabulary.
    const asDet: CameraDetection = { id: m.id, cls: "", conf: 0, bbox: m.mover };
    const b = detectionBearing(asDet, m.source, m.geometry);
    if (!b) continue;
    const rel = norm360(b.relativeDeg);
    out.push({
      id: claimId(seen, `motion:${m.source}:${str(m.id) ?? String(out.length)}`),
      sensor: "motion",
      label: "Movement (unclassified)",
      group: "unknown",
      bearingTrueDeg: trueOf(rel),
      bearingRelDeg: rel,
      rangeM: null,
      wedgeHalfDeg: wedgeHalfDegFor(m.mover, m.source, m.geometry),
      // `score` is a change magnitude, not a confidence — it goes in `strength` and never in `conf`.
      conf: null,
      strength: unit(m.mover.score),
      raw: m.mover,
    });
  }

  // ── wifi: a bearing ONLY when the backend measured an angle of arrival ──────────────────────────
  for (const w of Array.isArray(input?.wifi) ? input.wifi : []) {
    const rel = fin(w?.bearingRelDeg);
    // No AoA ⇒ no bearing ⇒ not a contact on a polar plot. The radio was still HEARD, and the caller
    // must say so in the legend — but "heard" is not "over there".
    if (rel === null) continue;
    const sigma = fin(w.bearingSigmaDeg);
    out.push({
      id: claimId(seen, `wifi:${str(w.id) ?? String(out.length)}`),
      sensor: "wifi",
      label: str(w.label) ?? "RF emitter",
      group: "signal",
      bearingTrueDeg: trueOf(norm360(rel)),
      bearingRelDeg: norm360(rel),
      // RSSI is not a range. Over water the sea-surface reflection and multipath fading make the
      // RSSI→distance curve non-metric, so no client-side estimate is admissible and no backend
      // estimate is passed through under a measurement's name.
      rangeM: null,
      wedgeHalfDeg: sigma !== null && sigma > 0 ? Math.min(180, sigma) : null,
      conf: null,
      strength: unit(w.strength),
      raw: w,
    });
  }

  return out;
}

/** Build the operator sentence for a fused track. States who agrees, and admits an unknown range. */
function assess(
  members: FusionContact[],
  sensors: FusionSensor[],
  rangeM: number | null,
  rangeFromSensor: FusionSensor | null,
  anchor: FusionContact,
): string {
  const names = sensors.map((s) => SENSOR_NAME[s]);
  const who =
    names.length === 1
      ? `${names[0]} only`
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} agree`;
  const parts = [`${who} on ${bearingText(anchor)}.`];

  if (rangeM !== null && rangeFromSensor !== null) {
    parts.push(`Range ${rangeText(rangeM)}, measured by ${SENSOR_NAME[rangeFromSensor]}.`);
    // Several range-measuring sensors on one bearing that disagree is the signature of a bad
    // association, not of a better fix. Say it rather than quietly showing one of the two numbers.
    const others = members.filter((m) => m.sensor !== rangeFromSensor && plottableRangeM(m) !== null);
    for (const o of others) {
      const r = plottableRangeM(o) as number;
      const spread = Math.abs(r - rangeM);
      if (spread > 2 && spread > 0.25 * Math.max(r, rangeM)) {
        parts.push(
          `${SENSOR_NAME[o.sensor]} reports ${rangeText(r)} on the same bearing — the ranges disagree, so this pairing may be two different objects.`,
        );
      }
    }
  } else {
    parts.push("RANGE UNKNOWN — no sensor on this track measures range, so this is a bearing line, not a position.");
  }

  if (sensors.length === 1 && rangeM !== null) parts.push("No other sensor corroborates it.");
  return parts.join(" ");
}

/**
 * Associate projected contacts into tracks by ANGULAR GATE.
 *
 * Bearing is the only quantity every sensor here shares, so it is the only thing association may use.
 * Two rules keep that from over-merging:
 *  1. a candidate must fall inside `gateDeg` of the bearing the cluster was SEEDED at (not of a
 *     drifting running mean, which would let a chain of contacts walk a track across the horizon);
 *  2. at most one contact per sensor per track — two radar returns 3° apart are two objects, and
 *     merging them would silently delete a contact from the operator's picture.
 *
 * Range is never used to associate (most contacts have none) and never averaged: the track's range is
 * COPIED from the highest-priority member that actually measured one, and `rangeFromSensor` records
 * which sensor that was. A track whose members are all bearing-only keeps `rangeM: null`.
 */
export function fuseByBearing(contacts: FusionContact[], opts?: { gateDeg?: number }): FusedTrack[] {
  const gateRaw = fin(opts?.gateDeg);
  const gate = gateRaw !== null && gateRaw > 0 ? Math.min(180, gateRaw) : 8;
  const list = Array.isArray(contacts) ? contacts.filter((c): c is FusionContact => Boolean(c)) : [];

  // Stable sort into sensor-priority order so range-measuring sensors seed clusters and the greedy
  // pass is deterministic for a given frame.
  const ordered = list
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const pa = SENSOR_PRIORITY.indexOf(a.c.sensor);
      const pb = SENSOR_PRIORITY.indexOf(b.c.sensor);
      return pa === pb ? a.i - b.i : pa - pb;
    })
    .map((e) => e.c);

  const clusters: FusionContact[][] = [];
  const anchorBearings: number[] = [];

  for (const c of ordered) {
    let bestIdx = -1;
    let bestDelta = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].some((m) => m.sensor === c.sensor)) continue;
      const d = Math.abs(bearingDelta(anchorBearings[i], c.bearingRelDeg));
      if (d <= gate && d < bestDelta) {
        bestDelta = d;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) {
      clusters.push([c]);
      anchorBearings.push(c.bearingRelDeg);
    } else {
      clusters[bestIdx].push(c);
    }
  }

  return clusters.map((members): FusedTrack => {
    // The anchor is the highest-priority member (radar first) — the ordering above guarantees it is
    // members[0]. Its bearing is ADOPTED, not averaged with the others: we hold no per-sensor bearing
    // uncertainty, so a mean would be an unjustified precision claim dressed up as a fix.
    const anchor = members[0];
    const sensors: FusionSensor[] = [];
    for (const m of members) if (!sensors.includes(m.sensor)) sensors.push(m.sensor);

    // `plottableRangeM`, not `m.rangeM !== null`: a range may only be attributed to a sensor that
    // measures one, whoever built the contact.
    const ranged = members.filter((m) => plottableRangeM(m) !== null);
    const rangeSource = ranged.length > 0 ? ranged[0] : null;
    const rangeM = rangeSource ? plottableRangeM(rangeSource) : null;
    const rangeFromSensor = rangeSource ? rangeSource.sensor : null;

    // Identity: prefer a classifying sensor, but a named contact beats an unidentified one whatever
    // saw it — a camera "Unclassified contact" must not overwrite a radar "Vessel".
    const byIdentity = [...members].sort(
      (a, b) => IDENTITY_PRIORITY.indexOf(a.sensor) - IDENTITY_PRIORITY.indexOf(b.sensor),
    );
    const identified = byIdentity.find((m) => m.group !== "unknown");
    const ident = identified ?? byIdentity[0];

    return {
      id: `fx:${anchor.id}`,
      bearingTrueDeg: anchor.bearingTrueDeg,
      bearingRelDeg: anchor.bearingRelDeg,
      rangeM,
      rangeFromSensor,
      sensors,
      label: ident.label,
      group: ident.group,
      corroborated: sensors.length >= 2,
      members,
      assessment: assess(members, sensors, rangeM, rangeFromSensor, anchor),
    };
  });
}
