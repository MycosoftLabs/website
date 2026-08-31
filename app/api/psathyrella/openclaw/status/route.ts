/**
 * GET /api/psathyrella/openclaw/status
 *
 * Owner-gated probe of the Psathyrella OpenClaw HTTP bridge on the Jetson
 * (default http://192.168.0.123:8793/health). reachable=true ONLY when /health
 * succeeds — never inferred from hub openclawMode.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const OPENCLAW =
  process.env.PSATHYRELLA_OPENCLAW_BRIDGE_URL ||
  process.env.PSATHYRELLA_OPENCLAW_URL ||
  "http://192.168.0.123:8793";

export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const base = OPENCLAW.replace(/\/$/, "");
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/health`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    const reachable = res.ok && Boolean((body as { reachable?: boolean; ok?: boolean } | null)?.reachable ?? (body as { ok?: boolean } | null)?.ok);
    return NextResponse.json({
      ok: reachable,
      reachable,
      status: res.status,
      ms: Date.now() - t0,
      url: `${base}/health`,
      body,
      error: reachable ? null : "openclaw_bridge_unhealthy",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reachable: false,
        status: null,
        ms: Date.now() - t0,
        url: `${base}/health`,
        body: null,
        error: (err as Error).message,
      },
      { status: 502 },
    );
  }
}
