/**
 * GET /api/psathyrella/fusion-sensors/:kind — owner-gated same-origin proxy to the buoy's short-range
 * sensor service (:8794), the feed behind BlueSight's FUSION plot.
 *
 * WHY A PROXY AT ALL: the browser must never hold the Jetson's LAN address. Same-origin also keeps the
 * console working on the iPad over HTTPS, where a plain-http LAN fetch is blocked outright.
 *
 * SHAPES OF THE REAL BACKEND (verified live against :8794 — do not assume otherwise):
 *   proximity  → { ok, hardware:"absent", maxRangeM:4, faces:[{face,bearingDeg,rangeM:null,status,…}], sensors:[…] }
 *   points     → { ok, sensorClass:"single-point-tof", model:"Benewake TF-Luna",
 *                  hardware:"configured_absent", count:3, validCount:0, points:[{…,rangeM:null}] }
 *   lidar      → { ok, hardware:"absent", sensorModel:"rplidar-c1", maxRangeM:12, count:0, positions:[], … }
 *   mic        → { ok, hardware:"absent", channels:0, rmsDb:null, bands:[], bearing:null, note:"…" }
 *   wifisense  → { ok, hardware:"present", phase:"phase0-rssi", count, detections:[{…,bearingDeg:null}], frame:{…} }
 *   rangefinder → { ok, hardware:"configured_absent"|…, points:[{…,rangeM:null|m, mountBearingDeg,…}] }
 *
 * EVERY ONE of those is honest-empty today: the hardware is not fitted, so the readings are null and
 * the arrays are empty. That is the WHOLE POINT of this route and the reason it does nothing clever.
 * It passes the payload through byte-faithfully and never substitutes a default for a null reading —
 * a zero where the backend said null would draw an obstacle at the hull, and a fabricated bearing
 * would put a wedge on water where nothing is. When the hardware lands, these same payloads start
 * carrying numbers and the plot lights up with no change here.
 *
 * FAILURE VOCABULARY (three different things, three different codes — never one blurred "empty"):
 *   503 sensor_not_configured — no upstream URL in the environment; the service was never wired.
 *   502 sensor_unavailable    — configured but unreachable, or answering something that is not JSON.
 *   200 <upstream body>       — the backend answered. Its nulls are its own and are preserved.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Base for the whole sensor service, used when a per-kind URL is not set individually. */
const FUSION_BASE = process.env.PSATHYRELLA_FUSION_SENSORS_URL || "";

/**
 * kind → [dedicated env var, path under the service base].
 *
 * `points` has no dedicated variable in the deployed environment, so it resolves off the base — which
 * is exactly why the base exists. Adding `PSATHYRELLA_PROXIMITY_POINTS_URL` later overrides it.
 */
const KINDS: Record<string, { env: string; path: string }> = {
  proximity: { env: "PSATHYRELLA_PROXIMITY_URL", path: "/proximity/scan" },
  points: { env: "PSATHYRELLA_PROXIMITY_POINTS_URL", path: "/proximity/points" },
  lidar: { env: "PSATHYRELLA_LIDAR_FRAME_URL", path: "/lidar/frame" },
  mic: { env: "PSATHYRELLA_MIC_URL", path: "/mic" },
  wifisense: { env: "PSATHYRELLA_WIFISENSE_URL", path: "/wifisense/events" },
  // HLK-LD2450 24 GHz mmWave. Served by the fusion service AND mirrored on the MycoBrain hub (:8790);
  // the fusion service is canonical here so every sensor on the plot comes through one base.
  mmwave: { env: "PSATHYRELLA_MMWAVE_URL", path: "/mmwave" },
  // Bosch BMM150 on the MycoBrain I²C bus, forwarded by the hub. Raw µT only — `headingDeg` stays
  // null upstream until tilt compensation exists, and the GCS must not derive one from the vector.
  magnetometer: { env: "PSATHYRELLA_MAGNETOMETER_URL", path: "/magnetometer" },
  // CORVON CV50 under-camera dToF pencil beam (:8794/rangefinder). Own provenance — not VL53L1X `tof`.
  rangefinder: { env: "PSATHYRELLA_RANGEFINDER_URL", path: "/rangefinder" },
};

/** Per-attempt timeout. Short: these are LAN endpoints and the plot polls, so a hung socket is worse
 *  than a fast failure the next tick can retry. */
const ATTEMPT_TIMEOUT_MS = 4000;
/** Documented Jetson first-SYN stall (see below) — three fresh attempts, not one. */
const ATTEMPTS = 3;

function upstreamFor(kind: string): string {
  const spec = KINDS[kind];
  if (!spec) return "";
  const dedicated = process.env[spec.env];
  if (dedicated) return dedicated;
  if (FUSION_BASE) return `${FUSION_BASE.replace(/\/+$/, "")}${spec.path}`;
  return "";
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { kind } = await params;
  if (!Object.hasOwn(KINDS, kind)) {
    return NextResponse.json({ error: "bad_kind", kind, known: Object.keys(KINDS) }, { status: 400 });
  }

  const upstream = upstreamFor(kind);
  if (!upstream) {
    return NextResponse.json(
      {
        error: "sensor_not_configured",
        kind,
        hint: `Set ${KINDS[kind].env} (or PSATHYRELLA_FUSION_SENSORS_URL) to the Jetson sensor service.`,
      },
      { status: 503 },
    );
  }

  // RETRY-FRESH: the dev-PC → Jetson link has a documented intermittent first-SYN stall — a Node fetch
  // can sit for 4–6 s on connect while curl to the same address answers in 8 ms, and a FRESH connection
  // recovers instantly. So each attempt is a new fetch rather than a longer timeout on one socket.
  let body: unknown = null;
  let ok = false;
  let lastStatus: number | null = null;
  let lastError: string | null = null;

  for (let i = 0; i < ATTEMPTS && !ok; i++) {
    try {
      const res = await fetch(upstream, {
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      lastStatus = res.status;
      if (!res.ok) continue;
      body = await res.json();
      ok = true;
    } catch (err) {
      lastError = (err as Error)?.message ?? "fetch failed";
    }
  }

  if (!ok) {
    return NextResponse.json(
      { error: "sensor_unavailable", kind, upstreamStatus: lastStatus, detail: lastError },
      { status: 502 },
    );
  }

  // Pass-through, verbatim. No merge with a default object, no null-coalescing of readings, no shape
  // normalization: whatever the sensor service said about its own hardware is what the operator sees.
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
