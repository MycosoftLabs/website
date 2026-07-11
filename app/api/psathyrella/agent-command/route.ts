/**
 * POST /api/psathyrella/agent-command
 *
 * Same-origin proxy that forwards a SMALL ALLOWLIST of bench / calibration commands DIRECTLY to the
 * Jetson propulsion agent (:8788), bypassing MAS. Calibration (azimuth home) and bench diagnostics
 * should hit hardware directly: low latency (~64ms vs MAS's ~1s connection-setup), and no bearer /
 * store-and-forward queueing that the operational GCS path applies. Mirrors the agent-state GET proxy.
 *
 * NOT a general command path — driving commands (joystick / jog / arm) still go through the
 * authenticated GCS → MAS → Jetson chain. This is intentionally limited to non-actuating setup +
 * the azimuth-home calibration the operator runs on the bench during install.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const PROPULSION = process.env.PSATHYRELLA_JETSON_PROPULSION_URL || "http://192.168.0.123:8788";

// Only these commands may take the direct bench path. Azimuth home = the install-day calibration;
// thruster_group = ATOMIC multi-thruster apply (one command, synced actuation — no 4-command train).
const ALLOWED = new Set(["nav.az_zero", "nav.thruster_azimuth", "nav.thruster", "nav.thruster_group", "nav.all_stop"]);

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: { cmd?: string; params?: Record<string, unknown>; clientCommandId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const cmd = String(body?.cmd || "");
  if (!ALLOWED.has(cmd)) {
    return NextResponse.json({ ok: false, error: `command not allowed on bench path: ${cmd}` }, { status: 400 });
  }

  try {
    const res = await fetch(`${PROPULSION}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "side_b", cmd, params: body?.params ?? {} }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json({ ok: res.ok, response: data }, { status: res.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
