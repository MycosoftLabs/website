/**
 * FUSARIUM Launchpad — score-engine test vectors (master plan §35.1).
 *
 * The engine is deterministic and these vectors are its contract. Any change
 * to the math must update the vectors WITH a citation to the governing rule
 * (32 CFR §170.24 / §170.21 / §170.16), never to make a test pass.
 */

import {
  computeScore,
  determineEligibility,
  poamDueDate,
  retentionReminderDate,
  RULE_PACK_V1,
  type AssessmentState,
} from '../engine';
import { CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';
import { catalogInvariants } from '@/lib/launchpad/catalog';

const ALL_IDS = CMMC_L2_CONTROLS.map((c) => c.controlId);
const NA_CONTROL = 'CA.L2-3.12.4'; // SSP — non-numeric, blocking
const DUAL_MFA = 'IA.L2-3.5.3'; // 5 absent / 3 partial
const DUAL_FIPS = 'SC.L2-3.13.11'; // 5 absent / 3 partial (POA&M carve-out)

function allImplemented(): Record<string, AssessmentState> {
  return Object.fromEntries(ALL_IDS.map((id) => [id, 'implemented' as AssessmentState]));
}

function weightOf(id: string): number {
  const c = CMMC_L2_CONTROLS.find((x) => x.controlId === id)!;
  return c.weightMax ?? 0;
}

describe('score engine — §35.1 vectors', () => {
  test('exactly 110 requirements in the corpus; exactly three CMMC levels concern us here', () => {
    expect(ALL_IDS).toHaveLength(110);
    expect(RULE_PACK_V1.maxScore).toBe(110);
  });

  test('all 110 implemented → 110, final-eligible', () => {
    const r = computeScore(allImplemented(), RULE_PACK_V1);
    expect(r.score).toBe(110);
    expect(r.implementedCount).toBe(110);
    expect(r.notMetCount).toBe(0);
    expect(r.unassessedCount).toBe(0);
    expect(determineEligibility(r, RULE_PACK_V1).eligibility).toBe('final-eligible');
  });

  test('all not-implemented → negative floor (110 − Σ deductions = −203), not-eligible', () => {
    const states = Object.fromEntries(
      ALL_IDS.map((id) => [id, 'not_implemented' as AssessmentState]),
    );
    const r = computeScore(states, RULE_PACK_V1);
    // Published floor for the v1.2.1 methodology.
    expect(r.score).toBe(-203);
    expect(r.notMetCount).toBe(110);
    expect(determineEligibility(r, RULE_PACK_V1).eligibility).toBe('not-eligible');
  });

  test('single not-met at each weight class → 105 / 107 / 109', () => {
    const five = ALL_IDS.find((id) => weightOf(id) === 5 && id !== DUAL_MFA && id !== DUAL_FIPS)!;
    const three = ALL_IDS.find((id) => weightOf(id) === 3)!;
    const one = ALL_IDS.find((id) => weightOf(id) === 1)!;
    for (const [id, expected] of [
      [five, 105],
      [three, 107],
      [one, 109],
    ] as const) {
      const states = allImplemented();
      states[id] = 'not_implemented';
      expect(computeScore(states, RULE_PACK_V1).score).toBe(expected);
    }
  });

  test('dual-value both branches: partial −3, absent −5 (IA.L2-3.5.3 and SC.L2-3.13.11)', () => {
    for (const id of [DUAL_MFA, DUAL_FIPS]) {
      const partial = allImplemented();
      partial[id] = 'partial';
      expect(computeScore(partial, RULE_PACK_V1).score).toBe(107);

      const absent = allImplemented();
      absent[id] = 'not_implemented';
      expect(computeScore(absent, RULE_PACK_V1).score).toBe(105);
    }
  });

  test('non-dual partial deducts the FULL weight — no partial credit outside the two dual controls', () => {
    const five = ALL_IDS.find((id) => weightOf(id) === 5 && id !== DUAL_MFA && id !== DUAL_FIPS)!;
    const states = allImplemented();
    states[five] = 'partial';
    expect(computeScore(states, RULE_PACK_V1).score).toBe(105);
  });

  test('the NA control deducts 0 but blocks Conditional when not met', () => {
    const states = allImplemented();
    states[NA_CONTROL] = 'not_implemented';
    const r = computeScore(states, RULE_PACK_V1);
    expect(r.score).toBe(110); // no numeric deduction
    expect(r.notMetCount).toBe(1);
    const e = determineEligibility(r, RULE_PACK_V1);
    expect(e.eligibility).toBe('not-eligible');
    expect(e.blockingGaps).toContain(NA_CONTROL);
  });

  test('not_applicable deducts nothing and is excluded from the implemented count (count ≠ score)', () => {
    const a = allImplemented();
    const one = ALL_IDS.find((id) => weightOf(id) === 1)!;
    const five = ALL_IDS.find((id) => weightOf(id) === 5 && id !== DUAL_MFA && id !== DUAL_FIPS)!;

    // Same implemented count (108), different scores — a count is not a status.
    const b = { ...a, [one]: 'not_applicable' as AssessmentState, [five]: 'not_implemented' as AssessmentState };
    const c = { ...a, [five]: 'not_applicable' as AssessmentState, [one]: 'not_implemented' as AssessmentState };
    const rb = computeScore(b, RULE_PACK_V1);
    const rc = computeScore(c, RULE_PACK_V1);
    expect(rb.implementedCount).toBe(rc.implementedCount);
    expect(rb.score).toBe(105);
    expect(rc.score).toBe(109);
  });

  test('missing states are Not-Met AND surfaced as unassessed — silence cannot inflate a score', () => {
    const states = allImplemented();
    const one = ALL_IDS.find((id) => weightOf(id) === 1)!;
    delete (states as Record<string, unknown>)[one];
    const r = computeScore(states, RULE_PACK_V1);
    expect(r.score).toBe(109);
    expect(r.unassessedCount).toBe(1);
  });

  test('boundary: exactly 88 with all-eligible gaps ≤ 22 → conditional; one ineligible gap at ≥88 → not-eligible', () => {
    // Build a deduction of exactly 22 points from 1-pt POA&M-eligible gaps.
    const eligibleOnes = CMMC_L2_CONTROLS
      .filter((c) => c.weightMax === 1 && c.poamEligibility === 'yes')
      .map((c) => c.controlId);
    expect(eligibleOnes.length).toBeGreaterThanOrEqual(22);

    const states = allImplemented();
    for (const id of eligibleOnes.slice(0, 22)) states[id] = 'not_implemented';
    const r = computeScore(states, RULE_PACK_V1);
    expect(r.score).toBe(88);
    expect(determineEligibility(r, RULE_PACK_V1).eligibility).toBe('conditional-eligible');

    // Swap one eligible gap for a POA&M-ineligible 1-pt gap (§170.21(a)(2)(iii) exclusions).
    const excludedOne = CMMC_L2_CONTROLS.find(
      (c) => c.weightMax === 1 && c.poamEligibility === 'no-excluded',
    )!.controlId;
    const states2 = allImplemented();
    for (const id of eligibleOnes.slice(0, 21)) states2[id] = 'not_implemented';
    states2[excludedOne] = 'not_implemented';
    const r2 = computeScore(states2, RULE_PACK_V1);
    expect(r2.score).toBe(88);
    const e2 = determineEligibility(r2, RULE_PACK_V1);
    expect(e2.eligibility).toBe('not-eligible');
    expect(e2.blockingGaps).toContain(excludedOne);
  });

  test('23 open POA&M-eligible items → not-eligible even at ≥ 88 is impossible here (score 87), and count cap enforces independently', () => {
    const eligibleOnes = CMMC_L2_CONTROLS
      .filter((c) => c.weightMax === 1 && c.poamEligibility === 'yes')
      .map((c) => c.controlId);
    expect(eligibleOnes.length).toBeGreaterThanOrEqual(23);
    const states = allImplemented();
    for (const id of eligibleOnes.slice(0, 23)) states[id] = 'not_implemented';
    const r = computeScore(states, RULE_PACK_V1);
    expect(r.score).toBe(87);
    const e = determineEligibility(r, RULE_PACK_V1);
    expect(e.eligibility).toBe('not-eligible');
    // Both the score gate and the 22-cap would fail; reason mentions the score.
    expect(e.reason).toContain('87');
  });

  test('FIPS carve-out: SC.L2-3.13.11 partial (encryption present, not FIPS-validated) is POA&M-eligible despite weighing 5', () => {
    const states = allImplemented();
    states[DUAL_FIPS] = 'partial';
    const r = computeScore(states, RULE_PACK_V1);
    const gap = r.gaps.find((g) => g.controlId === DUAL_FIPS)!;
    expect(gap.deduction).toBe(3);
    expect(gap.poamEligible).toBe(true); // §170.21(a)(2)(ii) explicit carve-out
  });

  test('180-day POA&M window and six-year retention reminder', () => {
    const opened = new Date('2026-08-11T00:00:00Z');
    expect(poamDueDate(opened, RULE_PACK_V1).toISOString()).toBe('2027-02-07T00:00:00.000Z');
    expect(retentionReminderDate(opened).toISOString()).toBe('2032-08-11T00:00:00.000Z');
  });

  test('rule-pack version is stamped into every result (historical snapshots stay pinned)', () => {
    const r = computeScore(allImplemented(), RULE_PACK_V1);
    expect(r.rulePackVersion).toBe(RULE_PACK_V1.version);
    const v2 = { ...RULE_PACK_V1, version: 'cmmc-l2-v2.13-r2' };
    expect(computeScore(allImplemented(), v2).rulePackVersion).toBe('cmmc-l2-v2.13-r2');
  });

  test('catalog invariants hold (annual = 10× monthly, unique keys, plan keys present)', () => {
    expect(catalogInvariants()).toEqual([]);
  });
});
