import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';
import { fourIndependentMeasurements } from '@/lib/launchpad/scoring/indicators';
import type { AssessmentState } from '@/lib/launchpad/scoring/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const [
    statesRes,
    evidenceRes,
  ] = await Promise.all([
    ctx.supabase.from('launchpad_control_states').select('control_id, state').eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('launchpad_evidence_index').select('control_ids').eq('tenant_id', ctx.tenantId),
  ]);
  if (statesRes.error || evidenceRes.error) {
    return jsonError(503, 'indicators_unavailable', 'Could not load one or more register queries', {
      states: statesRes.error ? 'unavailable' : 'ok',
      evidence: evidenceRes.error ? 'unavailable' : 'ok',
    });
  }
  const states = statesRes.data;
  const evidence = evidenceRes.data;
  const map: Record<string, AssessmentState> = {};
  for (const row of states ?? []) map[row.control_id] = row.state as AssessmentState;
  const covered: string[] = [];
  for (const e of evidence ?? []) for (const id of e.control_ids ?? []) covered.push(id);
  const measurements = fourIndependentMeasurements(map, covered);
  return NextResponse.json({
    measurements,
    empty: Object.keys(map).length === 0,
    note: measurements.independenceNote,
  });
}
