// ═══════════════════════════════════════════════════════════════════════════
// CMMC L2 / NIST SP 800-171 Rev.2 — authoritative reference (cited)
// ═══════════════════════════════════════════════════════════════════════════
//
// Source: Perplexity primary-source research doc `mycosoft_cmmc_l2_l3_working_doc_
// 2026-07-10.md` (141 inline citations; primary domains: acq.osd.mil, nvlpubs.
// nist.gov, govinfo.gov, law.cornell.edu, dodcio.defense.gov).
//
// ⚠ VERIFICATION DISCIPLINE (per Perplexity + Morgan's "verified things only"):
//   • Per-control WEIGHTS are NOT yet reconciled. The doc's Section-2 table
//     weights parse to 45×5 / 29×3 / 36×1, which does NOT match the methodology
//     cross-check (42×5 / 14×3 / 52×1 + 2 dual). Perplexity is delivering a
//     corrected weight table (~2026-07-12).
//   • Therefore `WEIGHTS_VERIFIED = false` and the app MUST NOT compute a SPRS
//     score from these weights. Show weights as reference-only, flagged.
//   • Anything with `verificationRequired: true` is seeded-but-unconfirmed —
//     surface the flag, don't present as authoritative logic.

import controlsJson from './cmmc-l2-controls.json';

export type PoamEligibility = 'yes' | 'no' | 'no-excluded' | 'carveout' | 'unknown';

export interface ControlReference {
  controlId: string; // CMMC form, e.g. "AC.L2-3.1.1"
  nistId: string; // "3.1.1"
  family: string; // "AC"
  title: string;
  weightMax: number | null; // 5 | 3 | 1 (max deduction). REFERENCE ONLY — unverified.
  weightRaw: string; // e.g. "5 (3 if MFA only for remote/privileged users)"
  dual: boolean; // dual/partial-credit control (3.5.3 MFA, 3.13.11 FIPS)
  poamEligibility: PoamEligibility;
  guidance: string; // one-line implementation guidance from primary-source doc
  tools: string[]; // example tools from the doc
}

export const CMMC_L2_CONTROLS = controlsJson as unknown as ControlReference[];

const BY_NIST: Record<string, ControlReference> = Object.fromEntries(
  CMMC_L2_CONTROLS.map((c) => [c.nistId, c])
);
const BY_CMMC: Record<string, ControlReference> = Object.fromEntries(
  CMMC_L2_CONTROLS.map((c) => [c.controlId, c])
);

/** Look up the reference row by NIST id ("3.1.1") or CMMC id ("AC.L2-3.1.1"). */
export function getControlReference(controlId: string): ControlReference | null {
  if (BY_CMMC[controlId]) return BY_CMMC[controlId];
  const nist = controlId.includes('L2-') ? controlId.split('L2-')[1] : controlId;
  return BY_NIST[nist] ?? null;
}

// ── Global framework facts (cited) — REFERENCE ONLY ─────────────────────────

/** Weights are not yet reconciled; the app must not compute SPRS from them. */
export const WEIGHTS_VERIFIED = false;

export const SPRS_MATH = {
  startingScore: 110,
  deduction: 'For each requirement Not Met, subtract its weight (5/3/1) from 110. Negative scores are possible.',
  methodologyDistribution: '42×5pt, 14×3pt, 52×1pt, + 2 dual-value (3.5.3 MFA, 3.13.11 FIPS)',
  parsedTableDistribution: '45×5pt, 29×3pt, 36×1pt (does NOT match the cross-check — pending reconciliation)',
  minScore: -203,
  minScoreNote: 'DoD-methodology-consistent figure. A secondary -120 figure appears in some sources but understates the true minimum (flagged).',
  conditionalThreshold: 88, // 80% of 110
  source: 'NIST SP 800-171 DoD Assessment Methodology v1.2.1; 32 CFR §170.24',
} as const;

export const POAM_RULES = {
  eligibleRule: 'Only 1-point-weighted requirements are POA&M-eligible.',
  carveout: 'SC.L2-3.13.11 (FIPS crypto) may be POA&M-ed only when encryption is employed but not FIPS-validated (3-pt case).',
  excludedControls: ['AC.L2-3.1.20', 'AC.L2-3.1.22', 'CA.L2-3.12.4', 'PE.L2-3.10.3', 'PE.L2-3.10.4', 'PE.L2-3.10.5'],
  excludedNote: 'Most-corroborated six. A secondary list swaps in CA.L2-3.12.1 & SI.L2-3.14.7 — reconcile against 32 CFR §170.21(a)(2)(iii) verbatim before hard-coding.',
  maxItems: 22, // 110 - 22 = 88 conditional threshold
  closeWindowDays: 180,
  source: '32 CFR §170.21',
} as const;

export interface VerificationFlag {
  id: string;
  topic: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  reconcileAgainst: string;
}

/** The open verification items from the Perplexity doc — surfaced, not silently trusted. */
export const VERIFICATION_FLAGS: VerificationFlag[] = [
  {
    id: 'weights',
    topic: 'Control weights (highest priority)',
    detail: 'Section-2 table weights (45×5/29×3/36×1) diverge from the methodology cross-check (42×5/14×3/52×1+2). Do not compute a SPRS score from these until reconciled. Corrected table expected from Perplexity ~2026-07-12.',
    severity: 'high',
    reconcileAgainst: 'DoD Assessment Methodology v1.2.1 / CMMC Assessment Guide L2 v2.13 appendix',
  },
  {
    id: 'min-score',
    topic: 'Minimum SPRS score (-203 vs -120)',
    detail: 'Doc uses -203 (methodology-consistent); a secondary -120 exists but understates the minimum. -203 favored.',
    severity: 'low',
    reconcileAgainst: 'DoD Assessment Methodology v1.2.1',
  },
  {
    id: 'poam-excluded',
    topic: 'The 6 POA&M-ineligible 1-point controls',
    detail: 'Two lists exist in the wild. The six seeded here are the most-corroborated; a variant swaps CA.L2-3.12.1 & SI.L2-3.14.7 for PE.L2-3.10.5 & CA.L2-3.12.4.',
    severity: 'medium',
    reconcileAgainst: '32 CFR §170.21(a)(2)(iii) verbatim',
  },
  {
    id: 'weight-by-elimination',
    topic: 'AU / CM / SC weights derived by elimination',
    detail: 'Several weights were inferred as 1-point ("not on the 5/3 list") rather than confirmed verbatim (e.g., 3.3.8).',
    severity: 'medium',
    reconcileAgainst: 'CMMC Assessment Guide L2 v2.13 appendix / SPRS scoring worksheet',
  },
  {
    id: 'l3-poam',
    topic: 'Level 3 POA&M-ineligible list (RA/IR)',
    detail: '6 L3 items (IR.L3-3.6.1e/2e, RA.L3-3.11.1e/4e/6e/7e) from secondary compilations — not blocking L2.',
    severity: 'low',
    reconcileAgainst: '32 CFR §170.21(a)(3)',
  },
  {
    id: 'ndaa-817-fy',
    topic: 'NDAA §817 fiscal year attribution',
    detail: 'The DJI ban 2024-10-01 effective date is confirmed, but the enacting NDAA fiscal year / Public Law is unclear across secondaries.',
    severity: 'low',
    reconcileAgainst: 'Enacted Public Law text',
  },
  {
    id: '48cfr-taco',
    topic: '48 CFR rule vs. TAC-O Phase 2 clause matrix',
    detail: 'The general CMMC phase schedule need not match individual contract clauses. Check N66604-26-9-A00X\'s clause matrix.',
    severity: 'medium',
    reconcileAgainst: 'TAC-O Phase 2 (N66604-26-9-A00X) contract clause matrix',
  },
  {
    id: 'fedramp-equiv',
    topic: 'FedRAMP Moderate Equivalent vs. formal ATO',
    detail: 'Distinct standards. Confirm DFARS 252.204-7012(b)(2)(ii)(D) exact "equivalent" language before treating as interchangeable.',
    severity: 'medium',
    reconcileAgainst: 'DFARS 252.204-7012(b)(2)(ii)(D)',
  },
  {
    id: 'section-5949-date',
    topic: 'Section 5949 semiconductor effective date',
    detail: 'Prohibition effective 2027-12-23; FAR proposed rule 2026-02-17. Confirm before hard-coding into the BOM screen.',
    severity: 'low',
    reconcileAgainst: 'FY23 NDAA §5949 + FAR final rule',
  },
];

/** True if a control is on the (unverified) POA&M-excluded list. */
export function isPoamExcluded(controlId: string): boolean {
  const ref = getControlReference(controlId);
  const cmmc = ref?.controlId ?? controlId;
  return (POAM_RULES.excludedControls as readonly string[]).includes(cmmc) || ref?.poamEligibility === 'no-excluded';
}
