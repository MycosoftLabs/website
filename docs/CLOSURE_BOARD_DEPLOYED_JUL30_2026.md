# Closure Board Deployed — Jul 30, 2026

**Date:** 2026-07-30  
**Status:** Complete  
**Commit:** `2b728e75524967b9c5e349aef925ba26f5ddaa05`  
**Image:** `ghcr.io/mycosoftlabs/website:2b728e7`  
**Sandbox active slot:** `blue`

## Scope

Live MAS Closure Board on `/security/compliance` (tab between Tier-1 Turnkey and Audit Logs):

- `app/api/security/closure-board/route.ts` — `requireAdmin()` BFF; joins MAS `/api/compliance/controls`
- `components/security/ClosureBoardPanel.tsx` — read-only UI
- `lib/security/closure/closure-guidance.ts` / `closure-statements.ts`
- `app/security/compliance/page.tsx` — tab registration

## Phase results

| Phase | Result |
|-------|--------|
| 1 Verify (local 3010 + MAS) | **PASS** |
| 2 Security / CMMC review | **PASS** (no HIGH/CRITICAL) |
| 3 Commit + push `main` | **PASS** — `2b728e75` |
| 4 Blue-green Sandbox + CF purge | **PASS** — active=`blue` |
| 5 Post-deploy verify | **PASS** |

## Live figures verified (MAS + authenticated BFF)

| Metric | Value |
|--------|-------|
| Met / Partial / N/A / NC | 95 / 13 / 2 / 0 |
| SPRS projection | +83 (deduction 27) |
| POA&M-ineligible open | **3 items / 13 pts** — `CM.L2-3.4.8`, `SI.L2-3.14.7`, `AC.L2-3.1.12` |
| `SC.L2-3.13.11` | Partial, `poamEligible: true`, `poamEligibility: "carveout"` |
| §170.21 gates (reachable-closed scenario) | all **PASS** |
| Unauthenticated BFF | **401** (local + sandbox) |
| Failed MAS read | returns `state: unavailable` (no fake zeros) |

## Security review notes

- **Auth:** `requireAdmin()` first; no bypass on route.
- **SSRF:** MAS base from `MAS_API_URL` / `NEXT_PUBLIC_MAS_API_URL` env only; fixed path `/api/compliance/controls`.
- **Secrets:** none hardcoded in new files; API key header only from server env.
- **Mock data:** none — live MAS only; empty/failed MAS → 503 unavailable card.
- **Client bundle:** panel fetches same-origin BFF; no MAS keys in client.
- **Clipboard/download:** exports open-item compliance metadata JSON for operators (admin session); no credentials/CUI payloads.
- **Findings:** none HIGH/CRITICAL. LOW: clipboard payload is operator metadata (control IDs/actions) behind admin gate — acceptable.

## Deploy notes / blockers resolved

1. Paramiko password auth rejected on Sandbox (`publickey` only) — used OpenSSH key + scripts.
2. VM Docker build hung (low RAM + zombie `mycosoft-website-blue`) — cleared Dead blue via Docker restart (green restored); pulled CI-built GHCR image instead of local `--no-cache` build.
3. GitHub “Mycosoft CI/CD” **Build & Push Image** succeeded; **Deploy to Production** failed on the same zombie blue — manual blue-green cutover completed after cleanup.
4. Cloudflare `purge_everything` ran in cutover script and again from local `_cloudflare_cache.py`.

## How to verify

```text
https://sandbox.mycosoft.com/security/compliance  → Closure Board tab (admin session)
https://sandbox.mycosoft.com/api/security/closure-board → 401 without auth
http://192.168.0.187:3000/healthz → 200
```

## Related

- GHCR: `ghcr.io/mycosoftlabs/website:2b728e7` / `production-latest`
- CI run: https://github.com/MycosoftLabs/website/actions/runs/30579062453
