"use client";

/**
 * SINE widget — a tiny operator view of the full SINE acoustic-ID system, under Eagle Eye.
 * Shows WHAT the buoy is hearing, grouped by the sensor that heard it so the operator can
 * instantly tell ABOVE vs BELOW water:
 *   🌊 Below water  = HYDROPHONE   (domain "water")
 *   🎙️ Above water  = MEMS mics    (domain "air")
 *   〰️ Seismic      = geophone     (domain "ground")
 * Each detection = class emoji + label + confidence. Multiple simultaneous detections show
 * as separate rows (with ×count when the same class repeats). Honest STANDBY when idle —
 * never faked.
 */

import { Ear } from "lucide-react";
import { StatLED, Bar } from "@/components/psathyrella/ui";
import { SINE_DOMAIN_META, describeSineTarget, type SineDetection, type SineDomain } from "@/lib/psathyrella/sineClasses";

const DOMAIN_ORDER: SineDomain[] = ["water", "air", "ground"];
const MAX_PER_DOMAIN = 2;

function confTone(c: number): "green" | "amber" | "red" {
  return c >= 0.75 ? "green" : c >= 0.5 ? "amber" : "red";
}

export function SineWidget({ detections, live }: { detections: SineDetection[]; live: boolean }) {
  const groups = DOMAIN_ORDER.map((domain) => ({
    domain,
    items: detections
      .filter((d) => d.domain === domain)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_PER_DOMAIN),
    total: detections.filter((d) => d.domain === domain).length,
  })).filter((g) => g.items.length > 0);

  return (
    <div className="rounded-lg border border-cyan-500/15 bg-white/[0.02] p-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-cyan-400/60">
          <Ear className="h-2.5 w-2.5" /> SINE · Acoustic ID
        </div>
        <StatLED color={live ? "green" : "slate"} pulse={live && detections.length > 0} />
      </div>

      {groups.length === 0 ? (
        // Honest idle — both sensors shown so the operator knows the capability is present.
        <div className="flex items-center justify-center gap-2 py-1">
          {(["water", "air"] as SineDomain[]).map((d) => (
            <span key={d} className="flex items-center gap-1 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-slate-500">
              <span>{SINE_DOMAIN_META[d].emoji}</span>{SINE_DOMAIN_META[d].sensor}
            </span>
          ))}
          <span className="text-[9px] uppercase tracking-wide text-slate-600">{live ? "listening" : "standby"}</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {groups.map((g) => {
            const meta = SINE_DOMAIN_META[g.domain];
            return (
              <div key={g.domain}>
                <div className="mb-0.5 flex items-center gap-1 text-[8px] uppercase tracking-wide" style={{ color: meta.tone }}>
                  <span>{meta.emoji}</span>{meta.label} · {meta.sensor}
                  {g.total > g.items.length && <span className="text-slate-600">+{g.total - g.items.length}</span>}
                </div>
                {g.items.map((d) => {
                  const c = describeSineTarget(d.target);
                  return (
                    <div key={d.id} className="flex items-center gap-1.5">
                      <span className="text-[12px] leading-none">{c.emoji}</span>
                      <span className="w-20 shrink-0 truncate text-[10px] text-slate-200">
                        {c.label}{d.count && d.count > 1 ? <span className="text-slate-500"> ×{d.count}</span> : null}
                      </span>
                      <div className="min-w-0 flex-1"><Bar value={d.confidence} color={confTone(d.confidence)} /></div>
                      <span className="w-7 shrink-0 text-right font-mono text-[10px] text-slate-300">{Math.round(d.confidence * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
