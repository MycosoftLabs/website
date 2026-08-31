# CMMC L2 Signature Flip Ready — JUL15 2026

**Date:** 2026-07-15  
**Status:** PRE-STAGED — waiting for signed PDFs (no Met flips)  
**Cursor owns:** evidence slots + post-signature SQL process  
**Claude owns:** DocuSign instructions + empty-framework backend audit (FOCI / NISPOM / EAR / ICD 503 / FedRAMP)  
**SAO:** Morgan Rockcoons · **CFO:** RJ Ricasata  

**Immutable:** Honesty gate · No false Met · CUI lives in PreVeil · No commercial AI processes CUI · Not “CMMC L2 certified.”

---

## Purpose

Seven controls are **signature-away**. Cursor pre-staged directories and filenames. **Do not** run `soc_ops` UPDATEs until signed artifacts exist and SAO validates.

| Control | Owner signature | Evidence dir |
|---------|-----------------|--------------|
| MA.L2-3.7.1 | Morgan + RJ (maintenance policy) | `docs/cmmc_evidence/ma/` |
| MA.L2-3.7.2 | same | `docs/cmmc_evidence/ma/` |
| MA.L2-3.7.3 | same | `docs/cmmc_evidence/ma/` |
| MA.L2-3.7.4 | same | `docs/cmmc_evidence/ma/` |
| MA.L2-3.7.5 | same | `docs/cmmc_evidence/ma/` |
| MA.L2-3.7.6 | same | `docs/cmmc_evidence/ma/` |
| PS.L2-3.9.2 | RJ (access agreement) | `docs/cmmc_evidence/ps/` |

Canonical path root: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\docs\cmmc_evidence\`

---

## Exact source HTML (unsigned drafts)

Directory: `C:\Users\Owner1\Downloads\cmmc_l2_policies\`

| Source file | Maps to |
|-------------|---------|
| `POLICY_MA_Maintenance.html` | MA.L2-3.7.1 through MA.L2-3.7.6 (one policy covering all six) |
| `RJ_Access_Agreement.html` | PS.L2-3.9.2 |

Related (not this flip batch): other `POLICY_*.html`, `IR_Runbook.html`, `Physical_Access_Record.html`, etc. remain Claude/DocuSign workflow.

**CUI note:** These HTML drafts show a CUI banner. Do not paste bodies into Cursor/Claude. Route signature workflow via DocuSign per Claude; keep CUI-bearing signed copies in PreVeil.

---

## Target evidence paths (after signature)

### Maintenance (preferred single package)

| Path | Notes |
|------|-------|
| `docs/cmmc_evidence/ma/3.7.1-3.7.6_maintenance_policy_signed.pdf` | One signed PDF covering 3.7.1–3.7.6 |
| `docs/cmmc_evidence/ma/3.7.1-3.7.6_control_mapping.md` | Maps each practice ID → policy section |

### Maintenance (optional per-control)

| Path |
|------|
| `docs/cmmc_evidence/ma/3.7.1_maintenance_policy_signed.pdf` |
| `docs/cmmc_evidence/ma/3.7.2_maintenance_policy_signed.pdf` |
| `docs/cmmc_evidence/ma/3.7.3_maintenance_policy_signed.pdf` |
| `docs/cmmc_evidence/ma/3.7.4_maintenance_policy_signed.pdf` |
| `docs/cmmc_evidence/ma/3.7.5_maintenance_policy_signed.pdf` |
| `docs/cmmc_evidence/ma/3.7.6_maintenance_policy_signed.pdf` |

### Personnel

| Path |
|------|
| `docs/cmmc_evidence/ps/3.9.2_rj_access_agreement_signed.pdf` |

READMEs: `docs/cmmc_evidence/ma/README.md`, `docs/cmmc_evidence/ps/README.md`  
Prepared SQL (commented): `docs/cmmc_evidence/ma/soc_ops_ma_ps_signature_flip_DO_NOT_RUN_UNTIL_SIGNED.sql`

---

## SQL / process Cursor will run AFTER signed PDFs land

**Do not run now.**

1. Confirm PDF(s) exist at the target paths (or PreVeil) and are signed by the correct parties.
2. **SAO validates** maintenance policy is appropriate for a **2-person home-office** before any MA flip.
3. SAO validates RJ access agreement for PS.L2-3.9.2.
4. If PDF contains CUI: keep authoritative file in PreVeil; set `evidence_uri` to the PreVeil/attestation path (not public GitHub body dump).
5. Uncomment / adapt and run the UPDATEs in `soc_ops_ma_ps_signature_flip_DO_NOT_RUN_UNTIL_SIGNED.sql` (or equivalent MAS compliance API), setting `implementation_state='implemented'` and a real `evidence_uri`.
6. Verify: `GET http://192.168.0.188:8001/api/compliance/controls` shows the seven practices (14 twin rows if NIST+CMMC) as implemented.
7. Refresh harness / EOD status docs — still no “CMMC L2 certified” language.

### Draft UPDATE (DO NOT RUN)

```sql
-- DO NOT RUN until signed PDFs + SAO validation
UPDATE soc_ops.compliance_controls
SET implementation_state = 'implemented',
    last_verified_at = NOW(),
    evidence_uri = 'docs/cmmc_evidence/ma/3.7.1-3.7.6_maintenance_policy_signed.pdf'
WHERE control_id IN (
  '3.7.1', 'MA.L2-3.7.1',
  '3.7.2', 'MA.L2-3.7.2',
  '3.7.3', 'MA.L2-3.7.3',
  '3.7.4', 'MA.L2-3.7.4',
  '3.7.5', 'MA.L2-3.7.5',
  '3.7.6', 'MA.L2-3.7.6'
);

UPDATE soc_ops.compliance_controls
SET implementation_state = 'implemented',
    last_verified_at = NOW(),
    evidence_uri = 'docs/cmmc_evidence/ps/3.9.2_rj_access_agreement_signed.pdf'
WHERE control_id IN ('3.9.2', 'PS.L2-3.9.2');
```

---

## SAO reminder (required before MA flip)

Maintenance policy must fit Mycosoft’s **2-person home-office** reality (Morgan + RJ). If the draft assumes datacenter / vendor on-site / large IT shop procedures that you do not perform, revise before signing — do not Met-flip a mismatched policy.

---

## Coordination status (for Claude)

- **npm critical:** Cleared on website via `npm audit fix` (no `--force`). Post-fix: **0 critical**, 5 low + 9 moderate remaining (POA&M-acceptable). PR #245 already merged; fix shipped as follow-up PR from `origin/main`. Refreshes honesty for **RA.L2-3.11.3** / **SI.L2-3.14.1** evidence (`websocket-driver` 0.7.4 → 0.7.5).
- **Signature flip prep:** `ma/` + `ps/` slots + this doc ready. **No Met flips.** Cursor waiting for signed PDFs.
- **Claude owns:** DocuSign instructions for `POLICY_MA_Maintenance.html` + `RJ_Access_Agreement.html`, and the empty-framework backend audit (FOCI / NISPOM / EAR / ICD 503 / FedRAMP). Cursor will not redo those.
- **Branch protection:** `main` required approving reviews = **1** (kept / verified).

---

## Related

- `docs/cmmc_evidence/ma/README.md`
- `docs/cmmc_evidence/ps/README.md`
- `docs/cmmc_evidence/si/3.14.1_flaw_remediation_post_websocket_driver_jul15.json` (0 critical)
- `docs/cmmc_evidence/ra/3.11.2_vuln_scan_post_critical_clear_jul15.json` (0 critical)
