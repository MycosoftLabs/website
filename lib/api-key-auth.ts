import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export interface ApiKeyValidation {
  valid: true;
  profile_id: string;
  key_id: string;
  scopes: string[];
  balance_cents: number;
  rate_limit_remaining: {
    per_minute: number;
    per_day: number;
  };
}

export interface ApiKeyError {
  valid: false;
  error: string;
  status: number;
}

export type ApiKeyResult = ApiKeyValidation | ApiKeyError;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(url, key);
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(request: Request): Promise<ApiKeyResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      valid: false,
      error: "Missing or invalid Authorization header",
      status: 401,
    };
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey) {
    return { valid: false, error: "Empty API key", status: 401 };
  }

  const keyHash = hashKey(rawKey);
  const supabase = getAdminClient();

  // Look up the key
  const { data: apiKey, error } = await supabase
    .from("agent_api_keys")
    .select("id, profile_id, scopes, is_active, rate_limit_per_minute, rate_limit_per_day, requests_today, requests_this_minute, last_minute_reset, last_day_reset, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !apiKey) {
    return { valid: false, error: "Invalid API key", status: 401 };
  }

  if (!apiKey.is_active) {
    return { valid: false, error: "API key is deactivated", status: 403 };
  }

  // Check expiration
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired", status: 403 };
  }

  // Rate limit checks — reset counters if windows have elapsed
  const now = new Date();
  let requestsThisMinute = apiKey.requests_this_minute;
  let requestsToday = apiKey.requests_today;
  let lastMinuteReset = new Date(apiKey.last_minute_reset);
  let lastDayReset = new Date(apiKey.last_day_reset);

  // Reset per-minute counter if >60s since last reset
  if (now.getTime() - lastMinuteReset.getTime() > 60_000) {
    requestsThisMinute = 0;
    lastMinuteReset = now;
  }

  // Reset per-day counter if >24h since last reset
  if (now.getTime() - lastDayReset.getTime() > 86_400_000) {
    requestsToday = 0;
    lastDayReset = now;
  }

  // Check limits
  if (requestsThisMinute >= apiKey.rate_limit_per_minute) {
    return {
      valid: false,
      error: "Rate limit exceeded (per-minute)",
      status: 429,
    };
  }

  if (requestsToday >= apiKey.rate_limit_per_day) {
    return {
      valid: false,
      error: "Rate limit exceeded (per-day)",
      status: 429,
    };
  }

  // Increment counters and update last_used_at
  await supabase
    .from("agent_api_keys")
    .update({
      requests_this_minute: requestsThisMinute + 1,
      requests_today: requestsToday + 1,
      last_minute_reset: lastMinuteReset.toISOString(),
      last_day_reset: lastDayReset.toISOString(),
      last_used_at: now.toISOString(),
    })
    .eq("id", apiKey.id);

  // Fetch balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("balance_cents")
    .eq("id", apiKey.profile_id)
    .single();

  return {
    valid: true,
    profile_id: apiKey.profile_id,
    key_id: apiKey.id,
    scopes: apiKey.scopes,
    balance_cents: profile?.balance_cents ?? 0,
    rate_limit_remaining: {
      per_minute: apiKey.rate_limit_per_minute - (requestsThisMinute + 1),
      per_day: apiKey.rate_limit_per_day - (requestsToday + 1),
    },
  };
}
