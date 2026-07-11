"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Anchor, Octagon, Waves, Camera, RotateCw, AlertTriangle } from "lucide-react";
import {
  AUTONOMY_MODES,
  type AutonomyMode,
  type BuoyCommand,
  type BuoyTelemetry,
  type ThrusterId,
} from "@/lib/psathyrella/contract";
import { useThrottledSend } from "@/lib/psathyrella/useThrottledSend";
import { Panel, SectionLabel, TacButton, Readout, StatLED } from "@/components/psathyrella/ui";
import { ThumbJoystick } from "./ThumbJoystick";

/**
 * Commanded-vs-actual thrust-vector mini-compass.
 * Cyan needle = commanded translation heading (from propulsion.commandedVector).
 * White needle = actual bow heading (pose.headingDeg). Amber arc = error between them.
 * 0° = true north, clockwise. All headings in degrees.
 */
function VectorCompass({
  commandedDeg,
  magnitudePct,
  actualDeg,
}: {
  commandedDeg: number | null;
  magnitudePct: number | null;
  actualDeg: number | null;
}) {
  const R = 38;
  const cx = 50;
  const cy = 50;
  // SVG: 0° (north) = straight up, clockwise. screen angle = deg - 90.
  const tip = (deg: number, len: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: cx + Math.cos(a) * len, y: cy + Math.sin(a) * len };
  };
  const cmdHas = commandedDeg != null;
  const actHas = actualDeg != null;
  const cmdLen = R * (magnitudePct != null ? Math.max(0.25, Math.min(1, magnitudePct / 100)) : 0.85);
  const cmd = cmdHas ? tip(commandedDeg as number, cmdLen) : null;
  const act = actHas ? tip(actualDeg as number, R) : null;
  // Smallest signed error (commanded relative to actual)
  const err =
    cmdHas && actHas ? (((((commandedDeg as number) - (actualDeg as number)) % 360) + 540) % 360) - 180 : null;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="h-[72px] w-[72px] shrink-0">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={R * 0.6} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        {/* cardinal ticks */}
        {[0, 90, 180, 270].map((d) => {
          const o = tip(d, R);
          const i = tip(d, R - 5);
          return <line key={d} x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="rgba(148,163,184,0.5)" strokeWidth={1} />;
        })}
        <text x={cx} y={11} textAnchor="middle" className="fill-slate-500" fontSize={7}>N</text>
        {/* actual bow heading — white */}
        {act && (
          <line x1={cx} y1={cy} x2={act.x} y2={act.y} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
        )}
        {/* commanded vector — cyan, length scaled by magnitude */}
        {cmd && (
          <>
            <line x1={cx} y1={cy} x2={cmd.x} y2={cmd.y} stroke="#22d3ee" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={cmd.x} cy={cmd.y} r={2.5} fill="#22d3ee" />
          </>
        )}
        <circle cx={cx} cy={cy} r={2.5} fill="#0a0f1e" stroke="rgba(148,163,184,0.6)" strokeWidth={1} />
      </svg>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[9px] uppercase tracking-wide text-slate-500">Cmd</span>
          <span className="font-mono text-[11px] text-cyan-200">{cmdHas ? `${Math.round(commandedDeg as number)}°` : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-200" />
          <span className="text-[9px] uppercase tracking-wide text-slate-500">Act</span>
          <span className="font-mono text-[11px] text-slate-200">{actHas ? `${Math.round(actualDeg as number)}°` : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wide text-slate-500">Δ Err</span>
          <span className={`font-mono text-[11px] ${err == null ? "text-slate-600" : Math.abs(err) > 15 ? "text-amber-300" : "text-green-300"}`}>
            {err == null ? "—" : `${err > 0 ? "+" : ""}${Math.round(err)}°`}
          </span>
        </div>
      </div>
    </div>
  );
}

export function NavPropulsionPanel({
  telemetry,
  sendCommand,
}: {
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => void;
}) {
  const [heading, setHeading] = useState(0);
  const [magnitude, setMagnitude] = useState(0);
  const [yawRate, setYawRate] = useState(0);
  const [mode, setMode] = useState<AutonomyMode>(telemetry.autonomy.mode);
  const [armed, setArmed] = useState(telemetry.autonomy.armed);
  const [fightCurrent, setFightCurrent] = useState(telemetry.autonomy.fightCurrent);
  // Drag-flood protection for the joystick + yaw slider (bench tools live in BenchPanel now).
  // `stop` is authoritative: it re-asserts All-Stop after any in-flight drag vector resolves, so a
  // stale vector can't outrace the release and leave a thruster spinning (bug seen in the iPad test).
  const { send: throttledSend, stop: stopThrottle } = useThrottledSend(sendCommand);
  const ALL_STOP: BuoyCommand = { domain: "thruster", action: "allStop" };

  // Commanded vector: prefer what the buoy reports it's executing; fall back to the
  // operator's live joystick intent before the first echo comes back.
  const cv = telemetry.propulsion.commandedVector;
  const commandedHeading = cv != null ? cv.headingDeg : magnitude > 0 ? heading : null;
  const commandedMag = cv != null ? cv.magnitudePct : magnitude > 0 ? magnitude : null;

  const sendVector = (h: number, m: number, y: number) =>
    throttledSend({ domain: "thruster", action: "setVector", headingDeg: h, magnitudePct: m, yawRateDegS: y });

  const allStop = () => {
    setHeading(0);
    setMagnitude(0);
    setYawRate(0);
    stopThrottle(ALL_STOP); // authoritative — wins over any in-flight drag vector
  };

  // Pods off home (reported azimuth beyond ±5° of the straight-out 0°) — drives the ⌂ Home chip.
  const offHomeCount = telemetry.propulsion.thrusters.filter(
    (t) => Math.abs((((Number(t.azimuthDeg) || 0) + 180) % 360) - 180) > 5
  ).length;

  // AUTO-HOME: when the joystick is released (thrust off), rotate all pods back to home after a
  // short debounce — re-grabbing the stick inside the window cancels it, so rapid maneuvering
  // doesn't thrash the servos. Persisted; default ON. (Manual All-Stop/E-Stop do NOT auto-home —
  // an emergency stop should freeze the boat, not start rotations.)
  const [autoHome, setAutoHomeState] = useState(() => {
    try { return typeof window === "undefined" || localStorage.getItem("psathyrella.autohome") !== "0"; } catch { return true; }
  });
  const setAutoHome = (v: boolean) => {
    setAutoHomeState(v);
    try { localStorage.setItem("psathyrella.autohome", v ? "1" : "0"); } catch { /* private mode */ }
  };
  const autoHomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAutoHome = () => { if (autoHomeTimer.current) { clearTimeout(autoHomeTimer.current); autoHomeTimer.current = null; } };
  // ONE atomic nav.thruster_group (direct bench proxy) — all four pods start rotating home
  // together instead of a staggered 4-command train (each command rides its own TCP fate).
  // Falls back to per-pod commands if the direct path is unreachable.
  const homeAllPods = () => {
    fetch("/api/psathyrella/agent-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "nav.thruster_group", params: { items: [0, 1, 2, 3].map((id) => ({ id, azimuth: 0 })) } }),
    }).then((r) => {
      if (!r.ok) throw new Error("direct path down");
    }).catch(() => {
      for (const id of [0, 1, 2, 3]) sendCommand({ domain: "thruster", action: "setAzimuth", id: id as ThrusterId, azimuthDeg: 0 });
    });
  };
  const scheduleAutoHome = () => {
    if (!autoHome) return;
    cancelAutoHome();
    autoHomeTimer.current = setTimeout(() => { autoHomeTimer.current = null; homeAllPods(); }, 700);
  };
  useEffect(() => () => cancelAutoHome(), []);

  // Degraded-comms state — surfaced inline where the sailor is driving, not buried in a tab.
  const linkDown = telemetry.link === "offline" || telemetry.contactState === "dark";
  const linkDelayed = !linkDown && (telemetry.link === "stale" || telemetry.contactState === "delayed");

  return (
    <Panel title="Navigation · Propulsion" icon={<Navigation className="h-4 w-4" />} className="h-full">
      {/* Comms-degraded banner — commands still accepted; store-and-forward queues them. */}
      {(linkDown || linkDelayed) && (
        <div
          className={`mb-2 flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide ${
            linkDown ? "border-red-500/50 bg-red-500/15 text-red-200" : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {linkDown ? "Link down — commands queue until reconnect" : "Link delayed — sat store-and-forward"}
        </div>
      )}

      {/* Autonomy modes */}
      <SectionLabel>Autonomy Mode</SectionLabel>
      <div className="mb-2 grid grid-cols-2 gap-1">
        {AUTONOMY_MODES.map((m) => (
          <TacButton
            key={m}
            active={mode === m}
            onClick={() => {
              setMode(m);
              sendCommand({ domain: "autonomy", action: "setMode", mode: m });
            }}
            className="min-h-7 px-1 text-[9px]"
          >
            {m.replace("_", " ")}
          </TacButton>
        ))}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <TacButton
          tone={armed ? "danger" : "go"}
          active={armed}
          onClick={async () => {
            const v = !armed;
            setArmed(v); // optimistic; reverted below if the arm truly failed
            const fire = () => Promise.resolve(sendCommand({ domain: "autonomy", action: "arm", armed: v }) as unknown as boolean | undefined);
            // Arming is idempotent and the MAS hop can transiently fail — retry once, and never
            // leave the button claiming ARMED when both attempts failed (silent-fail trap).
            const ok = (await fire()) !== false || (await fire()) !== false;
            if (!ok && v) setArmed(false);
          }}
          className="flex-1"
        >
          {armed ? "Disarm" : "Arm"}
        </TacButton>
        <TacButton tone="danger" onClick={allStop} className="flex-1" title="Cut all thrusters">
          <Octagon className="h-3.5 w-3.5" /> All Stop
        </TacButton>
      </div>

      {/* Manual thumb-joystick — drag to translate; release springs to All-Stop.
          (Bench Jog / Raw Channel / Channel Signals moved to the right-rail Bench tab.) */}
      <div className="flex items-center justify-between">
        <SectionLabel className="mb-0">Manual Nav · 4× 360° Vectored</SectionLabel>
        {/* HOME = every pod straight out from center mass (locked by Set-Home in the Bench tab).
            Green ticks/needles on the widget = pod parked at home; amber = off home. */}
        <div className="flex items-center gap-1">
          {/* AUTO = pods return home by themselves ~0.7s after the joystick is released */}
          <button
            type="button"
            onClick={() => setAutoHome(!autoHome)}
            title={autoHome ? "Auto-home ON — pods return to home when the joystick is released" : "Auto-home OFF — pods hold their last angle on release"}
            className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              autoHome ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-300"
            }`}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => { cancelAutoHome(); homeAllPods(); }}
            title="Rotate all pods to HOME (0° — straight out from center)"
            className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              offHomeCount === 0 ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
            }`}
          >
            ⌂ Home{offHomeCount > 0 ? ` · ${offHomeCount} off` : ""}
          </button>
        </div>
      </div>
      <ThumbJoystick
        thrusters={telemetry.propulsion.thrusters}
        yawRate={yawRate}
        onVector={(h, m) => { cancelAutoHome(); setHeading(h); setMagnitude(m); sendVector(h, m, yawRate); }}
        onStop={() => { setHeading(0); setMagnitude(0); stopThrottle(ALL_STOP); scheduleAutoHome(); }}
      />
      <div className="mt-1.5">
        <div className="flex justify-between text-[10px] text-slate-400"><span>Yaw / rotate</span><span className="font-mono text-amber-300">{yawRate}°/s</span></div>
        <input
          type="range" min={-30} max={30} value={yawRate}
          onChange={(e) => { const v = +e.target.value; setYawRate(v); sendVector(heading, magnitude, v); }}
          onPointerUp={() => { setYawRate(0); stopThrottle({ domain: "thruster", action: "setVector", headingDeg: heading, magnitudePct: magnitude, yawRateDegS: 0 }); }}
          className="w-full accent-amber-400"
        />
      </div>

      {/* Quick holds */}
      <SectionLabel className="mt-2">Hold / Assist</SectionLabel>
      <div className="grid grid-cols-2 gap-1">
        <TacButton onClick={() => sendCommand({ domain: "autonomy", action: "stationKeep" })} className="min-h-7 text-[9px]"><Anchor className="h-3.5 w-3.5" /> Station</TacButton>
        <TacButton active={fightCurrent} onClick={() => { const v = !fightCurrent; setFightCurrent(v); sendCommand({ domain: "autonomy", action: "fightCurrent", enabled: v }); }} className="min-h-7 text-[9px]"><Waves className="h-3.5 w-3.5" /> Fight Cur</TacButton>
        <TacButton onClick={() => sendCommand({ domain: "autonomy", action: "cameraHold", bearingDeg: heading })} className="min-h-7 text-[9px]"><Camera className="h-3.5 w-3.5" /> Cam Hold</TacButton>
        <TacButton onClick={() => sendVector(heading, magnitude, yawRate)} className="min-h-7 text-[9px]"><RotateCw className="h-3.5 w-3.5" /> Re-send</TacButton>
      </div>

      {/* Commanded-vs-actual thrust vector */}
      <SectionLabel className="mt-2">Vector · Commanded vs Actual</SectionLabel>
      <div className="rounded bg-white/[0.03] px-2 py-2">
        <VectorCompass
          commandedDeg={commandedHeading}
          magnitudePct={commandedMag}
          actualDeg={telemetry.pose.headingDeg}
        />
      </div>

      {/* Per-thruster live readout + fault lamps */}
      <SectionLabel className="mt-2">Thruster Telemetry · Faults</SectionLabel>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {telemetry.propulsion.thrusters.map((t) => {
          const faulted = t.faulted;
          // Over-current heuristic (no nominal in contract): flag a soft warning ≥ 8A.
          const overCurrent = !faulted && t.currentA != null && t.currentA >= 8;
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded px-2 py-1 ${
                faulted ? "border border-red-500/40 bg-red-500/10" : "bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <StatLED color={faulted ? "red" : overCurrent ? "amber" : t.currentA ? "cyan" : "slate"} pulse={faulted} />
                <span className={`text-[10px] ${faulted ? "font-semibold text-red-200" : "text-slate-300"}`}>{t.label}</span>
              </div>
              <div className="flex items-center gap-1">
                {faulted && <AlertTriangle className="h-3 w-3 text-red-400" />}
                <span className={`font-mono text-[10px] ${faulted ? "text-red-300" : overCurrent ? "text-amber-300" : "text-slate-400"}`}>
                  {faulted ? "FAULT" : t.currentA != null ? `${t.currentA.toFixed(1)}A` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Readout label="Heading (live)" value={telemetry.pose.headingDeg != null ? Math.round(telemetry.pose.headingDeg) : null} unit="°" />
        <Readout label="Speed" value={telemetry.pose.speedKn != null ? telemetry.pose.speedKn.toFixed(1) : null} unit="kn" />
      </div>
    </Panel>
  );
}
