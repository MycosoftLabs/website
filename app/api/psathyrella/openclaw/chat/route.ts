/**
 * POST /api/psathyrella/openclaw/chat
 *
 * Owner-gated proxy to Jetson OpenClaw bridge chat.
 * Accepts either OpenAI messages[] or { message|text|prompt }.
 * Forwards to bridge /v1/chat/completions (also /chat). Never fabricates replies.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

const OPENCLAW =
  process.env.PSATHYRELLA_OPENCLAW_BRIDGE_URL ||
  process.env.PSATHYRELLA_OPENCLAW_URL ||
  "http://192.168.0.123:8793";

export async function POST(req: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const base = OPENCLAW.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "openclaw_chat_failed", upstreamStatus: res.status, response: data },
        { status: res.status === 400 ? 400 : 502 },
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
