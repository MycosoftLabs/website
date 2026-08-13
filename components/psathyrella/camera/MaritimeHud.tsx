"use client";

/**
 * MARITIME CONNING HUD — overlays the bow optic (IMX477 Target) with the instruments you actually
 * steer by: a heading tape, contact bearing markers on that tape, and a COLREGs right-of-way card.
 *
 * WHY IT LIVES ON THIS CAMERA: the Target optic looks straight down the bow. That makes it the
 * conning view — the one place where "what I can see" and "where the boat is pointed" are the same
 * direction, which is the whole premise of a head-up display. The 360° ring answers *what is around
 * us*; this answers *what am I steering into*.
 *
 * ══ THE HONESTY RULES THIS COMPONENT ENFORCES ═════════════════════════════════════════════════════
 *
 * 1. NO HEADING, NO TAPE. Every mark on a heading tape is a claim about true direction. With
 *    `headingDeg === null` the tape renders a disabled state saying so, rather than defaulting to
 *    000° — a tape silently centred on north while the bow points elsewhere puts every contact on
 *    the wrong bearing, and looks exactly like a working instrument.
 *
 * 2. RIGHT-OF-WAY IS ADVISORY, ALWAYS. COLREGs conclusions here are inferred from a DETECTOR's view
 *    of nav lights — a mis-coloured blob, a shore light, or a reflection all arrive looking like a
 *    sidelight. The card states the rule it rests on and its confidence, and never renders as an
 *    instruction. Rule 2 (responsibility) is not something a camera can discharge.
 *
 * 3. BEARING-ONLY CONTACTS GET A TICK, NOT A RANGE. The camera measures direction and nothing else.
 *    Markers sit on the tape at their bearing with no distance implied.
 */

import { useMemo, type JSX } from "react";
import { cn } from "@/lib/utils";
import { inferAspect, inferVesselType, isClosing, type NavLight, type AspectResult } from "@/lib/psathyrella/colregs";

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

/** Smallest signed difference b - a, in [-180, 180). */
function delta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

export interface HudContact {
  id: string;
  label: string;
  /** True bearing, degrees. Null when heading is unknown — such a contact cannot be placed. */
  bearingTrueDeg: number | null;
  /** Bearing relative to the bow, degrees. Always available from pixels. */
  bearingRelDeg: number | null;
  group?: string;
  conf?: number | null;
  /** Nav lights detected on this contact, if any — drives the COLREGs card. */
  lights?: NavLight[];
}

/** Degrees of heading visible across the tape. 90° reads naturally at this width. */
const TAPE_SPAN_DEG = 90;

function cardinal(deg: number): string | null {
  const d = norm360(deg);
  if (d === 0) return "N";
  if (d === 90) return "E";
  if (d === 180) return "S";
  if (d === 270) return "W";
  return null;
}

/**
 * Heading tape — a linear compass ribbon centred on own heading.
 *
 * Chosen over a rotating rose because on a conning view the operator reads RELATIVE angle ("that
 * contact is 20° off my port bow") far more often than absolute heading, and a linear tape makes
 * that a distance on screen rather than an arc subtraction.
 */
function HeadingTape({ headingDeg, contacts }: { headingDeg: number | null; contacts: HudContact[] }): JSX.Element {
  const marks = useMemo(() => {
    if (headingDeg === null) return [];
    const hdg = norm360(headingDeg);
    const half = TAPE_SPAN_DEG / 2;
    const out: { deg: number; pct: number; major: boolean; label: string | null }[] = [];
    // Walk the visible window in 5° steps, anchored to absolute degrees so ticks do not crawl.
    const first = Math.ceil((hdg - half) / 5) * 5;
    for (let d = first; d <= hdg + half; d += 5) {
      const off = delta(hdg, d);
      if (Math.abs(off) > half) continue;
      const n = norm360(d);
      out.push({
        deg: n,
        pct: 50 + (off / TAPE_SPAN_DEG) * 100,
        major: n % 10 === 0,
        label: cardinal(n) ?? (n % 30 === 0 ? String(n).padStart(3, "0") : null),
      });
    }
    return out;
  }, [headingDeg]);

  if (headingDeg === null) {
    return (
      <div className="flex h-[34px] items-center justify-center border-b border-amber-500/30 bg-black/85">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-amber-300/90">
          heading unknown — tape disabled, bearings cannot be geo-referenced
        </span>
      </div>
    );
  }

  const hdg = norm360(headingDeg);

  return (
    <div className="relative h-[34px] overflow-hidden border-b border-cyan-400/25 bg-black/85">
      {marks.map((m) => (
        <div key={m.deg} className="absolute top-0 flex h-full flex-col items-center justify-start" style={{ left: `${m.pct}%`, transform: "translateX(-50%)" }}>
          <span className={cn("w-px", m.major ? "h-2.5 bg-cyan-300/70" : "h-1.5 bg-cyan-400/30")} />
          {m.label && (
            <span className={cn("mt-0.5 font-mono text-[8px] tabular-nums",
              cardinal(m.deg) ? "font-bold text-rose-300" : "text-cyan-300/70")}>
              {m.label}
            </span>
          )}
        </div>
      ))}

      {/* Contact bearing markers. A contact with no TRUE bearing is not placed on a true-bearing
          tape — it would be a guess dressed as a measurement. */}
      {contacts.map((c) => {
        if (c.bearingTrueDeg === null) return null;
        const off = delta(hdg, c.bearingTrueDeg);
        if (Math.abs(off) > TAPE_SPAN_DEG / 2) return null;
        return (
          <div key={c.id} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${50 + (off / TAPE_SPAN_DEG) * 100}%`, transform: "translateX(-50%)" }}
            title={`${c.label} · ${Math.round(c.bearingTrueDeg)}°T (${off > 0 ? "stbd" : "port"} ${Math.abs(Math.round(off))}°)`}>
            <span className="max-w-[70px] truncate font-mono text-[8px] uppercase text-amber-200">{c.label}</span>
            <span className="h-2.5 w-px bg-amber-400" style={{ boxShadow: "0 0 5px rgba(251,191,36,0.9)" }} />
          </div>
        );
      })}

      {/* Lubber line — own heading, dead centre. */}
      <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <span className="h-full w-px bg-rose-400/80" style={{ boxShadow: "0 0 6px rgba(251,113,133,0.8)" }} />
      </div>
      <div className="absolute left-1/2 top-0 -translate-x-1/2 border border-rose-400/50 bg-black px-1 font-mono text-[10px] font-bold tabular-nums text-rose-200">
        {Math.round(hdg).toString().padStart(3, "0")}
      </div>
    </div>
  );
}

/** Human phrasing for who gives way, derived ONLY from an aspect the engine actually resolved. */
function rightOfWay(a: AspectResult): { text: string; tone: string; rule: string } | null {
  switch (a.aspect) {
    case "approaching_head_on":
      return { text: "HEAD-ON — both alter to starboard", tone: "text-red-200 border-red-500/60 bg-red-500/20", rule: "Rule 14" };
    case "crossing_right_to_left":
      // Contact crossing right-to-left is on OUR starboard side → it is the stand-on vessel.
      return { text: "CROSSING from starboard — THEY stand on, WE give way", tone: "text-red-200 border-red-500/60 bg-red-500/20", rule: "Rule 15" };
    case "crossing_left_to_right":
      return { text: "CROSSING from port — WE stand on, keep course & speed", tone: "text-green-200 border-green-500/50 bg-green-500/15", rule: "Rule 15/17" };
    case "departing":
      return { text: "DEPARTING — opening", tone: "text-slate-300 border-white/15 bg-white/[0.04]", rule: "Rule 13 n/a" };
    default:
      return null;
  }
}

export default function MaritimeHud({
  headingDeg,
  contacts,
  selected,
  className,
}: {
  headingDeg: number | null;
  contacts: HudContact[];
  /** The locked/selected contact, if any — drives the right-of-way card. */
  selected?: HudContact | null;
  className?: string;
}): JSX.Element {
  const lights = selected?.lights ?? [];
  const aspect = useMemo(() => (lights.length > 0 ? inferAspect(lights) : null), [lights]);
  const types = useMemo(() => (lights.length > 0 ? inferVesselType(lights) : []), [lights]);
  const row = aspect ? rightOfWay(aspect) : null;
  const closing =
    aspect && headingDeg !== null && selected?.bearingTrueDeg != null
      ? isClosing(headingDeg, selected.bearingTrueDeg, aspect.aspect)
      : null;

  return (
    <div className={cn("flex flex-col", className)}>
      <HeadingTape headingDeg={headingDeg} contacts={contacts} />

      {/* COLREGs card — only when nav lights were actually resolved on the selected contact. No
          lights means no conclusion, and an empty card is the honest render of that. */}
      {selected && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-cyan-400/20 bg-black/85 px-2 py-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-300/50">LOCKED</span>
          <span className="max-w-[140px] truncate font-mono text-[10px] uppercase text-cyan-100">{selected.label}</span>
          {selected.bearingTrueDeg != null ? (
            <span className="font-mono text-[10px] tabular-nums text-cyan-200">{Math.round(selected.bearingTrueDeg)}°T</span>
          ) : selected.bearingRelDeg != null ? (
            <span className="font-mono text-[10px] tabular-nums text-amber-300" title="Relative to the bow — no true bearing without a heading fix">
              {Math.round(selected.bearingRelDeg)}° rel
            </span>
          ) : null}
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500" title="The camera measures direction only — it cannot measure range">
            range unknown
          </span>

          {!aspect ? (
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
              no nav lights resolved — aspect undetermined
            </span>
          ) : (
            <>
              {row && (
                <span className={cn("skew-x-[-12deg] border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider", row.tone)}>
                  <span className="inline-block skew-x-[12deg]">{row.text} · {row.rule}</span>
                </span>
              )}
              <span className="font-mono text-[9px] text-slate-500" title={aspect.rationale}>
                {aspect.basis} · {Math.round(aspect.confidence * 100)}%
              </span>
              {closing === true && (
                <span className="skew-x-[-12deg] border border-amber-400/60 bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-100">
                  <span className="inline-block skew-x-[12deg]">CLOSING</span>
                </span>
              )}
              {types.length > 0 && (
                <span className="font-mono text-[9px] uppercase text-slate-400" title={types.map((t) => `${t.label} (${t.rule}) — ${t.note}`).join(" · ")}>
                  {types[0].label}
                </span>
              )}
              {/* Never let an inferred aspect read as an instruction. */}
              {aspect.verifyVisually && (
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300">verify visually</span>
              )}
            </>
          )}
          <span className="ml-auto font-mono text-[8px] uppercase tracking-wider text-slate-600">
            advisory · inferred from optics · Rule 2 applies
          </span>
        </div>
      )}
    </div>
  );
}
