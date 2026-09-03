"use client";

/**
 * useCorrections — the client half of the operator learning loop.
 *
 * The live detector is a frozen COCO-80 model that has never seen this harbor. When the pilot relabels
 * a box ("that 'bottle' is our own tower stanchion", "that 'couch' is a moored skiff"), this hook is
 * what makes that judgement outlive the frame: it POSTs the correction — label, normalized box, source
 * geometry, true bearing, and optionally a crop of the actual pixels — to the owner-gated capture log.
 *
 * IT CAPTURES; IT DOES NOT IMPROVE THE LIVE MODEL. Nothing here changes inference on the Jetson. The
 * value is realized only when someone runs an offline fine-tune/distill on the exported dataset and
 * ships new weights. The UI must say it that way.
 *
 * `count` is always read back from the server, never incremented locally — a badge that says
 * "47 corrections captured" has to mean 47 lines exist on disk, not 47 optimistic submits, some of
 * which may have failed to write.
 *
 * Nothing throws into React: a failed submit resolves `false` and surfaces `lastError`.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const ENDPOINT = "/api/fusarium/gcs/camera/corrections";

/** Longest edge of a saved crop. Big enough to keep real detail for training, small enough that the
 *  data URL stays well under the server's ~4 MB cap even for a full-frame box. */
const MAX_CROP_PX = 1600;
/** Below this the crop is a few pixels of noise — worthless as a training example. */
const MIN_CROP_PX = 8;
const CROP_QUALITY = 0.9;

export interface CorrectionInput {
  feedId: string;
  source: string;
  rawClass: string;
  correctedLabel: string;
  bbox: { x: number; y: number; w: number; h: number };
  frameW: number;
  frameH: number;
  bearingTrueDeg?: number | null;
  note?: string;
  snapshotDataUrl?: string;
}

export interface CorrectionsApi {
  submit: (c: CorrectionInput) => Promise<boolean>;
  pending: boolean;
  lastError: string | null;
  count: number;
  refresh: () => void;
}

interface CountResponse {
  count?: number;
}

interface ErrorResponse {
  error?: string;
  field?: string;
  detail?: string;
}

export function useCorrections(): CorrectionsApi {
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [nonce, setNonce] = useState(0);

  // Guard every setState behind mount state — a submit can outlive the panel the operator closed.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(() => { setNonce((n) => n + 1); }, []);

  // Count-only read: ?limit=1 still returns the TOTAL in `count`, so the badge costs one tiny row.
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${ENDPOINT}?limit=1`, { cache: "no-store", signal: ac.signal });
        if (!res.ok) return; // a gate/transport failure must not zero a real on-disk count
        const body = (await res.json()) as CountResponse;
        const n = typeof body.count === "number" && Number.isFinite(body.count) ? body.count : null;
        if (n !== null && mountedRef.current) setCount(n);
      } catch {
        // Aborted on unmount, or a transient failure. Leave the last known-good count alone.
      }
    })();
    return () => ac.abort();
  }, [nonce]);

  const submit = useCallback(async (c: CorrectionInput): Promise<boolean> => {
    setPending(true);
    setLastError(null);
    try {
      // Omit optional keys entirely when absent — the route rejects unknown/None-shaped fields rather
      // than coercing them, so an explicit `undefined` must not become a `null` we did not mean.
      const payload: Record<string, unknown> = {
        feedId: c.feedId,
        source: c.source,
        // BROWSER submit time, NOT the Jetson inference clock — CorrectionInput does not carry the
        // frame's tMs, and inventing a more precise-looking value would be a lie. At the 1 Hz
        // detection poll this trails the frame it describes by up to ~1-2 s; treat it as "about when
        // the operator saw this", never as sensor time.
        tMs: Date.now(),
        rawClass: c.rawClass,
        correctedLabel: c.correctedLabel,
        bbox: c.bbox,
        frameW: c.frameW,
        frameH: c.frameH,
      };
      if (c.bearingTrueDeg !== undefined) payload.bearingTrueDeg = c.bearingTrueDeg;
      if (c.note !== undefined) payload.note = c.note;
      if (c.snapshotDataUrl !== undefined) payload.snapshotDataUrl = c.snapshotDataUrl;

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as ErrorResponse;
          if (body.error) detail = body.field ? `${body.error}: ${body.field}` : body.error;
          if (body.detail) detail = `${detail} (${body.detail})`;
        } catch {
          // Non-JSON error body (proxy/HTML) — the status code is all we honestly have.
        }
        if (mountedRef.current) setLastError(detail);
        return false;
      }

      // Only now is the row really on disk; re-read the authoritative count.
      refresh();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "network error";
      if (mountedRef.current) setLastError(msg);
      return false;
    } finally {
      if (mountedRef.current) setPending(false);
    }
  }, [refresh]);

  return { submit, pending, lastError, count, refresh };
}

/**
 * cropDataUrlFromImage — cut the corrected box out of the live frame as a JPEG data URL.
 *
 * WHY: a label without pixels is not a training example. The camera feeds are served through the
 * same-origin proxy (/api/fusarium/gcs/camera/...), so the canvas is normally untainted and this
 * succeeds; if the caller ever points at a cross-origin element the canvas export throws SecurityError.
 *
 * `pad` is a fraction of the BOX size added on every side (default 6%) — a little surrounding context
 * makes a far better training crop than a box shaved to the object's edge.
 *
 * Returns null — never throws — on any failure. A lost crop must degrade to a correction WITHOUT an
 * image; it must never cost us the operator's label.
 */
export function cropDataUrlFromImage(
  img: HTMLImageElement | HTMLCanvasElement,
  bbox: { x: number; y: number; w: number; h: number },
  pad?: number,
): string | null {
  try {
    if (typeof document === "undefined" || !img) return null;

    // Source dimensions: decoded pixels for an <img>, backing store for a <canvas>.
    const srcW = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const srcH = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) return null;
    // A still-loading <img> has no pixels to copy yet.
    if (img instanceof HTMLImageElement && !img.complete) return null;

    const { x, y, w, h } = bbox;
    if (![x, y, w, h].every((v) => typeof v === "number" && Number.isFinite(v))) return null;
    if (w <= 0 || h <= 0) return null;

    const padFrac = typeof pad === "number" && Number.isFinite(pad) && pad >= 0 ? pad : 0.06;
    const padX = w * padFrac;
    const padY = h * padFrac;

    // Clamp to the frame. This is pixel geometry, not data coercion: we cannot copy pixels that the
    // sensor never produced, and the recorded bbox in the JSONL is the un-clamped original.
    const sx = Math.max(0, Math.round((x - padX) * srcW));
    const sy = Math.max(0, Math.round((y - padY) * srcH));
    const sx2 = Math.min(srcW, Math.round((x + w + padX) * srcW));
    const sy2 = Math.min(srcH, Math.round((y + h + padY) * srcH));
    const sw = sx2 - sx;
    const sh = sy2 - sy;
    if (sw < MIN_CROP_PX || sh < MIN_CROP_PX) return null;

    const scale = Math.min(1, MAX_CROP_PX / Math.max(sw, sh));
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

    // Throws SecurityError on a CORS-tainted canvas — caught below, correction still goes through.
    const url = canvas.toDataURL("image/jpeg", CROP_QUALITY);
    return url.startsWith("data:image/jpeg;base64,") ? url : null;
  } catch {
    return null;
  }
}
