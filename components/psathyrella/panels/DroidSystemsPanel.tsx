"use client";

/**
 * DroidSystemsPanel — what the droid can say about its own body: the MycoBrain ESP32 sides, the I²C
 * buses, and the six edge services. It is the only renderer of the `/api/psathyrella/droid-systems`
 * payload anywhere in the repo.
 *
 * NOT MOUNTED YET (Aug 02 2026). Nothing imports this panel, so `/api/psathyrella/droid-systems` has
 * no client consumer at all. It is kept rather than deleted because the I²C bus scan is the ONLY UI
 * for bus state in the whole console, and that scan is the diagnostic for the live IMX477/IMX519
 * 0x1a address collision on the camera bus. Mounting it is a two-line change in
 * `PsathyrellaConsole.tsx`: fetch the droid-systems payload and render this panel as a second tab in
 * the Droid bottom sheet, ALONGSIDE `DroidChatPanel` (PsathyrellaConsole.tsx:298) — not instead of it.
 *
 * THE OPENCLAW CHAT SECTION WAS REMOVED ON PURPOSE. This panel used to open with its own chat. That
 * chat is superseded by `DroidChatPanel`, which is live, and which is strictly better instrumented:
 * measured server-side round-trip meters, a MAS-oversight LED that distinguishes "not configured"
 * from "no exchange yet", and an input disabled with the bridge's OWN reason. Mounting this panel
 * with its old chat still in it would have put a second, weaker transcript next to that one — two
 * chat surfaces with different honesty guarantees, which is how an operator ends up trusting the
 * wrong one. If a mounted Droid Systems tab ever needs chat beside it, mount `DroidChatPanel`; do not
 * reimplement chat here.
 *
 * HONESTY RULES (do not soften any of them)
 *  1. NO DEFAULTS ANYWHERE. Every value the backend did not report renders as an em-dash labelled
 *     "not reported". Printing a plausible number (25 °C, 1013 hPa, "online") on a defence-adjacent
 *     operator console is fabricated telemetry, full stop.
 *  2. An empty I²C scan is not "no devices": if the scan never ran, that is what it says. The
 *     telemetry hub reports lastScan.count = 0 with ts = null — a scan that has never executed, which
 *     is a different fact from a bus with nothing on it. Only the reporting service's own `scanned`
 *     flag distinguishes them; the panel never infers one from an empty address list.
 *  3. Each I²C row names the service that produced it. The camera probe, the acoustic i2cdetect dump
 *     and the hub scan are INDEPENDENT and are never merged into one implied authority.
 *  4. Subsystem IDENTITIES (name/port) come from the rig contract and are labelled as such when the
 *     payload carries no probe rows (`services`/`subsystems`); their STATE is never inferred from
 *     that contract — it renders as not reported.
 *
 * `data` is the droid-systems payload. A sibling agent owns that route's exact shape, so it arrives
 * as `unknown` and is read through a local structural interface plus tolerant accessors that accept
 * both camelCase and the snake_case the ESP32/hub emit. Anything missing simply reads as not
 * reported — a shape change can degrade this panel, never crash it.
 */

import { useMemo, type JSX, type ReactNode } from "react";
import { Bot, CircuitBoard, Cpu, Gauge, Radio, Server, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatLED, type LedColor } from "../ui";

/* ------------------------------------------------------------------ payload shape (structural) */

interface DroidI2cEntry {
  /** `addr` is what /api/psathyrella/droid-systems emits; `address` is the alternate spelling. */
  addr?: string | number | null;
  address?: string | number | null;
  /** "busy"/"UU" (claimed by a kernel driver), "present"/"ok", "absent"/"free" — as reported. */
  state?: string | null;
  /** Raw i2cdetect cell text, kept for audit. */
  cell?: string | null;
  label?: string | null;
  claimedBy?: string | null;
}

interface DroidI2cBus {
  bus?: string | number | null;
  label?: string | null;
  /**
   * Which service produced this scan — provenance rides on the bus, not the footer, because these are
   * INDEPENDENT scans by different services and must never read as one authority. `source` is the
   * droid-systems spelling; `service`/`reportedBy` are accepted alternates.
   */
  source?: string | null;
  service?: string | null;
  reportedBy?: string | null;
  /** true = a scan ran, false = it has not run, null/absent = unknown. All three are distinct. */
  scanned?: boolean | null;
  scannedAt?: string | null;
  count?: number | null;
  addresses?: (string | DroidI2cEntry)[] | null;
  raw?: string | null;
  note?: string | null;
  error?: string | null;
}

interface DroidSubsystem {
  /** `id`/`label` are the droid-systems spellings; `key`/`name`/`service` are alternates. */
  id?: string | null;
  key?: string | null;
  label?: string | null;
  name?: string | null;
  service?: string | null;
  port?: number | string | null;
  url?: string | null;
  up?: boolean | null;
  status?: number | null;
  ms?: number | null;
  latencyMs?: number | null;
  error?: string | null;
}

interface DroidSideB {
  present?: boolean | null;
  connected?: boolean | null;
  /** droid-systems reports `absent:true` when the hub's configured port is a placeholder path. */
  absent?: boolean | null;
  port?: string | null;
  serialPortB?: string | null;
  reason?: string | null;
  error?: string | null;
}

interface DroidSystemsPayload {
  ts?: string | null;
  checkedAt?: string | null;
  mycobrain?: {
    sideA?: unknown;
    sideB?: DroidSideB | null;
  } | null;
  /** droid-systems wraps the rows as `{ buses: [...] }`; a bare array is also accepted. */
  i2c?: DroidI2cBus[] | { buses?: DroidI2cBus[] | null } | null;
  /** droid-systems calls the probe rows `services`; `subsystems` is the alternate spelling. */
  services?: DroidSubsystem[] | null;
  subsystems?: DroidSubsystem[] | null;
}

/**
 * Rig contract (Aug 01 2026 Jetson port sweep) — IDENTITIES ONLY. Used purely to name the six
 * services when the payload carries no subsystem probe; their state is left unreported.
 */
const KNOWN_SERVICES: { key: string; name: string; port: number }[] = [
  { key: "mushroom1", name: "MycoBrain operator UI", port: 8787 },
  { key: "propulsion", name: "Propulsion agent", port: 8788 },
  { key: "publisher", name: "MycoBrain publisher", port: 8789 },
  { key: "hub", name: "Telemetry hub", port: 8790 },
  { key: "acoustic", name: "Acoustic TX (dry)", port: 8791 },
  { key: "camera", name: "Camera service", port: 8792 },
];

/* ------------------------------------------------------------------------ tolerant accessors */

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** First defined value for any of `keys`, scanning each record in order. Accepts camelCase and the
 *  snake_case the ESP32/hub emit, because the exact spelling is the sibling route's choice. */
function pick(recs: (Record<string, unknown> | null)[], keys: string[]): unknown {
  for (const rec of recs) {
    if (!rec) continue;
    for (const k of keys) {
      const v = rec[k];
      if (v !== undefined && v !== null) return v;
    }
  }
  return undefined;
}

function readNum(recs: (Record<string, unknown> | null)[], keys: string[]): number | null {
  const v = pick(recs, keys);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function readStr(recs: (Record<string, unknown> | null)[], keys: string[]): string | null {
  const v = pick(recs, keys);
  if (typeof v === "string" && v.trim()) return v;
  if (typeof v === "number") return String(v);
  return null;
}

function readBool(recs: (Record<string, unknown> | null)[], keys: string[]): boolean | null {
  const v = pick(recs, keys);
  return typeof v === "boolean" ? v : null;
}

/** Fixed-precision, or null. Never rounds a missing value into existence. */
function fmt(n: number | null, digits: number): string | null {
  return n === null ? null : n.toFixed(digits);
}

function fmtUptime(s: number | null): string | null {
  if (s === null) return null;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/* ------------------------------------------------------------------------------- primitives */

/** The single rendering of "the backend did not tell us". Muted, italic, never a stand-in value. */
function NotReported(): JSX.Element {
  return (
    <span className="italic text-slate-500/80" title="Not reported by the backend — no default is being shown" aria-label="not reported">
      &mdash;
    </span>
  );
}

function Field({ label, value, unit, title }: { label: string; value: string | number | boolean | null; unit?: string; title?: string }): JSX.Element {
  const has = value !== null && value !== undefined && value !== "";
  const text = typeof value === "boolean" ? (value ? "yes" : "no") : value;
  const tone = typeof value === "boolean" ? (value ? "text-green-300" : "text-amber-300") : "text-slate-100";
  return (
    <div className="flex min-w-0 flex-col" title={title}>
      <span className="truncate text-[9px] uppercase tracking-wider text-cyan-400/60">{label}</span>
      <span className={cn("truncate font-mono text-[11px] leading-tight tabular-nums", has ? tone : "")}>
        {has ? text : <NotReported />}
        {has && unit ? <span className="ml-0.5 text-[9px] text-slate-500">{unit}</span> : null}
      </span>
    </div>
  );
}

function Section({ label, icon: Icon, children, right }: { label: string; icon: typeof Cpu; children: ReactNode; right?: ReactNode }): JSX.Element {
  return (
    <section className="mt-3 first:mt-0">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-cyan-400/70" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">{label}</span>
        {right ? <span className="ml-auto">{right}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <div className={cn("rounded border border-cyan-500/20 bg-white/[0.02] px-2 py-1.5", className)}>{children}</div>;
}

/* ------------------------------------------------------------------------------ I²C helpers */

/** Kernel-claimed ("UU") vs present vs free — the three states i2cdetect actually reports. */
function i2cTone(state: string | null): { cls: string; title: string } {
  const s = (state || "").toLowerCase();
  // "busy" is the droid-systems spelling of i2cdetect's "UU". A kernel driver holding the address is
  // evidence the device EXISTS and is bound — not that it is missing.
  if (s === "uu" || s === "busy" || s.includes("claim") || s.includes("driver")) {
    return { cls: "border-amber-500/40 bg-amber-500/10 text-amber-200", title: "UU — claimed by a kernel driver: the device exists and is bound, but cannot be probed from userspace" };
  }
  if (s === "present" || s === "ok" || s === "detected") {
    return { cls: "border-green-500/40 bg-green-500/10 text-green-200", title: "Device responded to the scan" };
  }
  if (s === "absent" || s === "free" || s === "none" || s === "empty") {
    return { cls: "border-white/10 bg-white/[0.02] text-slate-400", title: "The reporting service probed this address and nothing responded" };
  }
  return { cls: "border-cyan-500/20 bg-cyan-500/5 text-cyan-100", title: state ? `State reported as "${state}"` : "State not reported" };
}

function i2cAddressLabel(entry: string | DroidI2cEntry): { addr: string; state: string | null; extra: string | null } {
  if (typeof entry === "string") return { addr: entry, state: null, extra: null };
  const raw = entry.addr ?? entry.address;
  // "?" only when the row genuinely carried no address — never a placeholder that could be mistaken
  // for a real one.
  const addr = raw === null || raw === undefined ? "?" : String(raw);
  return { addr, state: entry.state ?? null, extra: entry.label ?? entry.claimedBy ?? entry.cell ?? null };
}

/* ------------------------------------------------------------------------------------ panel */

export default function DroidSystemsPanel({
  data,
  className,
}: {
  data: unknown;
  className?: string;
}): JSX.Element {
  const payload = asRecord(data) as DroidSystemsPayload | null;

  /* MycoBrain — Side A identity + the BME688/BSEC2 suite. droid-systems nests the BSEC2 suite under
     `readings` and the slot/address/present/valid under `sensor`; the hub emits the same fields flat
     as lastSensorReading. All three records are searched, most specific first, so either shape reads
     correctly and neither invents a value the other did not carry. */
  const sideARec = asRecord(payload?.mycobrain?.sideA);
  const readingRec = asRecord(pick([sideARec], ["readings", "reading", "lastSensorReading", "bme688", "bsec2"]));
  const sensorRec = asRecord(pick([sideARec], ["sensor"]));
  const aRecs = useMemo(() => [readingRec, sensorRec, sideARec], [readingRec, sensorRec, sideARec]);
  /* Connectivity is its OWN fact: `connected` from the hub, else a sensor `present` flag. Unreported
     stays unreported — a Side A block existing in the payload is not evidence the board is up. */
  const sideAUp = readBool([sideARec, sensorRec], ["connected", "serialConnected", "present"]);

  const sideBRaw = payload?.mycobrain?.sideB ?? null;
  const sideBRec = asRecord(sideBRaw);
  const sideBAbsent = readBool([sideBRec], ["absent"]);
  const sideBPresent = sideBAbsent === true ? false : readBool([sideBRec], ["present", "connected", "serialBConnected"]);
  const sideBPort = readStr([sideBRec], ["port", "serialPortB", "path"]);
  const sideBReason =
    readStr([sideBRec], ["reason", "error", "note"]) ??
    // The live hub reports a literal placeholder path that can never be opened. If the payload does
    // not explain the absence but the path is clearly a placeholder, name that — it is observable
    // from the reported string itself, not an assumption about the hardware.
    (sideBPort && /absent|placeholder|missing/i.test(sideBPort) ? "Port path is a literal placeholder string, not a real device node — it can never be opened." : null);

  // droid-systems wraps the rows as `i2c.buses`; a bare array is accepted too.
  const rawI2c = payload?.i2c;
  const buses: DroidI2cBus[] = Array.isArray(rawI2c) ? rawI2c : Array.isArray(rawI2c?.buses) ? rawI2c.buses : [];
  const reportedSubsystems: DroidSubsystem[] = Array.isArray(payload?.services)
    ? payload.services
    : Array.isArray(payload?.subsystems)
      ? payload.subsystems
      : [];
  const usingContractIdentities = reportedSubsystems.length === 0;

  const stamp = payload?.ts ?? payload?.checkedAt ?? null;

  return (
    <div className={cn("psa-glass flex h-full min-h-0 flex-col overflow-hidden rounded-xl", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent px-3 py-2">
        <div className="flex items-center gap-2 text-cyan-300">
          <Bot className="h-3.5 w-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">Droid Systems</span>
        </div>
        {/* This LED reports on the PAYLOAD, not on the droid. Green means a droid-systems payload
            reached this panel — nothing more. Each subsystem's own state is reported per row below,
            where anything unreported stays slate rather than inheriting this chip's colour. */}
        <div className="flex items-center gap-1.5">
          <StatLED color={payload ? "green" : "slate"} />
          <span className="text-[9px] uppercase tracking-wider text-slate-400">
            {payload ? "payload received" : "no payload"}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {/* ----------------------------------------------------------------- 1. MYCOBRAIN */}
        <Section label="MycoBrain" icon={Cpu}>
          {/* Side A */}
          <Card>
            <div className="mb-1 flex items-center gap-1.5">
              {/* slate when connectivity was not reported: a green LED is a claim the board is up. */}
              <StatLED color={sideAUp === true ? "green" : sideAUp === false ? "red" : "slate"} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">Side A</span>
              <span className="ml-auto font-mono text-[9px] text-slate-500">{readStr(aRecs, ["sensor_slot", "sensorSlot", "slot"]) ?? ""}</span>
            </div>
            {!sideARec ? (
              <div className="text-[10px] italic text-slate-500">Side A not reported by the droid-systems payload.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-3">
                  <Field label="Device id" value={readStr(aRecs, ["device_id", "deviceId", "id"])} />
                  <Field label="Role" value={readStr(aRecs, ["role"])} />
                  <Field label="Firmware" value={readStr(aRecs, ["fw", "firmware", "fw_version", "fwVersion", "firmwareVersion"])} />
                  <Field label="Uptime" value={fmtUptime(readNum(aRecs, ["uptime_s", "uptimeS", "uptime"]))} />
                  <Field label="Boot count" value={readNum(aRecs, ["boot_count", "bootCount"])} />
                  <Field label="Address" value={readStr(aRecs, ["address", "i2c_address", "addr"])} />
                  <Field label="Present" value={readBool(aRecs, ["present"])} />
                  <Field label="Valid" value={readBool(aRecs, ["valid"])} />
                  <Field label="New data" value={readBool(aRecs, ["new_data", "newData"])} />
                </div>

                <div className="mt-1.5 mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400/50">
                  <Thermometer className="h-2.5 w-2.5" />
                  BME688 / BSEC2
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-3">
                  <Field label="Temp (comp)" value={fmt(readNum(aRecs, ["temperature_c_comp", "temperatureCComp"]), 2)} unit="°C" />
                  <Field label="Temp (comp F)" value={fmt(readNum(aRecs, ["temperature_f_comp", "temperatureFComp"]), 2)} unit="°F" />
                  <Field label="Humidity (comp)" value={fmt(readNum(aRecs, ["humidity_pct_comp", "humidityPctComp"]), 2)} unit="%RH" />
                  <Field label="Ambient temp" value={fmt(readNum(aRecs, ["ambient_temperature_c", "ambientTemperatureC"]), 2)} unit="°C" />
                  <Field label="Ambient RH" value={fmt(readNum(aRecs, ["ambient_humidity_pct", "ambientHumidityPct"]), 2)} unit="%" />
                  <Field label="Pressure" value={fmt(readNum(aRecs, ["pressure_hpa", "pressureHpa"]), 2)} unit="hPa" />
                  <Field label="IAQ" value={fmt(readNum(aRecs, ["iaq"]), 1)} />
                  <Field
                    label="IAQ accuracy"
                    value={readNum(aRecs, ["iaq_accuracy", "iaqAccuracy"])}
                    title="BSEC2 accuracy class — 0 means the IAQ figure is not yet trustworthy"
                  />
                  <Field label="IAQ static" value={fmt(readNum(aRecs, ["iaq_static", "iaqStatic"]), 1)} />
                  <Field label="eCO₂" value={fmt(readNum(aRecs, ["eco2_ppm", "eco2Ppm"]), 1)} unit="ppm" />
                  <Field label="bVOC" value={fmt(readNum(aRecs, ["bvoc_ppm", "bvocPpm"]), 3)} unit="ppm" />
                  <Field label="Gas resistance" value={readNum(aRecs, ["gas_resistance_ohm", "gasResistanceOhm"])} unit="Ω" />
                  <Field label="Heat stable" value={readBool(aRecs, ["heat_stable", "heatStable"])} />
                  <Field label="Gas valid" value={readBool(aRecs, ["gas_valid", "gasValid"])} />
                  <Field label="Gas measuring" value={readBool(aRecs, ["gas_measuring", "gasMeasuring"])} />
                  <Field label="Measuring" value={readBool(aRecs, ["measuring"])} />
                  <Field
                    label="Stabilization"
                    value={readNum(aRecs, ["stabilization_status", "stabilizationStatus"]) ?? readStr(aRecs, ["stabilization_status", "stabilizationStatus"])}
                    title="BSEC2 stabilization_status — gas readings are provisional until this settles"
                  />
                  <Field label="Run-in" value={readNum(aRecs, ["run_in_status", "runInStatus"]) ?? readStr(aRecs, ["run_in_status", "runInStatus"])} />
                  <Field label="Output accuracy" value={readNum(aRecs, ["output_accuracy", "outputAccuracy"])} />
                  <Field label="Temp offset" value={fmt(readNum(aRecs, ["temp_offset_c", "tempOffsetC"]), 2)} unit="°C" />
                  <Field label="Heater profile" value={readNum(aRecs, ["heater_profile_id", "heaterProfileId"])} />
                  <Field label="Class count" value={readNum(aRecs, ["class_count", "classCount"])} />
                  <Field label="BSEC status" value={readNum(aRecs, ["bsec_status_code", "bsecStatusCode"])} />
                  <Field label="BME68x status" value={readNum(aRecs, ["bme68x_status_code", "bme68xStatusCode"])} />
                </div>
              </>
            )}
          </Card>

          {/* Side B */}
          <Card className="mt-1.5 border-amber-500/25">
            <div className="mb-1 flex items-center gap-1.5">
              <StatLED color={sideBPresent === true ? "green" : sideBPresent === false ? "red" : "slate"} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">Side B</span>
              <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
                {sideBPresent === true ? "present" : sideBPresent === false ? "absent" : "not reported"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              <Field label="Serial port" value={sideBPort} title="Path the hub reports for Side B" />
              <div className="flex min-w-0 flex-col">
                <span className="text-[9px] uppercase tracking-wider text-cyan-400/60">Reason</span>
                <span className="break-words font-mono text-[10px] leading-snug text-amber-200/90">{sideBReason ?? <NotReported />}</span>
              </div>
            </div>
          </Card>
        </Section>

        {/* ------------------------------------------------------------------- 2. I²C MAP */}
        <Section label="I²C map" icon={CircuitBoard}>
          {buses.length === 0 ? (
            <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[10px] italic text-slate-500">
              No I²C bus scan reported by the droid-systems payload.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {buses.map((bus, i) => {
                const addresses = Array.isArray(bus.addresses) ? bus.addresses : null;
                const reporter = bus.source ?? bus.service ?? bus.reportedBy ?? null;
                // THREE distinct states, never collapsed:
                //   scanned === false → the scan has not run (the hub ships lastScan pre-initialised
                //                       to count 0 / ts null). "No result" is not "no devices".
                //   scanned === true  → a scan ran; an empty list then really does mean nothing answered.
                //   unreported        → we cannot claim either, so we say only that there is no result.
                // Only the reporter's own flag decides this. Inferring "never ran" from an empty list
                // would libel a genuinely empty bus, and inferring "ran" would invent a finding.
                const scanned = typeof bus.scanned === "boolean" ? bus.scanned : null;
                return (
                  <div key={`${String(bus.bus ?? "bus")}-${i}`} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-cyan-200">
                        {bus.label ?? (bus.bus === null || bus.bus === undefined ? "bus ?" : `i2c-${String(bus.bus)}`)}
                      </span>
                      <span className="ml-auto truncate text-[9px] uppercase tracking-wider text-slate-500" title={reporter ?? undefined}>
                        {reporter ? `reported by ${reporter}` : "reporting service not reported"}
                      </span>
                    </div>
                    {scanned === false ? (
                      <div className="text-[10px] italic text-amber-300/80">Scan has not run on this bus — no result to report.</div>
                    ) : addresses === null ? (
                      <div className="text-[10px] italic text-slate-500">Addresses not reported.</div>
                    ) : addresses.length === 0 ? (
                      scanned === true ? (
                        <div className="text-[10px] text-slate-400">Scan ran · no devices responded.</div>
                      ) : (
                        <div className="text-[10px] italic text-slate-500">
                          No addresses reported, and the reporting service did not say whether a scan ran — no claim either way.
                        </div>
                      )
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {addresses.map((entry, j) => {
                          const { addr, state, extra } = i2cAddressLabel(entry);
                          const tone = i2cTone(state);
                          return (
                            <span
                              key={`${addr}-${j}`}
                              title={`${tone.title}${extra ? ` · ${extra}` : ""}`}
                              className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px]", tone.cls)}
                            >
                              {addr}
                              {state ? <span className="ml-1 text-[8px] uppercase opacity-80">{state}</span> : null}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {bus.scannedAt ? <div className="mt-0.5 text-right text-[8px] text-slate-600">scanned {bus.scannedAt}</div> : null}
                    {bus.note ? <div className="mt-0.5 text-[9px] italic text-slate-500">{bus.note}</div> : null}
                    {bus.error ? <div className="mt-0.5 font-mono text-[9px] text-red-300/90">{bus.error}</div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ---------------------------------------------------------------- 3. SUBSYSTEMS */}
        <Section
          label="Subsystems"
          icon={Server}
          right={
            usingContractIdentities ? (
              <span className="text-[8px] uppercase tracking-wider text-slate-500" title="Names and ports come from the rig contract; no probe was reported, so no state is shown">
                identities only · state unreported
              </span>
            ) : null
          }
        >
          <div className="flex flex-col gap-1">
            {(usingContractIdentities
              ? KNOWN_SERVICES.map((s): DroidSubsystem => ({ key: s.key, name: s.name, port: s.port }))
              : reportedSubsystems
            ).map((s, i) => {
              const up = typeof s.up === "boolean" ? s.up : null;
              const led: LedColor = up === null ? "slate" : up ? "green" : "red";
              const latency = typeof s.latencyMs === "number" ? s.latencyMs : typeof s.ms === "number" ? s.ms : null;
              const name = s.label ?? s.name ?? s.service ?? s.id ?? s.key ?? null;
              return (
                <div key={`${s.id ?? s.key ?? name ?? "svc"}-${i}`} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <StatLED color={led} pulse={up === true} />
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-200">{name ?? <NotReported />}</span>
                    <span className="font-mono text-[9px] text-slate-500">{s.port === null || s.port === undefined ? "" : `:${String(s.port)}`}</span>
                    <span className="ml-auto font-mono text-[10px] text-slate-300">
                      {up === null ? <NotReported /> : up ? "up" : "down"}
                    </span>
                    <span className="w-12 shrink-0 text-right font-mono text-[9px] text-slate-500">
                      {latency === null ? <NotReported /> : `${latency}ms`}
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-[9px] text-slate-500">
                      {typeof s.status === "number" ? s.status : <NotReported />}
                    </span>
                  </div>
                  {s.error ? <div className="mt-0.5 break-words font-mono text-[9px] text-red-300/90">{s.error}</div> : null}
                </div>
              );
            })}
          </div>
        </Section>

        <div className="mt-2 flex items-center gap-2 text-[8px] uppercase tracking-wider text-slate-600">
          <Radio className="h-2.5 w-2.5" />
          <span>Values shown are as reported · &ldquo;—&rdquo; means not reported</span>
          <Gauge className="ml-auto h-2.5 w-2.5" />
          <span>{stamp ? `payload ${stamp}` : "payload timestamp not reported"}</span>
        </div>
      </div>
    </div>
  );
}
