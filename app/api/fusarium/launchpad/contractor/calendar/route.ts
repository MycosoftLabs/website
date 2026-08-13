import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const [regs, poam, training, tasks, extra] =
    await Promise.all([
      ctx.supabase
        .from('launchpad_registration_records')
        .select('id, kind, label, status, renewal_at')
        .eq('tenant_id', ctx.tenantId)
        .not('renewal_at', 'is', null),
      ctx.supabase
        .from('launchpad_poam_items')
        .select('id, control_id, due_at, status')
        .eq('tenant_id', ctx.tenantId)
        .in('status', ['open', 'in_progress'])
        .not('due_at', 'is', null),
      ctx.supabase
        .from('launchpad_training_assignments')
        .select('id, course, expires_at')
        .eq('tenant_id', ctx.tenantId)
        .not('expires_at', 'is', null),
      ctx.supabase
        .from('launchpad_tasks')
        .select('id, title, due_at, status')
        .eq('tenant_id', ctx.tenantId)
        .not('due_at', 'is', null),
      ctx.supabase
        .from('launchpad_calendar_events')
        .select('id, source, title, due_at')
        .eq('tenant_id', ctx.tenantId),
    ]);

  const events = [
    ...(regs.data ?? []).map((r) => ({
      source: 'registration' as const,
      title: r.label || r.kind,
      dueAt: r.renewal_at,
      refId: r.id,
    })),
    ...(poam.data ?? []).map((r) => ({
      source: 'poam' as const,
      title: `POA&M ${r.control_id}`,
      dueAt: r.due_at,
      refId: r.id,
    })),
    ...(training.data ?? []).map((r) => ({
      source: 'training' as const,
      title: r.course,
      dueAt: r.expires_at,
      refId: r.id,
    })),
    ...(tasks.data ?? []).map((r) => ({
      source: 'task' as const,
      title: r.title,
      dueAt: r.due_at,
      refId: r.id,
    })),
    ...(extra.data ?? []).map((r) => ({
      source: r.source,
      title: r.title,
      dueAt: r.due_at,
      refId: r.id,
    })),
  ].sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));

  if (regs.error && poam.error) return jsonError(500, 'load_failed', 'Could not load calendar');
  return NextResponse.json({
    events,
    note:
      events.length === 0
        ? 'No renewal or due dates recorded yet. Calendar is assembled from real tenant rows, not mock deadlines.'
        : undefined,
  });
}
