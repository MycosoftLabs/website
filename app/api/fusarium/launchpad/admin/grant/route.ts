import { NextRequest, NextResponse } from 'next/server';
import { getProduct } from '@/lib/launchpad/catalog';
import { grantCatalogProductToTenant } from '@/lib/launchpad/billing/grants';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import {
  launchpadOperatorServiceClient,
  requireLaunchpadOperator,
} from '@/lib/launchpad/operator';

export const dynamic = 'force-dynamic';

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
  if (!tenantId || !product) {
    return NextResponse.json({ error: 'tenantId and a catalog lookupKey are required' }, { status: 400 });
  }

  const svc = launchpadOperatorServiceClient();
  const { data: tenant } = await svc.from('launchpad_tenants').select('id').eq('id', tenantId).maybeSingle();
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found', code: 'tenant_not_found' }, { status: 404 });
  }

  const granted = await grantCatalogProductToTenant(svc, {
    tenantId,
    product,
    lookupKey: product.lookupKey,
    eventId: `operator-grant:${gate.user.id}:${Date.now()}`,
    customerId: null,
    subscriptionId: null,
  });

  await appendAuditEvent(svc, tenantId, gate.user.id, {
    action: 'operator.entitlement.granted',
    entity: 'launchpad_subscriptions',
    entityId: tenantId,
    actorType: 'user',
    payload: { lookupKey: product.lookupKey, operator: gate.email },
  });

  return NextResponse.json({ ok: true, granted });
}
