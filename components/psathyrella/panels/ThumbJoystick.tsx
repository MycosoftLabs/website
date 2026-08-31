"use client";

/**
 * Thumb-joystick — manual omnidirectional nav for the Psathyrella buoy.
 *
 * Top-down view of the round hull: the central TOWER is the BOW (camera/optics point
 * forward), with the 4 vectored thrusters at the rim (BOW-P/S, AFT-P/S). Drag the thumb
 * (mouse or finger, iPad-friendly) toward a direction → the body translates that way:
 * heading = thumb angle, throttle = thumb distance. A spring-return releases to neutral
 * (All-Stop) so letting go always stops the boat — the safe manual fallback if autonomy
 * drops. As the thumb moves, each thruster's mixed vector animates so the operator sees
 * the 4-thruster solution. The displayed mix is illustrative; the firmware owns the exact
 * mixer (Cursor §5) — this UI emits `nav.thrust_vector { heading, magnitude, yaw_rate }`.
 */

import { useCallback, useRef, useState } from "react";
import type { ThrusterState } from "@/lib/psathyrella/contract";

const SIZE = 188;
const C = SIZE / 2;
const HULL_R = 80;
const RIM_R = 62; // thruster pod ring
const DRAG_R = 58; // thumb travel radius

// Compass position of each thruster on the rim (0=N=up=bow, CW degrees).
const THRUSTER_POS: Record<string, number> = { "BOW-P": 315, "BOW-S": 45, "AFT-S": 135, "AFT-P": 225 };

const d2r = (d: number) => (d * Math.PI) / 180;
/** screen-space unit vector for a compass heading (0=N=up, CW; y-axis points down) */
const headVec = (h: number) => ({ x: Math.sin(d2r(h)), y: -Math.cos(d2r(h)) });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function ThumbJoystick({
  thrusters,
  yawRate,
  onVector,
  onStop,
}: {
  thrusters: ThrusterState[];
  yawRate: number;
  onVector: (headingDeg: number, magnitudePct: number) => void;
  onStop: () => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [thumb, setThumb] = useState({ x: C, y: C });
  const lastSent = useRef(0);

  const dx = thumb.x - C;
  const dy = thumb.y - C;
  const dist = Math.hypot(dx, dy);
  const heading = dist < 2 ? 0 : (Math.atan2(dx, -dy) * 180) / Math.PI;
  const headingNorm = (heading + 360) % 360;
  const magnitude = clamp01(dist / DRAG_R); // 0..1

  const toSvg = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return { x: C, y: C };
    return { x: (e.clientX - r.left) * (SIZE / r.width), y: (e.clientY - r.top) * (SIZE / r.height) };
  };

  const update = useCallback(
    (px: number, py: number) => {
      let ax = px - C;
      let ay = py - C;
      const d = Math.hypot(ax, ay);
      if (d > DRAG_R) {
        ax = (ax / d) * DRAG_R;
        ay = (ay / d) * DRAG_R;
      }
      setThumb({ x: C + ax, y: C + ay });
      const h = Math.hypot(ax, ay) < 2 ? 0 : ((Math.atan2(ax, -ay) * 180) / Math.PI + 360) % 360;
      const m = Math.round(clamp01(Math.hypot(ax, ay) / DRAG_R) * 100);
      const now = Date.now();
      if (now - lastSent.current > 90) {
        // throttle the command bus to ~10 Hz
        lastSent.current = now;
        onVector(Math.round(h), m);
      }
    },
    [onVector]
  );

  const onDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic/pen pointers can lack an active pointer id — drag still works via move events */
    }
    setDragging(true);
    const p = toSvg(e);
    update(p.x, p.y);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const p = toSvg(e);
    update(p.x, p.y);
  };
  const release = (e: React.PointerEvent) => {
    setDragging(false);
    setThumb({ x: C, y: C });
    onVector(0, 0);
    onStop();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };

  // ── thruster mix (illustrative) ──
  const T = headVec(headingNorm);
  const yaw01 = Math.max(-1, Math.min(1, yawRate / 30));
  const pods = thrusters.map((t) => {
    const ang = THRUSTER_POS[t.label] ?? 0;
    const rad = { x: Math.sin(d2r(ang)), y: -Math.cos(d2r(ang)) }; // outward radial
    const tang = { x: rad.y, y: -rad.x }; // +90° → tangential (CW yaw)
    const vx = T.x * magnitude + tang.x * yaw01 * 0.6;
    const vy = T.y * magnitude + tang.y * yaw01 * 0.6;
    const mag = clamp01(Math.hypot(vx, vy));
    const px = C + rad.x * RIM_R;
    const py = C + rad.y * RIM_R;
    const nx = mag > 0.02 ? Math.atan2(vx, -vy) : 0;
    const len = 6 + mag * 16;
    const ex = px + (mag > 0.02 ? Math.sin(nx) : 0) * len;
    const ey = py + (mag > 0.02 ? -Math.cos(nx) : 0) * len;
    const col = t.faulted ? "#ef4444" : mag > 0.02 ? "#22d3ee" : "#475569";
    // ── HOME + live pointing ──
    // Each pod's azimuth 0° = HOME = straight out from center mass (its own radial direction,
    // locked by Set-Home / nav.az_zero). The home tick marks that direction; the needle shows the
    // pod's reported azimuth rotated from home — green when parked at home (±5°), amber when off.
    // (Open-loop dead-reckoned until the AS5600 encoders land, so drift shows here as "off home".)
    const azRel = (((Number(t.azimuthDeg) || 0) + 180) % 360) - 180; // pod-relative, -180..180
    const atHome = Math.abs(azRel) <= 5;
    const podWorld = ang + azRel; // needle direction = home (radial) + pod rotation
    const nvec = { x: Math.sin(d2r(podWorld)), y: -Math.cos(d2r(podWorld)) };
    const homeTick = {
      x1: px + rad.x * 8, y1: py + rad.y * 8,
      x2: px + rad.x * 13, y2: py + rad.y * 13,
    };
    const needle = { x2: px + nvec.x * 12, y2: py + nvec.y * 12 };
    return { t, px, py, ex, ey, mag, col, homeTick, needle, atHome, azRel };
  });

  return (
    <div className="select-none">
      <svg
        ref={ref}
        width="100%"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block touch-none"
        style={{ maxWidth: SIZE }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <defs>
          <marker id="thr-arrow" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#22d3ee" />
          </marker>
          <radialGradient id="hull-grad" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#0e1a2e" />
            <stop offset="100%" stopColor="#070d18" />
          </radialGradient>
        </defs>

        {/* hull */}
        <circle cx={C} cy={C} r={HULL_R} fill="url(#hull-grad)" stroke="rgba(34,211,238,0.25)" strokeWidth={1.5} />
        <circle cx={C} cy={C} r={DRAG_R} fill="none" stroke="rgba(34,211,238,0.10)" strokeDasharray="3 4" />
        {/* cross axes */}
        <line x1={C} y1={C - HULL_R} x2={C} y2={C + HULL_R} stroke="rgba(255,255,255,0.05)" />
        <line x1={C - HULL_R} y1={C} x2={C + HULL_R} y2={C} stroke="rgba(255,255,255,0.05)" />

        {/* BOW indicator (tower / camera faces forward) */}
        <path d={`M${C - 7},${C - HULL_R + 9} L${C},${C - HULL_R - 4} L${C + 7},${C - HULL_R + 9} Z`} fill="#67e8f9" />
        <text x={C} y={C - HULL_R - 8} fill="rgba(125,211,252,0.85)" fontSize="9" textAnchor="middle" fontWeight="bold">BOW</text>

        {/* thruster pods + live mix arrows + home reference */}
        {pods.map(({ t, px, py, ex, ey, mag, col, homeTick, needle, atHome }) => (
          <g key={t.id}>
            {mag > 0.02 && <line x1={px} y1={py} x2={ex} y2={ey} stroke={col} strokeWidth={1.5 + mag * 3} strokeLinecap="round" markerEnd="url(#thr-arrow)" />}
            {/* home tick — the pod's 0°: straight out from center mass */}
            <line x1={homeTick.x1} y1={homeTick.y1} x2={homeTick.x2} y2={homeTick.y2} stroke={atHome ? "#4ade80" : "rgba(148,163,184,0.7)"} strokeWidth={1.5} strokeLinecap="round" />
            {/* pointing needle — reported pod azimuth; green = parked at home, amber = off home */}
            <line x1={px} y1={py} x2={needle.x2} y2={needle.y2} stroke={atHome ? "#4ade80" : "#f59e0b"} strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={px} cy={py} r={7} fill="#0a0f1e" stroke={t.faulted ? "#ef4444" : atHome ? "#4ade80" : col} strokeWidth={1.5} />
            <text x={px} y={py + 2.5} fontSize="6.5" fill={col} textAnchor="middle">{t.label}</text>
          </g>
        ))}

        {/* central tower hub with sensor cluster (camera/radar/lidar) */}
        <circle cx={C} cy={C} r={14} fill="#0a0f1e" stroke="rgba(34,211,238,0.4)" strokeWidth={1.2} />
        <rect x={C - 3} y={C - 8} width={6} height={5} rx={1} fill="#67e8f9" />{/* Sony cam (faces bow) */}
        <circle cx={C - 4} cy={C + 3} r={1.6} fill="#94a3b8" />{/* MEMS mic */}
        <circle cx={C + 4} cy={C + 3} r={1.6} fill="#94a3b8" />{/* laser/IR */}
        <circle cx={C} cy={C} r={2.2} fill="none" stroke="#a78bfa" strokeWidth={1} />{/* lidar dome */}

        {/* commanded translation vector */}
        {magnitude > 0.02 && <line x1={C} y1={C} x2={thumb.x} y2={thumb.y} stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />}

        {/* thumb knob */}
        <circle cx={thumb.x} cy={thumb.y} r={dragging ? 13 : 11} fill="rgba(245,158,11,0.18)" stroke="#f59e0b" strokeWidth={2} />
        <circle cx={thumb.x} cy={thumb.y} r={3} fill="#f59e0b" />
      </svg>

      <div className="mt-1 flex items-center justify-center gap-3 text-[10px]">
        <span className="text-slate-400">Hdg <span className="font-mono text-cyan-300">{Math.round(headingNorm)}°</span></span>
        <span className="text-slate-400">Thr <span className="font-mono text-cyan-300">{Math.round(magnitude * 100)}%</span></span>
        <span className="text-slate-500">{dragging ? "manual" : "neutral"}</span>
      </div>
    </div>
  );
}
