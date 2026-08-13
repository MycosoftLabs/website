/**
 * GET /api/psathyrella/tower-cam — RETIRED (Aug 02 2026). Always 410 Gone; proxies nothing.
 *
 * This was a second, less capable MJPEG proxy for the Jetson "CAM0" tower camera. It never had a
 * consumer and never had an upstream: no client code has ever fetched this path, and
 * PSATHYRELLA_TOWER_CAM_URL / PSATHYRELLA_TOWER_CAM_SNAPSHOT_URL were never set in any env file, so
 * every request it ever served was the 503 "tower_cam_not_configured" body. Those two env reads are
 * deliberately gone from this file so nobody adds config that no code path consumes.
 *
 * The tower optics are owned by app/api/psathyrella/camera/[feedId]/[kind]/route.ts, which carries
 * the FROZEN Jetson :8792 service contract (quad360 -> /preview/a, /snapshot/a, /preview/pano,
 * /preview/bev) plus the connect-stall / first-byte retry handling this route lacked.
 *
 * Kept as an explicit, named 410 rather than a bare 404 because the Jul 04 2026 bench handoff docs
 * still tell the reader to "set PSATHYRELLA_TOWER_CAM_URL" — anyone arriving from those docs needs
 * to be told where the feed actually lives, not left to re-wire an abandoned proxy that would
 * compete with the frozen camera contract. If a CAM0 escape hatch is ever needed, add the feedId to
 * FEEDS + SVC_PATHS in the camera route; do not revive this one.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  // Owner-only buoy surface (morgan@mycosoft.org), unchanged from commit 27f55a07's API sweep. The
  // gate stays ahead of the 410 so this route's auth posture never drifts from its siblings.
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  return NextResponse.json(
    {
      error: "tower_cam_route_retired",
      detail:
        "The tower camera proxy has moved. This path never had a configured upstream and no longer proxies anything.",
      use: "/api/psathyrella/camera/quad360/stream (also /snapshot, /pano, /bev)",
    },
    { status: 410 }
  );
}
