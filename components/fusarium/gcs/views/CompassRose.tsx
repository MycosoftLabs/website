"use client";

/**
 * Unified navigation compass — heading, commanded thrust vector, and the magnetometer, on ONE rose.
 *
 * Replaces the separate `VectorCompass` + `CompassRose` pair that used to stack in the nav panel.
 * Two compasses drawn one above the other cost double the vertical space to show the SAME three
 * bearings, and the combined height pushed the panel past its rail slot — which made `FitScale`
 * shrink the ENTIRE left panel to compensate. A widget must never resize its siblings.
 *
 * ══ THE RULE THIS COMPONENT ENFORCES ══════════════════════════════════════════════════════════════
 * Three things can point somewhere here, and conflating them is the whole risk:
 *
 *   1. `headingDeg` (BuoyPose)   — actual bow heading. The authority every true bearing derives from.
 *                                  SOLID WHITE needle.
 *   2. `commandedDeg`            — where propulsion was TOLD to push. An intent, not a measurement.
 *                                  CYAN needle, length scaled by commanded magnitude.
 *   3. BMM150 raw field vector   — a magnetic direction, NOT a heading. Converting µT to a compass
 *                                  bearing needs tilt compensation from an accelerometer; without it
 *                                  the value swings with pitch and roll rather than with the bow.
 *                                  Bosch's own ±2.5° figure is footnoted "a fully calibrated sensor
 *                                  and ideal tilt compensation" (BST-BMM150-DS001-05).
 *                                  DASHED AMBER OUTER TICK — never a needle reaching the centre.
 *
 * The raw magnetic direction is promoted to a real needle only when the backend reports BOTH
 * `calibrated` and `tiltCompensated`. Until then the operator can see it but is told not to steer by
 * it — which is different from, and safer than, either hiding it or dressing it as a heading.
 */

import { useMemo, type JSX } from "react";
import { cn } from "@/lib/utils";
import type { MagnetometerReading } from "@/lib/fusarium/gcs/contract";

/** Earth's total field strength, µT. Outside this band, local iron dominates and no direction holds. */
const EARTH_FIELD_MIN_UT = 25;
const EARTH_FIELD_MAX_UT = 65;

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

/** Polar → SVG cartesian, 0° = north = up, clockwise (compass convention, not maths convention). */
function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Horizontal direction of the raw field vector.
 *
 * Deliberately NOT called a heading: atan2 over two horizontal axes with no tilt term equals a
 * magnetic bearing only when the sensor is perfectly level — a condition a buoy never satisfies.
 */
function rawFieldDirectionDeg(m: MagnetometerReading): number | null {
  const v = m.microTesla;
  if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
  if (v.x === 0 && v.y === 0) return null;
  return norm360((Math.atan2(v.y, v.x) * 180) / Math.PI);
}

/** One compact readout chip. Rendered only when it has something to say — see the dynamic note below. */
function Chip({ label, value, tone, title }: { label: string; value: string; tone: string; title?: string }): JSX.Element {
  return (
    <div className="flex min-w-0 items-baseline gap-1" title={title}>
      <span className="shrink-0 text-[8px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={cn("truncate font-mono text-[10px] tabular-nums", tone)}>{value}</span>
    </div>
  );
}

export interface CompassRoseProps {
  /** Authoritative bow heading, degrees true. Null ⇒ no needle is drawn, by design. */
  headingDeg: number | null;
  /** Commanded translation heading from `propulsion.commandedVector`. Intent, not measurement. */
  commandedDeg?: number | null;
  /** Commanded magnitude 0..100, scales the cyan needle's length. */
  magnitudePct?: number | null;
  magnetometer?: MagnetometerReading | null;
  /** Drop the readout entirely — for the small map instance where the dial alone is the point. */
  compact?: boolean;
  className?: string;
}

export default function CompassRose({
  headingDeg,
  commandedDeg = null,
  magnitudePct = null,
  magnetometer,
  compact = false,
  className,
}: CompassRoseProps): JSX.Element {
  const mag = magnetometer ?? null;

  const d = useMemo(() => {
    const trustworthyMag =
      mag && mag.present && mag.calibrated && mag.tiltCompensated && mag.magneticBearingDeg !== null
        ? norm360(mag.magneticBearingDeg)
        : null;

    const magnitude =
      mag?.magnitudeUt ??
      (mag?.microTesla ? Math.sqrt(mag.microTesla.x ** 2 + mag.microTesla.y ** 2 + mag.microTesla.z ** 2) : null);

    // Outside Earth's band the vector is measuring the buoy, not the planet — thruster leads, ESCs,
    // ferrous structure. Any direction taken from it is meaningless, so this suppresses the tick.
    const fieldSane = magnitude === null ? null : magnitude >= EARTH_FIELD_MIN_UT && magnitude <= EARTH_FIELD_MAX_UT;
    const rawDir = mag && mag.present && fieldSane !== false ? rawFieldDirectionDeg(mag) : null;

    const hdg = headingDeg !== null && Number.isFinite(headingDeg) ? norm360(headingDeg) : null;
    const cmd = commandedDeg !== null && Number.isFinite(commandedDeg) ? norm360(commandedDeg) : null;
    // Smallest signed error, commanded relative to actual.
    const err = cmd !== null && hdg !== null ? ((((cmd - hdg) % 360) + 540) % 360) - 180 : null;

    return { trustworthyMag, magnitude, fieldSane, rawDir, hdg, cmd, err };
  }, [mag, headingDeg, commandedDeg]);

  const cx = 100;
  const cy = 100;
  const rOuter = 92;
  const rTick = 82;
  const rLabel = 66;

  const ticks = useMemo(() => {
    const out: { deg: number; major: boolean; cardinal: boolean }[] = [];
    for (let deg = 0; deg < 360; deg += 5) out.push({ deg, major: deg % 30 === 0, cardinal: deg % 90 === 0 });
    return out;
  }, []);

  const cmdLen = rTick * (d.cmd !== null && magnitudePct !== null ? Math.max(0.3, Math.min(1, magnitudePct / 100)) : 0.8);

  return (
    <div className={cn("flex min-w-0 flex-col items-center", className)}>
      {/* Capped and centred. The cap is what stops this widget from driving the panel's height and
          triggering FitScale on the whole left rail. */}
      <svg
        viewBox="0 0 200 200"
        className="block aspect-square w-full max-w-[124px]"
        role="img"
        aria-label={d.hdg !== null ? `Compass, heading ${Math.round(d.hdg)} degrees` : "Compass, heading unavailable"}
      >
        <circle cx={cx} cy={cy} r={rOuter} className="fill-slate-950/60 stroke-slate-700/70" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={rTick * 0.55} fill="none" className="stroke-white/[0.06]" strokeWidth={1} />

        {ticks.map(({ deg, major, cardinal }) => {
          const a = polar(cx, cy, rTick, deg);
          const b = polar(cx, cy, cardinal ? rTick - 13 : major ? rTick - 9 : rTick - 4, deg);
          return (
            <line
              key={deg}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={cardinal ? "stroke-slate-200" : major ? "stroke-slate-400/80" : "stroke-slate-600/70"}
              strokeWidth={cardinal ? 2 : major ? 1.3 : 0.7}
            />
          );
        })}

        {[
          { deg: 0, t: "N" },
          { deg: 90, t: "E" },
          { deg: 180, t: "S" },
          { deg: 270, t: "W" },
        ].map(({ deg, t }) => {
          const p = polar(cx, cy, rLabel, deg);
          return (
            <text
              key={t}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={t === "N" ? "fill-rose-300 text-[13px] font-bold" : "fill-slate-400 text-[11px] font-semibold"}
            >
              {t}
            </text>
          );
        })}

        {/* Raw magnetic direction — outer dashed tick, never a needle. Low visual weight on purpose:
            a reading to be aware of, not one to steer by. */}
        {d.rawDir !== null && d.trustworthyMag === null && (
          <line
            x1={polar(cx, cy, rTick, d.rawDir).x}
            y1={polar(cx, cy, rTick, d.rawDir).y}
            x2={polar(cx, cy, rTick - 20, d.rawDir).x}
            y2={polar(cx, cy, rTick - 20, d.rawDir).y}
            className="stroke-amber-400/70"
            strokeWidth={2}
            strokeDasharray="3 3"
          />
        )}

        {/* Tilt-compensated magnetic bearing — a real needle only once both flags are set. */}
        {d.trustworthyMag !== null && (
          <line
            x1={cx}
            y1={cy}
            x2={polar(cx, cy, rTick - 10, d.trustworthyMag).x}
            y2={polar(cx, cy, rTick - 10, d.trustworthyMag).y}
            className="stroke-amber-400"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        )}

        {/* Commanded thrust vector — cyan, length = commanded magnitude. Intent, not measurement. */}
        {d.cmd !== null && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={polar(cx, cy, cmdLen, d.cmd).x}
              y2={polar(cx, cy, cmdLen, d.cmd).y}
              className="stroke-cyan-400"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={polar(cx, cy, cmdLen, d.cmd).x} cy={polar(cx, cy, cmdLen, d.cmd).y} r={3} className="fill-cyan-400" />
          </>
        )}

        {/* Bow heading — the authority. Absent, never zeroed, when heading is unknown. */}
        {d.hdg !== null ? (
          <polygon
            points={[
              `${polar(cx, cy, rTick - 6, d.hdg).x},${polar(cx, cy, rTick - 6, d.hdg).y}`,
              `${polar(cx, cy, 11, d.hdg + 130).x},${polar(cx, cy, 11, d.hdg + 130).y}`,
              `${polar(cx, cy, 5, d.hdg + 180).x},${polar(cx, cy, 5, d.hdg + 180).y}`,
              `${polar(cx, cy, 11, d.hdg - 130).x},${polar(cx, cy, 11, d.hdg - 130).y}`,
            ].join(" ")}
            className="fill-slate-100"
          />
        ) : null}

        <circle
          cx={cx}
          cy={cy}
          r={3.5}
          className={d.hdg !== null ? "fill-slate-900 stroke-slate-300" : "fill-slate-800 stroke-slate-600"}
          strokeWidth={1.5}
        />

        {/* Lubber line — fixed reference at the top, as on a real card. */}
        <line x1={cx} y1={cy - rOuter} x2={cx} y2={cy - rOuter + 9} className="stroke-rose-400" strokeWidth={2} />
      </svg>

      {!compact && (
        /*
         * DYNAMIC readout: every chip below is conditional, so the block is exactly as tall as there
         * is information to show and no taller. A fixed-height readout padded with em-dashes was what
         * made this widget overflow its slot in the first place. Two columns, no wrapping, truncate
         * on overflow — the panel width is the constraint, never the content.
         */
        <div className="mt-1.5 grid w-full grid-cols-2 gap-x-2 gap-y-0.5">
          <Chip
            label="Hdg"
            value={d.hdg !== null ? `${Math.round(d.hdg).toString().padStart(3, "0")}°` : "—"}
            tone={d.hdg !== null ? "text-slate-100" : "text-slate-600"}
            title="Actual bow heading (true)"
          />
          {d.cmd !== null && (
            <Chip label="Cmd" value={`${Math.round(d.cmd)}°`} tone="text-cyan-300" title="Commanded translation heading" />
          )}
          {d.err !== null && (
            <Chip
              label="Δ"
              value={`${d.err > 0 ? "+" : ""}${Math.round(d.err)}°`}
              tone={Math.abs(d.err) > 15 ? "text-amber-300" : "text-green-300"}
              title="Commanded minus actual"
            />
          )}
          {d.magnitude !== null && (
            <Chip
              label="Mag"
              value={`${d.magnitude.toFixed(0)} µT`}
              tone={d.fieldSane === false ? "text-amber-400" : "text-slate-300"}
              title={
                mag?.microTesla
                  ? `X ${mag.microTesla.x.toFixed(1)}  Y ${mag.microTesla.y.toFixed(1)}  Z ${mag.microTesla.z.toFixed(1)} µT${mag.i2cAddress ? ` · BMM150 @ ${mag.i2cAddress}` : ""}`
                  : undefined
              }
            />
          )}
          {d.trustworthyMag !== null && (
            <Chip label="MagBrg" value={`${Math.round(d.trustworthyMag)}°`} tone="text-amber-300" title="Tilt-compensated magnetic bearing" />
          )}

          {/*
           * One honest line, and only when there IS something to caveat. The full explanation lives in
           * the tooltip so the panel stays compact — the operator needs to know the bearing is not
           * usable, not to read the reason every time they glance at the dial.
           */}
          {mag && mag.present && d.trustworthyMag === null && (
            <div
              className="col-span-2 truncate text-[8px] leading-tight text-amber-400/80"
              title={
                d.fieldSane === false
                  ? `Total field ${d.magnitude?.toFixed(1)} µT is outside Earth's ${EARTH_FIELD_MIN_UT}–${EARTH_FIELD_MAX_UT} µT band — local iron is dominating the reading, so no direction can be derived from it.`
                  : `A magnetometer alone is not a compass. A heading needs ${!mag.calibrated && !mag.tiltCompensated ? "calibration and tilt compensation" : !mag.calibrated ? "calibration" : "tilt compensation (no accelerometer fitted)"}.`
              }
            >
              {d.fieldSane === false ? "⚠ local iron — direction suppressed" : "raw field only · not a heading"}
            </div>
          )}
          {mag && !mag.present && (
            <div className="col-span-2 truncate text-[8px] leading-tight text-slate-600" title={mag.status ?? undefined}>
              magnetometer not reporting
            </div>
          )}
        </div>
      )}
    </div>
  );
}
