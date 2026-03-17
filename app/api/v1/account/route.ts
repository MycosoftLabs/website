import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateApiKey } from "@/lib/api-key-auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const result = await validateApiKey(request);

  if (!result.valid) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const supabase = getAdminClient();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("balance_cents, total_paid_cents, created_at")
    .eq("id", result.profile_id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  // Fetch API key prefix
  const { data: apiKey } = await supabase
    .from("agent_api_keys")
    .select("key_prefix, created_at, last_used_at")
    .eq("id", result.key_id)
    .single();

  // Fetch usage stats (session count and total tokens)
  const { data: sessions } = await supabase
    .from("agent_sessions")
    .select("id, tokens_used, cost_cents")
    .eq("profile_id", result.profile_id);

  const totalSessions = sessions?.length ?? 0;
  const totalTokens = sessions?.reduce((sum, s) => sum + s.tokens_used, 0) ?? 0;
  const totalUsageCents = sessions?.reduce((sum, s) => sum + s.cost_cents, 0) ?? 0;

  return NextResponse.json({
    balance_cents: profile.balance_cents,
    total_paid_cents: profile.total_paid_cents,
    api_key_prefix: apiKey?.key_prefix ?? "unknown",
    api_key_created_at: apiKey?.created_at,
    api_key_last_used: apiKey?.last_used_at,
    account_created_at: profile.created_at,
    usage: {
      total_sessions: totalSessions,
      total_tokens: totalTokens,
      total_usage_cents: totalUsageCents,
    },
    rate_limit_remaining: result.rate_limit_remaining,
    scopes: result.scopes,
  });
}
