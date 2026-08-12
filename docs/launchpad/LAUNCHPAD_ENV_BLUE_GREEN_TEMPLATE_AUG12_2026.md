# Launchpad Blue-Green / Deploy Env Template — Aug 12, 2026

Copy these into **both** blue and green slots. Values are placeholders — never commit secrets.

## Required (server-side)

```
LAUNCHPAD_ENABLED=0
NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE=1
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_LAUNCHPAD_WEBHOOK_SECRET=
LAUNCHPAD_INGEST_TOKEN=
LAUNCHPAD_AGENT_ROOT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
SAM_API_KEY=
```

## Rollout order (handoff 04)

1. Land env with `LAUNCHPAD_ENABLED=0` on green
2. Deploy green → smoke: marketing `/fusarium/launchpad` 200; `/app/launchpad` **404**
3. Optional: flip flag on green only for a non-company test account
4. Blue-green cutover per existing scripts
5. **Prod flag stays OFF** until Morgan + counsel + Stripe live gates

## Flag rule

`LAUNCHPAD_ENABLED` is **not** `NEXT_PUBLIC_`. Flip last. Do not enable sandbox/prod without Morgan.

## Webhooks

- Launchpad: `/api/fusarium/launchpad/stripe/webhook` + `STRIPE_LAUNCHPAD_WEBHOOK_SECRET`
- Legacy: `/api/stripe/webhooks` — ignores Launchpad-scoped events (lp_tenant_id / fus_launchpad_*)

## Local provision

```powershell
# ASCII-safe; refuses sk_live_ unless ALLOW_STRIPE_LIVE_PROVISION=1
.\scripts\launchpad\provision-platform-secrets.ps1 -NonInteractive
# Prefer sk_test_… for catalog smoke:
#   $env:STRIPE_SECRET_KEY='sk_test_…'; npx tsx scripts/launchpad/provision-stripe-catalog.ts
```

## GitHub Actions / blue-green secrets checklist

Set the same names as repository or environment secrets for both colors (values never in git):

| Secret | Notes |
|---|---|
| `LAUNCHPAD_ENABLED` | Must remain `0` until Morgan go |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → service_role |
| `STRIPE_SECRET_KEY` | `sk_test_` first |
| `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` | From Launchpad webhook endpoint |
| `LAUNCHPAD_INGEST_TOKEN` / `LAUNCHPAD_AGENT_ROOT_SECRET` | Deprecated break-glass; prefer `lp_` tenant keys |
| `SAM_API_KEY` | Optional until collectors run in CI/cron |
