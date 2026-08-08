# `process-telemetry` — migration to `@supabase/server`

Pilot migration for the new [`@supabase/server`](https://supabase.com/blog/supabase-server) package. Replaces hand-rolled JWT verification, CORS, and client setup with the `withSupabase` wrapper.

## What changed

| Before | After |
|---|---|
| `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` for every call | `ctx.supabase` (user-scoped, RLS-aware) for reads, `ctx.supabaseAdmin` (service role) only for writes |
| Manual `OPTIONS` preflight handler | Handled by `withSupabase` via `cors` option |
| No JWT verification — anyone with the function URL could write | `auth: ["user", "secret"]` — accepts a real user JWT or a Supabase secret key |
| No device ownership check | When called as a user, we verify the device is visible under the user's RLS before inserting |
| `SUPABASE_SERVICE_ROLE_KEY` env var | Reads new keys (`SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_JWKS`) — populated automatically on Supabase platform |

## Caller impact

- **Dashboard / website (user JWT):** No code change required. The existing `Authorization: Bearer <jwt>` header already works.
- **MycoBrain devices / backend cron:** Must send `Authorization: Bearer <secret_key>` instead of the legacy service-role key. Rotate device firmware to use the new secret key generated in Supabase Dashboard → Settings → API. Until rotation completes, the legacy service-role key continues to work as a secret key.
- **Anonymous callers:** No longer accepted. Previously the function would happily write with the service role from any caller; now requests without a verified user JWT or secret key get a 401 from `withSupabase`.

## Prerequisites

1. Asymmetric JWT signing keys must be enabled on the project. Check **Dashboard → Settings → API → JWT Signing Keys**. If only legacy HS256 keys are present, generate the new asymmetric keys before deploying.
2. New API keys (`SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_JWKS`) are populated by the Supabase platform automatically. No manual secret config required.

## Deploy

```bash
cd supabase/functions/process-telemetry
supabase functions deploy process-telemetry --project-ref hnevnsxnhfibhbsipqvz
```

## Smoke tests

```bash
FN_URL="https://hnevnsxnhfibhbsipqvz.supabase.co/functions/v1/process-telemetry"

# 1. Anonymous → expect 401
curl -i -X POST "$FN_URL" -d '{}'

# 2. With a user JWT → expect 200 if device is owned by user, 403 if not
curl -i -X POST "$FN_URL" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"device_id": "<owned-device-uuid>", "telemetry_data": {"temp": 22.1}}'

# 3. With a Supabase secret key (device path) → expect 200
curl -i -X POST "$FN_URL" \
  -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"device_id": "<any-device-uuid>", "telemetry_data": {"temp": 22.1}}'

# 4. CORS preflight → expect 200 with Access-Control-* headers
curl -i -X OPTIONS "$FN_URL" \
  -H "Origin: https://mycosoft.org" \
  -H "Access-Control-Request-Method: POST"
```

## Rollback

This change is contained to `supabase/functions/process-telemetry/index.ts`. If anything regresses, revert the file and redeploy:

```bash
git revert <commit-sha>
supabase functions deploy process-telemetry --project-ref hnevnsxnhfibhbsipqvz
```

The legacy service-role key continues to work for at least one full deprecation window from Supabase, so rollback does not require key rotation.

## Follow-ups (separate PRs)

- Apply the same pattern to `generate-embeddings` (`auth: 'user'`).
- New `stripe-webhooks` function — `auth: 'none'` because Stripe signs the body itself; verify the Stripe signature in the handler before touching `ctx.supabaseAdmin`.
- New `sync-mindex` function — `auth: 'secret'` for cron / server-to-server.
- Tighten CORS `origin` from `*` to known dashboard + device origins.
