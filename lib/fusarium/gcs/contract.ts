/**
 * Psathyrella Buoy — Front-end ↔ Back-end Telemetry & Command Contract
 * ====================================================================
 * Date: 2026-06-25
 *
 * This file is the single source of truth shared between the Psathyrella
 * ground-control-station (front-end, Claude Code) and the MAS/MycoBrain/Jetson
 * backend (Cursor). Every telemetry field the GCS renders and every command the
 * GCS dispatches is declared here. The companion human-readable spec lives at
 * `docs/PSATHYRELLA_FRONTEND_BACKEND_CONTRACT_JUN25_2026.md`.
 *
 * NO-MOCK-DATA POLICY: the GCS binds to live endpoints below. When a field is
 * unavailable it is `null` and the UI shows a "STANDBY / AWAITING FEED" state —
 * it is never faked. The only exception is an explicit, off-by-default,
 * watermarked SIMULATION mode (`telemetry.simulated === true`).
 */

// ── Device identity / anchor ────────────────────────────────────────────────
// Flipped to psathyrella-1 (Jul 03 2026) — MAS now serves the Mushroom 1 Jetson under this id.
// The command BFF still aliases psathyrella-buoy-com4 / mycobrain-COM4 for mid-migration safety.
export const PSATHYRELLA_DEVICE_ID = "fusarium-gcs-unbound";
export const PSATHYRELLA_PORT = "UNBOUND";
export const PSATHYRELLA_REGISTRY_ID = "fusarium-gcs-unbound";
/** Project Oyster, North Reef — buoy home anchor. */
export const PROJECT_OYSTER_ANCHOR = { lat: 32.56289, lon: -117.1357 } as const;

// ── Live endpoints the GCS consumes (implemented by Cursor's backend) ────────
export const ENDPOINTS = {
  /**
   * GET — BME688 A/B. ⚠ THIS ROUTE IS NOT SERVING THE BUOY. It proxies `MYCOBRAIN_SERVICE_URL`,
   * the Windows-local serial daemon on :8003, which has answered `devices_connected: 0` and 404'd
   * `/devices/mycobrain-COM4` ever since the MycoBrain moved onto the Jetson. The daemon failure
   * comes back as HTTP 200 with an error body carrying no `sensors` key, so `useBuoyTelemetry`
   * leaves `bme.a`/`bme.b` null and the environmental panel reads STANDBY. That is the honest
   * outcome of a dead feed, but on screen it is indistinguishable from "no sensor fitted" while a
   * healthy, calibrating BME688 A is in fact streaming.
   *
   * The live readings are on the Jetson telemetry hub (`PSATHYRELLA_TELEMETRY_HUB_URL`, :8790) at
   * `status.lastSensorReading`. Repointing needs a new owner-gated same-origin proxy — mirror
   * `app/api/fusarium/gcs/droid-systems/route.ts` (probeFresh is mandatory on this LAN) and emit
   * this route's `{ sensors: { bme688_1, bme688_2 }, timestamp }` shape, with `timestamp` set to
   * the READING's own ts so StatusBar's >30 s stale watermark still fires on a frozen hub frame.
   * Side B publishes a transport-status frame only — not one BME field — so `bme.b` stays null;
   * `serialBConnected: true` means the Side B serial link is up, NOT that a BME688 B is reporting.
   *
   * (The "works today" claim that stood on this line predates the migration and was false as read.)
   */
  /**
   * ✅ REPOINTED Aug 03 2026 to the live Jetson telemetry hub.
   *
   * Was `/api/mycobrain/${PSATHYRELLA_PORT}/sensors`, which proxied the Windows-local serial daemon
   * on :8003. That daemon has not seen the MycoBrain since it moved onto the Jetson — verified live:
   * `{"devices":[],"count":0}`, 404 on `/devices/mycobrain-COM4`. The environmental panel therefore
   * read STANDBY while a healthy BME688 streamed 25.5 °C / 48.9 %RH / 648 hPa on the hub, and on
   * screen a dead FEED was indistinguishable from absent HARDWARE.
   */
  sensors: `/api/fusarium/gcs/bme`,
  /** GET — device registry: position, online/source (works today). */
  devices: `/api/earth-simulator/devices`,
  /** POST — command bus (MDP side_a/side_b for nav/cam — Cursor's MQTT→Jetson handlers). */
  command: `/api/fusarium/gcs/command`,
  /**
   * POST — canonical peripheral control (same bus the Earth-Sim DeviceWidget uses → MQTT/serial →
   * device). Its peripheral switch implements exactly `neopixel`, `buzzer`, `led`, `acoustic` and
   * `command`; ANY other `peripheral` name returns HTTP 400 "Unknown peripheral" before a backend
   * is contacted. Do not invent a name here without landing the matching case in that route.
   */
  control: `/api/fusarium/gcs/control`,
  /** GET — fused nav/propulsion/comms/power/scope telemetry envelope (MAS 188). */
  telemetry: `/api/fusarium/gcs/telemetry`,
  /** GET (SSE) — live telemetry push, passthrough to MAS /stream. Additive accelerator over the poll. */
  stream: `/api/fusarium/gcs/stream`,
  /** WS (planned) — reserved; SSE `stream` is the live path today. */
  ws: `/api/fusarium/gcs/ws`,
} as const;

// ── Link state ───────────────────────────────────────────────────────────────
export type LinkState = "online" | "stale" | "offline" | "unknown";

// ── BME688 environmental reading (mirrors ParsedBmeSensor) ───────────────────
export interface BmeReading {
  temperature: number | null; // °C
  humidity: number | null; // %
  pressure: number | null; // hPa
  gasResistance: number | null; // Ω
  iaq: number | null;
  iaqAccuracy: number | null;
  co2Equivalent: number | null; // ppm
  vocEquivalent: number | null; // ppm
  present: boolean;
  address: string | null; // "0x77" | "0x76"
  label: string | null;
}

// ── Pose / motion ─────────────────────────────────────────────────────────────
export type GpsLock = "locked" | "drift" | "unavailable" | "manual" | "site";
export interface BuoyPose {
  lat: number | null;
  lon: number | null;
  headingDeg: number | null; // bow heading, 0 = true north
  speedKn: number | null;
  depthM: number | null;
  gpsLock: GpsLock;
}

// ── Magnetometer (Bosch BMM150 on the MycoBrain I²C bus) ─────────────────────
/**
 * A 3-axis geomagnetic reading.
 *
 * ⚠ A magnetometer ALONE IS NOT A COMPASS. Converting a field vector into a heading requires tilt
 * compensation from an accelerometer, and on a buoy that pitches and rolls continuously an
 * uncompensated "heading" swings with sea state rather than with the bow. Bosch's own ±2.5° heading
 * spec (BST-BMM150-DS001-05) is footnoted "a fully calibrated sensor and ideal tilt compensation".
 *
 * So `magneticBearingDeg` is populated ONLY when the backend both calibrated the sensor and applied
 * tilt compensation. When either is false it stays null and consumers must render the raw field
 * instead — never a bearing. `BuoyPose.headingDeg` remains the single authority for true bearings;
 * this is a cross-check against it, not a replacement for it.
 */
export interface MagnetometerReading {
  present: boolean;
  /** Raw field vector in microtesla, body frame. Always populated when present. */
  microTesla: { x: number; y: number; z: number } | null;
  /** Total field magnitude µT. Earth's is ~25–65 µT — a wildly larger value means local iron. */
  magnitudeUt: number | null;
  /** Populated ONLY when calibrated && tiltCompensated. Null otherwise, always. */
  magneticBearingDeg: number | null;
  calibrated: boolean;
  /** False until an accelerometer/IMU is fused in. Gates `magneticBearingDeg` — see the note above. */
  tiltCompensated: boolean;
  /** Backend's own words for why a bearing is unavailable, shown verbatim rather than paraphrased. */
  status: string | null;
  i2cAddress: string | null;
}

// ── Propulsion — 4 vectored thrusters (omnidirectional USV) ──────────────────
export type ThrusterId = 0 | 1 | 2 | 3;
export interface ThrusterState {
  id: ThrusterId;
  label: string; // "BOW-P" | "BOW-S" | "AFT-P" | "AFT-S"
  throttlePct: number; // -100..100 (signed; reverse allowed)
  azimuthDeg: number; // 0..360 thrust vector direction
  currentA: number | null;
  rpm: number | null;
  faulted: boolean;
}
export interface CommandedVector {
  headingDeg: number; // desired translation heading 0..360
  magnitudePct: number; // 0..100
  yawRateDegS: number; // + = clockwise spin
}
export interface PropulsionState {
  thrusters: ThrusterState[];
  commandedVector: CommandedVector | null;
}

// ── Autonomy (ArduSub-aligned modes) ─────────────────────────────────────────
export type AutonomyMode =
  | "MANUAL"
  | "STABILIZE"
  | "DEPTH_HOLD"
  | "STATION_KEEP"
  | "GUIDED"
  | "AUTO"
  | "SIGNAL_FOLLOW"
  | "RTL";

export const AUTONOMY_MODES: AutonomyMode[] = [
  "MANUAL",
  "STABILIZE",
  "STATION_KEEP",
  "GUIDED",
  "AUTO",
  "SIGNAL_FOLLOW",
  "DEPTH_HOLD",
  "RTL",
];

export interface Waypoint {
  id: string;
  lat: number;
  lon: number;
  label?: string;
  loiter?: "none" | "hold" | "circle";
}
export interface AutonomyState {
  mode: AutonomyMode;
  armed: boolean;
  waypoints: Waypoint[];
  activeWaypointId: string | null;
  cameraHoldBearingDeg: number | null; // point-camera-and-hold
  fightCurrent: boolean;
  /** Behaviour when the comms link is lost: return-to-launch, hold position, or continue mission. */
  commsLossPolicy: "rtl" | "hold" | "continue";
  /** Id of the MissionPlan currently executing (null = manual / no plan). */
  activeMissionId: string | null;
}

// ── Power / solar ─────────────────────────────────────────────────────────────
export interface PowerState {
  solarInputW: number | null;
  panelTempC: number | null;
  batterySocPct: number | null;
  batteryVoltage: number | null;
  loadW: number | null;
  estRuntimeH: number | null;
  /** True when the buoy should rotate/translate to improve solar intake. */
  sunRepositionSuggested: boolean;
}

// ── Comms — RF stack + acoustic bridge + satellite ───────────────────────────
export type RadioKind = "ble" | "cellular" | "wifi" | "lora" | "iridium" | "starlink";
export const RADIO_LABEL: Record<RadioKind, string> = {
  ble: "BLE",
  cellular: "4G/LTE",
  wifi: "WIFI",
  lora: "LoRa",
  iridium: "Iridium",
  starlink: "Starlink",
};
// C2 bearer policy (per Cursor pool-drive guidance): bench = Wi-Fi, pool = 4G/LTE cellular are the
// PRIMARY command-and-control links; LoRa is the SECONDARY long-range / comms-denied fallback; the
// satellite bearers stay STANDBY until a real modem is wired. Lower priority = preferred when several
// radios are connected (so the active-bearer pick is cellular > wifi > ble > lora, not strongest-RSSI).
export const BEARER_PRIORITY: Record<RadioKind, number> = {
  cellular: 0, wifi: 1, ble: 2, lora: 3, iridium: 4, starlink: 5,
};
export type BearerTier = "primary" | "secondary" | "standby";
export const BEARER_TIER: Record<RadioKind, BearerTier> = {
  cellular: "primary", wifi: "primary", ble: "secondary", lora: "secondary", iridium: "standby", starlink: "standby",
};
export interface RadioLink {
  kind: RadioKind;
  connected: boolean;
  rssiDbm: number | null;
  latencyMs: number | null;
  throughputKbps: number | null;
}
/** Beyond-line-of-sight satellite bearer state (Iridium SBD or Starlink). */
export interface SatelliteState {
  bearer: "iridium" | "starlink" | null;
  connected: boolean;
  rssiDbm: number | null;
  credits: number | null; // remaining SBD credits / data allowance
  mtQueued: number; // mobile-terminated (ground→buoy) messages queued
  moQueued: number; // mobile-originated (buoy→ground) messages queued
  lastContactMsAgo: number | null;
  nextPassEtaS: number | null; // seconds to next usable pass (Iridium LEO)
}
/** Underwater acoustic transducer modem (the RF↔acoustic bridge endpoint). */
export interface AcousticLink {
  connected: boolean;
  carrierKhz: number | null;
  snrDb: number | null;
  rangeM: number | null;
  lastPingMsAgo: number | null;
}
export interface HydrophoneState {
  levelDb: number | null; // broadband level
  peakBearingDeg: number | null; // bearing of strongest signal
  bandHz: { lo: number; hi: number } | null;
  gainDb: number | null; // current analog/digital gain applied to the array
  spectrum: number[] | null; // current FFT bin levels 0..1 (~48 bins, live waterfall)
}
export interface CommsState {
  radios: RadioLink[];
  acoustic: AcousticLink;
  hydrophone: HydrophoneState;
  /** Beyond-line-of-sight satellite bearer (Iridium SBD / Starlink). */
  satellite: SatelliteState;
  /** RF ↔ acoustic translation actively bridging surface and subsurface. */
  bridgeActive: boolean;
  lastUplink: { atMsAgo: number | null; summary: string | null } | null;
}

// ── Sensor contacts (for the lidar / radar / bluesight scopes) ───────────────
export type ContactKind =
  | "vessel"
  | "obstacle"
  | "buoy"
  | "acoustic"
  | "wifi"
  | "landmass"
  | "unknown";
export interface SensorContact {
  id: string;
  bearingDeg: number; // relative to bow, 0..360
  rangeM: number;
  kind: ContactKind;
  strength: number; // 0..1 normalized return strength
  label?: string;
  classifiedAs?: string; // NLM / YOLO classification
  /** Tamper-evident provenance for this contact (surfaced later; AVANI-verified chain). */
  chainOfCustody?: { hash: string; merkleRoot: string; avaniVerified: boolean };
}
export interface ScopeFrame {
  sweepDeg: number | null; // current sweep angle (rotating sensors), else null
  maxRangeM: number; // outer range ring
  contacts: SensorContact[];
  active: boolean; // is the feed live?
}

// ── Camera (30X tower) ───────────────────────────────────────────────────────
export interface CameraState {
  active: boolean;
  streamUrl: string | null;
  zoom: number | null; // 1..30
  bearingDeg: number | null; // where the tower cam points
  tiltDeg: number | null;
}

// ── Camera rig — the physical tower optics (Jul 12 2026) ─────────────────────
//
// TWO devices on the Jetson's two CSI ports:
//
//  1. "quad360" — Arducam Camarray HAT (UC-512) + 4x IMX519, one per tower face
//     (bow/stbd/aft/port). CRITICAL: the HAT frame-synchronizes all four sensors and
//     multiplexes them into a SINGLE MIPI stream whose frames are a COMPOSITE of the
//     four tiles (2x2 or 4x1 — the backend declares which via `quad.cols/rows`). So the
//     GCS opens ONE stream and crops four tiles from each frame; it never opens four
//     connections. Combined video tops out ~1920x1080 for the whole composite, and the
//     per-camera frame rate halves — that is the HAT's documented behavior, not a bug.
//
//  2. "front" — Arducam IMX477 HQ (motorized IR-cut, day/night). A TEMPORARY stand-in for
//     the Sony 30x optical-zoom block, mounted below the ring on the bow face. It has a
//     fixed CS lens and NO pan/tilt/zoom motors, so `ptz` is "digital" (ROI crop) today and
//     becomes "optical" when the Sony lands — same commands, the capability flag changes.
//
// Honesty rule: a feed with no configured upstream reports online:false and the UI says so.
// Never synthesize video.
export type CameraRole = "quad360" | "front";
/** What pan/tilt/zoom the optic can actually do. Drives which controls the UI enables. */
export type PtzKind = "none" | "digital" | "optical";
/** Motorized IR-cut filter state (IMX477): visible-light by day, IR-sensitive at night. */
export type IrCutMode = "day" | "night" | "auto";

/** How the quad HAT packs its four synchronized sensors into one composite frame. */
export interface QuadLayout {
  cols: number; // 2 (2x2) or 4 (4x1 strip)
  rows: number; // 2 or 1
  /**
   * tileOrder[i] = which COMPOSITE tile index holds the camera mounted at ring position i
   * (i = 0 bow, 1 starboard, 2 aft, 3 port). Lets Cursor fix cable-order mismatches in
   * config instead of re-plugging ribbons.
   */
  tileOrder: number[];
}

export interface CameraFeed {
  id: string;
  role: CameraRole;
  label: string;
  /** e.g. "4x IMX519 (Camarray UC-512)" | "IMX477 HQ" — shown in the UI, never guessed. */
  sensor: string | null;
  online: boolean;
  /** Same-origin proxy path (never the raw Jetson IP — keeps HTTPS/iPad working). */
  streamUrl: string | null;
  snapshotUrl: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  ptz: PtzKind;
  /** Horizontal FOV of ONE sensor (IMX519 ~75°, IMX477 65° with the bundled 6mm CS lens). */
  fovDeg: number | null;
  irCut: IrCutMode | null; // null = no IR-cut hardware on this feed
  nightActive: boolean | null; // true when the IR-cut filter has swung out (night mode)
  zoomMax: number | null; // 1 = none; 30 = Sony 30x when it lands
  quad: QuadLayout | null; // quad360 only
  /** Mount bearing of each ring camera RELATIVE TO THE BOW, index-aligned to tileOrder. */
  mountBearingsDeg: number[] | null;
  /**
   * Optional Jetson-GPU pre-stitched outputs (DeepStream/CUDA/OpenCV warp+blend). When a URL is
   * present the 360 view can display a REAL seamless panorama / bird's-eye view instead of the raw-
   * tile crop. Absent/null → the front end falls back to its always-works canvas tile stitch. This is
   * the boundary: heavy stitch = Jetson GPU (served as ONE stream); light tile-crop = browser.
   */
  stitch: {
    panoUrl: string | null; // seamless cylindrical 360 panorama (single blended stream)
    bevUrl: string | null; // bird's-eye / top-down surround view (single stream)
    /**
     * True only when a MEASURED ground-plane calibration is loaded on the Jetson.
     *
     * This gates how much the geometry can be TRUSTED — it does NOT gate whether the operator may see
     * the view. A served-but-provisional surround view is still useful situational awareness; hiding
     * it would be worse than showing it with an honest badge. (Learned the hard way: gating the mode
     * chips on this flag made the panorama vanish the moment the backend correctly stopped
     * over-claiming.)
     */
    calibrated: boolean;
    /** "provisional" = geometric guess, "measured" = real chessboard/homography calibration. */
    calibrationSource?: string | null;
    /** Backend's own caveat, surfaced verbatim in the UI (e.g. drift on chop). */
    qualityNote?: string | null;
  } | null;
  error: string | null;
}

export interface CameraRig {
  feeds: CameraFeed[];
  updatedMsAgo: number | null;
}

/**
 * ── On-board AI (YOLO26 + SAHI tiled inference + DeepStream nvtracker, all on the Jetson) ──
 *
 * The Jetson runs detection/tracking and emits metadata; the GCS only DRAWS it. Boxes are in
 * NORMALIZED frame space (0..1 of the source frame) so one payload renders correctly over a
 * cover-cropped ring tile, a letterboxed pano/BEV, and a digitally-zoomed target alike — the
 * browser applies whichever transform that surface uses. Never synthesize detections client-side.
 */
export interface CameraDetection {
  /** Stable per-frame id. */
  id: string;
  /** Tracker id — persists across frames for the same object (DeepStream nvtracker). */
  trackId?: string | null;
  /** Class label, e.g. "boat", "person", "buoy", "debris". */
  cls: string;
  /** 0..1 confidence. */
  conf: number;
  /** Normalized 0..1 box in SOURCE-FRAME space: x,y = top-left. */
  bbox: { x: number; y: number; w: number; h: number };
  /** True bearing to the object, when the backend can derive it from the ring geometry. */
  bearingDeg?: number | null;
  /** Estimated range in metres, when available (BEV ground-plane or stereo). */
  rangeM?: number | null;
  /** Ring tile index (0..3) this detection belongs to — quad360 composite only. */
  tile?: number | null;
}

export interface DetectionFrame {
  feedId: string;
  /** Epoch ms of the inference frame (Jetson clock). */
  tMs: number;
  /** Source frame dimensions the normalized boxes refer to. */
  frameW: number | null;
  frameH: number | null;
  /** Inference latency in ms, for the honest HUD readout. */
  latencyMs?: number | null;
  /** Model identifier the Jetson actually ran, e.g. "yolo26n-int8" — never assumed. */
  model?: string | null;
  /** True when the backend ran SAHI sliced inference for this frame. */
  sahi?: boolean | null;
  detections: CameraDetection[];
}

// Ring cameras are mounted one per tower face, 90° apart, indexed bow→stbd→aft→port.
// Morgan has them physically set at exactly 90° and will fine-tune; these are the defaults the
// stitcher uses to lay the tiles out on true bearing (and to fix cable order via tileOrder without
// re-plugging ribbons). Lenses may differ per face for full coverage — fovDeg is per-feed from the backend.
export const RING_FACES = ["Bow", "Starboard", "Aft", "Port"] as const;
export const RING_MOUNT_BEARINGS = [0, 90, 180, 270];

/** Offline default rig — two feeds present but not yet streaming (honest: online:false until the
 *  backend reports a real upstream). streamUrl/snapshotUrl point at the same-origin proxy so the UI
 *  is wired the instant Cursor sets the Jetson camera-service env. */
export function emptyCameraRig(): CameraRig {
  return {
    updatedMsAgo: null,
    feeds: [
      {
        id: "quad360",
        role: "quad360",
        label: "360° Ring",
        sensor: null,
        online: false,
        streamUrl: "/api/fusarium/gcs/camera/quad360/stream",
        snapshotUrl: "/api/fusarium/gcs/camera/quad360/snapshot",
        width: null,
        height: null,
        fps: null,
        ptz: "none",
        fovDeg: null,
        irCut: null,
        nightActive: null,
        zoomMax: 1,
        // tileOrder maps DISPLAY position (bow, stbd, aft, port) → which quadrant of the composite
        // holds that face. Morgan verified the physical ribbon order on the tower Aug 01: the composite
        // quadrants come out 1,2,3,4 but the true bearing order is 2,4,3,1 → 0-indexed [1,3,2,0].
        // The Jetson pano/BEV stitch must use this SAME order or the panorama reads out of sequence.
        quad: { cols: 2, rows: 2, tileOrder: [1, 3, 2, 0] },
        mountBearingsDeg: [...RING_MOUNT_BEARINGS],
        // Jetson-GPU stitch outputs (Phase 2, CUDA/DeepStream) — proxied paths; calibrated:false until
        // the backend loads a calibration + serves a blended pano/BEV. Until then the FE uses tile mode.
        stitch: {
          panoUrl: "/api/fusarium/gcs/camera/quad360/pano",
          bevUrl: "/api/fusarium/gcs/camera/quad360/bev",
          calibrated: false,
        },
        error: null,
      },
      {
        id: "front",
        role: "front",
        label: "Target",
        sensor: null,
        online: false,
        streamUrl: "/api/fusarium/gcs/camera/front/stream",
        snapshotUrl: "/api/fusarium/gcs/camera/front/snapshot",
        width: null,
        height: null,
        fps: null,
        ptz: "digital", // IMX477 has no motors yet → digital; flips to "optical" when the Sony 30x lands
        fovDeg: 65, // bundled 6mm CS lens on the IMX477
        irCut: "auto",
        nightActive: null,
        zoomMax: 1,
        quad: null,
        mountBearingsDeg: [0],
        stitch: null, // single camera — nothing to stitch
        error: null,
      },
    ],
  };
}

// ── Mesh / fleet (Meshtastic-style multi-buoy network) ───────────────────────
export interface PeerBuoy {
  id: string;
  name: string;
  lat: number;
  lon: number;
  headingDeg: number;
  role: "relay" | "sensor" | "gateway" | "buoy";
  batteryPct: number | null;
  rssiDbm: number | null;
  snrDb: number | null;
  hops: number;
  online: boolean;
  lastHeardMsAgo: number | null;
}
export type MeshPacketKind = "position" | "telemetry" | "text" | "ack" | "sensor" | "nodeinfo";
export interface MeshPacket {
  id: string;
  fromId: string;
  toId: string;
  kind: MeshPacketKind;
  atMs: number;
  hops: number;
  rssiDbm: number | null;
}

// ── Safety state (hardware safety sensors — surfaced by the persistent safety strip) ──
// All fields null = "not reported / no sensor wired yet" so the strip degrades gracefully
// as Morgan wires the forthcoming leak / INA226 current / thermal / kill-switch hardware.
export interface SafetyState {
  /** Physical kill-switch engaged (props hard-cut at the power rail). null = not reported. */
  killSwitchEngaged: boolean | null;
  /** Seconds until the on-vehicle deadman auto-disarms if no command arrives. null = not reported. */
  deadmanSecondsRemaining: number | null;
  /** Configured deadman window in seconds (lets the GCS render a client-side estimate). null = unknown. */
  deadmanWindowS: number | null;
  /** Hull leak / water-intrusion detected. null = no sensor / not reported. */
  leakDetected: boolean | null;
  /** Raw water-intrusion probe reading (conductivity/level), if analog. null = not reported. */
  waterIntrusionRaw: number | null;
  /** Highest ESC / electronics temperature °C. null = not reported. */
  maxEscTempC: number | null;
  /** Any monitored temperature over its alarm threshold. null = not reported. */
  thermalAlarm: boolean | null;
  /** Highest per-thruster current draw A (from per-ESC INA226 shunts). null = not reported. */
  maxThrusterCurrentA: number | null;
  /** Any monitored current over its alarm threshold. null = not reported. */
  overcurrentAlarm: boolean | null;
  /** Vehicle-side low-battery alarm (SoC below threshold). null = not reported. */
  lowBattery: boolean | null;
}

/** Client-side display thresholds + defaults for the safety strip (not control logic). */
export const SAFETY_LIMITS = {
  /** Fallback deadman window (s) for the client-side countdown estimate when the vehicle doesn't report one. */
  deadmanDefaultS: 8,
  /** Highlight the countdown amber below this fraction of the window, red below half of it. */
  deadmanWarnFrac: 0.4,
  /** SoC (%) below which the strip flags low battery when the vehicle doesn't send an explicit alarm. */
  lowBatteryPct: 20,
  /** Per-thruster current (A) above which the strip flags overcurrent when no explicit alarm is sent. */
  overcurrentA: 10,
  /** ESC/electronics temp (°C) above which the strip flags thermal when no explicit alarm is sent. */
  thermalC: 70,
} as const;

// ── The full telemetry envelope ──────────────────────────────────────────────
export interface BuoyTelemetry {
  deviceId: string;
  link: LinkState;
  lastUpdateMsAgo: number | null;
  source: string | null; // "live" | "mas" | "field" | "sim" | ...
  /** TRUE only inside the explicit watermarked SIMULATION mode. */
  simulated: boolean;
  /**
   * Operational contact state derived from the link/satellite stack:
   *  - "live"    = RF bearer up (near shore), full two-way telemetry
   *  - "delayed" = only satellite, or just heard during a pass (store-and-forward)
   *  - "dark"    = no link between passes (buoy ranged offshore, no sat window)
   */
  contactState: "live" | "delayed" | "dark";
  /** Ms since the last received contact on ANY bearer (link/satellite-derived). */
  lastContactMsAgo: number | null;
  pose: BuoyPose;
  bme: { a: BmeReading | null; b: BmeReading | null };
  propulsion: PropulsionState;
  autonomy: AutonomyState;
  power: PowerState;
  /** Hardware safety sensors (kill-switch, deadman, leak, per-ESC current, thermal). */
  safety: SafetyState;
  comms: CommsState;
  camera: CameraState;
  /** Physical tower optics: 360° quad ring (4x IMX519) + front target cam (IMX477 → Sony 30x). */
  cameraRig: CameraRig;
  lidar: ScopeFrame;
  radar: ScopeFrame;
  /** BlueSight = radar + lidar + Wi-Fi-sense fusion. wifi is the extra layer. */
  bluesight: { wifi: SensorContact[]; active: boolean };
  /** Other buoys in the LoRa mesh fleet (Meshtastic-style). */
  peers: PeerBuoy[];
  /** Live mesh-network state: this node's id, recent packets, and the channel. */
  mesh: { selfId: string; packets: MeshPacket[]; channel: string };
}

// ── Command lifecycle (client-side ledger + store-and-forward) ───────────────
export type CommandState = "queued" | "sent" | "acked" | "applied" | "expired" | "failed";
export interface CommandRecord {
  id: string;
  seq: number; // monotonic per-session sequence
  label: string;
  domain: string;
  state: CommandState;
  bearer: RadioKind | "satellite" | "acoustic" | null;
  createdMs: number;
  sentMs?: number;
  ackMs?: number;
  latencyMs?: number;
  detail?: string;
}

// ── Session record & replay (client-side flight recorder) ────────────────────
// A compact, self-contained recording of a bench/pool/bay run: telemetry frames +
// command events over time. Exportable/importable JSON — the "we field-tested it
// with our own control system" artifact, and a debugging scrubber.
export const SESSION_FORMAT_VERSION = 1;
export interface SessionFrame {
  t: number; // ms epoch
  lat: number | null;
  lon: number | null;
  headingDeg: number | null;
  speedKn: number | null;
  depthM: number | null;
  armed: boolean;
  mode: string;
  contactState: "live" | "delayed" | "dark";
  link: LinkState;
  batterySocPct: number | null;
  thrusters: { id: ThrusterId; throttlePct: number; azimuthDeg: number; currentA: number | null; faulted: boolean }[];
  contacts: number; // total sensor contacts (radar + lidar + bluesight)
}
export interface SessionCommandEvent {
  t: number;
  id: string;
  seq: number;
  label: string;
  domain: string;
  state: CommandState;
  latencyMs?: number;
}
export interface RecordedSession {
  version: number;
  deviceId: string;
  startedMs: number;
  endedMs: number;
  frames: SessionFrame[];
  commands: SessionCommandEvent[];
  note?: string;
}

// ── Mission planning (multi-task autonomous plans) ───────────────────────────
export type MissionTaskKind =
  | "transit"
  | "loiter"
  | "survey"
  | "track"
  | "solar_reposition"
  | "station_keep";
export interface MissionTask {
  id: string;
  kind: MissionTaskKind;
  lat?: number;
  lon?: number;
  radiusM?: number;
  loiterS?: number;
  note?: string;
}
export interface MissionPlan {
  id: string;
  name: string;
  tasks: MissionTask[];
  geofence?: [number, number][];
  commsLossPolicy: "rtl" | "hold" | "continue";
  validUntilMs?: number | null;
  roe?: string; // rules of engagement / standing orders
  signature?: string | null; // operator sign-off signature
  createdMs: number;
}

// ── Commands (front-end → back-end) ──────────────────────────────────────────
export type BuoyCommand =
  // propulsion
  | { domain: "thruster"; action: "setVector"; headingDeg: number; magnitudePct: number; yawRateDegS: number }
  | { domain: "thruster"; action: "setThruster"; id: ThrusterId; throttlePct: number; azimuthDeg?: number } // azimuthDeg omitted = throttle-only (pod keeps its angle)
  | { domain: "thruster"; action: "setAzimuthRate"; id: ThrusterId; ratePct: number } // FS90MR continuous servo: spin rate -100..100 (0 = stop)
  | { domain: "thruster"; action: "setAzimuth"; id: ThrusterId; azimuthDeg: number } // absolute pod azimuth (0 = home, straight out from center) — no throttle change
  | { domain: "thruster"; action: "allStop" }
  // raw PCA9685 bench diagnostic — drive ANY channel (0-15) to a pulse, bypassing the thruster map
  | { domain: "pwm"; action: "setChannel"; channel: number; us: number }
  // autonomy
  | { domain: "autonomy"; action: "setMode"; mode: AutonomyMode }
  | { domain: "autonomy"; action: "arm"; armed: boolean }
  | { domain: "autonomy"; action: "addWaypoint"; waypoint: Waypoint }
  | { domain: "autonomy"; action: "clearWaypoints" }
  | { domain: "autonomy"; action: "gotoWaypoint"; id: string }
  | { domain: "autonomy"; action: "stationKeep" }
  | { domain: "autonomy"; action: "fightCurrent"; enabled: boolean }
  | { domain: "autonomy"; action: "cameraHold"; bearingDeg: number | null }
  // camera
  | { domain: "camera"; action: "setZoom"; zoom: number }
  | { domain: "camera"; action: "point"; bearingDeg: number; tiltDeg?: number }
  | { domain: "camera"; action: "irCut"; mode: IrCutMode } // IMX477 motorized IR-cut: day/night/auto
  // comms / acoustics — ONLY setBearer reaches hardware. The two below do not; see each note.
  // ⚠ DEAD — no callers anywhere. Its builder posts `peripheral: "transducer"`, which the control
  // route does not implement, so it 400s "Unknown peripheral". The transducer TX that actually
  // works is /api/fusarium/gcs/acoustic (CommsPanel's `uwPing`), so this is a second, unused door to
  // a control the panel already exposes and it should be deleted — but deleting the member here
  // alone breaks the `cmd.action === "ping"` comparison in useBuoyTelemetry's bearerFor, so the two
  // have to go in one change.
  | { domain: "comms"; action: "ping" }
  // ⚠ NOT WIRED — posts `peripheral: "hydrophone-lf" | "hydrophone-hf"`, which the control route
  // also does not implement (400), and no hydrophone is fitted at all today: `comms.hydrophone` is
  // all-null and the mic probe reports hardware absent. It fails honestly (the ledger records
  // `failed` with the backend's own reason), but CommsPanel still renders Rec LF / Rec HF as live
  // controls — they need `disabled` + the stated reason until a real record endpoint exists.
  | { domain: "comms"; action: "recordHydrophone"; band: "lf" | "hf" }
  | { domain: "comms"; action: "setBearer"; bearer: RadioKind } // live — MDP side_b bearer handler
  // acoustics — hydrophone array gain
  | { domain: "acoustic"; action: "setGain"; gainDb: number }
  // mission (multi-task autonomous plans)
  | { domain: "mission"; action: "upload"; plan: MissionPlan }
  | { domain: "mission"; action: "abort" }
  // diagnostics (live today)
  | { domain: "led"; action: "rainbow" | "off" }
  | { domain: "buzzer"; action: "beep" | "off" };

export interface CommandRequest {
  url: string;
  body: Record<string, unknown>;
  /** Human label for the ack/feedback toast. */
  label: string;
}

/**
 * Translate a typed BuoyCommand into the concrete HTTP request.
 *
 * Existing peripherals (led/buzzer/acoustic) use the legacy operator-string body
 * that the live device already understands. New nav/camera domains use the MDP
 * envelope ({ target, cmd, params }) that Cursor implements on side_a/side_b.
 */
export function buildCommandRequest(cmd: BuoyCommand): CommandRequest {
  const url = ENDPOINTS.command;
  const control = ENDPOINTS.control;
  switch (cmd.domain) {
    // Diagnostics go through the canonical control bus — identical payloads to the
    // Earth-Sim DeviceWidget, so they actuate the live board the same way (→ MQTT/serial).
    case "led":
      return {
        url: control,
        label: `LED ${cmd.action}`,
        body: { peripheral: "neopixel", effect: cmd.action === "rainbow" ? "rainbow" : "off" },
      };
    case "buzzer":
      return {
        url: control,
        label: `Buzzer ${cmd.action}`,
        // "coin" is the safe single beep used on the Earth Sim (avoid parameterized beep).
        body: { peripheral: "buzzer", action: cmd.action === "beep" ? "coin" : "off" },
      };
    case "comms":
      if (cmd.action === "ping") {
        // Dead path, kept only until the union member and bearerFor's "ping" arm are removed
        // together — "transducer" has no case in the control route, so this 400s. Left pointing at
        // the same (failing) URL deliberately: silently re-routing it to /api/fusarium/gcs/acoustic
        // would resurrect a duplicate door to a control CommsPanel already drives directly.
        return { url: control, label: "Transducer ping", body: { peripheral: "transducer", cmd: "transducer ping", pulse_ms: 100 } };
      }
      if (cmd.action === "recordHydrophone") {
        // No "hydrophone-*" case in the control route and no hydrophone fitted, so this 400s and
        // the ledger records `failed` with that reason. That honest failure is the correct end
        // state for now — do NOT add a hydrophone case to the control route to make it "work",
        // which would fabricate a control path to hardware that isn't there.
        return {
          url: control,
          label: `Hydrophone ${cmd.band.toUpperCase()} record`,
          body: { peripheral: `hydrophone-${cmd.band}`, cmd: `hydrophone record ${cmd.band === "lf" ? "low" : "high"}`, duration_s: 10 },
        };
      }
      // setBearer — select the active comms bearer (RF / satellite). MDP nav-side handler routes the bearer switch.
      return {
        url,
        label: `Bearer ${RADIO_LABEL[cmd.bearer]}`,
        body: { target: "side_b", cmd: "comms.set_bearer", params: { bearer: cmd.bearer } },
      };
    case "acoustic":
      // setGain — adjust hydrophone array gain. MDP audio/sensor-side handler (Cursor) applies it.
      return {
        url,
        label: `Hydrophone gain ${cmd.gainDb} dB`,
        body: { target: "side_a", cmd: "acoustic.set_gain", params: { gain_db: cmd.gainDb } },
      };
    case "mission":
      if (cmd.action === "upload") {
        return {
          url,
          label: `Mission upload: ${cmd.plan.name}`,
          body: { target: "side_b", cmd: "mission.upload", params: { plan: cmd.plan } },
        };
      }
      return { url, label: "Mission abort", body: { target: "side_b", cmd: "mission.abort" } };
    case "thruster":
      if (cmd.action === "setVector") {
        return {
          url,
          label: "Thrust vector",
          body: {
            target: "side_b",
            cmd: "nav.thrust_vector",
            params: { heading: cmd.headingDeg, magnitude: cmd.magnitudePct, yaw_rate: cmd.yawRateDegS },
          },
        };
      }
      if (cmd.action === "setThruster") {
        return {
          url,
          label: `Thruster ${cmd.id}`,
          // azimuth included only when specified — omitted = throttle-only, the pod keeps its angle
          body: { target: "side_b", cmd: "nav.thruster", params: { id: cmd.id, throttle: cmd.throttlePct, ...(cmd.azimuthDeg != null ? { azimuth: cmd.azimuthDeg } : {}) } },
        };
      }
      if (cmd.action === "setAzimuthRate") {
        return {
          url,
          label: `Azimuth ${cmd.id} rate`,
          body: { target: "side_b", cmd: "nav.thruster_azimuth", params: { id: cmd.id, rate: cmd.ratePct } },
        };
      }
      if (cmd.action === "setAzimuth") {
        return {
          url,
          label: cmd.azimuthDeg === 0 ? `Pod ${cmd.id} → home` : `Azimuth ${cmd.id} → ${cmd.azimuthDeg}°`,
          body: { target: "side_b", cmd: "nav.thruster_azimuth", params: { id: cmd.id, azimuth: cmd.azimuthDeg } },
        };
      }
      return { url, label: "ALL STOP", body: { target: "side_b", cmd: "nav.all_stop" } };
    case "pwm":
      // Raw PCA9685 channel drive (bench diagnostic) → agent nav.pwm_raw.
      return { url, label: `CH${cmd.channel} → ${cmd.us}µs`, body: { target: "side_b", cmd: "nav.pwm_raw", params: { channel: cmd.channel, us: cmd.us } } };
    case "autonomy":
      switch (cmd.action) {
        case "setMode":
          return { url, label: `Mode ${cmd.mode}`, body: { target: "side_b", cmd: "nav.set_mode", params: { mode: cmd.mode } } };
        case "arm":
          return { url, label: cmd.armed ? "ARM" : "DISARM", body: { target: "side_b", cmd: "nav.arm", params: { armed: cmd.armed } } };
        case "addWaypoint":
          return { url, label: "Add waypoint", body: { target: "side_b", cmd: "nav.add_waypoint", params: cmd.waypoint } };
        case "clearWaypoints":
          return { url, label: "Clear waypoints", body: { target: "side_b", cmd: "nav.clear_waypoints" } };
        case "gotoWaypoint":
          return { url, label: "Goto waypoint", body: { target: "side_b", cmd: "nav.goto", params: { id: cmd.id } } };
        case "stationKeep":
          return { url, label: "Station-keep", body: { target: "side_b", cmd: "nav.station_keep" } };
        case "fightCurrent":
          return { url, label: `Fight current ${cmd.enabled ? "on" : "off"}`, body: { target: "side_b", cmd: "nav.fight_current", params: { enabled: cmd.enabled } } };
        case "cameraHold":
          return { url, label: "Camera hold", body: { target: "side_b", cmd: "nav.camera_hold", params: { bearing: cmd.bearingDeg } } };
      }
      break;
    case "camera":
      if (cmd.action === "setZoom") {
        return { url, label: `Zoom ${cmd.zoom}x`, body: { target: "side_a", cmd: "cam.zoom", params: { zoom: cmd.zoom } } };
      }
      if (cmd.action === "irCut") {
        return { url, label: `IR-cut ${cmd.mode}`, body: { target: "side_a", cmd: "cam.ircut", params: { mode: cmd.mode } } };
      }
      return { url, label: "Point camera", body: { target: "side_a", cmd: "cam.point", params: { bearing: cmd.bearingDeg, tilt: cmd.tiltDeg ?? 0 } } };
  }
  // exhaustive fallback
  return { url, label: "Command", body: {} };
}

// ── Empty (no-mock) telemetry — the honest default before any feed arrives ───
export function emptyTelemetry(): BuoyTelemetry {
  const thrusterLabels = ["BOW-P", "BOW-S", "AFT-P", "AFT-S"];
  return {
    deviceId: PSATHYRELLA_DEVICE_ID,
    link: "unknown",
    lastUpdateMsAgo: null,
    source: null,
    simulated: false,
    contactState: "dark",
    lastContactMsAgo: null,
    pose: { lat: null, lon: null, headingDeg: null, speedKn: null, depthM: null, gpsLock: "unavailable" },
    bme: { a: null, b: null },
    propulsion: {
      thrusters: ([0, 1, 2, 3] as ThrusterId[]).map((id) => ({
        id,
        label: thrusterLabels[id],
        throttlePct: 0,
        azimuthDeg: 0,
        currentA: null,
        rpm: null,
        faulted: false,
      })),
      commandedVector: null,
    },
    autonomy: { mode: "MANUAL", armed: false, waypoints: [], activeWaypointId: null, cameraHoldBearingDeg: null, fightCurrent: false, commsLossPolicy: "rtl", activeMissionId: null },
    power: { solarInputW: null, panelTempC: null, batterySocPct: null, batteryVoltage: null, loadW: null, estRuntimeH: null, sunRepositionSuggested: false },
    safety: { killSwitchEngaged: null, deadmanSecondsRemaining: null, deadmanWindowS: null, leakDetected: null, waterIntrusionRaw: null, maxEscTempC: null, thermalAlarm: null, maxThrusterCurrentA: null, overcurrentAlarm: null, lowBattery: null },
    comms: {
      radios: (["cellular", "wifi", "ble", "lora", "iridium", "starlink"] as RadioKind[]).map((kind) => ({ kind, connected: false, rssiDbm: null, latencyMs: null, throughputKbps: null })),
      acoustic: { connected: false, carrierKhz: null, snrDb: null, rangeM: null, lastPingMsAgo: null },
      hydrophone: { levelDb: null, peakBearingDeg: null, bandHz: null, gainDb: null, spectrum: null },
      satellite: { bearer: null, connected: false, rssiDbm: null, credits: null, mtQueued: 0, moQueued: 0, lastContactMsAgo: null, nextPassEtaS: null },
      bridgeActive: false,
      lastUplink: null,
    },
    camera: { active: false, streamUrl: null, zoom: null, bearingDeg: null, tiltDeg: null },
    cameraRig: emptyCameraRig(),
    lidar: { sweepDeg: null, maxRangeM: 500, contacts: [], active: false },
    radar: { sweepDeg: null, maxRangeM: 4000, contacts: [], active: false },
    bluesight: { wifi: [], active: false },
    peers: [],
    mesh: { selfId: "psathyrella-01", packets: [], channel: "Myco-LongFast" },
  };
}

// LiDAR and Radar are NOT top-level views — they are windows inside BlueSight, which is where the
// sensors are meant to be compared side by side. Promoting them to their own tabs split the same
// picture across three places and cost the operator the fused context. Select a BlueSight window to
// enlarge it. Legacy ?view=LIDAR / ?view=RADAR deep links resolve to BLUESIGHT (see PsathyrellaConsole).
export const VIEW_MODES = ["CAMERA", "BLUESIGHT", "SONAR", "MAP"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

// ── Device selection (shared: MAP ⇄ Devices panel ⇄ StatusBar) ───────────────
// One normalized shape so a click on the map and a click in the Devices/Nodes
// tab select the SAME entity, and the bottom StatusBar renders THAT entity.
export type DeviceCategory = "aquatic" | "land" | "flying" | "edge" | "other";
export interface SelectedDevice {
  id: string;
  name: string;
  category: DeviceCategory;
  /** True only for the primary Psathyrella buoy — the one with full live telemetry. */
  isBuoy: boolean;
  online: boolean;
  lat: number | null;
  lon: number | null;
  batteryPct: number | null;
  rssiDbm: number | null;
  peers: number | null;
}

// ── Map asset hover / pick (Earth-Sim-parity: every asset is hoverable + selectable) ─────────
// A normalized, layer-agnostic descriptor so ONE delegated click/hover handler can surface any
// map feature (military base, contact, peer, vessel, cable, plume, …) in a shared card.
export interface MapAsset {
  id: string;
  layerId: string;
  kind: string;       // human asset category, e.g. "Military base", "Radar contact"
  label: string;      // primary name
  detail: string[];   // info lines for the card
  lat: number | null;
  lon: number | null;
  /** A serializable snapshot of the clicked feature's properties (incl. a `__full` JSON string
   *  of the whole source record where the layer bakes one in) — lets the rich entity widget
   *  show mass data without a second fetch. Hover stays lightweight and ignores this. */
  raw?: Record<string, unknown>;
}
export interface MapAssetHover extends MapAsset {
  x: number;          // screen px (cursor) — positions the hover card
  y: number;
}

/** The primary buoy as a SelectedDevice — the default focus, derived live from telemetry. */
export function primaryBuoySelection(t: BuoyTelemetry): SelectedDevice {
  const best = t.comms.radios
    .filter((r) => r.connected && r.rssiDbm != null)
    .sort((a, b) => (BEARER_PRIORITY[a.kind] - BEARER_PRIORITY[b.kind]) || ((b.rssiDbm ?? -999) - (a.rssiDbm ?? -999)))[0];
  return {
    id: t.deviceId,
    name: "Global vehicle",
    category: "aquatic",
    isBuoy: true,
    online: t.link === "online",
    lat: t.pose.lat,
    lon: t.pose.lon,
    batteryPct: t.power.batterySocPct,
    rssiDbm: best?.rssiDbm ?? null,
    peers: t.comms.radios.filter((r) => r.connected).length || null,
  };
}

export const CATEGORY_LABEL: Record<DeviceCategory, string> = {
  aquatic: "Aquatic Droid",
  land: "Land Droid",
  flying: "Flying Droid",
  edge: "Edge Data Center",
  other: "Device",
};

/** Classify a device-registry row into a droid category (shared by MAP + Devices panel). */
export function classifyDevice(d: { type?: unknown; id?: unknown; name?: unknown }): DeviceCategory {
  const t = `${d?.type || ""} ${d?.id || ""} ${d?.name || ""}`.toLowerCase();
  if (t.includes("psathyrella") || t.includes("buoy")) return "aquatic";
  if (t.includes("mushroom")) return "land";
  if (t.includes("agaric")) return "flying";
  if (t.includes("hyphae")) return "edge";
  return "other";
}

/** Color per contact kind — shared by all scopes for a consistent legend. */
export const CONTACT_COLOR: Record<ContactKind, string> = {
  vessel: "#f59e0b",
  obstacle: "#ef4444",
  buoy: "#22d3ee",
  acoustic: "#a855f7",
  wifi: "#38bdf8",
  landmass: "#64748b",
  unknown: "#94a3b8",
};
