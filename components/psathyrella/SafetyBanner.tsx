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
 *
 * The ARM indicator is TRI-state (Armed / Safe / Arm-unknown) for the same reason: `autonomy.armed`
 * is a plain boolean whose no-data value is `false`, so it must never be rendered as "props
 * inhibited" unless we are actually hearing the vehicle. See the derivation below.
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

  // ── Arm state is tri-state, not boolean ────────────────────────────────────────────────────
  // `AutonomyState.armed` is typed `boolean` and `emptyTelemetry()` seeds it FALSE, while
  // `overlayEnvelope` writes it only when the envelope actually carries a boolean. So "MAS
  // unreachable / telemetry 401 / cold load before the first frame" is bit-identical to "the
  // vehicle told us it is disarmed". Painting the seed value as a green "Safe · props inhibited"
  // would tell an operator the thrusters are inhibited while they are spinning in the pool — the
  // most dangerous lie this console can tell, and the one chip in this strip that had no unknown
  // path while every sibling alarm already renders "—".
  //
  // So: a TRUE arm flag is always honoured (an assertion that the props are live is never
  // suppressed), and a FALSE flag only earns the green chip while the link says we are in contact.
  // Both no-data paths land in "unknown": a cold load leaves link "unknown"/contactState "dark",
  // and a mid-session MAS drop rebuilds from emptyTelemetry() so contactState falls back to "dark".
  // A null `lastUpdateMsAgo` is deliberately NOT treated as stale on its own — an envelope that
  // omits the field is still an envelope, and the contact test already covers "no envelope".
  // Going unknown while contactState is "dark" in SIM is correct too, not a demo regression: the
  // command path store-and-forwards while dark, so a disarm the operator just pressed may not have
  // reached the vehicle.
  //
  // This is an inference from link health — the strongest evidence BuoyTelemetry carries today.
  // It becomes exact once AutonomyState grows an `armedReported` flag that overlayEnvelope sets in
  // the same branch that writes `armed`; until then, prefer the false amber over the false green.
  const ARM_STALE_MS = 15_000; // ~6 missed 2.5 s telemetry frames
  const inContact = telemetry.contactState !== "dark" && telemetry.link !== "offline" && telemetry.link !== "unknown";
  const armReportStale = telemetry.lastUpdateMsAgo != null && telemetry.lastUpdateMsAgo > ARM_STALE_MS;
  const armState: "armed" | "safe" | "unknown" = armed ? "armed" : inContact && !armReportStale ? "safe" : "unknown";

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
  // Never gated on `armed`: the state in which the operator most needs it is the one where we do
  // not know whether the vehicle is armed.
  const estop = () => {
    void sendCommand({ domain: "thruster", action: "allStop" });
    void sendCommand({ domain: "autonomy", action: "arm", armed: false });
  };

  return (
    <div
      className={cn(
        "psa-glass-strong relative z-[71] flex shrink-0 items-center gap-2 border-b px-3 py-1.5 text-[10px]",
        armState === "armed" ? "border-red-500/40" : armState === "unknown" ? "border-amber-500/40" : "border-white/10"
      )}
    >
      {/* ARMED / SAFE / ARM-UNKNOWN state. Unknown is amber and pulsing, not the slate the alarm
          chips use for "no sensor wired" — an unreported arm state is an alarm, not an inert gap. */}
      <div
        title={
          armState === "armed"
            ? "Vehicle reports ARMED — thrusters can spin."
            : armState === "safe"
              ? "Vehicle reports disarmed — thrusters inhibited."
              : "No arm-state report from the vehicle (link down, dark, or no frame yet). The props may be LIVE. Use E-STOP if in doubt."
        }
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2 py-1 font-black uppercase tracking-[0.18em]",
          armState === "armed"
            ? "border-red-500/60 bg-red-500/20 text-red-200"
            : armState === "safe"
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-amber-500/60 bg-amber-500/15 text-amber-200"
        )}
      >
        <StatLED color={armState === "armed" ? "red" : armState === "safe" ? "green" : "amber"} pulse={armState !== "safe"} />
        {armState === "armed" ? "Armed" : armState === "safe" ? "Safe" : "Arm Unknown"}
        <span className="hidden font-semibold tracking-normal opacity-70 sm:inline">
          {armState === "armed" ? "· props live" : armState === "safe" ? "· props inhibited" : "· no report from vehicle"}
        </span>
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

      {/* Deadman countdown — shown while armed AND while the arm state is unknown. If we cannot
          confirm the vehicle is disarmed we cannot claim its deadman is irrelevant: the row stays
          up reading "—" (unknown) rather than silently disappearing. */}
      {armState !== "safe" && (
        <div
          className="flex items-center gap-1"
          title={
            armState === "unknown"
              ? "Deadman unknown — no arm-state report from the vehicle"
              : "Deadman: vehicle auto-disarms at 0 unless a command arrives"
          }
        >
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
