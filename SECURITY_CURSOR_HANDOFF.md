# Security — Cursor Handoff (credentialed agent with VM / MCP / Supabase access)

For an agent that **has** the production credentials, Supabase MCP, GitHub secrets access,
and SSH to the VMs — i.e. the things this sandboxed audit deliberately did not touch on
live systems. Each task notes how to verify it. Companion: `SECURITY_AUDIT_2026-06-09.md`,
`SECURITY_MORGAN_ACTION_STEPS.md`.

> Coordinate with Morgan's steps: he rotates keys/secrets; you wire them into runtime and
> apply the live‑DB changes. Do the rotations (his #1–#3) before/with task 3 below.

---

## 1. Apply the RLS hardening migration to the production DB  (HIGH)

File: `supabase/migrations/20260609_security_hardening_rls.sql`. It is **not** auto‑applied.

1. Read it; uncomment the `defense_briefing_requests` and storage‑bucket blocks only after
   confirming those access patterns against the app.
2. Apply via Supabase MCP (`apply_migration`) or the SQL editor on project `hnevnsxnhfibhbsipqvz`.
3. **Test with the app open:** create/view an incident, submit a defense briefing request,
   load an avatar/species image, run an NLM training action. Nothing user‑facing should 403.
4. Re‑run the security advisor and confirm the `rls_policy_always_true` and
   `authenticated_security_definer_function_executable` findings clear.

Rollback: each `DROP POLICY` / `REVOKE` is reversible by recreating the prior policy/grant.

---

## 2. Provision the employee‑PII file out of the repo  (HIGH)

`config/security/authorized-users.json` was removed from the repo (it contains home GPS
coords). The app reads it at runtime from, in order: `../mycosoft-mas/config/security/…`,
`./config/security/…`, then `/opt/mycosoft/config/security/authorized-users.json`
(`app/api/security/route.ts`).

1. Place the file on each VM at `/opt/mycosoft/config/security/authorized-users.json`
   (perms `600`, owned by the service user). Pull the content from a VM that still has it,
   or from pre‑removal git history — do **not** re‑commit it.
2. Confirm the security dashboard's authorized‑users panel still works after deploy.
3. Run Morgan's history scrub (his step 8) so the GPS data leaves git history.

---

## 3. Finish the NEXTAUTH_SECRET de‑bake  (HIGH)

This PR removed the weak `change-me-before-prod` default but the secret is still set as an
ENV in `Dockerfile.production` (inherited by the runner stage). Complete the move to runtime‑only:

1. In `Dockerfile.production`, delete both `ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}` lines
   (builder/base stage and runner stage). `next build` does not need it.
2. In `.github/workflows/ci-cd.yml`:
   - **Remove** `NEXTAUTH_SECRET=${{ secrets.NEXTAUTH_SECRET }}` from both `build-args:` blocks (~lines 277, 829).
   - **Add** `echo 'NEXTAUTH_SECRET=${{ secrets.NEXTAUTH_SECRET }}' >> .env` to both runtime
     `.env`‑writing blocks (next to the `SUPABASE_SERVICE_ROLE_KEY` line, ~458, ~908).
3. Ensure `NEXTAUTH_SECRET` is set as a GitHub Actions secret (Morgan #3) and in each VM `.env`.
4. Redeploy. **Verify:** log in, restart the container, confirm the session persists (proves
   the runtime secret is stable and not a per‑process random).
5. Confirm `docker inspect <image>` / `docker history` no longer shows `NEXTAUTH_SECRET`.

---

## 4. Lock down the services‑stack Redis fully  (MEDIUM)

`docker-compose.services.yml` Redis is now loopback‑bound but still password‑less on the
compose network. To add auth:
1. Add `--requirepass ${REDIS_PASSWORD:?set in .env}` to the redis `command`.
2. Update every `REDIS_URL` in that file to `redis://:${REDIS_PASSWORD}@redis:6379`.
3. Set `REDIS_PASSWORD` in the stack's `.env`. Bring the stack up and confirm all collectors connect.

---

## 5. Device telemetry ingest authentication  (MEDIUM)

`app/api/devices/ingest` is unauthenticated by necessity (devices aren't users). This PR added
an **opt‑in** gate: if `DEVICE_INGEST_TOKEN` is set, devices must send `x-device-token`.
1. Interim: set `DEVICE_INGEST_TOKEN` on the server and push the matching token to the fleet/firmware.
2. Real fix: implement per‑device HMAC (sign payload with a per‑device key from the device
   registry; verify server‑side). Then enforce it for all devices.

---

## 6. Dependencies  (MEDIUM)

1. Remove the unused `ikonate` git dependency (it drags in vulnerable `jsdom@11`/`xmldom`/`tough-cookie`):
   `npm remove ikonate` — confirm nothing imports it, then `npm install`.
2. `npm audit fix` for the non‑breaking set.
3. Targeted upgrades for the criticals: `next` (patch within 15.x), `protobufjs`, `form-data`,
   `jspdf`, `handlebars`. Re‑run `npm audit` and the app's smoke tests.

---

## 7. Third‑party exposure cleanup  (MEDIUM/LOW)

1. **`x402.direct`** (`app/api/global-agents/route.ts`): confirm who operates it and what it
   logs from your server‑side calls. If untrusted, gate behind a feature flag or remove.
2. **`ip-api.com`** (`app/api/security/route.ts:1146,1274`): plaintext HTTP, third‑party gets
   visitor IPs. Replace with an HTTPS provider (e.g. ipapi.co/ipinfo) or self‑host MaxMind GeoLite2.
3. **Cesium from unpkg** without SRI (`components/earth-simulator/cesium-globe.tsx`,
   `components/search/fluid/widgets/ObservationEarthPortal.tsx`): vendor the npm package
   (already installed) or add SRI hashes.
4. `next.config.js`: replace the `d*.cloudfront.net` **wildcard** in `images.remotePatterns`
   with your specific distribution; confirm you own the `*.vercel-storage.com` blob host.

---

## 8. Harder, planned items  (track, don't rush)

- **SSH host‑key verification:** ~83 `paramiko.AutoAddPolicy()` + `StrictHostKeyChecking=no`
  across deploy scripts. Introduce a pinned `known_hosts` (or SSH CA) and switch scripts to it.
- **Re‑enable build checks:** `next.config.js` has `ignoreBuildErrors`/`ignoreDuringBuilds: true`.
  Re‑enable incrementally (expect a backlog of TS errors to fix first).
- **CSP:** remove `'unsafe-inline'`/`'unsafe-eval'`; move to nonce/hash‑based script‑src.
- **Centralize internal IPs:** the `192.168.0.x` map is hardcoded across ~90 files; move to env
  config and strip from shipped client code.
- **Audit the sibling repos** (`mycosoft-mas`, MINDEX, firmware/device) the same way — they
  share credentials and internal hosts with this one.

---

## Done‑in‑this‑PR (for context, don't redo)
RCE guard on `network-diagnostics`; privilege‑escalation fix (email‑derived roles in
`lib/auth/server-role.ts` + 9 call sites); `requireAdmin`/`requireCompanyAuth` on docker
images/mcp/logs, MAS orchestrator, incidents‑test, autonomous experiments, CCTV register;
Ollama/Prometheus/services‑Redis bound to loopback; Dockerfile secret defaults removed;
debris + PII file untracked; RLS migration authored.
