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
  buildCommandRequest,
  emptyTelemetry,
  ENDPOINTS,
  PSATHYRELLA_DEVICE_ID,
  type BmeReading,
  type BuoyCommand,
  type BuoyTelemetry,
  type ContactKind,
  type LinkState,
  type ScopeFrame,
  type SensorContact,
} from "./contract";
import { simulateTelemetry } from "./sim";

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
  if (num(env.lastUpdateMsAgo) != null) t.lastUpdateMsAgo = num(env.lastUpdateMsAgo);

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
      t.comms.hydrophone = { levelDb: num(c.hydrophone.levelDb), peakBearingDeg: num(c.hydrophone.peakBearingDeg), bandHz: hb && num(hb.lo) != null ? { lo: num(hb.lo)!, hi: num(hb.hi) ?? 0 } : null };
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

export function useBuoyTelemetry(opts: { simulated?: boolean } = {}) {
  const { simulated = false } = opts;

  const { data: envelopeData } = useSWR(ENDPOINTS.telemetry, jsonFetcher, { refreshInterval: 2500, revalidateOnFocus: false, keepPreviousData: true });
  const { data: sensorsData } = useSWR(ENDPOINTS.sensors, jsonFetcher, { refreshInterval: 5000, revalidateOnFocus: false, keepPreviousData: true });
  const { data: devicesData } = useSWR(ENDPOINTS.devices, jsonFetcher, { refreshInterval: 15000, revalidateOnFocus: false, keepPreviousData: true });

  // Animation clock — only ticking while SIMULATION mode is active.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!simulated) return;
    const id = setInterval(() => setTick((x) => (x + 1) % 1_000_000), 250);
    return () => clearInterval(id);
  }, [simulated]);

  const simRef = useRef(simulated);
  simRef.current = simulated;

  const [ack, setAck] = useState<AckState | null>(null);

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

    // ── overlay: the fused MAS envelope (wins where present) ──
    overlayEnvelope(base, envelopeData);

    if (simulated) return simulateTelemetry(base, Date.now());
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeData, sensorsData, devicesData, simulated, tick]);

  const sendCommand = useCallback(async (cmd: BuoyCommand): Promise<boolean> => {
    const req = buildCommandRequest(cmd);
    if (simRef.current) {
      setAck({ label: req.label, ok: true, detail: "sim", at: Date.now() });
      return true;
    }
    try {
      const res = await fetch(req.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) });
      let detail: string | undefined;
      try {
        const j = await res.json();
        detail = j?.error || j?.message || (j?.ok === false ? "rejected" : undefined);
      } catch {
        /* non-JSON */
      }
      if (res.status === 401) detail = "auth required";
      if (res.status === 404) detail = "no backend route yet";
      setAck({ label: req.label, ok: res.ok, detail, at: Date.now() });
      return res.ok;
    } catch {
      setAck({ label: req.label, ok: false, detail: "no link", at: Date.now() });
      return false;
    }
  }, []);

  return { telemetry, sendCommand, ack };
}
