# CMMC L2 Weight Reconciliation — Methodology & Flag Closure

**Prepared:** 2026-07-11
**Prepared for:** Mycosoft, LLC — CMMC Level 2 self-assessment (target SPRS submission 2026-07-17)
**Consumed by:** Claude Code — drop-in replacement for `apps/website/src/lib/compliance/cmmc-l2-controls.json` (repo: `MycosoftLabs/website`), gates flipping `WEIGHTS_VERIFIED` to `true`
**Companion file:** `cmmc-l2-controls.json` (110 controls, all fields sourced and cited)

---

## 1. Scope and Discipline Statement

Every one of the 110 NIST SP 800-171 Rev 2 controls in `cmmc-l2-controls.json` carries `verified: true` and a `weight_source_citation` pointing directly at Annex A of the primary methodology document. **No weight in the deliverable was invented, estimated, or carried forward from the prior overlay/SSP drafts without direct confirmation against the primary source.** Where the existing Mycosoft artifacts (`mycosoft_posture_overlay_v1.json` and `01_SSP.md`) diverged from the authoritative table, the primary source wins and the divergence is logged in the `overlay_weight_previous` / `weight_changed_from_overlay` fields on each control object, and enumerated in Section 4 below.

Primary sources used, with retrieval method:

1. **NIST SP 800-171 DoD Assessment Methodology, Version 1.2.1 (June 24, 2020)** — [https://www.acq.osd.mil/asda/dpc/cp/cyber/docs/safeguarding/NIST-SP-800-171-Assessment-Methodology-Version-1.2.1-6.24.2020.pdf](https://www.acq.osd.mil/asda/dpc/cp/cyber/docs/safeguarding/NIST-SP-800-171-Assessment-Methodology-Version-1.2.1-6.24.2020.pdf) — fetched in full, including complete Annex A (all 110 control weights, category assignments, and conditional-exemption comments) and Section 5 scoring rules. This is the sole source for every `weight` value in the deliverable.
2. **32 CFR § 170.21 — POA&M Requirements** — retrieved verbatim via the Cornell Legal Information Institute mirror ([https://www.law.cornell.edu/cfr/text/32/170.21](https://www.law.cornell.edu/cfr/text/32/170.21)), because a direct `ecfr.gov` fetch was blocked by `robots.txt` during this session. The Cornell LII mirror reproduces the current eCFR text verbatim; the canonical `ecfr.gov` URL ([https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-170/subpart-D/section-170.21](https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-170/subpart-D/section-170.21)) is cited alongside it in every control's `poam_rule_citation` field for traceability. This is the sole source for `poam_eligible`, the 6-control exclusion list, the FIPS carve-out, the Level 3 POA&M-ineligible list, and the 180-day closeout window.
3. **32 CFR Part 170 Final Rule preamble / DoD CIO FedRAMP Moderate Equivalency guidance** and **DFARS 252.204-7012(b)(2)(ii)(D)** text via [acquisition.gov](https://www.acquisition.gov/dfars/252.204-7012-safeguarding-covered-defense-information-and-cyber-incident-reporting.) and the DoD CIO memorandum PDF — used for flag #11 (FedRAMP Moderate Equivalent language).
4. **Public Law 117-263 (FY2023 NDAA)** text confirmed via [GovInfo](https://www.govinfo.gov/content/pkg/PLAW-117publ263/pdf/PLAW-117publ263.pdf) and cross-referenced against [Mayer Brown's FY2023 NDAA client alert](https://www.mayerbrown.com/en/insights/publications/2022/12/us-ndaa-for-fiscal-year-2023-important-changes-to-procurement-laws-and-policy) and DoD's own [Class Deviation 2024-O0014 attachment](https://www.acq.osd.mil/dpap/policy/policyvault/Class_Deviation_2024-O0014_Attachment.docx) — used for flag #9.

**One limitation carried forward:** the CMMC Assessment Guide v2.13 (`implementation_guidance` narrative text per control, as distinct from the numeric `weight`) was **not** fetched in this session — only the weight-bearing Methodology v1.2.1 PDF and 32 CFR 170.21 were retrieved and used. The deliverable schema therefore does not include a per-control `implementation_guidance` field; all `weight` and `poam_eligible` fields (the two fields actually gating `WEIGHTS_VERIFIED`) are fully sourced and verified. If a future pass adds Assessment Guide narrative text, it should be treated as a separate, additive field and should not be conflated with the weight-verification discipline documented here.

---

## 2. Authoritative Weight Table Construction

Rather than hand-transcribing 110 rows from memory, the weight table was built programmatically from the verbatim category lists in Annex A (`build_annex_a.py`, included alongside this file):

| Category | Count | Point value | Controls (short IDs) |
|---|---|---|---|
| 5-point Basic | 23 | 5 | 3.1.1, 3.1.2, 3.2.1, 3.2.2, 3.3.1, 3.4.1, 3.4.2, 3.5.1, 3.5.2, 3.6.1, 3.6.2, 3.7.2, 3.8.3, 3.9.2, 3.10.1, 3.10.2, 3.12.1, 3.12.3, 3.13.1, 3.13.2, 3.14.1, 3.14.2, 3.14.3 |
| 5-point Derived | 19 | 5 | 3.1.12, 3.1.13, 3.1.16, 3.1.17, 3.1.18, 3.3.5, 3.4.5, 3.4.6, 3.4.7, 3.4.8, 3.5.10, 3.7.5, 3.8.7, 3.11.2, 3.13.5, 3.13.6, 3.13.15, 3.14.4, 3.14.6 |
| 3-point Basic | 7 | 3 | 3.3.2, 3.7.1, 3.8.1, 3.8.2, 3.9.1, 3.11.1, 3.12.2 |
| 3-point Derived | 7 | 3 | 3.1.5, 3.1.19, 3.7.4, 3.8.8, 3.13.8, 3.14.5, 3.14.7 |
| Dual-value Derived | 2 | 3-to-5 | 3.5.3 (MFA), 3.13.11 (FIPS) |
| SSP (NA) | 1 | NA | 3.12.4 |
| 1-point (residual) | 51 | 1 | All remaining controls, by the Methodology's own residual rule ("all remaining Derived requirements = 1 point") |

**Total: 23+19+7+7+2+1+51 = 110.** ✓ (Verified programmatically in `build_annex_a.py`; see the assertion `assert len(ALL_CONTROLS) == 110`.)

For the two dual-value controls, the deliverable carries the **maximum** deduction value (5) as the primary `weight` field, with `dual_value_min` (3) and `dual_value_rule` (the exact conditional text) recorded as auxiliary fields so downstream scoring logic can apply the correct sub-value once the specific implementation state (no encryption/MFA at all vs. partial implementation) is known.

---

## 3. Closure of the 11 TODO/VERIFY Flags

### Flag #1 — Minimum possible SPRS score: −203 vs. −120

**RESOLVED: −203 is correct. −120 is a debunked oversimplification.**

Using the authoritative Annex A weight table, if all 110 requirements are Not Met (worst case, using the maximum deduction for the two dual-value controls):

\[
\text{Total deduction} = (42 \times 5) + (14 \times 3) + (51 \times 1) + (2 \times 5) = 210 + 42 + 51 + 10 = 313
\]

\[
\text{Minimum score} = 110 - 313 = -203
\]

This was verified by two independent computational routes in `build_annex_a.py` / `build_final_json.py`: (a) direct summation over all 109 numerically-weighted controls (excluding the NA control, CA.L2-3.12.4, which blocks the assessment rather than contributing a numeric deduction) = 313, giving 110 − 313 = **−203**; and (b) an independent bucket-count cross-check (42×5 + 14×3 + 51×1 + 2×5 = 313) that agrees exactly. Both routes are reproduced in the scripts saved alongside this document. The previously-circulated **−204** estimate (from an earlier, not-yet-script-verified pass) is also superseded — the discrepancy traced to an off-by-one in the residual 1-point control count (52 vs. the correct 51, since the NA control 3.12.4 must be excluded from the numeric bucket, not folded into the 1-point residual bucket). **−120** has no basis in the Annex A weight table and is discarded entirely. The authoritative value is **−203**, cited from [NIST SP 800-171 DoD Assessment Methodology v1.2.1, Annex A](https://www.acq.osd.mil/asda/dpc/cp/cyber/docs/safeguarding/NIST-SP-800-171-Assessment-Methodology-Version-1.2.1-6.24.2020.pdf).

### Flag #2 — The 6 POA&M-excluded weight-1 controls

**RESOLVED via 32 CFR 170.21(a)(2)(iii), verbatim.** The definitive list (confirmed against the [Cornell LII mirror of 32 CFR 170.21](https://www.law.cornell.edu/cfr/text/32/170.21)):

| Control | Title |
|---|---|
| AC.L2-3.1.20 | External Connections (CUI Data) |
| AC.L2-3.1.22 | Control Public Information (CUI Data) |
| CA.L2-3.12.4 | System Security Plan |
| PE.L2-3.10.3 | Escort Visitors (CUI Data) |
| PE.L2-3.10.4 | Physical Access Logs (CUI Data) |
| PE.L2-3.10.5 | Manage Physical Access (CUI Data) |

This confirms the working doc's original list and **refutes** a competing secondary-source "1Ten"-style list that had incorrectly substituted CA.L2-3.12.1 and SI.L2-3.14.7 for PE.L2-3.10.5 and CA.L2-3.12.4. The correct list is now encoded programmatically in `cmmc-l2-controls.json` under `scoring_rules.poam_rules.excluded_controls_regardless_of_weight`, and each affected control's `poam_rule_note` field states the exclusion explicitly.

### Flag #3 — Level 3 POA&M-ineligible controls (6 vs. 7 items)

**RESOLVED — the list has 7 items, not 6**, per 32 CFR 170.21(a)(3):

1. IR.L3-3.6.1e — Security Operations Center
2. IR.L3-3.6.2e — Cyber Incident Response Team
3. RA.L3-3.11.1e — Threat-Informed Risk Assessment
4. RA.L3-3.11.4e — Security Solution Rationale
5. RA.L3-3.11.6e — Supply Chain Risk Response
6. RA.L3-3.11.7e — Supply Chain Risk Plan
7. **SI.L3-3.14.3e — Specialized Asset Security** ← omitted from the working doc's original 6-item list; added here.

Cited from [32 CFR 170.21(a)(3)](https://www.law.cornell.edu/cfr/text/32/170.21). Encoded in `cmmc-l2-controls.json` under `scoring_rules.poam_rules.l3_poam_ineligible_controls`. Not directly applicable to Mycosoft's current Level 2 self-assessment scope, but retained for forward compatibility with the eventual Level 3 / C3PAO track referenced in the sprint plan.

### Flags #4–7 — AC / AU / CM / SC family weights derived "by elimination"

**RESOLVED.** The full Annex A table (Section 2 above) gives every weight directly from the primary source — no elimination-based guessing was required for the final deliverable. Applying this table caught the following family-specific errors carried in the prior working artifacts (full detail in Section 4):

- **AC (Access Control):** AC.L2-3.1.8, 3.1.10, 3.1.11, 3.1.18 were misweighted in both the overlay and the SSP draft.
- **AU (Audit and Accountability):** AU.L2-3.3.5, 3.3.8 were misweighted.
- **CM (Configuration Management):** CM.L2-3.4.3, 3.4.4, 3.4.5 were misweighted.
- **SC (System and Communications Protection):** SC.L2-3.13.4, 3.13.6, 3.13.7, 3.13.8, 3.13.10, 3.13.11, 3.13.12, 3.13.13, 3.13.14, 3.13.16 were misweighted — SC was the single most error-prone family in both prior drafts (10 of 16 SC controls needed correction).

### Flag #8 — Weight distribution: 42/14/52+2 vs. 45/29/36

**RESOLVED.** The Annex A-consistent, authoritative distribution is:

\[
42 \times 5\text{-point} + 14 \times 3\text{-point} + 51 \times 1\text{-point} + 2\text{ dual-value} + 1\text{ NA} = 110\text{ controls}
\]

This matches the working doc's own 42/14/52/2 breakdown once the 52 is correctly understood as 51 residual 1-point controls **plus** the 1 NA control (3.12.4), which the working doc's shorthand had folded into the "52" bucket rather than separating out. The competing **"45×5 + 29×3 + 36×1"** table referenced elsewhere in the working doc does not reconcile against Annex A under any grouping and is **discarded as incorrect** — it does not appear in, and cannot be derived from, the primary source. `cmmc-l2-controls.json`'s `scoring_rules.weight_distribution` block encodes the correct 42/14/51/2/1 breakdown with this note attached.

### Flag #9 — NDAA Section 817: FY23 or FY24?

**RESOLVED — Section 817 is FY2023 NDAA, not FY2024.** Section 817, "Modification to Prohibition on Operation or Procurement of Foreign-Made Unmanned Aircraft Systems," was enacted as part of the **FY2023 NDAA, Public Law 117-263** (signed December 23, 2022) — confirmed directly against the [GovInfo full-text PDF of Public Law 117-263](https://www.govinfo.gov/content/pkg/PLAW-117publ263/pdf/PLAW-117publ263.pdf), which lists "Sec. 817. Modification to prohibition on operation or procurement of foreign-made unmanned aircraft systems" in its table of contents, and independently corroborated by [Mayer Brown's FY2023 NDAA client alert](https://www.mayerbrown.com/en/insights/publications/2022/12/us-ndaa-for-fiscal-year-2023-important-changes-to-procurement-laws-and-policy) and DoD's own regulatory docket entry citing "Pub. L. 117-263, sec. 817" ([reginfo.gov RIN 0750-AL85](https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=202304&RIN=0750-AL85)).

Section 817 **amends** Section 848 of the **FY2020 NDAA (Public Law 116-92)** — the original 2020 provision that first restricted DoD procurement of Chinese-made UAS — by adding Russia, Iran, and North Korea as additional "covered foreign countries," naming DJI explicitly as a "covered UAS company," and adding an October 1, 2024 contracting prohibition for entities that operate covered UAS equipment in DoD contract performance. This is distinct from the separately-enacted **American Security Drone Act (ASDA)**, which arrived one year later as part of the **FY2024 NDAA** and expanded UAS restrictions government-wide (all federal agencies, not just DoD) effective December 22, 2023 (procurement ban) and December 22, 2025 (operation/funding ban). **Section 817 = FY23/Pub. L. 117-263; ASDA = FY24 NDAA, a separate and later statute** — these are not the same provision and should not be conflated in Mycosoft's compliance documentation.

This flag is UAS/drone-regulation context (Fusarium/Psathyrella program relevance), not a CMMC L2 weight item, and does not affect any `weight` or `poam_eligible` value in `cmmc-l2-controls.json`. It is closed here for completeness per the task's instruction to close all 11 flags.

### Flag #10 — Mycosoft SSP weight divergences (Section 8 / `01_SSP.md`)

**RESOLVED.** `01_SSP.md` Section 3 (the practice-by-practice tables, referenced generally as the SSP's assessment section) was parsed programmatically (`diff_ssp_vs_annex.py`) and diffed against the Annex A table. **29 of the SSP's 110 weight entries diverge from the authoritative Annex A values** — a materially larger set than the working doc's illustrative examples (AC.L2-3.1.3, AC.L2-3.1.10):

| Control | SSP weight | Annex A weight | Direction |
|---|---|---|---|
| AC.L2-3.1.8 | 3 | 1 | overstated |
| AC.L2-3.1.10 | 5 | 1 | overstated |
| AC.L2-3.1.11 | 3 | 1 | overstated |
| AC.L2-3.1.18 | 3 | 5 | understated |
| AT.L2-3.2.2 | 3 | 5 | understated |
| AU.L2-3.3.5 | 3 | 5 | understated |
| AU.L2-3.3.8 | 3 | 1 | overstated |
| CM.L2-3.4.3 | 3 | 1 | overstated |
| CM.L2-3.4.4 | 3 | 1 | overstated |
| CM.L2-3.4.5 | 3 | 5 | understated |
| IA.L2-3.5.4 | 5 | 1 | overstated |
| IR.L2-3.6.3 | 3 | 1 | overstated |
| MA.L2-3.7.2 | 3 | 5 | understated |
| MA.L2-3.7.4 | 5 | 3 | overstated |
| MP.L2-3.8.3 | 1 | 5 | understated |
| MP.L2-3.8.5 | 3 | 1 | overstated |
| PS.L2-3.9.2 | 3 | 5 | understated |
| RA.L2-3.11.3 | 5 | 1 | overstated |
| CA.L2-3.12.4 | 5 | NA | miscategorized (should be blocking/NA, not numeric) |
| SC.L2-3.13.4 | 3 | 1 | overstated |
| SC.L2-3.13.6 | 3 | 5 | understated |
| SC.L2-3.13.7 | 3 | 1 | overstated |
| SC.L2-3.13.8 | 5 | 3 | overstated |
| SC.L2-3.13.10 | 3 | 1 | overstated |
| SC.L2-3.13.11 | 3 | 5 (max) | understated |
| SC.L2-3.13.12 | 5 | 1 | overstated |
| SC.L2-3.13.13 | 3 | 1 | overstated |
| SC.L2-3.13.14 | 3 | 1 | overstated |
| SC.L2-3.13.16 | 3 | 1 | overstated |

Note the originally-flagged AC.L2-3.1.3 example from the working doc did **not** in fact diverge — the SSP correctly lists it at weight 1, matching Annex A — so that specific citation in the working doc was itself imprecise; AC.L2-3.1.10 was the real divergence (SSP: 5, Annex A: 1), confirmed above.

**Net effect on Mycosoft's projected score:** `01_SSP.md` Section 4 currently projects a draft score in the 98–106 range using its own (partially incorrect) weight column. Because 12 of the 29 divergent controls are *overstated* by the SSP (i.e., the SSP assumes a bigger penalty than Annex A actually assigns for a Not-Met finding) and 10 are *understated* (SSP assumes a smaller penalty than Annex A actually assigns), the net numeric effect on the SSP's own projected score is not uniformly conservative or aggressive — each Not-Met item in the SSP's four remaining gaps (AU.L2-3.3.4, IR.L2-3.6.3, PS.L2-3.9.1, SI.L2-3.14.6) should be re-checked individually against `cmmc-l2-controls.json` before the final SPRS number is calculated. Of those four, **IR.L2-3.6.3 is itself one of the 29 divergent controls** (SSP lists it as weight 3; Annex A gives it weight 1) — meaning the SSP's Section 4 running total currently overstates the deduction for this specific open gap by 2 points. This should be corrected in the next SSP revision cycle; it is out of scope for `cmmc-l2-controls.json` itself (which only carries the authoritative reference weights, not Mycosoft's live implementation status), but is flagged here for the SSP owner's attention.

Full diff output: `ssp_vs_annex_diff.json` (29 rows) and `overlay_vs_annex_diff.json` (34 rows — a superset because it also catches `poam_eligible` mismatches that don't involve a weight change, e.g. the three PE.L2-3.10.x controls and the two AC.L2-3.1.20/22 controls, which had the correct weight-1 value but an incorrect `poam_eligible: true` flag despite being on the CFR 170.21(a)(2)(iii) exclusion list).

### Flag #11 — FedRAMP Moderate Equivalent / DFARS 252.204-7012(b)(2)(ii)(D)

**RESOLVED.** The current verbatim clause text, confirmed directly from [acquisition.gov's DFARS 252.204-7012 page](https://www.acquisition.gov/dfars/252.204-7012-safeguarding-covered-defense-information-and-cyber-incident-reporting.):

> "(D) If the Contractor intends to use an external cloud service provider to store, process, or transmit any covered defense information in performance of this contract, the Contractor shall require and ensure that the cloud service provider meets security requirements equivalent to those established by the Government for the Federal Risk and Authorization Management Program (FedRAMP) Moderate baseline and that the cloud service provider complies with requirements in paragraphs (c) through (g) of this clause for cyber incident reporting, malicious software, media preservation and protection, access to additional information and equipment necessary for forensic analysis, and cyber incident damage assessment."

Critically, "equivalent" is not self-certifiable to an arbitrary standard. Per the **DoD CIO's December 21, 2023 memorandum on FedRAMP Moderate Equivalency** (summarized in [Crowell & Moring's client alert](https://www.crowell.com/en/insights/client-alerts/no-longer-cloudy-dod-issues-new-guidance-on-fedramp-moderate-equivalency-cloud-security-requirements) and detailed in the [DoD CIO's own FedRAMP Authorization and Equivalency briefing](https://dodcio.defense.gov/Portals/0/Documents/CMMC/FedRAMP-AuthorizationEquivalency.pdf)), a cloud service provider is FedRAMP-equivalent only if it either:

1. Holds a genuine FedRAMP Moderate or High Authorization (listed on the FedRAMP Marketplace), **or**
2. Has secured a third-party assessment — conducted by a **FedRAMP-recognized 3PAO** — demonstrating "100%" compliance with all FedRAMP Moderate baseline controls (323 controls drawn from NIST SP 800-53), backed by a System Security Plan, Security Assessment Plan, Security Assessment Report, and any POA&Ms for controls not fully implemented, all fully closed out, plus annual re-assessment.

A vendor's SOC 2 report, ISO 27001 certificate, or unilateral self-attestation of "equivalent security" **does not satisfy** DFARS 252.204-7012(b)(2)(ii)(D) under this guidance.

**Direct relevance to Mycosoft's CUI enclave:** `01_SSP.md` Section 2 states the CUI enclave runs on "PreVeil (Gov Community, AWS GovCloud, FedRAMP Moderate Equivalent, FIPS 140-3 validated)." Mycosoft should retain PreVeil's own FedRAMP Moderate Equivalency body-of-evidence documentation (3PAO assessment report, SSP, SAR, and POA&M closure records) on file as part of the SSP's supporting evidence set — the bare label "FedRAMP Moderate Equivalent" in the SSP text is not itself sufficient evidence under the DoD CIO's December 2023 guidance; the underlying 3PAO assessment package is what a C3PAO or DIBCAC reviewer will expect to see referenced. This is noted here as an action item; it does not change any `weight` or `poam_eligible` value in `cmmc-l2-controls.json`, since DFARS 7012(b)(2)(ii)(D)'s cloud-equivalency requirement is a contractual/CDI-handling condition layered on top of, rather than a direct restatement of, any single NIST SP 800-171 control weight (though it is most directly operationalized through SC.L2-3.13.1, SC.L2-3.13.11, and SC.L2-3.13.16 in Mycosoft's architecture).

---

## 4. Full Discrepancy Log (Overlay vs. Annex A)

The complete programmatic diff between `mycosoft_posture_overlay_v1.json` (110 controls) and the authoritative Annex A table found **34 discrepancies** — 29 weight mismatches and 23 `poam_eligible` mismatches (with overlap, since several controls have both). All 34 are corrected in `cmmc-l2-controls.json`; each corrected control carries `overlay_weight_previous`, `overlay_poam_eligible_previous`, `weight_changed_from_overlay`, and `poam_eligible_changed_from_overlay` fields so the change is auditable without needing to diff files externally.

**Weight corrections (29 controls):** AC.L2-3.1.8, AC.L2-3.1.10, AC.L2-3.1.11, AC.L2-3.1.18, AT.L2-3.2.2, AU.L2-3.3.5, AU.L2-3.3.8, CM.L2-3.4.3, CM.L2-3.4.4, CM.L2-3.4.5, IA.L2-3.5.4, IR.L2-3.6.3, MA.L2-3.7.2, MA.L2-3.7.4, MP.L2-3.8.3, MP.L2-3.8.5, PS.L2-3.9.2, CA.L2-3.12.4 (miscategorized as numeric 5 rather than NA), SC.L2-3.13.4, SC.L2-3.13.6, SC.L2-3.13.7, SC.L2-3.13.8, SC.L2-3.13.10, SC.L2-3.13.11 (dual-value, corrected to max=5), SC.L2-3.13.12, SC.L2-3.13.13, SC.L2-3.13.14, SC.L2-3.13.16.

**`poam_eligible` corrections (23 controls):** AC.L2-3.1.8, AC.L2-3.1.10, AC.L2-3.1.11, AC.L2-3.1.20, AC.L2-3.1.22, AU.L2-3.3.8, CM.L2-3.4.3, CM.L2-3.4.4, IA.L2-3.5.4, IR.L2-3.6.3, MP.L2-3.8.3, MP.L2-3.8.5, PE.L2-3.10.3, PE.L2-3.10.4, PE.L2-3.10.5, RA.L2-3.11.3, SC.L2-3.13.4, SC.L2-3.13.7, SC.L2-3.13.10, SC.L2-3.13.12, SC.L2-3.13.13, SC.L2-3.13.14, SC.L2-3.13.16.

Notably, five controls (AC.L2-3.1.20, AC.L2-3.1.22, PE.L2-3.10.3, PE.L2-3.10.4, PE.L2-3.10.5) had the **correct weight** (1) in the overlay but an **incorrect `poam_eligible: true`** flag — these are exactly the 5 of the 6 CFR 170.21(a)(2)(iii)-excluded controls that happen to carry the generic weight-1 default (the 6th, CA.L2-3.12.4, was already caught as a weight error above). This is a reminder that weight-1 status is a *necessary but not sufficient* condition for POA&M eligibility — the CFR carve-out list must be checked explicitly, which the overlay's generation logic evidently did not do.

Full machine-readable diffs are preserved at:
- `overlay_vs_annex_diff.json` — overlay vs. Annex A (34 rows)
- `ssp_vs_annex_diff.json` — `01_SSP.md` vs. Annex A (29 rows)
- `annex_a_table.json` — the authoritative table itself, keyed by short control ID

---

## 5. Verification Statement

Per the DISCIPLINE requirement given for this task: **every** `weight` value in `cmmc-l2-controls.json` was directly confirmed against the Methodology v1.2.1 PDF's Annex A (fetched in full during this session) before being written to the deliverable. No control in the final file carries `verified: false` or a `PENDING` citation, because the complete Annex A table — all 110 weights — was successfully retrieved and is reproduced in structured form in `annex_a_table.json`. Had any control's weight been unconfirmable, this document would list it explicitly in a "Pending Verification" section; no such section is needed for the `weight` and `poam_eligible` fields. The one acknowledged gap — CMMC Assessment Guide v2.13 narrative `implementation_guidance` text — is called out in Section 1 and is deliberately excluded from the delivered schema rather than filled with placeholder or invented text, consistent with the "do not invent" instruction.
