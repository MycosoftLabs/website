import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { CMMC_L2_CONTROLS, isPoamExcluded } from '@/lib/security/reference/cmmc-l2-reference';
import {
  computeScore,
  determineEligibility,
  RULE_PACK_V1,
  type AssessmentState,
} from '@/lib/launchpad/scoring/engine';

/**
 * Closure Board — the tenant's own gaps sequenced into five deterministic
 * waves (a wave = an ordered tranche of gap closure, cheapest paper first,
 * deepest architecture last).
 *
 * Everything here is computed at request time from launchpad_control_states:
 * a gap is any requirement not customer-marked implemented / not applicable
 * (a requirement with NO recorded state is a gap too — silence never closes
 * anything). Projections call the scoring engine with hypothetical states and
 * are labeled exactly that: projected if closed — not achieved.
 *
 * Read-only: GET only, no mutations, nothing persisted.
 */

export const dynamic = 'force-dynamic';

const WAVES: Array<{
  wave: number;
  key: string;
  label: string;
  families: string[];
  blurb: string;
}> = [
  {
    wave: 1,
    key: 'paper',
    label: 'Policy & paper controls',
    families: ['AT', 'PS', 'CA', 'RA'],
    blurb:
      'Training, personnel, assessment, and planning requirements that close with written policies, signed determinations, and recorded decisions — no infrastructure change needed.',
  },
  {
    wave: 2,
    key: 'access',
    label: 'Account & access hygiene',
    families: ['AC', 'IA'],
    blurb:
      'Who can log in, to what, and how they prove who they are: account inventory, least privilege, MFA, password rules, session controls.',
  },
  {
    wave: 3,
    key: 'logging',
    label: 'Logging & monitoring',
    families: ['AU', 'SI'],
    blurb:
      'Audit records, alerting, malware protection, and flaw remediation — the requirements that need logs to exist, be retained, and be reviewed.',
  },
  {
    wave: 4,
    key: 'hardware',
    label: 'Hardware & configuration',
    families: ['CM', 'MP', 'PE', 'MA'],
    blurb:
      'Baseline configurations, media protection, physical protection, and maintenance — device-by-device work on the machines in your boundary.',
  },
  {
    wave: 5,
    key: 'enclave',
    label: 'Enclave & architecture',
    families: ['SC', 'IR'],
    blurb:
      'Communications protection and incident response — boundary architecture, encryption in transit, and an exercised incident-handling capability. The deepest, slowest tranche.',
  },
];

/** Two-letter family code; the corpus family field is not guaranteed to be the code. */
function familyCode(family: string, controlId: string): string {
  return /^[A-Z]{2}$/.test(family) ? family : controlId.slice(0, 2);
}

export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const { data: stateRows, error } = await ctx.supabase
    .from('launchpad_control_states')
    .select('control_id, state')
    .eq('tenant_id', ctx.tenantId);
  if (error) return NextResponse.json({ error: 'Could not load control states' }, { status: 500 });

  const states: Record<string, AssessmentState> = {};
  for (const row of stateRows ?? []) states[row.control_id] = row.state as AssessmentState;

  const current = computeScore(states, RULE_PACK_V1);
  const currentEligibility = determineEligibility(current, RULE_PACK_V1);

  // Cumulative projection walks the waves in order; solo projection closes
  // one wave against today's register. Both come from the scoring engine so
  // dual-value partial credit and the blocking NA control are handled exactly.
  const cumulative: Record<string, AssessmentState> = { ...states };

  const waves = WAVES.map((w) => {
    const controls = CMMC_L2_CONTROLS.filter((c) => w.families.includes(familyCode(c.family, c.controlId)));
    const open = controls.filter((c) => {
      const s = states[c.controlId];
      return s !== 'implemented' && s !== 'not_applicable';
    });

    const solo: Record<string, AssessmentState> = { ...states };
    for (const c of open) solo[c.controlId] = 'implemented';
    const soloScore = computeScore(solo, RULE_PACK_V1);

    for (const c of open) cumulative[c.controlId] = 'implemented';
    const cumulativeScore = computeScore(cumulative, RULE_PACK_V1);
    const cumulativeEligibility = determineEligibility(cumulativeScore, RULE_PACK_V1);

    const wavePointsTotal = controls.reduce((sum, c) => sum + (c.weightMax ?? 0), 0);
    const wavePointsOpen = open.reduce((sum, c) => sum + (c.weightMax ?? 0), 0);

    return {
      wave: w.wave,
      key: w.key,
      label: w.label,
      blurb: w.blurb,
      families: w.families,
      totalControls: controls.length,
      openCount: open.length,
      closedCount: controls.length - open.length,
      wavePointsTotal,
      wavePointsClosed: wavePointsTotal - wavePointsOpen,
      /** Exact engine delta if only this wave closed today. */
      pointsRecoverable: soloScore.score - current.score,
      projectedScoreIfWaveClosed: soloScore.score,
      /** Score after waves 1..this close in sequence — projected, not achieved. */
      projectedScoreCumulative: cumulativeScore.score,
      projectedEligibilityCumulative: cumulativeEligibility.eligibility,
      openControls: open.map((c) => ({
        controlId: c.controlId,
        title: c.title,
        family: familyCode(c.family, c.controlId),
        /** null for the non-numeric blocking control (CA.L2-3.12.4). */
        weight: c.weightMax,
        blocking: c.isNa,
        state: states[c.controlId] ?? null,
        poamEligible:
          (c.poamEligibility === 'yes' || c.poamEligibility === 'carveout') &&
          !isPoamExcluded(c.controlId),
      })),
    };
  });

  return NextResponse.json({
    current: {
      score: current.score,
      maxScore: current.maxScore,
      threshold: current.conditionalThreshold,
      meetsThreshold: current.meetsConditionalThreshold,
      eligibility: currentEligibility.eligibility,
      reason: currentEligibility.reason,
      implementedCount: current.implementedCount,
      notMetCount: current.notMetCount,
      unassessedCount: current.unassessedCount,
    },
    waves,
    rulePackVersion: RULE_PACK_V1.version,
    note:
      'Wave projections assume every open requirement in the wave is later customer-marked implemented. ' +
      'They are projected if closed — not achieved, not a certification, and not a government determination. ' +
      'Requirements with no recorded state count as open.',
  });
}
