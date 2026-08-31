import { NextResponse } from 'next/server';
import {
  launchpadOperatorServiceClient,
  requireLaunchpadOperator,
} from '@/lib/launchpad/operator';

export const dynamic = 'force-dynamic';

/**
 * Operator tenant rollup — commercial metadata only. No CUI.
 */
export async function GET() {
  const gate = await requireLaunchpadOperator();
  if (gate.error) return gate.error;
  const svc = launchpadOperatorServiceClient();

  const { data: tenants, error: tErr } = await svc
    .from('launchpad_tenants')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (tErr) {
    return NextResponse.json({ error: tErr.message, code: 'tenant_list_failed' }, { status: 500 });
  }

  const ids = (tenants ?? []).map((t) => t.id);
  const [{ data: memberships }, { data: subscriptions }] = await Promise.all([
    ids.length
      ? svc
          .from('launchpad_memberships')
          .select('tenant_id, user_id, role, status')
          .in('tenant_id', ids)
          .eq('status', 'active')
      : Promise.resolve({ data: [] as Array<{ tenant_id: string; user_id: string; role: string; status: string }> }),
    ids.length
      ? svc
          .from('launchpad_subscriptions')
          .select('tenant_id, plan_key, status, stripe_customer_id, stripe_subscription_id')
          .in('tenant_id', ids)
      : Promise.resolve({
          data: [] as Array<{
            tenant_id: string;
            plan_key: string | null;
            status: string;
            stripe_customer_id: string | null;
            stripe_subscription_id: string | null;
          }>,
        }),
  ]);

  const ownerIds = Array.from(
    new Set(
      (memberships ?? [])
        .filter((m) => m.role === 'owner')
        .map((m) => m.user_id),
    ),
  );
  const emails = new Map<string, string>();
  await Promise.all(
    ownerIds.slice(0, 200).map(async (userId) => {
      const { data } = await svc.auth.admin.getUserById(userId);
      const email = data.user?.email;
      if (email) emails.set(userId, email);
    }),
  );

  const rows = (tenants ?? []).map((tenant) => {
    const members = (memberships ?? []).filter((m) => m.tenant_id === tenant.id);
    const owner = members.find((m) => m.role === 'owner');
    const sub = (subscriptions ?? []).find((s) => s.tenant_id === tenant.id) ?? null;
    return {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      createdAt: tenant.created_at,
      memberCount: members.length,
      ownerEmail: owner ? emails.get(owner.user_id) ?? null : null,
      planKey: sub?.plan_key ?? null,
      subscriptionStatus: sub?.status ?? null,
      stripeCustomerId: sub?.stripe_customer_id ?? null,
      stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
    };
  });

  return NextResponse.json({ ok: true, tenants: rows });
}
