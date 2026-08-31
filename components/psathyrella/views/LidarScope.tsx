"use client";

/**
 * LidarScope — Ouster-style 360° lidar PPI.
 *
 * Uses the upgraded ScopePPI in "lidar" mode: dense 360° returns colored by
 * intensity (near/strong = hot white→amber, far = cool cyan), a fast high-res
 * sweep, and a near-field collision-proximity emphasis ring. Range rings are
 * metric with a feet readout (US customary).
 *
 * Contacts come STRICTLY from telemetry. The sweep, graticule and proximity ring
 * are display chrome. No fabricated returns.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { NoFeed, ViewBadge } from "@/components/psathyrella/ui";
import { ScopePPI } from "./ScopePPI";

const M_PER_FT = 0.3048;

export default function LidarScope({ telemetry, className }: { telemetry: BuoyTelemetry; className?: string }) {
  const f = telemetry.lidar;

  // Nearest return = collision proximity (Ouster near-field emphasis).
  const nearest = useMemo(() => {
    if (!f.contacts.length) return null;
    return f.contacts.reduce((a, b) => (b.rangeM < a.rangeM ? b : a));
  }, [f.contacts]);

  const nearM = nearest ? nearest.rangeM : null;
  const nearFt = nearM !== null ? nearM / M_PER_FT : null;
  // Proximity status: red under 5 m, amber under 15 m.
  const proxStatus = nearM === null ? "idle" : nearM < 5 ? "crit" : nearM < 15 ? "warn" : "ok";
  const proxColor =
    proxStatus === "crit"
      ? "border-red-500/50 text-red-300"
      : proxStatus === "warn"
        ? "border-amber-500/40 text-amber-300"
        : "border-cyan-500/30 text-cyan-200";

  return (
    <div className={cn("relative h-full w-full bg-[#060912]", className)}>
      <ViewBadge>Lidar · 360° · {f.maxRangeM} m / {Math.round(f.maxRangeM / M_PER_FT)} ft · {f.contacts.length} pts</ViewBadge>

      <ScopePPI
        contacts={f.contacts}
        maxRangeM={f.maxRangeM}
        active={f.active}
        headingDeg={telemetry.pose.headingDeg}
        variant="lidar"
        sweepDeg={f.sweepDeg}
      />

      {/* Collision-proximity readout — nearest return in m + ft (US customary) */}
      {f.active && (
        <div className={cn("pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border bg-black/55 px-2.5 py-1.5 font-mono text-[10px] leading-tight tabular-nums", proxColor)}>
          <div className="mb-0.5 text-[9px] uppercase tracking-[0.15em] opacity-70">Nearest obstacle</div>
          {nearM !== null ? (
            <>
              <div className="flex gap-3">
                <span>{nearM.toFixed(1)} m</span>
                <span>{nearFt !== null ? `${Math.round(nearFt)} ft` : "—"}</span>
              </div>
              <div className="text-[9px] opacity-70">
                BRG {nearest!.bearingDeg.toFixed(0).padStart(3, "0")}° · {nearest!.label || nearest!.kind}
              </div>
            </>
          ) : (
            <div className="opacity-60">clear · no returns</div>
          )}
        </div>
      )}

      {/* range chrome — m / ft */}
      {f.active && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-cyan-500/20 bg-black/50 px-2 py-1 font-mono text-[9px] leading-tight text-cyan-200/80 tabular-nums">
          <div>RANGE {f.maxRangeM} m</div>
          <div>{Math.round(f.maxRangeM / M_PER_FT)} ft</div>
        </div>
      )}

      {!f.active && <NoFeed label="No Lidar Feed" sub="360° color lidar — awaiting backend" />}
    </div>
  );
}
