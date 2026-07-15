"use client";

/**
 * useBuoyTelemetry — the GCS data layer.
 *
 * Sources, in priority order (all REAL, no-mock):
 *   1. GET /api/psathyrella/telemetry  → the fused BuoyTelemetry envelope (MAS 188)
 *   2. GET /api/mycobrain/COM4/sensors → live BME688 (resilient fallback/base)
 *   3. GET /api/earth-simulator/devices → position + link (resilient fallback/base)
 *
 * The envelope (1) overlays the base built from (2)+(3) with full field guards, so a
 * partially-populated envelope degrades to STANDBY rather than crashing a panel. If
 * the MAS endpoint is unreachable, BME + position still flow from (2)+(3).
 * When `simulated` is true, an explicit watermarked SIMULATION overlay replaces all.
 */

import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BEARER_PRIORITY,
  buildCommandRequest,
  emptyTelemetry,
  ENDPOINTS,
  PSATHYRELLA_DEVICE_ID,
  type BmeReading,
  type BuoyCommand,
  type BuoyTelemetry,
  type CommandRecord,
  type ContactKind,
  type LinkState,
  type MissionPlan,
  type RadioKind,
  type ScopeFrame,
  type SensorContact,
  type Waypoint,
} from "./contract";
import { missionToWaypoints, simulateTelemetry } from "./sim";
import {
  applyAllStop,
  applyThruster,
  applyThrustVector,
  autopilotStep,
  createSimState,
  gpsRead,
  SIM_BOOT_TOTAL_MS,
  stepPhysics,
  type SimPhysicsState,
} from "./simPhysics";

const LEDGER_CAP = 50; // newest-first ring of command records

const jsonFetcher = (url: string) =>
  fetch(url, { headers: { accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/** Tolerant BME mapper — accepts the sensors route (snake_case) and the envelope (camelCase). */
function mapBme(raw: any): BmeReading | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    temperature: num(raw.temperature),
    humidity: num(raw.humidity),
    pressure: num(raw.pressure),
    gasResistance: num(raw.gas_resistance ?? raw.gasResistance),
    iaq: num(raw.iaq),
    iaqAccuracy: num(raw.iaq_accuracy ?? raw.iaqAccuracy),
    co2Equivalent: num(raw.co2_equivalent ?? raw.co2Equivalent),
    vocEquivalent: num(raw.voc_equivalent ?? raw.vocEquivalent),
    present: raw.present !== false,
    address: str(raw.address),
    label: str(raw.label),
  };
}

function mapContacts(raw: any, prefix: string, defaultKind: ContactKind): SensorContact[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && num(c.bearingDeg) != null && num(c.rangeM) != null)
    .map((c, i) => ({
      id: String(c.id ?? `${prefix}-${i}`),
      bearingDeg: num(c.bearingDeg)!,
      rangeM: num(c.rangeM)!,
      kind: (typeof c.kind === "string" ? c.kind : defaultKind) as ContactKind,
      strength: num(c.strength) ?? 0.5,
      label: str(c.label) ?? undefined,
      classifiedAs: str(c.classifiedAs) ?? undefined,
      chainOfCustody:
        c.chainOfCustody && typeof c.chainOfCustody === "object"
          ? {
              hash: String(c.chainOfCustody.hash ?? ""),
              merkleRoot: String(c.chainOfCustody.merkleRoot ?? ""),
              avaniVerified: !!c.chainOfCustody.avaniVerified,
            }
          : undefined,
    }));
}

function mapScope(raw: any, fallback: ScopeFrame, prefix: string): ScopeFrame {
  if (!raw || typeof raw !== "object") return fallback;
  return {
    sweepDeg: num(raw.sweepDeg),
    maxRangeM: num(raw.maxRangeM) ?? fallback.maxRangeM,
    active: !!raw.active,
    contacts: mapContacts(raw.contacts, prefix, "unknown"),
  };
}

/** Overlay the fused envelope onto a guaranteed-shape base telemetry (envelope wins where present). */
function overlayEnvelope(base: BuoyTelemetry, raw: any): BuoyTelemetry {
  const env = raw?.telemetry ?? raw;
  if (!env || typeof env !== "object" || !(env.pose || env.bme || env.comms || env.power || env.deviceId)) {
    return base;
  }
  const t = base;

  if (typeof env.link === "string") t.link = env.link as LinkState;
  if (env.source != null) t.source = String(env.source);
  if (typeof env.simulated === "boolean") t.simulated = env.simulated; // honest surfacing if MAS self-reports sim
  if (num(env.lastUpdateMsAgo) != null) t.lastUpdateMsAgo = num(env.lastUpdateMsAgo);
  if (env.contactState === "live" || env.contactState === "delayed" || env.contactState === "dark") t.contactState = env.contactState;
  if (num(env.lastContactMsAgo) != null) t.lastContactMsAgo = num(env.lastContactMsAgo);

  if (env.pose) {
    const p = env.pose;
    if (num(p.lat) != null) t.pose.lat = num(p.lat);
    if (num(p.lon) != null) t.pose.lon = num(p.lon);
    if (num(p.headingDeg) != null) t.pose.headingDeg = num(p.headingDeg);
    if (num(p.speedKn) != null) t.pose.speedKn = num(p.speedKn);
    if (num(p.depthM) != null) t.pose.depthM = num(p.depthM);
    if (typeof p.gpsLock === "string") t.pose.gpsLock = p.gpsLock;
  }

  if (env.bme) {
    if (env.bme.a) t.bme.a = mapBme(env.bme.a);
    if (env.bme.b) t.bme.b = mapBme(env.bme.b);
  }

  if (env.propulsion) {
    if (Array.isArray(env.propulsion.thrusters)) {
      env.propulsion.thrusters.forEach((th: any) => {
        const target = t.propulsion.thrusters.find((x) => x.id === th?.id);
        if (!target) return;
        if (num(th.throttlePct) != null) target.throttlePct = num(th.throttlePct)!;
        if (num(th.azimuthDeg) != null) target.azimuthDeg = num(th.azimuthDeg)!;
        target.currentA = num(th.currentA);
        target.rpm = num(th.rpm);
        target.faulted = !!th.faulted;
        if (typeof th.label === "string") target.label = th.label;
      });
    }
    const cv = env.propulsion.commandedVector;
    if (cv) t.propulsion.commandedVector = { headingDeg: num(cv.headingDeg) ?? 0, magnitudePct: num(cv.magnitudePct) ?? 0, yawRateDegS: num(cv.yawRateDegS) ?? 0 };
  }

  if (env.autonomy) {
    const a = env.autonomy;
    if (typeof a.mode === "string") t.autonomy.mode = a.mode;
    if (typeof a.armed === "boolean") t.autonomy.armed = a.armed;
    if (typeof a.fightCurrent === "boolean") t.autonomy.fightCurrent = a.fightCurrent;
    if (a.cameraHoldBearingDeg !== undefined) t.autonomy.cameraHoldBearingDeg = num(a.cameraHoldBearingDeg);
    if (a.activeWaypointId !== undefined) t.autonomy.activeWaypointId = a.activeWaypointId ?? null;
    if (a.commsLossPolicy === "rtl" || a.commsLossPolicy === "hold" || a.commsLossPolicy === "continue") t.autonomy.commsLossPolicy = a.commsLossPolicy;
    if (a.activeMissionId !== undefined) t.autonomy.activeMissionId = a.activeMissionId == null ? null : String(a.activeMissionId);
    if (Array.isArray(a.waypoints)) {
      t.autonomy.waypoints = a.waypoints
        .filter((w: any) => w && num(w.lat) != null && num(w.lon) != null)
        .map((w: any, i: number) => ({ id: String(w.id ?? `wp_${i}`), lat: num(w.lat)!, lon: num(w.lon)!, label: str(w.label) ?? undefined, loiter: w.loiter }));
    }
  }

  if (env.power) {
    const p = env.power;
    t.power = {
      solarInputW: num(p.solarInputW),
      panelTempC: num(p.panelTempC),
      batterySocPct: num(p.batterySocPct),
      batteryVoltage: num(p.batteryVoltage),
      loadW: num(p.loadW),
      estRuntimeH: num(p.estRuntimeH),
      sunRepositionSuggested: !!p.sunRepositionSuggested,
    };
  }

  // Hardware safety sensors — map only the fields the vehicle actually reports; the rest stay
  // null so the safety strip shows "—" (no sensor wired) rather than a false all-clear.
  if (env.safety && typeof env.safety === "object") {
    const s = env.safety;
    const bool = (v: any) => (typeof v === "boolean" ? v : null);
    t.safety = {
      killSwitchEngaged: bool(s.killSwitchEngaged),
      deadmanSecondsRemaining: num(s.deadmanSecondsRemaining),
      deadmanWindowS: num(s.deadmanWindowS),
      leakDetected: bool(s.leakDetected),
      waterIntrusionRaw: num(s.waterIntrusionRaw),
      maxEscTempC: num(s.maxEscTempC),
      thermalAlarm: bool(s.thermalAlarm),
      maxThrusterCurrentA: num(s.maxThrusterCurrentA),
      overcurrentAlarm: bool(s.overcurrentAlarm),
      lowBattery: bool(s.lowBattery),
    };
  }

  if (env.comms) {
    const c = env.comms;
    if (Array.isArray(c.radios)) {
      c.radios.forEach((r: any) => {
        const target = t.comms.radios.find((x) => x.kind === r?.kind);
        if (!target) return;
        target.connected = !!r.connected;
        target.rssiDbm = num(r.rssiDbm);
        target.latencyMs = num(r.latencyMs);
        target.throughputKbps = num(r.throughputKbps);
      });
    }
    if (c.acoustic) t.comms.acoustic = { connected: !!c.acoustic.connected, carrierKhz: num(c.acoustic.carrierKhz), snrDb: num(c.acoustic.snrDb), rangeM: num(c.acoustic.rangeM), lastPingMsAgo: num(c.acoustic.lastPingMsAgo) };
    if (c.hydrophone) {
      const hb = c.hydrophone.bandHz;
      const spec = Array.isArray(c.hydrophone.spectrum)
        ? c.hydrophone.spectrum.map((x: unknown) => Math.max(0, Math.min(1, num(x) ?? 0)))
        : null;
      t.comms.hydrophone = {
        levelDb: num(c.hydrophone.levelDb),
        peakBearingDeg: num(c.hydrophone.peakBearingDeg),
        bandHz: hb && num(hb.lo) != null ? { lo: num(hb.lo)!, hi: num(hb.hi) ?? 0 } : null,
        gainDb: num(c.hydrophone.gainDb),
        spectrum: spec,
      };
    }
    if (c.satellite) {
      const s = c.satellite;
      const bearer = s.bearer === "iridium" || s.bearer === "starlink" ? s.bearer : null;
      t.comms.satellite = {
        bearer,
        connected: !!s.connected,
        rssiDbm: num(s.rssiDbm),
        credits: num(s.credits),
        mtQueued: num(s.mtQueued) ?? 0,
        moQueued: num(s.moQueued) ?? 0,
        lastContactMsAgo: num(s.lastContactMsAgo),
        nextPassEtaS: num(s.nextPassEtaS),
      };
    }
    if (typeof c.bridgeActive === "boolean") t.comms.bridgeActive = c.bridgeActive;
    if (c.lastUplink) t.comms.lastUplink = { atMsAgo: num(c.lastUplink.atMsAgo), summary: str(c.lastUplink.summary) };
  }

  if (env.camera) {
    const cam = env.camera;
    t.camera = { active: !!cam.active, streamUrl: str(cam.streamUrl), zoom: num(cam.zoom), bearingDeg: num(cam.bearingDeg), tiltDeg: num(cam.tiltDeg) };
  }

  if (env.lidar) t.lidar = mapScope(env.lidar, t.lidar, "ld");
  if (env.radar) t.radar = mapScope(env.radar, t.radar, "rd");
  if (env.bluesight) t.bluesight = { active: !!env.bluesight.active, wifi: mapContacts(env.bluesight.wifi, "wf", "wifi") };

  return t;
}

export interface AckState {
  label: string;
  ok: boolean;
  detail?: string;
  at: number;
}

export function useBuoyTelemetry(
  opts: { simulated?: boolean; waypoints?: Waypoint[]; missionPlan?: MissionPlan | null } = {},
) {
  const { simulated = false, waypoints, missionPlan } = opts;

  // Stable ref so the sim's steering context never widens the telemetry memo deps.
  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;
  const missionPlanRef = useRef(missionPlan ?? null);
  missionPlanRef.current = missionPlan ?? null;

  const { data: envelopeData } = useSWR(ENDPOINTS.telemetry, jsonFetcher, { refreshInterval: 2500, revalidateOnFocus: false, keepPreviousData: true });
  const { data: sensorsData } = useSWR(ENDPOINTS.sensors, jsonFetcher, { refreshInterval: 5000, revalidateOnFocus: false, keepPreviousData: true });
  const { data: devicesData } = useSWR(ENDPOINTS.devices, jsonFetcher, { refreshInterval: 15000, revalidateOnFocus: false, keepPreviousData: true });

  // ── Optional live SSE accelerator (additive; the SWR poll above stays the always-on fallback) ──
  // Pushes the MAS /stream envelope into the SAME slot the poll fills — both flow through
  // overlayEnvelope, so command/ack/ledger logic is untouched. Freeze-safe: exactly one setState
  // per ~2.5s telemetry frame (== poll cadence), the EventSource is closed on unmount / sim-toggle /
  // tab-hidden, and only the `sseEnvelope` state value enters the telemetry memo deps. The map still
  // sees telemetry only via the stable telemetryRef in MapZone. Disable with NEXT_PUBLIC_PSATHYRELLA_SSE=0.
  const streamEnabled = !simulated && process.env.NEXT_PUBLIC_PSATHYRELLA_SSE !== "0";
  const [sseEnvelope, setSseEnvelope] = useState<any>(null);
  useEffect(() => {
    if (!streamEnabled || typeof window === "undefined") return;
    let es: EventSource | null = null;
    const open = () => {
      if (es || document.hidden) return;
      try {
        es = new EventSource(ENDPOINTS.stream);
        es.addEventListener("telemetry", (e: MessageEvent) => {
          try { setSseEnvelope(JSON.parse(e.data)); } catch { /* ignore malformed frame */ }
        });
        // Keep SWR polling on error; the native EventSource retries on its own — no setState storm.
        es.onerror = () => {};
      } catch { /* EventSource unavailable — poll carries on */ }
    };
    const close = () => { if (es) { es.close(); es = null; } };
    const onVis = () => { if (document.hidden) close(); else open(); };
    open();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); close(); };
  }, [streamEnabled]);

  // Animation clock — only ticking while SIMULATION mode is active. Each tick ALSO advances
  // the physics world (autopilot steering + force/torque integration, sub-stepped at 50ms
  // inside stepPhysics) before triggering the memo re-render that reads the new state.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!simulated) return;
    const id = setInterval(() => {
      const phys = physicsRef.current;
      if (phys) {
        const now = Date.now();
        const boot = simBootStartRef.current ?? now;
        if (now - boot >= SIM_BOOT_TOTAL_MS) {
          const wps = missionPlanRef.current ? missionToWaypoints(missionPlanRef.current) : (waypointsRef.current ?? []);
          autopilotStep(phys, wps);
          stepPhysics(phys, Math.min(1, (now - lastStepRef.current) / 1000));
        }
        lastStepRef.current = now;
      }
      setTick((x) => (x + 1) % 1_000_000);
    }, 250);
    return () => clearInterval(id);
  }, [simulated]);

  const simRef = useRef(simulated);
  simRef.current = simulated;

  // ── SIM physics — scale-true vessel model (lib/psathyrella/simPhysics.ts) ──────────────
  // The sim buoy MOVES from real dynamics: joystick/thruster commands set pod thrust+azimuth,
  // net force/torque integrates into GPS position; waypoints engage a GPS autopilot (dock-to-
  // dock). State lives in a ref (never a memo dep); stepped inside the 250ms sim tick.
  const physicsRef = useRef<SimPhysicsState | null>(null);
  const simBootStartRef = useRef<number | null>(null);
  const lastStepRef = useRef(0);
  const lastVectorRef = useRef<{ headingDeg: number; magnitudePct: number; yawRateDegS: number } | null>(null);
  const simModeRef = useRef<BuoyTelemetry["autonomy"]["mode"]>("MANUAL");

  // SIM rising edge = vessel power-on: fresh physics at the site anchor + startup sequence.
  useEffect(() => {
    if (simulated) {
      physicsRef.current = createSimState(32.56289, -117.1357);
      simBootStartRef.current = Date.now();
      lastStepRef.current = Date.now();
      lastVectorRef.current = null;
      simModeRef.current = "MANUAL";
    } else {
      physicsRef.current = null;
      simBootStartRef.current = null;
    }
  }, [simulated]);

  // Dropping waypoints (or a mission) engages the GPS autopilot from the first waypoint.
  useEffect(() => {
    const phys = physicsRef.current;
    if (!simulated || !phys) return;
    const wps = missionPlan ? missionToWaypoints(missionPlan) : (waypoints ?? []);
    if (wps.length) {
      phys.navActive = true;
      phys.arrived = false;
      phys.waypointIndex = 0;
    } else {
      phys.navActive = false;
    }
  }, [simulated, waypoints, missionPlan]);

  const [ack, setAck] = useState<AckState | null>(null);

  // ── Command ledger + store-and-forward queue ──────────────────────────────
  // Every dispatched command becomes a CommandRecord (newest first, capped). When
  // there is no link the record stays "queued" and flushQueue() retries it on
  // reconnect. validUntil → "expired". In SIMULATION the lifecycle is faked.
  const [commandLedger, setCommandLedger] = useState<CommandRecord[]>([]);
  const seqRef = useRef(0);
  // Pending store-and-forward entries: the original command + its record id.
  const queueRef = useRef<{ recordId: string; cmd: BuoyCommand; validUntilMs?: number | null }[]>([]);
  // Per-record sim timers, cleared on unmount.
  const simTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { simTimersRef.current.forEach(clearTimeout); simTimersRef.current = []; }, []);

  const updateRecord = useCallback((id: string, patch: Partial<CommandRecord>) => {
    setCommandLedger((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const pushRecord = useCallback((rec: CommandRecord) => {
    setCommandLedger((prev) => [rec, ...prev].slice(0, LEDGER_CAP));
  }, []);

  // contactState drives store-and-forward in SIM: "dark" = no link → stay queued.
  const contactStateRef = useRef<BuoyTelemetry["contactState"]>("dark");

  const telemetry = useMemo<BuoyTelemetry>(() => {
    const base = emptyTelemetry();

    // ── base: live BME688 from the direct sensors route ──
    const sensors = (sensorsData as any)?.sensors;
    if (sensors) {
      base.bme.a = mapBme(sensors.bme688_1);
      base.bme.b = mapBme(sensors.bme688_2);
    }
    const sensorsOk = Boolean(sensors && (sensors.bme688_1 || sensors.bme688_2));

    // ── base: position + link from the device registry ──
    let registryLink: LinkState = "unknown";
    const rows: any[] = Array.isArray((devicesData as any)?.devices) ? (devicesData as any).devices : [];
    const row = rows.find(
      (d) =>
        d?.id === PSATHYRELLA_DEVICE_ID ||
        String(d?.registry_id || "").toLowerCase() === "mycobrain-com4" ||
        String(d?.id || "").toLowerCase().includes("psathyrella")
    );
    if (row) {
      const lat = Number(row?.location?.lat);
      const lon = Number(row?.location?.lon ?? row?.location?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        base.pose.lat = lat;
        base.pose.lon = lon;
        base.pose.gpsLock = "site";
      }
      const status = String(row?.status || row?.telemetry?.status || "").toLowerCase();
      registryLink = status.includes("offline") ? "offline" : status.includes("stale") ? "stale" : "online";
      base.source = typeof row?.source === "string" ? row.source : "field";
    }
    base.link = sensorsOk ? "online" : registryLink;
    const ts = (sensorsData as any)?.timestamp;
    base.lastUpdateMsAgo = ts ? Math.max(0, Date.now() - new Date(ts).getTime()) : null;

    // ── overlay: the fused MAS envelope (wins where present) — prefer the live SSE push frame
    // when present, else the polled envelope. Both unwrap via overlayEnvelope's raw.telemetry ?? raw.
    overlayEnvelope(base, sseEnvelope ?? envelopeData);

    if (simulated) {
      const simT = simulateTelemetry(base, Date.now(), { waypoints: waypointsRef.current, missionPlan: missionPlanRef.current });
      // ── PHYSICS OVERLAY: pose/thrusters/autonomy come from the real vessel model; the rest
      // (contacts, comms, mesh, peers, sensors) stays from the ambient sim. ──
      const phys = physicsRef.current;
      if (phys) {
        const now = Date.now();
        const bootMs = simBootStartRef.current != null ? now - simBootStartRef.current : Infinity;
        const booting = bootMs < SIM_BOOT_TOTAL_MS;
        const g = gpsRead(phys);
        simT.pose = {
          ...simT.pose,
          lat: g.lat,
          lon: g.lon,
          headingDeg: g.headingDeg,
          speedKn: booting ? 0 : +g.speedKn.toFixed(2),
          gpsLock: bootMs >= 3900 ? "locked" : "unavailable", // GPS fix lands at the boot-sequence step
        };
        simT.propulsion = {
          ...simT.propulsion,
          commandedVector: lastVectorRef.current,
          thrusters: simT.propulsion.thrusters.map((t, i) => {
            const pod = phys.pods[i];
            if (!pod) return t;
            const thr = booting || !phys.armed ? 0 : Math.round(pod.throttlePct);
            return {
              ...t,
              throttlePct: thr,
              azimuthDeg: Math.round(((pod.azActualDeg % 360) + 360) % 360),
              currentA: +((Math.abs(thr) / 100) ** 1.5 * 13).toFixed(1), // 13A max per DD spec
              rpm: thr === 0 ? 0 : Math.round(thr * 35),
            };
          }),
        };
        const wps = missionPlanRef.current ? missionToWaypoints(missionPlanRef.current) : (waypointsRef.current ?? []);
        simT.autonomy = {
          ...simT.autonomy,
          armed: phys.armed,
          mode: phys.navActive ? "AUTO" : simModeRef.current,
          activeWaypointId: wps[phys.waypointIndex]?.id ?? null,
        };
      }
      return simT;
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeData, sseEnvelope, sensorsData, devicesData, simulated, tick]);

  // Keep the contactState ref current (used by the sim store-and-forward gate)
  // without widening any memo deps.
  useEffect(() => {
    contactStateRef.current = telemetry.contactState;
  }, [telemetry.contactState]);

  // Bearer the ledger records against a command, for the ops timeline.
  const bearerFor = useCallback((cmd: BuoyCommand): CommandRecord["bearer"] => {
    if (cmd.domain === "comms" && cmd.action === "ping") return "acoustic";
    if (cmd.domain === "comms" && cmd.action === "recordHydrophone") return "acoustic";
    if (cmd.domain === "acoustic") return "acoustic";
    if (cmd.domain === "comms" && cmd.action === "setBearer") return cmd.bearer;
    const sat = telemetry.comms.satellite;
    if (telemetry.contactState === "dark" || (telemetry.contactState === "delayed" && sat.connected)) return "satellite";
    const best = telemetry.comms.radios
      .filter((r) => r.connected && r.rssiDbm != null)
      .sort((a, b) => (BEARER_PRIORITY[a.kind] - BEARER_PRIORITY[b.kind]) || ((b.rssiDbm ?? -999) - (a.rssiDbm ?? -999)))[0];
    return (best?.kind as RadioKind | undefined) ?? null;
  }, [telemetry.comms.satellite, telemetry.comms.radios, telemetry.contactState]);

  const validUntilOf = useCallback((cmd: BuoyCommand): number | null | undefined => {
    if (cmd.domain === "mission" && cmd.action === "upload") return cmd.plan.validUntilMs ?? null;
    return undefined;
  }, []);

  // Drive a record through the simulated lifecycle: queued→sent→applied, or stay
  // "queued" while contactState==="dark" (store-and-forward), flushed on return.
  const runSimLifecycle = useCallback((recordId: string, validUntilMs?: number | null) => {
    if (validUntilMs != null && Date.now() > validUntilMs) {
      updateRecord(recordId, { state: "expired", detail: "validity window passed" });
      return;
    }
    if (contactStateRef.current === "dark") {
      // No link: leave it queued for flushQueue() to retry on reconnect.
      updateRecord(recordId, { state: "queued", detail: "no link — store & forward" });
      return;
    }
    const created = Date.now();
    const t1 = setTimeout(() => updateRecord(recordId, { state: "sent", sentMs: Date.now(), detail: "sim" }), 200);
    const t2 = setTimeout(() => {
      const ackMs = Date.now();
      updateRecord(recordId, { state: "applied", ackMs, latencyMs: ackMs - created, detail: "sim" });
    }, 600);
    simTimersRef.current.push(t1, t2);
  }, [updateRecord]);

  const sendCommand = useCallback(async (cmd: BuoyCommand): Promise<boolean> => {
    const req = buildCommandRequest(cmd);
    const id = `cmd_${Date.now().toString(36)}_${(seqRef.current + 1).toString(36)}`;
    const seq = ++seqRef.current;
    const validUntilMs = validUntilOf(cmd);
    const record: CommandRecord = {
      id,
      seq,
      label: req.label,
      domain: cmd.domain,
      state: "queued",
      bearer: bearerFor(cmd),
      createdMs: Date.now(),
    };
    pushRecord(record);

    // Expired before it could ever go out.
    if (validUntilMs != null && Date.now() > validUntilMs) {
      updateRecord(id, { state: "expired", detail: "validity window passed" });
      setAck({ label: req.label, ok: false, detail: "expired", at: Date.now() });
      return false;
    }

    if (simRef.current) {
      // ── apply the command to the SIM physics — the vessel actually responds ──
      const phys = physicsRef.current;
      if (phys) {
        if (cmd.domain === "thruster") {
          if (cmd.action === "setVector") {
            applyThrustVector(phys, cmd.headingDeg, cmd.magnitudePct, cmd.yawRateDegS);
            lastVectorRef.current = cmd.magnitudePct > 0
              ? { headingDeg: cmd.headingDeg, magnitudePct: cmd.magnitudePct, yawRateDegS: cmd.yawRateDegS }
              : null;
            if (cmd.magnitudePct > 0) phys.navActive = false; // manual stick overrides GPS nav
          } else if (cmd.action === "setThruster") {
            applyThruster(phys, cmd.id, cmd.throttlePct, cmd.azimuthDeg ?? null);
          } else if (cmd.action === "setAzimuth") {
            applyThruster(phys, cmd.id, null, cmd.azimuthDeg);
          } else if (cmd.action === "allStop") {
            applyAllStop(phys);
            lastVectorRef.current = null;
          }
        } else if (cmd.domain === "autonomy") {
          if (cmd.action === "arm") phys.armed = cmd.armed;
          else if (cmd.action === "setMode") {
            simModeRef.current = cmd.mode;
            if (cmd.mode === "AUTO" || cmd.mode === "GUIDED") { phys.navActive = true; phys.arrived = false; }
            if (cmd.mode === "MANUAL") phys.navActive = false;
          }
        }
      }
      const dark = contactStateRef.current === "dark";
      if (dark) {
        queueRef.current.push({ recordId: id, cmd, validUntilMs });
        setAck({ label: req.label, ok: true, detail: "queued (no link)", at: Date.now() });
        // leave record "queued"; flushQueue() will run the lifecycle on reconnect
        return true;
      }
      runSimLifecycle(id, validUntilMs);
      setAck({ label: req.label, ok: true, detail: "sim", at: Date.now() });
      return true;
    }

    try {
      updateRecord(id, { state: "sent", sentMs: Date.now() });
      // clientCommandId lets MAS echo our record id back as ack.commandId so async
      // (satellite) acks correlate by id, not arrival order.
      const res = await fetch(req.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req.body, clientCommandId: id }) });
      let j: any = null;
      try { j = await res.json(); } catch { /* non-JSON */ }
      const envAck = j && typeof j.ack === "object" && j.ack ? j.ack : null;
      let detail: string | undefined = envAck?.detail || j?.error || j?.message || (j?.ok === false ? "rejected" : undefined);
      if (res.status === 401) detail = "auth required";
      if (res.status === 404) detail = "no backend route yet";

      // ── Consume the MAS ack envelope (authoritative lifecycle) ──
      if (res.ok && envAck) {
        const ms = String(envAck.state || "").toLowerCase();
        const mapped: CommandRecord["state"] =
          ms === "applied" ? "applied" :
          ms === "acked" ? "acked" :
          ms === "sent" ? "sent" :
          ms === "queued" ? "queued" :
          ms === "expired" ? "expired" :
          ms === "failed" ? "failed" : "applied";
        const latencyMs = typeof envAck.latencyMs === "number" ? envAck.latencyMs
          : (typeof envAck.appliedMs === "number" && typeof envAck.acceptedMs === "number" ? envAck.appliedMs - envAck.acceptedMs : Date.now() - record.createdMs);
        const ackBearer = typeof envAck.bearer === "string" ? (envAck.bearer as CommandRecord["bearer"]) : undefined;
        updateRecord(id, { state: mapped, ackMs: Date.now(), latencyMs, detail, ...(ackBearer ? { bearer: ackBearer } : {}) });
        const okState = mapped === "applied" || mapped === "acked";
        setAck({ label: req.label, ok: okState, detail, at: Date.now() });
        return mapped !== "failed" && mapped !== "expired";
      }

      // ── No ack envelope (legacy/other routes): HTTP status is the signal ──
      if (res.ok) {
        const ackMs = Date.now();
        updateRecord(id, { state: "applied", ackMs, latencyMs: ackMs - record.createdMs, detail });
      } else {
        updateRecord(id, { state: "failed", detail });
      }
      setAck({ label: req.label, ok: res.ok, detail, at: Date.now() });
      return res.ok;
    } catch {
      // Offline / no link: keep it "queued" for store-and-forward retry.
      queueRef.current.push({ recordId: id, cmd, validUntilMs });
      updateRecord(id, { state: "queued", detail: "no link — store & forward" });
      setAck({ label: req.label, ok: false, detail: "no link", at: Date.now() });
      return false;
    }
  }, [bearerFor, validUntilOf, pushRecord, updateRecord, runSimLifecycle]);

  // Retry every store-and-forwarded command. Drops & expires those past validity.
  const flushQueue = useCallback(async () => {
    const pending = queueRef.current;
    queueRef.current = [];
    for (const item of pending) {
      if (item.validUntilMs != null && Date.now() > item.validUntilMs) {
        updateRecord(item.recordId, { state: "expired", detail: "validity window passed" });
        continue;
      }
      if (simRef.current) {
        if (contactStateRef.current === "dark") {
          queueRef.current.push(item); // still dark — keep queued
          continue;
        }
        runSimLifecycle(item.recordId, item.validUntilMs);
        continue;
      }
      const req = buildCommandRequest(item.cmd);
      try {
        updateRecord(item.recordId, { state: "sent", sentMs: Date.now() });
        const res = await fetch(req.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req.body, clientCommandId: item.recordId }) });
        let j: any = null;
        try { j = await res.json(); } catch { /* */ }
        const envAck = j && typeof j.ack === "object" && j.ack ? j.ack : null;
        if (res.ok && envAck) {
          const ms = String(envAck.state || "").toLowerCase();
          const mapped: CommandRecord["state"] = ms === "acked" ? "acked" : ms === "failed" ? "failed" : ms === "expired" ? "expired" : "applied";
          updateRecord(item.recordId, { state: mapped, ackMs: Date.now(), latencyMs: typeof envAck.latencyMs === "number" ? envAck.latencyMs : undefined, detail: envAck.detail || "flushed" });
        } else if (res.ok) {
          const ackMs = Date.now();
          updateRecord(item.recordId, { state: "applied", ackMs, detail: "flushed" });
        } else {
          updateRecord(item.recordId, { state: "failed", detail: `HTTP ${res.status}` });
        }
      } catch {
        queueRef.current.push(item); // still no link — keep queued
        updateRecord(item.recordId, { state: "queued", detail: "no link — store & forward" });
      }
    }
  }, [updateRecord, runSimLifecycle]);

  // Auto-flush when the link returns (contactState leaves "dark").
  useEffect(() => {
    if (telemetry.contactState !== "dark" && queueRef.current.length > 0) {
      void flushQueue();
    }
  }, [telemetry.contactState, flushQueue]);

  // simBootElapsedMs: null when not simulating; the console renders the startup card while
  // it's below SIM_BOOT_TOTAL_MS (+ a linger). Recomputed each 250ms tick render.
  const simBootElapsedMs = simulated && simBootStartRef.current != null ? Date.now() - simBootStartRef.current : null;

  return { telemetry, sendCommand, ack, commandLedger, flushQueue, simBootElapsedMs };
}
