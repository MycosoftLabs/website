/**
 * GET /api/psathyrella/tower-cam            → live MJPEG passthrough of the Jetson tower camera
 * GET /api/psathyrella/tower-cam?mode=snapshot → single JPEG frame (for polling fallbacks)
 *
 * Same-origin proxy so the GCS <img> shows the Jetson CAM0 feed on desktop AND on the iPad over
 * WiFi (no CORS, no HTTP-vs-HTTPS mixed-content block, no exposing the Jetson IP to the client).
 *
 * Upstream is env-configured: PSATHYRELLA_TOWER_CAM_URL points at whatever the Jetson serves for
 * CAM0 — an MJPEG HTTP stream (mjpg-streamer `?action=stream`, a GStreamer/ffmpeg HTTP endpoint,
 * etc.). Optionally PSATHYRELLA_TOWER_CAM_SNAPSHOT_URL for a single-frame endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const STREAM_URL = process.env.PSATHYRELLA_TOWER_CAM_URL || "";
const SNAPSHOT_URL = process.env.PSATHYRELLA_TOWER_CAM_SNAPSHOT_URL || "";

export async function GET(req: NextRequest) {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const mode = req.nextUrl.searchParams.get("mode");
  const snapshot = mode === "snapshot";
  const upstream = snapshot ? SNAPSHOT_URL || STREAM_URL : STREAM_URL;

  if (!upstream) {
    return NextResponse.json(
      { error: "tower_cam_not_configured", hint: "Set PSATHYRELLA_TOWER_CAM_URL to the Jetson CAM0 MJPEG/HTTP stream, then restart the dev server." },
      { status: 503 }
    );
  }

  // Connect timeout only — abort if the upstream doesn't respond with headers in time, but DON'T
  // time out the stream body (an MJPEG stream never "completes").
  const ac = new AbortController();
  const connectTimer = setTimeout(() => ac.abort(), snapshot ? 6000 : 9000);
  try {
    const res = await fetch(upstream, { signal: ac.signal, cache: "no-store", headers: { Accept: "*/*" } });
    clearTimeout(connectTimer);
    if (!res.ok || !res.body) {
      return NextResponse.json({ error: "upstream_error", status: res.status }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") || (snapshot ? "image/jpeg" : "multipart/x-mixed-replace");

    if (snapshot) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, { status: 200, headers: { "Content-Type": contentType, "Cache-Control": "no-store" } });
    }

    // Passthrough the (unbounded) MJPEG body stream verbatim.
    return new NextResponse(res.body, {
      status: 200,
      headers: { "Content-Type": contentType, "Cache-Control": "no-store, no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    clearTimeout(connectTimer);
    return NextResponse.json({ error: "tower_cam_unreachable", detail: (err as Error).message, upstream }, { status: 502 });
  }
}
