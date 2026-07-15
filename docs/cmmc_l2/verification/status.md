# CMMC L2 — Automated Verification Status

Evidence dir: `D:/Users/admin2/Desktop/MYCOSOFT/CODE/docs/cmmc_evidence` 

## Tally (110 controls)
- **blocked**: 79
- **operator-action-required**: 20
- **ready-collect-now**: 11
- by owner: cursor 85 · morgan 20 · myca 5

## Ready to collect NOW (no hardware/PreVeil/human blocker) — start here
- `CM.L2-3.4.3` (cursor) — gh branch-protection + PR-review policy  `gh api /repos/MycosoftLabs/website/branches/main/protection -> evidence/cm/3.4.3_branch_protection.json`
- `CM.L2-3.4.4` (cursor) — gh required-status-checks (CI) config
- `RA.L2-3.11.1` (myca) — risk assessment (docs/audits/2026-07-15-cui-security-audit)
- `RA.L2-3.11.2` (cursor) — vuln scan: npm audit + gitleaks + supabase advisors  `npm audit --json + advisors -> evidence/ra/3.11.2_vuln_scan.json`
- `RA.L2-3.11.3` (cursor) — remediation record (undici fix, key restrict, RLS drafts)
- `CA.L2-3.12.1` (myca) — self-assessment report (docs/audits + report engine cmmc-l2)  `node scripts/... generate cmmc-l2 report -> evidence/ca/3.12.1_self_assessment.pdf`
- `CA.L2-3.12.2` (myca) — POA&M export (report engine poam)  `POST /api/security/reports/generate {poam} -> evidence/ca/3.12.2_poam.pdf`
- `CA.L2-3.12.3` (myca) — continuous monitoring log (audit + supabase advisors + npm audit cadence)
- `CA.L2-3.12.4` (myca) — SSP document (report engine) — NA-weighted but must exist  `report engine cmmc-l2 -> evidence/ca/3.12.4_ssp.pdf`
- `SC.L2-3.13.15` (cursor) — web session authenticity: TLS/headers (curl -I mycosoft.com)  `curl -sI https://mycosoft.com -> evidence/sc/3.13.15_headers.txt`
- `SI.L2-3.14.1` (cursor) — flaw remediation: npm audit fix + Dependabot  `npm audit --json -> evidence/si/3.14.1_flaw_remediation.json`

## One human action away (operator) — you + RJ
- `AT.L2-3.2.1` — cdse-training-cert → cdse-completion-certificate
- `AT.L2-3.2.2` — cdse-training-cert → cdse-completion-certificate
- `AT.L2-3.2.3` — cdse-training-cert → cdse-completion-certificate
- `IR.L2-3.6.1` — ir-tabletop → ir-plan + tabletop-report
- `IR.L2-3.6.2` — ir-tabletop → ir-plan + tabletop-report
- `IR.L2-3.6.3` — ir-tabletop → documented tabletop report (signed SAO+CFO)
- `MA.L2-3.7.1` — sign-policy → maintenance-policy + remote-maint-controls
- `MA.L2-3.7.2` — sign-policy → maintenance-policy + remote-maint-controls
- `MA.L2-3.7.3` — sign-policy → maintenance-policy + remote-maint-controls
- `MA.L2-3.7.4` — sign-policy → maintenance-policy + remote-maint-controls
- `MA.L2-3.7.5` — sign-policy → maintenance-policy + remote-maint-controls
- `MA.L2-3.7.6` — sign-policy → maintenance-policy + remote-maint-controls
- `PS.L2-3.9.1` — background-check → Sterling/HireRight background check PDFs (Morgan+RJ)
- `PS.L2-3.9.2` — sign-policy → signed access agreement (RJ_Access_Agreement)
- `PE.L2-3.10.1` — physical-home-office → physical-access + visitor-log
- `PE.L2-3.10.2` — physical-home-office → physical-access + visitor-log
- `PE.L2-3.10.3` — physical-home-office → physical-access + visitor-log
- `PE.L2-3.10.4` — physical-home-office → physical-access + visitor-log
- `PE.L2-3.10.5` — physical-home-office → physical-access + visitor-log
- `PE.L2-3.10.6` — physical-home-office → physical-access + visitor-log

## Blocked (surfaced honestly — cannot be evidenced yet)
- **blocked:no-cmmc-laptop** (34): AC.L2-3.1.1, AC.L2-3.1.2, AC.L2-3.1.3, AC.L2-3.1.4, AC.L2-3.1.5, AC.L2-3.1.6, AC.L2-3.1.7, AC.L2-3.1.8, AC.L2-3.1.9, AC.L2-3.1.10, AC.L2-3.1.11, AC.L2-3.1.12, AC.L2-3.1.13, AC.L2-3.1.14, AC.L2-3.1.15, AC.L2-3.1.16, AC.L2-3.1.17, AC.L2-3.1.18, AC.L2-3.1.19, AC.L2-3.1.20, AC.L2-3.1.21, AC.L2-3.1.22, CM.L2-3.4.1, CM.L2-3.4.2, CM.L2-3.4.5, CM.L2-3.4.6, CM.L2-3.4.7, CM.L2-3.4.8, CM.L2-3.4.9, SI.L2-3.14.2, SI.L2-3.14.3, SI.L2-3.14.4, SI.L2-3.14.5, SI.L2-3.14.7
- **blocked:preveil-not-provisioned** (35): IA.L2-3.5.1, IA.L2-3.5.2, IA.L2-3.5.3, IA.L2-3.5.4, IA.L2-3.5.5, IA.L2-3.5.6, IA.L2-3.5.7, IA.L2-3.5.8, IA.L2-3.5.9, IA.L2-3.5.10, IA.L2-3.5.11, MP.L2-3.8.1, MP.L2-3.8.2, MP.L2-3.8.3, MP.L2-3.8.4, MP.L2-3.8.5, MP.L2-3.8.6, MP.L2-3.8.7, MP.L2-3.8.8, MP.L2-3.8.9, SC.L2-3.13.1, SC.L2-3.13.2, SC.L2-3.13.3, SC.L2-3.13.4, SC.L2-3.13.5, SC.L2-3.13.6, SC.L2-3.13.7, SC.L2-3.13.8, SC.L2-3.13.9, SC.L2-3.13.10, SC.L2-3.13.11, SC.L2-3.13.12, SC.L2-3.13.13, SC.L2-3.13.14, SC.L2-3.13.16
- **blocked:wazuh-agents-need-endpoints** (10): AU.L2-3.3.1, AU.L2-3.3.2, AU.L2-3.3.3, AU.L2-3.3.4, AU.L2-3.3.5, AU.L2-3.3.6, AU.L2-3.3.7, AU.L2-3.3.8, AU.L2-3.3.9, SI.L2-3.14.6

> Honesty gate: a control shows `met` only when a real evidence file for it exists under the evidence dir. Currently **0 met**. As Cursor/PreVeil/hardware drop artifacts into `evidence/<family>/`, re-run this script and the count climbs — truthfully.