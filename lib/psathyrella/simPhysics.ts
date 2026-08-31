/**
 * Psathyrella SIMULATION physics — scale-true vessel dynamics for the GCS simulator.
 *
 * Mirrors the REAL bench hardware (Jul 2026 ground truth):
 *  - 4 vectored pods at 45/135/225/315° mounts, ~0.25 m arm, HOME = radially out (az 0)
 *  - Diamond Dynamics WP thrusters: ~20 N (≈2 kgf) max each @12 V, bidirectional,
 *    ESC deadband below ~8% effective throttle (bench: no spin under ~20% commanded ≈ 8% real)
 *  - FS90MR azimuth: ~60°/s rotation, ±180° no-slip-ring wire limit (same guard as the agent)
 *  - Hull: ~12 kg all-up FDM buoy, quadratic water drag → ~2.5 kn drag-limited top speed
 *
 * NOTE — the mixer here is the CORRECT per-pod mount-offset mixer (pods align to a world
 * direction: pod_az = desired_world_dir − mount). The live agent currently sends the SAME
 * azimuth to all pods (pinwheel); this module doubles as the reference implementation for
 * Cursor's agent-side mixer fix (see PSATHYRELLA_CURSOR_HANDOFF_JUL07_JOYSTICK_BUGS.md §6).
 *
 * All pure functions — the caller owns state in a ref and steps it on the sim tick.
 */

import type { ThrusterId, Waypoint } from "./contract";

// ── scale-true parameter block (single place to tune as real measurements land) ──────────
export const SIM_PARAMS = {
  massKg: 12, // hull + Jetson + battery + 4 pods (V1 bench build)
  yawInertia: 1.6, // kg·m² incl. added water mass
  podArmM: 0.25, // pod distance from center mass
  podMounts: [315, 45, 135, 225] as const, // BOW-P, BOW-S, AFT-S, AFT-P (compass°, 0=bow)
  thrustMaxN: 20, // per pod @100% (≈2 kgf, DD WP @12V)
  escDeadbandPct: 8, // |throttle| below this produces no thrust (ESC dead zone)
  azRateDegS: 60, // FS90MR rotation speed (matches agent dead-reckon rate)
  azLimitDeg: 180, // no-slip-ring wire limit (agent wind guard)
  dragLinear: 6, // N·s/m — low-speed viscous term
  dragQuad: 42, // N·s²/m² — ½ρCdA lumped (→ ~1.3 m/s ≈ 2.5 kn top speed)
  yawDragLinear: 1.2,
  yawDragQuad: 2.5,
  gpsJitterM: 1.2, // reported-position noise (1σ)
  cruiseThrottlePct: 60,
  approachRadiusM: 18, // begin slowing
  arriveRadiusM: 6, // waypoint reached
} as const;

export interface SimPod {
  id: ThrusterId;
  throttlePct: number; // commanded −100..100
  azTargetDeg: number; // commanded pod azimuth (relative to its radial home), −180..180
  azActualDeg: number; // physical pod azimuth (rotates at azRateDegS toward target)
}

export interface SimPhysicsState {
  lat: number;
  lon: number;
  headingDeg: number; // hull heading (compass)
  vN: number; // world-frame velocity north, m/s
  vE: number; // world-frame velocity east, m/s
  yawRateDegS: number;
  pods: SimPod[];
  armed: boolean; // ESC arm gate — no thrust while disarmed (azimuth still rotates, like the real agent)
  // autopilot
  waypointIndex: number;
  navActive: boolean;
  arrived: boolean;
}

export function createSimState(lat: number, lon: number): SimPhysicsState {
  return {
    lat,
    lon,
    headingDeg: 0,
    vN: 0,
    vE: 0,
    yawRateDegS: 0,
    pods: [0, 1, 2, 3].map((id) => ({ id: id as ThrusterId, throttlePct: 0, azTargetDeg: 0, azActualDeg: 0 })),
    armed: false,
    waypointIndex: 0,
    navActive: false,
    arrived: false,
  };
}

const d2r = (d: number) => (d * Math.PI) / 180;
const norm180 = (d: number) => (((d + 180) % 360) + 360) % 360 - 180;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ── command application (mirrors agent semantics, with the CORRECT mount-offset mixer) ───
/** Joystick vector: translate toward `headingDeg` (world) at `magnitudePct`, with yaw bias. */
export function applyThrustVector(s: SimPhysicsState, headingDeg: number, magnitudePct: number, yawRateDegS: number) {
  const yawBias = clamp(yawRateDegS / 30, -1, 1) * 30; // ±30% differential, like the agent's 0.3 factor
  for (const pod of s.pods) {
    const mount = SIM_PARAMS.podMounts[pod.id];
    // CORRECT mixer: pod thrust must point along the desired WORLD direction →
    // pod azimuth (relative to its radial home = mount dir in hull frame) compensates the mount.
    const desiredHullFrame = norm180(headingDeg - s.headingDeg); // translate cmd is world-frame
    pod.azTargetDeg = clampAzToWireLimit(norm180(desiredHullFrame - mount + 0), pod.azActualDeg);
    const tangentialSign = pod.id === 1 || pod.id === 3 ? 1 : -1; // agent's yaw pairing
    pod.throttlePct = clamp(magnitudePct + tangentialSign * yawBias, -100, 100);
  }
}

/** Single-pod command (Bench Jog semantics). */
export function applyThruster(s: SimPhysicsState, id: number, throttlePct?: number | null, azimuthDeg?: number | null) {
  const pod = s.pods[id];
  if (!pod) return;
  if (throttlePct != null) pod.throttlePct = clamp(throttlePct, -100, 100);
  if (azimuthDeg != null) pod.azTargetDeg = clampAzToWireLimit(norm180(azimuthDeg), pod.azActualDeg);
}

export function applyAllStop(s: SimPhysicsState) {
  for (const pod of s.pods) pod.throttlePct = 0;
  s.navActive = false;
}

export function applyHomeAll(s: SimPhysicsState) {
  for (const pod of s.pods) pod.azTargetDeg = 0;
}

/** ±180° wire guard — same rule as the agent: never cross the seam opposite home. */
function clampAzToWireLimit(target: number, current: number): number {
  const cands = [target, target - 360, target + 360].filter((c) => c >= -SIM_PARAMS.azLimitDeg && c <= SIM_PARAMS.azLimitDeg);
  if (!cands.length) return clamp(target, -SIM_PARAMS.azLimitDeg, SIM_PARAMS.azLimitDeg);
  return cands.reduce((a, b) => (Math.abs(a - current) <= Math.abs(b - current) ? a : b));
}

// ── GPS waypoint autopilot (dock-to-dock) ────────────────────────────────────────────────
const M_PER_DEG_LAT = 111_320;

export function distBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dN = (lat2 - lat1) * M_PER_DEG_LAT;
  const dE = (lon2 - lon1) * M_PER_DEG_LAT * Math.cos(d2r(lat1));
  return { distM: Math.hypot(dN, dE), bearingDeg: ((Math.atan2(dE, dN) * 180) / Math.PI + 360) % 360 };
}

/** Steer toward the active waypoint; advances the index on arrival. Returns nav status text. */
export function autopilotStep(s: SimPhysicsState, waypoints: Waypoint[]): string | null {
  if (!s.navActive || !waypoints.length) return null;
  if (s.waypointIndex >= waypoints.length) {
    applyAllStop(s);
    s.arrived = true;
    return "arrived — all stop";
  }
  const wp = waypoints[s.waypointIndex];
  const { distM, bearingDeg } = distBearing(s.lat, s.lon, wp.lat, wp.lon);
  if (distM <= SIM_PARAMS.arriveRadiusM) {
    s.waypointIndex += 1;
    return s.waypointIndex >= waypoints.length ? "final waypoint reached" : `waypoint ${s.waypointIndex} reached`;
  }
  // throttle: cruise, tapering inside the approach radius (never below deadband+4)
  const taper = clamp(distM / SIM_PARAMS.approachRadiusM, 0.25, 1);
  const throttle = clamp(SIM_PARAMS.cruiseThrottlePct * taper, SIM_PARAMS.escDeadbandPct + 4, 100);
  // gentle hull-heading alignment toward course (round hull: cosmetic but realistic)
  const hdgErr = norm180(bearingDeg - s.headingDeg);
  const yaw = clamp(hdgErr * 0.3, -18, 18);
  applyThrustVector(s, bearingDeg, throttle, yaw);
  return null;
}

// ── physics integration ──────────────────────────────────────────────────────────────────
/** Advance the world by dt seconds (call with ~0.05–0.25 s; internally sub-steps at 50 ms). */
export function stepPhysics(s: SimPhysicsState, dtTotal: number) {
  let remaining = dtTotal;
  while (remaining > 1e-4) {
    const dt = Math.min(0.05, remaining);
    remaining -= dt;

    // pods rotate toward their targets at the real servo rate
    for (const pod of s.pods) {
      const err = pod.azTargetDeg - pod.azActualDeg; // both live in [-180,180] — direct move (wire guard)
      const maxStep = SIM_PARAMS.azRateDegS * dt;
      pod.azActualDeg += clamp(err, -maxStep, maxStep);
    }

    // per-pod thrust (ESC deadband) → net body force + yaw torque
    let fN = 0;
    let fE = 0;
    let torque = 0;
    for (const pod of s.pods) {
      // ARM gate (like the real agent's _apply_esc) + ESC deadband (like the real DD ESCs)
      const eff = !s.armed || Math.abs(pod.throttlePct) <= SIM_PARAMS.escDeadbandPct ? 0 : pod.throttlePct / 100;
      if (eff === 0) continue;
      const thrust = eff * SIM_PARAMS.thrustMaxN;
      const mount = SIM_PARAMS.podMounts[pod.id];
      const dirWorld = d2r(s.headingDeg + mount + pod.azActualDeg); // pod thrust direction, world compass
      const fx = Math.sin(dirWorld) * thrust; // east
      const fy = Math.cos(dirWorld) * thrust; // north
      fE += fx;
      fN += fy;
      // torque about center: pod position × thrust (2D cross), pod pos in world frame
      const posAng = d2r(s.headingDeg + mount);
      const px = Math.sin(posAng) * SIM_PARAMS.podArmM;
      const py = Math.cos(posAng) * SIM_PARAMS.podArmM;
      torque += px * fy - py * fx; // N·m (CCW+ in EN plane → invert for compass CW)
    }

    // hull drag (world frame)
    const v = Math.hypot(s.vN, s.vE);
    if (v > 1e-6) {
      const dragMag = SIM_PARAMS.dragLinear * v + SIM_PARAMS.dragQuad * v * v;
      fN -= (s.vN / v) * dragMag;
      fE -= (s.vE / v) * dragMag;
    }

    // integrate translation
    s.vN += (fN / SIM_PARAMS.massKg) * dt;
    s.vE += (fE / SIM_PARAMS.massKg) * dt;
    s.lat += (s.vN * dt) / M_PER_DEG_LAT;
    s.lon += (s.vE * dt) / (M_PER_DEG_LAT * Math.cos(d2r(s.lat)));

    // integrate yaw (compass CW+, so negate the EN-plane CCW torque)
    const yawRate = d2r(s.yawRateDegS);
    const yawDrag = SIM_PARAMS.yawDragLinear * yawRate + SIM_PARAMS.yawDragQuad * yawRate * Math.abs(yawRate);
    const yawAcc = (-torque - yawDrag * 1) / SIM_PARAMS.yawInertia;
    s.yawRateDegS += (yawAcc * 180) / Math.PI * dt;
    s.headingDeg = (s.headingDeg + s.yawRateDegS * dt + 360) % 360;
  }
}

/** Reported GPS with realistic jitter (deterministic-ish per call site is fine for UI). */
export function gpsRead(s: SimPhysicsState): { lat: number; lon: number; speedKn: number; headingDeg: number } {
  const j = () => (Math.random() - 0.5) * 2 * (SIM_PARAMS.gpsJitterM / M_PER_DEG_LAT);
  const speedMs = Math.hypot(s.vN, s.vE);
  return {
    lat: s.lat + j(),
    lon: s.lon + j() / Math.max(0.2, Math.cos(d2r(s.lat))),
    speedKn: speedMs * 1.9438,
    headingDeg: Math.round(s.headingDeg),
  };
}

// ── startup sequence (SIM boot) ──────────────────────────────────────────────────────────
export interface SimBootStep { atMs: number; label: string }
export const SIM_BOOT_SEQUENCE: SimBootStep[] = [
  { atMs: 0, label: "POWER — 12V bus energized · kill switch ON" },
  { atMs: 700, label: "PCA9685 @0x60 · 50 Hz init" },
  { atMs: 1500, label: "ESC arming — 4× beep · neutral 1600 µs" },
  { atMs: 2300, label: "Azimuth servos — trims loaded · pods HOME" },
  { atMs: 3100, label: "Radios — WiFi −39 dBm · LoRa ready · BLE adv" },
  { atMs: 3900, label: "GPS — 3D fix · 9 satellites (sim)" },
  { atMs: 4700, label: "MYCA autonomy online — systems nominal · SAFE" },
];
export const SIM_BOOT_TOTAL_MS = 5400;
