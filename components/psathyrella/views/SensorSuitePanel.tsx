"use client";

/**
 * SensorSuitePanel — the FULL BME688 / BSEC2 suite from one MycoBrain ESP32 side, rendered for a
 * marine operator.
 *
 * WHY this exists: the hub's `lastSensorReading` carries ~25 fields, but the map widget surfaced
 * two of them. Two numbers with no state around them read as settled instrument measurements —
 * which BSEC2 gas outputs are NOT. IAQ / eCO₂ / bVOC are derived from a single gas-resistance
 * channel and only converge after the heater burns in and the library self-calibrates. So this
 * panel always ships the qualifying state (accuracy, stabilization, run-in, status codes) next to
 * the values it qualifies; an operator can never read a number here as more certain than it is.
 *
 * Contract rules honoured:
 *  - Nothing is fabricated. A field the backend did not send renders as an em-dash, never 0.
 *  - Values are shown as reported. Display rounding only; every numeric field carries the exact
 *    raw value in its tooltip, and no out-of-range reading is silently "corrected".
 *  - The input is an untyped bag because the hub, MAS, the operator probe and the droid-systems
 *    route each name these fields differently (snake_case, *_comp, camelCase). Every read is
 *    alias-tolerant and defensive — a malformed bag yields em-dashes, never a throw.
 */

import { type JSX, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/psathyrella/ui";

/** Raw, untyped sensor bag exactly as the transport delivered it. */
export interface SensorSuiteReading {
  [key: string]: unknown;
}

const DASH = "—";

/* ── defensive readers ──────────────────────────────────────────────────────────────────────── */

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * Flatten one nesting level. The same side-A reading arrives top-level from the operator probe,
 * under `bme688.a` from the Earth-Sim devices BFF, and under `lastSensorReading` / `reading`
 * straight off the hub. Merging those (top-level wins) shows the operator the fields that DID
 * arrive instead of a wall of em-dashes. Side B is deliberately NOT merged — it is a different
 * physical sensor and blending the two would be a false reading.
 */
function flatten(reading: SensorSuiteReading | null): Record<string, unknown> {
  const top = asRecord(reading);
  if (!top) return {};
  const bme = asRecord(top.bme688);
  const nested: Record<string, unknown> = {
    ...(asRecord(bme?.a) || {}),
    ...(asRecord(top.reading) || {}),
    ...(asRecord(top.lastSensorReading) || {}),
  };
  return { ...nested, ...top };
}

function rawOf(bag: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = bag[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function numOf(bag: Record<string, unknown>, keys: string[]): number | null {
  const v = rawOf(bag, keys);
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function boolOf(bag: Record<string, unknown>, keys: string[]): boolean | null {
  const v = rawOf(bag, keys);
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return null;
}

function strOf(bag: Record<string, unknown>, keys: string[]): string | null {
  const v = rawOf(bag, keys);
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/* ── formatting (display only — the tooltip always carries the raw value) ───────────────────── */

function fmt(n: number | null, dp: number): string | null {
  return n == null ? null : n.toFixed(dp);
}
function rawTitle(label: string, n: number | null, unit?: string): string | undefined {
  return n == null ? undefined : `${label}: ${n}${unit ? ` ${unit}` : ""} (as reported)`;
}
function fmtUptime(s: number | null): string | null {
  if (s == null || s < 0) return null;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/* ── BSEC2 semantics ────────────────────────────────────────────────────────────────────────── */

const ACCURACY_MEANING = "BSEC2 accuracy scale — 0: not yet calibrated (reading NOT trustworthy) · 1: low · 2: medium · 3: high. IAQ, eCO₂ and bVOC only settle at 2–3.";

const ACCURACY: Record<number, { word: string; badge: string }> = {
  0: { word: "uncalibrated", badge: "border-red-500/40 bg-red-500/10 text-red-300" },
  1: { word: "low", badge: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  2: { word: "medium", badge: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
  3: { word: "high", badge: "border-green-500/40 bg-green-500/10 text-green-300" },
};

/** BSEC2 stabStatus / runInStatus: 1 = finished, 0 = still running. Show the number AND the word. */
function burnInLabel(v: number | null): { text: string | null; tone: Tone } {
  if (v == null) return { text: null, tone: "idle" };
  if (v === 1) return { text: "1 · complete", tone: "ok" };
  if (v === 0) return { text: "0 · in progress", tone: "warn" };
  return { text: String(v), tone: "idle" };
}

/** Driver status codes: 0 = OK, anything else is a fault the operator must see. */
function statusCodeLabel(v: number | null): { text: string | null; tone: Tone } {
  if (v == null) return { text: null, tone: "idle" };
  return v === 0 ? { text: "0 · ok", tone: "ok" } : { text: `${v} · fault`, tone: "crit" };
}

function boolLabel(v: boolean | null, trueTone: Tone = "ok", falseTone: Tone = "warn"): { text: string | null; tone: Tone } {
  if (v == null) return { text: null, tone: "idle" };
  return v ? { text: "yes", tone: trueTone } : { text: "no", tone: falseTone };
}

/* ── primitives ─────────────────────────────────────────────────────────────────────────────── */

type Tone = "ok" | "warn" | "crit" | "idle";

const TONE_CLASS: Record<Tone, string> = {
  ok: "text-white",
  warn: "text-amber-300",
  crit: "text-red-400",
  idle: "text-slate-300",
};

function Field({
  label,
  value,
  unit,
  tone = "idle",
  title,
  qualifier,
  compact,
}: {
  label: string;
  value: string | null;
  unit?: string;
  tone?: Tone;
  title?: string;
  /** When set, the value carries a visible "not settled" marker explained by this tooltip. */
  qualifier?: string | null;
  compact?: boolean;
}): JSX.Element {
  const has = value !== null && value !== "";
  return (
    <div className="flex min-w-0 flex-col" title={title}>
      <span className={cn("truncate uppercase tracking-wide text-slate-500", compact ? "text-[8px]" : "text-[9px]")}>{label}</span>
      <span
        className={cn(
          "truncate font-mono leading-tight tabular-nums",
          compact ? "text-[11px]" : "text-[13px]",
          has ? TONE_CLASS[tone] : "text-slate-600"
        )}
      >
        {has ? value : DASH}
        {has && unit ? <span className={cn("ml-0.5 text-slate-500", compact ? "text-[8px]" : "text-[9px]")}>{unit}</span> : null}
        {has && qualifier ? (
          <span className="ml-0.5 cursor-help font-bold text-amber-400" title={qualifier}>
            ‡
          </span>
        ) : null}
      </span>
    </div>
  );
}

function Group({
  title,
  right,
  note,
  compact,
  children,
}: {
  title: string;
  right?: ReactNode;
  note?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={compact ? "mt-1.5" : "mt-2.5"}>
      <div className="flex items-center justify-between gap-2">
        <SectionLabel className="mb-0.5">{title}</SectionLabel>
        {right}
      </div>
      <div className={cn("grid", compact ? "grid-cols-2 gap-x-2 gap-y-1" : "grid-cols-3 gap-x-3 gap-y-1.5")}>{children}</div>
      {note ? <div className={cn("mt-1 leading-snug text-slate-500", compact ? "text-[8px]" : "text-[9px]")}>{note}</div> : null}
    </div>
  );
}

/* ── panel ──────────────────────────────────────────────────────────────────────────────────── */

export default function SensorSuitePanel({
  reading,
  deviceId,
  role,
  fwVersion,
  sensorSlot,
  address,
  uptimeS,
  bootCount,
  compact,
  className,
}: {
  reading: SensorSuiteReading | null;
  deviceId?: string | null;
  role?: string | null;
  fwVersion?: string | null;
  sensorSlot?: string | null;
  address?: string | null;
  uptimeS?: number | null;
  bootCount?: number | null;
  compact?: boolean;
  className?: string;
}): JSX.Element {
  const bag = flatten(reading);

  // ── climate ──
  const tempC = numOf(bag, ["temperature_c_comp", "temperatureCComp", "ambient_temperature_c", "ambientTemperatureC", "temperature_c", "temperatureC", "temperature"]);
  const tempF = numOf(bag, ["temperature_f_comp", "temperatureFComp", "ambient_temperature_f", "ambientTemperatureF", "temperature_f", "temperatureF"]);
  const humidity = numOf(bag, ["humidity_pct_comp", "humidityPctComp", "ambient_humidity_pct", "ambientHumidityPct", "humidity_pct", "humidityPct", "humidity"]);
  const pressure = numOf(bag, ["pressure_hpa", "pressureHpa", "pressure"]);
  // Sea-level ambient is ~1013 hPa. Flag a far-off value as a POSSIBLE sensor/calibration problem —
  // surface the raw number, never substitute a plausible one.
  const pressureOdd = pressure != null && (pressure < 800 || pressure > 1100);

  // ── air quality (BSEC2 derived) ──
  const iaq = numOf(bag, ["iaq"]);
  const iaqStatic = numOf(bag, ["iaq_static", "iaqStatic", "static_iaq", "staticIaq"]);
  const iaqAccuracy = numOf(bag, ["iaq_accuracy", "iaqAccuracy"]);
  const outputAccuracy = numOf(bag, ["output_accuracy", "outputAccuracy"]);
  const eco2 = numOf(bag, ["eco2_ppm", "eco2Ppm", "co2_equivalent", "co2Equivalent", "co2eq"]);
  const bvoc = numOf(bag, ["bvoc_ppm", "bvocPpm", "voc_equivalent", "vocEquivalent", "voc"]);
  const gasOhm = numOf(bag, ["gas_resistance_ohm", "gasResistanceOhm", "gas_ohm", "gas_resistance", "gasResistance"]);
  const gasPct = numOf(bag, ["gas_percentage", "gasPercentage"]);

  // ── sensor state ──
  const stabilization = numOf(bag, ["stabilization_status", "stabilizationStatus", "stab_status", "stabStatus"]);
  const runIn = numOf(bag, ["run_in_status", "runInStatus"]);
  const bsecCode = numOf(bag, ["bsec_status_code", "bsecStatusCode"]);
  const bmeCode = numOf(bag, ["bme68x_status_code", "bme68xStatusCode"]);
  const heatStable = boolOf(bag, ["heat_stable", "heatStable"]);
  const gasValid = boolOf(bag, ["gas_valid", "gasValid"]);
  const gasMeasuring = boolOf(bag, ["gas_measuring", "gasMeasuring"]);
  const newData = boolOf(bag, ["new_data", "newData"]);
  const tempOffset = numOf(bag, ["temp_offset_c", "tempOffsetC"]);
  const heaterProfile = numOf(bag, ["heater_profile_id", "heaterProfileId"]);
  const classCount = numOf(bag, ["class_count", "classCount"]);

  // ── device identity (explicit props win; otherwise read from the bag) ──
  const idVal = deviceId ?? strOf(bag, ["device_id", "deviceId", "node_id", "nodeId", "device"]);
  const roleVal = role ?? strOf(bag, ["role"]);
  const fwVal = fwVersion ?? strOf(bag, ["fw_version", "fwVersion", "fw", "firmware_version", "firmware"]);
  const slotVal = sensorSlot ?? strOf(bag, ["sensor_slot", "sensorSlot", "slot"]);
  const addrVal = address ?? strOf(bag, ["address", "addr", "i2c_address", "i2cAddress"]);
  const uptimeVal = uptimeS ?? numOf(bag, ["uptime_s", "uptimeS", "uptime"]);
  const bootVal = bootCount ?? numOf(bag, ["boot_count", "bootCount"]);

  // The BSEC2 accuracy that governs the gas outputs. iaq_accuracy is authoritative; output_accuracy
  // is the same scale reported by the library and is used only when iaq_accuracy is absent.
  const accuracy = iaqAccuracy ?? outputAccuracy;
  const acc = accuracy != null ? ACCURACY[accuracy] : undefined;
  // Unsettled unless the sensor positively told us it is calibrated. Three ways it is NOT:
  // accuracy absent, accuracy 0-1, or an accuracy code outside the documented 0-3 scale — an
  // unrecognised code is not evidence of calibration, so it must never silently read as settled.
  const unsettled = accuracy == null || acc === undefined || accuracy <= 1;
  const burnInPending = stabilization === 0 || runIn === 0;
  const qualifier = unsettled
    ? accuracy == null
      ? "BSEC2 accuracy not reported — this value cannot be treated as a settled measurement."
      : acc === undefined
        ? `BSEC2 accuracy ${accuracy} is outside the documented 0–3 scale — this value cannot be treated as a settled measurement.`
        : `BSEC2 accuracy ${accuracy} (${acc.word}) — value is still converging, not a settled measurement.`
    : burnInPending
      ? "Gas sensor burn-in not finished — value is still converging."
      : null;

  const stab = burnInLabel(stabilization);
  const run = burnInLabel(runIn);
  const bsec = statusCodeLabel(bsecCode);
  const bme = statusCodeLabel(bmeCode);
  const heat = boolLabel(heatStable);
  const valid = boolLabel(gasValid);

  return (
    <div className={cn("min-w-0", className)}>
      {/* CLIMATE — direct BME688 measurements (still subject to the sensor's own calibration). */}
      <Group
        title="Climate"
        compact={compact}
        note={
          pressureOdd
            ? `Pressure ${pressure} hPa is far from the ~1013 hPa sea-level ambient — shown raw and uncorrected; possible sensor or calibration issue.`
            : undefined
        }
      >
        <Field compact={compact} label="Temp" value={fmt(tempC, 2)} unit="°C" tone="ok" title={rawTitle("Temperature", tempC, "°C")} />
        <Field compact={compact} label="Temp" value={fmt(tempF, 2)} unit="°F" tone="ok" title={rawTitle("Temperature", tempF, "°F")} />
        <Field compact={compact} label="Humidity" value={fmt(humidity, 1)} unit="%" tone="ok" title={rawTitle("Relative humidity", humidity, "%")} />
        <Field
          compact={compact}
          label="Pressure"
          value={fmt(pressure, 1)}
          unit="hPa"
          tone={pressureOdd ? "warn" : "ok"}
          title={
            pressure == null
              ? undefined
              : `Pressure: ${pressure} hPa (as reported)${pressureOdd ? " — implausible for sea level (~1013 hPa); possible sensor or calibration issue. Value is NOT corrected." : ""}`
          }
        />
      </Group>

      {/* AIR QUALITY — every figure here is BSEC2-derived from one gas-resistance channel. */}
      <Group
        title="Air quality"
        compact={compact}
        right={
          <span
            className={cn(
              "shrink-0 rounded border px-1 py-px font-mono text-[8px] uppercase tracking-wide",
              acc ? acc.badge : "border-slate-600/50 bg-slate-700/20 text-slate-400"
            )}
            title={ACCURACY_MEANING}
          >
            acc {accuracy == null ? DASH : `${accuracy} · ${acc?.word ?? "unknown"}`}
          </span>
        }
        note={
          <>
            eCO₂ and bVOC are BSEC2 <span className="text-amber-300/90">estimates</span> computed from the single gas-resistance
            channel — not an NDIR CO₂ measurement.
            {unsettled ? (
              <>
                {" "}
                <span className="text-amber-300/90">
                  ‡ IAQ / eCO₂ / bVOC are not settled at accuracy {accuracy == null ? "unreported" : accuracy}
                  {acc ? ` (${acc.word})` : ""}.
                </span>
              </>
            ) : null}
            {burnInPending ? <span className="text-amber-300/90"> Gas burn-in still running.</span> : null}
          </>
        }
      >
        <Field
          compact={compact}
          label="IAQ"
          value={fmt(iaq, 1)}
          tone={unsettled ? "warn" : iaq != null && iaq > 150 ? "warn" : "ok"}
          title={rawTitle("IAQ", iaq)}
          qualifier={qualifier}
        />
        <Field compact={compact} label="IAQ static" value={fmt(iaqStatic, 1)} tone={unsettled ? "warn" : "ok"} title={rawTitle("Static IAQ", iaqStatic)} qualifier={qualifier} />
        <Field
          compact={compact}
          label="eCO₂ est"
          value={fmt(eco2, 0)}
          unit="ppm"
          tone={unsettled ? "warn" : eco2 != null && eco2 > 1200 ? "warn" : "ok"}
          title={eco2 == null ? undefined : `eCO₂ (BSEC2 estimate, not an NDIR CO₂ sensor): ${eco2} ppm (as reported)`}
          qualifier={qualifier}
        />
        <Field
          compact={compact}
          label="bVOC est"
          value={fmt(bvoc, 2)}
          unit="ppm"
          tone={unsettled ? "warn" : "ok"}
          title={bvoc == null ? undefined : `Breath VOC equivalent (BSEC2 estimate): ${bvoc} ppm (as reported)`}
          qualifier={qualifier}
        />
        <Field
          compact={compact}
          label="Gas"
          value={gasOhm == null ? null : (gasOhm / 1000).toFixed(1)}
          unit="kΩ"
          tone="idle"
          title={rawTitle("Gas resistance", gasOhm, "Ω")}
        />
        <Field compact={compact} label="Gas %" value={fmt(gasPct, 1)} unit="%" tone="idle" title={rawTitle("Gas percentage", gasPct, "%")} />
      </Group>

      {/* SENSOR STATE — the fields that say how much the numbers above can be trusted. */}
      <Group title="Sensor state" compact={compact}>
        <Field compact={compact} label="Heat stable" value={heat.text} tone={heat.tone} title="BME688 heater plate has reached a stable temperature. Gas figures before this are unreliable." />
        <Field compact={compact} label="Gas valid" value={valid.text} tone={valid.tone} title="The gas measurement for this cycle was flagged valid by the BME68x driver." />
        <Field compact={compact} label="Stabilization" value={stab.text} tone={stab.tone} title="BSEC2 stabilization: 1 = finished, 0 = still stabilizing. Until finished, gas outputs are converging estimates." />
        <Field compact={compact} label="Run-in" value={run.text} tone={run.tone} title="BSEC2 run-in (burn-in): 1 = finished, 0 = still running. Until finished, IAQ/eCO₂/bVOC are not settled." />
        <Field
          compact={compact}
          label="Out accuracy"
          value={outputAccuracy == null ? null : `${outputAccuracy} · ${ACCURACY[outputAccuracy]?.word ?? "unknown"}`}
          tone={outputAccuracy == null ? "idle" : outputAccuracy === 0 ? "crit" : outputAccuracy === 1 ? "warn" : "ok"}
          title={ACCURACY_MEANING}
        />
        <Field compact={compact} label="IAQ accuracy" value={iaqAccuracy == null ? null : `${iaqAccuracy} · ${ACCURACY[iaqAccuracy]?.word ?? "unknown"}`} tone={iaqAccuracy == null ? "idle" : iaqAccuracy === 0 ? "crit" : iaqAccuracy === 1 ? "warn" : "ok"} title={ACCURACY_MEANING} />
        <Field compact={compact} label="BSEC status" value={bsec.text} tone={bsec.tone} title="BSEC2 library status code — 0 is nominal, non-zero is a library fault." />
        <Field compact={compact} label="BME68x status" value={bme.text} tone={bme.tone} title="BME68x driver status code — 0 is nominal, non-zero is a sensor/driver fault." />
        {!compact && (
          <>
            <Field compact={compact} label="Gas measuring" value={boolLabel(gasMeasuring, "ok", "idle").text} tone={boolLabel(gasMeasuring, "ok", "idle").tone} title="A gas measurement cycle is in progress." />
            <Field compact={compact} label="New data" value={boolLabel(newData, "ok", "idle").text} tone={boolLabel(newData, "ok", "idle").tone} title="The sensor produced a fresh sample for this reading." />
            <Field compact={compact} label="Temp offset" value={fmt(tempOffset, 2)} unit="°C" tone="idle" title={rawTitle("Configured temperature offset", tempOffset, "°C")} />
            <Field compact={compact} label="Heater prof" value={heaterProfile == null ? null : String(heaterProfile)} tone="idle" title="BME688 heater profile id in use." />
            <Field compact={compact} label="Classes" value={classCount == null ? null : String(classCount)} tone="idle" title="Number of BSEC2 output classes configured." />
          </>
        )}
      </Group>

      {/* DEVICE — which board and firmware produced the reading. */}
      <Group title="Device" compact={compact}>
        <Field compact={compact} label="ID" value={idVal} tone="idle" title={idVal ? `Reporting device: ${idVal}` : undefined} />
        <Field compact={compact} label="Role" value={roleVal} tone="idle" title={roleVal ? `MDP role: ${roleVal}` : undefined} />
        <Field compact={compact} label="Firmware" value={fwVal} tone="idle" title={fwVal ? `Firmware: ${fwVal}` : undefined} />
        <Field compact={compact} label="Slot" value={slotVal} tone="idle" title={slotVal ? `Sensor slot: ${slotVal}` : undefined} />
        <Field compact={compact} label="I²C addr" value={addrVal} tone="idle" title={addrVal ? `I²C address: ${addrVal}` : undefined} />
        <Field compact={compact} label="Uptime" value={fmtUptime(uptimeVal)} tone="idle" title={rawTitle("Uptime", uptimeVal, "s")} />
        <Field compact={compact} label="Boots" value={bootVal == null ? null : String(bootVal)} tone="idle" title={rawTitle("Boot count", bootVal)} />
      </Group>
    </div>
  );
}
