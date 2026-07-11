"use client";

/**
 * Persistent safety strip — the topmost, always-visible bar of the GCS.
 *
 * Surfaces the ARMED/SAFE state, a live deadman countdown, the hardware safety alarms
 * (kill-switch, leak, thermal, over-current, low-battery), the session-record status, and a
 * global E-STOP reachable from every view. Mounted as the FIRST in-flow child of the console
 * shell (a sibling of the map), so its 1 Hz re-renders never touch the memoized MapView.
 *
 * Nulls render as "—" (no sensor wired) rather than a false all-clear — honest surfacing for the
 * leak / INA226 current / thermal / kill-switch hardware still being wired.
 */

import { useEffect, useRef, useState } from "react";
import { Octagon, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatLED, type LedColor } from "./ui";
import { SAFETY_LIMITS, type BuoyCommand, type BuoyTelemetry } from "@/lib/psathyrella/contract";

type AlarmLevel = "ok" | "warn" | "crit" | "unknown";
const LEVEL_LED: Record<AlarmLevel, LedColor> = { ok: "green", warn: "amber", crit: "red", unknown: "slate" };
const LEVEL_TEXT: Record<AlarmLevel, string> = {
  ok: "text-green-300",
  warn: "text-amber-300",
  crit: "text-red-300",
  unknown: "text-slate-500",
};

function AlarmChip({ label, level, value }: { label: string; level: AlarmLevel; value: string }) {
  return (
    <div className="flex items-center gap-1" title={`${label}: ${value}`}>
      <StatLED color={LEVEL_LED[level]} pulse={level === "crit"} />
      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={cn("font-mono text-[10px] tabular-nums", LEVEL_TEXT[level])}>{value}</span>
    </div>
  );
}

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function SafetyBanner({
  telemetry,
  sendCommand,
  lastCommandMs,
  recording,
  recStartedMs,
  frameCount,
  onToggleRecord,
  controlAuthed = true,
  controlChecking = false,
  controlError = null,
  controlMethod = null,
}: {
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => Promise<boolean> | void;
  lastCommandMs: number | null;
  recording: boolean;
  recStartedMs: number | null;
  frameCount: number;
  onToggleRecord: () => void;
  /** Whether the GCS has an admin session — commands 401 without one. */
  controlAuthed?: boolean;
  controlChecking?: boolean;
  controlError?: string | null;
  controlMethod?: "login" | "local-dev" | null;
}) {
  const { autonomy, safety, power, propulsion } = telemetry;
  const armed = autonomy.armed;

  // 1 Hz tick to animate the deadman countdown + REC elapsed — only while there's something to
  // animate (armed or recording). Gated on document.hidden; cleaned up. This is LOCAL leaf state:
  // it re-renders only this sibling strip, never PsathyrellaConsole or the memoized map.
  const [, setTick] = useState(0);
  const animate = armed || recording;
  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => {
      if (!document.hidden) setTick((n) => (n + 1) % 3600);
    }, 1000);
    return () => clearInterval(id);
  }, [animate]);

  // Anchor the vehicle-reported deadman value to interpolate smoothly between 2.5 s telemetry frames.
  // Re-anchor on arm-state changes too, so a re-arm that re-sends the same countdown value doesn't
  // keep computing from the previous arm cycle's (stale) timestamp.
  const deadmanAnchor = useRef<{ atMs: number; val: number } | null>(null);
  useEffect(() => {
    const v = telemetry.safety.deadmanSecondsRemaining;
    deadmanAnchor.current = v != null ? { atMs: Date.now(), val: v } : null;
  }, [telemetry.safety.deadmanSecondsRemaining, telemetry.autonomy.armed]);

  // Guard: `??` doesn't catch a reported 0/negative window — that would divide-by-zero below and
  // mask the countdown as "ok". Treat any non-positive window as the default.
  const deadmanWindow = safety.deadmanWindowS && safety.deadmanWindowS > 0 ? safety.deadmanWindowS : SAFETY_LIMITS.deadmanDefaultS;
  let deadman: number | null = null;
  if (armed) {
    if (deadmanAnchor.current) {
      deadman = Math.max(0, deadmanAnchor.current.val - (Date.now() - deadmanAnchor.current.atMs) / 1000);
    } else if (lastCommandMs != null) {
      // Client-side estimate: any command resets the vehicle deadman.
      deadman = Math.max(0, deadmanWindow - (Date.now() - lastCommandMs) / 1000);
    }
  }
  const deadmanFrac = deadman == null ? 1 : deadman / deadmanWindow;
  const deadmanLevel: AlarmLevel = deadman == null ? "unknown" : deadmanFrac < SAFETY_LIMITS.deadmanWarnFrac / 2 ? "crit" : deadmanFrac < SAFETY_LIMITS.deadmanWarnFrac ? "warn" : "ok";

  // ── Hardware alarms (authoritative flag if sent, else derive from power/thrusters) ──
  const kill = safety.killSwitchEngaged;
  const killLevel: AlarmLevel = kill == null ? "unknown" : kill ? "warn" : "ok";

  const leak = safety.leakDetected;
  const leakLevel: AlarmLevel = leak == null ? "unknown" : leak ? "crit" : "ok";

  const temp = safety.maxEscTempC;
  const thermalLevel: AlarmLevel = safety.thermalAlarm === true
    ? "crit"
    : temp == null
      ? safety.thermalAlarm === false ? "ok" : "unknown"
      : temp > SAFETY_LIMITS.thermalC ? "crit" : temp > SAFETY_LIMITS.thermalC * 0.8 ? "warn" : "ok";

  const anyFault = propulsion.thrusters.some((x) => x.faulted);
  const derivedCurrent = safety.maxThrusterCurrentA ?? propulsion.thrusters.reduce<number | null>((m, x) => (x.currentA == null ? m : Math.max(m ?? 0, x.currentA)), null);
  const overILevel: AlarmLevel = anyFault || safety.overcurrentAlarm === true
    ? "crit"
    : derivedCurrent == null
      ? safety.overcurrentAlarm === false ? "ok" : "unknown"
      : derivedCurrent > SAFETY_LIMITS.overcurrentA ? "crit" : derivedCurrent > SAFETY_LIMITS.overcurrentA * 0.75 ? "warn" : "ok";

  const soc = power.batterySocPct;
  const battLevel: AlarmLevel = safety.lowBattery === true
    ? "crit"
    : soc == null
      ? safety.lowBattery === false ? "ok" : "unknown"
      : soc < SAFETY_LIMITS.lowBatteryPct ? "crit" : soc < SAFETY_LIMITS.lowBatteryPct * 1.5 ? "warn" : "ok";

  // Global E-STOP: cut all thrusters immediately, then disarm. No confirm — stopping is fail-safe.
  const estop = () => {
    void sendCommand({ domain: "thruster", action: "allStop" });
    void sendCommand({ domain: "autonomy", action: "arm", armed: false });
  };

  return (
    <div
      className={cn(
        "psa-glass-strong relative z-[71] flex shrink-0 items-center gap-2 border-b px-3 py-1.5 text-[10px]",
        armed ? "border-red-500/40" : "border-white/10"
      )}
    >
      {/* ARMED / SAFE state */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2 py-1 font-black uppercase tracking-[0.18em]",
          armed ? "border-red-500/60 bg-red-500/20 text-red-200" : "border-green-500/40 bg-green-500/10 text-green-300"
        )}
      >
        <StatLED color={armed ? "red" : "green"} pulse={armed} />
        {armed ? "Armed" : "Safe"}
        <span className="hidden font-semibold tracking-normal opacity-70 sm:inline">{armed ? "· props live" : "· props inhibited"}</span>
      </div>

      {/* Control-session state — if there's no admin session, EVERY command 401s silently. Make it loud. */}
      {!controlAuthed && (
        <div
          title={controlError ?? "No admin session — commands will be rejected."}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1 font-black uppercase tracking-wide",
            controlChecking ? "border-amber-500/50 bg-amber-500/15 text-amber-200" : "border-red-500/70 bg-red-500/25 text-red-100"
          )}
        >
          <StatLED color={controlChecking ? "amber" : "red"} pulse />
          {controlChecking ? "Auth…" : "Controls Locked"}
        </div>
      )}
      {controlAuthed && controlMethod === "local-dev" && (
        <span className="hidden items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/50 lg:flex" title="Authenticated via the local-dev admin session (dev/LAN only)">
          <StatLED color="cyan" /> dev session
        </span>
      )}

      {/* Deadman countdown (only meaningful while armed) */}
      {armed && (
        <div className="flex items-center gap-1" title="Deadman: vehicle auto-disarms at 0 unless a command arrives">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">DMS</span>
          <span className={cn("font-mono text-[11px] font-bold tabular-nums", LEVEL_TEXT[deadmanLevel])}>
            {deadman == null ? "—" : `${deadman.toFixed(1)}s`}
          </span>
        </div>
      )}

      <div className="h-4 w-px bg-white/10" />

      {/* Hardware safety alarms — hidden on the narrowest phones to keep ARMED + E-STOP one line */}
      <div className="hidden items-center gap-2.5 sm:flex">
        <AlarmChip label="Kill" level={killLevel} value={kill == null ? "—" : kill ? "ENGAGED" : "clear"} />
        <AlarmChip label="Leak" level={leakLevel} value={leak == null ? "—" : leak ? "WATER" : "dry"} />
        <AlarmChip label="Temp" level={thermalLevel} value={temp != null ? `${temp.toFixed(0)}°` : safety.thermalAlarm == null ? "—" : safety.thermalAlarm ? "HOT" : "ok"} />
        <AlarmChip label="Curr" level={overILevel} value={derivedCurrent != null ? `${derivedCurrent.toFixed(1)}A` : anyFault ? "FAULT" : safety.overcurrentAlarm == null ? "—" : "ok"} />
        <AlarmChip label="Batt" level={battLevel} value={soc != null ? `${soc.toFixed(0)}%` : safety.lowBattery == null ? "—" : safety.lowBattery ? "LOW" : "ok"} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Session record toggle */}
        <button
          type="button"
          onClick={onToggleRecord}
          title={recording ? "Stop recording this session" : "Record this session (telemetry + commands)"}
          className={cn(
            "psa-glass-btn flex items-center gap-1.5 rounded-md border px-2 py-1 font-bold uppercase tracking-wider",
            recording ? "border-red-500/60 bg-red-500/15 text-red-200" : "border-white/10 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200"
          )}
        >
          <Circle className={cn("h-2.5 w-2.5", recording ? "animate-pulse fill-red-500 text-red-500" : "fill-slate-500 text-slate-500")} />
          {recording ? (
            <span className="tabular-nums">REC {fmtElapsed(Date.now() - (recStartedMs ?? Date.now()))} · {frameCount}</span>
          ) : (
            <span className="hidden sm:inline">REC</span>
          )}
        </button>

        {/* Global E-STOP */}
        <button
          type="button"
          onClick={estop}
          title="EMERGENCY STOP — cut all thrusters and disarm"
          className="flex items-center gap-1.5 rounded-md border border-red-500/70 bg-red-600/30 px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-red-100 shadow-[0_0_10px] shadow-red-600/30 transition-colors hover:bg-red-600/50 active:bg-red-700/60"
        >
          <Octagon className="h-4 w-4" />
          E-Stop
        </button>
      </div>
    </div>
  );
}
