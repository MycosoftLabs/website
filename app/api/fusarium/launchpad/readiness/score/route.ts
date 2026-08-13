import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import {
  computeScore,
  determineEligibility,
  poamDueDate,
  RULE_PACK_V1,
  type AssessmentState,
} from '@/lib/launchpad/scoring/engine';

/**
 * Weighted score estimates — computed ONLY on explicit customer request.
 *
 * GET  — latest snapshot + short history (never auto-computes; an empty
 *        history renders as "no snapshot yet", not a fabricated zero).
 * POST — compute a new snapshot from the tenant's recorded states using the
 *        active rule pack, persist it (insert-only table), open/refresh POA&M
 *        rows for eligible gaps, and audit the computation.
 *
 * The four indicators are stored side by side and never blended: an
 * implementation count is not a status (§2.2 of the master plan).
 */

export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const { data, error } = await ctx.supabase
    .from('launchpad_score_snapshots')
    .select('id, rule_pack_version, score, max_score, implemented_count, not_met_count, na_count, unassessed_count, eligibility, indicators, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: 'Could not load snapshots' }, { status: 500 });

  return NextResponse.json({ latest: data?.[0] ?? null, history: data ?? [] });
}

export async function POST(_request: NextRequest) {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  // 1. Load the tenant's recorded states (RLS-scoped).
  const { data: rows, error: sErr } = await ctx.supabase
    .from('launchpad_control_states')
    .select('control_id, state')
    .eq('tenant_id', ctx.tenantId);
  if (sErr) return NextResponse.json({ error: 'Could not load control states' }, { status: 500 });

  const states: Record<string, AssessmentState> = {};
  for (const r of rows ?? []) states[r.control_id] = r.state as AssessmentState;

  // 2. Deterministic computation. Unassessed controls score as Not-Met and are
  //    surfaced in the result — silence cannot inflate a score.
  const score = computeScore(states, RULE_PACK_V1);
  const eligibility = determineEligibility(score, RULE_PACK_V1);

  // 3. Evidence confidence — the fourth independent indicator: fraction of
  //    assessed controls with at least one evidence-index record.
  const { data: evidence } = await ctx.supabase
    .from('launchpad_evidence_index')
    .select('control_ids')
    .eq('tenant_id', ctx.tenantId);
  const covered = new Set<string>();
  for (const e of evidence ?? []) for (const id of e.control_ids ?? []) covered.add(id);
  const assessed = Object.keys(states).length;
  const evidenceConfidence = assessed > 0
    ? Math.round((Object.keys(states).filter((id) => covered.has(id)).length / assessed) * 100) / 100
    : 0;

  const indicators = {
    implementation_count: {
      value: score.implementedCount, total: score.maxScore,
      label: 'Requirements customer-marked implemented',
    },
    weighted_score_estimate: {
      value: score.score, max: score.maxScore, threshold: score.conditionalThreshold,
      label: 'Weighted score estimate (customer review required)',
    },
    conditional_eligibility_estimate: {
      value: eligibility.eligibility, reason: eligibility.reason,
      blocking_gaps: eligibility.blockingGaps, open_poam_items: eligibility.openPoamItems,
      label: 'Conditional eligibility estimate — not a certification or government determination',
    },
    evidence_confidence: {
      value: evidenceConfidence, covered: covered.size, assessed,
      label: 'Share of assessed requirements with indexed evidence',
    },
  };

  const inputsHash = createHash('sha256')
    .update(JSON.stringify(Object.entries(states).sort(([a], [b]) => a.localeCompare(b))))
    .digest('hex');

  // 4. Persist the snapshot (insert-only; rule pack version frozen).
  const { data: snap, error: iErr } = await ctx.supabase
    .from('launchpad_score_snapshots')
    .insert({
      tenant_id: ctx.tenantId,
      rule_pack_version: score.rulePackVersion,
      score: score.score,
      max_score: score.maxScore,
      implemented_count: score.implementedCount,
      not_met_count: score.notMetCount,
      na_count: score.notApplicableCount,
      unassessed_count: score.unassessedCount,
      eligibility: eligibility.eligibility,
      indicators,
      gaps: score.gaps,
      inputs_hash: inputsHash,
      created_by: ctx.user.id,
    })
    .select('id, created_at')
    .single();
  if (iErr || !snap) return NextResponse.json({ error: 'Could not persist snapshot' }, { status: 500 });

  // 5. Open POA&M rows for eligible gaps (180-day clock from first opening);
  //    close rows for controls no longer gapped.
  const now = new Date();
  const eligibleGapIds = score.gaps.filter((g) => g.poamEligible).map((g) => g.controlId);
  if (eligibleGapIds.length > 0) {
    const { data: existing } = await ctx.supabase
      .from('launchpad_poam_items')
      .select('control_id')
      .eq('tenant_id', ctx.tenantId)
      .in('control_id', eligibleGapIds);
    const have = new Set((existing ?? []).map((r) => r.control_id));
    const fresh = eligibleGapIds.filter((id) => !have.has(id));
    if (fresh.length > 0) {
      await ctx.supabase.from('launchpad_poam_items').insert(
        fresh.map((controlId) => ({
          tenant_id: ctx.tenantId,
          control_id: controlId,
          status: 'open',
          opened_at: now.toISOString(),
          due_at: poamDueDate(now, RULE_PACK_V1).toISOString(),
          updated_by: ctx.user.id,
        })),
      );
    }
  }
  const gapSet = new Set(score.gaps.map((g) => g.controlId));
  const { data: openItems } = await ctx.supabase
    .from('launchpad_poam_items')
    .select('control_id')
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['open', 'in_progress']);
  const toClose = (openItems ?? []).map((r) => r.control_id).filter((id) => !gapSet.has(id));
  if (toClose.length > 0) {
    await ctx.supabase
      .from('launchpad_poam_items')
      .update({ status: 'closed', closed_at: now.toISOString(), updated_by: ctx.user.id })
      .eq('tenant_id', ctx.tenantId)
      .in('control_id', toClose);
  }

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'score.snapshot.computed',
    entity: 'launchpad_score_snapshots',
    entityId: snap.id,
    payload: { score: score.score, eligibility: eligibility.eligibility, inputsHash },
  });

  return NextResponse.json({ ok: true, snapshotId: snap.id, indicators, gaps: score.gaps });
}
