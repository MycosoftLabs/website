"use client";

/**
 * useModelComparison — the multi-model data layer for one camera feed.
 *
 * Polls `/api/fusarium/gcs/camera/:feedId/models` and hands back EVERY model's opinion of the same
 * frame, unmerged and attributed. Fusion/scoring happens downstream in lib/psathyrella/modelFusion;
 * this hook's only jobs are transport, normalization, and not destabilizing a live 20fps console.
 *
 * WHY MULTIPLE MODELS: one detector cannot detect its own hallucination — an RF-DETR fine-tune seeded
 * from 36 same-scene frames reported "bird" at 0.95 confidence in an indoor room. Independent
 * agreement between differently-trained models is evidence; a box only one model sees is a
 * hypothesis. Keeping the results SEPARATE here is what preserves that distinction, so never merge
 * or dedupe in this file.
 *
 * WHY POLLING, NOT SSE: the Jetson detector is a one-shot JSON snapshot — it ignores
 * `Accept: text/event-stream` and closes after one body. An EventSource would connect, never fire
 * onmessage, and read as "connected but nothing detected", which is worse on an operator console
 * than an honest failure. Swap the transport here only if Cursor ships a real stream; the returned
 * shape is the contract.
 *
 * NORMALIZATION: the route returns boxes in ABSOLUTE PIXELS plus the detector's own per-source frame
 * dimensions. If those dimensions are absent we place NO boxes rather than guessing a resolution — a
 * box normalized against an assumed 1920x1080 sits on the wrong bearing the moment capture resolution
 * changes, and a misplaced box reads as a real contact in the wrong direction. Unlike
 * useCameraDetections this hook takes NO caller-supplied dims: a browser-measured <img> size is
 * per-surface and would be wrong for whichever models ran on a different surface.
 *
 * ...and when that happens we say so LOUDLY (see UNPLACEABLE_FRAME below). Silently returning empty
 * detection lists would put every model in the fusion denominator as "ran and reported nothing" —
 * a manufactured all-clear over a frame in which the detectors may well have seen a hull.
 *
 * STALENESS CONTRACT (important): on a failed poll the last results are RETAINED and `connected`
 * flips false. That keeps a one-off LAN stall from strobing the scoreboard, but it means the caller
 * MUST gate on `connected`/`lastMs` before presenting anything as current — retained rows describe
 * the last frame that arrived, not the water now.
 *
 * Retention is scoped to ONE feed and to the enabled state, and nothing else. Changing `feedId` or
 * switching the feature off clears immediately: those rows belong to a different camera's coordinate
 * space (or to a pipeline the operator just turned off), and carrying them over would put the ring
 * camera's contacts on the Target view while still reading as connected.
 *
 * Dark by default: fully INERT (no fetch at all) unless NEXT_PUBLIC_FUSARIUM_GCS_CAM_AI === "1", so a
 * half-built inference pipeline can never put marks on an operator's screen.
 *
 * Freeze-safety: exactly ONE setState per poll, polling pauses while the tab is hidden, and the
 * in-flight request is aborted on unmount.
 */

import { useEffect, useState } from "react";
import type { CameraDetection } from "@/lib/fusarium/gcs/contract";
import type { ModelResult } from "@/lib/fusarium/gcs/modelFusion";

export interface ModelComparisonState {
  /** One entry per model the backend reported, in backend order. Never merged. */
  results: ModelResult[];
  /** Source-frame dimensions the PIXEL boxes were normalized against; null when unreported. */
  frameW: number | null;
  frameH: number | null;
  connected: boolean;
  enabled: boolean;
  /** LOCAL epoch-ms arrival time (not the Jetson inference clock) — use for staleness. */
  lastMs: number | null;
}

interface RawDetection {
  id?: string;
  trackId?: string | null;
  cls?: string;
  conf?: number;
  bbox?: { x?: number; y?: number; w?: number; h?: number };
  bearingDeg?: number | null;
  rangeM?: number | null;
  tile?: number | null;
}

interface RawModel {
  modelId?: string;
  latencyMs?: number | null;
  error?: string | null;
  detections?: RawDetection[];
}

interface RawPayload {
  tMs?: number | null;
  frameW?: number | null;
  frameH?: number | null;
  bboxUnits?: string;
  models?: RawModel[];
}

const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Multi-model inference is serial on one Jetson, so it is slower than the single-model loop. */
const DEFAULT_REFRESH_MS = 1500;

/**
 * What we report for EVERY model when the payload carries pixel boxes but no frame dimensions.
 *
 * The models ran; we simply cannot place what they saw. Surfacing that as `error` is deliberate: it
 * is the only channel `fuseModels` honours, and it makes the frame come back as modelsRan = 0 —
 * "the detection pipeline produced nothing usable" — instead of N models each credited with an
 * empty, authoritative-looking "saw nothing". We accept a false OUTAGE over a false ALL-CLEAR; on an
 * operator console a missed contact is the dangerous direction, and a detector that cannot report
 * its own frame size is a genuinely broken pipeline either way.
 *
 * Applied uniformly, including to models that happened to report zero boxes: crediting those as
 * healthy would leave a partial all-clear standing and would seed the fusion denominator with
 * models whose output we could not have used anyway.
 */
const UNPLACEABLE_FRAME =
  "detector did not report frame dimensions — boxes could not be placed, so this model's output was excluded";

/** Module scope so it is not a hook dependency; the `feedId` it belongs to is filled in per use. */
const EMPTY: Omit<ModelComparisonState, "enabled"> = Object.freeze({
  results: [],
  frameW: null,
  frameH: null,
  connected: false,
  lastMs: null,
});

export function useModelComparison(
  feedId: string,
  opts?: { enabled?: boolean; refreshMs?: number },
): ModelComparisonState {
  const enabled = process.env.NEXT_PUBLIC_FUSARIUM_GCS_CAM_AI === "1" && opts?.enabled !== false;
  // Floor of 600ms: below that the poll outruns N-model inference and just queues work on the Jetson.
  const refreshMs = Math.max(600, opts?.refreshMs ?? DEFAULT_REFRESH_MS);

  // ONE state object, so a poll is exactly one render — this rides over live video. `feedId` is held
  // INSIDE the state (not returned) purely so we can tell whose camera the retained rows describe.
  const [state, setState] = useState<{
    results: ModelResult[];
    frameW: number | null;
    frameH: number | null;
    connected: boolean;
    lastMs: number | null;
    feedId: string | null;
  }>({ results: [], frameW: null, frameH: null, connected: false, lastMs: null, feedId: null });

  useEffect(() => {
    if (!enabled) {
      // Switched off mid-session: drop the rows as well as the connection flag. The retained-results
      // contract covers transient stalls on a LIVE feed — it must never let a disabled AI pipeline
      // keep contacts on an operator's screen, which is the whole point of the dark-by-default gate.
      setState((prev) => (prev.results.length === 0 && !prev.connected ? prev : { ...EMPTY, feedId: null }));
      return;
    }
    // Feed switch: the retained rows describe a DIFFERENT camera with its own coordinate space and
    // its own bearings. Carrying them across for the ~1 round trip until the first poll lands would
    // paint the ring camera's contacts onto the Target view — with `connected` still true, so a
    // consumer gating on staleness would read them as current. Clear first, then poll.
    setState((prev) => (prev.feedId === feedId ? prev : { ...EMPTY, feedId }));

    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ac = new AbortController();

    const markDisconnected = () => {
      if (stop) return;
      // Retain the last results (see the staleness contract above) and skip the render entirely when
      // nothing changed — a dead link must not repaint the console every 1.5s.
      setState((prev) => (prev.connected ? { ...prev, connected: false } : prev));
    };

    const tick = async () => {
      if (stop) return;
      // Don't burn the Jetson (N models, CPU/GPU shared) or the LAN while nobody is looking.
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(tick, refreshMs);
        return;
      }
      try {
        const res = await fetch(`/api/fusarium/gcs/camera/${feedId}/models`, { cache: "no-store", signal: ac.signal });
        if (!res.ok) {
          markDisconnected();
        } else {
          const raw = (await res.json()) as RawPayload;
          const w = fin(raw.frameW);
          const h = fin(raw.frameH);
          const pixels = raw.bboxUnits !== "normalized";
          // No dims for a pixel payload → boxes cannot be placed honestly. The backend answered, so
          // we stay connected, but no model's output is admitted and each one says why.
          const canPlace = !pixels || (w !== null && h !== null && w > 0 && h > 0);

          const results: ModelResult[] = (raw.models ?? []).flatMap((m, mi) => {
            const modelId = typeof m.modelId === "string" && m.modelId.length > 0 ? m.modelId : `model_${mi + 1}`;
            // A real upstream failure wins over the placement failure — it is the more specific fact
            // and the operator should see the actual crash message, not our downstream consequence.
            const upstreamError = typeof m.error === "string" && m.error.length > 0 ? m.error : null;
            const error = upstreamError ?? (canPlace ? null : UNPLACEABLE_FRAME);
            const detections: CameraDetection[] = canPlace && !error
              ? (m.detections ?? []).flatMap((d, i) => {
                  const x = fin(d.bbox?.x), y = fin(d.bbox?.y), bw = fin(d.bbox?.w), bh = fin(d.bbox?.h);
                  const conf = fin(d.conf);
                  if (x === null || y === null || bw === null || bh === null || conf === null || !d.cls) return [];
                  const sx = pixels ? x / (w as number) : x;
                  const sy = pixels ? y / (h as number) : y;
                  const sw = pixels ? bw / (w as number) : bw;
                  const sh = pixels ? bh / (h as number) : bh;
                  return [{
                    id: d.id ?? `m${mi}_det_${i}`,
                    trackId: d.trackId ?? null,
                    cls: d.cls,
                    conf,
                    bbox: { x: sx, y: sy, w: sw, h: sh },
                    bearingDeg: fin(d.bearingDeg),
                    rangeM: fin(d.rangeM),
                    tile: fin(d.tile),
                  }];
                })
              : [];
            return [{ modelId, detections, latencyMs: fin(m.latencyMs), error }];
          });

          if (!stop) setState({ results, frameW: w, frameH: h, connected: true, lastMs: Date.now(), feedId });
        }
      } catch {
        // Aborted on unmount, or a transient LAN stall — never throw into React.
        markDisconnected();
      }
      if (!stop) timer = setTimeout(tick, refreshMs);
    };

    void tick();
    return () => { stop = true; ac.abort(); if (timer) clearTimeout(timer); };
  }, [enabled, feedId, refreshMs]);

  return {
    results: state.results,
    frameW: state.frameW,
    frameH: state.frameH,
    connected: state.connected,
    enabled,
    lastMs: state.lastMs,
  };
}
