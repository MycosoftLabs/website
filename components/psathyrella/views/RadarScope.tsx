"use client";

/**
 * RadarScope — OpenCPN radar_pi-style marine radar PPI.
 *
 * Layers the upgraded ScopePPI (range rings, persistence sweep, blip tracks,
 * guard-zone arc, sea/rain clutter) with an interactive EBL (electronic bearing
 * line) + VRM (variable range marker): hover the scope to park the cursor on a
 * bearing/range, and read it out in nmi + degrees magnetic. US-customary units.
 *
 * Contacts come STRICTLY from telemetry. The EBL/VRM cursor + chrome are display
 * only. No fabricated returns.
 */

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { NoFeed, ViewBadge } from "@/components/psathyrella/ui";
import { ScopePPI } from "./ScopePPI";

const M_PER_NMI = 1852;
const M_PER_YD = 0.9144;

interface Cursor {
  bearingDeg: number;
  rangeM: number;
}

export default function RadarScope({ telemetry, className }: { telemetry: BuoyTelemetry; className?: string }) {
  const f = telemetry.radar;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<Cursor | null>(null);

  // Nearest live contact gives a default ranged target readout when not hovering.
  const nearest = useMemo(() => {
    if (!f.contacts.length) return null;
    return f.contacts.reduce((a, b) => (b.rangeM < a.rangeM ? b : a));
  }, [f.contacts]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.max(20, Math.min(rect.width, rect.height) / 2 - 16);
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) {
      setCursor(null);
      return;
    }
    // screen angle -> compass bearing (0=N, CW)
    let bearing = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    bearing = ((bearing % 360) + 360) % 360;
    const rangeM = (dist / radius) * f.maxRangeM;
    setCursor({ bearingDeg: bearing, rangeM });
  };

  // Active readout: cursor if hovering, else nearest contact.
  const readout = cursor
    ? { bearingDeg: cursor.bearingDeg, rangeM: cursor.rangeM, label: "EBL/VRM" }
    : nearest
      ? { bearingDeg: nearest.bearingDeg, rangeM: nearest.rangeM, label: nearest.label || nearest.kind }
      : null;

  const nmi = readout ? readout.rangeM / M_PER_NMI : null;
  const yds = readout ? readout.rangeM / M_PER_YD : null;

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-full w-full bg-[#060912]", className)}
      onPointerMove={onMove}
      onPointerLeave={() => setCursor(null)}
    >
      <ViewBadge>Radar · {(f.maxRangeM / M_PER_NMI).toFixed(1)} nmi · {f.contacts.length} trk</ViewBadge>

      <ScopePPI
        contacts={f.contacts}
        maxRangeM={f.maxRangeM}
        active={f.active}
        headingDeg={telemetry.pose.headingDeg}
        variant="radar"
        sweepDeg={f.sweepDeg}
        eblDeg={cursor?.bearingDeg ?? null}
        vrmRangeM={cursor?.rangeM ?? null}
      />

      {/* EBL / VRM readout — US customary (nmi + yards + degrees) */}
      {f.active && readout && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-amber-500/30 bg-black/55 px-2.5 py-1.5 font-mono text-[10px] leading-tight text-amber-200/90">
          <div className="mb-0.5 text-[9px] uppercase tracking-[0.15em] text-amber-400/70">{readout.label}</div>
          <div className="flex gap-3 tabular-nums">
            <span>BRG {readout.bearingDeg.toFixed(0).padStart(3, "0")}°M</span>
            <span>RNG {nmi !== null ? nmi.toFixed(2) : "—"} nmi</span>
          </div>
          <div className="text-[9px] tabular-nums text-amber-300/60">{yds !== null ? `${Math.round(yds)} yd` : "—"}</div>
        </div>
      )}

      {/* range / heading chrome readout — US customary */}
      {f.active && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-green-500/20 bg-black/50 px-2 py-1 font-mono text-[9px] leading-tight text-green-200/80 tabular-nums">
          <div>RANGE {(f.maxRangeM / M_PER_NMI).toFixed(1)} nmi</div>
          <div>HDG {telemetry.pose.headingDeg !== null ? `${Math.round(telemetry.pose.headingDeg).toString().padStart(3, "0")}°` : "—"}</div>
        </div>
      )}

      {!f.active && <NoFeed label="No Radar Feed" sub="marine radar — awaiting backend" />}
    </div>
  );
}
