import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { WORKBOOK_STEPS } from '@/lib/launchpad/workbook/steps';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_workbook_progress')
    .select('step_id, completed_at')
    .eq('tenant_id', ctx.tenantId);
  if (error) return jsonError(500, 'load_failed', 'Could not load workbook progress');
  const done = new Set((data ?? []).map((r) => r.step_id));
  return NextResponse.json({
    steps: WORKBOOK_STEPS.map((s) => ({ ...s, completed: done.has(s.id) })),
    completedCount: done.size,
    total: WORKBOOK_STEPS.length,
    note: 'Lego-step walkthrough of the product. Completing a step is not a compliance claim.',
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ stepId?: string; complete?: boolean }>(request);
  if (parsed.ok === false) return parsed.response;
  const stepId = typeof parsed.body.stepId === 'string' ? parsed.body.stepId : '';
  if (!WORKBOOK_STEPS.some((s) => s.id === stepId)) {
    return jsonError(400, 'validation_error', 'Unknown workbook step');
  }
  if (parsed.body.complete === false) {
    await ctx.supabase
      .from('launchpad_workbook_progress')
      .delete()
      .eq('tenant_id', ctx.tenantId)
      .eq('step_id', stepId);
    return NextResponse.json({ ok: true, stepId, completed: false });
  }
  const { error } = await ctx.supabase.from('launchpad_workbook_progress').upsert({
    tenant_id: ctx.tenantId,
    step_id: stepId,
    completed_by: ctx.user.id,
    completed_at: new Date().toISOString(),
  });
  if (error) return jsonError(500, 'save_failed', 'Could not save workbook progress');
  return NextResponse.json({ ok: true, stepId, completed: true });
}
