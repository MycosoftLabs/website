# CUI + Security Audit — Executive Summary (Lane A / Claude)

**Date:** 2026-07-15 · **Scope:** `MycosoftLabs/website` codebase + GitHub posture, Supabase production DB, public web surface.
**Standard:** NIST SP 800-171 Rev. 2 / CMMC L2 · **Method:** read-only, honesty-first (no control asserted without evidence; nothing mutated).
**Company:** Mycosoft, LLC · UEI YK3ARVKJ77S9 · CAGE 9KR60 · SAO Morgan Rockcoons.

> This is **Lane A** (my lane). **Lane B** (Cursor) covers Ubiquiti network, Proxmox + VMs, PreVeil admin console, endpoints, physical. Merge both `findings.jsonl` into the unified report.

## Finding counts (Lane A)
| Severity | Count |
|---|---|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 6 |
| Informational / Not-Verified | 1 |
| **Total** | **11** |

**Zero active CUI leaks found** in the codebase, and **no server secrets** are committed (only `.env.example` templates are tracked; `.gitignore` correctly covers `.env*`, `.credentials`, and the `api_keys.env.PRIVATE` fixture).

## Top findings (by risk)
1. **[HIGH] Google Maps API key committed in plaintext in the PUBLIC repo** (0001) — real key in 4 tracked files + git history (commit `753a7bb2`), ironically including `SECURITY_AUDIT_2026-03-11.md` and `MANUAL_SECURITY_STEPS.md`. It's a client-exposed `NEXT_PUBLIC` Maps key (browser exposure is by design), so severity is *high, not critical* — but a key in a public repo must be **rotated + referrer-locked** and purged from history.
2. **[MED] SECURITY DEFINER functions callable by `authenticated`** (0002) — `handle_super_admin_role()`, `is_staff()`, + 3 more are invocable via `/rest/v1/rpc` on the prod Supabase DB. Privilege-escalation surface; revoke EXECUTE or switch to SECURITY INVOKER.
3. **[MED] Audit-integrity RLS gap** (0003) — any authenticated user can INSERT into `audit_logs` / `security_events` / `incidents` and UPDATE any `incidents` row (`WITH CHECK (true)` / `USING (true)`). Audit records can be forged. Scope the policies to owner/service_role.
4. **[MED] No branch protection on production public repo `main`** (0004) — no required reviews, no CI gate, force-push allowed. Enable protection.
5. **[LOW ×6]** mutable `search_path` functions (0005), public buckets allow listing (0006), 8 tables RLS-enabled-no-policy (0007), npm 1-high/10-mod deps (0008 — undici, low real exploitability), 2 orphaned paused Supabase projects (0009), tracked build/temp files (0010).
6. **[NOT VERIFIED]** GitHub **org 2FA enforcement** (0011) — the available token lacks org-owner scope; flagged Not Verified, not assumed compliant. Operator must confirm.

## What's healthy (positive findings)
- **Public web surface is well-hardened:** full CSP, `Strict-Transport-Security` with `preload` + `includeSubDomains`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `object-src 'none'`, `frame-ancestors 'none'`, behind Cloudflare (mycosoft.com root → 200).
- **GitHub secret-scanning + push-protection are enabled**; **no outside collaborators** on the repo.
- **No `zeetachec` references** anywhere (self-perform rule upheld). **EIN not in source.** Name-integrity scan: no "RJ Murphy"/"Arjun" as a person reference (the 3 geojson hits are public OSM/iNat operator/observer name-field false positives, reviewed).
- The **CMMC compliance module itself is intact**: hydrated 110-control reference verified (MD5 `abca7ab1…`), SPRS engine gated, posture honest (0 implemented).

## Not covered in Lane A (requires operator / Lane B)
Cloud consoles that require interactive credentialed login — **AWS, Vercel, Cloudflare, Google Workspace/Gmail, PreVeil admin, SAM.gov, domain registrar** — were **not** audited here: entering those credentials is out of scope for an automated agent (operator must perform, or use a dedicated connector). External port/exposure scanning (Shodan/Censys) and full DNS/subdomain enumeration were not run this pass. These are tracked as operator/Lane-B items, **not** marked compliant.

## Remediation roadmap
- **Now (Cursor/Morgan, <1 day):** rotate + referrer-lock the Google Maps key and purge from history (0001); enable `main` branch protection (0004); revoke EXECUTE on the SECURITY DEFINER functions (0002); tighten the audit/incident RLS policies (0003).
- **This week:** set `search_path` on the 2 functions (0005); scope public bucket policies (0006); `npm audit fix` + add Dependabot (0008); resolve/delete orphaned Supabase projects after CUI check (0009); remove tracked temp files (0010); define or document the 8 tissue_* table policies (0007).
- **Operator:** confirm org-wide 2FA + export GitHub member/OAuth/PAT inventory (0011); run the cloud-console + external-exposure portions.

## Attestation
`verified_by_sao: false` — pending Morgan Rockcoons (SAO) review.
