"use client";

/**
 * SensorStatsPanel — spec-sheet readout for ONE tower camera feed (today: the IMX477 "Target").
 *
 * WHY THIS EXISTS
 * A feed label ("Target") tells an operator nothing about what the sensor is actually doing. This
 * panel puts the measurable detail on screen — which sensor bound, on which device node, at what
 * resolution/rate, in which capture mode, and how old the last frame is — so a degraded pipeline is
 * readable as a fact instead of a vibe.
 *
 * HONESTY RULES (do not soften any of them)
 *  1. EVERY field is nullable because the backend genuinely omits some of them. The Jetson camera
 *     service reports a partial picture at :8792/health (streamA/streamB, persistentA/persistentB,
 *     imx519/imx477, targetDiscrete, argusWorking, sensor) and more wiring detail at /info
 *     (captureMode strings). A field the service never sent renders as an em-dash — NEVER a
 *     plausible default. Printing "30 fps" because HQ sensors usually run 30 fps would be
 *     fabricated telemetry on an operator console.
 *  2. Provenance rides on each row, not only in the footer: `svc` = the camera service measured it
 *     this poll; `cfg` = it comes from the rig contract (installed lens spec / commanded mode), so
 *     it describes how the rig was BUILT or COMMANDED, not what the sensor is sensing right now.
 *  3. An empty `argusIds` array is NOT null: the service enumerated the Argus sensors and found
 *     none. That is a finding, so it reads "none" — an em-dash there would hide a real result.
 *  4. Nothing here is derived except pixel count (a pure product of two reported numbers) and the
 *     frame-age staleness hint, which is labelled as a display hint, not a backend alarm.
 *
 * Presentational only — no fetching, no polling, no normalisation. The owner passes what the BFF
 * gave it, nulls included.
 */

import { type JSX, type ReactNode } from "react";
import { Aperture, Cpu, Image as ImageIcon, Radio, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SensorStats {
  sensor: string | null; device: string | null; width: number | null; height: number | null;
  fps: number | null; captureMode: string | null; discrete: boolean | null;
  argusIds: number[] | null; irCut: string | null; nightActive: boolean | null;
  fovDeg: number | null; lastFrameMs: number | null; persistent: boolean | null;
}

/** Where a row's value came from. This is the measured-vs-configured distinction, per row. */
type Source = "svc" | "cfg";

const SOURCE_TITLE: Record<Source, string> = {
  svc: "Measured — reported by the Jetson camera service on this poll",
  cfg: "Configured — from the rig contract (installed hardware / commanded mode), not a live measurement",
};

/**
 * The preview and detect polls run at roughly 1 Hz, so a frame older than ~3 s means several polls
 * produced nothing. This is a DISPLAY hint for the operator — the backend does not report staleness,
 * so it is styled as an advisory and never as a reported alarm state.
 */
const STALE_FRAME_MS = 3000;

/** The one rendering of "the backend did not tell us". Muted, italic, never a substitute value. */
function NotReported(): JSX.Element {
  return (
    <span
      className="italic text-slate-500/80"
      title="Not reported by the backend — no default is being shown"
      aria-label="not reported"
    >
      &mdash;
    </span>
  );
}

function Section({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }): JSX.Element {
  return (
    <div className="mt-1.5 first:mt-0">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400/60">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

function Row({ label, source, hint, children }: { label: string; source: Source; hint?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="flex shrink-0 items-center gap-1 text-[10px] leading-tight text-slate-400" title={hint}>
        {label}
        <span
          title={SOURCE_TITLE[source]}
          className={cn(
            "rounded px-0.5 text-[7px] font-bold uppercase leading-[1.4] tracking-wide",
            source === "svc" ? "bg-cyan-500/15 text-cyan-300/70" : "bg-slate-500/15 text-slate-400/80",
          )}
        >
          {source}
        </span>
      </span>
      <span className="min-w-0 break-words text-right font-mono text-[10px] leading-tight text-slate-200">
        {children}
      </span>
    </div>
  );
}

/**
 * `warnOnFalse` marks the booleans where false is a DEGRADED state (the Target not enumerating as
 * its own sensor, a non-persistent pipeline). nightActive has no bad value — day is not a fault —
 * so it stays neutral.
 */
function YesNo({ value, warnOnFalse }: { value: boolean | null; warnOnFalse?: boolean }): JSX.Element {
  if (value === null) return <NotReported />;
  if (value) return <span className={warnOnFalse ? "text-emerald-300" : "text-slate-200"}>yes</span>;
  return <span className={warnOnFalse ? "text-amber-300" : "text-slate-300"}>no</span>;
}

function Text({ value }: { value: string | null }): JSX.Element {
  const trimmed = value?.trim() ?? "";
  // An empty/whitespace string carries no more information than an absent field, so it reports as
  // unreported rather than rendering a blank cell that looks like a value.
  if (!trimmed) return <NotReported />;
  return <span title={trimmed}>{trimmed}</span>;
}

function Resolution({ width, height }: { width: number | null; height: number | null }): JSX.Element {
  if (width === null && height === null) return <NotReported />;
  // Only a full pair yields a pixel count; one reported axis still shows, with the missing axis
  // explicitly blank rather than filled in from an assumed aspect ratio.
  const megapixels = width !== null && height !== null ? (width * height) / 1e6 : null;
  return (
    <span>
      {width ?? <NotReported />} &times; {height ?? <NotReported />}
      {megapixels !== null && <span className="ml-1 text-slate-500">{megapixels.toFixed(1)} MP</span>}
    </span>
  );
}

function Fps({ value }: { value: number | null }): JSX.Element {
  // NaN/Infinity are not reports — a broken number must not print as a rate.
  if (value === null || !Number.isFinite(value) || value < 0) return <NotReported />;
  return <span>{Number.isInteger(value) ? value : value.toFixed(1)} fps</span>;
}

function Fov({ value }: { value: number | null }): JSX.Element {
  if (value === null || !Number.isFinite(value)) return <NotReported />;
  return <span>{Number.isInteger(value) ? value : value.toFixed(1)}&deg; H</span>;
}

function ArgusIds({ ids }: { ids: number[] | null }): JSX.Element {
  if (ids === null) return <NotReported />;
  // Honesty rule 3: an enumerated-and-empty list is a result, not a missing field.
  if (ids.length === 0) return <span className="text-amber-300" title="Service enumerated zero Argus sensor ids">none</span>;
  return <span>{ids.join(", ")}</span>;
}

function FrameAge({ ms }: { ms: number | null }): JSX.Element {
  // A negative age is not a measurement anyone can act on (clock skew / uninitialised counter), so
  // it degrades to unreported instead of printing a nonsense figure.
  if (ms === null || !Number.isFinite(ms) || ms < 0) return <NotReported />;
  const text =
    ms < 1000
      ? `${Math.round(ms)} ms`
      : ms < 60000
        ? `${(ms / 1000).toFixed(1)} s`
        : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  const stale = ms >= STALE_FRAME_MS;
  return (
    <span className={stale ? "text-amber-300" : "text-slate-200"}>
      {text} ago
      {stale && <span className="ml-1 text-[8px] font-bold uppercase tracking-wide">stale</span>}
    </span>
  );
}

export default function SensorStatsPanel({
  stats,
  feedLabel,
  className,
}: {
  stats: SensorStats;
  feedLabel: string;
  className?: string;
}): JSX.Element {
  // Counting reported fields lets the panel say "the backend sent nothing" out loud, instead of
  // leaving the operator to read a column of em-dashes and guess whether the UI is broken.
  const reported = [
    stats.sensor,
    stats.device,
    stats.width,
    stats.height,
    stats.fps,
    stats.captureMode,
    stats.discrete,
    stats.argusIds,
    stats.irCut,
    stats.nightActive,
    stats.fovDeg,
    stats.lastFrameMs,
    stats.persistent,
  ].filter((v) => v !== null).length;

  return (
    <div
        className={cn("w-[248px] max-w-[248px] rounded-lg p-2.5", className)}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.20), rgba(15,23,42,0.74) 48%, rgba(255,255,255,0.10)), " +
            "radial-gradient(circle at 24% 18%, rgba(255,255,255,0.18), transparent 32%)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          border: "1px solid rgba(255,255,255,0.42)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 10px 30px rgba(15,23,42,0.35)",
        }}
      >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
          <Aperture className="h-3 w-3" /> Sensor
        </span>
        <span className="truncate font-mono text-[9px] text-slate-400" title={feedLabel}>
          {feedLabel}
        </span>
      </div>

      {reported === 0 && (
        <p className="mb-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-1 text-[9px] leading-tight text-amber-200">
          The backend reported none of these fields. Every row below is unreported — not a default,
          and not a reading of zero.
        </p>
      )}

      <Section label="Sensor" icon={Cpu}>
        <Row label="Name" source="svc" hint="Sensor string as the camera service names it — never inferred from the feed role">
          <Text value={stats.sensor} />
        </Row>
        <Row label="Device" source="svc" hint="V4L2 / capture device node the pipeline is bound to">
          <Text value={stats.device} />
        </Row>
        <Row label="Discrete" source="svc" hint="Whether this feed is its own enumerated sensor rather than being derived from another stream">
          <YesNo value={stats.discrete} warnOnFalse />
        </Row>
        <Row label="Argus ids" source="svc" hint="nvarguscamerasrc sensor-id(s) the service enumerated, in the order it reported them">
          <ArgusIds ids={stats.argusIds} />
        </Row>
      </Section>

      <Section label="Image" icon={ImageIcon}>
        <Row label="Resolution" source="svc" hint="Frame size the service reports for this feed">
          <Resolution width={stats.width} height={stats.height} />
        </Row>
        <Row label="Rate" source="svc" hint="Frame rate as reported — not the rate this UI polls at">
          <Fps value={stats.fps} />
        </Row>
        <Row label="FOV" source="cfg" hint="Horizontal field of view of the installed lens, from the rig contract — a build spec, not a measurement">
          <Fov value={stats.fovDeg} />
        </Row>
        <Row label="Capture mode" source="svc" hint="Capture-mode string verbatim from the service (/info)">
          <Text value={stats.captureMode} />
        </Row>
      </Section>

      <Section label="State" icon={Radio}>
        <Row label="IR-cut" source="cfg" hint="Commanded IR-cut mode from the rig contract — the requested mode, not a sensed filter position">
          <Text value={stats.irCut ? stats.irCut.toUpperCase() : null} />
        </Row>
        <Row label="Night active" source="svc" hint="Sensed result: true when the IR-cut filter has actually swung out">
          <YesNo value={stats.nightActive} />
        </Row>
        <Row label="Last frame" source="svc" hint="Age of the most recent frame the service saw; stale is this panel's hint, not a backend alarm">
          <FrameAge ms={stats.lastFrameMs} />
        </Row>
        <Row label="Persistent" source="svc" hint="Whether the capture pipeline stays up between requests instead of being torn down each time">
          <YesNo value={stats.persistent} warnOnFalse />
        </Row>
      </Section>

      <p className="mt-2 border-t border-cyan-500/15 pt-1.5 text-[8px] leading-[1.35] text-slate-500">
        <span className="font-bold text-cyan-300/70">svc</span> = measured this poll by the Jetson
        camera service (/health + /info): sensor name, device node, discrete enumeration, Argus ids,
        resolution, rate, capture mode, night state, frame age, pipeline persistence.{" "}
        <span className="font-bold text-slate-400/80">cfg</span> = from the rig contract: FOV is the
        installed lens spec and IR-cut is the commanded mode — neither is sensed.{" "}
        <span className="italic">&mdash;</span> means the backend did not report that field; no value
        on this panel is defaulted, inferred, or carried over from a previous poll.
      </p>
    </div>
  );
}
