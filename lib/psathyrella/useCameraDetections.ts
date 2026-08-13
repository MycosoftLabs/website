"use client";

/**
 * useCameraDetections — the AI-overlay data layer for one camera feed.
 *
 * Polls `/api/psathyrella/camera/:feedId/detections` (owner-gated proxy to the Jetson detector) and
 * hands the newest DetectionFrame to whatever surface draws it. The browser NEVER infers and never
 * invents a box: no data = no overlay.
 *
 * WHY POLLING, NOT SSE: the Jetson detector (`:8792/detect`) is a one-shot JSON snapshot — it ignores
 * `Accept: text/event-stream` and closes after one body. An EventSource against it would connect,
 * never fire onmessage, and read as "connected but nothing detected", which on an operator console is
 * worse than an honest failure. If Cursor later ships a real event stream, swap the transport here
 * only — the returned shape is the contract.
 *
 * NORMALIZATION: the detector reports boxes in ABSOLUTE PIXELS on the source composite and does not
 * report the frame size. So the caller must pass the live frame dims (the composite <img>'s
 * naturalWidth/naturalHeight). Without them we return NO detections rather than guessing a resolution
 * — a box placed against an assumed 1920x1080 would sit on the wrong bearing the moment capture
 * resolution changes, and a misplaced box reads as a real contact in the wrong direction.
 *
 * Dark by default: fully INERT (no fetch at all) unless NEXT_PUBLIC_PSATHYRELLA_CAM_AI === "1", so a
 * half-built inference pipeline can never put marks on an operator's screen.
 *
 * Freeze-safety (this rides over live 20fps video): exactly ONE setState per poll, polling stops while
 * the tab is hidden, and an in-flight request is aborted on unmount.
 *
 * FRAME CLOCK — DO NOT "FIX" THIS BACK: `frame.tMs` is the DETECTOR's inference clock and stays NULL
 * when the backend did not report one. The BFF route deliberately converts a missing/unparseable
 * Jetson `ts` to null "(NOT Date.now()) so the client can distinguish 'backend didn't say' from a real
 * inference timestamp" — this hook used to re-add exactly that fallback one hop later, destroying the
 * distinction. It matters because `useContactIntel` uses `tMs` as the sole clock of the temporal
 * reasoner AND dedupes frames with `lastT === tMs`: a wall-clock stamp is never equal twice, so a
 * detector re-serving one frozen frame for 30 s was ingested as ~30 distinct sightings and inflated
 * observation counts, dwell and duty cycle off a single stale frame. Local ARRIVAL time is carried
 * honestly and separately as `lastMs` — use that for staleness, never for sensor time.
 */

import { useEffect, useRef, useState } from "react";
import type { CameraDetection, DetectionFrame } from "@/lib/psathyrella/contract";

/**
 * The frame as this hook returns it. Identical to `DetectionFrame` except that `tMs` is widened to
 * `number | null`: the contract type still declares a non-null Jetson clock, but the wire genuinely
 * omits it, and a frame with no clock must say so rather than borrow the browser's. (The contract
 * itself should be widened to match — see `contract.ts` `DetectionFrame.tMs`.)
 */
export type CameraDetectionFrame = Omit<DetectionFrame, "tMs"> & { tMs: number | null };

export interface CameraDetectionsState {
  frame: CameraDetectionFrame | null;
  /** Backend's own licence status for the running model — surfaced so a non-shippable build is visible. */
  license: string | null;
  connected: boolean;
  enabled: boolean;
  /** LOCAL epoch-ms arrival time (not the Jetson inference clock) — use for staleness. */
  lastMs: number | null;
  /**
   * Did the newest frame carry the detector's own inference clock? `null` = no frame yet.
   * FALSE means the temporal picture (`useContactIntel`) is BLOCKED for this feed — it ingests
   * nothing without a frame clock. Say so on screen: a temporal layer that silently stops updating
   * reads as "nothing out there", which is an all-clear nobody measured.
   */
  frameClockReported: boolean | null;
}

interface RawFrame {
  tMs?: number | null;
  frameW?: number | null;
  frameH?: number | null;
  bboxUnits?: string;
  model?: string | null;
  device?: string | null;
  deepstream?: boolean;
  license?: string | null;
  note?: string | null;
  detections?: Array<{
    id?: string;
    trackId?: string | null;
    cls?: string;
    conf?: number;
    bbox?: { x?: number; y?: number; w?: number; h?: number };
    bearingDeg?: number | null;
    rangeM?: number | null;
    tile?: number | null;
  }>;
}

const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function useCameraDetections(
  feedId: string,
  opts?: { enabled?: boolean; frameW?: number | null; frameH?: number | null; refreshMs?: number },
): CameraDetectionsState {
  const enabled = process.env.NEXT_PUBLIC_PSATHYRELLA_CAM_AI === "1" && opts?.enabled !== false;
  const refreshMs = Math.max(400, opts?.refreshMs ?? 1000);
  const [state, setState] = useState<{ frame: CameraDetectionFrame | null; atMs: number | null }>({ frame: null, atMs: null });
  const [connected, setConnected] = useState(false);
  const [license, setLicense] = useState<string | null>(null);

  // Frame dims change as the stream comes up; keep them in a ref so a resize doesn't restart polling.
  const dimsRef = useRef<{ w: number | null; h: number | null }>({ w: null, h: null });
  dimsRef.current = { w: fin(opts?.frameW), h: fin(opts?.frameH) };

  useEffect(() => {
    if (!enabled) { setConnected(false); return; }
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ac = new AbortController();

    const tick = async () => {
      if (stop) return;
      // Don't burn the Jetson (CPU inference) or the LAN while nobody is looking.
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(tick, refreshMs);
        return;
      }
      try {
        const res = await fetch(`/api/psathyrella/camera/${feedId}/detections`, { cache: "no-store", signal: ac.signal });
        if (!res.ok) {
          if (!stop) setConnected(false);
        } else {
          const raw = (await res.json()) as RawFrame;
          // The backend's per-source frame dims are AUTHORITATIVE when present. A rendered <img> is
          // letterboxed/scaled (the pano is 3840x540 shown in a wide strip), so normalizing pixel boxes
          // against browser-measured size would misplace every box on the stitched surfaces.
          const dims = dimsRef.current;
          const w = fin(raw.frameW) ?? dims.w;
          const h = fin(raw.frameH) ?? dims.h;
          const pixels = raw.bboxUnits !== "normalized";
          // No dims for a pixel payload → we cannot place boxes honestly. Report connected (the
          // backend answered) but hold an empty detection list.
          const canPlace = !pixels || (w !== null && h !== null && w > 0 && h > 0);
          const detections: CameraDetection[] = canPlace
            ? (raw.detections ?? []).flatMap((d, i) => {
                const x = fin(d.bbox?.x), y = fin(d.bbox?.y), bw = fin(d.bbox?.w), bh = fin(d.bbox?.h);
                const conf = fin(d.conf);
                if (x === null || y === null || bw === null || bh === null || conf === null || !d.cls) return [];
                const sx = pixels ? x / (w as number) : x;
                const sy = pixels ? y / (h as number) : y;
                const sw = pixels ? bw / (w as number) : bw;
                const sh = pixels ? bh / (h as number) : bh;
                return [{
                  id: d.id ?? `det_${i}`,
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
          if (!stop) {
            setConnected(true);
            if (typeof raw.license === "string" && raw.license !== license) setLicense(raw.license);
            setState({
              frame: {
                feedId,
                // NULL when the backend reported no inference clock — see FRAME CLOCK above. The
                // browser's clock is `atMs`/`lastMs`; stamping it here would make a frozen frame look
                // like a new sighting every poll.
                tMs: fin(raw.tMs),
                frameW: w,
                frameH: h,
                model: raw.model ?? null,
                sahi: null,
                detections,
              },
              atMs: Date.now(),
            });
          }
        }
      } catch {
        // Aborted on unmount, or a transient LAN stall — never throw into React.
        if (!stop) setConnected(false);
      }
      if (!stop) timer = setTimeout(tick, refreshMs);
    };

    void tick();
    return () => { stop = true; ac.abort(); if (timer) clearTimeout(timer); };
  }, [enabled, feedId, refreshMs, license]);

  return {
    frame: state.frame,
    connected,
    enabled,
    license,
    lastMs: state.atMs,
    // Derived, not stored — keeps the one-setState-per-poll freeze rule intact.
    frameClockReported: state.frame ? state.frame.tMs !== null : null,
  };
}
