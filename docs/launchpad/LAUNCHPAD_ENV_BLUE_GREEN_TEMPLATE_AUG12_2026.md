# Launchpad Blue-Green / Deploy Env Template — Aug 12, 2026

Copy these into **both** blue and green slots. Values are placeholders — never commit secrets.

## Required (server-side)

```
LAUNCHPAD_ENABLED=0
LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=0
NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE=1
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_LAUNCHPAD_WEBHOOK_SECRET=
LAUNCHPAD_INGEST_TOKEN=
LAUNCHPAD_AGENT_ROOT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
SAM_API_KEY=
```

## DocuSign + Cal.com (placeholders — Aug 13 addendum)

Keep `LAUNCHPAD_DOCUSIGN_PLATFORM_SEND=0` unless Mycosoft dogfood JWT is explicitly enabled. Customer send path is OAuth to **their** DocuSign account.

```
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_SECRET_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_API_ACCOUNT_ID=
DOCUSIGN_AUTH_SERVER=https://account-d.docusign.com
DOCUSIGN_BASE_URL=https://demo.docusign.net
DOCUSIGN_REDIRECT_URI=
DOCUSIGN_RSA_PRIVATE_KEY_PATH=
DOCUSIGN_CONNECT_HMAC_KEY=
DOCUSIGN_CONNECT_SECRET=
LAUNCHPAD_DOCUSIGN_PLATFORM_SEND=0
CALCOM_API_KEY=
CALCOM_WEBHOOK_SECRET=
CALCOM_BOOKING_BASE_URL=
CALCOM_EVENT_TYPE_ADVISORY_15=
CALCOM_EVENT_TYPE_ADVISORY_30=
CALCOM_EVENT_TYPE_ADVISORY_60=
CALCOM_EVENT_TYPE_ADVISORY_90=
```

Connect webhook: `/api/fusarium/launchpad/signatures/webhook`  
Cal.com webhook: `/api/fusarium/launchpad/advisory/webhook`

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
| `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` | Storefront kill switch; independent of workspace flag. `0` until Morgan opens sales |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → service_role |
| `STRIPE_SECRET_KEY` | `sk_test_` first |
| `STRIPE_LAUNCHPAD_WEBHOOK_SECRET` | From Launchpad webhook endpoint |
| `LAUNCHPAD_INGEST_TOKEN` / `LAUNCHPAD_AGENT_ROOT_SECRET` | Deprecated break-glass; prefer `lp_` tenant keys |
| `SAM_API_KEY` | Optional until collectors run in CI/cron |
| `DOCUSIGN_*` | Integration key + secret for customer OAuth; RSA PEM + user/account only for JWT dogfood |
| `LAUNCHPAD_DOCUSIGN_PLATFORM_SEND` | Must stay `0` unless Morgan enables Mycosoft-as-sender |
| `CALCOM_*` | Booking base URL + event types; webhook secret for `BOOKING_CREATED` |
