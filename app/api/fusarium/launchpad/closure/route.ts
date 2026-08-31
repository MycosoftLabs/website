import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capText, jsonError, readJson } from '@/lib/launchpad/http';
import { TENANT_CLOSURE_WAVES, tenantClosureBoard } from '@/lib/launchpad/closure/tenant-board';
import { fourIndependentMeasurements } from '@/lib/launchpad/scoring/indicators';
import type { AssessmentState } from '@/lib/launchpad/scoring/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const [{ data, error }, { data: states }, { data: evidence }] = await Promise.all([
    ctx.supabase
      .from('launchpad_closure_statements')
      .select('id, wave, statement_key, statement_text, valid, invalidated_at, invalidated_reason, created_at')
      .eq('tenant_id', ctx.tenantId)
      .order('wave'),
    ctx.supabase.from('launchpad_control_states').select('control_id, state').eq('tenant_id', ctx.tenantId),
    ctx.supabase.from('launchpad_evidence_index').select('control_ids').eq('tenant_id', ctx.tenantId),
  ]);
  if (error) return jsonError(500, 'load_failed', 'Could not load closure board');
  const map: Record<string, AssessmentState> = {};
  for (const row of states ?? []) map[row.control_id] = row.state as AssessmentState;
  const covered: string[] = [];
  for (const e of evidence ?? []) for (const id of e.control_ids ?? []) covered.push(id);
  const register = tenantClosureBoard(map);
  const openByWave = TENANT_CLOSURE_WAVES.map((w) => ({
    ...w,
    openCount: register.filter((r) => r.wave === w.wave && r.open).length,
  }));
  return NextResponse.json({
    waves: openByWave,
    statements: data ?? [],
    register: register.filter((r) => r.open),
    measurements: fourIndependentMeasurements(map, covered),
    source: 'tenant_control_register',
    note:
      'Closure Board is scored from this tenant’s control register — not Mycosoft MAS. No Mycosoft evidence hashes are copied here.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    wave?: number;
    statementKey?: string;
    statementText?: string;
    invalidateId?: string;
    reason?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  if (parsed.body.invalidateId) {
    const invalidateId =
      typeof parsed.body.invalidateId === 'string' ? parsed.body.invalidateId.trim() : '';
    const reason = capText(parsed.body.reason, 500);
    if (!invalidateId) return jsonError(400, 'validation_error', 'invalidateId required');
    if (!reason) {
      return jsonError(400, 'validation_error', 'reason is required to invalidate a closure statement');
    }
    const { data, error } = await ctx.supabase
      .from('launchpad_closure_statements')
      .update({
        valid: false,
        invalidated_at: new Date().toISOString(),
        invalidated_reason: reason,
      })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', invalidateId)
      .select('id')
      .maybeSingle();
    if (error) return jsonError(500, 'update_failed', 'Could not invalidate statement');
    if (!data) {
      return jsonError(
        404,
        'not_found',
        'Closure statement not found in this workspace. No audit event was written.',
      );
    }
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'closure.invalidated',
      entity: 'launchpad_closure_statements',
      entityId: data.id,
      payload: { reason },
    });
    return NextResponse.json({ ok: true, invalidated: true, id: data.id });
  }
  const wave = Number(parsed.body.wave);
  const statementKey = typeof parsed.body.statementKey === 'string' ? parsed.body.statementKey.trim().slice(0, 80) : '';
  const statementText = typeof parsed.body.statementText === 'string' ? parsed.body.statementText.trim().slice(0, 4000) : '';
  if (!Number.isInteger(wave) || wave < 1 || wave > 5 || !statementKey || !statementText) {
    return jsonError(400, 'validation_error', 'wave (1-5), statementKey, and statementText required');
  }
  const { data, error } = await ctx.supabase
    .from('launchpad_closure_statements')
    .insert({
      tenant_id: ctx.tenantId,
      wave,
      statement_key: statementKey,
      statement_text: statementText,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record statement');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'closure.recorded',
    entity: 'launchpad_closure_statements',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
