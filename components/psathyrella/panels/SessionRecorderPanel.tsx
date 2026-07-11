"use client";

/**
 * Session Recorder & Replay — the GCS flight recorder UI.
 *
 * Records the live telemetry + command stream (via useSessionRecorder, lifted to the console) and
 * lets the operator scrub / play back the buffer or an imported .json session. This is the Navy
 * "we field-tested it with our own control system" artifact and a bench-run debugger.
 *
 * Self-contained: replay only drives this panel's own readouts — it never re-drives the freeze-
 * sensitive map/WebGL views, so it can't destabilize the live console.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Square, Trash2, Download, Upload, Play, Pause, SkipForward, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, SectionLabel, Readout, StatLED } from "../ui";
import type { RecordedSession } from "@/lib/psathyrella/contract";
import type { SessionRecorderApi } from "@/lib/psathyrella/useSessionRecorder";

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function SessionRecorderPanel({ recorder }: { recorder: SessionRecorderApi }) {
  const { getSession, frameCount, commandCount, recording, startedMs, toggle, clear, exportSession, importSession } = recorder;

  const [source, setSource] = useState<"live" | "imported">("live");
  const [imported, setImported] = useState<RecordedSession | null>(null);
  const [scrubIdx, setScrubIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const fileRef = useRef<HTMLInputElement>(null);

  // The session under the scrubber: imported file, or a fresh materialization of the live buffer.
  const session = useMemo(
    () => (source === "imported" && imported ? imported : getSession()),
    [source, imported, getSession, frameCount, commandCount]
  );
  const frames = session.frames;
  const last = frames.length - 1;
  const idx = Math.min(Math.max(0, scrubIdx), Math.max(0, last));
  const frame = frames[idx];
  const t0 = session.startedMs || frames[0]?.t || 0;

  // Replay clock — advance the scrubber while playing. Gated on document.hidden; auto-pauses at end.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setScrubIdx((i) => {
        if (i >= frames.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, Math.max(80, Math.round(1000 / speed)));
    return () => clearInterval(id);
  }, [playing, speed, frames.length]);

  // Light 1 Hz tick so the live REC elapsed updates smoothly while recording.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => { if (!document.hidden) setTick((n) => (n + 1) % 3600); }, 1000);
    return () => clearInterval(id);
  }, [recording]);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    const s = await importSession(file);
    if (s) { setImported(s); setSource("imported"); setScrubIdx(0); setPlaying(false); }
  };

  const activeCommands = frame ? session.commands.filter((c) => c.t <= frame.t).slice(-4).reverse() : [];

  return (
    <Panel title="Session · Record & Replay" icon={<Database className="h-3.5 w-3.5" />}>
      {/* Recorder controls */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "psa-glass-btn flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
            recording ? "border-red-500/60 bg-red-500/20 text-red-200" : "border-green-500/40 text-green-300/90 hover:bg-green-500/10"
          )}
        >
          {recording ? <Square className="h-3 w-3 fill-current" /> : <Circle className="h-3 w-3 fill-current" />}
          {recording ? "Stop" : "Record"}
        </button>
        <button type="button" onClick={clear} title="Clear the recording buffer" className="psa-glass-btn flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          <Trash2 className="h-3 w-3" /> Clear
        </button>
        <button type="button" onClick={() => exportSession()} title="Download this session as JSON" disabled={frameCount === 0} className="psa-glass-btn flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 disabled:opacity-40">
          <Download className="h-3 w-3" /> Export
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} title="Load a saved session for replay" className="psa-glass-btn flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          <Upload className="h-3 w-3" /> Import
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onPickFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      {/* Live status */}
      <div className="mb-2 flex items-center gap-3 rounded border border-white/5 bg-white/[0.02] px-2 py-1">
        <div className="flex items-center gap-1.5">
          <StatLED color={recording ? "red" : "slate"} pulse={recording} />
          <span className="text-[10px] uppercase tracking-wide text-slate-400">{recording ? "Recording" : "Idle"}</span>
        </div>
        <Readout label="Frames" value={frameCount} />
        <Readout label="Cmds" value={commandCount} />
        <Readout label="Elapsed" value={recording && startedMs ? fmtClock(Date.now() - startedMs) : "—"} />
      </div>

      {/* Source toggle */}
      <div className="mb-1.5 flex items-center gap-1">
        <SectionLabel className="mb-0">Replay</SectionLabel>
        <div className="ml-auto flex gap-1">
          {(["live", "imported"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setSource(s); setScrubIdx(0); setPlaying(false); }}
              disabled={s === "imported" && !imported}
              className={cn(
                "rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                source === s ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-100" : "border-white/10 text-slate-500 hover:text-slate-300",
                s === "imported" && !imported && "opacity-40"
              )}
            >
              {s === "live" ? "Live buffer" : "Imported"}
            </button>
          ))}
        </div>
      </div>

      {frames.length === 0 ? (
        <div className="rounded border border-white/5 bg-white/[0.02] px-3 py-4 text-center text-[10px] uppercase tracking-wide text-slate-500">
          No frames yet — press Record
        </div>
      ) : (
        <>
          {/* Transport */}
          <div className="mb-1.5 flex items-center gap-1.5">
            <button type="button" onClick={() => setPlaying((p) => !p)} className="psa-glass-btn flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-cyan-200">
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => { setScrubIdx(last); setPlaying(false); }} title="Jump to latest" className="psa-glass-btn flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-slate-300">
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <div className="ml-1 flex gap-0.5">
              {([1, 2, 4] as const).map((x) => (
                <button key={x} type="button" onClick={() => setSpeed(x)} className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold", speed === x ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-100" : "border-white/10 text-slate-500")}>{x}×</button>
              ))}
            </div>
            <span className="ml-auto font-mono text-[10px] tabular-nums text-slate-400">
              {frame ? `+${fmtClock(frame.t - t0)}` : "—"} · {idx + 1}/{frames.length}
            </span>
          </div>
          <input type="range" min={0} max={last} value={idx} onChange={(e) => { setScrubIdx(+e.target.value); setPlaying(false); }} className="w-full accent-cyan-400" />

          {/* Frame readout */}
          {frame && (
            <>
              <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5">
                <Readout label="Armed" value={frame.armed ? "ARMED" : "safe"} status={frame.armed ? "warn" : "idle"} />
                <Readout label="Mode" value={frame.mode} />
                <Readout label="Link" value={frame.link} status={frame.link === "online" ? "ok" : "warn"} />
                <Readout label="Lat" value={frame.lat != null ? frame.lat.toFixed(5) : null} />
                <Readout label="Lon" value={frame.lon != null ? frame.lon.toFixed(5) : null} />
                <Readout label="Heading" value={frame.headingDeg != null ? frame.headingDeg.toFixed(0) : null} unit="°" />
                <Readout label="Speed" value={frame.speedKn != null ? frame.speedKn.toFixed(1) : null} unit="kn" />
                <Readout label="Depth" value={frame.depthM != null ? frame.depthM.toFixed(1) : null} unit="m" />
                <Readout label="Batt" value={frame.batterySocPct != null ? frame.batterySocPct.toFixed(0) : null} unit="%" status={frame.batterySocPct != null && frame.batterySocPct < 20 ? "crit" : "ok"} />
              </div>

              <SectionLabel className="mt-2">Thrusters</SectionLabel>
              <div className="grid grid-cols-4 gap-1">
                {frame.thrusters.map((th) => (
                  <div key={th.id} className={cn("rounded border px-1 py-0.5 text-center", th.faulted ? "border-red-500/40 bg-red-500/10" : "border-white/10 bg-white/[0.02]")}>
                    <div className="text-[8px] uppercase tracking-wide text-slate-500">T{th.id}</div>
                    <div className="font-mono text-[10px] text-cyan-100">{th.throttlePct}%</div>
                    <div className="font-mono text-[8px] text-slate-500">{th.azimuthDeg}°{th.currentA != null ? ` · ${th.currentA.toFixed(1)}A` : ""}</div>
                  </div>
                ))}
              </div>

              {activeCommands.length > 0 && (
                <>
                  <SectionLabel className="mt-2">Commands @ time</SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {activeCommands.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 text-[9px]">
                        <StatLED color={c.state === "applied" || c.state === "acked" ? "green" : c.state === "failed" || c.state === "expired" ? "red" : "amber"} />
                        <span className="font-mono text-slate-500">+{fmtClock(c.t - t0)}</span>
                        <span className="truncate text-slate-300">{c.label}</span>
                        <span className="ml-auto uppercase text-slate-500">{c.state}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </Panel>
  );
}
