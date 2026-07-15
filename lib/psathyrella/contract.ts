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
export const PSATHYRELLA_DEVICE_ID = "psathyrella-1";
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
  /** GET — fused nav/propulsion/comms/power/scope telemetry envelope (MAS 188). */
  telemetry: `/api/psathyrella/telemetry`,
  /** GET (SSE) — live telemetry push, passthrough to MAS /stream. Additive accelerator over the poll. */
  stream: `/api/psathyrella/stream`,
  /** WS (planned) — reserved; SSE `stream` is the live path today. */
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
  // comms / acoustics (live today via control bus)
  | { domain: "comms"; action: "ping" }
  | { domain: "comms"; action: "recordHydrophone"; band: "lf" | "hf" }
  | { domain: "comms"; action: "setBearer"; bearer: RadioKind }
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
        return { url: control, label: "Transducer ping", body: { peripheral: "transducer", cmd: "transducer ping", pulse_ms: 100 } };
      }
      if (cmd.action === "recordHydrophone") {
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
    lidar: { sweepDeg: null, maxRangeM: 500, contacts: [], active: false },
    radar: { sweepDeg: null, maxRangeM: 4000, contacts: [], active: false },
    bluesight: { wifi: [], active: false },
    peers: [],
    mesh: { selfId: "psathyrella-01", packets: [], channel: "Myco-LongFast" },
  };
}

export const VIEW_MODES = ["CAMERA", "LIDAR", "RADAR", "BLUESIGHT", "SONAR", "MAP"] as const;
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
    name: "Psathyrella",
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
