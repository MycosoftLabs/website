/**
 * GET /api/psathyrella/camera/:feedId/detections — on-board AI object detections (owner-only).
 *
 * Same-origin, owner-gated proxy to the Jetson detector so the GCS can draw boxes over the ring/target
 * video without exposing the Jetson IP (and so it works on the iPad over HTTPS).
 *
 * SHAPE OF THE REAL BACKEND (verified live Aug 02 against :8792/detect — do not assume otherwise):
 *   { ok, ts: "2026-08-02T05:00:19.878376+00:00", engine: "ultralytics:yolo11n.pt", deepstream: false,
 *     device: "cpu", note: "...", detections: [ { source: "quad360", class: "couch",
 *     confidence: 0.376, bbox: [x1, y1, x2, y2] } ] }
 *
 * Two things that matter and are easy to get wrong:
 *  1. It is a ONE-SHOT JSON snapshot, NOT an SSE stream — it ignores `Accept: text/event-stream` and
 *     closes after one body. The client POLLS; it must not open an EventSource.
 *  2. `bbox` is ABSOLUTE PIXELS in CORNER form [x1,y1,x2,y2] on the source composite — NOT normalized,
 *     NOT x/y/w/h. We convert corner→size here but deliberately keep PIXELS: the frame dimensions are
 *     not in the payload, so only the browser (which holds the live <img> naturalWidth/Height) can
 *     normalize honestly. Hardcoding 1920x1080 here would silently misplace every box the day the
 *     capture resolution changes.
 *
 * No synthetic detections, ever: an unconfigured upstream is a 503 and a dead one is a 502, so the
 * overlay stays empty rather than inventing contacts.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The detector now tags every box with the surface it was computed on and reports that surface's frame
// size, so pano and bev are first-class detection sources — not just video. Each has its OWN coordinate
// space (pano 3840x540, bev 800x800), which is why boxes must never be cross-projected between them.
const FEEDS = new Set(["quad360", "front", "pano", "bev"]);
const CAMERA_SVC = process.env.PSATHYRELLA_CAMERA_URL || "";

/**
 * The detector is ONE endpoint that tags each box with the feed it came from (`source`) — it is NOT
 * per-feed paths. `/detect/a` and `/detect/b` do not exist (verified 404 against the live service);
 * the frozen path is `/detect` (alias `/api/detect`).
 */
function upstreamFor(feedId: string): string {
  const perFeed = process.env[`PSATHYRELLA_CAM_${feedId.toUpperCase()}_DETECTIONS_URL`];
  if (perFeed) return perFeed;
  // Cursor provisioned this key in .env.local when P3 landed.
  if (process.env.PSATHYRELLA_CAM_DETECT_URL) return process.env.PSATHYRELLA_CAM_DETECT_URL;
  if (CAMERA_SVC) return `${CAMERA_SVC}/detect`;
  return "";
}

type RawDetection = {
  source?: string;
  class?: string;
  cls?: string;
  confidence?: number;
  conf?: number;
  bbox?: number[];
  trackId?: string | number;
  track_id?: string | number;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function GET(_req: Request, { params }: { params: Promise<{ feedId: string }> }) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { feedId } = await params;
  if (!FEEDS.has(feedId)) return NextResponse.json({ error: "bad_feed" }, { status: 400 });

  const upstream = upstreamFor(feedId);
  if (!upstream) {
    return NextResponse.json(
      { error: "detections_not_configured", feedId, hint: "Run the detector on the Jetson and set PSATHYRELLA_CAM_DETECT_URL." },
      { status: 503 },
    );
  }

  // Retry-fresh: the dev-PC → Jetson link has a documented intermittent first-SYN stall where a fresh
  // connection recovers instantly (observed failing 3 of 5 consecutive probes).
  let raw: {
    detections?: RawDetection[]; engine?: string; note?: string; device?: string; ts?: string; deepstream?: boolean;
    /** Per-source frame dimensions, e.g. { quad360:{frameW,frameH}, pano:{...}, bev:{...}, front:{...} }. */
    frames?: Record<string, { frameW?: number; frameH?: number }>;
    frameW?: number; frameH?: number;
    /** Honest licence status of the running model — surfaced so the UI can badge a non-shippable build. */
    license?: string; sahi?: boolean;
  } | null = null;
  for (let i = 0; i < 4 && !raw; i++) {
    try {
      const res = await fetch(upstream, { signal: AbortSignal.timeout(4000), cache: "no-store", headers: { Accept: "application/json" } });
      if (res.ok) raw = await res.json();
    } catch { /* stall → retry fresh */ }
  }
  if (!raw) return NextResponse.json({ error: "detections_unavailable", feedId }, { status: 502 });

  // Keep only this feed's boxes. An untagged payload is assumed to be the quad composite (the only
  // stream the detector currently runs on) — it is NEVER attributed to the Target, whose sensor does
  // not exist yet; a box labelled "Target" from quad pixels would read as a false forward contact.
  const all = Array.isArray(raw.detections) ? raw.detections : [];
  const mine = all.filter((d) => (d.source ? d.source === feedId : feedId === "quad360"));

  const detections = mine.flatMap((d, i) => {
    const b = d.bbox;
    if (!Array.isArray(b) || b.length < 4) return [];
    const [x1, y1, x2, y2] = b.map((n) => num(n));
    if (x1 === null || y1 === null || x2 === null || y2 === null) return [];
    const conf = num(d.confidence) ?? num(d.conf);
    const cls = d.class ?? d.cls;
    if (conf === null || !cls) return [];
    const trackRaw = d.trackId ?? d.track_id;
    return [{
      id: `det_${i}`,
      // Accept numeric ids too — DeepStream nvtracker emits uint64 track ids, not strings.
      trackId: trackRaw === undefined || trackRaw === null ? null : String(trackRaw),
      cls,
      conf,
      // corner → size, still in SOURCE PIXELS (the client normalizes with the live frame dims)
      bbox: { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) },
    }];
  });

  return NextResponse.json(
    {
      feedId,
      // The Jetson clock is ISO-8601 here, not epoch ms — convert, and fall back to null (NOT Date.now())
      // so the client can distinguish "backend didn't say" from a real inference timestamp.
      tMs: raw.ts ? Date.parse(raw.ts) || null : null,
      // PIXEL space. The detector NOW reports per-source frame dims, so prefer its authoritative value
      // over anything the browser measures — the pano is 3840x540 while its <img> renders letterboxed,
      // and normalizing against the rendered size would misplace every box.
      frameW: num(raw.frames?.[feedId]?.frameW) ?? num(raw.frameW),
      frameH: num(raw.frames?.[feedId]?.frameH) ?? num(raw.frameH),
      bboxUnits: "pixels" as const,
      model: raw.engine ?? null,
      device: raw.device ?? null,
      deepstream: raw.deepstream === true,
      license: raw.license ?? null,
      sahi: raw.sahi === true,
      note: raw.note ?? null,
      detections,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
