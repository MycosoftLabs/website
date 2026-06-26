/**
 * Psathyrella GCS — SIMULATION source.
 *
 * THIS IS NOT LIVE DATA. It is only ever invoked when the operator explicitly
 * enables SIMULATION mode (off by default, gated by NEXT_PUBLIC_PSATHYRELLA_SIM
 * or the in-app toggle). Output always carries `simulated: true`, and the UI
 * renders an unmistakable "SIMULATION — NOT LIVE DATA" watermark while active so
 * it can never be mistaken for the real buoy. This exists for UX walkthroughs /
 * presentation when the bay feeds are not yet wired by the backend. Delete this
 * file (and the toggle) to ship strictly live-or-empty.
 */

import {
  type BuoyTelemetry,
  type SensorContact,
  type ContactKind,
  PROJECT_OYSTER_ANCHOR,
} from "./contract";

function wave(t: number, period: number, phase = 0) {
  return Math.sin((t / period) * Math.PI * 2 + phase);
}

function seededContacts(t: number, count: number, maxRangeM: number, kinds: ContactKind[], idPrefix: string): SensorContact[] {
  const out: SensorContact[] = [];
  for (let i = 0; i < count; i++) {
    const drift = wave(t, 40000 + i * 9000, i) * 18; // slow bearing drift
    const bearingDeg = (i * (360 / count) + drift + 360) % 360;
    const rangeM = maxRangeM * (0.25 + 0.6 * ((Math.sin(i * 12.9898) + 1) / 2));
    out.push({
      id: `${idPrefix}-${i}`,
      bearingDeg,
      rangeM,
      kind: kinds[i % kinds.length],
      strength: 0.5 + 0.4 * ((Math.sin(t / 3000 + i) + 1) / 2),
      label: `${kinds[i % kinds.length].toUpperCase()} ${i + 1}`,
    });
  }
  return out;
}

/**
 * Overlay a fully-animated simulated state on top of the honest base telemetry.
 * `t` is a monotonic clock in ms (e.g. Date.now()).
 */
export function simulateTelemetry(base: BuoyTelemetry, t: number): BuoyTelemetry {
  const heading = (wave(t, 60000) * 30 + 70 + 360) % 360; // gentle yaw
  const latJitter = wave(t, 50000) * 0.0006;
  const lonJitter = wave(t, 47000, 1.1) * 0.0006;
  const solar = Math.max(0, wave(t, 120000, -1.2)) * 145 + 8; // diurnal-ish curve
  const soc = 62 + wave(t, 200000) * 18;

  const vesselKinds: ContactKind[] = ["vessel", "buoy", "obstacle", "landmass"];

  return {
    ...base,
    link: "online",
    source: "sim",
    simulated: true,
    lastUpdateMsAgo: 0,
    pose: {
      lat: (base.pose.lat ?? PROJECT_OYSTER_ANCHOR.lat) + latJitter,
      lon: (base.pose.lon ?? PROJECT_OYSTER_ANCHOR.lon) + lonJitter,
      headingDeg: heading,
      speedKn: Math.abs(wave(t, 30000)) * 1.8,
      depthM: 1.2 + wave(t, 8000) * 0.4,
      gpsLock: "locked",
    },
    propulsion: {
      commandedVector: { headingDeg: heading, magnitudePct: 35 + wave(t, 20000) * 20, yawRateDegS: wave(t, 15000) * 8 },
      thrusters: base.propulsion.thrusters.map((th, i) => ({
        ...th,
        throttlePct: Math.round(wave(t, 12000, i * 1.6) * 60),
        azimuthDeg: (i * 90 + wave(t, 18000, i) * 25 + 360) % 360,
        currentA: 1.5 + Math.abs(wave(t, 9000, i)) * 4,
        rpm: Math.round(800 + Math.abs(wave(t, 9000, i)) * 2600),
        faulted: false,
      })),
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
    comms: {
      ...base.comms,
      bridgeActive: true,
      radios: base.comms.radios.map((r, i) => {
        const connected = i !== 1 ? true : wave(t, 40000) > -0.3; // 4G flaps
        return { ...r, connected, rssiDbm: connected ? Math.round(-58 - Math.abs(wave(t, 11000, i)) * 35) : null, latencyMs: connected ? Math.round(40 + Math.abs(wave(t, 7000, i)) * 180) : null, throughputKbps: connected ? Math.round(20 + Math.abs(wave(t, 9000, i)) * 900) : null };
      }),
      acoustic: { connected: true, carrierKhz: 28, snrDb: 9 + wave(t, 6000) * 6, rangeM: 320 + wave(t, 30000) * 120, lastPingMsAgo: (t % 8000) | 0 },
      hydrophone: { levelDb: -42 + wave(t, 2500) * 14, peakBearingDeg: (wave(t, 33000) * 120 + 180 + 360) % 360, bandHz: { lo: 20, hi: 24000 } },
      lastUplink: { atMsAgo: (t % 45000) | 0, summary: "NLM: vessel screw-cavitation, brg 212°, 1 contact" },
    },
    camera: { active: true, streamUrl: null, zoom: 6 + Math.round(Math.abs(wave(t, 25000)) * 12), bearingDeg: heading, tiltDeg: wave(t, 14000) * 5 },
    lidar: { sweepDeg: (t / 12) % 360, maxRangeM: 500, active: true, contacts: seededContacts(t, 6, 480, ["obstacle", "vessel", "buoy"], "ld") },
    radar: { sweepDeg: (t / 18) % 360, maxRangeM: 4000, active: true, contacts: seededContacts(t, 5, 3800, vesselKinds, "rd") },
    bluesight: { active: true, wifi: seededContacts(t, 3, 600, ["wifi"], "wf") },
  };
}
