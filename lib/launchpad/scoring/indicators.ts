/**
 * Four independent Launchpad measurements.
 * Never blend into one “96/110 = Conditional” status.
 */

import { CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';
import {
  computeScore,
  determineEligibility,
  RULE_PACK_V1,
  type AssessmentState,
} from '@/lib/launchpad/scoring/engine';

export interface FourMeasurements {
  implementedCount: {
    value: number;
    total: number;
    label: string;
  };
  weightedScore: {
    value: number;
    max: number;
    threshold: number;
    label: string;
  };
  poamEligibility: {
    value: 'final-eligible' | 'conditional-eligible' | 'not-eligible';
    reason: string;
    openPoamItems: number;
    blockingGaps: string[];
    label: string;
  };
  evidenceCompleteness: {
    value: number;
    covered: number;
    assessed: number;
    catalogSize: number;
    label: string;
  };
  independenceNote: string;
  rulePackVersion: string;
}

export function fourIndependentMeasurements(
  states: Record<string, AssessmentState | undefined>,
  evidenceControlIds: string[],
): FourMeasurements {
  const scored = computeScore(states, RULE_PACK_V1);
  const eligibility = determineEligibility(scored, RULE_PACK_V1);
  const covered = new Set(evidenceControlIds);
  const assessed = Object.keys(states).length;
  const evidencedAssessed =
    assessed > 0 ? Object.keys(states).filter((id) => covered.has(id)).length : 0;
  const completeness = assessed > 0 ? Math.round((evidencedAssessed / assessed) * 100) / 100 : 0;

  return {
    implementedCount: {
      value: scored.implementedCount,
      total: CMMC_L2_CONTROLS.length,
      label: 'Customer-marked implemented count (not a status)',
    },
    weightedScore: {
      value: scored.score,
      max: scored.maxScore,
      threshold: scored.conditionalThreshold,
      label: 'Weighted score estimate — customer review required',
    },
    poamEligibility: {
      value: eligibility.eligibility,
      reason: eligibility.reason,
      openPoamItems: eligibility.openPoamItems,
      blockingGaps: eligibility.blockingGaps,
      label: 'POA&M eligibility estimate — not a government determination',
    },
    evidenceCompleteness: {
      value: completeness,
      covered: covered.size,
      assessed,
      catalogSize: CMMC_L2_CONTROLS.length,
      label: 'Share of assessed requirements with indexed evidence (hash/ref only)',
    },
    independenceNote:
      'Implementation count, weighted score, POA&M eligibility, and evidence completeness are four independent measurements. Never merge them into one number or “96/110 = Conditional”.',
    rulePackVersion: scored.rulePackVersion,
  };
}
