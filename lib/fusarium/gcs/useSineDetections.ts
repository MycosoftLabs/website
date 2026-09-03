"use client";

/**
 * Live SINE detections for the buoy, isolated (own SWR, no CREP providers).
 *
 * Chain: acoustic library filtered to the buoy → the NEWEST blob that has a saved analysis →
 * detector_events. Each event carries acoustic_domain (water=hydrophone, air=MEMS mic,
 * ground=geophone) + confidence.
 *
 * TWO THINGS THIS HOOK REFUSES TO CONFLATE — it used to conflate both:
 *
 * 1. ANALYZER READINESS IS NOT SENSOR LIVENESS. `live` was `model_ready || inference_ready || …`
 *    off /api/mindex/sine/status — torch and onnxruntime being loaded on a MINDEX server, which is
 *    unconditionally true today. That drove the widget's green "listening" LED next to chips named
 *    "Hydrophone" and "MEMS mic" while the buoy's own mic answers
 *    {hardware:"absent", channels:0, note:"INMP441 not publishing yet…"} and the telemetry
 *    envelope's comms.hydrophone is all nulls. A green LED plus the word "listening" over two
 *    unfitted sensors reads as "both are up and hear nothing" — an all-clear rendered from absent
 *    hardware. `live` now means exactly one thing: an acoustic sensor ON THE BUOY is confirmed
 *    present. Server-side model readiness is still reported, under its own name, as `analyzerReady`.
 *
 * 2. A STORED ANALYSIS IS NOT WHAT THE BUOY HEARS NOW. The chain reads a saved analysis of a NAS
 *    file that may be days old, and nothing carried its age — so a three-day-old vessel transit
 *    rendered as a present acoustic contact, every session, forever. Events are now dated from the
 *    capture and split: only captures inside FRESH_WINDOW_MS are `detections`; anything older (or
 *    undated) stays available as `staleDetections` with `analysedAtMsAgo`, for a caller that can
 *    label it as past rather than present.
 *
 * PRESENT / ABSENT / UNKNOWN are three states and are never collapsed. A probe that has not
 * answered, or answered 502/503, is UNKNOWN — never "absent", never an all-clear. The mic and the
 * hydrophone are also kept per-source rather than merged into one blurred flag (the same defect
 * already fixed in FusionPlot's parseTof, where one absent group spoke for a live one).
 */

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { normalizeSineDomain, type SineDetection } from "./sineClasses";
import type { HydrophoneState } from "./contract";

/**
 * How recent a capture must be for its saved analysis to count as "what the buoy is hearing now".
 * 15 minutes: long enough to cover record → NAS upload → SINE inference over a link that is often
 * store-and-forward, short enough that nothing an operator would describe as "earlier today" can
 * present itself as a present contact. The payload carries no per-event clock, so the capture time
 * is deliberately the only freshness rule here.
 */
const FRESH_WINDOW_MS = 15 * 60 * 1000;

/**
 * Age re-check cadence. Date.now() is not reactive and SWR re-renders only when a payload actually
 * changes, so without this a blob that crosses the freshness line while the page sits open would go
 * on rendering as current. 30 s is far finer than the 15-minute window it polices.
 */
const AGE_TICK_MS = 30_000;

/** The mic is a hardware-presence check, not a signal feed — it does not need a fast poll. */
const MIC_POLL_MS = 15_000;

const f = (u: string) =>
  fetch(u, { cache: "no-store", headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

// Every backend field is treated as untrusted — same helpers the fusion plot uses.
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** HTTP status alongside the body, so "the service said absent" is distinguishable from "no answer". */
interface Probe {
  status: number;
  body: unknown;
}

const probe = async (u: string): Promise<Probe> => {
  try {
    const res = await fetch(u, { cache: "no-store", headers: { accept: "application/json" } });
    const body: unknown = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch {
    // A transport failure tells us nothing about the hardware. status 0 falls into the UNKNOWN
    // branch below; it must never become "absent".
    return { status: 0, body: null };
  }
};

export type SineSensorPresence = "present" | "absent" | "unknown";

/** One acoustic sensor's state, in words the operator can be shown verbatim. */
export interface SineSensorState {
  presence: SineSensorPresence;
  /** WHY we say that — the sensor service's own `note` when it gave one, never a guess. */
  reason: string;
}

/**
 * The buoy's above-water MEMS mic, read from the sensor service's own `hardware` field.
 * Pass-through semantics: whatever :8794/mic says about itself is what we report.
 */
function micStateFrom(p: Probe | undefined): SineSensorState {
  if (!p) return { presence: "unknown", reason: "querying the mic service — state not yet known" };
  if (p.status === 503) return { presence: "unknown", reason: "mic service not configured — presence unverified" };
  if (p.status !== 200) {
    const how = p.status === 0 ? "no response" : `HTTP ${p.status}`;
    return { presence: "unknown", reason: `mic service unreachable (${how}) — presence unverified` };
  }
  const body = isRecord(p.body) ? p.body : null;
  if (!body) return { presence: "unknown", reason: "mic service answered without a JSON body — presence unverified" };
  const hw = str(body.hardware)?.toLowerCase() ?? null;
  const note = str(body.note);
  if (hw === "present") return { presence: "present", reason: note ?? "MEMS mic reports hardware present" };
  if (hw === "absent" || hw === "configured_absent") return { presence: "absent", reason: note ?? "MEMS mic not fitted" };
  return { presence: "unknown", reason: "mic service did not report a hardware state" };
}

/**
 * The underwater hydrophone, read from the MAS telemetry envelope the caller already holds.
 *
 * A null level is NOT proof of absence: the envelope ships this block all-null both when the array
 * is unfitted and when it simply has not been wired into the envelope yet. Unfitted-vs-unwired is
 * genuinely unknown from here, so it is reported as unknown.
 */
function hydrophoneStateFrom(h: HydrophoneState | null | undefined): SineSensorState {
  if (!h) return { presence: "unknown", reason: "no telemetry supplied — hydrophone state unverified" };
  if (h.levelDb != null) return { presence: "present", reason: `hydrophone reporting ${h.levelDb.toFixed(1)} dB` };
  return { presence: "unknown", reason: "hydrophone level not reported — fitted-or-not unverified" };
}

/** Epoch-ms of when the sound was CAPTURED, falling back to the file's mtime. Null when undated. */
function blobCapturedMs(b: unknown): number | null {
  if (!isRecord(b)) return null;
  const raw = str(b.capture_time_utc) ?? str(b.modified_at);
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/**
 * @param deviceToken library query filter — the buoy's own captures only. Deliberately NOT widened
 *   to the 2 180 acoustic rows in the library: those are MBARI Pacific-archive WAVs, and rendering
 *   archive audio as this buoy's live acoustic ID would be a fabrication, not a fix for emptiness.
 * @param hydrophone pass `telemetry.comms.hydrophone` so an array that starts publishing levels can
 *   light the widget. Omitted → the hydrophone reads UNKNOWN, never absent.
 */
export function useSineDetections(deviceToken = "psathyrella", hydrophone?: HydrophoneState | null) {
  const { data: status } = useSWR("/api/mindex/sine/status", f, { refreshInterval: 12000, revalidateOnFocus: false });
  /**
   * SINE's server-side model is loaded and can classify. This says NOTHING about whether the buoy
   * has a microphone — it is true right now on a buoy whose mic is not fitted — so it must never
   * drive a "listening" indicator. Exposed under its own name so it can be shown as its own chip.
   */
  const analyzerReady = !!(status && (status.ok ?? true) && (status.model_ready || status.inference_ready || status.model_loaded || status.prototype_catalog_ready));

  // The two acoustic sensors, each answering for itself.
  const { data: micProbe } = useSWR<Probe>("/api/fusarium/gcs/fusion-sensors/mic", probe, {
    refreshInterval: MIC_POLL_MS,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
  const mic = micStateFrom(micProbe);
  const hydro = hydrophoneStateFrom(hydrophone);

  /**
   * "The buoy is hearing" — true only when an acoustic sensor is CONFIRMED present. Absent and
   * unknown both stay false, because neither justifies a green light; a caller that needs to tell
   * those two apart reads `sensors` (an unknown sensor must not be drawn as an absent one).
   * Not ANDed with `analyzerReady`: a fitted mic is listening whether or not SINE can classify it.
   */
  const live = mic.presence === "present" || hydro.presence === "present";

  const { data: lib } = useSWR(
    `/api/natureos/mindex/library?category=acoustic&limit=4&q=${encodeURIComponent(deviceToken)}`,
    f,
    { refreshInterval: 20000, revalidateOnFocus: false }
  );
  const blobs: unknown[] = (lib?.blobs || lib?.items || []) as unknown[];

  // NEWEST analysed capture, not whatever the library happened to list first — the old `find()` made
  // the "latest blob" this chain claims to read a coincidence of upstream ordering.
  const chosen = useMemo(() => {
    const analysed = blobs.filter((b) => isRecord(b) && typeof b.analysis_id === "string" && b.analysis_id !== "");
    if (analysed.length === 0) return null;
    const sorted = [...analysed].sort((a, b) => (blobCapturedMs(b) ?? -Infinity) - (blobCapturedMs(a) ?? -Infinity));
    const top = sorted[0] as Record<string, unknown>;
    return { analysisId: String(top.analysis_id), capturedMs: blobCapturedMs(top) };
  }, [blobs]);

  const analysisId = chosen?.analysisId ?? null;

  const { data: analysis } = useSWR(
    analysisId ? `/api/mindex/sine/blobs/${analysisId}/analysis` : null,
    f,
    { refreshInterval: 20000, revalidateOnFocus: false }
  );

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), AGE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const capturedMs = chosen?.capturedMs ?? null;
  /** Age of the capture these events came from. Null = the library dated neither the capture nor the file. */
  const analysedAtMsAgo = capturedMs == null ? null : Math.max(0, nowMs - capturedMs);
  // An UNDATED capture is never fresh. We cannot show a sound of unknown age as a present contact.
  const fresh = analysedAtMsAgo != null && analysedAtMsAgo <= FRESH_WINDOW_MS;

  const analysed = useMemo<SineDetection[]>(() => {
    const events: unknown[] = (analysis?.detector_events || analysis?.events || []) as unknown[];
    if (!Array.isArray(events) || events.length === 0) return [];
    // Collapse repeats of the same class+domain → keep max confidence + a count.
    const map = new Map<string, SineDetection>();
    for (const raw of events) {
      const e: Record<string, unknown> = isRecord(raw) ? raw : {};
      const target = str(e.event_type) ?? str(e.label) ?? str(e.event_family) ?? "unknown";
      const domain = normalizeSineDomain(str(e.acoustic_domain));
      const conf = num(e.confidence) ?? num(e.score) ?? 0;
      // A zero/absent confidence is not a weak detection — it is no detection. Never plotted.
      if (conf <= 0) continue;
      const k = `${domain}:${target}`;
      const prev = map.get(k);
      if (prev) {
        prev.count = (prev.count ?? 1) + 1;
        prev.confidence = Math.max(prev.confidence, conf);
      } else {
        // Age of the CLIP, not of the event inside it — the payload carries no per-event clock, so
        // this is the youngest the sound can honestly be claimed to be.
        map.set(k, { id: k, target, domain, confidence: conf, count: 1, atMsAgo: analysedAtMsAgo });
      }
    }
    return Array.from(map.values());
  }, [analysis, analysedAtMsAgo]);

  /**
   * `detections` is contractually "what the buoy is hearing NOW" (SineWidget renders it under that
   * exact sentence), so a capture older than the window does not belong in it. Nothing is thrown
   * away: the same events are returned as `staleDetections` with their age, so a caller can render
   * them under a "last analysed …" header instead of as a live contact.
   */
  const detections: SineDetection[] = fresh ? analysed : [];
  const staleDetections: SineDetection[] = fresh ? [] : analysed;

  return {
    detections,
    live,
    /** Per-source, never merged — an absent mic must not speak for the hydrophone or vice versa. */
    sensors: { mic, hydrophone: hydro },
    /** SINE's model is loaded server-side. A capability statement, not a sensor statement. */
    analyzerReady,
    staleDetections,
    analysedAtMsAgo,
    fresh,
  };
}
