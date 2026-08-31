import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACTIVE_TENANT_COOKIE } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import {
  launchpadOperatorServiceClient,
  requireLaunchpadOperator,
} from '@/lib/launchpad/operator';

export const dynamic = 'force-dynamic';

/**
 * Operator enters a named tenant. Upserts an admin membership only for the
 * requested tenant — never grants every tenant by default.
 */
export async function POST(request: NextRequest) {
  const gate = await requireLaunchpadOperator();
  if (gate.error) return gate.error;

  let body: { tenantId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }

  const svc = launchpadOperatorServiceClient();
  const { data: tenant } = await svc
    .from('launchpad_tenants')
    .select('id, name')
    .eq('id', tenantId)
    .maybeSingle();
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found', code: 'tenant_not_found' }, { status: 404 });
  }

  const { data: existing } = await svc
    .from('launchpad_memberships')
    .select('id, role, status')
    .eq('tenant_id', tenantId)
    .eq('user_id', gate.user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await svc.from('launchpad_memberships').insert({
      tenant_id: tenantId,
      user_id: gate.user.id,
      role: 'admin',
      status: 'active',
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message, code: 'membership_failed' }, { status: 500 });
    }
  } else if (existing.status !== 'active') {
    await svc
      .from('launchpad_memberships')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  }

  (await cookies()).set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  await appendAuditEvent(svc, tenantId, gate.user.id, {
    action: 'operator.tenant.switched',
    entity: 'launchpad_memberships',
    entityId: tenantId,
    actorType: 'user',
    payload: { operator: gate.email, tenantName: tenant.name },
  });

  return NextResponse.json({ ok: true, tenantId, name: tenant.name, dashboardPath: '/app/launchpad/dashboard' });
}
