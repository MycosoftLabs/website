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
export const PSATHYRELLA_DEVICE_ID = "psathyrella-buoy-com4";
export const PSATHYRELLA_PORT = "COM4";
export const PSATHYRELLA_REGISTRY_ID = "mycobrain-COM4";
/** Project Oyster, North Reef — buoy home anchor. */
export const PROJECT_OYSTER_ANCHOR = { lat: 32.56289, lon: -117.1357 } as const;

// ── Live endpoints the GCS consumes (implemented by Cursor's backend) ────────
export const ENDPOINTS = {
  /** GET — live BME688 A/B (works today). */
  sensors: `/api/mycobrain/${PSATHYRELLA_PORT}/sensors`,
  /** GET — device registry: position, online/source (works today). */
  devices: `/api/earth-simulator/devices`,
  /** POST — command bus (MDP side_a/side_b for nav/cam — Cursor's MQTT→Jetson handlers). */
  command: `/api/devices/${PSATHYRELLA_DEVICE_ID}/command`,
  /** POST — canonical peripheral control (same bus the Earth-Sim DeviceWidget uses → MQTT/serial → device). */
  control: `/api/mycobrain/${PSATHYRELLA_PORT}/control`,
  /** GET (planned) — fused nav/propulsion/comms/power/scope telemetry envelope. */
  telemetry: `/api/psathyrella/telemetry`,
  /** WS (planned) — MAS push: mission events, MAVLink, NLM results. */
  ws: `/api/psathyrella/ws`,
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

// ── Comms — RF stack + acoustic bridge ───────────────────────────────────────
export type RadioKind = "ble" | "cellular" | "wifi" | "lora";
export const RADIO_LABEL: Record<RadioKind, string> = {
  ble: "BLE",
  cellular: "4G/LTE",
  wifi: "WIFI",
  lora: "LoRa",
};
export interface RadioLink {
  kind: RadioKind;
  connected: boolean;
  rssiDbm: number | null;
  latencyMs: number | null;
  throughputKbps: number | null;
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
}
export interface CommsState {
  radios: RadioLink[];
  acoustic: AcousticLink;
  hydrophone: HydrophoneState;
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

// ── The full telemetry envelope ──────────────────────────────────────────────
export interface BuoyTelemetry {
  deviceId: string;
  link: LinkState;
  lastUpdateMsAgo: number | null;
  source: string | null; // "live" | "mas" | "field" | "sim" | ...
  /** TRUE only inside the explicit watermarked SIMULATION mode. */
  simulated: boolean;
  pose: BuoyPose;
  bme: { a: BmeReading | null; b: BmeReading | null };
  propulsion: PropulsionState;
  autonomy: AutonomyState;
  power: PowerState;
  comms: CommsState;
  camera: CameraState;
  lidar: ScopeFrame;
  radar: ScopeFrame;
  /** BlueSight = radar + lidar + Wi-Fi-sense fusion. wifi is the extra layer. */
  bluesight: { wifi: SensorContact[]; active: boolean };
}

// ── Commands (front-end → back-end) ──────────────────────────────────────────
export type BuoyCommand =
  // propulsion
  | { domain: "thruster"; action: "setVector"; headingDeg: number; magnitudePct: number; yawRateDegS: number }
  | { domain: "thruster"; action: "setThruster"; id: ThrusterId; throttlePct: number; azimuthDeg: number }
  | { domain: "thruster"; action: "allStop" }
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
  // comms / acoustics (live today via control bus)
  | { domain: "comms"; action: "ping" }
  | { domain: "comms"; action: "recordHydrophone"; band: "lf" | "hf" }
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
        return { url: control, label: "Transducer ping", body: { peripheral: "transducer", cmd: "transducer ping", pulse_ms: 100 } };
      }
      return {
        url: control,
        label: `Hydrophone ${cmd.band.toUpperCase()} record`,
        body: { peripheral: `hydrophone-${cmd.band}`, cmd: `hydrophone record ${cmd.band === "lf" ? "low" : "high"}`, duration_s: 10 },
      };
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
          body: { target: "side_b", cmd: "nav.thruster", params: { id: cmd.id, throttle: cmd.throttlePct, azimuth: cmd.azimuthDeg } },
        };
      }
      return { url, label: "ALL STOP", body: { target: "side_b", cmd: "nav.all_stop" } };
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
    autonomy: { mode: "MANUAL", armed: false, waypoints: [], activeWaypointId: null, cameraHoldBearingDeg: null, fightCurrent: false },
    power: { solarInputW: null, panelTempC: null, batterySocPct: null, batteryVoltage: null, loadW: null, estRuntimeH: null, sunRepositionSuggested: false },
    comms: {
      radios: (["ble", "cellular", "wifi", "lora"] as RadioKind[]).map((kind) => ({ kind, connected: false, rssiDbm: null, latencyMs: null, throughputKbps: null })),
      acoustic: { connected: false, carrierKhz: null, snrDb: null, rangeM: null, lastPingMsAgo: null },
      hydrophone: { levelDb: null, peakBearingDeg: null, bandHz: null },
      bridgeActive: false,
      lastUplink: null,
    },
    camera: { active: false, streamUrl: null, zoom: null, bearingDeg: null, tiltDeg: null },
    lidar: { sweepDeg: null, maxRangeM: 500, contacts: [], active: false },
    radar: { sweepDeg: null, maxRangeM: 4000, contacts: [], active: false },
    bluesight: { wifi: [], active: false },
  };
}

export const VIEW_MODES = ["CAMERA", "LIDAR", "RADAR", "BLUESIGHT", "MAP"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

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
