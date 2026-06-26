"use client";

import { useState } from "react";
import { Navigation, Crosshair, Anchor, Octagon, Waves, Camera, RotateCw } from "lucide-react";
import {
  AUTONOMY_MODES,
  type AutonomyMode,
  type BuoyCommand,
  type BuoyTelemetry,
} from "@/lib/psathyrella/contract";
import { Panel, SectionLabel, TacButton, Readout, StatLED } from "@/components/psathyrella/ui";

function ThrusterRing({ telemetry, heading, magnitude }: { telemetry: BuoyTelemetry; heading: number; magnitude: number }) {
  const size = 168;
  const c = size / 2;
  const r = 64;
  // 4 thrusters in X config
  const positions = [45, 135, 225, 315];
  const thrusters = telemetry.propulsion.thrusters;
  const vec = (deg: number, len: number) => {
    const a = (deg - 90) * (Math.PI / 180);
    return { x: c + Math.cos(a) * len, y: c + Math.sin(a) * len };
  };
  const tip = vec(heading, (magnitude / 100) * r);
  return (
    <svg width={size} height={size} className="mx-auto">
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(34,211,238,0.18)" />
      <circle cx={c} cy={c} r={r / 2} fill="none" stroke="rgba(34,211,238,0.10)" />
      <line x1={c} y1={c - r} x2={c} y2={c + r} stroke="rgba(255,255,255,0.06)" />
      <line x1={c - r} y1={c} x2={c + r} y2={c} stroke="rgba(255,255,255,0.06)" />
      <text x={c} y={c - r - 4} fill="rgba(125,211,252,0.7)" fontSize="9" textAnchor="middle" fontWeight="bold">BOW</text>
      {positions.map((deg, i) => {
        const th = thrusters[i];
        const p = vec(deg, r);
        const mag = Math.min(1, Math.abs(th?.throttlePct ?? 0) / 100);
        const col = th?.faulted ? "#ef4444" : mag > 0.02 ? "#22d3ee" : "#475569";
        const inner = vec(deg, r - mag * (r - 18));
        return (
          <g key={deg}>
            <line x1={c} y1={c} x2={inner.x} y2={inner.y} stroke={col} strokeOpacity={0.5} strokeWidth={mag * 6 + 1} strokeLinecap="round" />
            <circle cx={p.x} cy={p.y} r={6} fill="#0a0f1e" stroke={col} strokeWidth={1.5} />
            <text x={p.x} y={p.y + 3} fontSize="7" fill={col} textAnchor="middle">{i + 1}</text>
          </g>
        );
      })}
      {/* commanded translation vector */}
      <line x1={c} y1={c} x2={tip.x} y2={tip.y} stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
        </marker>
      </defs>
      <circle cx={c} cy={c} r={4} fill="#e2e8f0" />
    </svg>
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

  const sendVector = (h: number, m: number, y: number) =>
    sendCommand({ domain: "thruster", action: "setVector", headingDeg: h, magnitudePct: m, yawRateDegS: y });

  const allStop = () => {
    setMagnitude(0);
    setYawRate(0);
    sendCommand({ domain: "thruster", action: "allStop" });
  };

  return (
    <Panel title="Navigation · Propulsion" icon={<Navigation className="h-4 w-4" />} className="h-full">
      {/* Autonomy modes */}
      <SectionLabel>Autonomy Mode</SectionLabel>
      <div className="mb-3 grid grid-cols-2 gap-1">
        {AUTONOMY_MODES.map((m) => (
          <TacButton
            key={m}
            active={mode === m}
            onClick={() => {
              setMode(m);
              sendCommand({ domain: "autonomy", action: "setMode", mode: m });
            }}
            className="px-1.5 text-[10px]"
          >
            {m.replace("_", " ")}
          </TacButton>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <TacButton tone={armed ? "danger" : "go"} active={armed} onClick={() => { const v = !armed; setArmed(v); sendCommand({ domain: "autonomy", action: "arm", armed: v }); }} className="flex-1">
          {armed ? "Disarm" : "Arm"}
        </TacButton>
        <TacButton tone="danger" onClick={allStop} className="flex-1" title="Cut all thrusters">
          <Octagon className="h-3.5 w-3.5" /> All Stop
        </TacButton>
      </div>

      {/* Thruster vector ring */}
      <SectionLabel>Thrust Vector · 4× 360° Vectored</SectionLabel>
      <ThrusterRing telemetry={telemetry} heading={heading} magnitude={magnitude} />

      <div className="mt-2 space-y-2.5">
        <div>
          <div className="flex justify-between text-[10px] text-slate-400"><span>Heading</span><span className="font-mono text-cyan-300">{heading}°</span></div>
          <input type="range" min={0} max={359} value={heading} onChange={(e) => { const v = +e.target.value; setHeading(v); sendVector(v, magnitude, yawRate); }} className="w-full accent-cyan-400" />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-slate-400"><span>Throttle</span><span className="font-mono text-cyan-300">{magnitude}%</span></div>
          <input type="range" min={0} max={100} value={magnitude} onChange={(e) => { const v = +e.target.value; setMagnitude(v); sendVector(heading, v, yawRate); }} className="w-full accent-cyan-400" />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-slate-400"><span>Yaw rate</span><span className="font-mono text-cyan-300">{yawRate}°/s</span></div>
          <input type="range" min={-30} max={30} value={yawRate} onChange={(e) => { const v = +e.target.value; setYawRate(v); sendVector(heading, magnitude, v); }} className="w-full accent-amber-400" />
        </div>
      </div>

      {/* Quick holds */}
      <SectionLabel className="mt-3">Hold / Assist</SectionLabel>
      <div className="grid grid-cols-2 gap-1">
        <TacButton onClick={() => sendCommand({ domain: "autonomy", action: "stationKeep" })} className="text-[10px]"><Anchor className="h-3.5 w-3.5" /> Station</TacButton>
        <TacButton active={fightCurrent} onClick={() => { const v = !fightCurrent; setFightCurrent(v); sendCommand({ domain: "autonomy", action: "fightCurrent", enabled: v }); }} className="text-[10px]"><Waves className="h-3.5 w-3.5" /> Fight Cur</TacButton>
        <TacButton onClick={() => sendCommand({ domain: "autonomy", action: "cameraHold", bearingDeg: heading })} className="text-[10px]"><Camera className="h-3.5 w-3.5" /> Cam Hold</TacButton>
        <TacButton onClick={() => sendVector(heading, magnitude, yawRate)} className="text-[10px]"><RotateCw className="h-3.5 w-3.5" /> Re-send</TacButton>
      </div>

      {/* Per-thruster live readout */}
      <SectionLabel className="mt-3">Thruster Telemetry</SectionLabel>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {telemetry.propulsion.thrusters.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1">
            <div className="flex items-center gap-1.5">
              <StatLED color={t.faulted ? "red" : t.currentA ? "cyan" : "slate"} />
              <span className="text-[10px] text-slate-300">{t.label}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">{t.currentA != null ? `${t.currentA.toFixed(1)}A` : "—"}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Readout label="Heading (live)" value={telemetry.pose.headingDeg != null ? Math.round(telemetry.pose.headingDeg) : null} unit="°" />
        <Readout label="Speed" value={telemetry.pose.speedKn != null ? telemetry.pose.speedKn.toFixed(1) : null} unit="kn" />
      </div>
    </Panel>
  );
}
