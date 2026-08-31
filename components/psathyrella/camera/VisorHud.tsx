"use client";

/**
 * VISOR HUD — a full-viewport combat head-up display over the bow optic.
 *
 * Deliberately styled after a helmet visor: angular chamfered plates, cyan glow, corner brackets,
 * a sweeping motion tracker bottom-left, scanlines, and a live reticle. The point is not decoration
 * — an operator conning a boat reads a HUD peripherally, and shape + position + colour carry meaning
 * faster than a row of labelled numbers ever will.
 *
 * ══ THE DESIGN DECISION THAT MAKES THE TRACKER WORK TODAY ═════════════════════════════════════════
 * The motion tracker plots contacts at their BOW-RELATIVE bearing, not their true bearing. That is
 * both how a helmet tracker actually behaves (it is relative to where you are facing) and the only
 * version that functions right now: relative bearing comes straight from pixels and is always
 * available, while TRUE bearing needs a heading fix the buoy does not currently have. A tracker that
 * blanked itself waiting for GPS would be useless precisely when you are driving by eye.
 *
 * ══ WHAT IT WILL NOT DO ═══════════════════════════════════════════════════════════════════════════
 * The camera measures DIRECTION and nothing else. Blips therefore sit on a fixed ring at their
 * bearing — the ring radius is NOT a distance, and it is labelled "bearing only · no range" so it
 * cannot be misread as one. Every numeric cell renders an em-dash when its datum is null; a HUD that
 * fills gaps with zeros is worse than one with holes, because a zero looks measured.
 */

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { cn } from "@/lib/utils";
import type { BuoyTelemetry, CameraFeed, MagnetometerReading } from "@/lib/psathyrella/contract";
import useSWR from "swr";
import { Compass, Gauge, Wind, Thermometer, Waves, Clock } from "lucide-react";
import VisorFrame from "@/components/psathyrella/camera/VisorFrame";

/**
 * Local time at the vehicle, derived from LONGITUDE (15° per hour).
 *
 * This is the nautical approximation, not a political timezone: it ignores DST and border shapes.
 * That is the honest thing to show for a buoy — its solar-ish local time — and it is labelled TIME
 * rather than a zone abbreviation so it is never mistaken for a civil clock. Null position -> null.
 */
function localTimeFromGps(lat: number | null, lon: number | null): string | null {
  if (lat == null || lon == null || !Number.isFinite(lon)) return null;
  const utcMs = Date.now();
  const offsetH = Math.round(lon / 15);
  const d = new Date(utcMs + offsetH * 3600_000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Corner instrument plate — shaped to the visor's corner, not a rectangle.
 *
 * The inner edge is raked to match the frame bracket's sweep (mirrored for the right side), and the
 * fill is the same translucent blue glass as the corner panels, so the picture still reads through
 * while the dead corner is masked.
 */
function CornerPlate({ children }: { side?: "left" | "right"; children: React.ReactNode }): JSX.Element {
  return (
    <div
      className="flex flex-col items-stretch gap-1.5 px-3.5 py-2.5"
      style={{
        // Chamfered capsule: rounded ends with cut corners, so it reads as HUD furniture rather than
        // a browser pill. Width is driven by content; both instances get the same minWidth so the
        // left and right plates stay identical whatever their values are.
        minWidth: 156,
        borderRadius: 14,
        clipPath: "polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)",
        background: "rgba(15, 23, 42, 0.46)",
        border: "1px solid rgba(255,255,255,0.28)",
        backdropFilter: "blur(18px) saturate(1.2)",
        WebkitBackdropFilter: "blur(18px) saturate(1.2)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42)",
      }}
    >
      {children}
    </div>
  );
}

/** One corner statistic: icon, then value. Null renders an em-dash with the reason on hover. */
function Stat({ icon: Icon, v, why, unit }: {
  icon: React.ComponentType<{ className?: string }>;
  v: string | null;
  why: string;
  unit?: string;
}): JSX.Element {
  const known = v != null;
  return (
    <div className="flex items-center gap-2" title={known ? undefined : why}>
      <Icon className={cn("h-4 w-4 shrink-0", known ? "text-cyan-300/85" : "text-slate-600")} />
      <span className={cn("flex-1 text-right font-mono text-[15px] font-bold tabular-nums leading-none",
        known ? "text-cyan-100" : "text-slate-600")}>{v ?? "—"}</span>
      {unit && <span className="w-7 shrink-0 font-mono text-[9px] uppercase tracking-wider text-cyan-300/50">{unit}</span>}
    </div>
  );
}

/**
 * ⚠ LAYOUT PREVIEW ONLY — DELETE BEFORE THE BUOY CARRIES REAL DATA.
 *
 * Morgan asked for filled values so the corner widgets can be sized and judged. These are NOT
 * measurements: HDG has no IMU, SPD has no GPS fix, WIND has no anemometer and WATER has no probe.
 * Set PREVIEW_STATS to false and every one of them returns to an em-dash with its reason on hover,
 * which is the only correct behaviour for an operator console.
 */
const PREVIEW_STATS = true;
const PREVIEW = { hdg: "204°", spd: "3.4 kn", wind: "11 kn", air: "26.1 °C", water: "17.8 °C", time: "20:31" };

/**
 * Synthetic slow turn for verifying the compass tapes before the IMU is fitted.
 *
 * PREVIEW ONLY, and doubly safe: it is gated on PREVIEW_STATS *and* only used when the vehicle's own
 * headingDeg is null. A real bearing always takes precedence, so this can never mask live data.
 * ~4°/s — a believable rate for a buoy under thruster yaw.
 */
function usePreviewHeading(real: number | null): number | null {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!PREVIEW_STATS || real !== null) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((v) => (v + dt * 4) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [real]);
  if (real !== null) return real;
  return PREVIEW_STATS ? t : null;
}

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

export interface VisorContact {
  id: string;
  label: string;
  /** Bearing relative to the bow, −180..180. This is what the tracker plots. */
  bearingRelDeg: number;
  /** True bearing when a heading fix exists; used only for the readout, never for placement. */
  bearingTrueDeg: number | null;
  group?: string;
  conf?: number | null;
  /** Model-free motion rather than a classified object — drawn differently. */
  motion?: boolean;
}


/**
 * Great-circle initial bearing and distance, own position → waypoint.
 *
 * Real spherical maths, not an equirectangular shortcut: at buoy ranges the difference is small, but
 * a nav bearing is the number an operator steers on, and there is no reason to ship a known
 * approximation into it.
 */
function greatCircle(lat1: number, lon1: number, lat2: number, lon2: number): { bearingDeg: number; distanceM: number } {
  const R = 6371008.8;
  const toRad = Math.PI / 180;
  const p1 = lat1 * toRad;
  const p2 = lat2 * toRad;
  const dl = (lon2 - lon1) * toRad;
  const dp = p2 - p1;

  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const bearingDeg = norm360((Math.atan2(y, x) * 180) / Math.PI);

  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const distanceM = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  return { bearingDeg, distanceM };
}

/**
 * Next-waypoint solution, or null with the reason it could not be computed.
 *
 * Returning WHY matters: "no waypoint set" and "we do not know where we are" are different problems
 * with different fixes, and a nav readout that shows a bare em-dash for both tells the operator to
 * go looking in the wrong place.
 */
function waypointNav(t: BuoyTelemetry): { label: string; bearingTrueDeg: number; distanceM: number } | { reason: string } {
  const wps = t.autonomy.waypoints;
  if (wps.length === 0) return { reason: "no waypoints" };
  const active = t.autonomy.activeWaypointId ? wps.find((w) => w.id === t.autonomy.activeWaypointId) : wps[0];
  if (!active) return { reason: "no active waypoint" };
  if (t.pose.lat == null || t.pose.lon == null) return { reason: "own position unknown" };
  const gc = greatCircle(t.pose.lat, t.pose.lon, active.lat, active.lon);
  return { label: active.label ?? active.id, bearingTrueDeg: gc.bearingDeg, distanceM: gc.distanceM };
}

/** Metres → the unit an operator reads at that scale. */
function fmtRange(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10000) return `${(m / 1000).toFixed(2)} km`;
  return `${(m / 1000).toFixed(1)} km`;
}

/**
 * Live ranges from the sensors that actually MEASURE distance.
 *
 * The bow optic cannot, so every marker on the HUD's range ladder comes from here: the TF-Luna
 * single-point ToF and the LD2450 mmWave. Both are honest-empty by contract — a present sensor with
 * no usable return contributes nothing rather than a zero.
 */
function useRangingReturns(active: boolean): { label: string; m: number; tone?: "cyan" | "amber" }[] {
  const f = async (u: string) => {
    const r = await fetch(u, { cache: "no-store" });
    return r.ok ? ((await r.json().catch(() => null)) as Record<string, unknown> | null) : null;
  };
  const o = { refreshInterval: 4000, revalidateOnFocus: false, dedupingInterval: 3500, keepPreviousData: true };
  const { data: tof } = useSWR(active ? "/api/psathyrella/fusion-sensors/points" : null, f, o);
  const { data: mmw } = useSWR(active ? "/api/psathyrella/fusion-sensors/mmwave" : null, f, o);

  return useMemo(() => {
    const out: { label: string; m: number; tone?: "cyan" | "amber" }[] = [];
    const pts = tof && Array.isArray(tof.points) ? (tof.points as Record<string, unknown>[]) : [];
    for (const p of pts) if (typeof p.rangeM === "number") out.push({ label: "TF-LUNA", m: p.rangeM, tone: "cyan" });
    const tg = mmw && Array.isArray(mmw.targets) ? (mmw.targets as Record<string, unknown>[]) : [];
    for (const t of tg) if (t.valid === true && typeof t.rangeM === "number") out.push({ label: "MMWAVE", m: t.rangeM, tone: "amber" });
    return out.slice(0, 4);
  }, [tof, mmw]);
}

/** Chamfered plate — the angular panel shape the whole HUD is built from. */
const PLATE = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";

function Plate({ children, className, tone = "cyan" }: { children: React.ReactNode; className?: string; tone?: "cyan" | "amber" | "red" }): JSX.Element {
  const border = tone === "red" ? "rgba(248,113,113,0.55)" : tone === "amber" ? "rgba(251,191,36,0.5)" : "rgba(34,211,238,0.38)";
  const glow = tone === "red" ? "rgba(248,113,113,0.25)" : tone === "amber" ? "rgba(251,191,36,0.2)" : "rgba(34,211,238,0.18)";
  return (
    <div
      className={cn("pointer-events-auto bg-[#03080f]/80 px-2.5 py-1.5 backdrop-blur-[2px]", className)}
      style={{ clipPath: PLATE, border: `1px solid ${border}`, boxShadow: `0 0 14px ${glow}, inset 0 0 20px rgba(0,0,0,0.55)` }}
    >
      {children}
    </div>
  );
}

/** Label-over-value cell. Null → em-dash, never a zero. */
function Cell({ label, value, unit, tone, title }: { label: string; value: string | number | null; unit?: string; tone?: string; title?: string }): JSX.Element {
  const known = value !== null && value !== undefined && value !== "";
  return (
    <div className="flex min-w-0 flex-col leading-none" title={title}>
      <span className="text-[7px] font-bold tracking-[0.22em] text-cyan-300/45">{label}</span>
      <span
        className={cn("mt-0.5 truncate font-mono text-[13px] font-bold tabular-nums", known ? (tone ?? "text-cyan-100") : "text-slate-600")}
        style={known ? { textShadow: "0 0 9px rgba(34,211,238,0.6)" } : undefined}
      >
        {known ? value : "—"}
        {known && unit ? <span className="ml-0.5 text-[8px] font-normal text-cyan-300/50">{unit}</span> : null}
      </span>
    </div>
  );
}

/**
 * MOTION TRACKER — the bottom-left instrument.
 *
 * Bow-relative, sweep-animated, with blips at each contact's bearing. Up is dead ahead. The sweep is
 * cosmetic (nothing is scanned by it) and is stated as such in the tooltip, because an animated
 * sweep on a tactical display implies an active sensor doing the sweeping.
 */
function MotionTracker({
  contacts,
  headingDeg,
  wpt,
}: {
  contacts: VisorContact[];
  headingDeg: number | null;
  wpt: { label: string; bearingTrueDeg: number; distanceM: number } | { reason: string };
}): JSX.Element {
  const [sweep, setSweep] = useState(0);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  useEffect(() => {
    const tick = (t: number) => {
      if (!last.current) last.current = t;
      const dt = t - last.current;
      last.current = t;
      setSweep((s) => (s + dt * 0.09) % 360); // ~4 s per revolution
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); last.current = 0; };
  }, []);

  const R = 43;
  const cx = 60;
  const cy = 60;
  const pt = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  const hdg = headingDeg !== null ? norm360(headingDeg) : null;
  /* Relative bearing to the waypoint. Needs a heading fix — without one the waypoint marker is not
     placed on a bow-relative ring, because that placement would be a guess. */
  const rel =
    !("reason" in wpt) && hdg !== null ? ((((wpt.bearingTrueDeg - hdg) % 360) + 540) % 360) - 180 : null;

  return (
    <div className="pointer-events-auto relative">
      <svg viewBox="0 0 120 120" className="h-[115px] w-[115px]" role="img" aria-label="Motion tracker, bow-relative">
        <g transform="translate(0 14)">
        <defs>
          <radialGradient id="vh-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.16)" />
            <stop offset="70%" stopColor="rgba(34,211,238,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="vh-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(34,211,238,0)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0.55)" />
          </linearGradient>
        </defs>

        <circle cx={cx} cy={cy} r={R} fill="#04090f" stroke="rgba(34,211,238,0.35)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={R * 0.66} fill="none" stroke="rgba(34,211,238,0.14)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={R * 0.33} fill="none" stroke="rgba(34,211,238,0.14)" strokeWidth={1} />

        {/* Bow / beam / stern ticks — relative frame, so these are fixed. */}
        {[0, 90, 180, 270].map((d) => {
          const o = pt(d, R);
          const i = pt(d, R - 6);
          return <line key={d} x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="rgba(34,211,238,0.55)" strokeWidth={d === 0 ? 2 : 1} />;
        })}
        <text x={cx} y={13} textAnchor="middle" className="fill-cyan-300/70" fontSize={7} fontWeight="bold">BOW</text>

        {/* Cosmetic sweep. Declared cosmetic in the tooltip — it scans nothing. */}
        <g transform={`rotate(${sweep} ${cx} ${cy})`}>
          <path d={`M ${cx} ${cy} L ${pt(-28, R).x} ${pt(-28, R).y} A ${R} ${R} 0 0 1 ${pt(0, R).x} ${pt(0, R).y} Z`} fill="url(#vh-sweep)" opacity={0.5} />
          <line x1={cx} y1={cy} x2={pt(0, R).x} y2={pt(0, R).y} stroke="rgba(103,232,249,0.85)" strokeWidth={1.2} />
        </g>

        {/* Blips at bow-relative bearing. Radius is FIXED — it is not a distance. */}
        {contacts.slice(0, 12).map((c) => {
          const p = pt(c.bearingRelDeg, R * 0.74);
          return (
            <g key={c.id}>
              <circle cx={p.x} cy={p.y} r={c.motion ? 2.6 : 3.4}
                fill={c.motion ? "rgba(251,191,36,0.95)" : "rgba(103,232,249,0.95)"}
                style={{ filter: `drop-shadow(0 0 5px ${c.motion ? "rgba(251,191,36,0.9)" : "rgba(34,211,238,0.9)"})` }}>
                <animate attributeName="opacity" values="1;0.45;1" dur="1.6s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* Waypoint marker — a chevron on the ring at its relative bearing. Only drawn with a
            heading fix; otherwise there is no relative frame to draw it in. */}
        {rel !== null && (
          <g transform={`rotate(${rel} ${cx} ${cy})`}>
            <polygon points={`${cx},${cy - R + 2} ${cx - 5},${cy - R + 11} ${cx + 5},${cy - R + 11}`}
              fill="rgba(251,191,36,0.95)" style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.9))" }} />
          </g>
        )}

        <circle cx={cx} cy={cy} r={2} fill="rgba(103,232,249,0.9)" />
              </g>
      </svg>

      <div className="text-center font-mono text-[7px] uppercase tracking-[0.14em] text-slate-600" title="Blips sit at their BEARING. The ring radius is not a distance — this optic cannot measure range. The sweep is cosmetic.">
        bearing only · no range
      </div>
    </div>
  );
}

/**
 * NEXT-WAYPOINT widget — its own corner instrument.
 *
 * Split out of the motion tracker (Morgan, Aug 03): the tracker answers "what is around me" and the
 * waypoint answers "where am I going". Stacking them made one column of small text doing two
 * unrelated jobs; as separate corner widgets each reads at a glance, which is the only way a HUD
 * element earns its space.
 */
function WaypointWidget({ wpt, headingDeg }: {
  wpt: { label: string; bearingTrueDeg: number; distanceM: number } | { reason: string };
  headingDeg: number | null;
}): JSX.Element {
  const hdg = headingDeg !== null ? norm360(headingDeg) : null;
  const rel = !("reason" in wpt) && hdg !== null ? ((((wpt.bearingTrueDeg - hdg) % 360) + 540) % 360) - 180 : null;
  return (
    <div className="flex w-full flex-col items-end gap-1 whitespace-nowrap border border-amber-400/35 bg-[#04090f]/70 px-3 py-2"
      style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}>
      <span className="font-mono text-[8px] font-bold tracking-[0.22em] text-amber-300/55">WAYPOINT</span>
      {"reason" in wpt ? (
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500"
          title="Nav solution unavailable — the reason is named so it is clear which thing to fix.">
          {wpt.reason}
        </span>
      ) : (
        <>
          <span className="max-w-[120px] truncate font-mono text-[10px] uppercase text-amber-200">{wpt.label}</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[15px] font-bold tabular-nums text-amber-200"
              style={{ textShadow: "0 0 9px rgba(251,191,36,0.7)" }} title="True bearing to the next waypoint">
              {Math.round(wpt.bearingTrueDeg).toString().padStart(3, "0")}°
            </span>
            <span className="font-mono text-[11px] tabular-nums text-amber-300/70" title="Great-circle range">
              {fmtRange(wpt.distanceM)}
            </span>
          </div>
          {rel !== null && (
            <span className={cn("font-mono text-[10px] font-bold uppercase tracking-wider",
              Math.abs(rel) < 5 ? "text-green-300" : "text-amber-300")}
              title="Steer this much to put the waypoint dead ahead">
              {Math.abs(rel) < 5 ? "ON COURSE" : `COME ${rel > 0 ? "STBD" : "PORT"} ${Math.abs(Math.round(rel))}°`}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default function VisorHud({
  telemetry,
  feed,
  contacts,
  detectorConnected,
  detectorModel,
  detectorLatencyMs,
  lockedLabel,
  zoom,
  className,
}: {
  telemetry: BuoyTelemetry;
  feed: CameraFeed;
  contacts: VisorContact[];
  detectorConnected: boolean;
  detectorModel?: string | null;
  detectorLatencyMs?: number | null;
  lockedLabel?: string | null;
  zoom?: number;
  className?: string;
}): JSX.Element {
  // Preview-only animated heading; the real bearing always wins (see usePreviewHeading).
  const previewHeading = usePreviewHeading(telemetry.pose.headingDeg);
  const wpt = useMemo(() => waypointNav(telemetry), [telemetry]);
  const returns = useRangingReturns(true);

  /**
   * Contacts → designator ticks.
   *
   * `xNorm` comes from the contact's bearing RELATIVE TO THE BOW mapped across the optic's field of
   * view, which is the same geometry the detector used to place the box. Anything outside the FOV is
   * dropped rather than clamped to an edge — a tick pinned to the frame edge would assert a position
   * the camera never actually saw.
   */
  const targets = useMemo(() => {
    const fov = feed.fovDeg && feed.fovDeg > 0 ? feed.fovDeg : 60;
    return contacts
      .map((c) => ({ c, xNorm: 0.5 + c.bearingRelDeg / fov }))
      .filter(({ xNorm }) => xNorm >= 0 && xNorm <= 1)
      .map(({ c, xNorm }) => ({
        id: c.id,
        xNorm,
        label: c.label,
        tone: (c.motion ? "amber" : "cyan") as "cyan" | "amber",
      }));
  }, [contacts, feed.fovDeg]);
  const classified = contacts.filter((c) => !c.motion);
  const movers = contacts.filter((c) => c.motion).length;

  /*
   * ══ WHAT THIS HUD IS ALLOWED TO SHOW ═══════════════════════════════════════════════════════════
   * Nothing that already lives on another surface. The console around this pane already carries:
   *
   *   left nav panel  — mode, arm, all-stop, joystick, yaw, hold/assist, compass
   *   right comms rail— radio bearers, RSSI, acoustic modem
   *   bottom status   — solar, battery, load, lat/lon, hdg, depth, thrust, air/RH/IAQ/pressure
   *
   * Repeating any of those here would spend the operator's central field of view restating what is
   * already in their peripheral one. So the visor carries ONLY what exists nowhere else: the optic's
   * own state, what the detector is seeing through it, the contact picture, and the waypoint
   * solution — which, despite being navigation, has no readout anywhere else in the console.
   */

  const irMode = feed.irCut ?? null;

  return (
    <VisorFrame
      className={className}
      /* Natural aspect of the optic, so the visor frames the PICTURE rather than the pane. */
      mediaAspect={feed.width && feed.height ? feed.width / feed.height : 16 / 9}
      capsulePct={detectorConnected ? 1 : null}
      cornerTL={
        <CornerPlate>
          <Stat icon={Compass} unit="deg" v={telemetry.pose.headingDeg != null ? `${Math.round(norm360(telemetry.pose.headingDeg)).toString().padStart(3, "0")}` : (PREVIEW_STATS ? "204" : null)} why="No heading fix — IMU not fitted" />
          <Stat icon={Gauge} unit="kn" v={telemetry.pose.speedKn != null ? telemetry.pose.speedKn.toFixed(1) : (PREVIEW_STATS ? "3.4" : null)} why="No GPS fix — no speed over ground" />
          <Stat icon={Wind} unit="kn" v={PREVIEW_STATS ? "11" : null} why="No anemometer fitted" />
        </CornerPlate>
      }
      cornerTR={
        <CornerPlate>
          <Stat icon={Thermometer} unit="°C" v={telemetry.bme?.a?.temperature != null ? telemetry.bme.a.temperature.toFixed(1) : (PREVIEW_STATS ? "26.1" : null)} why="BME688 not reporting" />
          <Stat icon={Waves} unit="°C" v={PREVIEW_STATS ? "17.8" : null} why="No water-temperature probe fitted" />
          <Stat icon={Clock} unit="loc" v={localTimeFromGps(telemetry.pose.lat, telemetry.pose.lon) ?? (PREVIEW_STATS ? "20:31" : null)} why="No GPS fix — cannot derive local time" />
        </CornerPlate>
      }
      capsuleLabel="PSATHYRELLA-1"
      statusLeds={[
        { key: "fault", label: "FAULT", tone: "red",
          state: telemetry.safety?.leakDetected === null && telemetry.safety?.thermalAlarm === null && telemetry.safety?.overcurrentAlarm === null
            ? null
            : Boolean(telemetry.safety?.leakDetected || telemetry.safety?.thermalAlarm || telemetry.safety?.overcurrentAlarm) },
        { key: "armed", label: "ARMED", tone: "green", state: telemetry.autonomy?.armed ?? null },
        { key: "link", label: "LINK", tone: "blue", state: detectorConnected },
      ]}
      capsuleTone={detectorConnected ? "cyan" : "amber"}
      /* Fixed gates as the reference scale; live returns come only from range-MEASURING sensors.
         This optic is not one of them and never feeds the ladder. */
      ladderGatesM={[15, 10, 5]}
      returns={returns}
      targets={targets}
      fovDeg={feed.fovDeg && feed.fovDeg > 0 ? feed.fovDeg : 60}
      headingDeg={previewHeading}
      /* Side ladders are fed by the RANGE-MEASURING sensors only — the optic never feeds them. */
      leftScale={{ label: "PROX", value: returns.find((r) => r.label === "TF-LUNA")?.m ?? null, unit: "m" }}
      rightScale={{ label: "MMWAVE", value: returns.find((r) => r.label === "MMWAVE")?.m ?? null, unit: "m" }}

      /* ── TOP-LEFT: what the detector is classifying ─────────────────────────────────────────── */
      topLeft={
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[8px] font-bold tracking-[0.22em] text-cyan-300/50">CLASSIFIED</span>
          {!detectorConnected ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300/90">
              detector offline \u2014 absence of boxes is not an all-clear
            </span>
          ) : classified.length === 0 ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">nothing in view</span>
          ) : (
            classified.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-2 border border-cyan-400/30 bg-[#03080f]/75 px-1.5 py-0.5"
                style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
                title={`${c.label} \u00b7 ${Math.round(c.bearingRelDeg)}\u00b0 relative to the bow`}>
                <span className="truncate font-mono text-[10px] uppercase text-cyan-100">{c.label}</span>
                <span className="ml-auto font-mono text-[9px] tabular-nums text-cyan-300/70">
                  {c.conf != null ? `${Math.round(c.conf * 100)}%` : "\u2014"}
                </span>
                <span className="font-mono text-[9px] tabular-nums text-amber-200/80">
                  {c.bearingRelDeg > 0 ? "S" : "P"}{Math.abs(Math.round(c.bearingRelDeg))}\u00b0
                </span>
              </div>
            ))
          )}
          {movers > 0 && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-amber-300">
              +{movers} unclassified mover{movers === 1 ? "" : "s"}
            </span>
          )}
        </div>
      }

      /* ── TOP-RIGHT: the OPTIC itself. Nothing else in the console reports this. ─────────────── */
      topRight={
        <div className="flex w-[196px] flex-col items-end gap-1">
          <span className="font-mono text-[8px] font-bold tracking-[0.22em] text-cyan-300/50">OPTIC</span>
          <div className="flex w-full flex-col items-end gap-1 whitespace-nowrap border border-cyan-400/30 bg-[#04090f]/70 px-3 py-2"
            style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}>
            <span className="truncate font-mono text-[10px] uppercase text-cyan-100" title={feed.sensor ?? undefined}>
              {feed.sensor ?? "IMX477"}
            </span>
            <span className="font-mono text-[9px] tabular-nums text-cyan-300/70">
              {feed.width && feed.height ? `${feed.width}\u00d7${feed.height}` : "\u2014"}
              {feed.fps != null ? ` \u00b7 ${Math.round(feed.fps)}fps` : ""}
            </span>
            <span className="font-mono text-[9px] tabular-nums text-cyan-300/70">
              ZOOM {zoom != null ? `${zoom.toFixed(1)}\u00d7` : "\u2014"} \u00b7 {feed.ptz === "optical" ? "OPT" : "DIG"}
            </span>
            <span className={cn("font-mono text-[9px] uppercase tracking-wider",
              feed.nightActive ? "text-amber-200" : "text-cyan-300/70")}
              title="IR-cut filter state. AUTO hands the filter to the module photodiode.">
              IR {irMode ? irMode.toUpperCase() : "\u2014"}{feed.nightActive ? " \u00b7 NIGHT" : ""}
            </span>
          </div>
        </div>
      }

      /* ── BOTTOM-LEFT: motion tracker + waypoint solution ───────────────────────────────────── */
      bottomLeft={<MotionTracker contacts={contacts} headingDeg={telemetry.pose.headingDeg} wpt={wpt} />}
      bottomCorner={<WaypointWidget wpt={wpt} headingDeg={telemetry.pose.headingDeg} />}

      /* ── BOTTOM-RIGHT: detector health + provenance. Unique to this pane. ──────────────────── */
      bottomRight={
        <div className="flex w-[196px] flex-col items-end gap-1">
          <span className="font-mono text-[8px] font-bold tracking-[0.22em] text-cyan-300/50">DETECTOR</span>
          <div className="flex w-full flex-col items-end gap-1 whitespace-nowrap border border-cyan-400/30 bg-[#04090f]/70 px-3 py-2"
            style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}>
            <span className={cn("font-mono text-[11px] font-bold uppercase", detectorConnected ? "text-green-300" : "text-amber-300")}
              style={detectorConnected ? { textShadow: "0 0 8px rgba(74,222,128,0.7)" } : undefined}>
              {detectorConnected ? "LIVE" : "OFFLINE"}
            </span>
            {detectorLatencyMs != null && (
              <span className="font-mono text-[9px] tabular-nums text-cyan-300/70">{Math.round(detectorLatencyMs)} ms</span>
            )}
            <span className="font-mono text-[9px] tabular-nums text-cyan-300/70">
              {classified.length} cls \u00b7 {movers} mot
            </span>
            {detectorModel && (
              <span className="border border-amber-400/50 bg-amber-500/20 px-1 font-mono text-[8px] font-bold text-amber-200"
                title={`${detectorModel} \u2014 a 36-frame fine-tune that has reported "bird 0.95" indoors. Every class is a hypothesis, not an identification.`}>
                R&amp;D WEIGHTS
              </span>
            )}
          </div>
        </div>
      }

      /* ── BOTTOM-CENTRE: lock state / designate affordance ──────────────────────────────────── */
      bottomCentre={
        lockedLabel ? (
          <div className="border border-amber-400/60 bg-amber-500/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100"
            style={{ clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)", boxShadow: "0 0 14px rgba(251,191,36,0.35)" }}>
            LOCK \u00b7 {lockedLabel}
          </div>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-300/40">
            tap the picture to designate
          </span>
        )
      }
    />
  );
}
