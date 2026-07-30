import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-auth';
import {
  CLOSURE_BASELINE, CLOSURE_WAVES,
  BASELINE_COUNT, BASELINE_POINTS, BASELINE_DATE, BASELINE_SPRS,
  type ClosureWave,
} from '@/lib/security/closure/closure-guidance';
import { getControlReference, type ControlReference } from '@/lib/security/reference/cmmc-l2-reference';
import { STANDING_RECORD } from '@/lib/security/closure/closure-statements';

export const dynamic = 'force-dynamic';

/**
 * BFF: live CMMC closure board.
 *
 * Reads implementation state from MAS and joins it against the verified DoD
 * Assessment Methodology v1.2.1 Annex A weights. Every number below — points,
 * SPRS projection, the three 32 CFR §170.21 gates — is derived here at request
 * time. Nothing is cached from a prior sync, so a control transitioned in MAS is
 * reflected on the next load with no code change.
 *
 * Read-only by design. MAS is the system of record; this route never writes.
 */

type MasControl = {
  control_id: string;
  framework?: string;
  title?: string;
  implementation_state?: string;
  evidence_uri?: string | null;
};

/** Requirements whose objectives are satisfied only by a dated, performed review. */
const OPERATING_HISTORY = new Set(['AU.L2-3.3.3', 'AU.L2-3.3.4']);

/**
 * Deduction a requirement costs while it is not Met.
 *
 * `weightMax` is null only for CA.L2-3.12.4 (the SSP), whose weight is the
 * non-numeric "NA" — blocking rather than scored. Treating that as 0 would
 * understate the gap, so it is surfaced separately as a blocker instead of
 * being silently folded into the arithmetic.
 */
function deductionOf(ref: ControlReference | null, fallback: number): number {
  if (!ref) return fallback;
  if (ref.isNa) return 0; // blocking, not scored — reported via `blockers`
  return ref.weightMax ?? fallback;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const base = (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
  if (!base) {
    return NextResponse.json(
      { state: 'unavailable', reason: 'MAS_API_URL is not configured', collected_at: new Date().toISOString() },
      { status: 503 },
    );
  }

  const key = process.env.MYCA_POSTURE_API_KEY || process.env.MAS_API_KEY || process.env.MAS_INTERNAL_API_KEY || '';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key) headers['X-API-Key'] = key;

  let rows: MasControl[] = [];
  try {
    const res = await fetch(`${base}/api/compliance/controls`, {
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { state: 'unavailable', reason: `MAS returned HTTP ${res.status}`, collected_at: new Date().toISOString() },
        { status: 503 },
      );
    }
    const json = await res.json();
    rows = Array.isArray(json) ? json : (json?.controls ?? []);
  } catch {
    return NextResponse.json(
      { state: 'unavailable', reason: 'MAS unreachable', collected_at: new Date().toISOString() },
      { status: 503 },
    );
  }

  if (!rows.length) {
    // An empty array must never render as a green zero.
    return NextResponse.json(
      { state: 'unavailable', reason: 'MAS returned no control rows', collected_at: new Date().toISOString() },
      { status: 503 },
    );
  }

  const cmmc = new Map<string, MasControl>();
  const nist = new Map<string, MasControl>();
  for (const r of rows) {
    if (r.framework === 'CMMC_L2') cmmc.set(r.control_id, r);
    else if (r.framework === 'NIST_800_171') nist.set(r.control_id, r);
  }

  // ---- whole-programme posture, straight from MAS ----------------------------
  const all = [...cmmc.values()];
  const met = all.filter((r) => r.implementation_state === 'implemented').length;
  const partial = all.filter((r) => r.implementation_state === 'partial').length;
  const notApplicable = all.filter((r) => r.implementation_state === 'not_applicable').length;
  const nonCompliant = all.filter((r) => r.implementation_state === 'non_compliant').length;

  // twin divergence: a defect that has recurred, so it is checked every load
  const twinMismatches: string[] = [];
  for (const [id, row] of cmmc) {
    const bare = id.includes('-') ? id.slice(id.indexOf('-') + 1) : id;
    const twin = nist.get(bare);
    if (twin && twin.implementation_state !== row.implementation_state) twinMismatches.push(id);
  }

  // ---- SPRS: 110 minus the full Annex A weight of every Partial --------------
  // Partial deducts the FULL weight. There is no partial credit under the DoD
  // Assessment Methodology v1.2.1, so an in-progress requirement scores as Not Met.
  const openAll = all.filter((r) => r.implementation_state === 'partial');
  const deduction = openAll.reduce(
    (a, r) => a + deductionOf(getControlReference(r.control_id), 0), 0,
  );
  const sprs = 110 - deduction;

  // CA.L2-3.12.4 (SSP) is non-numeric and blocking: it cannot be scored away.
  const blockers = openAll
    .filter((r) => getControlReference(r.control_id)?.isNa)
    .map((r) => r.control_id);

  // ---- the baseline 57, joined to live state --------------------------------
  const items = CLOSURE_BASELINE.map((g) => {
    const live = cmmc.get(g.id);
    const state = live?.implementation_state ?? 'unknown';
    const closed = state === 'implemented' || state === 'not_applicable';
    const ref = getControlReference(g.id);
    return {
      ...g,
      weight: deductionOf(ref, g.weight),
      // `poamEligible` is the authoritative boolean: it already encodes BOTH the six
      // weight-1 controls excluded regardless of weight (§170.21(a)(2)(iii)) AND the
      // single 5-point FIPS carve-out, SC.L2-3.13.11, which IS eligible by explicit
      // exception under §170.21(a)(2)(ii). Deriving eligibility from weight alone, or
      // from the display category, gets that control backwards.
      poamEligible: ref ? ref.poamEligible : g.poamEligible,
      poamEligibility: ref?.poamEligibility ?? (g.poamEligible ? 'yes' : 'no'),
      blocking: Boolean(ref?.isNa),
      state,
      closed,
      evidenceUri: live?.evidence_uri ?? null,
      operatingHistory: OPERATING_HISTORY.has(g.id),
    };
  });

  const closed = items.filter((i) => i.closed);
  const open = items.filter((i) => !i.closed);
  const sum = (xs: { weight: number }[]) => xs.reduce((a, x) => a + x.weight, 0);

  const openHistory = open.filter((i) => i.operatingHistory);
  const openReachable = open.filter((i) => !i.operatingHistory);
  const openIneligible = open.filter((i) => !i.poamEligible);

  // ---- §170.21 gates, tested against "all reachable items closed" ------------
  const residual = openHistory; // what would still be Partial in that scenario
  const residualDeduction = sum(residual);
  const projectedSprs = 110 - residualDeduction;
  const residualIneligible = residual.filter((i) => !i.poamEligible);

  const gates = {
    rule: '32 CFR §170.21 requires all three simultaneously: SPRS ≥ 88, ≤ 22 open items, and only 1-point-weighted requirements on the POA&M.',
    scenario: 'every reachable item closed; operating-history items remain',
    score: { value: projectedSprs, threshold: 88, pass: projectedSprs >= 88 },
    openCount: { value: residual.length, limit: 22, pass: residual.length <= 22 },
    poamWeights: {
      ineligibleRemaining: residualIneligible.map((i) => i.id),
      points: sum(residualIneligible),
      pass: residualIneligible.length === 0,
      detail:
        'Requirements weighted above 1 point cannot sit on a POA&M. Any listed here must be Met before a Conditional filing.',
    },
  };

  // ---- standing record: verify every written claim against live MAS ---------
  // A statement that is no longer supported is FLAGGED, never quietly shown as
  // current. This is what keeps the narrative from going stale on the page.
  const statements = STANDING_RECORD.map((s) => {
    const checks = s.expects.map((e) => {
      if (e.kind === 'twins-clean') {
        return {
          label: 'Twin rows reconciled (CMMC_L2 = NIST_800_171)',
          holds: twinMismatches.length === 0,
          observed: twinMismatches.length === 0 ? '0 mismatches' : `${twinMismatches.length} mismatch(es)`,
          expected: '0 mismatches',
          because: e.because,
        };
      }
      const observed = cmmc.get(e.id)?.implementation_state ?? 'unknown';
      return {
        label: e.id,
        holds: e.anyOf.includes(observed),
        observed,
        expected: e.anyOf.join(' or '),
        because: e.because,
      };
    });
    const broken = checks.filter((c) => !c.holds);
    return {
      id: s.id, title: s.title, kind: s.kind, owner: s.owner ?? null, body: s.body,
      verified: broken.length === 0,
      checks,
      broken,
      // Standing facts carry no conditions and cannot go stale.
      unconditional: s.expects.length === 0,
    };
  });

  const waves = ([1, 2, 3, 4, 5] as ClosureWave[]).map((w) => {
    const inWave = items.filter((i) => i.wave === w);
    const c = inWave.filter((i) => i.closed);
    const o = inWave.filter((i) => !i.closed);
    return {
      wave: w,
      ...CLOSURE_WAVES[w],
      total: inWave.length,
      closed: c.length,
      closedPoints: sum(c),
      open: o.length,
      openPoints: sum(o),
      poamIneligibleOpen: o.filter((i) => i.poamEligible === false).length,
      complete: o.length === 0,
    };
  });

  return NextResponse.json({
    state: 'ok',
    collected_at: new Date().toISOString(),
    source: `${base}/api/compliance/controls`,
    entity: 'Mycosoft, LLC · CAGE 9KR60 · UEI YK3ARVKJ77S9',
    claim:
      'Pursuing CMMC Level 2 Self-Assessment. Not certified. MAS is the system of record; this board is read-only and derives every figure from it at request time.',

    posture: {
      met, partial, notApplicable, nonCompliant,
      total: all.length,
      metPercent: all.length ? Math.round((met / all.length) * 1000) / 10 : 0,
      twinMismatches,
      twinsClean: twinMismatches.length === 0,
    },

    sprs: {
      projected: sprs,
      deduction,
      method:
        '110 minus the verified DoD Assessment Methodology v1.2.1 Annex A weight of every Partial requirement. Partial deducts full weight; there is no partial credit.',
      provenance:
        'Calculated by this route from live MAS state. MAS exposes no SPRS total. NOT an official score — do not file against it without a reconciled calculation.',
      thresholdNote:
        'The §170.21 threshold of 88 is a weighted score, not a count of Met requirements.',
    },

    baseline: {
      date: BASELINE_DATE,
      count: BASELINE_COUNT,
      points: BASELINE_POINTS,
      sprs: BASELINE_SPRS,
      closedCount: closed.length,
      pointsRecovered: sum(closed),
    },

    remaining: {
      count: open.length,
      points: sum(open),
      poamIneligible: { count: openIneligible.length, points: sum(openIneligible), ids: openIneligible.map((i) => i.id) },
      operatingHistory: { count: openHistory.length, points: sum(openHistory), ids: openHistory.map((i) => i.id) },
      reachable: { count: openReachable.length, points: sum(openReachable) },
    },

    blockers: {
      ids: blockers,
      detail:
        'Non-numeric, blocking requirements (CA.L2-3.12.4, the SSP). They carry no point weight, so closing them does not move SPRS — but they cannot be scored away or placed on a POA&M either.',
    },

    gates,
    waves,
    items,
    statements,
    statementsFlagged: statements.filter((s) => !s.verified).map((s) => s.id),
  });
}
