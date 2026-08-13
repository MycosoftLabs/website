/**
 * Load server-derived entitlements for the current tenant (session client).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveEntitlements, type DerivedEntitlements, type SubscriptionRow } from '@/lib/launchpad/entitlements';

export async function loadDerivedEntitlements(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<DerivedEntitlements> {
  const { data } = await supabase
    .from('launchpad_subscriptions')
    .select('plan_key, status, current_period_end, grace_until, founding_pass_expires_at')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return deriveEntitlements((data as SubscriptionRow | null) ?? null);
}

export async function creditBalance(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { data } = await supabase.from('launchpad_credit_ledger').select('delta').eq('tenant_id', tenantId);
  return (data ?? []).reduce((sum, row) => sum + (row.delta as number), 0);
}
