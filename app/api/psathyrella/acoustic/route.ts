/**
 * /api/psathyrella/acoustic — same-origin proxy to the Jetson acoustic TX service (:8791).
 *
 * TEMP UNDERWATER COMMS stand-in (Jul 09): dry Mallory PT-2040PQ on a SECOND PCA9685
 * (i2c-1 @0x70 ALLCALL, pins 27/28) — completely separate from propulsion (i2c-7 @0x60,
 * :8788 — NEVER used for acoustic). Real UW transducers swap in later behind the same API.
 *
 * GET  → :8791/health   (link/TX state for the Comms panel — no mock: offline = offline)
 * POST → { action: "tone"|"pulse"|"message"|"off", params } → :8791/tx/<action>
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const ACOUSTIC = process.env.PSATHYRELLA_ACOUSTIC_URL || "http://192.168.0.123:8791";

const ACTIONS: Record<string, string> = {
  tone: "/tx/tone",
  pulse: "/tx/pulse",
  message: "/tx/message",
  off: "/tx/off",
};

export async function GET() {
  try {
    const res = await fetch(`${ACOUSTIC}/health`, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    const data = await res.json().catch(() => null);
    return NextResponse.json({ up: res.ok, ...data });
  } catch {
    return NextResponse.json({ up: false });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: { action?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const path = ACTIONS[String(body?.action || "")];
  if (!path) return NextResponse.json({ ok: false, error: `unknown action: ${body?.action}` }, { status: 400 });

  try {
    const res = await fetch(`${ACOUSTIC}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body?.params ?? {}),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json({ ok: res.ok, response: data }, { status: res.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
