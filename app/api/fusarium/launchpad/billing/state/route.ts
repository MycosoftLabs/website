import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { deriveEntitlements, type SubscriptionRow } from '@/lib/launchpad/entitlements';

/** GET — subscription + derived entitlements + credit balance for the tenant. */
export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const [{ data: sub }, { data: ledger }] = await Promise.all([
    ctx.supabase
      .from('launchpad_subscriptions')
      .select('plan_key, status, current_period_end, grace_until, founding_pass_expires_at')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle(),
    ctx.supabase
      .from('launchpad_credit_ledger')
      .select('delta')
      .eq('tenant_id', ctx.tenantId),
  ]);

  const derived = deriveEntitlements((sub as SubscriptionRow | null) ?? null);
  const creditBalance = (ledger ?? []).reduce((a, r) => a + (r.delta as number), 0);

  return NextResponse.json({
    subscription: sub ?? null,
    derived,
    creditBalance,
    note: 'Entitlements are derived server-side from the verified subscription state. The checkout redirect grants nothing; only the webhook does.',
  });
}
