/**
 * GET /api/psathyrella/droid-systems — "what is actually happening on this droid" (owner-only).
 *
 * ONE normalized picture of every service running on the Psathyrella Jetson, probed in parallel and
 * reported with provenance. This is an operator console for a defense-adjacent platform: every value
 * here comes from a live probe of a named service, or it is `null`. There are no defaults, no
 * fallbacks, no synthesized readings — a service that does not answer is `up: false` with its error,
 * and its section is all-nulls rather than stale or invented numbers.
 *
 * Confirmed live port map (Jetson 192.168.0.123, swept Aug 01 2026):
 *   8787 MycoBrain Operator UI        — HTML root only, has NO /health (404) → probe "/" for reachability
 *   8788 psathyrella-jetson-agent     — propulsion; /health (pwm:"mock" = motors physically disconnected)
 *   8789 MycoBrain publisher          — /health { ok, delivery, lastError, lastFetchAt, queueDepth }
 *   8790 mycobrain-telemetry-hub      — /status (superset of /health): Side A/B serial, GPS, I2C scan
 *   8791 psathyrella-acoustic-tx-dry  — /status incl. a LIVE i2cdetect dump of i2c-1 (bus_scan_tail)
 *   8792 psathyrella-camera           — /health incl. a targeted i2c probe map (0x24 / 0x0c / 0x1a)
 *
 * OpenClaw runs on a NON-STANDARD high port, outside the 87xx service range — verified live Aug 02
 * 2026 at :18789, where /health answers {"ok":true,"status":"live"}. That is ALL this lane measures.
 * It is a liveness probe of one URL, and liveness is not a connected chat: the same box answers a
 * control-UI catch-all (503 "Control UI assets not found") on paths it does not serve, so "something
 * replied" proves only that a process is listening. Whether a chat route is actually serving is the
 * chat bridge's job (it additionally proves the route exists) and is deliberately NOT asserted here.
 * `reachable` is therefore driven ONLY by a real probe of PSATHYRELLA_OPENCLAW_URL, the raw payload is
 * passed through for the UI to judge, and the hub's `openclawMode` — a hub-side configuration flag —
 * is never treated as evidence of anything (see the openclaw block below).
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const HUB = process.env.PSATHYRELLA_TELEMETRY_HUB_URL || "http://192.168.0.123:8790";
const PROPULSION = process.env.PSATHYRELLA_JETSON_PROPULSION_URL || "http://192.168.0.123:8788";
const MUSHROOM1 = process.env.PSATHYRELLA_MUSHROOM1_URL || "http://192.168.0.123:8787";
const CAMERA = process.env.PSATHYRELLA_CAMERA_URL || "http://192.168.0.123:8792";
const PUBLISHER = process.env.PSATHYRELLA_PUBLISHER_URL || "http://192.168.0.123:8789";
const ACOUSTIC = process.env.PSATHYRELLA_ACOUSTIC_URL || "http://192.168.0.123:8791";
// NO default: nothing on the network serves OpenClaw today, and inventing a URL would turn an
// honest "unreachable, no endpoint exists" into a misleading "endpoint down". Set this env var the
// moment Cursor exposes the gateway and this lane starts probing for real.
const OPENCLAW = process.env.PSATHYRELLA_OPENCLAW_URL || process.env.PSATHYRELLA_OPENCLAW_STATUS_URL || "";

type Json = Record<string, unknown>;

interface ProbeResult {
  up: boolean;
  status: number | null;
  body: unknown;
  ms: number;
  error: string | null;
}

/** Object-or-null narrowing. Arrays are rejected: every payload we read is a JSON object. */
function asObj(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

/**
 * Type guards, NOT coercions. A wrong-typed or missing field becomes null — it never becomes 0,
 * "" or false, because on this console a zero that actually means "not reported" is a lie an
 * operator can act on.
 */
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
function numArray(value: unknown): number[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === "number") ? (value as number[]) : null;
}

async function probe(
  url: string,
  opts: { timeoutMs?: number; captureBody?: boolean } = {},
): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 3500),
      cache: "no-store",
    });
    // captureBody:false is for the Mushroom 1 operator UI — its root is 14 KB of HTML we only probe
    // for reachability. Reading it into the response would be pure noise on every poll.
    if (opts.captureBody === false) {
      await res.arrayBuffer();
      return { up: res.ok, status: res.status, body: null, ms: Date.now() - t0, error: null };
    }
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null; // non-JSON payload → no body; `up`/`status` still carry the truth
    }
    return { up: res.ok, status: res.status, body, ms: Date.now() - t0, error: null };
  } catch (err) {
    return { up: false, status: null, body: null, ms: Date.now() - t0, error: (err as Error).message };
  }
}

/**
 * Retry-fresh probe — MANDATORY for every Jetson lane. The dev-PC → Jetson (.123) link has a
 * documented first-SYN stall: a fresh connection intermittently hangs for seconds even though the
 * service answers in ~8 ms when curled directly on the box. A longer timeout does NOT help (a
 * stalled connection stays stalled) — only a brand-new connection recovers. So: short per-attempt
 * timeout, up to `attempts` fresh connects, first success wins. A GENUINE outage still resolves as
 * down within attempts x timeoutMs, which is the whole point — this must never paper over a dead
 * service, only over a stalled socket.
 */
async function probeFresh(url: string, attempts: number, timeoutMs: number, captureBody = true): Promise<ProbeResult> {
  let last = await probe(url, { timeoutMs, captureBody });
  for (let i = 1; i < attempts && !last.up; i++) last = await probe(url, { timeoutMs, captureBody });
  return last;
}

/* ------------------------------------------------------------------ I2C ------------------------------------------------------------------ */

type I2cState = "present" | "busy" | "absent";

interface I2cAddress {
  /** Canonical "0xNN". */
  addr: string;
  /**
   * present = a device ACKed and no kernel driver has claimed it (i2cdetect prints the hex address)
   * busy    = "UU", the address is claimed by a kernel driver so i2cdetect could not probe it
   *           (a driver holding it is evidence the device EXISTS and is bound, not that it is missing)
   * absent  = the reporting service looked for this address and did not find it
   */
  state: I2cState;
  /** The raw cell text exactly as the service reported it — no normalization, for audit. */
  cell: string | null;
}

interface I2cBus {
  /** Linux bus number, or null when the reporting service did not name one. */
  bus: number | null;
  /** WHICH service reported this row. These are three independent scans, not one authority. */
  source: string;
  addresses: I2cAddress[];
  /**
   * Did a scan actually execute?
   *   true  = the reporting service ran a scan and `addresses` is its result (empty = nothing found)
   *   false = the scan has NOT run — an empty result, which is NOT the same fact as "no devices"
   *   null  = we cannot tell from what the service reported (never claim either way)
   * The UI needs all three: "scan ran, bus empty" and "scan never ran" are different findings, and
   * collapsing them would invent one.
   */
  scanned: boolean | null;
  scannedAt: string | null;
  note: string;
}

interface I2cDetectParse {
  addresses: I2cAddress[];
  /** Recognised row labels (00:, 10:, …, 70:). Zero means the text told us nothing usable. */
  rows: number;
  /** Cells actually inspected (i2cdetect only sweeps 0x03-0x77 by default). */
  cellsScanned: number;
  /** Cells that read "--" — free. Counted, not listed: 100+ empty rows would bury the real devices. */
  free: number;
  /** Cells whose token we could not classify. DROPPED, never guessed at — counted so we can say so. */
  unknownCells: number;
  /** True when no usable row was found at all, so no address may be inferred from this text. */
  unreadable: boolean;
}

/**
 * Parse an i2cdetect text dump into addresses. Fixed-width by design: i2cdetect emits a 3-char cell
 * per column after the "NN:" row label, and the 0x00 row is PADDED (0x00-0x02 are reserved and print
 * as blanks) — so whitespace-splitting silently shifts that whole row's addresses. Column c lives at
 * offset 1 + 3c of the text following the colon.
 *
 * Fully defensive: this parses a `tail`, i.e. output that may be truncated at either end. Anything
 * that is not a well-formed row is skipped, and a malformed/short dump yields an empty address list
 * plus malformed:true — it never throws.
 */
function parseI2cDetect(text: string): I2cDetectParse {
  const addresses: I2cAddress[] = [];
  let cellsScanned = 0;
  let free = 0;
  let rows = 0;
  let unknownCells = 0;

  for (const line of String(text ?? "").split(/\r?\n/)) {
    const m = /^\s*([0-9a-fA-F]{2}):(.*)$/.exec(line);
    if (!m) continue; // header line, blank line, or a row whose label was cut off by truncation
    const base = Number.parseInt(m[1], 16);
    // i2cdetect emits exactly the rows 00,10,…,70 — the 7-bit address space. Anything else is
    // garbage that happens to look like a row label, and accepting it would print an "address" that
    // cannot exist on an I2C bus.
    if (!Number.isFinite(base) || base % 16 !== 0 || base > 0x70) continue;
    rows++;
    const rest = m[2];
    for (let col = 0; col < 16; col++) {
      const cell = rest.slice(1 + col * 3, 3 + col * 3).trim();
      if (!cell) continue; // outside the scanned range, or the tail was cut mid-row
      cellsScanned++;
      const addr = `0x${(base + col).toString(16).padStart(2, "0")}`;
      if (cell === "--") {
        free++;
      } else if (cell.toUpperCase() === "UU") {
        addresses.push({ addr, state: "busy", cell });
      } else if (/^[0-9a-fA-F]{2}$/.test(cell)) {
        // i2cdetect prints the address itself in a hit cell. A cell whose hex does NOT equal the
        // address its column stands for means our column arithmetic and the dump disagree — and an
        // address off by one column is a wrong hardware claim. Drop it rather than place a device.
        if (Number.parseInt(cell, 16) === base + col) addresses.push({ addr, state: "present", cell });
        else unknownCells++;
      } else {
        unknownCells++; // unrecognized token — do not guess what it meant
      }
    }
  }

  return { addresses, rows, cellsScanned, free, unknownCells, unreadable: rows === 0 };
}

/* --------------------------------------------------------------- MycoBrain --------------------------------------------------------------- */

/**
 * The BME688 / BSEC2 suite from the hub's lastSensorReading, camelCased for the client. VALUES pass
 * through untouched — no rounding, no unit conversion, no defaults. A field the hub did not send is
 * null, never 0. (Keys are renamed; numbers are not.)
 */
function buildReadings(reading: Json | null) {
  const r = reading ?? {};
  return {
    temperatureCComp: num(r.temperature_c_comp),
    temperatureFComp: num(r.temperature_f_comp),
    humidityPctComp: num(r.humidity_pct_comp),
    gasResistanceOhmComp: num(r.gas_resistance_ohm_comp),
    ambientTemperatureC: num(r.ambient_temperature_c),
    ambientTemperatureF: num(r.ambient_temperature_f),
    ambientHumidityPct: num(r.ambient_humidity_pct),
    iaq: num(r.iaq),
    iaqStatic: num(r.iaq_static),
    iaqAccuracy: num(r.iaq_accuracy),
    eco2Ppm: num(r.eco2_ppm),
    bvocPpm: num(r.bvoc_ppm),
    gasPercentage: num(r.gas_percentage),
    pressureHpa: num(r.pressure_hpa),
    gasResistanceOhm: num(r.gas_resistance_ohm),
    stabilizationStatus: num(r.stabilization_status),
    runInStatus: num(r.run_in_status),
    outputAccuracy: num(r.output_accuracy),
    bsecStatusCode: num(r.bsec_status_code),
    bme68xStatusCode: num(r.bme68x_status_code),
    newData: bool(r.new_data),
    measuring: bool(r.measuring),
    gasMeasuring: bool(r.gas_measuring),
    gasValid: bool(r.gas_valid),
    heatStable: bool(r.heat_stable),
    tempOffsetC: num(r.temp_offset_c),
    heaterProfileId: num(r.heater_profile_id),
    classCount: num(r.class_count),
    /** Sensor-reported values, kept distinct from the wall-clock `at`. */
    uptimeS: num(r.uptime_s),
    bootCount: num(r.boot_count),
    tsMs: num(r.ts_ms),
    at: str(r.ts),
  };
}

/** A serial port path is a PLACEHOLDER (not a real device node) when it can never be opened. */
function isPlaceholderPort(port: string | null): boolean {
  if (!port) return false;
  return /absent|placeholder|unknown|none/i.test(port) || !port.startsWith("/dev/");
}

/* ---------------------------------------------------------------- openclaw --------------------------------------------------------------- */

/**
 * Derive the OpenClaw lane. PURE, and separated from the handler on purpose: this is where the
 * console's most dangerous confusion is prevented, so it has to be executable in a test rather than
 * guarded by a comment.
 *
 * THE INVARIANT: `hubMode` is the telemetry hub's `openclawMode` flag — a HUB-SIDE CONFIGURATION
 * setting describing what the hub would do if OpenClaw were driving. It is NOT evidence that OpenClaw
 * is running, reachable, or even installed. The hub happily reports "observe" with nothing whatsoever
 * listening. So hubMode is reported verbatim as `mode` and touches NOTHING else: `reachable` is
 * `probeUrl configured AND the probe actually answered ok`, and with no URL there is nothing to probe,
 * so it stays false.
 *
 * Note also what `reachable` does NOT mean. It is liveness of one URL. Whether a chat/command route
 * is serving is a separate fact, established by the chat bridge, and is deliberately not inferred.
 */
function buildOpenClawState(probeUrl: string, probe: ProbeResult, hubMode: string | null) {
  const configured = Boolean(probeUrl);
  const reachable = configured && probe.up;
  return {
    configured,
    reachable,
    url: probeUrl || null,
    status: configured ? probe.status : null,
    mode: hubMode,
    // The endpoint's own words, passed through untouched — the UI decides what they are worth rather
    // than this route inferring meaning from them.
    health: reachable ? probe.body : null,
    detail: !configured
      ? "No OpenClaw endpoint is configured, so nothing was probed — this is 'nothing to ask', not 'asked and got no answer'. OpenClaw runs on a non-standard high port that varies by deployment, so its absence from the Jetson's 87xx service range proves nothing either way. Set PSATHYRELLA_OPENCLAW_URL and this lane starts probing automatically. The hub's openclawMode flag is NOT a connection."
      : reachable
        ? // Scope this claim precisely. This lane probes ONE url for liveness and learns exactly one
          // thing. Asserting anything about the chat/command surface from here would be a claim we
          // did not measure — and would contradict the chat bridge, which probes that separately.
          "Liveness only: this URL answered, so the OpenClaw process is up. That is the entire finding — this lane does not test whether a chat or command route is serving, so do not render a connected chat on the strength of it. /api/psathyrella/openclaw/chat-bridge is what establishes that, by additionally proving the chat route exists."
        : `OpenClaw endpoint configured but not answering${probe.status !== null ? ` (HTTP ${probe.status})` : ""}${probe.error ? `: ${probe.error}` : ""}.`,
  };
}

/* ---------------------------------------------------------------- handler ---------------------------------------------------------------- */

export async function GET() {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  // A bare origin gets /health appended; an explicit path (e.g. a MAS status route) is used as-is.
  // A malformed env value must not 500 the whole aggregator — it degrades to "not configured".
  let openclawProbeUrl = "";
  let openclawPort: number | null = null;
  if (OPENCLAW) {
    try {
      const parsed = new URL(OPENCLAW);
      openclawProbeUrl = parsed.pathname === "/" ? `${OPENCLAW.replace(/\/$/, "")}/health` : OPENCLAW;
      openclawPort = parsed.port ? Number(parsed.port) : null;
    } catch {
      openclawProbeUrl = "";
      openclawPort = null;
    }
  }

  // All lanes in parallel, each retry-fresh. Worst case is bounded by the slowest lane, not the sum.
  const [hub, propulsion, mushroom1, camera, publisher, acoustic, openclaw] = await Promise.all([
    probeFresh(`${HUB}/status`, 3, 4000), // /status is a superset of /health — one call, whole picture
    probeFresh(`${PROPULSION}/health`, 3, 3500),
    probeFresh(`${MUSHROOM1}/`, 3, 4000, false), // HTML-only root: no /health exists on :8787 (404)
    // The camera lane stalls the most in practice (observed: 3 fresh connects in a row before one
    // succeeded), so give it more attempts with a shorter per-attempt budget.
    probeFresh(`${CAMERA}/health`, 5, 2500),
    probeFresh(`${PUBLISHER}/health`, 3, 3500),
    probeFresh(`${ACOUSTIC}/status`, 3, 3500), // /status carries the live i2cdetect dump; /health does not
    openclawProbeUrl ? probeFresh(openclawProbeUrl, 2, 3000) : Promise.resolve<ProbeResult>({ up: false, status: null, body: null, ms: 0, error: null }),
  ]);

  const hubBody = asObj(hub.body);
  const propBody = asObj(propulsion.body);
  const camBody = asObj(camera.body);
  const pubBody = asObj(publisher.body);
  const acBody = asObj(acoustic.body);

  /* -- services -------------------------------------------------------------------------------- */
  // One row per service. A service that fails to answer is present with up:false and its error —
  // never omitted, because a missing row reads as "not applicable" instead of "we lost this box".
  const services = [
    { id: "telemetry-hub", label: "MycoBrain Telemetry Hub", port: 8790, url: `${HUB}/status`, probe: hub },
    { id: "propulsion", label: "Psathyrella Jetson Agent (propulsion)", port: 8788, url: `${PROPULSION}/health`, probe: propulsion },
    { id: "mushroom1", label: "MycoBrain Operator UI", port: 8787, url: `${MUSHROOM1}/`, probe: mushroom1 },
    { id: "camera", label: "Psathyrella Camera Service", port: 8792, url: `${CAMERA}/health`, probe: camera },
    { id: "publisher", label: "MycoBrain Publisher", port: 8789, url: `${PUBLISHER}/health`, probe: publisher },
    { id: "acoustic", label: "Acoustic TX (dry stand-in)", port: 8791, url: `${ACOUSTIC}/status`, probe: acoustic },
    {
      id: "openclaw",
      label: "OpenClaw edge autonomy",
      // Derived, not assumed: OpenClaw runs on a non-standard high port that varies by deployment.
      port: openclawPort,
      url: openclawProbeUrl || null,
      probe: openclaw,
      // Distinguishes "we probed and it was down" from "there is nothing to probe" — the second is
      // the truth today, and the UI must be able to say so.
      unconfigured: !openclawProbeUrl,
    },
  ].map((s) => {
    const unconfigured = "unconfigured" in s && s.unconfigured === true;
    return {
      id: s.id,
      label: s.label,
      port: s.port,
      url: s.url,
      up: s.probe.up,
      status: s.probe.status, // HTTP status code (null = never answered)
      // A lane with nothing to probe has NO latency. Reporting 0 ms would read as "answered
      // instantly" on the console — a measurement we never took.
      ms: unconfigured ? null : s.probe.ms,
      error: unconfigured ? "no endpoint configured" : s.probe.error,
    };
  });

  /* -- mycobrain (Side A / Side B) -------------------------------------------------------------- */
  const reading = asObj(hubBody?.lastSensorReading);
  const sideBPort = str(hubBody?.serialPortB);
  const sideBPlaceholder = isPlaceholderPort(sideBPort);

  const mycobrain = {
    sideA: {
      connected: bool(hubBody?.serialConnected),
      port: str(hubBody?.serialPort),
      deviceId: str(reading?.device_id),
      nodeId: str(reading?.node_id),
      role: str(reading?.role),
      fwVersion: str(reading?.fw_version),
      configVersion: str(reading?.config_version),
      bsecVersion: str(reading?.bsec_version),
      uptimeS: num(reading?.uptime_s),
      bootCount: num(reading?.boot_count),
      sensor: {
        slot: str(reading?.sensor_slot),
        address: str(reading?.address),
        present: bool(reading?.present),
        valid: bool(reading?.valid),
      },
      readings: buildReadings(reading),
      lastError: hubBody?.lastError ?? null,
    },
    sideB: {
      connected: bool(hubBody?.serialBConnected),
      port: sideBPort,
      // null, not false, when the hub told us nothing: "Side B is not absent" is a claim, and with no
      // reported port (hub down, or field missing) we have no evidence for it either way.
      absent: sideBPort === null ? null : sideBPlaceholder,
      // The hub is not reporting a real device node here. The configured path is a literal
      // PLACEHOLDER string baked into the hub config — no such file exists, so it can never be
      // opened and Side B can never connect until the hub is pointed at a real
      // /dev/serial/by-id/... node for an actually-attached ESP32. This is a CONFIGURATION gap,
      // not a failed radio or a broken board, and it must not be read as hardware failure.
      reason: sideBPlaceholder
        ? `Side B is configured with the placeholder port "${sideBPort}" — not a real device node, so the hub can never open it. No Side B ESP32 is bound. This is a hub configuration gap, not a hardware fault.`
        : hub.up
          ? null
          : "telemetry hub unreachable — Side B state unknown",
      lastError: hubBody?.lastErrorB ?? null,
      lastReading: hubBody?.lastSideBReading ?? null,
    },
    hub: {
      up: hub.up,
      mode: str(hubBody?.mode),
      armed: bool(hubBody?.armed),
      armedToActuate: bool(hubBody?.armedToActuate),
      gpsConnected: bool(hubBody?.gpsConnected),
      gpsPort: str(hubBody?.gpsPort),
      lastHeartbeat: hubBody?.lastHeartbeat ?? null,
      transports: asObj(hubBody?.transports),
      lastJsonParseError: hubBody?.lastJsonParseError ?? null,
    },
  };

  /* -- i2c (three independent sources, unified but never merged into one authority) -------------- */
  const buses: I2cBus[] = [];

  // Source 1 — camera service (:8792 /health.i2c). A TARGETED probe of the CamArray/sensor addresses
  // only, not a bus sweep: absence here means "this specific address did not answer", nothing more.
  const camI2c = asObj(camBody?.i2c);
  if (camI2c) {
    const byBus = new Map<number | null, I2cAddress[]>();
    for (const [rawAddr, rawEntry] of Object.entries(camI2c)) {
      const entry = asObj(rawEntry);
      if (!entry) continue;
      const busNo = num(entry.bus);
      const cell = str(entry.cell);
      const ok = bool(entry.ok);
      const state: I2cState = ok !== true ? "absent" : cell !== null && cell.toUpperCase() === "UU" ? "busy" : "present";
      const list = byBus.get(busNo) ?? [];
      list.push({ addr: rawAddr.toLowerCase().startsWith("0x") ? rawAddr.toLowerCase() : `0x${rawAddr.toLowerCase()}`, state, cell });
      byBus.set(busNo, list);
    }
    for (const [busNo, addrs] of byBus) {
      buses.push({
        bus: busNo,
        source: "camera service :8792 /health.i2c",
        addresses: addrs,
        scanned: true, // the service returned a per-address probe result, so it did probe
        scannedAt: null, // the camera service does not timestamp this probe
        note:
          busNo === null
            ? "Addresses the camera service probed but could not locate on any bus — it reports no bus number for these."
            : "Targeted probe of the camera/CamArray addresses only — NOT a full bus sweep, so unlisted addresses are simply unprobed.",
      });
    }
  } else if (camera.up) {
    buses.push({
      bus: null,
      source: "camera service :8792 /health.i2c",
      addresses: [],
      scanned: null, // it answered without an i2c map — whether it probed at all is unknown
      scannedAt: null,
      note: "Camera service answered but reported no i2c map — no scan result to report, and no claim either way about what is on the bus.",
    });
  }

  // Source 2 — acoustic service (:8791 /status.bus_scan_tail). A LIVE i2cdetect dump of i2c-1.
  const scanTail = str(acBody?.bus_scan_tail);
  if (scanTail !== null) {
    const parsed = parseI2cDetect(scanTail);
    const pcaBus = num(asObj(acBody?.hardware)?.pca_bus);
    buses.push({
      bus: pcaBus, // the acoustic PCA9685 lives on i2c-1; the dump is of that same bus
      source: "acoustic service :8791 /status.bus_scan_tail (live i2cdetect)",
      // An unreadable dump yields NO addresses. A half-parsed sweep could place a device on the wrong
      // address, and a wrong address on this console is a wrong hardware claim.
      addresses: parsed.unreadable ? [] : parsed.addresses,
      // Unreadable text is not evidence that the scan did or did not run — say "unknown", not "empty".
      scanned: parsed.unreadable ? null : true,
      scannedAt: null, // i2cdetect output carries no timestamp; it is read fresh on each /status
      note: parsed.unreadable
        ? "i2cdetect output could not be read (truncated or unexpected format) — no addresses inferred, and whether the scan ran is unknown."
        : `Live i2cdetect sweep: ${parsed.cellsScanned} address(es) probed, ${parsed.free} free (omitted)` +
          `${parsed.unknownCells > 0 ? `, ${parsed.unknownCells} cell(s) unreadable and dropped rather than guessed` : ""}` +
          `. "UU" = claimed by a kernel driver (the device exists and is bound); a hex cell = present and unclaimed.`,
    });
  } else if (acoustic.up) {
    const scanOk = bool(acBody?.bus_scan_ok);
    buses.push({
      bus: null,
      source: "acoustic service :8791 /status.bus_scan_tail (live i2cdetect)",
      addresses: [],
      // bus_scan_ok:false is the service telling us its scan did not succeed. Absent → unknown.
      scanned: scanOk === false ? false : null,
      scannedAt: null,
      note: `Acoustic service answered but returned no bus scan (bus_scan_ok: ${String(acBody?.bus_scan_ok ?? "not reported")}) — no result to report.`,
    });
  }

  // Source 3 — telemetry hub (:8790 /status.lastScan). Its own I2C scan.
  const lastScan = asObj(hubBody?.lastScan);
  if (lastScan) {
    const rawAddrs = Array.isArray(lastScan.addresses) ? lastScan.addresses : [];
    const scannedAt = str(lastScan.ts);
    // No timestamp AND nothing found = the scan has never executed. That is an ABSENT RESULT, not a
    // finding of "no devices" — the hub ships lastScan pre-initialised to {addresses:[],count:0,ts:null}.
    const neverRan = scannedAt === null && rawAddrs.length === 0;
    buses.push({
      bus: null, // the hub does not name a bus number in lastScan
      source: "telemetry hub :8790 /status.lastScan",
      addresses: rawAddrs
        .map((a): I2cAddress | null => {
          const n = num(a);
          // Only a whole number in 7-bit I2C range can be rendered as an address. Anything else is
          // shown verbatim as text rather than formatted into a hex address it may not be.
          if (n !== null && Number.isInteger(n) && n >= 0 && n <= 0x7f) {
            return { addr: `0x${n.toString(16).padStart(2, "0")}`, state: "present", cell: null };
          }
          if (n !== null) return { addr: String(n), state: "present", cell: String(n) };
          const s = str(a);
          return s ? { addr: s.toLowerCase().startsWith("0x") ? s.toLowerCase() : `0x${s.toLowerCase()}`, state: "present", cell: s } : null;
        })
        .filter((a): a is I2cAddress => a !== null),
      scanned: neverRan ? false : true,
      scannedAt,
      note: neverRan
        ? "The hub's I2C scan has NEVER run (count 0, no timestamp) — this is an empty result, not a bus with no devices."
        : `Hub-side scan, ${num(lastScan.count) ?? rawAddrs.length} address(es) reported.`,
    });
  }

  /* -- propulsion -------------------------------------------------------------------------------- */
  const propulsionState = {
    armed: bool(propBody?.armed),
    armedToActuate: bool(propBody?.armedToActuate),
    mode: str(propBody?.mode),
    // pwm:"mock" means the agent is NOT driving a PCA9685 — the motors are physically disconnected
    // and every actuation is a no-op. Surfaced verbatim so the UI can refuse to imply thrust.
    pwm: str(propBody?.pwm),
    thrusters: num(propBody?.thrusters),
    servoMode: str(propBody?.servo_mode),
    benchSingleMotor: bool(propBody?.bench_single_motor),
    deadmanS: num(propBody?.deadman_s),
    lastWriteOk: propBody?.last_write_ok ?? null,
    recentErrors: num(propBody?.recent_error_count),
  };

  /* -- acoustic ---------------------------------------------------------------------------------- */
  const acHw = asObj(acBody?.hardware);
  const acousticState = {
    service: str(acBody?.service),
    role: str(acBody?.role),
    transducer: str(acHw?.transducer),
    pcaBus: num(acHw?.pca_bus),
    pcaAddr: str(acHw?.pca_addr),
    channels: numArray(acHw?.channels),
    pins: str(acHw?.pins),
    txing: bool(acBody?.txing),
    mode: str(acBody?.mode),
    freqHz: num(acBody?.freq_hz),
    txCount: num(acBody?.tx_count),
    lastTxAt: str(acBody?.last_tx_at),
    lastError: acBody?.last_error ?? null,
    busScanOk: bool(acBody?.bus_scan_ok),
  };

  /* -- publisher --------------------------------------------------------------------------------- */
  const publisherState = {
    ok: bool(pubBody?.ok),
    queueDepth: num(pubBody?.queueDepth),
    lastFetchAt: str(pubBody?.lastFetchAt),
    lastError: pubBody?.lastError ?? null,
    // Passed through whole: it carries per-transport (http / mqtt) enablement, counters and errors
    // that the UI renders as-is. Reshaping it here would silently drop transports Cursor adds later.
    delivery: asObj(pubBody?.delivery),
  };

  /* -- openclaw ---------------------------------------------------------------------------------- */
  // The hub's openclawMode is passed in as a plain string and can only ever land in `mode`. See
  // buildOpenClawState: the invariant that a hub flag cannot manufacture reachability is enforced
  // there, in a pure function, so it is testable rather than merely asserted in a comment.
  const openclawState = buildOpenClawState(openclawProbeUrl, openclaw, str(hubBody?.openclawMode));

  return NextResponse.json({
    ts: new Date().toISOString(),
    targets: { HUB, PROPULSION, MUSHROOM1, CAMERA, PUBLISHER, ACOUSTIC, OPENCLAW: openclawProbeUrl || null },
    services,
    mycobrain,
    i2c: { buses },
    propulsion: propulsionState,
    acoustic: acousticState,
    publisher: publisherState,
    openclaw: openclawState,
  });
}
