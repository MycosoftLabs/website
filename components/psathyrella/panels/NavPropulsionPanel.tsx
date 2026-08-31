"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Anchor, Octagon, Waves, Camera, RotateCw, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AUTONOMY_MODES,
  type AutonomyMode,
  type BuoyCommand,
  type BuoyTelemetry,
  type ThrusterId,
} from "@/lib/psathyrella/contract";
import { useThrottledSend } from "@/lib/psathyrella/useThrottledSend";
import { useMagnetometer } from "@/lib/psathyrella/useMagnetometer";
import { Panel, SectionLabel, TacButton } from "@/components/psathyrella/ui";
import CompassRose from "@/components/psathyrella/views/CompassRose";
import { ThumbJoystick } from "./ThumbJoystick";

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
  // Collapsed by default — see the note at the selector itself. Not persisted: the operator who
  // opens it is changing mode now, not setting a preference for every future session.
  const [modePickerOpen, setModePickerOpen] = useState(false);
  // BMM150, polled off the fusion-sensors BFF (it is not part of the MAS telemetry stream).
  const { magnetometer } = useMagnetometer();
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

      {/* Mode: the ACTIVE mode as a chip, with the selector one click away right beside it.
          The eight mode buttons used to sit expanded at the top of the rail — four rows for modes
          that are not in use yet, in the scarcest space on the console. Collapsed to a chevron here
          they cost nothing, and the active mode (the part an operator actually needs at a glance)
          is still always visible. */}
      <div className="relative mb-2 flex items-center gap-1.5">
        <SectionLabel className="mb-0">Mode</SectionLabel>
        <button
          type="button"
          onClick={() => setModePickerOpen((v) => !v)}
          aria-expanded={modePickerOpen}
          title="Change autonomy mode"
          className="flex min-w-0 items-center gap-1 truncate rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:border-cyan-400/60 hover:bg-cyan-500/20"
        >
          <span className="truncate">{mode.replace("_", " ")}</span>
          <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", modePickerOpen && "rotate-180")} />
        </button>
        <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-slate-400">
          {telemetry.pose.speedKn != null ? `${telemetry.pose.speedKn.toFixed(1)} kn` : "— kn"}
        </span>

        {/* FLOATING PANEL, not an inline row.
            Opening this used to insert a 4-row grid into the column, which grew the panel past its
            slot and forced the whole left rail to scroll. A control that changes the height of its
            own container is the thing that made this panel scroll at all — as an absolutely
            positioned overlay it takes ZERO layout space, so the rail cannot move whether it is open
            or closed. Backdrop closes it on any outside click. */}
        {modePickerOpen && (
          <>
            <button
              type="button"
              aria-label="Close mode selector"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setModePickerOpen(false)}
            />
            {/* FULLY OPAQUE, deliberately: this panel floats over the compass and the joystick, and
                a control that COMMITS AN AUTONOMY MODE has to be unambiguously readable — any
                instrument geometry bleeding through the buttons is a misread waiting to happen.
                `backdrop-blur` was dropped with it: blurring costs a compositing layer and buys
                nothing behind a solid fill. */}
            <div className="absolute left-0 top-full z-50 mt-1 w-[190px] rounded-lg border border-cyan-500/40 bg-[#070d18] p-1.5 shadow-2xl shadow-black/80">
              <div className="mb-1 px-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-300/50">Autonomy mode</div>
              <div className="grid grid-cols-2 gap-1">
                {AUTONOMY_MODES.map((m) => (
                  <TacButton
                    key={m}
                    active={mode === m}
                    onClick={() => {
                      setMode(m);
                      setModePickerOpen(false);
                      sendCommand({ domain: "autonomy", action: "setMode", mode: m });
                    }}
                    className="min-h-7 px-1 text-[9px]"
                  >
                    {m.replace("_", " ")}
                  </TacButton>
                ))}
              </div>
            </div>
          </>
        )}
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
      {/* One row of four, not 2x2 — these are short labels and the rail has the height to spare
          nowhere else. */}
      <div className="grid grid-cols-4 gap-1">
        <TacButton onClick={() => sendCommand({ domain: "autonomy", action: "stationKeep" })} className="min-h-7 text-[9px]"><Anchor className="h-3.5 w-3.5" /> Station</TacButton>
        <TacButton active={fightCurrent} onClick={() => { const v = !fightCurrent; setFightCurrent(v); sendCommand({ domain: "autonomy", action: "fightCurrent", enabled: v }); }} className="min-h-7 text-[9px]"><Waves className="h-3.5 w-3.5" /> Fight Cur</TacButton>
        <TacButton onClick={() => sendCommand({ domain: "autonomy", action: "cameraHold", bearingDeg: heading })} className="min-h-7 text-[9px]"><Camera className="h-3.5 w-3.5" /> Cam Hold</TacButton>
        <TacButton onClick={() => sendVector(heading, magnitude, yawRate)} className="min-h-7 text-[9px]"><RotateCw className="h-3.5 w-3.5" /> Re-send</TacButton>
      </div>

      {/* ONE compass, not two.
          This previously stacked a commanded-vs-actual VectorCompass above a separate geomagnetic
          CompassRose — two dials burning double the vertical space to show the same three bearings,
          and their combined height pushed this panel past its rail slot, which made FitScale shrink
          the WHOLE left panel. A widget must never resize its siblings. Merged: white needle = actual
          bow heading, cyan = commanded vector (length scaled by magnitude), dashed amber = raw
          magnetic field, which is NOT promoted to a heading until it is calibrated AND
          tilt-compensated. Readout beneath is dynamic — chips appear only when they have data. */}
      <SectionLabel className="mt-2">Compass · Vector · Geomagnetic</SectionLabel>
      <div className="flex justify-center rounded bg-white/[0.03] px-2 py-2">
        <CompassRose
          headingDeg={telemetry.pose.headingDeg}
          commandedDeg={commandedHeading}
          magnitudePct={commandedMag}
          magnetometer={magnetometer}
          className="w-full max-w-[124px]"
        />
      </div>

      {/* Per-thruster live readout + fault lamps */}
      {/* Thruster Telemetry / Faults moved to the BENCH tab (Morgan, Aug 03). Per-pod current and
          fault lamps are diagnostics — you read them when something is wrong, not while driving —
          and they were the last thing forcing this panel past its slot. Faults are still surfaced
          where they matter: the safety strip and the comms-degraded banner both remain here. */}
    </Panel>
  );
}
