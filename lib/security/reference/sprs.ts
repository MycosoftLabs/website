// ═══════════════════════════════════════════════════════════════════════════
// SPRS scoring engine (DoD Assessment Methodology v1.2.1)
// ═══════════════════════════════════════════════════════════════════════════
//
// Pure computation of the SPRS score from control posture + per-control weights.
//
// ⚠ GATED: this engine is DORMANT until `WEIGHTS_VERIFIED === true` (see
// cmmc-l2-reference.ts). The UI must not display a computed score while weights
// are unverified. Once Perplexity's corrected weight table lands (~2026-07-13)
// and WEIGHTS_VERIFIED is flipped, this lights up automatically — no other code
// change required.
//
// Methodology (32 CFR §170.24 / DoD Assessment Methodology v1.2.1):
//   • Start at 110 (one point per NIST 800-171 R2 requirement).
//   • For each requirement NOT MET, subtract its weight (5/3/1). Negative OK.
//   • Two dual-value requirements carry partial credit:
//       IA.L2-3.5.3 (MFA): 5 if absent entirely, 3 if only remote/privileged.
//       SC.L2-3.13.11 (FIPS): 5 if no encryption, 3 if encryption not FIPS-validated.
//   • MET or NOT APPLICABLE → no deduction.
//   • Conditional status eligibility requires score ≥ 88 (80% of 110), all
//     not-met items POA&M-eligible, ≤ 22 items, none on the excluded list.

import { getControlReference, WEIGHTS_VERIFIED, POAM_RULES, isPoamExcluded } from './cmmc-l2-reference';
import {
  POSTURE_OVERLAY,
  stateFor,
  type PostureMode,
  type ImplementationState,
} from '../posture/nist-800-171-posture';

export interface SprsGap {
  controlId: string;
  weight: number;
  deduction: number;
  state: ImplementationState;
  poamEligible: boolean;
  excluded: boolean;
}

export interface SprsResult {
  score: number;
  maxScore: number; // 110
  met: number;
  notMet: number;
  notApplicable: number;
  gaps: SprsGap[];
  conditionalThreshold: number; // 88
  meetsConditionalThreshold: boolean;
}

/** Compute the SPRS score for a posture mode ('current' | 'target'). Pure. */
export function computeSprs(mode: PostureMode = 'current'): SprsResult {
  let score = POSTURE_OVERLAY.score.max_possible ?? 110;
  const maxScore = score;
  const gaps: SprsGap[] = [];
  let met = 0;
  let notApplicable = 0;

  for (const c of POSTURE_OVERLAY.controls) {
    const ref = getControlReference(c.control_id);
    const weightMax = ref?.weightMax ?? 1; // null only for the NA control
    const dual = ref?.dual ?? false;
    const isNa = ref?.isNa ?? false;
    const state = stateFor(c, mode).implementation_state;

    if (state === 'implemented') met++;
    if (state === 'not_applicable') notApplicable++;

    const isNotMet = state !== 'implemented' && state !== 'not_applicable';
    // Deduction: NA control contributes 0 to the numeric score (but a Not-Met
    // NA control still blocks Conditional status — captured via poamEligible).
    // Dual: partial deducts the min (3), absent deducts the full (5).
    let deduction = 0;
    if (isNotMet && !isNa) {
      deduction = dual ? (state === 'partial' ? (ref?.dualMin ?? 3) : weightMax) : weightMax;
    }

    if (isNotMet) {
      gaps.push({
        controlId: c.control_id,
        weight: isNa ? 0 : weightMax,
        deduction,
        state,
        poamEligible: (ref?.poamEligibility === 'yes' || ref?.poamEligibility === 'carveout') && !isPoamExcluded(c.control_id),
        excluded: isPoamExcluded(c.control_id) || isNa,
      });
      score -= deduction;
    }
  }

  return {
    score,
    maxScore,
    met,
    notMet: gaps.length,
    notApplicable,
    gaps,
    conditionalThreshold: 88,
    meetsConditionalThreshold: score >= 88,
  };
}

export type CmmcEligibility = 'final-eligible' | 'conditional-eligible' | 'not-eligible';

export interface CmmcStatusResult {
  eligibility: CmmcEligibility;
  reason: string;
  openPoamItems: number;
  blockingGaps: string[]; // not-met items that CANNOT go on a POA&M
}

/** Determine CMMC (self) status eligibility from an SPRS result. */
export function determineCmmcStatus(sprs: SprsResult): CmmcStatusResult {
  const blockingGaps = sprs.gaps.filter((g) => !g.poamEligible).map((g) => g.controlId);

  if (sprs.notMet === 0) {
    return { eligibility: 'final-eligible', reason: 'All requirements Met/Not Applicable — Final Level 2 (Self) eligible once affirmed.', openPoamItems: 0, blockingGaps: [] };
  }
  const poamCount = sprs.gaps.filter((g) => g.poamEligible).length;
  if (sprs.meetsConditionalThreshold && blockingGaps.length === 0 && poamCount <= POAM_RULES.maxItems) {
    return { eligibility: 'conditional-eligible', reason: `Score ${sprs.score} ≥ ${sprs.conditionalThreshold}; all ${poamCount} gaps POA&M-eligible (≤ ${POAM_RULES.maxItems}). Conditional Level 2 (Self) eligible with a compliant POA&M.`, openPoamItems: poamCount, blockingGaps: [] };
  }
  const reasons: string[] = [];
  if (!sprs.meetsConditionalThreshold) reasons.push(`score ${sprs.score} < ${sprs.conditionalThreshold}`);
  if (blockingGaps.length > 0) reasons.push(`${blockingGaps.length} non-POA&M-eligible gap(s) must be met first`);
  if (poamCount > POAM_RULES.maxItems) reasons.push(`> ${POAM_RULES.maxItems} POA&M items`);
  return { eligibility: 'not-eligible', reason: `Not yet eligible: ${reasons.join('; ')}.`, openPoamItems: poamCount, blockingGaps };
}

/** Convenience: computed scores are only meaningful once weights are verified. */
export const SPRS_ENGINE_ACTIVE = WEIGHTS_VERIFIED;
