/**
 * GET /api/psathyrella/camera/:feedId/:kind
 *   feedId ∈ { quad360, front }   kind ∈ { stream, snapshot }
 *
 * Same-origin proxy to the Jetson camera service so the GCS <img> shows the tower optics on desktop
 * AND on the iPad over WiFi (no CORS, no HTTP-vs-HTTPS mixed-content block, Jetson IP never exposed).
 * Owner-only (morgan@mycosoft.org) like the rest of the buoy surface.
 *
 *  - quad360 = the Arducam Camarray HAT composite (4x IMX519, one MIPI stream, 2x2 or 4x1 tiles).
 *  - front   = the IMX477 HQ day/night cam (Sony 30x stand-in).
 *
 * Upstreams are env-configured; a feed with no configured URL returns 503 (honest — no synthetic video):
 *   PSATHYRELLA_CAM_QUAD360_URL / PSATHYRELLA_CAM_QUAD360_SNAPSHOT_URL
 *   PSATHYRELLA_CAM_FRONT_URL   / PSATHYRELLA_CAM_FRONT_SNAPSHOT_URL
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const FEEDS = new Set(["quad360", "front"]);
const KINDS = new Set(["stream", "snapshot", "pano", "bev"]);

// Cursor's Jetson camera service (:8792) — FROZEN contract (Aug 01 late, "360 restored" handoff):
//   /preview/a + /snapshot/a          → CamArray UC-512 4-in-1 IMX519 composite (the GCS 360 ring)
//   /preview/b + /snapshot/b + /snapshot/front → DISCRETE Target IMX477 ONLY; all 503 until the
//                                       dual-sensor DT lands (they no longer re-serve the quad).
// The map lives in CODE so a service-endpoint rename is a one-line fix here, not stale env that
// silently 404s. front has no mapping on purpose → honest offline, never faked from the quad.
const CAMERA_SVC = process.env.PSATHYRELLA_CAMERA_URL || "";
type SvcKind = "stream" | "snapshot" | "pano" | "bev";
const SVC_PATHS: Record<string, Partial<Record<SvcKind, string>> | undefined> = {
  // pano/bev went live on the Jetson Aug 01 late (health: stitch:true, phase2.pano/bev:true) — the
  // ring is stitched on-device (CUDA), the browser only displays it. Snapshot siblings
  // (/snapshot/pano|/snapshot/bev) exist too and are used as the still fallback.
  quad360: { stream: "/preview/a", snapshot: "/snapshot/a", pano: "/preview/pano", bev: "/preview/bev" },
  front: undefined, // no discrete IMX477 yet — Target stays offline until Cursor's A0 dual-sensor DT
};

function upstreamFor(feedId: string, kind: string): string {
  const key = feedId.toUpperCase();
  // 1. Explicit per-feed/per-kind env override wins (a dedicated feed URL).
  const perKind =
    kind === "snapshot" ? process.env[`PSATHYRELLA_CAM_${key}_SNAPSHOT_URL`]
    : kind === "pano" ? process.env[`PSATHYRELLA_CAM_${key}_PANO_URL`]
    : kind === "bev" ? process.env[`PSATHYRELLA_CAM_${key}_BEV_URL`]
    : process.env[`PSATHYRELLA_CAM_${key}_URL`];
  if (perKind) return perKind;

  // 2. The camera service, mapped to its CURRENT endpoints. A kind with no mapping (e.g. front/pano)
  //    falls through to "" → honest 503 rather than a wrong-feed frame.
  const p = CAMERA_SVC ? SVC_PATHS[feedId] : undefined;
  const mapped = p?.[kind as SvcKind];
  if (mapped) return `${CAMERA_SVC}${mapped}`;

  return "";
}

export async function GET(_req: Request, { params }: { params: Promise<{ feedId: string; kind: string }> }) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { feedId, kind } = await params;
  if (!FEEDS.has(feedId) || !KINDS.has(kind)) {
    return NextResponse.json({ error: "bad_feed_or_kind" }, { status: 400 });
  }
  const isSnapshot = kind === "snapshot"; // stream/pano/bev are all continuous MJPEG

  const upstream = upstreamFor(feedId, kind);
  if (!upstream) {
    return NextResponse.json(
      {
        error: "camera_not_configured",
        feedId,
        hint: `Serve the ${feedId} feed on the Jetson (MJPEG/HTTP) and set PSATHYRELLA_CAM_${feedId.toUpperCase()}_URL, then reconnect.`,
      },
      { status: 503 },
    );
  }

  // ── Snapshot: short request, retry-fresh (the dev-PC → Jetson first-SYN stall makes a single attempt
  // flaky; a brand-new connection recovers instantly). ──
  if (isSnapshot) {
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(upstream, { headers: { Accept: "image/jpeg, */*" }, cache: "no-store", signal: AbortSignal.timeout(6000) });
        if (res.ok && res.body) {
          return new NextResponse(res.body, { status: 200, headers: { "Content-Type": res.headers.get("Content-Type") || "image/jpeg", "Cache-Control": "no-cache, no-store, must-revalidate" } });
        }
      } catch { /* stall → retry fresh */ }
    }
    return NextResponse.json({ error: "snapshot_unavailable", feedId }, { status: 502 });
  }

  // ── Stream: open the upstream MJPEG, retrying a FRESH connect on either a stalled connect OR an empty
  // body. The dev-PC → Jetson (.123) first-SYN stall can hang the initial connect for seconds, and the
  // service sometimes returns 200 + multipart headers yet emits no frames — both are cured by re-opening.
  // We keep ONE client-abort listener that aborts whichever connection is active, and distinguish a real
  // client disconnect (→ 204) from a connect/first-byte timeout (→ retry). ──
  const CONNECT_MS = 3500;
  const FIRST_BYTE_MS = 3000;
  let clientDropped = false;
  let activeCtrl: AbortController | null = null;
  const onClientAbort = () => { clientDropped = true; activeCtrl?.abort(); };
  _req.signal.addEventListener("abort", onClientAbort, { once: true });

  for (let attempt = 0; attempt < 4 && !clientDropped; attempt++) {
    const ctrl = new AbortController();
    activeCtrl = ctrl;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      // Connect with a timeout: a fresh fetch, aborted+retried if the first-SYN stalls.
      const fetchP = fetch(upstream, { headers: { Accept: "multipart/x-mixed-replace, image/jpeg, */*" }, cache: "no-store", signal: ctrl.signal });
      fetchP.catch(() => { /* swallow abort-rejection when the connect times out */ });
      const res = await Promise.race([
        fetchP,
        new Promise<never>((_, reject) => { connectTimer = setTimeout(() => { ctrl.abort(); reject(new Error("connect-timeout")); }, CONNECT_MS); }),
      ]);
      if (connectTimer) clearTimeout(connectTimer);
      if (!res.ok || !res.body) { ctrl.abort(); continue; }

      reader = res.body.getReader();
      // First-byte watchdog: require real data, else this connection is dead → retry fresh.
      let to: ReturnType<typeof setTimeout> | null = null;
      const first = await Promise.race([
        reader.read(),
        new Promise<null>((resolve) => { to = setTimeout(() => resolve(null), FIRST_BYTE_MS); }),
      ]);
      if (to) clearTimeout(to);
      if (first === null || first.done) { try { await reader.cancel(); } catch { /* ignore */ } ctrl.abort(); reader = null; continue; }

      const ct = res.headers.get("Content-Type") || "multipart/x-mixed-replace";
      const upstreamReader = reader;
      const out = new ReadableStream<Uint8Array>({
        start(controller) {
          if (first.value) controller.enqueue(first.value);
          (async () => {
            try { for (;;) { const { done, value } = await upstreamReader.read(); if (done) break; if (value) controller.enqueue(value); } }
            catch { /* upstream ended / client dropped */ }
            try { controller.close(); } catch { /* already closed */ }
          })();
        },
        cancel() { ctrl.abort(); },
      });
      return new NextResponse(out, { status: 200, headers: { "Content-Type": ct, "Cache-Control": "no-cache, no-store, must-revalidate", "X-Accel-Buffering": "no" } });
    } catch { /* connect-timeout or transient error */
      if (connectTimer) clearTimeout(connectTimer);
      try { await reader?.cancel(); } catch { /* ignore */ }
      ctrl.abort();
      // loop retries a fresh connect unless the client itself dropped
    }
  }
  if (clientDropped) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ error: "stream_no_frames", feedId, hint: "no frames after 4 fresh connects (connect or first-byte stall)" }, { status: 502 });
}
