"use client";

/**
 * Session flight-recorder for the Psathyrella GCS.
 *
 * Records every telemetry frame + command event of a bench / pool / bay run into a compact
 * in-memory buffer, exportable/importable as JSON — the "we field-tested it with our own control
 * system" artifact and a debugging scrubber (see SessionRecorderPanel).
 *
 * FREEZE-SAFETY: capture happens in effects keyed on the telemetry/ledger object identity (which
 * only changes at the ~2.5s poll / SSE cadence). Frames land in refs; only small count state is
 * bumped, so this never re-renders faster than telemetry already does and never touches the map.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BuoyTelemetry,
  CommandRecord,
  RecordedSession,
  SessionCommandEvent,
  SessionFrame,
} from "./contract";
import { SESSION_FORMAT_VERSION } from "./contract";

const MAX_FRAMES = 20000; // ~14 h at the 2.5 s telemetry cadence
const MAX_COMMANDS = 5000;

function snapshotFrame(t: BuoyTelemetry, atMs: number): SessionFrame {
  return {
    t: atMs,
    lat: t.pose.lat,
    lon: t.pose.lon,
    headingDeg: t.pose.headingDeg,
    speedKn: t.pose.speedKn,
    depthM: t.pose.depthM,
    armed: t.autonomy.armed,
    mode: t.autonomy.mode,
    contactState: t.contactState,
    link: t.link,
    batterySocPct: t.power.batterySocPct,
    thrusters: t.propulsion.thrusters.map((x) => ({
      id: x.id,
      throttlePct: x.throttlePct,
      azimuthDeg: x.azimuthDeg,
      currentA: x.currentA,
      faulted: x.faulted,
    })),
    contacts: (t.radar.contacts?.length ?? 0) + (t.lidar.contacts?.length ?? 0) + (t.bluesight.wifi?.length ?? 0),
  };
}

export interface SessionRecorderApi {
  recording: boolean;
  frameCount: number;
  commandCount: number;
  startedMs: number | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  clear: () => void;
  /** Materialize the current buffer into a RecordedSession (for the scrubber). */
  getSession: () => RecordedSession;
  /** Serialize + trigger a browser download of the current buffer. */
  exportSession: (note?: string) => void;
  /** Parse an uploaded session file; returns null if malformed. */
  importSession: (file: File) => Promise<RecordedSession | null>;
}

export function useSessionRecorder({
  telemetry,
  commandLedger,
  deviceId,
}: {
  telemetry: BuoyTelemetry;
  commandLedger: CommandRecord[];
  deviceId: string;
}): SessionRecorderApi {
  const [recording, setRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [commandCount, setCommandCount] = useState(0);
  const [startedMs, setStartedMs] = useState<number | null>(null);

  const framesRef = useRef<SessionFrame[]>([]);
  const cmdMapRef = useRef<Map<string, SessionCommandEvent>>(new Map());
  const endedMsRef = useRef<number>(0);

  // Capture a telemetry frame each time the telemetry object identity changes while recording.
  useEffect(() => {
    if (!recording) return;
    const now = Date.now();
    endedMsRef.current = now;
    const frames = framesRef.current;
    frames.push(snapshotFrame(telemetry, now));
    if (frames.length > MAX_FRAMES) frames.splice(0, frames.length - MAX_FRAMES);
    setFrameCount(frames.length);
  }, [telemetry, recording]);

  // Upsert command events (records mutate in place through their lifecycle, so keep the latest state).
  useEffect(() => {
    if (!recording) return;
    const map = cmdMapRef.current;
    let changed = false;
    for (const rec of commandLedger) {
      const prev = map.get(rec.id);
      if (!prev || prev.state !== rec.state) {
        map.set(rec.id, {
          t: rec.createdMs,
          id: rec.id,
          seq: rec.seq,
          label: rec.label,
          domain: rec.domain,
          state: rec.state,
          latencyMs: rec.latencyMs,
        });
        changed = true;
      }
    }
    if (map.size > MAX_COMMANDS) {
      // Evict oldest by creation time.
      const sorted = [...map.values()].sort((a, b) => a.t - b.t);
      for (const e of sorted.slice(0, map.size - MAX_COMMANDS)) map.delete(e.id);
      changed = true;
    }
    if (changed) {
      endedMsRef.current = Date.now();
      setCommandCount(map.size);
    }
  }, [commandLedger, recording]);

  const start = useCallback(() => {
    setRecording((on) => {
      if (on) return on;
      if (framesRef.current.length === 0) setStartedMs(Date.now());
      return true;
    });
  }, []);
  const stop = useCallback(() => setRecording(false), []);
  const toggle = useCallback(() => setRecording((on) => {
    if (!on && framesRef.current.length === 0) setStartedMs(Date.now());
    return !on;
  }), []);
  const clear = useCallback(() => {
    framesRef.current = [];
    cmdMapRef.current = new Map();
    endedMsRef.current = 0;
    setFrameCount(0);
    setCommandCount(0);
    setStartedMs(null);
  }, []);

  const getSession = useCallback((): RecordedSession => {
    const commands = [...cmdMapRef.current.values()].sort((a, b) => a.t - b.t);
    const frames = framesRef.current;
    return {
      version: SESSION_FORMAT_VERSION,
      deviceId,
      startedMs: startedMs ?? frames[0]?.t ?? 0,
      endedMs: endedMsRef.current || frames[frames.length - 1]?.t || 0,
      frames: [...frames],
      commands,
    };
  }, [deviceId, startedMs]);

  const exportSession = useCallback((note?: string) => {
    if (typeof window === "undefined") return;
    const session = getSession();
    if (note) session.note = note;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date(session.startedMs || Date.now()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `psathyrella-session-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [getSession]);

  const importSession = useCallback(async (file: File): Promise<RecordedSession | null> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") return null;
      if (!Array.isArray(parsed.frames) || !Array.isArray(parsed.commands)) return null;
      // Drop frames/commands with a non-finite timestamp so the scrubber math never yields NaN.
      const frames = (parsed.frames as any[]).filter((f) => f && Number.isFinite(f.t)) as SessionFrame[];
      const commands = (parsed.commands as any[]).filter((c) => c && Number.isFinite(c.t)) as SessionCommandEvent[];
      if (frames.length === 0) return null;
      return {
        version: Number(parsed.version) || SESSION_FORMAT_VERSION,
        deviceId: String(parsed.deviceId ?? "unknown"),
        startedMs: Number(parsed.startedMs) || frames[0].t,
        endedMs: Number(parsed.endedMs) || frames[frames.length - 1].t,
        frames,
        commands,
        note: typeof parsed.note === "string" ? parsed.note : undefined,
      };
    } catch {
      return null;
    }
  }, []);

  return { recording, frameCount, commandCount, startedMs, start, stop, toggle, clear, getSession, exportSession, importSession };
}
