"use client";

/**
 * ScopePPI — reusable plan-position-indicator canvas for the lidar / radar /
 * BlueSight scopes. Draws range rings, a rotating sweep, and live contacts.
 * Contacts come ONLY from telemetry (no fabricated returns); the sweep line is
 * display chrome. When `active` is false it renders an empty scope.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CONTACT_COLOR, type SensorContact } from "@/lib/psathyrella/contract";

type Variant = "lidar" | "radar" | "fusion";

const VARIANT: Record<Variant, { grid: string; sweep: string; sweepFill: string; text: string }> = {
  lidar: { grid: "rgba(34,211,238,0.22)", sweep: "rgba(34,211,238,0.6)", sweepFill: "rgba(34,211,238,0.10)", text: "rgba(125,211,252,0.75)" },
  radar: { grid: "rgba(74,222,128,0.20)", sweep: "rgba(74,222,128,0.65)", sweepFill: "rgba(74,222,128,0.10)", text: "rgba(134,239,172,0.8)" },
  fusion: { grid: "rgba(56,189,248,0.20)", sweep: "rgba(56,189,248,0.55)", sweepFill: "rgba(56,189,248,0.09)", text: "rgba(125,211,252,0.8)" },
};

interface ScopePPIProps {
  contacts: SensorContact[];
  maxRangeM: number;
  active: boolean;
  headingDeg: number | null;
  variant: Variant;
  sweep?: boolean;
  className?: string;
}

export function ScopePPI({ contacts, maxRangeM, active, headingDeg, variant, sweep = true, className }: ScopePPIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef({ contacts, maxRangeM, active, headingDeg, variant, sweep });
  dataRef.current = { contacts, maxRangeM, active, headingDeg, variant, sweep };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let sweepAngle = 0;

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

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.max(20, Math.min(w, h) / 2 - 16);
      const st = dataRef.current;
      const pal = VARIANT[st.variant];

      ctx.clearRect(0, 0, w, h);

      // range rings + labels
      ctx.lineWidth = 1;
      ctx.strokeStyle = pal.grid;
      ctx.fillStyle = pal.text;
      ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
      ctx.textAlign = "left";
      const rings = 4;
      for (let i = 1; i <= rings; i++) {
        const r = (radius * i) / rings;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        const range = (st.maxRangeM * i) / rings;
        const lbl = st.maxRangeM >= 1000 ? `${(range / 1000).toFixed(1)}km` : `${Math.round(range)}m`;
        ctx.fillText(lbl, cx + 3, cy - r + 11);
      }

      // spokes
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();

      // North marker
      ctx.fillStyle = pal.text;
      ctx.font = "bold 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("N", cx, cy - radius - 4);
      ctx.textAlign = "left";

      if (st.active) {
        if (st.sweep) {
          sweepAngle = (sweepAngle + 1.4) % 360;
          const a = (sweepAngle - 90) * (Math.PI / 180);
          // leading wedge
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, (sweepAngle - 90 - 36) * (Math.PI / 180), (sweepAngle - 90) * (Math.PI / 180));
          ctx.closePath();
          ctx.fillStyle = pal.sweepFill;
          ctx.fill();
          // sweep line
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
          ctx.strokeStyle = pal.sweep;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        for (const c of st.contacts) {
          const rr = Math.min(1, c.rangeM / st.maxRangeM) * radius;
          const ang = (c.bearingDeg - 90) * (Math.PI / 180);
          const x = cx + Math.cos(ang) * rr;
          const y = cy + Math.sin(ang) * rr;
          const col = CONTACT_COLOR[c.kind] || "#94a3b8";
          const size = 2.5 + Math.max(0, Math.min(1, c.strength)) * 4;
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.arc(x, y, size + 3, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // center buoy
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={cn("h-full w-full", className)} />;
}
