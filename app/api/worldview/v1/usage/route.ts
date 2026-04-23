import { NextRequest, NextResponse } from "next/server"
import { getAgentProfile } from "@/lib/agent-auth"
import { newRequestId } from "@/lib/worldview/envelope"

/**
 * Worldview v1 — caller usage & balance.
 *
 * GET /api/worldview/v1/usage
 *
 * Returns the caller's remaining balance, rate-limit bucket state, and
 * a summary of today's usage (pulled from agent_api_keys + usage events
 * when available). Free — does not itself cost credits.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const requestId = newRequestId()
  const profile = await getAgentProfile(req)
  if (!profile) {
    return NextResponse.json({
      ok: false,
      request_id: requestId,
      error: {
        code: "UNAUTHENTICATED",
        message: "Provide Authorization: Bearer mk_<key> or authenticate at https://mycosoft.com/agent",
      },
    }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    request_id: requestId,
    profile_id: profile.profile_id,
    api_key_id: profile.api_key_id,
    balance_cents: profile.balance_cents ?? null,
    rate_limit: {
      per_minute: profile.rate_limit_per_minute ?? null,
      requests_this_minute: profile.requests_this_minute ?? null,
      per_day: profile.rate_limit_per_day ?? null,
      requests_today: profile.requests_today ?? null,
    },
    top_up_url: "https://mycosoft.com/agent",
    generated_at: new Date().toISOString(),
  })
}
