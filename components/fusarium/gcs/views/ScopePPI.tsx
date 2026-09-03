"use client";

/**
 * ScopePPI — marine-grade plan-position-indicator canvas for the radar / lidar /
 * BlueSight scopes. Draws range rings, a rotating sweep with afterglow, and live
 * contacts. Per `variant` it layers on instrument chrome:
 *   - radar  (OpenCPN radar_pi style): nmi range rings, sweep persistence trail,
 *            blip history tracks, EBL + VRM cursor.
 *   - lidar  (Ouster style): dense 360° returns, intensity-by-strength color
 *            (near = hot), near-field collision-proximity emphasis ring, metric
 *            range rings labelled in m / ft.
 *   - fusion (BlueSight): the legacy combined view.
 *
 * FRAME: BOW-UP. `SensorContact.bearingDeg` is bow-relative by contract
 * (contract.ts:255), so relative bearing 000 points straight up the screen —
 * the same convention FusionPlot documents at its `ang()` helper. This scope
 * previously drew those bow-relative bearings under NORTH-UP chrome (fixed
 * N/E/S/W labels + a heading spoke at `headingDeg - 90`), which displaced every
 * contact by exactly -headingDeg and disagreed with FusionPlot and MapView about
 * the same contact on the same console. It is bow-up now because the buoy has no
 * working compass (BMM150 reports headingDeg:null): rotating contacts into
 * north-up would blank both scopes whenever the heading is unknown, and a scope
 * must not go dark because a *different* sensor is missing.
 *
 * Contacts come ONLY from telemetry (no fabricated returns); the sweep, EBL/VRM
 * and rings are display chrome. Nothing synthetic is painted inside the return
 * field — a previous version scattered a "sea/rain clutter" texture near center
 * and drew a fixed ±35° "guard zone" sector that no code ever armed; both read as
 * products of a sensor that reported nothing, and both were deleted. When
 * `active` is false it renders an empty scope. The rAF loop is cleaned up on
 * unmount and paused when the tab is hidden so it never leaks.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CONTACT_COLOR, type SensorContact } from "@/lib/fusarium/gcs/contract";

type Variant = "lidar" | "radar" | "fusion";

const M_PER_NMI = 1852;

const VARIANT: Record<
  Variant,
  { grid: string; sweep: string; sweepFill: string; text: string; blip: string }
> = {
  lidar: {
    grid: "rgba(34,211,238,0.22)",
    sweep: "rgba(34,211,238,0.6)",
    sweepFill: "rgba(34,211,238,0.10)",
    text: "rgba(125,211,252,0.75)",
    blip: "rgba(34,211,238,0.9)",
  },
  radar: {
    grid: "rgba(74,222,128,0.20)",
    sweep: "rgba(74,222,128,0.65)",
    sweepFill: "rgba(74,222,128,0.10)",
    text: "rgba(134,239,172,0.8)",
    blip: "rgba(74,222,128,0.95)",
  },
  fusion: {
    grid: "rgba(56,189,248,0.20)",
    sweep: "rgba(56,189,248,0.55)",
    sweepFill: "rgba(56,189,248,0.09)",
    text: "rgba(125,211,252,0.8)",
    blip: "rgba(56,189,248,0.9)",
  },
};

interface ScopePPIProps {
  contacts: SensorContact[];
  maxRangeM: number;
  active: boolean;
  /**
   * True bow heading (0 = true north), or null when no compass fix exists. On a
   * bow-up scope this positions the TRUE-NORTH tick only — it never moves a
   * contact, so a null heading costs the reference mark, not the picture.
   */
  headingDeg: number | null;
  variant: Variant;
  sweep?: boolean;
  /** Optional sweep angle in degrees from telemetry; falls back to internal spin. */
  sweepDeg?: number | null;
  /**
   * Radar: electronic-bearing-line angle (deg, 0 = BOW — the scope is bow-up).
   * Drawn as a cursor spoke. Callers derive this from the screen angle, so it is
   * a relative bearing; it is NOT a compass bearing and must not be labelled °M.
   */
  eblDeg?: number | null;
  /** Radar: variable-range-marker radius in meters. Drawn as a highlighted ring. */
  vrmRangeM?: number | null;
  className?: string;
}

/** A single afterglow/track sample for one contact. */
interface Track {
  x: number;
  y: number;
  bornMs: number;
}

export function ScopePPI({
  contacts,
  maxRangeM,
  active,
  headingDeg,
  variant,
  sweep = true,
  sweepDeg = null,
  eblDeg = null,
  vrmRangeM = null,
  className,
}: ScopePPIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef({ contacts, maxRangeM, active, headingDeg, variant, sweep, sweepDeg, eblDeg, vrmRangeM });
  dataRef.current = { contacts, maxRangeM, active, headingDeg, variant, sweep, sweepDeg, eblDeg, vrmRangeM };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let sweepAngle = 0;
    let lastTs = 0;
    // Per-contact blip history trails (radar tracks).
    const trails = new Map<string, Track[]>();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const rangeLabel = (rangeM: number, v: Variant) => {
      if (v === "radar") {
        const nmi = rangeM / M_PER_NMI;
        return nmi >= 1 ? `${nmi.toFixed(1)} nmi` : `${(nmi * 10).toFixed(1)}×10⁻¹`;
      }
      // lidar / fusion: metric with feet hint
      if (rangeM >= 1000) return `${(rangeM / 1000).toFixed(1)} km`;
      return `${Math.round(rangeM)} m`;
    };

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      // Pause work (but stay scheduled cheaply) when tab hidden.
      if (typeof document !== "undefined" && document.hidden) {
        lastTs = ts;
        return;
      }
      const dt = lastTs ? Math.min(64, ts - lastTs) : 16;
      lastTs = ts;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.max(20, Math.min(w, h) / 2 - 16);
      const st = dataRef.current;
      const pal = VARIANT[st.variant];
      const isRadar = st.variant === "radar";
      const isLidar = st.variant === "lidar";

      ctx.clearRect(0, 0, w, h);

      // NOTE: a synthetic "sea/rain clutter" speckle field used to be painted here
      // whenever the radar was active. On a marine PPI, speckle around own ship IS
      // the visual signature of real close-in returns, and it was drawn from a loop
      // counter, not from any channel — so an idle radar reporting zero contacts
      // still showed the operator a sea state. Nothing goes inside the return field
      // that is not a return. If clutter is ever wanted it must come from a real
      // clutter/STC channel in the radar feed.

      // ── range rings + labels ────────────────────────────────────────────────
      ctx.lineWidth = 1;
      ctx.strokeStyle = pal.grid;
      ctx.fillStyle = pal.text;
      ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
      ctx.textAlign = "left";
      const rings = isRadar ? 4 : isLidar ? 5 : 4;
      for (let i = 1; i <= rings; i++) {
        const r = (radius * i) / rings;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        const range = (st.maxRangeM * i) / rings;
        ctx.fillText(rangeLabel(range, st.variant), cx + 3, cy - r + 11);
      }

      // ── graticule spokes (relative-bearing rose, not a compass rose) ────────
      ctx.strokeStyle = pal.grid;
      if (isLidar) {
        // denser 30° graticule for the high-res lidar scope
        ctx.beginPath();
        for (let deg = 0; deg < 360; deg += 30) {
          const a = (deg - 90) * (Math.PI / 180);
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        }
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy);
        ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx, cy + radius);
        ctx.stroke();
      }

      // ── relative-bearing markers ────────────────────────────────────────────
      // Bow-up, so these are RELATIVE bearings, not compass points. They used to
      // read N/E/S/W over bow-relative contacts, which asserted a true-north frame
      // the scope was never drawing in.
      ctx.fillStyle = pal.text;
      ctx.font = "bold 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("BOW 000", cx, cy - radius - 4);
      ctx.font = "9px ui-monospace, monospace";
      ctx.globalAlpha = 0.7;
      ctx.fillText("090", cx + radius + 7, cy + 3);
      ctx.fillText("180", cx, cy + radius + 11);
      ctx.fillText("270", cx - radius - 7, cy + 3);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";

      // NOTE: a fixed ±35° dashed amber "guard zone" sector used to be drawn here.
      // A guard sector on a PPI means an armed alarm zone, and nothing in this
      // codebase ever set, armed, or tested one — grep for guardZone finds only the
      // drawing calls. Decorative alarm chrome is a claim about vehicle state, so it
      // was deleted. A real guard zone needs sector bounds, an armed flag, an entry
      // test that raises an alarm, and an explicit ARMED/DISARMED label.

      if (st.active) {
        // ── rotating sweep with afterglow persistence ─────────────────────────
        if (st.sweep) {
          // honor a telemetry-driven sweep angle when present; else free-spin
          if (st.sweepDeg !== null && st.sweepDeg !== undefined) {
            sweepAngle = st.sweepDeg;
          } else {
            const rate = isLidar ? 2.6 : isRadar ? 1.5 : 1.4; // deg per ~16ms frame
            sweepAngle = (sweepAngle + rate * (dt / 16)) % 360;
          }
          const a = (sweepAngle - 90) * (Math.PI / 180);
          // afterglow wedge — a longer fading trail for radar, tight for lidar
          const trailDeg = isLidar ? 22 : isRadar ? 64 : 36;
          const steps = 7;
          for (let s = 0; s < steps; s++) {
            const a0 = (sweepAngle - 90 - (trailDeg * (s + 1)) / steps) * (Math.PI / 180);
            const a1 = (sweepAngle - 90 - (trailDeg * s) / steps) * (Math.PI / 180);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, a0, a1);
            ctx.closePath();
            ctx.globalAlpha = (1 - s / steps) * 0.16;
            ctx.fillStyle = pal.sweep;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          // bright leading line
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
          ctx.strokeStyle = pal.sweep;
          ctx.lineWidth = isLidar ? 1 : 1.6;
          ctx.stroke();
        }

        // ── near-field collision-proximity ring (lidar) ───────────────────────
        if (isLidar) {
          const nearR = radius * 0.22;
          ctx.beginPath();
          ctx.arc(cx, cy, nearR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(248,113,113,0.45)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // ── contacts (STRICTLY from telemetry) ────────────────────────────────
        const now = ts;
        const liveIds = new Set<string>();
        for (const c of st.contacts) {
          liveIds.add(c.id);
          const rr = Math.min(1, c.rangeM / st.maxRangeM) * radius;
          // Bow-up: `bearingDeg` is bow-relative by contract, so no heading term
          // belongs here. Adding one would also silently drop every contact the
          // moment the compass goes null, which is its permanent state today.
          const ang = (c.bearingDeg - 90) * (Math.PI / 180);
          const x = cx + Math.cos(ang) * rr;
          const y = cy + Math.sin(ang) * rr;

          // history track (radar/fusion) — short fading breadcrumb trail
          if (!isLidar) {
            let tr = trails.get(c.id);
            if (!tr) {
              tr = [];
              trails.set(c.id, tr);
            }
            const last = tr[tr.length - 1];
            if (!last || Math.hypot(last.x - x, last.y - y) > 1.5) {
              tr.push({ x, y, bornMs: now });
              if (tr.length > 8) tr.shift();
            }
            for (let i = 0; i < tr.length; i++) {
              const pt = tr[i];
              const age = (now - pt.bornMs) / 1800;
              if (age >= 1) continue;
              ctx.globalAlpha = (1 - age) * 0.4 * ((i + 1) / tr.length);
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2);
              ctx.fillStyle = pal.blip;
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }

          const baseCol = CONTACT_COLOR[c.kind] || "#94a3b8";
          const strength = Math.max(0, Math.min(1, c.strength));

          if (isLidar) {
            // Ouster-style intensity: hot near, cool far; size by strength
            const t = 1 - Math.min(1, c.rangeM / st.maxRangeM); // 1 = near
            const col = lidarIntensityColor(t, strength);
            const size = 1.4 + strength * 2.6;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = col;
            ctx.fill();
            ctx.globalAlpha = 1;
          } else {
            const size = 2.5 + strength * 4;
            // soft halo
            ctx.globalAlpha = 0.22;
            ctx.beginPath();
            ctx.arc(x, y, size + 3, 0, Math.PI * 2);
            ctx.fillStyle = baseCol;
            ctx.fill();
            // core blip
            ctx.globalAlpha = 0.95;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = baseCol;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
        // prune trails for contacts no longer present
        for (const id of Array.from(trails.keys())) {
          if (!liveIds.has(id)) {
            const tr = trails.get(id)!;
            if (tr.length === 0 || now - tr[tr.length - 1].bornMs > 2000) trails.delete(id);
          }
        }

        // ── VRM (variable range marker) — highlighted ring (radar) ────────────
        if (isRadar && st.vrmRangeM !== null && st.vrmRangeM !== undefined && st.vrmRangeM > 0) {
          const vr = Math.min(1, st.vrmRangeM / st.maxRangeM) * radius;
          ctx.beginPath();
          ctx.arc(cx, cy, vr, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(250,204,21,0.75)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // ── EBL (electronic bearing line) — cursor spoke (radar) ──────────────
        if (isRadar && st.eblDeg !== null && st.eblDeg !== undefined) {
          const ea = (st.eblDeg - 90) * (Math.PI / 180);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ea) * radius, cy + Math.sin(ea) * radius);
          ctx.strokeStyle = "rgba(250,204,21,0.8)";
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ── true-north tick ─────────────────────────────────────────────────────
      // The bow is permanently straight up now, so a separate heading spoke would be
      // redundant; what the operator cannot otherwise recover is where TRUE north
      // lies. Drawn ONLY when the heading is actually known — with no compass fix
      // there is no true bearing, and a tick would assert a reference the buoy does
      // not have. (Same rule as FusionPlot's N tick.)
      if (st.headingDeg !== null && st.headingDeg !== undefined && Number.isFinite(st.headingDeg)) {
        const northRel = ((-st.headingDeg % 360) + 360) % 360;
        const na = (northRel - 90) * (Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(na) * (radius - 8), cy + Math.sin(na) * (radius - 8));
        ctx.lineTo(cx + Math.cos(na) * radius, cy + Math.sin(na) * radius);
        ctx.strokeStyle = "rgba(226,232,240,0.65)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = "rgba(226,232,240,0.75)";
        ctx.font = "9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("N", cx + Math.cos(na) * (radius + 10), cy + Math.sin(na) * (radius + 10) + 3);
        ctx.textAlign = "left";
      }

      // ── center buoy ─────────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      trails.clear();
    };
  }, []);

  return <canvas ref={canvasRef} className={cn("h-full w-full", className)} />;
}

/** Ouster-style intensity ramp: near/strong = hot (white→amber), far = cool cyan. */
function lidarIntensityColor(near: number, strength: number): string {
  const t = Math.max(0, Math.min(1, near * 0.6 + strength * 0.4));
  // cyan (cool, far) -> green -> amber -> white-hot (near, strong)
  if (t < 0.4) {
    const k = t / 0.4;
    return `rgb(${Math.round(34 + k * 40)},${Math.round(211 + k * 11)},${Math.round(238 - k * 78)})`;
  }
  if (t < 0.75) {
    const k = (t - 0.4) / 0.35;
    return `rgb(${Math.round(74 + k * 176)},${Math.round(222 - k * 18)},${Math.round(160 - k * 100)})`;
  }
  const k = (t - 0.75) / 0.25;
  return `rgb(${Math.round(250 + k * 5)},${Math.round(204 + k * 51)},${Math.round(60 + k * 195)})`;
}
