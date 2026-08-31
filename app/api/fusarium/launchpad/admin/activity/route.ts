import { NextResponse } from 'next/server';
import {
  launchpadOperatorServiceClient,
  requireLaunchpadOperator,
} from '@/lib/launchpad/operator';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireLaunchpadOperator();
  if (gate.error) return gate.error;
  const svc = launchpadOperatorServiceClient();

  const [{ data: events }, { data: purchases }] = await Promise.all([
    svc
      .from('launchpad_audit_events')
      .select('tenant_id, actor_user_id, actor_type, action, entity, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    svc
      .from('launchpad_pending_purchases')
      .select('email, lookup_key, status, stripe_session_id, company, created_at, claimed_tenant_id')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    ok: true,
    events: events ?? [],
    purchases: purchases ?? [],
  });
}
