# CMMC L2 Compliance UI Fix — PreVeil Call (JUL15 2026)

**Date:** 2026-07-15  
**Status:** Shipped / verifying sandbox  
**Audience:** Morgan (SAO) + Claude handoff for PreVeil call  
**Related:** PR #245 `fix/cui-audit-remediation-jul15`, MAS `soc_ops.compliance_controls`

---

## What was broken

1. **`/api/security?action=compliance-controls` → 500 on sandbox**  
   Root cause: `lib/security/ledger.ts` constructed `incidentLedger` at **module import** and called `fs.mkdirSync` / `writeFileSync` under `data/`. In the Docker image that path is often read-only → **entire `/api/security` route failed to load** (Next.js HTML 500 for every action).

2. **`sprint-meta.ts` lied (`currentImplemented: 0`)**  
   Banner fallbacks were stale even when MAS had live Met rows.

3. **PreVeil (L2 Enclave) tab only on PR #245** — not on `main`/sandbox until merge.

---

## What we fixed (website)

| Change | File |
|--------|------|
| Ledger init resilient (in-memory fallback if FS RO) | `lib/security/ledger.ts` |
| Compliance controls/stats hardened + MAS fallback + counts | `app/api/security/route.ts` |
| Live unique Met/Partial in banner; `deriveUniquePostureCounts()` | `app/security/compliance/page.tsx`, `lib/security/posture/sprint-meta.ts` |
| PreVeil tab + CMMC harness + CI watchdog `if:` secret fix | Already on PR #245 (`d7dfd4fa`, `cf0af85c`) |

---

## Live MAS posture (after CA trio flip tonight)

**Score:** `implemented=22` / `partial=0` / `planned=198` → **implementation_percent=10.0**

**Unique Met: 11** (NIST+CMMC twins count once):

| Base ID | Families |
|---------|----------|
| 3.4.3 / 3.4.4 | CM |
| 3.11.1 / 3.11.2 / 3.11.3 | RA |
| 3.12.1 / **3.12.2** / **3.12.3** / **3.12.4** | CA (trio cleared tonight) |
| 3.13.15 | SC |
| 3.14.1 | SI |

**CA trio evidence (non-CUI):**

- POA&M regenerated `reportType=poam` → `docs/cmmc_evidence/ca/3.12.2_poam.html`
- ConMon first cycle → npm audit + Supabase advisors; plan updated → `ca/3.12.3_conmon_plan.md`
- SSP stamped + system-boundary section → `ca/3.12.4_ssp.html`
- Backup: `docs/cmmc_evidence/soc_ops_ca_trio_backup_20260716T001838Z.json`

**Never flipped:** AU.3.3.4, SI.3.14.6, PreVeil-36 block, endpoint Batch A (remain planned / blocked on PROV).

---

## Sandbox URL for the call

**https://sandbox.mycosoft.com/security/compliance**  
(Sign in as admin — API is admin-gated.)

Tabs to show: **Controls** (heatmap live Met), **PreVeil (L2 Enclave)**, **SSP / POA&M (MAS)**.

API (authenticated): `/api/security?action=compliance-controls` → expect `counts.implemented ≥ 22`.  
Unauthenticated should be **401** (not 500) after ledger fix deploys.

---

## Remaining honest gaps (PreVeil conversation)

- **Not CMMC L2 assessed** — pursuing L2; CUI-handling rules in force now.
- **~99 unique Not Met** still planned (PROV laptops, PreVeil enrollment for IA/MP/SC blocks, Wazuh agents).
- **AU.L2-3.3.4 / SI.L2-3.14.6** open until assessment endpoints provisioned.
- **SAO sign-off** on ConMon cycle artifacts still pending human review.
- npm audit still shows **1 critical** dependency — tracked under RA remediation (non-CUI).

---

## Ship notes

- Blue-green via Mycosoft CI/CD on `main` (old container serves until new healthy; NAS assets mount; CF purge).
- Arraylake field bake skipped per Morgan/Claude interrupt.
