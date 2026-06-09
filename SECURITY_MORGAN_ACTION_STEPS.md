# Security — Action Steps for Morgan (do these now)

These require credentials, external dashboards, or decisions only you can make. They
**cannot** be automated from the repo. Ordered by urgency. Companion: `SECURITY_AUDIT_2026-06-09.md`.

The code fixes (RCE, privilege escalation, route auth, container hardening, debris
removal) are already done in this PR. These steps close the parts that live outside the code.

---

## 1. Rotate the production Supabase anon key  ⏱️ ~10 min — DO FIRST

The anon key for the production project (`hnevnsxnhfibhbsipqvz`) was committed in the
Dockerfile and is permanently in git history.

1. Go to https://supabase.com/dashboard/project/hnevnsxnhfibhbsipqvz/settings/api
2. Under **Project API keys**, click **Roll** (regenerate) on the `anon` `public` key.
   - Note: this invalidates current browser sessions; users re-login. Do it during a low‑traffic window.
3. Copy the new anon key and the project URL.
4. Update them everywhere the app reads them:
   - **GitHub → Settings → Secrets and variables → Actions:** set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (repo + `production` environment).
   - **On each VM**, in the deploy `.env`: `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
5. Redeploy (or hand to Cursor — see its handoff).
6. **Also roll the `service_role` key** on the same page if you suspect it leaked, and update `SUPABASE_SERVICE_ROLE_KEY` in GitHub secrets + VM `.env`. (It is not in the repo, but it is reconstructed into the VM `.env` by CI.)

> Rolling the key only helps if RLS is tight. Apply the RLS migration too (Cursor handoff #1).

---

## 2. Rotate + restrict the Google Maps API key  ⏱️ ~10 min

Key `AIzaSyA9wzTz5MiDhYBdY1vHJQtOnw9uikwauBk` is in git history and docs. Assume it is public.

1. https://console.cloud.google.com/apis/credentials
2. Delete (or regenerate) that key.
3. Create a new key, then **restrict** it:
   - **Application restrictions → HTTP referrers:** `https://mycosoft.com/*`, `https://*.mycosoft.com/*`
   - **API restrictions:** only the Maps APIs you use (Maps JavaScript API, etc.)
4. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in GitHub Actions secrets + VM `.env`. Redeploy.

---

## 3. Rotate NEXTAUTH_SECRET and set it as a real secret  ⏱️ ~10 min — IMPORTANT

`Dockerfile.production` previously baked `NEXTAUTH_SECRET` into the image with a weak
default (`change-me-before-prod`). If the GitHub secret was never set, **production may be
signing session cookies with that public string right now** — meaning anyone can forge a
session. Treat the current secret as compromised.

1. Generate a strong secret:
   ```bash
   openssl rand -base64 32
   ```
2. **GitHub → Settings → Secrets and variables → Actions:** set `NEXTAUTH_SECRET` (repo **and** the `production` environment).
3. On each VM, add to the deploy `.env`: `NEXTAUTH_SECRET=<the value>`
4. Have Cursor finish the de-bake (its handoff #3) and redeploy. After deploy, confirm you can log in and that sessions survive a container restart.

---

## 4. Firebase key — restrict and audit rules  ⏱️ ~15 min

`firebase-applet-config.json` ships key `AIzaSyB-bk_ka1dkyPFVOkd8MCF9s14XS4VufNw`
(project `gen-lang-client-0314241488`) into the **client bundle**. Firebase web keys are
"public," but only safe if Firestore/Storage **security rules** are restrictive.

1. https://console.firebase.google.com/project/gen-lang-client-0314241488/firestore/rules
   - Confirm rules are NOT `allow read, write: if true;`. Lock to authenticated and per‑document ownership.
2. In Google Cloud Console, add an **HTTP referrer restriction** to the key (`mycosoft.com/*`).
3. If the NLM tooling that uses it is internal‑only, consider moving Firebase config to env vars and removing the JSON (Cursor can do the code change).

---

## 5. Confirm whether crypto‑wallet / VM SSH secrets were ever real and exposed  ⏱️ ~15 min

CI writes `MYCOSOFT_SOL_WALLET`, `MYCOSOFT_ETH_WALLET`, `MYCOSOFT_BTC_WALLET`, and
`SUPABASE_SERVICE_ROLE_KEY` into a VM `.env` via `echo` (`.github/workflows/ci-cd.yml`).
The values are GitHub secrets (not in the repo), but:

1. Confirm the `MYCOSOFT_*_WALLET` secrets are **public addresses**, not private keys. If any is a **private key**, rotate the wallet immediately and never put a private key in CI.
2. If `ACTIONS_STEP_DEBUG` was ever enabled, assume those values were logged — rotate them.
3. Two old scripts (`_quick_check.py`, `_temp_deploy.py`) had a placeholder `REDACTED_VM_SSH_PASSWORD`. Confirm the real VM SSH password was never committed: 
   ```bash
   git log -p -S "password = '" -- _quick_check.py _temp_deploy.py
   ```
   If a real value appears, rotate the VM password. (Better: switch VMs to SSH keys only.)

---

## 6. Cloudflare protections  ⏱️ ~20 min

You're behind Cloudflare — turn these on as edge defense‑in‑depth:
1. **WAF:** enable the Cloudflare Managed Ruleset / OWASP Core Ruleset.
2. **Rate limiting:** ~100 req/min per IP on `/api/*`.
3. **SSL/TLS:** set to **Full (strict)**.
4. **Firewall rule:** block public access to `/api/docker/*`, `/api/admin/*`, `/api/security/network-diagnostics`, `/api/mas/orchestrator/*` (allow only your office/VPN IPs) — defense in depth on top of the app‑level auth just added.
5. Consider **Cloudflare Access (Zero Trust)** in front of `/natureos` admin tooling.

---

## 7. Decision: replace the shared team password  ⏱️ policy decision

All 8 team accounts still authenticate with one shared `MYCOSOFT_DEFAULT_PASSWORD`
(`app/api/auth/[...nextauth]/route.ts`). If it leaks, every account (including owner)
is compromised. Decide to move to per‑user passwords (bcrypt) or Supabase Auth only.
Cursor can implement once you choose. Until then, set a **strong** `MYCOSOFT_DEFAULT_PASSWORD`
and rotate it.

---

## 8. Scrub git history (optional but recommended)  ⏱️ ~30 min — destructive

This PR removed the employee‑PII file and debris from HEAD, but they remain in history,
as do the old Supabase/Maps keys. To purge:
1. Install `git filter-repo` (https://github.com/newren/git-filter-repo).
2. On a fresh clone:
   ```bash
   git filter-repo --path config/security/authorized-users.json --invert-paths
   git filter-repo --replace-text <(echo 'AIzaSyA9wzTz5MiDhYBdY1vHJQtOnw9uikwauBk==>[REDACTED]')
   ```
3. Force‑push (coordinate with the team — this rewrites history). Rotating the keys (steps 1–2)
   makes the leaked values useless even if you skip the scrub; the PII (home GPS) cannot be
   "rotated," so the scrub matters more for that file.

---

## Quick verification checklist (after the above + redeploy)
- [ ] `curl https://mycosoft.com/api/security/network-diagnostics?action=dns&domains=x;id` → **401**, not command output.
- [ ] A normal logged‑in (non‑team) user calling `updateUser({data:{role:'superuser'}})` then hitting `/api/natureos/nlm-training` → **403**.
- [ ] `curl https://mycosoft.com/api/docker/images` → **401**.
- [ ] Login works and survives a container restart (NEXTAUTH_SECRET set at runtime).
- [ ] Google Maps still loads with the new restricted key.
