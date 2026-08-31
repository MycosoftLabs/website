import { NextRequest, NextResponse } from 'next/server';
import { getProduct } from '@/lib/launchpad/catalog';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import {
  launchpadOperatorServiceClient,
  requireLaunchpadOperator,
} from '@/lib/launchpad/operator';

export const dynamic = 'force-dynamic';

/**
 * Cancels the tenant plan subscription row. Does not delete workspace data.
 */
export async function POST(request: NextRequest) {
  const gate = await requireLaunchpadOperator();
  if (gate.error) return gate.error;

  let body: { tenantId?: unknown; lookupKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
  const lookupKey = typeof body.lookupKey === 'string' ? body.lookupKey.trim() : '';
  const product = getProduct(lookupKey);
  if (!tenantId || !product?.planKey) {
    return NextResponse.json(
      { error: 'tenantId and a plan lookupKey are required' },
      { status: 400 },
    );
  }

  const svc = launchpadOperatorServiceClient();
  const { data: updated, error } = await svc
    .from('launchpad_subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('plan_key', product.planKey)
    .select('tenant_id, plan_key, status')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message, code: 'revoke_failed' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'No matching active plan row', code: 'not_found' }, { status: 404 });
  }

  await appendAuditEvent(svc, tenantId, gate.user.id, {
    action: 'operator.entitlement.revoked',
    entity: 'launchpad_subscriptions',
    entityId: tenantId,
    actorType: 'user',
    payload: { lookupKey: product.lookupKey, planKey: product.planKey, operator: gate.email },
  });

  return NextResponse.json({ ok: true, revoked: updated });
}
