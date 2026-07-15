/**
 * Psathyrella GCS — SIMULATION source.
 *
 * THIS IS NOT LIVE DATA. It is only ever invoked when the operator explicitly
 * enables SIMULATION mode (off by default, gated by NEXT_PUBLIC_PSATHYRELLA_SIM
 * or the in-app toggle). Output always carries `simulated: true`, and the UI
 * renders an unmistakable "SIM" pill while active so it can never be mistaken
 * for the real buoy. This exists for UX walkthroughs / presentation when the bay
 * feeds are not yet wired by the backend. Delete this file (and the toggle) to
 * ship strictly live-or-empty.
 *
 * The whole sim is DETERMINISTIC from `t` (a monotonic ms clock). There is no
 * Math.random / Date.now inside the math — given the same `t` (and waypoints)
 * you get the same frame. That keeps the animation smooth and reproducible.
 */

import {
  type BuoyTelemetry,
  type SensorContact,
  type ContactKind,
  type Waypoint,
  type PeerBuoy,
  type MeshPacket,
  type MeshPacketKind,
  type RadioKind,
  type MissionPlan,
  type MissionTask,
  PROJECT_OYSTER_ANCHOR,
} from "./contract";

// ── Constants ────────────────────────────────────────────────────────────────

/** Shore/control reference the RF links measure range against — Imperial Beach
 *  side of the bay, just inshore of the OYSTER anchor. As the buoy steams away
 *  from here, BLE→wifi→cell drop out in turn while LoRa holds far longer. */
const SHORE_REF = { lat: 32.5783, lon: -117.1339 } as const;

/** Realistic max usable ranges (m) for each RF bearer in a bay/coastal setting. */
const RADIO_MAX_RANGE_M: Record<RadioKind, number> = {
  ble: 60, // Bluetooth LE — line-of-sight, very short
  wifi: 180, // shore Wi-Fi AP — a couple hundred meters over water
  cellular: 6500, // 4G/LTE — a few km to the nearest tower
  lora: 18000, // LoRa LongFast — km+, the mesh backbone bearer
  // Satellite bearers are BLOS and are NOT modeled by shore distance — their
  // up/down state comes from the pass schedule in computeSatellite(). These
  // values exist only to satisfy the Record<RadioKind,…> type; the sim's radios
  // map skips iridium/starlink so they never appear as surface RF links.
  iridium: 0,
  starlink: 0,
};

const SIM_CRUISE_KN = 2.4; // nominal transit speed when underway
const MAX_YAW_RATE_DEG_S = 9; // rate-limited heading slew
const ARRIVAL_RADIUS_M = 35; // pop the waypoint inside this radius
const STEP_S = 1; // integration step for the deterministic path walk

const KN_TO_MPS = 0.514444;
const M_PER_DEG_LAT = 111_320;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// ── Geodesy (flat-earth small-area approx — fine for a single bay) ───────────

function mPerDegLon(lat: number): number {
  return M_PER_DEG_LAT * Math.cos(lat * DEG);
}

function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (bLat - aLat) * M_PER_DEG_LAT;
  const dLon = (bLon - aLon) * mPerDegLon((aLat + bLat) / 2);
  return Math.hypot(dLat, dLon);
}

/** Initial true bearing a→b, degrees 0..360 (0 = north). */
function bearingDeg(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dN = (bLat - aLat) * M_PER_DEG_LAT;
  const dE = (bLon - aLon) * mPerDegLon((aLat + bLat) / 2);
  return (Math.atan2(dE, dN) * RAD + 360) % 360;
}

/** Advance lat/lon by `distM` meters along `hdgDeg`. */
function advance(lat: number, lon: number, hdgDeg: number, distM: number): { lat: number; lon: number } {
  const dN = Math.cos(hdgDeg * DEG) * distM;
  const dE = Math.sin(hdgDeg * DEG) * distM;
  return { lat: lat + dN / M_PER_DEG_LAT, lon: lon + dE / mPerDegLon(lat) };
}

/** Signed shortest angular difference target-current in [-180, 180]. */
function angleDelta(current: number, target: number): number {
  let d = ((target - current + 540) % 360) - 180;
  if (d === -180) d = 180;
  return d;
}

// ── Deterministic helpers ────────────────────────────────────────────────────

function wave(t: number, period: number, phase = 0) {
  return Math.sin((t / period) * Math.PI * 2 + phase);
}

/** Deterministic 0..1 hash from an integer-ish seed (no Math.random). */
function hash01(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// ── Navigation: walk the waypoint path deterministically from t ──────────────

interface NavState {
  lat: number;
  lon: number;
  headingDeg: number;
  speedKn: number;
  /** Index of the waypoint currently being driven toward (or queue length if done). */
  activeIdx: number;
  /** Heading the autopilot is steering toward (the commanded translation). */
  desiredHeadingDeg: number;
  /** Distance to the active waypoint, m (null when station-keeping). */
  toGoM: number | null;
}

/**
 * Integrate the buoy along the waypoint list with rate-limited yaw, popping a
 * waypoint within ARRIVAL_RADIUS_M. The whole walk is recomputed every frame
 * from a fixed origin + the mission clock `t`, so it is stateless yet smooth.
 *
 * When no waypoints exist, gentle station-keeping drift around the anchor.
 */
function computeNav(base: BuoyTelemetry, t: number, waypoints: Waypoint[]): NavState {
  const startLat = base.pose.lat ?? PROJECT_OYSTER_ANCHOR.lat;
  const startLon = base.pose.lon ?? PROJECT_OYSTER_ANCHOR.lon;

  // Station-keeping: no waypoints → loiter on a slow lissajous around anchor.
  if (waypoints.length === 0) {
    const cx = PROJECT_OYSTER_ANCHOR.lat;
    const cy = PROJECT_OYSTER_ANCHOR.lon;
    const r = 0.00035; // ~40 m loiter radius
    const lat = cx + wave(t, 90000) * r;
    const lon = cy + wave(t, 78000, 1.3) * r;
    // Heading is the tangent of the drift; speed is small.
    const lat2 = cx + wave(t + 1000, 90000) * r;
    const lon2 = cy + wave(t + 1000, 78000, 1.3) * r;
    const hdg = bearingDeg(lat, lon, lat2, lon2);
    return {
      lat,
      lon,
      headingDeg: hdg,
      speedKn: 0.15 + Math.abs(wave(t, 30000)) * 0.25,
      activeIdx: 0,
      desiredHeadingDeg: hdg,
      toGoM: null,
    };
  }

  // Underway: deterministically step from the start position toward each
  // waypoint in turn, advancing by elapsed mission time. We cap the number of
  // simulated steps so a long-running clock just parks at the final waypoint.
  const elapsedS = Math.max(0, (t % 1_800_000) / 1000); // loop the mission every 30 min
  const speedMps = SIM_CRUISE_KN * KN_TO_MPS;

  let lat = startLat;
  let lon = startLon;
  let heading = base.pose.headingDeg ?? bearingDeg(lat, lon, waypoints[0].lat, waypoints[0].lon);
  let idx = 0;
  let remaining = elapsedS;
  let desiredHeading = heading;

  const maxSteps = 4000; // hard guard against pathological inputs
  let steps = 0;
  while (remaining > 0 && idx < waypoints.length && steps < maxSteps) {
    steps++;
    const wp = waypoints[idx];
    const dist = haversineM(lat, lon, wp.lat, wp.lon);
    if (dist <= ARRIVAL_RADIUS_M) {
      idx++; // POP this waypoint, drive the next
      continue;
    }
    desiredHeading = bearingDeg(lat, lon, wp.lat, wp.lon);
    // Rate-limited yaw toward the desired bearing.
    const dTheta = angleDelta(heading, desiredHeading);
    const maxStepYaw = MAX_YAW_RATE_DEG_S * STEP_S;
    heading = (heading + Math.max(-maxStepYaw, Math.min(maxStepYaw, dTheta)) + 360) % 360;
    // Advance along the (new) heading for one step.
    const stepDist = speedMps * STEP_S;
    const next = advance(lat, lon, heading, stepDist);
    lat = next.lat;
    lon = next.lon;
    remaining -= STEP_S;
  }

  const done = idx >= waypoints.length;
  const target = done ? waypoints[waypoints.length - 1] : waypoints[idx];
  const toGo = haversineM(lat, lon, target.lat, target.lon);

  return {
    lat,
    lon,
    headingDeg: heading,
    speedKn: done ? 0.2 : SIM_CRUISE_KN,
    activeIdx: Math.min(idx, waypoints.length - 1),
    desiredHeadingDeg: desiredHeading,
    toGoM: toGo,
  };
}

// ── Propulsion: mix 4 vectored thrusters to realize translate + yaw ──────────

function computeThrusters(
  base: BuoyTelemetry,
  t: number,
  nav: NavState,
): BuoyTelemetry["propulsion"]["thrusters"] {
  // Commanded body-frame translation = desired heading relative to bow.
  const transRel = angleDelta(nav.headingDeg, nav.desiredHeadingDeg); // ~0 when on course
  const yawErr = transRel; // need to spin to kill heading error
  const magnitudePct = nav.speedKn > 1 ? 55 : 12; // underway vs station-keep

  // Geometry: BOW-P, BOW-S, AFT-P, AFT-S sitting at the 4 quarters.
  const mount = [45, 315, 135, 225]; // body-frame mounting bearings of each unit
  return base.propulsion.thrusters.map((th, i) => {
    // Translation component: each thruster aligns its azimuth to push the hull
    // in the commanded translation direction (relative to bow).
    const transAz = (transRel + 360) % 360;
    // Yaw component: bow units and aft units differential-thrust to rotate.
    const isBow = i < 2;
    const yawSign = isBow ? 1 : -1;
    const yawContribution = Math.max(-100, Math.min(100, yawErr * yawSign * 1.6));
    // Blend translation drive with yaw correction.
    const transDrive = magnitudePct * (0.6 + 0.4 * Math.cos((transAz - mount[i]) * DEG));
    const throttle = Math.max(-100, Math.min(100, transDrive + yawContribution * 0.4));
    const azimuth = (transAz + yawContribution * 0.3 + 360) % 360;
    const load = Math.abs(throttle) / 100;
    return {
      ...th,
      throttlePct: Math.round(throttle + wave(t, 6000, i * 1.7) * 3), // tiny PWM ripple
      azimuthDeg: Math.round(azimuth),
      currentA: +(0.8 + load * 6 + Math.abs(wave(t, 4000, i)) * 0.4).toFixed(2),
      rpm: Math.round(600 + load * 3200),
      faulted: false,
    };
  });
}

// ── Comms: RSSI / latency / connectivity decay with range from shore ─────────

function radioLinkAt(kind: RadioKind, distM: number, t: number, phase: number) {
  const maxR = RADIO_MAX_RANGE_M[kind];
  // Fade margin: near 1 at the AP, →0 at max range, plus a little flutter.
  const flutter = wave(t, 9000 + phase * 1300, phase) * 0.06;
  const frac = Math.max(0, 1 - distM / maxR) + flutter;
  const connected = frac > 0.04;
  if (!connected) {
    return { kind, connected: false, rssiDbm: null, latencyMs: null, throughputKbps: null };
  }
  // Log-distance-ish RSSI: strong (-45) near the AP → weak (~-110) at the edge.
  const rssi = Math.round(-45 - (1 - Math.max(0, Math.min(1, frac))) * 65);
  // Latency rises and throughput collapses as the margin shrinks.
  const baseLat = kind === "lora" ? 380 : kind === "cellular" ? 45 : kind === "wifi" ? 12 : 8;
  const latencyMs = Math.round(baseLat + (1 - frac) * (kind === "lora" ? 1400 : 320));
  const maxKbps = kind === "lora" ? 22 : kind === "cellular" ? 9000 : kind === "wifi" ? 36000 : 700;
  const throughputKbps = Math.max(1, Math.round(maxKbps * Math.pow(Math.max(0, frac), 1.4)));
  return { kind, connected: true, rssiDbm: rssi, latencyMs, throughputKbps };
}

// ── Peer buoys (Meshtastic-style fleet around the bay) ───────────────────────

interface PeerSeed {
  id: string;
  name: string;
  role: PeerBuoy["role"];
  lat: number;
  lon: number;
}

const PEER_SEEDS: PeerSeed[] = [
  { id: "psathyrella-02", name: "OYSTER-2", role: "relay", lat: 32.5710, lon: -117.1410 },
  { id: "psathyrella-03", name: "REEF-3", role: "sensor", lat: 32.5560, lon: -117.1290 },
  { id: "shore-gw-01", name: "IB-GATEWAY", role: "gateway", lat: SHORE_REF.lat, lon: SHORE_REF.lon },
  { id: "psathyrella-04", name: "KELP-4", role: "buoy", lat: 32.5495, lon: -117.1465 },
];

function computePeers(t: number, selfLat: number, selfLon: number): PeerBuoy[] {
  return PEER_SEEDS.map((p, i) => {
    // Gentle independent drift per peer (gateway is anchored on shore → no drift).
    const drift = p.role === "gateway" ? 0 : 0.00045;
    const lat = p.lat + wave(t, 70000 + i * 8000, i) * drift;
    const lon = p.lon + wave(t, 64000 + i * 7000, i + 2) * drift;
    const hdg = (wave(t, 50000 + i * 6000, i) * 60 + i * 90 + 360) % 360;
    const distM = haversineM(selfLat, selfLon, lat, lon);
    // Mesh RSSI from inter-node distance against the LoRa bearer.
    const frac = Math.max(0, 1 - distM / RADIO_MAX_RANGE_M.lora);
    const rssi = Math.round(-50 - (1 - frac) * 60);
    const snr = +(11 * frac - 4 + wave(t, 8000, i) * 1.5).toFixed(1);
    const online = frac > 0.03;
    // Multi-hop: the farther/weaker, the more hops to reach it.
    const hops = !online ? 0 : frac > 0.55 ? 1 : frac > 0.25 ? 2 : 3;
    const battery = Math.round(55 + wave(t, 220000 + i * 12000, i) * 22 + (p.role === "gateway" ? 25 : 0));
    return {
      id: p.id,
      name: p.name,
      lat,
      lon,
      headingDeg: hdg,
      role: p.role,
      batteryPct: Math.max(5, Math.min(100, battery)),
      rssiDbm: online ? rssi : null,
      snrDb: online ? snr : null,
      hops,
      online,
      lastHeardMsAgo: online ? Math.round((1500 + hash01(i + 1) * 9000) + (t % 4000)) : null,
    };
  });
}

// ── Mesh packet stream (rolling ~40, Meshtastic LongFast cadence) ────────────

const PACKET_KINDS: MeshPacketKind[] = ["position", "telemetry", "text", "ack", "sensor", "nodeinfo"];

function computeMeshPackets(
  t: number,
  selfId: string,
  peers: PeerBuoy[],
  selfLat: number,
  selfLon: number,
): MeshPacket[] {
  const nodes = [selfId, ...peers.filter((p) => p.online).map((p) => p.id)];
  if (nodes.length < 2) return [];
  const posOf = (id: string): { lat: number; lon: number } => {
    if (id === selfId) return { lat: selfLat, lon: selfLon };
    const p = peers.find((q) => q.id === id);
    return p ? { lat: p.lat, lon: p.lon } : { lat: selfLat, lon: selfLon };
  };

  const KEEP = 40;
  const INTERVAL_MS = 1800; // one packet every ~1.8 s (LongFast-ish beacon cadence)
  const newest = Math.floor(t / INTERVAL_MS);
  const out: MeshPacket[] = [];
  for (let k = 0; k < KEEP; k++) {
    const seq = newest - k; // seq descends into the past
    const atMs = seq * INTERVAL_MS;
    // Deterministic node selection per sequence number.
    const fromIdx = Math.floor(hash01(seq) * nodes.length) % nodes.length;
    let toIdx = Math.floor(hash01(seq + 0.5) * nodes.length) % nodes.length;
    if (toIdx === fromIdx) toIdx = (toIdx + 1) % nodes.length;
    const fromId = nodes[fromIdx];
    const toId = nodes[toIdx];
    // Kind cadence: mostly position/telemetry beacons, sometimes text/ack/sensor.
    const kr = hash01(seq + 0.25);
    const kind: MeshPacketKind =
      kr < 0.42 ? "position" : kr < 0.7 ? "telemetry" : kr < 0.82 ? "sensor" : kr < 0.9 ? "nodeinfo" : kr < 0.96 ? "ack" : "text";
    const a = posOf(fromId);
    const b = posOf(toId);
    const distM = haversineM(a.lat, a.lon, b.lat, b.lon);
    const frac = Math.max(0, 1 - distM / RADIO_MAX_RANGE_M.lora);
    const rssi = Math.round(-52 - (1 - frac) * 58);
    const hops = frac > 0.55 ? 1 : frac > 0.25 ? 2 : 3;
    out.push({
      id: `pkt-${seq}`,
      fromId,
      toId,
      kind: PACKET_KINDS.includes(kind) ? kind : "position",
      atMs,
      hops,
      rssiDbm: rssi,
    });
  }
  // Oldest → newest so a viewer can append/animate forward.
  return out.reverse();
}

// ── Scope contacts (radar / lidar / wifi-sense), heading-consistent ──────────

function seededContacts(
  t: number,
  count: number,
  maxRangeM: number,
  kinds: ContactKind[],
  idPrefix: string,
): SensorContact[] {
  const out: SensorContact[] = [];
  for (let i = 0; i < count; i++) {
    const drift = wave(t, 40000 + i * 9000, i) * 18; // slow bearing drift
    const bDeg = (i * (360 / count) + drift + 360) % 360;
    const rangeM = maxRangeM * (0.25 + 0.6 * hash01(i + 1));
    out.push({
      id: `${idPrefix}-${i}`,
      bearingDeg: bDeg,
      rangeM,
      kind: kinds[i % kinds.length],
      strength: 0.5 + 0.4 * ((wave(t, 3000, i) + 1) / 2),
      label: `${kinds[i % kinds.length].toUpperCase()} ${i + 1}`,
    });
  }
  return out;
}

// ── Mission → waypoint flattening (generalise the path-walk to MissionTasks) ──

/**
 * Flatten a MissionPlan's tasks into the same Waypoint list the nav walker
 * already understands. Geographic tasks (transit/survey/track) become a
 * goto-waypoint; loiter/station_keep/solar_reposition become a "hold" waypoint
 * at their location (or the anchor when none is given) so the buoy parks there.
 */
export function missionToWaypoints(plan: MissionPlan): Waypoint[] {
  const out: Waypoint[] = [];
  plan.tasks.forEach((task: MissionTask, i: number) => {
    const lat = task.lat ?? PROJECT_OYSTER_ANCHOR.lat;
    const lon = task.lon ?? PROJECT_OYSTER_ANCHOR.lon;
    const loiter: Waypoint["loiter"] =
      task.kind === "loiter" || task.kind === "station_keep" || task.kind === "solar_reposition"
        ? "hold"
        : task.kind === "survey"
          ? "circle"
          : "none";
    out.push({ id: task.id || `mt_${i}`, lat, lon, label: task.note ?? task.kind, loiter });
  });
  return out;
}

// ── Satellite (Iridium LEO) pass schedule ────────────────────────────────────

/** Iridium-style pass: ~600 s gap then a ~120 s connected window, repeating. */
const SAT_CYCLE_S = 720; // total period
const SAT_WINDOW_S = 120; // connected portion at the end of each cycle

function computeSatellite(t: number): BuoyTelemetry["comms"]["satellite"] {
  const phaseS = (t / 1000) % SAT_CYCLE_S;
  const gapS = SAT_CYCLE_S - SAT_WINDOW_S;
  const inPass = phaseS >= gapS;
  const nextPassEtaS = inPass ? 0 : Math.round(gapS - phaseS);
  // Credits tick down slowly across the day; flushing during a pass.
  const credits = Math.max(0, Math.round(480 - (t / 1000 / SAT_CYCLE_S) % 480));
  // moQueued builds between passes and flushes during the window.
  const moQueued = inPass
    ? Math.max(0, Math.round(6 - ((phaseS - gapS) / SAT_WINDOW_S) * 6))
    : Math.round((phaseS / gapS) * 6);
  const rssi = inPass ? Math.round(-92 + wave(t, 4000) * 6) : null;
  return {
    bearer: "iridium",
    connected: inPass,
    rssiDbm: rssi,
    credits,
    mtQueued: inPass ? 0 : Math.round(1 + Math.abs(wave(t, 30000)) * 2),
    moQueued,
    // last contact: now during a pass; otherwise time since the pass ended.
    lastContactMsAgo: inPass ? (t % 2000) | 0 : Math.round((phaseS) * 1000),
    nextPassEtaS,
  };
}

// ── Hydrophone spectrum (live waterfall, ~48 t-seeded bins w/ moving tonals) ──

const SPECTRUM_BINS = 48;

function computeSpectrum(t: number): number[] {
  const bins: number[] = [];
  // Two slowly-sweeping tonals plus a 1/f-ish noise floor.
  const tonalA = 6 + (wave(t, 41000) + 1) * 10; // bin index, slow sweep
  const tonalB = 24 + (wave(t, 67000, 1.1) + 1) * 9;
  for (let i = 0; i < SPECTRUM_BINS; i++) {
    const floor = 0.18 * Math.exp(-i / 26) + 0.04 + hash01(i + 3) * 0.05;
    const peakA = 0.7 * Math.exp(-((i - tonalA) ** 2) / 6);
    const peakB = 0.5 * Math.exp(-((i - tonalB) ** 2) / 8);
    const ripple = (wave(t, 1500, i * 0.7) + 1) * 0.03;
    bins.push(Math.max(0, Math.min(1, floor + peakA + peakB + ripple)));
  }
  return bins;
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Overlay a fully-animated simulated state on top of the honest base telemetry.
 * `t` is a monotonic clock in ms (e.g. Date.now()).
 * `ctx.waypoints` steers the simulated pose toward the active waypoint.
 */
export function simulateTelemetry(base: BuoyTelemetry, t: number, ctx?: SimContext): BuoyTelemetry {
  // Mission plan (if supplied) drives the path; else fall back to raw waypoints.
  const plan = ctx?.missionPlan ?? null;
  const waypoints = plan ? missionToWaypoints(plan) : (ctx?.waypoints ?? base.autonomy.waypoints ?? []);
  const nav = computeNav(base, t, waypoints);
  const heading = nav.headingDeg;

  // Depth-aware acoustic modem behavior.
  const depthM = 1.1 + Math.abs(wave(t, 8000)) * 0.6;
  const acousticRangeM = 280 + (1 - depthM / 3) * 140 + wave(t, 30000) * 60;
  const acousticSnr = 8 + wave(t, 6000) * 5 - depthM * 0.8;

  // Range from shore drives every RF bearer's signal.
  const distFromShoreM = haversineM(SHORE_REF.lat, SHORE_REF.lon, nav.lat, nav.lon);

  const thrusters = computeThrusters(base, t, nav);
  const peers = computePeers(t, nav.lat, nav.lon);
  const selfId = base.mesh?.selfId ?? "psathyrella-01";
  const packets = computeMeshPackets(t, selfId, peers, nav.lat, nav.lon);

  const solar = Math.max(0, wave(t, 120000, -1.2)) * 145 + 8; // diurnal-ish curve
  const soc = 62 + wave(t, 200000) * 18;

  const vesselKinds: ContactKind[] = ["vessel", "buoy", "obstacle", "landmass"];

  // Commanded vector reflects the steer (translation toward the waypoint + yaw).
  const yawErr = angleDelta(nav.headingDeg, nav.desiredHeadingDeg);
  const commandedVector = {
    headingDeg: nav.desiredHeadingDeg,
    magnitudePct: Math.round(nav.speedKn > 1 ? 55 + wave(t, 20000) * 8 : 12),
    yawRateDegS: +Math.max(-MAX_YAW_RATE_DEG_S, Math.min(MAX_YAW_RATE_DEG_S, yawErr * 0.5)).toFixed(1),
  };

  const activeWaypointId =
    waypoints.length > 0 ? waypoints[Math.min(nav.activeIdx, waypoints.length - 1)].id : null;

  // RF bearers, recomputed once so contactState can read their up/down state.
  // Satellite bearers (iridium/starlink) are NOT surface RF — their state lives
  // in comms.satellite, so leave them disconnected in the radios array.
  const radios = base.comms.radios.map((r, i) => {
    if (r.kind === "iridium" || r.kind === "starlink") {
      return { ...r, connected: false, rssiDbm: null, latencyMs: null, throughputKbps: null };
    }
    const link = radioLinkAt(r.kind, distFromShoreM, t, i);
    return { ...r, ...link };
  });
  // RF "near shore" = any of the short-haul surface bearers up (cell/wifi/ble).
  const rfUp = radios.some((r) => (r.kind === "cellular" || r.kind === "wifi" || r.kind === "ble") && r.connected);
  const satellite = computeSatellite(t);

  // contactState: RF up near shore → live; only satellite (or just heard) →
  // delayed; no link between passes → dark. lastContactMsAgo follows suit.
  const contactState: BuoyTelemetry["contactState"] = rfUp
    ? "live"
    : satellite.connected
      ? "delayed"
      : "dark";
  const lastContactMsAgo =
    contactState === "live"
      ? 0
      : contactState === "delayed"
        ? satellite.lastContactMsAgo ?? 0
        : satellite.lastContactMsAgo; // time since last pass while dark

  const spectrum = computeSpectrum(t);
  const hydroLevelDb = -42 + wave(t, 2500) * 14;
  const hydroGainDb = 24 + wave(t, 47000) * 8; // slowly-varying array gain

  return {
    ...base,
    link: "online",
    source: "sim",
    simulated: true,
    lastUpdateMsAgo: 0,
    contactState,
    lastContactMsAgo,
    pose: {
      lat: nav.lat,
      lon: nav.lon,
      headingDeg: heading,
      speedKn: +nav.speedKn.toFixed(2),
      depthM: +depthM.toFixed(2),
      gpsLock: "locked",
    },
    propulsion: {
      commandedVector,
      thrusters,
    },
    autonomy: {
      ...base.autonomy,
      mode: waypoints.length > 0 ? "AUTO" : "STATION_KEEP",
      armed: true,
      waypoints,
      activeWaypointId,
      activeMissionId: plan ? plan.id : null,
      commsLossPolicy: plan ? plan.commsLossPolicy : base.autonomy.commsLossPolicy,
    },
    power: {
      solarInputW: solar,
      panelTempC: 28 + wave(t, 90000) * 6,
      batterySocPct: soc,
      batteryVoltage: 12.6 + (soc - 60) * 0.02,
      loadW: 34 + Math.abs(wave(t, 16000)) * 22,
      estRuntimeH: 6 + wave(t, 200000) * 3,
      sunRepositionSuggested: solar < 40,
    },
    safety: {
      killSwitchEngaged: false,
      // Deadman counts within its window (sim keeps it "alive" so it never trips the walkthrough).
      deadmanSecondsRemaining: +(6 + wave(t, 12000) * 1.6).toFixed(1),
      deadmanWindowS: 8,
      leakDetected: false,
      waterIntrusionRaw: 0,
      maxEscTempC: +(34 + Math.abs(wave(t, 30000)) * 9).toFixed(1),
      thermalAlarm: false,
      maxThrusterCurrentA: +Math.max(0, ...thrusters.map((x) => x.currentA ?? 0)).toFixed(2),
      overcurrentAlarm: false,
      lowBattery: soc < 20,
    },
    comms: {
      ...base.comms,
      bridgeActive: true,
      radios,
      satellite,
      acoustic: {
        connected: true,
        carrierKhz: 28,
        snrDb: +acousticSnr.toFixed(1),
        rangeM: Math.round(acousticRangeM),
        lastPingMsAgo: (t % 8000) | 0,
      },
      hydrophone: {
        levelDb: +hydroLevelDb.toFixed(1),
        peakBearingDeg: (wave(t, 33000) * 120 + 180 + 360) % 360,
        bandHz: { lo: 20, hi: 24000 },
        gainDb: +hydroGainDb.toFixed(1),
        spectrum,
      },
      lastUplink: { atMsAgo: (t % 45000) | 0, summary: "NLM: vessel screw-cavitation, brg 212°, 1 contact" },
    },
    camera: {
      active: true,
      streamUrl: null,
      zoom: 6 + Math.round(Math.abs(wave(t, 25000)) * 12),
      bearingDeg: heading,
      tiltDeg: wave(t, 14000) * 5,
    },
    lidar: {
      sweepDeg: (t / 12) % 360,
      maxRangeM: 500,
      active: true,
      contacts: seededContacts(t, 6, 480, ["obstacle", "vessel", "buoy"], "ld"),
    },
    radar: {
      sweepDeg: (t / 18) % 360,
      maxRangeM: 4000,
      active: true,
      contacts: seededContacts(t, 5, 3800, vesselKinds, "rd"),
    },
    bluesight: { active: true, wifi: seededContacts(t, 3, 600, ["wifi"], "wf") },
    peers,
    mesh: { selfId, packets, channel: base.mesh?.channel ?? "Myco-LongFast" },
  };
}

/** Extra context the SIM source can steer with (e.g. follow the operator's waypoints/mission). */
export interface SimContext {
  waypoints?: Waypoint[];
  missionPlan?: MissionPlan | null;
}
