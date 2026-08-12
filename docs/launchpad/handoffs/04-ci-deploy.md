# Launchpad Handoff 04 — CI, Deploy, Rollout (Cursor)

**Lane:** Cursor owns blue-green env files, CI secrets, and the rollout sequence.

## Env vars to land in BOTH blue-green colors (server-side)

```
LAUNCHPAD_ENABLED=0                      # the runtime kill switch — flip LAST
NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE=1    # baked at build; 1 until counsel clears terms
STRIPE_SECRET_KEY=                       # test first, live at cutover
STRIPE_LAUNCHPAD_WEBHOOK_SECRET=
LAUNCHPAD_INGEST_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=               # already optional in CI; Launchpad waitlist/webhook require it
```

`LAUNCHPAD_ENABLED` is deliberately NOT `NEXT_PUBLIC_` — it is read per-request server-side, so flipping it on the active slot enables/disables the app without a rebuild. With it off, `/app/launchpad/*` 404s (layout) and every BFF route returns 404 `launchpad_disabled` (verified).

## Migrations

All six Launchpad migrations are **already applied** to prod Supabase (`hnevnsxnhfibhbsipqvz`) via MCP and committed under `supabase/migrations/20260811*`. Add a migration-apply step to deploy if/when the repo adopts `supabase db push`; until then, keep MCP/manual application in lockstep with the files. After ANY future launchpad migration, run `scripts/launchpad/rls-selftest.sql` (two-user impersonation; all rows must PASS).

## Rollout order

1. Env vars into green → deploy green → smoke: marketing pages 200, `/app/launchpad` 404 (flag off), BFF 404.
2. Flip `LAUNCHPAD_ENABLED=1` on green only → full walkthrough with a real non-company test account (signup → tenant → controls → snapshot → billing test checkout).
3. Cut over blue-green as usual (`scripts/blue-green-deploy.sh`); flip blue's env before it next becomes active.
4. Keep prod flag OFF until: counsel-approved terms replace the DRAFT legal pages, Stripe live keys are in, and Morgan gives the go.

## Known repo issues encountered (pre-existing, not Launchpad)

- Jest is broken repo-wide (`jest-runtime`/`jest-mock` version mismatch: `clearMocksOnScope is not a function`). The Launchpad vector suite runs via `node_modules/.bin/tsx scripts/launchpad/run-score-vectors.ts` (same test file, tiny shim) — 15/15 green. Fixing jest restores `jest lib/launchpad/scoring` directly.
- 27 pre-existing `tsc --noEmit` errors in unrelated files (CREP client, earth-simulator container, jest.config). Launchpad files are 0-error.
- Site-wide dev-console `removeChild` TypeError + `OuterLayoutRouter` key warning appear on every page (including `/about`) — predates this work.
