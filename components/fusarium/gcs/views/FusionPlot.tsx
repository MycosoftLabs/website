"use client";

/**
 * FusionPlot — BlueSight's FUSION mode: ONE buoy-centric polar picture that every sensor projects into.
 *
 * Morgan's definition of this feature is the spec: "BlueSight is a fusion of radar, lidar, Wi-Fi sense,
 * and camera that an AI can see. It's not just widgets showing each one individually." So this is not a
 * fifth scope alongside the quad — it is the layering: the live 360° panorama along the top, bearing-
 * aligned with a polar plot beneath it, and radar / lidar / ToF / camera / WiFi-sense all drawn into
 * that one frame with their real, different capabilities intact.
 *
 * ══ WHAT MAKES THIS HONEST (and what it replaced) ═════════════════════════════════════════════════
 * FUSION mode used to be a plain ScopePPI over `[...radar, ...lidar, ...wifi]` — every contact a dot at
 * a bearing and a range, regardless of whether the sensor that produced it can measure range at all.
 * Here, what a sensor can measure decides how it is DRAWN:
 *
 *   radar / lidar / ToF   →  a DOT at (bearing, range). They measure both.
 *   camera / WiFi-sense   →  a WEDGE from own-ship to the edge of the plot, dashed and translucent,
 *                            labelled "RANGE UNKNOWN". A camera derives a bearing from pixels and has
 *                            no range at all; WiFi-sense has neither range nor (today) any bearing.
 *
 * A bearing-only contact is never a dot at a guessed radius. That is the same fabrication class as the
 * synthesized "AI boxes" deleted from BlueSightView — an invented number on a tactical display that an
 * operator has no way to distinguish from a measurement.
 *
 * THE PAIRING IS THE POINT. When a camera wedge and a radar/lidar return land on the same bearing, the
 * engine fuses them into one track that carries the camera's IDENTITY and the radar's RANGE, and the
 * plot says so out loud: the wedge goes solid from own-ship out to the measured range, caps with an arc
 * at that range, and continues faded beyond it; the contact gets a double marker and a label naming
 * BOTH sensors. "Vessel · 212 m · camera + radar" is the whole feature in one mark.
 *
 * THE STRIP'S ALIGNMENT IS CHECKED, NOT ASSUMED. "x on the panorama = bearing" only holds while the
 * pano is drawn edge to edge, which depends on the strip being wide enough for the pano's aspect at
 * its height. So the height is derived from the measured width, and when the pano's dimensions are
 * unknown — or the raw ring composite is being shown instead, where x is cable order — the caption
 * says so instead of repeating a claim it cannot support. A silently mis-scaled bearing axis is the
 * same class of error as a fabricated range: the operator cannot tell it from a correct one.
 *
 * ABSENCE IS VISIBLE. Every sensor has a legend row whatever it is doing. A sensor with no hardware
 * fitted reads "no hardware", a dead detector reads "unreachable" — never a silently missing layer.
 * The empty state names which sensors are actually reporting, because "no contacts" from a console
 * whose sensors are all absent is NOT an all-clear and must never look like one.
 *
 * WIFI RANGE IS DISCARDED ON PURPOSE. `telemetry.bluesight.wifi` entries are `SensorContact`s and so
 * carry a `rangeM`, but no WiFi-sense hardware on this buoy measures distance — RSSI→metres is
 * non-metric over water (sea-surface reflection, multipath fading, antenna orientation). Only the
 * bearing is forwarded, and `WifiContactInput` has no range field at all, so the number cannot be
 * plotted even by accident.
 */

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import useSWR from "swr";
import {
  Camera as CameraIcon,
  ChevronLeft,
  ChevronRight,
  Radar as RadarIcon,
  Ruler,
  ScanEye,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { emptyCameraRig, type BuoyTelemetry, type CameraFeed, type CameraRig } from "@/lib/fusarium/gcs/contract";
import { groupColor, type MaritimeGroup } from "@/lib/fusarium/gcs/maritimeOntology";
import { useCameraDetections } from "@/lib/fusarium/gcs/useCameraDetections";
import type { DetectionSource, TrackGeometry } from "@/lib/fusarium/gcs/targetTracking";
import {
  fuseByBearing,
  plottableRangeM,
  projectToFusion,
  type CameraDetectionInput,
  type FusedTrack,
  type FusionContact,
  type FusionSensor,
  type TofFaceInput,
  type RangefinderInput,
  type MmwaveTargetInput,
  type WifiContactInput,
} from "@/lib/fusarium/gcs/fusionFrame";
import LiveFeedSurface from "@/components/fusarium/gcs/camera/LiveFeedSurface";

/** Sensors this view has a data path for. Motion is supported by the engine but needs a sampled canvas
 *  element that this view does not own (see `useMotionDetect`), so it is not claimed in the legend. */
const LAYERS: readonly FusionSensor[] = ["radar", "lidar", "tof", "rangefinder", "mmwave", "camera", "wifi"];

const SENSOR_COLOR: Record<FusionSensor, string> = {
  radar: "#4ade80", // green-400
  lidar: "#22d3ee", // cyan-400
  tof: "#fbbf24", // amber-400
  // Distinct from ToF amber: CV50 is a 50 m boresight pencil beam, not the VL53L1X ring.
  rangefinder: "#f59e0b", // amber-500
  mmwave: "#fb923c", // orange-400 — adjacent to ToF (both short-range) but never confusable with radar green
  camera: "#a78bfa", // violet-400
  wifi: "#e879f9", // fuchsia-400
  motion: "#94a3b8", // slate-400
};

const SENSOR_NAME: Record<FusionSensor, string> = {
  radar: "Radar",
  lidar: "LiDAR",
  tof: "ToF / proximity",
  rangefinder: "Rangefinder · CV50",
  // "mmWave", never "Radar". The legend is where an operator forms the mental model of what coverage
  // exists; calling a 6 m movement sensor radar invites reading "no contacts" as clear water.
  mmwave: "mmWave · 6 m",
  camera: "Camera",
  wifi: "WiFi-sense",
  motion: "Motion",
};

/** Sensor endpoints change slowly (and are honest-empty today) — do not hammer the LAN. */
const SENSOR_POLL_MS = 4000;
/** Detector poll for the fusion camera layer. Slower than a video overlay: this is a plot, not frames. */
const CAM_POLL_MS = 1200;
/**
 * How long a detector frame may go un-refreshed before its bearings stop being plotted.
 *
 * `useCameraDetections` never clears `frame` on a failed poll — it only flips `connected` — so a dead
 * detector's last frame stays readable for the life of the mount. Without an age gate this plot kept
 * painting that frame's wedges, including the "camera + radar" paired marker and its measured RANGE
 * label, minutes after the service died, while the legend beside it read "detector unreachable". A
 * held contact drawn identically to a live one is the fabrication class this whole panel exists to
 * prevent. ~2 missed polls, deliberately the same order as useStableDetections' 2.5 s hold rather
 * than a second, competing notion of "too old".
 */
const CAM_STALE_MS = 3000;

const RAD = Math.PI / 180;

// ── payload helpers (every backend field is treated as untrusted) ───────────────────────────────────
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

interface Probe {
  status: number;
  body: unknown;
}

const probe = async (url: string): Promise<Probe> => {
  const res = await fetch(url, { cache: "no-store" });
  const body: unknown = await res.json().catch(() => null);
  return { status: res.status, body };
};

const rigFetcher = (url: string): Promise<CameraRig> => fetch(url, { cache: "no-store" }).then((r) => r.json());

function useSensorProbe(kind: string, active: boolean) {
  return useSWR<Probe>(active ? `/api/fusarium/gcs/fusion-sensors/${kind}` : null, probe, {
    refreshInterval: SENSOR_POLL_MS,
    revalidateOnFocus: false,
    dedupingInterval: SENSOR_POLL_MS - 500,
    keepPreviousData: true,
  });
}

/** One legend row: what a sensor IS doing, in words, whether or not it produced a contact. */
interface LayerState {
  sensor: FusionSensor;
  status: string;
  /** No hardware fitted / nothing wired. Rendered distinctly — absence must not read as "quiet". */
  absent: boolean;
  /**
   * The probe has neither answered nor failed yet, so this sensor's state is genuinely UNKNOWN.
   *
   * Distinct from `absent` on purpose. The dev-PC→Jetson path has a documented first-SYN stall of
   * several seconds and the BFF retries three times, so the unknown window is long enough to read —
   * and during it the panel used to announce "No sensor is currently reporting", which is an absence
   * claim nobody had confirmed. Unknown must look like unknown, never like an all-clear.
   */
  pending?: boolean;
  /** Contacts this layer actually placed on the plot. */
  count: number;
}

/** Nice 1/2/5×10ⁿ ceiling, so ring labels are numbers an operator reads at a glance. */
function niceCeil(v: number): number {
  if (!(v > 0)) return 100;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * base;
}

function rangeText(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : m >= 100 ? `${Math.round(m)} m` : `${m.toFixed(1)} m`;
}

const deg3 = (d: number): string => String(Math.round(((d % 360) + 360) % 360)).padStart(3, "0");

/**
 * ToF faces from `/proximity/scan` (VL53L1X ring) and `/proximity/points` (TF-Luna slots).
 *
 * A face whose `rangeM` is null is passed through with its null intact; the engine drops it. We count
 * the configured faces separately from the returning ones so the legend can say "4 configured, none
 * fitted" instead of showing nothing.
 */
interface TofSource {
  /** Operator-facing name of the physical sensor group, not the endpoint. */
  label: string;
  hardware: string | null;
  configured: number;
  /** Rows that carried a usable range. A present sensor with 0 here is working but got no return. */
  returning: number;
  /**
   * THIS source's endpoint failed. Per-source for the same reason `hardware` is: the two endpoints
   * serve two physically independent sensor groups, so one going down says nothing about the other.
   * A single shared flag previously let a 502 on the ring badge the whole lane "unreachable / not
   * reporting" while the TF-Luna's returns were still being plotted as amber dots — the legend and
   * the plot making opposite claims about the same sensor on the same panel.
   */
  unreachable: boolean;
}

function parseTof(
  scan: Probe | undefined,
  points: Probe | undefined,
): { faces: TofFaceInput[]; configured: number; sources: TofSource[] } {
  const faces: TofFaceInput[] = [];
  let configured = 0;
  const sources: TofSource[] = [];

  const take = (p: Probe | undefined, key: "faces" | "points", prefix: string, label: string): void => {
    if (!p) return; // never probed — this source contributes no claim at all, not even a failed one
    if (p.status !== 200) {
      // A failed source still gets a row, so the legend can name WHICH group is down instead of
      // condemning the lane. configured/returning stay 0 because this endpoint told us nothing.
      sources.push({ label, hardware: null, configured: 0, returning: 0, unreachable: true });
      return;
    }
    const body = isRecord(p.body) ? p.body : {};
    // Per-source, NOT merged. `hardware` here feeds two physically different sensor groups — the
    // VL53L1X ring and the TF-Luna slots. Collapsing them with `??` let whichever endpoint parsed
    // first speak for both, so an absent ring reported "no hardware" over a live, present TF-Luna.
    const srcHardware = str(body.hardware);
    const src: TofSource = { label, hardware: srcHardware, configured: 0, returning: 0, unreachable: false };
    const rows = Array.isArray(body[key]) ? (body[key] as unknown[]) : [];
    for (const row of rows) {
      if (!isRecord(row)) continue;
      configured += 1;
      src.configured += 1;
      if (fin(row.rangeM) !== null) src.returning += 1;
      const bearing = fin(row.bearingDeg) ?? fin(row.mountBearingDeg);
      if (bearing === null) continue;
      faces.push({
        id: `${prefix}:${str(row.sensorId) ?? str(row.id) ?? str(row.face) ?? String(configured)}`,
        bearingRelDeg: bearing,
        // Null stays null. A zero here would draw an obstacle touching the hull.
        rangeM: fin(row.rangeM),
        label: str(row.face) ? `Proximity · ${str(row.face)}` : "Proximity return",
        status: str(row.status) ?? str(row.invalidReason),
        // The VL53L1X ring may report a genuine 0..1 `quality`. The TF-Luna reports raw `strength` on
        // a 0..65535 scale, which must be normalized or it is silently discarded by the `unit()` guard
        // downstream. Anything else gets null rather than a number of unknown scale.
        quality: fin(row.quality) ?? (prefix === "tfluna" ? tfLunaQuality(fin(row.strength)) : null),
      });
    }
    sources.push(src);
  };

  take(scan, "faces", "tof", "ring");
  take(points, "points", "tfluna", "TF-Luna");
  return { faces, configured, sources };
}

/**
 * HLK-LD2450 mmWave targets from `/mmwave`.
 *
 * Three fixed slots. An unoccupied slot arrives `valid:false` with nulls — passed through so the
 * engine drops it, never coerced to a zero. On the wire an empty slot is x/y = 0/0, which would
 * otherwise plot as a permanent contact touching the bow.
 *
 * `bearingDeg` is bow-relative by contract (the backend owns the mount offset and applies it), so it
 * is used as-is. Adding `mountBearingDeg` here again would double-count the offset the moment the
 * module is mounted anywhere other than straight ahead.
 */
function parseMmwave(p: Probe | undefined): {
  targets: MmwaveTargetInput[];
  slots: number;
  hardware: string | null;
  framesOk: number | null;
  maxRangeM: number | null;
  unreachable: boolean;
} {
  const empty = { targets: [] as MmwaveTargetInput[], slots: 0, hardware: null, framesOk: null, maxRangeM: null };
  if (!p) return { ...empty, unreachable: false };
  if (p.status !== 200) return { ...empty, unreachable: true };
  const body = isRecord(p.body) ? p.body : {};
  const rows = Array.isArray(body.targets) ? (body.targets as unknown[]) : [];
  const targets: MmwaveTargetInput[] = [];
  let slots = 0;
  for (const row of rows) {
    if (!isRecord(row)) continue;
    slots += 1;
    targets.push({
      id: `mmw:${str(row.id) ?? String(fin(row.id) ?? slots)}`,
      bearingRelDeg: fin(row.bearingDeg),
      rangeM: fin(row.rangeM),
      speedCmS: fin(row.speedCmS),
      valid: typeof row.valid === "boolean" ? row.valid : null,
      label: "mmWave mover",
    });
  }
  return {
    targets,
    slots,
    hardware: str(body.hardware),
    framesOk: fin(body.frames_ok) ?? fin(body.framesOk),
    maxRangeM: fin(body.maxRangeM),
    unreachable: false,
  };
}

/**
 * CORVON CV50 (under-camera pencil beam) from `/rangefinder`.
 *
 * Own lane from ToF: never folded into `parseTof`. Null `rangeM` (configured_absent, unverified
 * protocol, dead zone, etc.) is passed through; the engine drops it. Bearing is mount-relative
 * (`mountBearingDeg`); the reader does not pre-rotate heading — same contract as TF-Luna.
 */
function parseRangefinder(p: Probe | undefined): {
  readings: RangefinderInput[];
  configured: number;
  returning: number;
  hardware: string | null;
  unreachable: boolean;
} {
  const empty = { readings: [] as RangefinderInput[], configured: 0, returning: 0, hardware: null };
  if (!p) return { ...empty, unreachable: false };
  if (p.status !== 200) return { ...empty, unreachable: true };
  const body = isRecord(p.body) ? p.body : {};
  const rows = Array.isArray(body.points)
    ? (body.points as unknown[])
    : Array.isArray(body.readings)
      ? (body.readings as unknown[])
      : isRecord(body) && (body.mountBearingDeg !== undefined || body.rangeM !== undefined)
        ? [body]
        : [];
  const readings: RangefinderInput[] = [];
  let configured = 0;
  let returning = 0;
  for (const row of rows) {
    if (!isRecord(row)) continue;
    configured += 1;
    const bearing = fin(row.mountBearingDeg) ?? fin(row.bearingDeg) ?? fin(row.bearingRelDeg);
    if (bearing === null) continue;
    const range = fin(row.rangeM);
    if (range !== null) returning += 1;
    readings.push({
      id: `cv50:${str(row.id) ?? str(row.sensor) ?? String(configured)}`,
      bearingRelDeg: bearing,
      rangeM: range,
      label: str(row.label) ?? "Rangefinder · CV50",
      status: str(row.status) ?? str(row.invalidReason),
      // Strength scale matches Benewake-family 0..65535 when that dialect is verified; otherwise null.
      quality: fin(row.quality) ?? tfLunaQuality(fin(row.strength)),
    });
  }
  return {
    readings,
    configured,
    returning,
    hardware: str(body.hardware),
    unreachable: false,
  };
}

/**
 * TF-Luna signal strength → 0..1, the ONLY validity signal this sensor gives.
 *
 * Raw strength spans 0..65535, so feeding it straight into a 0..1 quality field yields null (the
 * `unit()` guard rejects out-of-range) and the operator sees nothing. Both ends of the scale mean
 * "do not trust the distance": ≤100 is too little return — which is exactly what open water gives —
 * and 65535 is saturation. Those return null rather than 0, because 0 would read as a measured-but-
 * weak return rather than "no usable measurement".
 *
 * Log-scaled between those bounds: the usable span is nearly three decades, so a linear map would
 * flatten every realistic return against the floor.
 */
const TFLUNA_MIN_STRENGTH = 100;
const TFLUNA_SATURATED = 65535;
function tfLunaQuality(strength: number | null): number | null {
  if (strength === null || strength <= TFLUNA_MIN_STRENGTH || strength >= TFLUNA_SATURATED) return null;
  const q = Math.log10(strength / TFLUNA_MIN_STRENGTH) / Math.log10(TFLUNA_SATURATED / TFLUNA_MIN_STRENGTH);
  return Math.min(1, Math.max(0, q));
}

/** WiFi-sense radios. A radio with no measured AoA is counted as HEARD but is not a plottable contact. */
function parseWifi(p: Probe | undefined): { withBearing: WifiContactInput[]; heard: number; hardware: string | null; unreachable: boolean } {
  if (!p) return { withBearing: [], heard: 0, hardware: null, unreachable: false };
  if (p.status !== 200) return { withBearing: [], heard: 0, hardware: null, unreachable: true };
  const body = isRecord(p.body) ? p.body : {};
  const rows = Array.isArray(body.detections) ? (body.detections as unknown[]) : [];
  const withBearing: WifiContactInput[] = [];
  let heard = 0;
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = str(row.id) ?? str(row.bssid);
    if (id === null) continue;
    heard += 1;
    const bearing = fin(row.bearingDeg);
    if (bearing === null) continue; // no AoA ⇒ heard, but not "over there"
    withBearing.push({
      id: `rf:${id}`,
      bearingRelDeg: bearing,
      label: str(row.ssid) ? `RF · ${str(row.ssid)}` : "RF emitter",
      // Note there is deliberately no range field to fill: `rangeEstimateM` on this payload is an
      // RSSI-derived guess and is never carried onto the plot.
      strength: fin(row.strength),
      bearingSigmaDeg: fin(row.bearingSigmaDeg),
    });
  }
  return { withBearing, heard, hardware: str(body.hardware), unreachable: false };
}

export default function FusionPlot({
  telemetry,
  active,
  className,
}: {
  telemetry: BuoyTelemetry;
  active: boolean;
  className?: string;
}): JSX.Element {
  const [enabled, setEnabled] = useState<Record<FusionSensor, boolean>>({
    radar: true,
    lidar: true,
    tof: true,
    rangefinder: true,
    mmwave: true,
    camera: true,
    wifi: true,
    motion: true,
  });

  /**
   * The legend rail is 224 px of a centre column that is only ~476 px at 1280 and ~220 px at 1024
   * (both console asides are visible from `md` up), so on a laptop the polar instrument gets less
   * width than its own annotation. Collapsing beats shrinking: the rail carries per-sensor honesty
   * text that must keep its width when shown, so the operator reclaims the space wholesale instead
   * of reading a squeezed version of it. The collapsed strip still shows the not-reporting and
   * still-querying counts — absence and unknown must survive the collapse.
   */
  const [legendOpen, setLegendOpen] = useState(true);

  // ── camera rig: the pano URL for the strip, and the geometry the bearing math needs ──────────────
  const { data: rig } = useSWR<CameraRig>("/api/fusarium/gcs/camera", rigFetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
    dedupingInterval: 8000,
  });
  const fallbackFeeds = emptyCameraRig().feeds;
  const feeds = rig?.feeds ?? fallbackFeeds;
  const quad: CameraFeed = feeds.find((f) => f.id === "quad360") ?? fallbackFeeds[0];
  const panoUrl = quad.stitch?.panoUrl ?? null;
  // The pano is the bearing-robust surface: its x axis IS the ring, so a bearing needs no per-sensor
  // FOV. Fall back to the raw composite, which does need one (and honestly yields nothing without it).
  const camSource: DetectionSource = panoUrl ? "pano" : "quad360";

  const ai = useCameraDetections(camSource, { enabled: active, refreshMs: CAM_POLL_MS });

  const scan = useSensorProbe("proximity", active);
  const points = useSensorProbe("points", active);
  const rangefinderFeed = useSensorProbe("rangefinder", active);
  const lidarFrame = useSensorProbe("lidar", active);
  const wifiFeed = useSensorProbe("wifisense", active);
  const mmwaveFeed = useSensorProbe("mmwave", active);

  const headingDeg = telemetry.pose.headingDeg;

  // A probe that has neither answered nor failed has told us NOTHING about its sensor. Reporting
  // "no hardware (absent)" in that window asserts an absence nobody has confirmed — on this panel
  // absence is a claim like any other, so the first seconds after mount must say "still asking".
  const tofPending = scan.data === undefined && !scan.error && points.data === undefined && !points.error;
  const rangefinderPending = rangefinderFeed.data === undefined && !rangefinderFeed.error;
  const wifiPending = wifiFeed.data === undefined && !wifiFeed.error;
  const lidarPending = lidarFrame.data === undefined && !lidarFrame.error;
  const mmwavePending = mmwaveFeed.data === undefined && !mmwaveFeed.error;

  // ── project every sensor into the one polar frame ────────────────────────────────────────────────
  const tof = useMemo(() => parseTof(scan.data, points.data), [scan.data, points.data]);
  const rangefinder = useMemo(() => parseRangefinder(rangefinderFeed.data), [rangefinderFeed.data]);
  const wifi = useMemo(() => parseWifi(wifiFeed.data), [wifiFeed.data]);
  const mmwave = useMemo(() => parseMmwave(mmwaveFeed.data), [mmwaveFeed.data]);

  // ── camera freshness: the detector's last frame is NOT evidence that the detector is still alive ──
  //
  // Armed as ONE timer at the staleness boundary rather than a polling interval: a healthy detector
  // costs no extra renders (each new frame moves `lastMs`, which re-arms this), while a detector that
  // goes silent still drops its wedges on time instead of waiting for an unrelated re-render to
  // notice. `Date.now()` in a memo would never fire on its own — that is why this is state, not a
  // computed value. Same shape as useStableDetections' expiry timer, for the same reason.
  const [camStale, setCamStale] = useState(false);
  useEffect(() => {
    if (ai.lastMs === null) {
      setCamStale(false); // never answered — `connected` already carries that, and it is not staleness
      return;
    }
    const remainingMs = ai.lastMs + CAM_STALE_MS - Date.now();
    if (remainingMs <= 0) {
      setCamStale(true);
      return;
    }
    setCamStale(false);
    const timer = setTimeout(() => setCamStale(true), remainingMs + 50);
    return () => clearTimeout(timer);
  }, [ai.lastMs]);

  /** The detector is answering AND its newest frame is recent enough to still describe the water. */
  const camFresh = ai.connected && ai.lastMs !== null && !camStale;

  const cameraDetections = useMemo<CameraDetectionInput[]>(() => {
    const frame = ai.frame;
    if (!frame) return [];
    // A stale or disconnected detector contributes NOTHING to the plot. Dropped outright rather than
    // dimmed: a wedge is already a low-information mark, and a faded one on a tactical polar display
    // is not reliably distinguishable from a live one at a glance.
    if (!camFresh) return [];
    // The hook holds its last frame across a feedId change, so a pano frame can survive a flip to the
    // raw ring composite and then be re-read under quad360 tile geometry — which would misplace every
    // bearing on the plot. Only a frame the CURRENT source actually produced may be projected.
    if (frame.feedId !== camSource) return [];
    // The DETECTOR's own frame dims are authoritative — the pano is 3840×540 and renders letterboxed,
    // so anything measured in the browser would misplace every bearing. No dims ⇒ no geometry ⇒
    // detectionBearing refuses and the contacts are dropped, which is the honest outcome.
    const geometry: TrackGeometry = {
      frameW: frame.frameW ?? 0,
      frameH: frame.frameH ?? 0,
      cols: quad.quad?.cols,
      rows: quad.quad?.rows,
      tileOrder: quad.quad?.tileOrder,
      mountBearingsDeg: quad.mountBearingsDeg ?? undefined,
      fovDeg: quad.fovDeg,
      headingDeg,
    };
    return frame.detections.map((det) => ({ det, source: camSource, geometry }));
  }, [ai.frame, camFresh, quad.quad, quad.mountBearingsDeg, quad.fovDeg, camSource, headingDeg]);

  const wifiInputs = useMemo<WifiContactInput[]>(() => {
    // Telemetry's wifi layer contributes BEARING ONLY — see the header note on discarded range.
    const fromTelemetry = telemetry.bluesight.wifi.map((c): WifiContactInput => ({
      id: `tlm:${c.id}`,
      bearingRelDeg: fin(c.bearingDeg),
      label: c.label ?? "RF emitter",
      strength: c.strength,
    }));
    return [...wifi.withBearing, ...fromTelemetry];
  }, [wifi.withBearing, telemetry.bluesight.wifi]);

  const contacts = useMemo(
    () =>
      projectToFusion({
        headingDeg,
        radar: telemetry.radar.contacts,
        lidar: telemetry.lidar.contacts,
        tof: tof.faces,
        rangefinder: rangefinder.readings,
        mmwave: mmwave.targets,
        cameraDetections,
        wifi: wifiInputs,
      }),
    [
      headingDeg,
      telemetry.radar.contacts,
      telemetry.lidar.contacts,
      tof.faces,
      rangefinder.readings,
      mmwave.targets,
      cameraDetections,
      wifiInputs,
    ],
  );

  // Layer toggles filter BEFORE fusion: hiding radar must also remove the "camera + radar" pairing it
  // produced, otherwise the plot would keep asserting a range whose source is no longer on screen.
  const visible = useMemo(() => contacts.filter((c) => enabled[c.sensor]), [contacts, enabled]);
  const tracks = useMemo(() => fuseByBearing(visible), [visible]);

  // ── honest per-layer status, whether or not the layer produced anything ──────────────────────────
  const layers = useMemo<LayerState[]>(() => {
    const countOf = (s: FusionSensor) => contacts.filter((c) => c.sensor === s).length;

    const lidarBody = lidarFrame.data?.status === 200 && isRecord(lidarFrame.data.body) ? lidarFrame.data.body : null;
    const lidarHw = lidarBody ? str(lidarBody.hardware) : null;
    const lidarPts = lidarBody ? fin(lidarBody.count) : null;

    const camStatus = (): { status: string; absent: boolean } => {
      if (!ai.enabled) return { status: "detector overlay off (NEXT_PUBLIC_FUSARIUM_GCS_CAM_AI)", absent: true };
      // `lastMs === null` = the detector has never answered in this session. That covers both "still
      // connecting" and "dead", which the hook cannot distinguish for us — so state the fact (no
      // answer) rather than the diagnosis (unreachable), which would be a guess for the first second
      // of every mount. Either way it is not an all-clear.
      if (!ai.connected) {
        return {
          status: ai.lastMs === null ? "detector has not answered — not an all-clear" : "detector unreachable — not an all-clear",
          absent: true,
        };
      }
      // Answering, but the newest frame has aged out (polling pauses while the tab is hidden, and a
      // service can hang mid-stream without dropping the connection). The wedges are already gone
      // from the plot — say why here, or the row would read as a live camera watching empty water.
      if (!camFresh) {
        return { status: `no frame in the last ${CAM_STALE_MS / 1000}s — bearings dropped until it reports again`, absent: true };
      }
      if (ai.frame && ai.frame.frameW === null) {
        return { status: "detector reported no frame size — bearings cannot be derived", absent: true };
      }
      const n = countOf("camera");
      const raw = ai.frame?.detections.length ?? 0;
      if (n === 0 && raw > 0) {
        return { status: `${raw} box(es), none bearable — ${camSource === "pano" ? "pano geometry incomplete" : "feed reports no FOV"}`, absent: true };
      }
      return { status: `${camSource} · ${n} bearing${n === 1 ? "" : "s"} · no range (camera cannot measure it)`, absent: false };
    };

    const tofStatus = (): { status: string; absent: boolean; pending?: boolean } => {
      if (tofPending) return { status: "querying the sensor service — state not yet known", absent: true, pending: true };
      const n = countOf("tof");
      // Per-source phrasing. This lane carries two physically different sensor groups (the VL53L1X
      // ring and the TF-Luna slots); one being absent — or unreachable — says nothing about the
      // other, and a single merged verdict previously reported "no hardware" while the TF-Luna was
      // live and answering. The unreachable branch is phrased FIRST because a failed source carries
      // configured=0, and "ring present (0/0)" would be a claim its endpoint never made.
      const parts = tof.sources.map((s) =>
        s.unreachable
          ? `${s.label} unreachable`
          : s.hardware === "present"
            ? `${s.label} present (${s.returning}/${s.configured})`
            : `${s.label} ${s.hardware ?? "absent"}`,
      );
      const summary = parts.length > 0 ? parts.join(" · ") : `${tof.configured} face(s) configured`;

      if (n > 0) return { status: `${n} of ${tof.configured} returning · ${summary}`, absent: false };

      // Present hardware that produced no VALID range is REPORTING, not absent — it is answering and
      // telling us it has no usable return (open water, or inside the sensor's dead zone). Marking it
      // absent would make a working sensor look unfitted, and would let a truly dead one hide here.
      if (tof.sources.some((s) => s.hardware === "present")) {
        return { status: `${summary} — no valid return (gated or out of range)`, absent: false };
      }
      // Only condemn the LANE when every source that spoke failed. One endpoint down while the other
      // reports is a partial outage, and the summary above already names which half is missing.
      if (tof.sources.length > 0 && tof.sources.every((s) => s.unreachable)) {
        return { status: `sensor service unreachable — ${summary}`, absent: true };
      }
      // No present hardware among the sources that ANSWERED. An unreachable source's state is
      // genuinely unknown, so the claim is scoped to what answered rather than made about the lane.
      if (tof.sources.some((s) => s.unreachable)) {
        return { status: `no hardware from the source that answered — ${summary}`, absent: true };
      }
      return { status: `no hardware — ${summary}`, absent: true };
    };

    const wifiStatus = (): { status: string; absent: boolean; pending?: boolean } => {
      if (wifiPending) return { status: "querying the sensor service — state not yet known", absent: true, pending: true };
      if (wifi.unreachable) return { status: "sensor service unreachable", absent: true };
      const n = countOf("wifi");
      const heard = wifi.heard;
      if (n > 0) return { status: `${n} bearing(s) from AoA · ${heard} radio(s) heard · range never measured`, absent: false };
      return { status: `no AoA hardware — ${heard} radio(s) heard but not locatable`, absent: true };
    };

    /**
     * mmWave (LD2450).
     *
     * The distinction that matters here: a module that is FRAMING but sees nothing is **reporting**,
     * not absent. `absent` on this panel means "no hardware / cannot tell" — collapsing "working,
     * detects no motion" into it would make a live sensor look dead, and would also let a genuinely
     * dead one hide among the quiet ones.
     *
     * Equally, "no movement" is NOT "clear". This sensor resolves motion only: a stationary hull, a
     * moored vessel, a piling — all invisible to it. The status says so in words, because an operator
     * reading "0 contacts" as clear water is the exact failure the whole panel is built to prevent.
     */
    const mmwaveStatus = (): { status: string; absent: boolean; pending?: boolean } => {
      if (mmwavePending) return { status: "querying the sensor service — state not yet known", absent: true, pending: true };
      if (mmwave.unreachable) return { status: "sensor service unreachable", absent: true };
      const n = countOf("mmwave");
      const range = mmwave.maxRangeM ?? 6;
      if (n > 0) {
        return { status: `${n} mover(s) · bearing + range · movement only, to ${range} m`, absent: false };
      }
      if (mmwave.hardware === "present") {
        const frames = mmwave.framesOk !== null ? ` · ${mmwave.framesOk} frames` : "";
        return {
          status: `present${frames} — no movement in ${range} m field · static objects are invisible to it`,
          absent: false,
        };
      }
      const hw = mmwave.hardware ?? "absent";
      return { status: `no hardware (${hw}) — ${mmwave.slots} slot(s) configured`, absent: true };
    };

    const rangefinderStatus = (): { status: string; absent: boolean; pending?: boolean } => {
      if (rangefinderPending) {
        return { status: "querying the sensor service — state not yet known", absent: true, pending: true };
      }
      if (rangefinder.unreachable) return { status: "sensor service unreachable", absent: true };
      const n = countOf("rangefinder");
      if (n > 0) {
        return {
          status: `${n} return(s) · under-camera pencil beam · bearing + range`,
          absent: false,
        };
      }
      const hw = rangefinder.hardware ?? "absent";
      return {
        status: `no range (${hw}) — ${rangefinder.configured} mount(s) configured · null until wired + protocolVerified`,
        absent: true,
      };
    };

    const cam = camStatus();
    const t = tofStatus();
    const w = wifiStatus();
    const mw = mmwaveStatus();
    const rf = rangefinderStatus();

    const rows: LayerState[] = [
      {
        sensor: "radar",
        status: telemetry.radar.active ? `${countOf("radar")} contact(s) · bearing + range` : "feed inactive — no returns being received",
        absent: !telemetry.radar.active,
        count: countOf("radar"),
      },
      {
        sensor: "lidar",
        status: telemetry.lidar.active
          ? `${countOf("lidar")} contact(s) · bearing + range`
          : lidarHw === null
            ? lidarPending
              ? "feed inactive · querying the sensor service"
              : "feed inactive · sensor service unreachable"
            : `no hardware (${lidarHw}) — ${lidarPts ?? 0} point(s) in the last frame`,
        absent: !telemetry.lidar.active,
        count: countOf("lidar"),
      },
      { sensor: "tof", status: t.status, absent: t.absent, pending: t.pending, count: countOf("tof") },
      {
        sensor: "rangefinder",
        status: rf.status,
        absent: rf.absent,
        pending: rf.pending,
        count: countOf("rangefinder"),
      },
      { sensor: "mmwave", status: mw.status, absent: mw.absent, pending: mw.pending, count: countOf("mmwave") },
      { sensor: "camera", status: cam.status, absent: cam.absent, count: countOf("camera") },
      { sensor: "wifi", status: w.status, absent: w.absent, pending: w.pending, count: countOf("wifi") },
    ];
    return rows.filter((l) => LAYERS.includes(l.sensor));
  }, [
    contacts, telemetry.radar.active, telemetry.lidar.active, lidarFrame.data, lidarPending,
    ai.enabled, ai.connected, ai.frame, ai.lastMs, camFresh, camSource, tof, tofPending, wifi, wifiPending,
    mmwave, mmwavePending, rangefinder, rangefinderPending,
  ]);

  // ── range scale: the furthest sensor that actually MEASURED something, else radar's outer ring ───
  const { scaleM, scaleFrom } = useMemo(() => {
    // Only a real measurement may set the scale — a bearing-only contact must not stretch the rings.
    const measured = tracks.flatMap((t) => t.members).filter((m) => plottableRangeM(m) !== null);
    if (measured.length === 0) {
      const fallback = telemetry.radar.maxRangeM > 0 ? telemetry.radar.maxRangeM : 100;
      return { scaleM: fallback, scaleFrom: "radar max range (nothing measured)" };
    }
    let far = measured[0];
    for (const m of measured) if ((plottableRangeM(m) as number) > (plottableRangeM(far) as number)) far = m;
    return { scaleM: niceCeil((plottableRangeM(far) as number) * 1.15), scaleFrom: `furthest measured return (${SENSOR_NAME[far.sensor]})` };
  }, [tracks, telemetry.radar.maxRangeM]);

  const reporting = layers.filter((l) => !l.absent);
  /** Genuinely unknown — asked, no answer yet. Must not be counted as absent. */
  const querying = layers.filter((l) => l.absent && l.pending);
  const notReporting = layers.filter((l) => l.absent && !l.pending);
  /** Contacts a sensor DID report that the operator's own layer toggles are keeping off the plot. */
  const hidden = contacts.length - visible.length;

  // ── pano ↔ ruler ↔ plot bearing alignment ───────────────────────────────────────────────────────
  //
  // The strip is a BEARING AXIS only while the pano is drawn edge to edge, i.e. x / width === bearing
  // / 360. `object-cover` guarantees that only while the container is at least as wide as the pano's
  // aspect ratio demands at the strip's height; any narrower and cover scales to the HEIGHT, overflows
  // horizontally and centre-crops — at which point every tick on the ruler, and the operator's whole
  // read of "that contact, there on the horizon", points at the wrong pixels with nothing on screen
  // saying so.
  //
  // That is not a theoretical width. The console's centre column is `viewport − (208|256) − (240|288)
  // − 18`, so a 1024-wide window gives the strip ~462 px and a 768-wide one ~302 px, against the
  // ~626 px a 3840×540 pano needs at 88 px tall. iPad landscape lands squarely inside the broken band.
  //
  // So the height FOLLOWS the width: shrink the strip until cover fills the width exactly. The pano's
  // true dimensions come from the DETECTOR frame — the only authoritative source we have for them,
  // since the rig contract reports the raw composite's size, not the stitch's. Without them we cannot
  // verify the fit, and an unverified alignment is stated as unverified rather than assumed.
  const STRIP_MAX_H = 88;
  const STRIP_MIN_H = 36;
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripW, setStripW] = useState(0);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    // Width only: the height is ours to set, so observing it too would be a feedback loop.
    const read = () => setStripW((prev) => {
      const w = el.getBoundingClientRect().width;
      return Math.abs(w - prev) < 0.5 ? prev : w;
    });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, []);

  // Deliberately NOT gated on camera freshness: the pano's dimensions are a static property of the
  // source, so a dead detector must not collapse the strip and flip the caption to "fit unverified".
  // It IS gated on the frame having come from the pano source — a retained quad360 frame's dims read
  // as a pano aspect would mis-scale the strip while the caption still claimed x = bearing, which the
  // header calls the same class of error as a fabricated range.
  const panoAspect = useMemo(() => {
    if (camSource !== "pano") return null;
    if (ai.frame?.feedId !== camSource) return null;
    const w = ai.frame?.frameW ?? null;
    const h = ai.frame?.frameH ?? null;
    return w !== null && h !== null && w > 0 && h > 0 ? w / h : null;
  }, [camSource, ai.frame]);

  const stripH =
    panoAspect !== null && stripW > 0
      ? Math.max(STRIP_MIN_H, Math.min(STRIP_MAX_H, Math.floor(stripW / panoAspect)))
      : STRIP_MAX_H;
  /** True only when we KNOW the pano spans the strip edge to edge — never assumed. */
  const stripAligned = panoAspect !== null && stripW > 0 && stripW / stripH >= panoAspect - 1e-6;

  // ── canvas ──────────────────────────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setBox({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || box.w <= 0 || box.h <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(box.w * dpr));
    canvas.height = Math.max(1, Math.floor(box.h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);

    const cx = box.w / 2;
    const cy = box.h / 2;
    const radius = Math.max(30, Math.min(box.w, box.h) / 2 - 26);
    // Bow-up: relative bearing 0° points straight up the screen.
    const ang = (relDeg: number) => (relDeg - 90) * RAD;
    const rPix = (m: number) => Math.min(1, m / scaleM) * radius;

    // ── graticule ────────────────────────────────────────────────────────────────────────────────
    ctx.lineWidth = 1;
    ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
    const rings = 4;
    for (let i = 1; i <= rings; i++) {
      const r = (radius * i) / rings;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = i === rings ? "rgba(56,189,248,0.30)" : "rgba(56,189,248,0.14)";
      ctx.stroke();
      ctx.fillStyle = "rgba(125,211,252,0.65)";
      ctx.textAlign = "left";
      ctx.fillText(rangeText((scaleM * i) / rings), cx + 3, cy - r + 11);
    }

    // 30° graticule + cardinal-relative labels
    ctx.strokeStyle = "rgba(56,189,248,0.10)";
    ctx.beginPath();
    for (let d = 0; d < 360; d += 30) {
      const a = ang(d);
      ctx.moveTo(cx + Math.cos(a) * radius * 0.06, cy + Math.sin(a) * radius * 0.06);
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(148,163,184,0.75)";
    ctx.textAlign = "center";
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.fillText("BOW 000", cx, cy - radius - 8);
    ctx.font = "9px ui-monospace, monospace";
    ctx.fillText("090", cx + radius + 12, cy + 3);
    ctx.fillText("180", cx, cy + radius + 12);
    ctx.fillText("270", cx - radius - 12, cy + 3);

    // Where TRUE north lies on a bow-up plot — only when the heading is actually known.
    if (headingDeg !== null) {
      const northRel = ((-headingDeg % 360) + 360) % 360;
      const a = ang(northRel);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (radius - 8), cy + Math.sin(a) * (radius - 8));
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      ctx.strokeStyle = "rgba(226,232,240,0.65)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(226,232,240,0.75)";
      ctx.fillText("N", cx + Math.cos(a) * (radius + 11), cy + Math.sin(a) * (radius + 11) + 3);
    }

    // ── pass 1: bearing-only members → wedges to the plot edge ───────────────────────────────────
    // The dot/wedge decision is made by `plottableRangeM`, never by `m.rangeM` alone: a range that
    // does not belong to a range-measuring sensor is not a position, so it can never earn a dot.
    for (const t of tracks) {
      const fixR = t.rangeM === null ? null : rPix(t.rangeM);
      for (const m of t.members) {
        if (plottableRangeM(m) !== null) continue;
        const color = SENSOR_COLOR[m.sensor];
        const half = m.wedgeHalfDeg;

        if (half === null || half <= 0) {
          // Angular width unknown — a hairline ray, never an assumed sector width.
          const a = ang(m.bearingRelDeg);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.55;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          continue;
        }

        const a0 = ang(m.bearingRelDeg - half);
        const a1 = ang(m.bearingRelDeg + half);
        const sector = (r0: number, r1: number) => {
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
          ctx.arc(cx, cy, r1, a0, a1);
          ctx.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0);
          if (r0 > 0) ctx.arc(cx, cy, r0, a1, a0, true);
          ctx.closePath();
        };

        // Fused: the part of the wedge the measuring sensor RESOLVED is drawn solid, and the part
        // beyond it — still genuinely unknown — stays faded. This is the pairing, made visible.
        if (fixR !== null) {
          sector(0, fixR);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.22;
          ctx.fill();
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = color;
          ctx.stroke();
          sector(fixR, radius);
          ctx.globalAlpha = 0.06;
          ctx.fill();
          ctx.globalAlpha = 0.35;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        } else {
          sector(0, radius);
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          grad.addColorStop(0, `${color}44`);
          grad.addColorStop(1, `${color}08`);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = color;
          ctx.setLineDash([5, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── pass 2: range-measuring members → dots at (bearing, range) ───────────────────────────────
    for (const t of tracks) {
      for (const m of t.members) {
        const fix = plottableRangeM(m);
        if (fix === null) continue;
        const a = ang(m.bearingRelDeg);
        const r = rPix(fix);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const color = SENSOR_COLOR[m.sensor];

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        if (m.sensor === "radar") {
          ctx.arc(x, y, 3.6, 0, Math.PI * 2);
        } else if (m.sensor === "lidar") {
          // diamond
          ctx.moveTo(x, y - 4.4);
          ctx.lineTo(x + 4.4, y);
          ctx.lineTo(x, y + 4.4);
          ctx.lineTo(x - 4.4, y);
          ctx.closePath();
        } else {
          // ToF — triangle, pointing outward along its own fixed face bearing
          const t0 = a;
          ctx.moveTo(x + Math.cos(t0) * 5, y + Math.sin(t0) * 5);
          ctx.lineTo(x + Math.cos(t0 + 2.4) * 5, y + Math.sin(t0 + 2.4) * 5);
          ctx.lineTo(x + Math.cos(t0 - 2.4) * 5, y + Math.sin(t0 - 2.4) * 5);
          ctx.closePath();
        }
        ctx.fillStyle = color;
        ctx.fill();
      }
    }

    // ── pass 3: track markers + labels ───────────────────────────────────────────────────────────
    ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
    for (const t of tracks) {
      const a = ang(t.bearingRelDeg);
      const identityColor = groupColor(t.group as MaritimeGroup);
      const bearingOnlyPartner = t.members.some((m) => plottableRangeM(m) === null);
      const paired = t.rangeM !== null && bearingOnlyPartner;

      const r = t.rangeM !== null ? rPix(t.rangeM) : radius * 0.84;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;

      if (paired) {
        // The headline case: identity from one sensor, range from another. Double marker so it is
        // unmistakably different from a single-sensor return.
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = identityColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.strokeStyle = identityColor;
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      }

      // Label placement: push outward along the bearing, and flip alignment across the vertical so a
      // contact on the port side does not run its text off the plot.
      const lx = cx + Math.cos(a) * (r + (paired ? 18 : 12));
      const ly = cy + Math.sin(a) * (r + (paired ? 18 : 12));
      ctx.textAlign = Math.cos(a) < -0.15 ? "right" : Math.cos(a) > 0.15 ? "left" : "center";

      const sensorTag = t.sensors.map((s) => (s === "camera" ? "cam" : s === "wifi" ? "rf" : s)).join("+");
      const head = paired
        ? `${t.label} · ${rangeText(t.rangeM as number)} · ${sensorTag}`
        : t.rangeM !== null
          ? `${t.label} · ${rangeText(t.rangeM)}`
          : t.label;

      ctx.fillStyle = paired ? identityColor : "rgba(226,232,240,0.85)";
      ctx.font = paired ? "bold 10px ui-monospace, monospace" : "9px ui-monospace, monospace";
      ctx.fillText(head, lx, ly);

      ctx.font = "8px ui-monospace, monospace";
      if (t.rangeM === null) {
        // Never let a bearing line read as a position.
        ctx.fillStyle = "rgba(251,191,36,0.9)";
        ctx.fillText(`${deg3(t.bearingRelDeg)}° · RANGE UNKNOWN`, lx, ly + 10);
      } else if (paired) {
        ctx.fillStyle = "rgba(148,163,184,0.85)";
        ctx.fillText(`range from ${t.rangeFromSensor ?? "?"} · id from ${t.sensors.includes("camera") ? "camera" : t.sensors[0]}`, lx, ly + 10);
      }
    }

    // ── own ship ─────────────────────────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 4.5, cy + 5);
    ctx.lineTo(cx, cy + 2.5);
    ctx.lineTo(cx - 4.5, cy + 5);
    ctx.closePath();
    ctx.fillStyle = "#e2e8f0";
    ctx.fill();
  }, [box, tracks, scaleM, headingDeg]);

  // ── render ──────────────────────────────────────────────────────────────────────────────────────
  const anyTrack = tracks.length > 0;

  return (
    <div className={cn("relative flex h-full w-full flex-col overflow-hidden bg-[#04070e]", className)}>
      {/* ── 360° PANORAMA strip, bearing-aligned with the plot below ──────────────────────────────
          `fit="cover"` is deliberate: the strip must show the FULL 0–360° horizontal extent edge to
          edge for x→bearing to hold, and contain would pillarbox a wide pano inside a wider strip and
          break that mapping. Cover crops vertically instead, which costs sky and sea, not bearing —
          but ONLY while the container is wide enough for its aspect, which is why the height is
          computed from the measured width above rather than fixed. */}
      <div ref={stripRef} className="relative shrink-0 border-b border-cyan-500/15" style={{ height: stripH }}>
        <LiveFeedSurface
          title="360° Panorama"
          src={panoUrl ?? quad.streamUrl}
          feedId={camSource}
          online={quad.online}
          fit="cover"
          showAi
          active={active}
          srcW={panoUrl ? null : quad.width}
          srcH={panoUrl ? null : quad.height}
          unavailableHint="Serve the Jetson CUDA stitch (quad360/pano) so the fused plot has a bearing-aligned horizon."
        />
      </div>

      {/* Bearing ruler — the seam between the pano and the plot. Ticks are RELATIVE bearings, and each
          plotted contact drops a coloured mark at its own bearing so a contact can be traced from the
          horizon strip down into the polar plot. */}
      <div className="relative h-5 shrink-0 bg-black/40">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
          <span
            key={d}
            className="pointer-events-none absolute top-0 h-full border-l border-cyan-500/20 pl-1 text-[8px] leading-5 text-slate-500"
            style={{ left: `${(d / 360) * 100}%` }}
          >
            {deg3(d)}
          </span>
        ))}
        {visible.map((c) => (
          <span
            key={`ruler-${c.id}`}
            title={`${c.label} · ${SENSOR_NAME[c.sensor]} · ${deg3(c.bearingRelDeg)}° rel`}
            className="pointer-events-none absolute bottom-0 h-2 w-0.5"
            style={{ left: `${(c.bearingRelDeg / 360) * 100}%`, backgroundColor: SENSOR_COLOR[c.sensor] }}
          />
        ))}
      </div>

      {/* The caption is a CLAIM about the strip above, so it has to track whether that claim is
          currently true. Three ways it can fail, none of which may pass silently: the pano is not
          being shown at all (raw ring composite — its x is cable order, not bearing), the strip is
          too narrow for the pano's aspect and cover has centre-cropped it, or we have no pano
          dimensions and therefore cannot verify either way.

          ITS OWN ROW, not an overlay on the ruler. Right-anchored inside the 20 px ruler it landed
          exactly on the 270°/315° tick labels at every width this console actually gets (the centre
          column is ~700 px at 1280 and ~300 px at 768 — see the alignment note above), so the text
          being overprinted was the amber "x is NOT bearing" warning itself, with the collision
          falling on the word NOT. Truncating it instead would clip the same word, and the caption is
          pointer-events-none so a title tooltip could not recover it. 16 px of height buys an
          honesty caption that is always fully legible. */}
      <div className="flex h-4 shrink-0 items-center justify-end border-b border-cyan-500/10 bg-black/40 px-1">
        {camSource !== "pano" ? (
          <span className="text-[8px] font-bold leading-none text-amber-300">ring composite · x is NOT bearing</span>
        ) : panoAspect === null ? (
          <span className="text-[8px] leading-none text-slate-500">pano x = bearing rel. bow · fit unverified</span>
        ) : !stripAligned ? (
          <span className="text-[8px] font-bold leading-none text-amber-300">strip cropped · x is NOT bearing</span>
        ) : (
          <span className="text-[8px] leading-none text-slate-600">pano x = bearing rel. bow</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── the fused polar plot ──────────────────────────────────────────────────────────────── */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <canvas ref={canvasRef} className="h-full w-full" />

          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded border border-cyan-500/20 bg-black/60 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-cyan-300/70">
            <Ruler className="h-2.5 w-2.5" /> 4 rings · {rangeText(scaleM)} · {scaleFrom}
          </div>

          {telemetry.simulated && (
            <div className="pointer-events-none absolute right-2 top-2 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-200">
              Simulation
            </div>
          )}

          {!anyTrack && (
            // "No contacts" from a console whose sensors are absent is NOT an all-clear, and this
            // panel must never be readable as one. Name what is and is not reporting, every time.
            // bottom-24 clears BlueSightView's own "Sensors STANDBY" chip, which is pinned at pb-10
            // across the whole view — two overlapping warnings render as one unreadable one.
            <div
              className={cn(
                "pointer-events-none absolute bottom-24 mx-auto rounded border border-amber-500/25 bg-black/75 py-2 text-center",
                // The 16 px side insets plus px-3 cost ~38 px, which is most of the column once the
                // console's two fixed asides squeeze the plot (~60 px at a 768-wide window). At that
                // width this warning renders as a one-glyph-wide vertical strip, and an all-clear
                // caveat nobody can read is not a caveat. Below the floor, take the whole column.
                box.w > 0 && box.w < 260 ? "inset-x-0.5 px-1" : "inset-x-4 max-w-md px-3",
              )}
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                <TriangleAlert className="h-3 w-3" /> No contacts plotted — this is not an all-clear
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
                {/* Three states, never two. "Reporting" is confirmed presence, "not reporting" is
                    confirmed absence, and "querying" is the honest middle — asked, no answer yet.
                    Saying "no sensor is reporting" while probes are still in flight asserts an
                    absence nobody has established, which on this panel is the error that matters. */}
                {reporting.length > 0
                  ? `Reporting: ${reporting.map((l) => `${SENSOR_NAME[l.sensor]} (${l.count})`).join(", ")}.`
                  : querying.length > 0 && notReporting.length === 0
                    ? "Querying sensors — no state confirmed yet."
                    : "No sensor is currently reporting."}
                {querying.length > 0 && ` Still querying: ${querying.map((l) => SENSOR_NAME[l.sensor]).join(", ")}.`}
                {notReporting.length > 0 && ` Not reporting: ${notReporting.map((l) => SENSOR_NAME[l.sensor]).join(", ")}.`}
              </p>
              {/* An operator who has hidden a layer must never read the resulting empty plot as an
                  empty sea. The counts above are what the sensors REPORTED; this line is what the
                  operator's own toggles are currently withholding from the plot. */}
              {hidden > 0 && (
                <p className="mt-1 text-[9px] font-bold leading-relaxed text-amber-200">
                  {hidden} contact{hidden === 1 ? " is" : "s are"} hidden by your layer toggles — turn the layers back on to see them.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── legend + layer toggles. Every sensor appears here whatever it is doing. ───────────── */}
        <div
          className={cn(
            "flex shrink-0 flex-col overflow-y-auto border-l border-cyan-500/15 bg-black/30",
            legendOpen ? "w-44 lg:w-56" : "w-7",
          )}
        >
          <button
            type="button"
            onClick={() => setLegendOpen((o) => !o)}
            title={legendOpen ? "Collapse the layer legend — give the plot the width" : "Expand the layer legend"}
            className="flex items-center gap-1 border-b border-cyan-500/10 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-200 transition-colors hover:bg-white/5"
          >
            {legendOpen ? <ChevronRight className="h-3 w-3 shrink-0" /> : <ChevronLeft className="h-3 w-3 shrink-0" />}
            {legendOpen && "Layers"}
          </button>

          {/* Collapsed: the counts still have to be on screen. A hidden legend must not turn a plot
              with dead sensors into one that merely looks quiet — "not reporting" is a claim the
              operator needs whether or not the rail is open, and "still querying" is not the same
              claim, so the two are never summed into one number. */}
          {!legendOpen && (notReporting.length > 0 || querying.length > 0) && (
            <div className="flex flex-col items-center gap-1 px-0.5 py-1">
              {notReporting.length > 0 && (
                <span
                  title={`Not reporting: ${notReporting.map((l) => SENSOR_NAME[l.sensor]).join(", ")} — this is not an all-clear`}
                  className="w-full rounded border border-amber-400/40 bg-amber-500/10 py-0.5 text-center text-[8px] font-bold text-amber-200"
                >
                  {notReporting.length}
                </span>
              )}
              {querying.length > 0 && (
                <span
                  title={`Still querying — state not yet known: ${querying.map((l) => SENSOR_NAME[l.sensor]).join(", ")}`}
                  className="w-full rounded border border-slate-400/40 bg-slate-500/10 py-0.5 text-center text-[8px] font-bold text-slate-300"
                >
                  ?
                </span>
              )}
            </div>
          )}

          {legendOpen && layers.map((l) => {
            const on = enabled[l.sensor];
            const bearingOnly = l.sensor === "camera" || l.sensor === "wifi";
            return (
              <button
                key={l.sensor}
                type="button"
                onClick={() => setEnabled((e) => ({ ...e, [l.sensor]: !e[l.sensor] }))}
                title={on ? `Hide ${SENSOR_NAME[l.sensor]}` : `Show ${SENSOR_NAME[l.sensor]}`}
                className={cn(
                  "flex flex-col gap-0.5 border-b border-white/5 px-2 py-1.5 text-left transition-colors hover:bg-white/5",
                  !on && "opacity-40",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-sm", bearingOnly && "rounded-none")}
                    style={{
                      backgroundColor: bearingOnly ? "transparent" : SENSOR_COLOR[l.sensor],
                      border: bearingOnly ? `1px dashed ${SENSOR_COLOR[l.sensor]}` : undefined,
                    }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-200">{SENSOR_NAME[l.sensor]}</span>
                  <span className="ml-auto text-[9px] text-slate-500">{bearingOnly ? "wedge" : "dot"}</span>
                </span>
                {/* The chip flags THAT the layer is contributing nothing; the sentence below says WHY.
                    They are kept separate deliberately — "not reporting" covers absent hardware, an
                    inactive feed and an unreachable detector, and collapsing them into one phrase
                    would assert a cause the status line may contradict. */}
                {l.absent && (
                  <span className="w-fit rounded border border-amber-400/40 bg-amber-500/10 px-1 text-[7.5px] font-bold uppercase tracking-wide text-amber-200">
                    not reporting
                  </span>
                )}
                <span className={cn("text-[8.5px] leading-snug", l.absent ? "text-amber-300/80" : "text-slate-500")}>
                  {l.status}
                </span>
              </button>
            );
          })}

          {legendOpen && (
            <>
              <div className="border-b border-white/5 px-2 py-1.5 text-[8.5px] leading-relaxed text-slate-500">
                <span className="mb-0.5 flex items-center gap-1 font-bold uppercase tracking-wide text-slate-400">
                  <RadarIcon className="h-2.5 w-2.5" /> <ScanEye className="h-2.5 w-2.5" /> dot = measured range
                </span>
                <span className="flex items-center gap-1 font-bold uppercase tracking-wide text-slate-400">
                  <CameraIcon className="h-2.5 w-2.5" /> <Wifi className="h-2.5 w-2.5" /> wedge = bearing only, range unknown
                </span>
              </div>

              {/* Fused tracks, in words. The plot shows the geometry; this says what was concluded and why. */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-200">
                  Tracks · {tracks.length}
                </div>
                {tracks.length === 0 ? (
                  <p className="px-2 pb-2 text-[8.5px] leading-relaxed text-slate-600">
                    Nothing projected into the fusion frame this update.
                  </p>
                ) : (
                  tracks.map((t: FusedTrack) => (
                    <div key={t.id} className="border-b border-white/5 px-2 py-1.5">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: groupColor(t.group as MaritimeGroup) }} />
                        <span className="truncate text-[9.5px] font-bold text-slate-200">{t.label}</span>
                        {t.corroborated && (
                          <span className="ml-auto shrink-0 rounded border border-cyan-500/40 bg-cyan-500/10 px-1 text-[7.5px] font-bold uppercase text-cyan-200">
                            fused
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {t.members.map((m: FusionContact) => (
                          <span
                            key={m.id}
                            className="rounded px-1 text-[7.5px] font-bold uppercase"
                            style={{ color: SENSOR_COLOR[m.sensor], border: `1px solid ${SENSOR_COLOR[m.sensor]}55` }}
                          >
                            {m.sensor}
                            {plottableRangeM(m) === null ? " · brg" : ` · ${rangeText(plottableRangeM(m) as number)}`}
                          </span>
                        ))}
                      </span>
                      <p className="mt-0.5 text-[8px] leading-relaxed text-slate-500">{t.assessment}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
