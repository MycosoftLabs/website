/**
 * GET  /api/psathyrella/camera/ircut   → current IR-cut state
 * POST /api/psathyrella/camera/ircut   { mode: "day" | "auto" | "night" }
 *
 * Owner-gated same-origin proxy to the Jetson camera service's IR-cut control.
 *
 * WHY THIS FILE EXISTS: TargetView has shipped DAY / AUTO / NIGHT buttons for a while, and they fired
 * `sendCommand({ domain: "camera", action: "irCut" })` into the generic command bus — which has no
 * handler for it. The Jetson endpoint was live and working the whole time (verified Aug 03: POST
 * `{"mode":"night"}` → `applied: true, method "i2c:9/0xc"`), so the operator was pressing real buttons
 * wired to nothing. An enabled control that silently does nothing is worse than a disabled one: it
 * reads as a capability the vehicle has.
 *
 * The mode is applied differently per mode and the device says so — `night` drives the IR-cut filter
 * over I²C, `auto` hands control back to the module's own photodiode/CDS. That distinction is passed
 * through verbatim rather than flattened, because "auto" is not a third filter position, it is
 * relinquishing control, and an operator debugging a stuck filter needs to know which is in force.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const CAMERA_SVC = process.env.PSATHYRELLA_CAM_BASE_URL || process.env.PSATHYRELLA_CAMERA_URL || "";

/** Budget set from measurement, not from a guess: /ircut and /control/ircut both answer in ~5 ms. */
const TIMEOUT_MS = 6000;

const MODES = new Set(["day", "auto", "night"]);

export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  if (!CAMERA_SVC) {
    return NextResponse.json({ ok: false, error: "camera_service_not_configured" }, { status: 503 });
  }
  try {
    const res = await fetch(`${CAMERA_SVC}/ircut`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const body: unknown = await res.json().catch(() => null);
    return NextResponse.json(body ?? { ok: false, error: "unreadable" }, { status: res.ok ? 200 : 502 });
  } catch (err) {
    // Unreachable is NOT "off". Report the failure so the UI can say the state is unknown rather
    // than showing a confident mode the device never confirmed.
    return NextResponse.json(
      { ok: false, error: "camera_service_unreachable", detail: (err as Error).message },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  if (!CAMERA_SVC) {
    return NextResponse.json({ ok: false, error: "camera_service_not_configured" }, { status: 503 });
  }

  const payload: unknown = await req.json().catch(() => null);
  const mode = typeof payload === "object" && payload !== null ? (payload as { mode?: unknown }).mode : undefined;
  if (typeof mode !== "string" || !MODES.has(mode)) {
    return NextResponse.json({ ok: false, error: "bad_mode", allowed: [...MODES] }, { status: 400 });
  }

  try {
    const res = await fetch(`${CAMERA_SVC}/control/ircut`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ mode }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const body: unknown = await res.json().catch(() => null);
    // Pass `applied` through untouched. The device distinguishes "I accepted the mode" from "I drove
    // the filter", and collapsing that into a 200 would let the UI claim a physical change the
    // hardware may not have made.
    return NextResponse.json(body ?? { ok: false, error: "unreadable" }, { status: res.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "camera_service_unreachable", detail: (err as Error).message },
      { status: 502 },
    );
  }
}
