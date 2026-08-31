import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { creditBalance, loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { featureGate } from '@/lib/launchpad/entitlements';

export const dynamic = 'force-dynamic';

/** FeatureGate source for Claude's UI. Locked features stay visible in nav. */
export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const balance = await creditBalance(ctx.supabase, ctx.tenantId);
  const gate = featureGate(derived);
  return NextResponse.json({
    ...derived,
    featureGate: gate,
    creditBalance: balance,
    byoAiKey: true,
    lockedVisible: true,
    note:
      'Entitlements are derived from launchpad_subscriptions + catalog.ts. Checkout grants nothing; the Stripe webhook does. Nav may show locked modules; writes still 403 entitlement_required until the plan includes them.',
  });
}
