// ═══════════════════════════════════════════════════════════════════════════
// CMMC L2 / NIST SP 800-171 Rev.2 — AUTHORITATIVE reference (weights verified)
// ═══════════════════════════════════════════════════════════════════════════
//
// Source of truth: `cmmc-l2-controls.json` — the reconciled 110-control table
// delivered by Perplexity 2026-07-11, every control verified: true against the
// NIST SP 800-171 DoD Assessment Methodology v1.2.1 Annex A. It supersedes the
// earlier posture overlay (which carried 34 errors: 29 weight + 23 POA&M).
//
// ✅ WEIGHTS ARE NOW VERIFIED. Distribution 42×5 + 14×3 + 51×1 + 2 dual(max 5) +
// 1 NA (CA.L2-3.12.4, SSP — blocking, not numeric) = 110. Min score −203.
// `implementation_guidance`/`example_tools` are intentionally absent from the
// authoritative file (Assessment Guide v2.13 narrative wasn't fetched); we merge
// the doc-derived guidance/tools from `cmmc-l2-guidance.json` for the UI.

import controlsFile from './cmmc-l2-controls.json';
import guidanceFile from './cmmc-l2-guidance.json';

export type PoamEligibility = 'yes' | 'no' | 'no-excluded' | 'carveout' | 'unknown';

interface RawControl {
  control_id: string;
  family: string;
  family_name: string;
  title: string;
  weight: number | string; // number, or "NA" for CA.L2-3.12.4
  weight_category: string;
  poam_eligible: boolean;
  poam_rule_note?: string;
  dual_value_min?: number;
  dual_value_rule?: string;
}

interface ScoringRules {
  max_score: number;
  min_score_all_controls_failed: number;
  min_score_calculation_note?: string;
  conditional_threshold_score: number;
  conditional_threshold_ratio: number;
  poam_rules: {
    max_poam_item_weight: number;
    close_window_days: number;
    carve_out_controls: string[];
    excluded_controls_regardless_of_weight: string[];
    excluded_controls_detail?: Record<string, string>;
    l3_poam_ineligible_controls: string[];
    l3_poam_ineligible_note?: string;
  };
}

const RAW = controlsFile as unknown as { controls: RawControl[]; scoring_rules: ScoringRules };
const GUIDANCE = guidanceFile as unknown as Record<string, { guidance: string; tools: string[] }>;
const SR = RAW.scoring_rules;

export interface ControlReference {
  controlId: string; // CMMC form, e.g. "AC.L2-3.1.1"
  nistId: string; // "3.1.1"
  family: string;
  familyName: string;
  title: string;
  /** Max deduction. null for the NA control (CA.L2-3.12.4). REFERENCE. */
  weightMax: number | null;
  /** true when weight is the non-numeric NA/blocking value. */
  isNa: boolean;
  weightCategory: string;
  weightRaw: string;
  dual: boolean; // dual/partial-credit (3.5.3 MFA, 3.13.11 FIPS)
  dualMin?: number;
  dualRule?: string;
  poamEligible: boolean;
  poamRuleNote?: string;
  poamEligibility: PoamEligibility; // derived for the badge
  guidance: string; // doc-derived (authoritative file omits it)
  tools: string[];
}

function nistOf(controlId: string): string {
  return controlId.includes('L2-') ? controlId.split('L2-')[1] : controlId;
}

const EXCLUDED = SR.poam_rules.excluded_controls_regardless_of_weight;
const CARVEOUT = SR.poam_rules.carve_out_controls;

function poamEligibility(c: RawControl): PoamEligibility {
  if (EXCLUDED.includes(c.control_id)) return 'no-excluded';
  if (CARVEOUT.includes(c.control_id)) return 'carveout';
  return c.poam_eligible ? 'yes' : 'no';
}

export const CMMC_L2_CONTROLS: ControlReference[] = RAW.controls.map((c) => {
  const isNa = String(c.weight).toUpperCase() === 'NA';
  const dual = c.weight_category === 'Dual-value Derived';
  const g = GUIDANCE[c.control_id] ?? { guidance: '', tools: [] };
  return {
    controlId: c.control_id,
    nistId: nistOf(c.control_id),
    family: c.family,
    familyName: c.family_name,
    title: c.title,
    weightMax: isNa ? null : Number(c.weight),
    isNa,
    weightCategory: c.weight_category,
    weightRaw: isNa ? 'NA (blocking)' : dual ? `${c.weight} (min ${c.dual_value_min})` : `${c.weight}`,
    dual,
    dualMin: c.dual_value_min,
    dualRule: c.dual_value_rule,
    poamEligible: c.poam_eligible,
    poamRuleNote: c.poam_rule_note,
    poamEligibility: poamEligibility(c),
    guidance: g.guidance,
    tools: g.tools,
  };
});

const BY_NIST: Record<string, ControlReference> = Object.fromEntries(CMMC_L2_CONTROLS.map((c) => [c.nistId, c]));
const BY_CMMC: Record<string, ControlReference> = Object.fromEntries(CMMC_L2_CONTROLS.map((c) => [c.controlId, c]));

export function getControlReference(controlId: string): ControlReference | null {
  if (BY_CMMC[controlId]) return BY_CMMC[controlId];
  return BY_NIST[nistOf(controlId)] ?? null;
}

// ── Weights are reconciled. SPRS scoring is unlocked. ───────────────────────
export const WEIGHTS_VERIFIED = true;

export const SPRS_MATH = {
  startingScore: SR.max_score,
  deduction: 'For each requirement Not Met, subtract its weight (5/3/1) from 110. Dual-value: 3.5.3/3.13.11 deduct 3 (partial) or 5 (absent). CA.L2-3.12.4 (SSP) is NA — non-numeric but blocking. Negative scores possible.',
  distribution: '42×5pt, 14×3pt, 51×1pt, + 2 dual-value (3.5.3 MFA, 3.13.11 FIPS), + 1 NA (CA.L2-3.12.4) = 110 (verified against Annex A)',
  minScore: SR.min_score_all_controls_failed,
  minScoreNote: SR.min_score_calculation_note ?? 'Methodology-consistent minimum (−120 secondary figure discarded).',
  conditionalThreshold: SR.conditional_threshold_score,
  conditionalRatio: SR.conditional_threshold_ratio,
  source: 'NIST SP 800-171 DoD Assessment Methodology v1.2.1, Annex A; 32 CFR §170.24',
} as const;

export const POAM_RULES = {
  eligibleRule: 'Only 1-point-weighted requirements are POA&M-eligible.',
  carveout: 'SC.L2-3.13.11 (FIPS crypto): POA&M-able only when encryption is employed but not FIPS-validated (3-pt case).',
  excludedControls: EXCLUDED,
  excludedDetail: SR.poam_rules.excluded_controls_detail ?? {},
  l3ExcludedControls: SR.poam_rules.l3_poam_ineligible_controls,
  maxItems: SR.max_score - SR.conditional_threshold_score, // 110 - 88 = 22
  closeWindowDays: SR.poam_rules.close_window_days,
  source: '32 CFR §170.21 (verbatim, verified)',
} as const;

export interface VerificationFlag {
  id: string;
  topic: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  reconcileAgainst: string;
}

// Remaining OPEN items after the 2026-07-11/12 reconciliation. The 11 original
// weight/POA&M/methodology flags are RESOLVED (see WEIGHT_RECONCILIATION doc).
export const VERIFICATION_FLAGS: VerificationFlag[] = [
  {
    id: 'far-5949-final',
    topic: 'FAR §5949 rule not final; CXMT/YMTC disclosure designation',
    detail: 'FAR 52.240-YY is still a proposed rule (comments closed 2026-04-20). Whether CXMT/YMTC are disclosure-triggering "semiconductor covered entities" is unresolved (SIA comment letter flags a §5949(j)(2) vs (j)(3) cross-reference gap).',
    severity: 'medium',
    reconcileAgainst: 'FAR 52.240-YY final rule',
  },
  {
    id: 'device-boms',
    topic: 'Mushroom 1 / Hyphae BOMs not documented',
    detail: 'Only the Psathyrella buoy has a documented BOM. Supply-chain screening for the quadruped and sensor array is generic until real component data is entered.',
    severity: 'medium',
    reconcileAgainst: 'Internal build records (BOM with manufacturer + country-of-origin + fab-origin)',
  },
  {
    id: 'taco-clause-matrix',
    topic: '48 CFR rule vs. TAC-O Phase 2 clause matrix',
    detail: 'The general CMMC phase schedule need not match individual contract clauses. Check N66604-26-9-A00X\'s clause matrix for the actual required level + flow-downs.',
    severity: 'medium',
    reconcileAgainst: 'TAC-O Phase 2 (N66604-26-9-A00X) contract clause matrix',
  },
  {
    id: 'fedramp-evidence',
    topic: 'PreVeil FedRAMP Moderate Equivalency evidence package',
    detail: 'The SSP label "FedRAMP Moderate Equivalent" is not itself sufficient under DoD CIO Dec-2023 guidance. Retain PreVeil\'s 3PAO assessment report + SSP/SAR/POA&M-closure as SSP supporting evidence.',
    severity: 'medium',
    reconcileAgainst: 'DFARS 252.204-7012(b)(2)(ii)(D) + DoD CIO FedRAMP equivalency memo',
  },
  {
    id: 'fascsa-cisa',
    topic: 'CISA FASCSA guidance page (retrieval blocked)',
    detail: 'CISA\'s public FASCSA guidance couldn\'t be fetched; FAR 52.204-30 clause text is the verified reference. Check SAM.gov for applicable FASCSA orders quarterly.',
    severity: 'low',
    reconcileAgainst: 'SAM.gov FASCSA orders + CISA supply-chain guidance',
  },
  {
    id: 'l2-guidance-source',
    topic: 'Per-control implementation guidance source',
    detail: 'Authoritative weight file omits narrative guidance (Assessment Guide v2.13 not fetched). The workbook shows doc-derived guidance/tools — treat as helpful context, not verbatim assessment-guide text.',
    severity: 'low',
    reconcileAgainst: 'CMMC Assessment Guide – Level 2 v2.13 narrative text',
  },
];

/** True if a control is on the (verified) POA&M-excluded list. */
export function isPoamExcluded(controlId: string): boolean {
  const ref = getControlReference(controlId);
  const cmmc = ref?.controlId ?? controlId;
  return EXCLUDED.includes(cmmc) || ref?.poamEligibility === 'no-excluded';
}
