/**
 * GET /api/psathyrella/camera — tower camera rig status (owner-only).
 *
 * Reports the two physical feeds so the GCS knows what to render, without guessing:
 *   quad360 — Arducam Camarray HAT (4x IMX519 → one composite MIPI stream)
 *   front   — Arducam IMX477 HQ day/night (Sony 30x stand-in)
 *
 * `online` is honest: a feed is online only if its stream upstream is env-configured. If the Jetson
 * runs a richer camera-service (PSATHYRELLA_CAMERA_RIG_URL) we merge its authoritative status
 * (sensor name, resolution, fps, quad tile layout, IR-cut state); otherwise we report the wired
 * defaults with online derived from config presence. No synthetic feeds.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";
import { emptyCameraRig, type CameraFeed } from "@/lib/psathyrella/contract";

export const dynamic = "force-dynamic";

const RIG_URL = process.env.PSATHYRELLA_CAMERA_RIG_URL || ""; // rich CameraRig JSON (my contract)
const CAMERA_SVC = process.env.PSATHYRELLA_CAMERA_URL || ""; // Cursor's :8792 service (streamA/streamB)

function configured(feedId: string): boolean {
  // A feed can stream if it has a per-feed URL OR Cursor's single camera service is set (A=quad360, B=front).
  return Boolean(process.env[`PSATHYRELLA_CAM_${feedId.toUpperCase()}_URL`]) || Boolean(CAMERA_SVC);
}

export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const rig = emptyCameraRig();

  // DEV/DEMO self-test (PSATHYRELLA_CAM_SELFTEST=1): mark both feeds online and point them at the
  // animated MJPEG test pattern, to prove the GCS <img> pipeline renders a live feed with no camera
  // permission. Never real camera data; remove the flag to revert to honest offline.
  if (process.env.PSATHYRELLA_CAM_SELFTEST === "1") {
    const q = rig.feeds.find((f) => f.id === "quad360");
    if (q) { q.online = true; q.sensor = "TEST PATTERN (MJPEG)"; q.streamUrl = "/api/psathyrella/camera/selftest/quad"; }
    const fr = rig.feeds.find((f) => f.id === "front");
    if (fr) { fr.online = true; fr.sensor = "TEST PATTERN (MJPEG)"; fr.streamUrl = "/api/psathyrella/camera/selftest/single"; }
    rig.updatedMsAgo = 0;
    return NextResponse.json(rig);
  }

  // The Target (front) is online ONLY when a DEDICATED front feed is explicitly wired
  // (PSATHYRELLA_CAM_FRONT_URL). The camera service's /health.streamB flag is NOT trusted for this:
  // today the IMX477 has no discrete pipeline — "front" on the service is derived from the IMX519 quad
  // stack — so inferring Target-online from streamB would fake a second sensor (Cursor's honest note).
  const frontUrlSet = Boolean(process.env.PSATHYRELLA_CAM_FRONT_URL);
  for (const f of rig.feeds) f.online = f.id === "front" ? frontUrlSet : configured(f.id);
  const frontFeed = rig.feeds.find((f) => f.id === "front");
  if (frontFeed && !frontUrlSet) frontFeed.error = "IMX477 is plugged in but not enumerated as its own camera. The Jetson is still on an imx519-dual device-tree (both CSI ports bind as IMX519), so /preview/b, /snapshot/b and /snapshot/front stay offline (503) until Cursor installs a CamArray(IMX519)+IMX477 dual-sensor DT and Argus sensor-id=1 produces a real forward view. The 360° ring uses /preview/a only — Target is never faked from the quad.";

  // Enrichment A — Cursor's Jetson camera service (:8792): GET /health confirms reachability. The
  // quad360 ring is the real IMX519 composite; if the service is set but unreachable (Jetson down /
  // power-cycling) every feed goes OFFLINE — never show "online" on a dead service.
  if (CAMERA_SVC) {
    /*
     * Retry-fresh: the dev-PC → Jetson (.123) first-SYN stall makes a probe intermittently hang even
     * though :8792 is up, and a fresh connection recovers instantly.
     *
     * ⚠ RETUNED Aug 03 — THE OLD BUDGET WAS SHORTER THAN THE ENDPOINT'S OWN LATENCY.
     * The comment below used to claim "a good connect returns <1.5s" against a 2500 ms timeout.
     * Measured directly: `:8792/health` answers 200 in **2.735 s**. So EVERY attempt aborted ~235 ms
     * early, all six burned, and this route took 15–21 s per poll while concluding the camera service
     * was unreachable. That is what was cycling the video: `health` came back null, the feeds were
     * marked degraded, and the tiles went dark — a status probe killing live streams, which is the
     * exact failure this file's anti-flap discipline exists to prevent.
     *
     * A timeout must exceed the endpoint's real p99, not a guess at it. 6000 ms is >2× the measured
     * 2.735 s. Attempts drop 6 → 3 because the budget no longer needs to absorb a self-inflicted
     * timeout: worst case is now 18 s only if the service is genuinely dead, and the common case is
     * one attempt at ~2.7 s instead of six failures at 15 s.
     *
     * (`/rig` on the same service answers in 31 ms — the slowness is specific to /health, not the
     * link. If /health ever gets fast, leave this budget alone: generous is free when it succeeds.)
     */
    let health: {
      streamA?: boolean | string; streamB?: boolean | string; sensor?: string; ok?: boolean;
      // Jetson CUDA stitch status (live since Aug 01 late): the ring pano + top-down BEV.
      stitch?: boolean; calibrated?: boolean; phase2?: { pano?: boolean; bev?: boolean };
      calibrationSource?: string; bev?: { qualityNote?: string };
      targetDiscrete?: boolean; sensorNote?: string;
    } | null = null;
    for (let i = 0; i < 3 && !health; i++) {
      try {
        const res = await fetch(`${CAMERA_SVC}/health`, { signal: AbortSignal.timeout(6000), cache: "no-store", headers: { Accept: "application/json" } });
        if (res.ok) health = await res.json();
      } catch { /* stall → retry fresh */ }
    }
    if (health) {
      const alive = (v: boolean | string | undefined) => v === true || v === "live" || v === "up" || v === "online";
      const q = rig.feeds.find((f) => f.id === "quad360");
      if (q) {
        q.online = alive(health.streamA);
        if (typeof health.sensor === "string") q.sensor = health.sensor;
        // Unlock the Pano/BEV modes ONLY when the Jetson says it is actually stitching AND calibrated.
        // The FE gates the mode chips on stitch.calibrated, so this is the single switch that turns the
        // on-device CUDA surround-view on in the operator UI. Serving-but-uncalibrated stays hidden.
        if (q.stitch) {
          // AVAILABILITY is driven by "is the Jetson actually serving this stream" (phase2), NOT by
          // calibration quality. Calibration is reported separately so the UI can badge a provisional
          // view rather than hide it — a served-but-provisional surround is still useful, and gating
          // the mode chips on `calibrated` made the panorama disappear the moment the backend
          // honestly downgraded itself to "provisional".
          const panoUp = health.phase2?.pano === true;
          const bevUp = health.phase2?.bev === true;
          if (!panoUp) q.stitch.panoUrl = null;
          if (!bevUp) q.stitch.bevUrl = null;
          q.stitch.calibrated = health.calibrated === true;
          q.stitch.calibrationSource = health.calibrationSource ?? null;
          q.stitch.qualityNote = health.bev?.qualityNote ?? null;
        }
      }
      // front stays as decided above (dedicated-URL only) — do NOT infer from streamB. If the service
      // explains WHY the target is unbound, surface its exact words instead of our generic copy.
      if (frontFeed && !frontUrlSet && health.targetDiscrete === false && typeof health.sensorNote === "string" && health.sensorNote.trim()) {
        frontFeed.error = `${health.sensorNote.trim()} — the Jetson is still on an imx519-dual device-tree, so the IMX477 never binds as its own sensor. Cursor's dual-sensor DT (P1) is the fix; the camera being powered (audible IR-cut clicking) does not make it visible to the driver.`;
      }
      rig.updatedMsAgo = 0;
    } else {
      for (const f of rig.feeds) { f.online = false; f.error = "camera service unreachable"; }
    }
  }

  // Enrichment B — a richer CameraRig JSON (sensor/resolution/fps/quad layout/stitch) if the backend
  // exposes it; merges over everything above (backend wins on any field it reports).
  if (RIG_URL) {
    try {
      const res = await fetch(RIG_URL, { signal: AbortSignal.timeout(4000), cache: "no-store", headers: { Accept: "application/json" } });
      if (res.ok) {
        const live = (await res.json()) as { feeds?: Partial<CameraFeed>[]; updatedMsAgo?: number };
        rig.updatedMsAgo = typeof live.updatedMsAgo === "number" ? live.updatedMsAgo : rig.updatedMsAgo;
        for (const lf of live.feeds ?? []) {
          const target = rig.feeds.find((f) => f.id === lf.id);
          if (target) Object.assign(target, lf);
        }
      }
    } catch { /* rig-service down → keep prior, honest */ }
  }

  return NextResponse.json(rig);
}
