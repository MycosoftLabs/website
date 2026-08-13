import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { creditBalance, loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { type AssessmentState } from '@/lib/launchpad/scoring/engine';
import { fourIndependentMeasurements } from '@/lib/launchpad/scoring/indicators';
import { CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';

export const dynamic = 'force-dynamic';

function evidenceConfidence(rows: Array<{
  captured_at: string | null;
  recorded_by?: string | null;
  sha256: string | null;
  review_status: string;
  evidence_type: string;
}>): { score: number; factors: Record<string, number> } {
  if (rows.length === 0) return { score: 0, factors: { recency: 0, attribution: 0, coverage: 0, integrity: 0, reviewer: 0, consistency: 0 } };
  const now = Date.now();
  let recency = 0;
  let attribution = 0;
  let integrity = 0;
  let reviewer = 0;
  for (const r of rows) {
    if (r.captured_at) {
      const ageDays = (now - new Date(r.captured_at).getTime()) / 86400000;
      recency += ageDays < 90 ? 1 : ageDays < 365 ? 0.5 : 0.2;
    }
    if (r.recorded_by) attribution += 1;
    if (r.sha256) integrity += 1;
    if (r.review_status === 'reviewed') reviewer += 1;
  }
  const n = rows.length;
  const types = new Set(rows.map((r) => r.evidence_type)).size;
  const factors = {
    recency: recency / n,
    attribution: attribution / n,
    coverage: Math.min(1, types / 5),
    integrity: integrity / n,
    reviewer: reviewer / n,
    consistency: 0.5,
  };
  const score =
    0.2 * factors.recency +
    0.15 * factors.attribution +
    0.2 * factors.coverage +
    0.15 * factors.integrity +
    0.2 * factors.reviewer +
    0.1 * factors.consistency;
  return { score: Math.round(score * 100) / 100, factors };
}

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const balance = await creditBalance(ctx.supabase, ctx.tenantId);

  const [
    states,
    evidence,
    tasks,
    matches,
    proposals,
    registrations,
    agents,
    consents,
    bom,
  ] = await Promise.all([
    ctx.supabase.from('launchpad_control_states').select('control_id, state').eq('tenant_id', ctx.tenantId),
    ctx.supabase
      .from('launchpad_evidence_index')
      .select('control_ids, captured_at, sha256, review_status, evidence_type, recorded_by')
      .eq('tenant_id', ctx.tenantId),
    ctx.supabase
      .from('launchpad_tasks')
      .select('id, title, status, due_at')
      .eq('tenant_id', ctx.tenantId)
      .in('status', ['open', 'in_progress']),
    ctx.supabase.from('launchpad_opportunity_matches').select('id, status').eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('launchpad_proposal_workspaces').select('id, status').eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('launchpad_registration_records').select('id, kind, status, renewal_at').eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('launchpad_local_agents').select('id, status, last_seen_at').eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('launchpad_partner_consents').select('id, revoked_at').eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('launchpad_bom_parts').select('id, flags').eq('tenant_id', ctx.tenantId),
  ]);

  const stateMap: Record<string, AssessmentState> = {};
  for (const row of states.data ?? []) {
    stateMap[row.control_id] = row.state as AssessmentState;
  }
  const evidenceIds = (evidence.data ?? []).flatMap((row) => {
    const ids = row.control_ids;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  });
  const measurements = fourIndependentMeasurements(stateMap, evidenceIds);
  const confidence = evidenceConfidence(evidence.data ?? []);
  const originFlags = (bom.data ?? []).filter((p) => Array.isArray(p.flags) && (p.flags as unknown[]).length > 0).length;

  return NextResponse.json({
    measurements,
    indicators: {
      implementedCount: measurements.implementedCount.value,
      weightedScoreEstimate: measurements.weightedScore.value,
      maxScore: measurements.weightedScore.max,
      unassessedCount: CMMC_L2_CONTROLS.length - Object.keys(stateMap).length,
      evidenceConfidence: confidence.score,
      evidenceFactors: confidence.factors,
    },
    independenceNote: measurements.independenceNote,
    panels: {
      readiness: {
        implementedCount: measurements.implementedCount.value,
        catalogSize: CMMC_L2_CONTROLS.length,
        score: measurements.weightedScore.value,
      },
      eligibility: {
        value: measurements.poamEligibility.value,
        threshold: measurements.weightedScore.threshold,
        reason: measurements.poamEligibility.reason,
      },
      evidence: confidence,
      blockers: (tasks.data ?? []).slice(0, 8),
      deadlines: (tasks.data ?? []).filter((t) => t.due_at).slice(0, 8),
      opportunityMatches: { count: (matches.data ?? []).length },
      proposalPipeline: { count: (proposals.data ?? []).length },
      registrationStatus: registrations.data ?? [],
      originGraphAlerts: { flaggedLines: originFlags, lineCount: (bom.data ?? []).length },
      localAgent: {
        devices: (agents.data ?? []).length,
        note: 'Raw scanner telemetry stays on-prem. Cloud lists enrollment metadata only.',
      },
      regulatoryUpdates: { note: 'No mock regulatory feed. Empty until a real source is connected.' },
      partnerMesh: { consents: (consents.data ?? []).filter((c) => !c.revoked_at).length },
      credits: { balance, monthly: derived.entitlements?.aiCreditsMonthly ?? 0, byoAiKey: derived.entitlements?.byoAiKey ?? true },
    },
    empty:
      Object.keys(stateMap).length === 0 &&
      (evidence.data ?? []).length === 0 &&
      (tasks.data ?? []).length === 0,
  });
}
