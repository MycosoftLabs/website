# Mycosoft.com — Security Audit & Remediation

**Date:** June 9, 2026
**Scope:** `mycosoftlabs/website` repo, plus the live production Supabase database, infrastructure/deploy config, dependencies, and third‑party integrations it reveals.
**Method:** Static review of every API route, middleware, auth helper, Dockerfile, compose file, GitHub workflow, and config; full git‑history secret scan (65 commits); `npm audit`; and a **live** Supabase security‑advisor run against the production project.
**Authorization:** Owner‑requested audit of owner's own systems.

> Companion documents:
> - `SECURITY_MORGAN_ACTION_STEPS.md` — things only you can do (key rotations, dashboard/Cloudflare changes, history scrub), with step‑by‑step instructions.
> - `SECURITY_CURSOR_HANDOFF.md` — tasks for an agent with full credential/MCP/VM access (live DB migration, VM provisioning, secret rotation in CI).

---

## Executive summary

The worst issues from the **March 2026** audit are genuinely **fixed** (firmware RCE, hardcoded JWT secret, empty default password, API‑key reveal endpoint, global TLS disable, OAuth email‑prefix escalation, `$regex` injection, PDF SSRF, dev auth bypass, default Postgres/Grafana/N8N passwords). Good.

However, ~3 months of new code reintroduced serious gaps, and a **live check of the production database** found real exposure. The critical items:

| # | Finding | Status after this commit |
|---|---------|--------------------------|
| C‑1 | **Unauthenticated RCE** — shell injection in `/api/security/network-diagnostics` | **FIXED in code** (this PR) |
| C‑2 | **Privilege escalation** — admin gates trust user‑writable `user_metadata.role` | **FIXED in code** (this PR) |
| C‑3 | **Live DB exposure** — committed anon key = production project; permissive RLS + SECURITY DEFINER funcs callable by any authed user | **Migration written; must be applied to live DB** (Cursor/Morgan) |
| C‑4 | **Unauthenticated infra routes** — docker image/mcp/logs, MAS orchestrator, autonomous experiments, incidents‑test, cctv register | **FIXED in code** (this PR) |
| C‑5 | **`NEXTAUTH_SECRET` baked into prod image**; **Supabase key defaults in Dockerfile** | **FIXED in code** (this PR) |
| C‑6 | **Secrets to rotate** (Supabase anon, Google Maps, possibly Firebase, NEXTAUTH_SECRET) | **Morgan must rotate** (cannot be automated) |

There is **no evidence any secret was ever committed and scrubbed** — git history is clean of API keys, tokens, and private keys. `.gitignore` correctly excludes `.env*` and `.credentials.local`.

---

## Critical findings (detail)

### C‑1 — Unauthenticated remote code execution (shell injection)
**File:** `app/api/security/network-diagnostics/route.ts:51`
```js
const domains = searchParams.get('domains') || 'mycosoft.com';
const { stdout } = await execAsync(`nslookup ${domains.split(',')[0]} 8.8.8.8`);
```
The `domains` query parameter is interpolated into a shell command with no auth and no sanitization. The middleware only gates *page* routes (the route map in `lib/access/routes.ts` contains zero `/api/*` entries), so this is reachable from the open internet.
**Exploit:** `GET /api/security/network-diagnostics?action=dns&domains=x;id` runs arbitrary commands as the Node process. `?action=connectivity` runs `nmap -sn 192.168.0.0/24` against the internal LAN.
**Fix applied:** added `requireAdmin()` to the handler; replaced `exec` of the `dns`/`latency`/`connectivity`/`diagnostics` branches with `execFile` (no shell) and a strict hostname allowlist on `domains`.

### C‑2 — Privilege escalation via self‑assigned role
**File:** `lib/auth/verified-identity.ts:16‑17`
```js
export function normalizeVerifiedRole(user: any): string {
  return String(user?.user_metadata?.role || "user").toLowerCase().trim()
}
```
`user_metadata` is **writable by the user** via the public anon key: `supabase.auth.updateUser({ data: { role: 'superuser' }})`. Public signups are enabled (`app/signup/page.tsx:66`). Any visitor could therefore sign up, set their own role, and pass every `requireOwnerOrSuperuserIdentity` / `requireAdminIdentity` gate. Confirmed surface: the entire NLM model‑training admin API (8 routes under `/api/natureos/nlm-training/*`), `/api/mas/system-memory`, `/api/search/memory`, and ~10 more.
**Fix applied:** server roles are now derived from the **Supabase‑verified email** against a hardcoded company allowlist (`lib/auth/server-role.ts`), never from `user_metadata`. All inline `user_metadata.role` readers in MYCA/ethics routes were repointed to the same helper.

### C‑3 — Live production database exposure (verified against project `hnevnsxnhfibhbsipqvz`)
The anon key + URL committed in `Dockerfile:66‑67` decode to your **ACTIVE** "Mycosoft.com Production" project. Anon keys are only safe behind strict RLS. Supabase's own security advisor (run live during this audit) flags:
- **Always‑true RLS** on `incidents` (INSERT+UPDATE), `audit_logs` (INSERT), `security_events` (INSERT), `defense_briefing_requests` (INSERT) — any authenticated user can forge/tamper security & audit records.
- **`SECURITY DEFINER` functions callable by `authenticated`**: `handle_super_admin_role`, `create_chain_entry` (MINDEX chain‑of‑custody/Merkle write), `is_staff`, `handle_new_user`.
- **Public buckets** `avatars`, `species-images` allow full object listing.
- Two functions with mutable `search_path` (`worldview_rate_weight_last_minute`, `worldview_meter_and_limit`).
**Fix:** a migration (`supabase/migrations/20260609_security_hardening_rls.sql`) is included that tightens these policies and revokes EXECUTE. **It must be applied to the live DB** — see the Cursor handoff (it is intentionally not auto‑applied to production from this sandbox).

### C‑4 — Unauthenticated infrastructure routes (newer regressions)
The middleware allowlist means any route that does not guard *itself* is public. Guarded in this PR:

| Route | Was exposed | Guard applied |
|-------|-------------|---------------|
| `app/api/docker/images` (GET+POST) | pull/remove images | `requireAdmin` |
| `app/api/docker/mcp` (GET+POST) | deploy/manage MCP containers | `requireAdmin` |
| `app/api/docker/containers/logs` (GET+POST) | read container logs | `requireAdmin` |
| `app/api/mas/orchestrator/action` (GET+POST) | `stop-all`/`spawn` agents | `requireAdmin` |
| `app/api/security/incidents/test` (GET+POST) | service‑role writes to prod incidents | `requireAdmin` |
| `app/api/autonomous/experiments` (GET+POST) | create/list experiments | `requireCompanyAuth` |
| `app/api/autonomous/experiments/[id]/[action]` (POST) | mutate experiments | `requireCompanyAuth` |
| `app/api/cctv/register` (GET+POST) | issue CCTV tokens, list operators | `requireCompanyAuth` |

**Deliberately NOT auto‑guarded:** `app/api/devices/ingest` — adding human/company auth would break the device fleet (devices aren't logged‑in users). It needs a device HMAC/token scheme — see handoff. A `SECURITY TODO` marker was added in the file.

### C‑5 — Build/image secret handling
- `Dockerfile.production:21,57,86` accepted `NEXTAUTH_SECRET` as a **build‑arg** (`ARG NEXTAUTH_SECRET=change-me-before-prod`) and baked it into image layers. **Fixed:** removed the ARG and the builder‑stage ENV; the secret is now expected only at container runtime.
- `Dockerfile:66‑67` shipped the production Supabase URL + anon key as ARG **defaults**. **Fixed:** defaults removed; values must be passed via `--build-arg` from CI secrets.

### C‑6 — Secrets that must be rotated (cannot be automated)
- **Supabase anon key** for `hnevnsxnhfibhbsipqvz` (in git history permanently).
- **Google Maps key** `AIzaSy…auBk` (removed from Dockerfile previously but still in history/docs).
- **NEXTAUTH_SECRET** (was build‑arg‑baked; assume compromised).
- **Firebase web key** `AIzaSy…VufNw` — verify Firestore rules; restrict by HTTP referrer.
See `SECURITY_MORGAN_ACTION_STEPS.md`.

---

## High / Medium findings (summary)

**Infrastructure**
- Ollama on `0.0.0.0:11434` with no auth (`docker-compose.yml:310‑314`, `docker-compose.production.yml:148‑152`). **Fixed → `127.0.0.1`.**
- Redis with no `--requirepass` on `0.0.0.0:6379` in `docker-compose.services.yml:19`. **Fixed → requirepass + localhost bind.**
- Prometheus `--web.enable-lifecycle` on `0.0.0.0:9090` (`docker-compose.yml`). **Fixed → `127.0.0.1` bind.**
- ~83 `paramiko.AutoAddPolicy()` + `StrictHostKeyChecking=no` across deploy scripts → MITM risk on LAN. **Handoff** (broad change; needs `known_hosts` strategy).
- Internal network topology (`192.168.0.x` map: UniFi, Proxmox, MAS, MINDEX, MycoBrain, NemoClaw) hardcoded across ~90 shipped files. **Partial** — centralization is a handoff item.

**Secrets/keys in repo**
- Employee **PII** with home GPS coordinates in `config/security/authorized-users.json`. **Untracked in this PR** (file read at runtime from `/opt/mycosoft/...` fallback); history scrub + VM provisioning are handoff items.
- Hardcoded fallback keys: `MINDEX_API_KEY="test_key"` (`app/api/global-agents/route.ts:92,139`), ChemSpider `"temp-mock-…"` (`lib/services/chemical-data.ts:5`). **Fixed → fail closed instead of sending fake keys.**
- Google Maps key value redacted from committed docs.

**Third parties you may not be aware of**
- `x402.direct` — unconditional server‑side fetch on every `/api/global-agents` call (crypto "x402 payment protocol" registry, unknown operator), republished on your stats page + forwarded to MINDEX telemetry. **Review who runs it.**
- `ip-api.com` over **plaintext HTTP** — visitor IPs sent to a third‑party geo service (`app/api/security/route.ts:1146,1274`). **Fixed → HTTPS.**
- `ikonate` installed via `git+ssh`, pulling deprecated `jsdom@11`/`xmldom@0.1.27`/`tough-cookie@2.5.0` (root of several npm‑audit highs); appears unused. **Handoff: remove.**
- Cesium loaded from `unpkg.com` without SRI; `microlink.io`/`kiwisdr.com`/`gtfsrt.prod.obanyc.com` over HTTP; a `*.vercel-storage.com` blob bucket and `d*.cloudfront.net` **wildcard** in `next.config.js`.

**Dependencies**
- `npm audit`: **8 critical / 31 high**. Notable: `next` (your `^15.1.11` is in‑range), `protobufjs` (code exec), `form-data`, `handlebars`, `jspdf`, `request` (SSRF), `xmldom`, `vitest` (dev).

**Next.js config**
- `ignoreBuildErrors: true` + `ignoreDuringBuilds: true` (TS/ESLint security checks bypassed); CSP allows `'unsafe-inline'`/`'unsafe-eval'`. **Handoff** (re‑enabling may surface build breaks; needs a focused pass).

**Repo debris** (operational output that shouldn't be tracked): `git_diff*.txt`, `node-processes.txt`, `tsc_output*.txt`, `ts_errors.txt`, `tsout.txt`, `git-status.txt`, `conflict.diff`, `temp_original_crep.txt`, `cmd.json`, `x402.txt`, `pr_logs.txt`, `scripts/_mycobrain_check_result.txt`, plus historical `site-media-audit-*.json` / `asset-audit-*`. **Removed + `.gitignore` updated** in this PR.

---

## What was already fixed before this audit (no action needed)
Firmware/service‑manager RCE, hardcoded JWT secret fallback, empty default password, `?reveal=` API‑key endpoint, UniFi global TLS disable, OAuth email‑prefix escalation, species `$regex` injection, PDF/brain SSRF, `NODE_ENV=development` auth bypass, default Postgres/Grafana/N8N passwords.

---

## Cross‑repo note
This audit covers `mycosoftlabs/website` only. The repo couples tightly to **MAS** (`mycosoft-mas`), **MINDEX**, and the device/firmware repos (shared `.credentials.local`, `set-github-ssh-secret-from-vm.py`, internal API hosts). Those repos were **not** in scope and should get the same treatment. There are also three Supabase projects in the org — production (`hnevnsxnhfibhbsipqvz`, active) plus `mycosoft.com` and `mycosoftmas` (both INACTIVE); confirm the inactive two are intentionally dormant.
