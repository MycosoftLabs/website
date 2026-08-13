import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capText, EMAIL_RE, jsonError, readJson } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_role_assignments')
    .select('id, person_name, person_email, role_title, scope, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load roles');
  return NextResponse.json({
    roles: data ?? [],
    excluded: ['sf-86', 'ssn', 'investigation'],
    note:
      (data ?? []).length === 0
        ? 'No named roles yet. Record CISO / Authorized Official / etc. SF-86 is out of this product.'
        : undefined,
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    personName?: string;
    personEmail?: string;
    roleTitle?: string;
    scope?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const personName = capText(parsed.body.personName, 200);
  const roleTitle = capText(parsed.body.roleTitle, 200);
  if (!personName || !roleTitle) {
    return jsonError(400, 'validation_error', 'personName and roleTitle required');
  }
  const personEmail = capText(parsed.body.personEmail, 320);
  if (personEmail && !EMAIL_RE.test(personEmail)) {
    return jsonError(400, 'validation_error', 'personEmail must be a valid email');
  }
  const scope = capText(parsed.body.scope, 500) || null;
  const { data, error } = await ctx.supabase
    .from('launchpad_role_assignments')
    .insert({
      tenant_id: ctx.tenantId,
      person_name: personName,
      person_email: personEmail || null,
      role_title: roleTitle,
      scope,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record role');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'role.assigned',
    entity: 'launchpad_role_assignments',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
