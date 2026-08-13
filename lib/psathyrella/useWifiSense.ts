"use client";

/**
 * useWifiSense — the data layer for the buoy's WiFi-sense surface.
 *
 * WHAT THIS SENSOR ACTUALLY IS (read before extending it)
 * WiFi-sense on this platform is PASSIVE RF. The ESP32s already on the buoy listen in promiscuous
 * mode and report the 802.11 radios they hear (source MAC, RSSI, channel, first/last heard), and/or a
 * coarse RSSI/CSI disturbance signal. That is the whole capability. It detects RADIOS and it detects
 * DISTURBANCE. It does not detect people, it does not localize, and it does not produce body pose.
 *
 * WHY THERE IS NO POSE HERE. "DensePose from WiFi" (arXiv 2301.00250) released no code, no weights,
 * no dataset and no eval; the popular GitHub repo that appears in its place was independently audited
 * and found to return RANDOM ARRAYS from its ESP32 CSI parser behind a fabricated accuracy claim. The
 * paper's own rig is two mains-powered 3x3 routers in a fixed surveyed indoor room, and its ground
 * truth was pseudo-labelled from co-located CAMERA footage — if you have the camera that trains it,
 * you already have the pose. And the physics does not travel: CSI sensing runs on rich indoor
 * multipath, while open water is the lowest-multipath environment there is. So pose is not "not yet"
 * on this platform, it is not on the roadmap, and nothing in this file will ever emit a skeleton. The
 * tower optics (IMX477 + the 360° ring) are this buoy's person-detection sensor.
 *
 * WHAT IT POLLS: the existing BFF at `/api/mindex/wifisense`, which proxies MINDEX
 * `/api/mindex/wifisense/status` + `/events?limit=50`.
 *
 * THE TRAP IN THAT ROUTE — the reason so much of this file is refusal logic. The BFF returns a
 * FULLY-POPULATED FALLBACK BODY on every failure path (404 from MINDEX, zero registered nodes, and a
 * thrown fetch error) and that fallback hardcodes `processing_mode: "phase0"`. Reading capability
 * straight off the payload would therefore make the console claim an RSSI sensing pipeline that
 * MINDEX never answered for. So `capability` is only ever read from a response that was BOTH ok AND
 * self-reported `enabled: true`; anything else is null.
 *
 * THE OTHER TRAP: the BFF's `zones[]` and `devices_count` describe the WiFi-sense SENSING NODES
 * registered in MINDEX (one zone is synthesized per node), NOT the radios those nodes heard. Mapping
 * zones onto `devices` would turn "we have 3 sensors installed" into "3 contacts detected" — a
 * fabricated contact count on an operator console. `devices` is populated ONLY from an explicit
 * per-radio list. No list ⇒ empty, and the note says the backend does not serve one.
 *
 * Freeze-safety, mirroring useCameraDetections: exactly ONE setState per poll, polling stops while
 * the tab is hidden, the in-flight request is aborted on unmount, and nothing ever throws into React.
 */

import { useEffect, useState } from "react";

export interface WifiSenseDevice {
  /** Radio identity as the backend reported it (usually a MAC, often randomized). Never synthesized. */
  id: string;
  /** Measured receive strength. Null unless a radio actually reported one — never back-solved. */
  rssiDbm: number | null;
  /** OUI vendor guess. Meaningless for a randomized MAC, so it is nullable and never inferred here. */
  vendor: string | null;
  firstSeenMs: number | null;
  lastSeenMs: number | null;
  /** Direction to the radio. NULL unless the backend genuinely measured one — see parseBearing. */
  bearingDeg: number | null;
  /** How the bearing was obtained (e.g. an antenna array). Null when the backend did not say. */
  bearingMethod: string | null;
  /** Backend-computed range. Never derived client-side from RSSI (see parseRange). */
  rangeEstimateM: number | null;
}

export interface WifiSenseState {
  /** Radios the backend reports hearing. Radios, not people — one person carries 1–3. */
  devices: WifiSenseDevice[];
  /** Disturbance state when the backend reports one; null means UNKNOWN, never "all clear". */
  motion: { detected: boolean; confidence: number | null } | null;
  /** What the backend says this sensor can do ("presence" | "rssi-motion" | "csi"). Null = it did not say. */
  capability: string | null;
  /** The BFF answered this poll with a usable body. */
  connected: boolean;
  /** MINDEX's OWN enabled flag for the WiFi-sense pipeline — not a client-side toggle. */
  enabled: boolean;
  /** LOCAL epoch-ms arrival time of the last SUCCESSFUL poll (not a backend clock). */
  lastMs: number | null;
  /** One honest line for the operator about why the panel looks the way it does. */
  note: string | null;
}

/**
 * Backend `processing_mode` → the capability vocabulary this console renders.
 * "phase0" is the BFF's own label for RSSI-based detection, so it maps to the coarse RSSI tier —
 * NOT to "presence", which would imply the probe-request radio enumeration the pipeline has not
 * demonstrated. An unrecognized mode maps to nothing and is surfaced verbatim in the note instead:
 * passing a string we cannot interpret through as a capability label would be a claim we cannot back.
 */
const CAPABILITY_BY_MODE: Record<string, string> = {
  phase0: "rssi-motion",
  rssi: "rssi-motion",
  presence: "presence",
  csi: "csi",
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A 0..1 score. Out-of-range values are malformed, not clamped — clamping invents a reading. */
const unit = (v: unknown): number | null => {
  const n = fin(v);
  return n !== null && n >= 0 && n <= 1 ? n : null;
};

/** First non-null string across a set of spellings the backend might use. */
const pickStr = (raw: Record<string, unknown>, keys: string[]): string | null => {
  for (const k of keys) {
    const s = str(raw[k]);
    if (s !== null) return s;
  }
  return null;
};

const pickNum = (raw: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) {
    const n = fin(raw[k]);
    if (n !== null) return n;
  }
  return null;
};

/**
 * Epoch-ms from either an ISO string or a number. Seconds-vs-milliseconds is disambiguated by
 * magnitude because a timestamp rendered 1000x off would read as a device last heard in 1970 —
 * worse than showing nothing. Anything outside both plausible windows is rejected.
 */
function epochMs(raw: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k];
    const n = fin(v);
    if (n !== null) {
      if (n >= 1e12) return n; // already milliseconds
      if (n >= 1e9) return n * 1000; // seconds
      continue;
    }
    const s = str(v);
    if (s !== null) {
      const parsed = Date.parse(s);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

/**
 * RSSI is only accepted inside a real receiver's range. A positive number is very likely a magnitude
 * with the sign dropped, and negating it here would be this console INVENTING the sign a radio never
 * reported — so it is rejected instead, and the row shows "—".
 */
function parseRssi(raw: Record<string, unknown>): number | null {
  const n = pickNum(raw, ["rssiDbm", "rssi_dbm", "rssi", "signal_dbm"]);
  if (n === null) return null;
  return n <= 0 && n >= -120 ? n : null;
}

/**
 * A bearing puts a contact on one side of the boat, so it is passed through ONLY when the backend
 * measured one. Nothing here derives a direction from signal strength — a single omni antenna cannot
 * produce one, and a guessed bearing would point an operator the wrong way.
 */
function parseBearing(raw: Record<string, unknown>): number | null {
  const n = pickNum(raw, ["bearingDeg", "bearing_deg", "bearing"]);
  if (n === null) return null;
  return ((n % 360) + 360) % 360;
}

/**
 * Range is passed through, never computed. RSSI-to-range is non-metric over water (sea-surface
 * reflection, multipath fading, antenna orientation), so this console must not turn a signal level
 * into meters; only a backend with a real ranging method (e.g. 802.11mc FTM) may fill this in.
 */
function parseRange(raw: Record<string, unknown>): number | null {
  const n = pickNum(raw, ["rangeEstimateM", "range_estimate_m", "range_m"]);
  return n !== null && n > 0 ? n : null;
}

function parseDevice(entry: unknown): WifiSenseDevice | null {
  if (!isRecord(entry)) return null;
  // No identity ⇒ no row. Indexing an anonymous entry would mint a radio id the backend never had.
  const id = pickStr(entry, ["id", "mac", "bssid", "station_mac", "device_id", "deviceId"]);
  if (id === null) return null;
  return {
    id,
    rssiDbm: parseRssi(entry),
    vendor: pickStr(entry, ["vendor", "oui_vendor", "manufacturer"]),
    firstSeenMs: epochMs(entry, ["firstSeenMs", "first_seen_ms", "firstMs", "first_seen", "first_heard"]),
    lastSeenMs: epochMs(entry, ["lastSeenMs", "last_seen_ms", "lastMs", "last_seen", "last_heard"]),
    bearingDeg: parseBearing(entry),
    bearingMethod: pickStr(entry, ["bearingMethod", "bearing_method"]),
    rangeEstimateM: parseRange(entry),
  };
}

/**
 * Motion from the BFF's `motion_events[]`, which carry a categorical `level` plus a `variance`.
 *
 * `variance` is NOT a confidence and is never promoted into one — confidence stays null unless the
 * backend sends an actual 0..1 score.
 *
 * An EMPTY events array returns null (unknown), not `detected: false`. The BFF folds an events-endpoint
 * failure into `[]` (`eventsRes.ok ? await eventsRes.json() : []`), so an empty array is ambiguous
 * between "nothing moved" and "the events feed is down". On a security surface the dangerous direction
 * is printing a green all-clear during an outage, so ambiguity resolves to UNKNOWN.
 */
function parseMotion(payload: Record<string, unknown>): { detected: boolean; confidence: number | null } | null {
  const direct = payload.motion;
  if (isRecord(direct) && typeof direct.detected === "boolean") {
    return { detected: direct.detected, confidence: unit(direct.confidence) };
  }
  const events = payload.motion_events;
  if (!Array.isArray(events) || events.length === 0) return null;

  let sawLevel = false;
  let detected = false;
  let confidence: number | null = null;
  for (const e of events) {
    if (!isRecord(e)) continue;
    const level = str(e.level);
    if (level !== null) {
      sawLevel = true;
      if (level !== "none") detected = true;
    }
    const c = unit(e.confidence);
    if (c !== null && (confidence === null || c > confidence)) confidence = c;
  }
  // A confidence with no level is not a detection decision we are entitled to make.
  return sawLevel ? { detected, confidence } : null;
}

/**
 * Map the JETSON-LOCAL `/wifisense/events` payload (proxied at
 * `/api/psathyrella/fusion-sensors/wifisense`) into `WifiSenseState`.
 *
 * WHY THIS EXISTS: this hook was written against MINDEX's shape (`enabled` / `processing_mode` /
 * `devices[]`) and polled `/api/mindex/wifisense`. That backend now answers **HTTP 401**, so the
 * panel reported "SENSOR UNREACHABLE" while a live, healthy sensor was publishing on the Jetson the
 * whole time. Per the Aug 03 RF-architecture decision the Jetson endpoint is canonical and MINDEX is
 * legacy, so it is tried first and MINDEX is kept only as a fallback.
 *
 * Returns null when the body is not Jetson-shaped, so the caller can fall through cleanly rather
 * than manufacturing an empty state from a payload it did not understand.
 */
function parseJetsonWifiSense(payload: Record<string, unknown>): Omit<WifiSenseState, "lastMs"> | null {
  const detections = Array.isArray(payload.detections) ? payload.detections : null;
  const phase = str(payload.phase);
  if (detections === null && phase === null) return null; // not this backend's shape

  const devices: WifiSenseDevice[] = (detections ?? [])
    .map((raw): WifiSenseDevice | null => {
      if (!isRecord(raw)) return null;
      const id = str(raw.id) ?? str(raw.bssid);
      if (id === null) return null; // a radio with no identity is not a radio we can show
      const lastSeen = str(raw.lastSeen);
      const firstSeen = str(raw.firstSeen);
      const t = (s: string | null): number | null => {
        if (s === null) return null;
        const ms = Date.parse(s);
        return Number.isFinite(ms) ? ms : null;
      };
      return {
        id,
        rssiDbm: fin(raw.rssiDbm),
        vendor: str(raw.vendor) ?? str(raw.ssid),
        firstSeenMs: t(firstSeen),
        lastSeenMs: t(lastSeen),
        // Stays null: a single antenna has no angle of arrival. Direction comes from the LD2450.
        bearingDeg: fin(raw.bearingDeg),
        bearingMethod: str(raw.bearingMethod),
        rangeEstimateM: fin(raw.rangeEstimateM),
      } as WifiSenseDevice;
    })
    .filter((d): d is WifiSenseDevice => d !== null);

  // "phase0-rssi" is RSSI-tier detection, not probe-request presence enumeration. Map it to the
  // coarse tier only; an unrecognized phase yields no capability rather than a claim we cannot back.
  const capability =
    phase === null ? null : (CAPABILITY_BY_MODE[phase] ?? CAPABILITY_BY_MODE[phase.split("-")[0]] ?? null);

  const present = str(payload.hardware) === "present";
  const notes: string[] = [];
  const backendNote = str(payload.note);
  if (backendNote !== null) notes.push(backendNote);
  if (phase !== null && capability === null) notes.push(`Backend reported an unrecognized phase "${phase}".`);
  // Surface the upstream MINDEX failure rather than hiding it — the local sensor is fine, but a
  // degraded upstream is still something the operator should know about.
  const upstream = isRecord(payload.upstream) ? payload.upstream : null;
  const upStatus = upstream ? fin(upstream.eventsStatus) : null;
  if (upStatus !== null && upStatus !== 200 && upStatus !== 0) {
    notes.push(`Upstream MINDEX events returned HTTP ${upStatus}; this panel is using the local Jetson sensor.`);
  }

  return {
    devices,
    // No disturbance field on this payload. Null means UNKNOWN — never synthesized as "no motion",
    // which would read as an all-clear the sensor never gave.
    motion: null,
    capability,
    connected: true,
    enabled: present,
    note: notes.length > 0 ? notes.join(" ") : null,
  };
}

const IDLE: WifiSenseState = {
  devices: [],
  motion: null,
  capability: null,
  connected: false,
  enabled: false,
  lastMs: null,
  note: null,
};

export function useWifiSense(opts?: { enabled?: boolean; refreshMs?: number }): WifiSenseState {
  const polling = opts?.enabled !== false;
  // RF presence changes on the order of seconds; a 5 s floor keeps this off the LAN's back while the
  // camera surfaces have the frame budget.
  const refreshMs = Math.max(2000, opts?.refreshMs ?? 5000);
  const [state, setState] = useState<WifiSenseState>(IDLE);

  useEffect(() => {
    if (!polling) {
      // Paused is NOT "nothing present" and NOT "unreachable" — say which one it is.
      setState({ ...IDLE, note: "Polling paused — this panel is not being updated." });
      return;
    }

    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ac = new AbortController();

    const tick = async () => {
      if (stop) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(tick, refreshMs);
        return;
      }

      let next: Omit<WifiSenseState, "lastMs"> = { ...IDLE, note: null };
      let ok = false;

      try {
        // ── Jetson-local first (canonical since the Aug 03 RF-architecture decision) ──────────────
        // MINDEX 401s today; the real sensor publishes on the Jetson. Trying MINDEX first meant the
        // panel announced "SENSOR UNREACHABLE" over a live sensor — a link failure reported as if it
        // were the sensor's state.
        try {
          const live = await fetch("/api/psathyrella/fusion-sensors/wifisense", { cache: "no-store", signal: ac.signal });
          if (live.ok) {
            const liveBody: unknown = await live.json();
            const mapped = isRecord(liveBody) ? parseJetsonWifiSense(liveBody) : null;
            if (mapped !== null) {
              if (!stop) setState({ ...mapped, lastMs: Date.now() });
              timer = setTimeout(tick, refreshMs);
              return;
            }
          }
        } catch {
          // Fall through to MINDEX. A failure here is not reported on its own: the fallback either
          // succeeds (and speaks for itself) or fails and reports its own status.
        }

        const res = await fetch("/api/mindex/wifisense", { cache: "no-store", signal: ac.signal });
        if (!res.ok) {
          next = {
            ...IDLE,
            note: `MINDEX WiFi-sense unreachable (HTTP ${res.status}) — this is a link failure, not an all-clear.`,
          };
        } else {
          const body: unknown = await res.json();
          const payload = isRecord(body) ? body : {};
          const backendEnabled = payload.enabled === true;
          const notes: string[] = [];

          // Capability is trusted ONLY from a live, self-declared-enabled body — see the header note
          // about the BFF's hardcoded "phase0" fallback.
          let capability: string | null = null;
          if (backendEnabled) {
            const declared = str(payload.capability);
            const mode = str(payload.processing_mode);
            if (declared !== null) {
              capability = declared;
            } else if (mode !== null) {
              capability = CAPABILITY_BY_MODE[mode] ?? null;
              if (capability === null) notes.push(`Backend reported an unrecognized processing_mode "${mode}".`);
            }
          }

          // Per-radio list only. `zones[]`/`devices_count` are SENSING NODES and must never become contacts.
          const rawDevices = Array.isArray(payload.devices) ? payload.devices : null;
          const devices = rawDevices ? rawDevices.map(parseDevice).filter((d): d is WifiSenseDevice => d !== null) : [];
          if (rawDevices !== null && devices.length < rawDevices.length) {
            notes.push(`${rawDevices.length - devices.length} entry(s) carried no radio id and are not shown.`);
          }

          if (!backendEnabled) {
            notes.push("MINDEX reports WiFi-sense disabled — no sensing node is registered, or the service is not deployed.");
          } else {
            if (rawDevices === null) {
              notes.push("This backend reports node and zone status only — it serves no per-radio list, so no radios can be listed.");
            }
            const nodes = fin(payload.devices_count);
            if (nodes !== null) notes.push(`${nodes} WiFi-sense sensing node(s) registered.`);
          }

          const backendNote = str(payload.note);
          if (backendNote !== null) notes.unshift(backendNote);

          next = {
            devices,
            motion: backendEnabled ? parseMotion(payload) : null,
            capability,
            connected: true,
            enabled: backendEnabled,
            note: notes.length > 0 ? notes.join(" · ") : null,
          };
          ok = true;
        }
      } catch {
        // Aborted on unmount, or a transient LAN stall — never throw into React.
        next = { ...IDLE, note: "MINDEX WiFi-sense request failed — this is a link failure, not an all-clear." };
      }

      // ONE setState per poll. lastMs holds the previous success so the panel can age a stale reading
      // instead of forgetting it ever had one.
      if (!stop) {
        const atMs = ok ? Date.now() : null;
        setState((prev) => ({ ...next, lastMs: atMs ?? prev.lastMs }));
      }
      if (!stop) timer = setTimeout(tick, refreshMs);
    };

    void tick();
    return () => {
      stop = true;
      ac.abort();
      if (timer) clearTimeout(timer);
    };
  }, [polling, refreshMs]);

  return state;
}
