import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

const WAVES = [
  { wave: 1, label: 'Foundation — identity, inventory, boundary' },
  { wave: 2, label: 'Access and authentication' },
  { wave: 3, label: 'Logging, incident, awareness' },
  { wave: 4, label: 'Configuration and integrity' },
  { wave: 5, label: 'Assessment artifacts and sustainment' },
];

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_closure_statements')
    .select('id, wave, statement_key, statement_text, valid, invalidated_at, invalidated_reason, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('wave');
  if (error) return jsonError(500, 'load_failed', 'Could not load closure board');
  const statements = data ?? [];
  return NextResponse.json({
    waves: WAVES,
    statements,
    note:
      statements.length === 0
        ? 'No closure statements yet. Statements are tenant-authored and self-invalidate when marked invalid. No Mycosoft-specific content is copied here.'
        : 'Invalidated statements remain for history; they are no longer standing records.',
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
  if (!parsed.ok) return parsed.response;
  if (parsed.body.invalidateId) {
    const { error } = await ctx.supabase
      .from('launchpad_closure_statements')
      .update({
        valid: false,
        invalidated_at: new Date().toISOString(),
        invalidated_reason: parsed.body.reason ?? 'customer_invalidated',
      })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', parsed.body.invalidateId);
    if (error) return jsonError(500, 'update_failed', 'Could not invalidate statement');
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'closure.invalidated',
      entity: 'launchpad_closure_statements',
      entityId: parsed.body.invalidateId,
    });
    return NextResponse.json({ ok: true, invalidated: true });
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
