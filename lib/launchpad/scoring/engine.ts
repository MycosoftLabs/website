/**
 * FUSARIUM Launchpad — deterministic CMMC L2 / NIST SP 800-171 scoring engine.
 *
 * THE single implementation of the DoD Assessment Methodology v1.2.1 math
 * (32 CFR §170.24) in this codebase. The internal /security/compliance engine
 * (lib/security/reference/sprs.ts) delegates here; Launchpad tenants call it
 * with their own control states. Pure functions, no I/O, no module-scope data
 * reads — testable with the §35.1 vector suite.
 *
 * Methodology:
 *   - Start at 110 (one point per requirement).
 *   - For each requirement NOT MET, subtract its Annex A weight (5/3/1).
 *     Negative totals are possible (floor −203).
 *   - Dual-value requirements carry partial credit: IA.L2-3.5.3 (MFA) and
 *     SC.L2-3.13.11 (FIPS) deduct 3 when partially implemented, 5 when absent.
 *   - CA.L2-3.12.4 (SSP) is non-numeric/blocking: it deducts 0 but a Not-Met
 *     state still blocks Conditional status.
 *   - MET or NOT APPLICABLE deduct nothing.
 *   - Conditional eligibility: score ≥ ratio×110 (88), every gap POA&M-eligible,
 *     and at most poamMaxItems (22) gaps.
 *
 * HONESTY RULE (structural): nothing in this module accepts an AI-produced
 * state. Callers persist states with state_source ∈ {customer, agent_check}
 * enforced by the database enum; the engine only ever computes from what the
 * customer recorded.
 */

import { getControlReference, CMMC_L2_CONTROLS, isPoamExcluded } from '@/lib/security/reference/cmmc-l2-reference';

export type AssessmentState = 'implemented' | 'partial' | 'not_implemented' | 'not_applicable';

export interface RulePackParams {
  /** e.g. 'cmmc-l2-v2.13-r1' — frozen into every ScoreSnapshot row. */
  version: string;
  /** sha256 of the control corpus this pack pins. */
  corpusHash: string;
  maxScore: number; // 110
  conditionalRatio: number; // 0.8 → threshold 88
  poamMaxItems: number; // 22
  poamWindowDays: number; // 180
}

/** The v1 rule pack: the verified Annex A corpus shipped in this repo. */
export const RULE_PACK_V1: RulePackParams = {
  version: 'cmmc-l2-v2.13-r1',
  // Pinned by scripts/ingest-cmmc-controls.mjs verification (MD5 abca7ab1…);
  // the DB row for this pack stores the full sha256 of cmmc-l2-controls.json.
  corpusHash: 'md5:abca7ab11c0cd1f5d1cd340760a634f0',
  maxScore: 110,
  conditionalRatio: 0.8,
  poamMaxItems: 22,
  poamWindowDays: 180,
};

export interface ScoreGap {
  controlId: string;
  weight: number;
  deduction: number;
  state: AssessmentState;
  poamEligible: boolean;
  excluded: boolean;
}

export interface ScoreResult {
  score: number;
  maxScore: number;
  conditionalThreshold: number;
  meetsConditionalThreshold: boolean;
  implementedCount: number;
  notMetCount: number;
  notApplicableCount: number;
  /** Controls with no recorded state (treated as not_implemented, surfaced honestly). */
  unassessedCount: number;
  gaps: ScoreGap[];
  rulePackVersion: string;
}

export type Eligibility = 'final-eligible' | 'conditional-eligible' | 'not-eligible';

export interface EligibilityResult {
  eligibility: Eligibility;
  reason: string;
  openPoamItems: number;
  /** Not-Met requirements that CANNOT sit on a POA&M — each blocks Conditional. */
  blockingGaps: string[];
}

/**
 * Compute the weighted score from explicit control states.
 *
 * Iterates the FULL 110-requirement corpus (never just the keys of `states`),
 * so an absent state is a Not-Met, not a silent omission — a tenant cannot
 * inflate a score by not answering.
 */
export function computeScore(
  states: Record<string, AssessmentState | undefined>,
  pack: RulePackParams,
  /** Optional explicit iteration order (control ids); defaults to corpus order. */
  order?: string[],
): ScoreResult {
  const threshold = Math.ceil(pack.maxScore * pack.conditionalRatio);
  let score = pack.maxScore;
  const gaps: ScoreGap[] = [];
  let implementedCount = 0;
  let notApplicableCount = 0;
  let unassessedCount = 0;

  const ids = order ?? CMMC_L2_CONTROLS.map((c) => c.controlId);

  for (const controlId of ids) {
    const ref = getControlReference(controlId);
    const weightMax = ref?.weightMax ?? 1; // null only for the NA control
    const dual = ref?.dual ?? false;
    const isNa = ref?.isNa ?? false;

    const raw = states[controlId];
    if (raw === undefined) unassessedCount++;
    const state: AssessmentState = raw ?? 'not_implemented';

    if (state === 'implemented') implementedCount++;
    if (state === 'not_applicable') notApplicableCount++;

    const isNotMet = state !== 'implemented' && state !== 'not_applicable';
    // NA control deducts 0 (blocking is handled via eligibility, not the score).
    // Dual: partial deducts the min (3), absent the full weight (5).
    let deduction = 0;
    if (isNotMet && !isNa) {
      deduction = dual ? (state === 'partial' ? (ref?.dualMin ?? 3) : weightMax) : weightMax;
    }

    if (isNotMet) {
      gaps.push({
        controlId,
        weight: isNa ? 0 : weightMax,
        deduction,
        state,
        poamEligible:
          (ref?.poamEligibility === 'yes' || ref?.poamEligibility === 'carveout') &&
          !isPoamExcluded(controlId),
        excluded: isPoamExcluded(controlId) || isNa,
      });
      score -= deduction;
    }
  }

  return {
    score,
    maxScore: pack.maxScore,
    conditionalThreshold: threshold,
    meetsConditionalThreshold: score >= threshold,
    implementedCount,
    notMetCount: gaps.length,
    notApplicableCount,
    unassessedCount,
    gaps,
    rulePackVersion: pack.version,
  };
}

/** Determine CMMC Level 2 (Self) eligibility from a score result. */
export function determineEligibility(result: ScoreResult, pack: RulePackParams): EligibilityResult {
  const blockingGaps = result.gaps.filter((g) => !g.poamEligible).map((g) => g.controlId);

  if (result.notMetCount === 0) {
    return {
      eligibility: 'final-eligible',
      reason: 'All requirements Met/Not Applicable — Final Level 2 (Self) eligible once affirmed by the customer.',
      openPoamItems: 0,
      blockingGaps: [],
    };
  }
  const poamCount = result.gaps.filter((g) => g.poamEligible).length;
  if (result.meetsConditionalThreshold && blockingGaps.length === 0 && poamCount <= pack.poamMaxItems) {
    return {
      eligibility: 'conditional-eligible',
      reason: `Score ${result.score} ≥ ${result.conditionalThreshold}; all ${poamCount} gaps POA&M-eligible (≤ ${pack.poamMaxItems}). Conditional Level 2 (Self) eligible with a compliant POA&M.`,
      openPoamItems: poamCount,
      blockingGaps: [],
    };
  }
  const reasons: string[] = [];
  if (!result.meetsConditionalThreshold) reasons.push(`score ${result.score} < ${result.conditionalThreshold}`);
  if (blockingGaps.length > 0) reasons.push(`${blockingGaps.length} non-POA&M-eligible gap(s) must be met first`);
  if (poamCount > pack.poamMaxItems) reasons.push(`> ${pack.poamMaxItems} POA&M items`);
  return {
    eligibility: 'not-eligible',
    reason: `Not yet eligible: ${reasons.join('; ')}.`,
    openPoamItems: poamCount,
    blockingGaps,
  };
}

/** POA&M closeout deadline: opened + the pack's 180-day window. */
export function poamDueDate(openedAt: Date, pack: RulePackParams): Date {
  const d = new Date(openedAt.getTime());
  d.setUTCDate(d.getUTCDate() + pack.poamWindowDays);
  return d;
}

/** Six-year assessment-artifact retention reminder (32 CFR §170.16). */
export function retentionReminderDate(statusDate: Date): Date {
  const d = new Date(statusDate.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + 6);
  return d;
}
