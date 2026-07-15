"use client";

/**
 * SIM startup sequence card — plays when SIMULATION mode is toggled on, mirroring the real
 * buoy's boot order (12V bus → PCA9685 @0x60 → ESC arming → trims/home → radios → GPS → SAFE).
 * Pure presentational: parent owns the clock and passes elapsed ms; the card renders completed
 * steps with green ticks, the active step with a pulse, and auto-hides after the sequence
 * (parent stops rendering it). Positioned top-center of the map area — a sibling of the
 * memoized MapView (its re-renders never touch the map).
 */

import { CheckCircle2, Loader2, Power } from "lucide-react";
import { SIM_BOOT_SEQUENCE, SIM_BOOT_TOTAL_MS } from "@/lib/psathyrella/simPhysics";

export function SimBootOverlay({ elapsedMs }: { elapsedMs: number }) {
  const done = elapsedMs >= SIM_BOOT_TOTAL_MS;
  return (
    <div className="psa-glass pointer-events-none absolute left-1/2 top-14 z-30 w-72 -translate-x-1/2 rounded-xl border border-amber-500/30 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Power className={`h-4 w-4 ${done ? "text-green-400" : "text-amber-300"}`} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
          Simulation · vessel startup
        </span>
      </div>
      <div className="space-y-1">
        {SIM_BOOT_SEQUENCE.map((step, i) => {
          const started = elapsedMs >= step.atMs;
          const next = SIM_BOOT_SEQUENCE[i + 1];
          const completed = elapsedMs >= (next ? next.atMs : SIM_BOOT_TOTAL_MS);
          if (!started) return null;
          return (
            <div key={step.atMs} className="flex items-center gap-1.5">
              {completed ? (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />
              ) : (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-amber-300" />
              )}
              <span className={`text-[10px] ${completed ? "text-slate-300" : "text-amber-100"}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
      {done && <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-green-300">Ready — ARM to maneuver · drop waypoints to navigate</div>}
    </div>
  );
}
