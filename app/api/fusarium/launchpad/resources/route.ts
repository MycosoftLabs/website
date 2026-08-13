import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError, entitlementDenied } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';

/**
 * Resource Graph — global vendor cards (service-role seeded).
 * Empty array is honest until the migration seed is applied.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.resourceGraph) {
    return entitlementDenied('resourceGraph', derived.planKey, 'Resource Graph is not on this plan.');
  }
  const { data, error } = await ctx.supabase
    .from('launchpad_resource_cards')
    .select('id, vendor, offering, category, card, last_verified_at')
    .eq('active', true)
    .order('category');
  if (error) return jsonError(500, 'load_failed', 'Could not load resource cards');
  const cards = data ?? [];
  return NextResponse.json({
    cards,
    note:
      cards.length === 0
        ? 'No resource cards published yet. Apply migration 20260812210000. Listings are not certifications and do not imply government approval.'
        : 'Vendor names in plain text. No listing makes a company CMMC compliant. FTC compensation disclosure is on every card.',
  });
}
