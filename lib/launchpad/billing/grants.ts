/**
 * Server-side entitlement grants from a verified Stripe event.
 * Used by the Launchpad webhook (known tenant) and by claim (pending → tenant).
 * Never called from a client-trusted payload.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProduct, LAUNCH_PASS_DAYS, PLAN_ENTITLEMENTS, type CatalogProduct, type PlanKey } from '@/lib/launchpad/catalog';

export interface GrantInput {
  tenantId: string;
  product: CatalogProduct;
  lookupKey: string;
  eventId: string;
  customerId: string | null;
  subscriptionId: string | null;
}

export async function grantCatalogProductToTenant(
  svc: SupabaseClient,
  input: GrantInput,
): Promise<Record<string, unknown>> {
  const { tenantId, product, lookupKey, eventId, customerId, subscriptionId } = input;

  if (product.kind === 'pass') {
    const expires = new Date();
    expires.setUTCDate(expires.getUTCDate() + LAUNCH_PASS_DAYS);
    await svc.from('launchpad_subscriptions').upsert(
      {
        tenant_id: tenantId,
        stripe_customer_id: customerId,
        plan_key: 'launch_pass_30d',
        status: 'active',
        founding_pass_expires_at: expires.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    );
    await svc.from('launchpad_credit_ledger').insert({
      tenant_id: tenantId,
      delta: 100,
      reason: 'launch_pass_grant',
      ref: { event: eventId, lookupKey },
    });
    await svc
      .from('launchpad_tenants')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', tenantId);
    return { granted: 'launch_pass_30d', credits: 100 };
  }

  if (product.kind === 'credits' && product.creditQuantity) {
    await svc.from('launchpad_credit_ledger').insert({
      tenant_id: tenantId,
      delta: product.creditQuantity,
      reason: 'pack_purchase',
      ref: { event: eventId, lookupKey },
    });
    return { granted: 'credits', credits: product.creditQuantity };
  }

  if (product.kind === 'advisory' && product.advisoryMinutes) {
    await svc.from('launchpad_advisory_credits').insert({
      tenant_id: tenantId,
      sku: lookupKey,
      minutes: product.advisoryMinutes,
      status: 'unredeemed',
      stripe_event_id: eventId,
    });
    return { granted: 'advisory_credit', minutes: product.advisoryMinutes, sku: lookupKey };
  }

  if (product.kind === 'plan' && product.planKey) {
    await svc.from('launchpad_subscriptions').upsert(
      {
        tenant_id: tenantId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_key: product.planKey,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    );
    await svc
      .from('launchpad_tenants')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', tenantId);
    return { granted: 'plan', plan: product.planKey };
  }

  return { granted: false, note: `no grant path for kind=${product.kind}` };
}

export async function claimPaidPurchasesForVerifiedEmail(
  svc: SupabaseClient,
  input: { tenantId: string; verifiedEmail: string; eventIdPrefix?: string },
): Promise<{ claimed: number; outcomes: Record<string, unknown>[] }> {
  const { data: rows, error } = await svc
    .from('launchpad_pending_purchases')
    .select(
      'id, stripe_session_id, stripe_customer_id, email, lookup_key, plan_key, billing, kind, company, status',
    )
    .eq('email', input.verifiedEmail)
    .eq('status', 'paid')
    .is('claimed_at', null);
  if (error || !rows?.length) {
    return { claimed: 0, outcomes: [] };
  }

  const outcomes: Record<string, unknown>[] = [];
  const now = new Date().toISOString();
  for (const row of rows) {
    const product = getProduct(String(row.lookup_key ?? ''));
    if (!product) {
      outcomes.push({ session: row.stripe_session_id, error: 'unknown_lookup_key' });
      continue;
    }
    const grant = await grantCatalogProductToTenant(svc, {
      tenantId: input.tenantId,
      product,
      lookupKey: product.lookupKey,
      eventId: `${input.eventIdPrefix ?? 'claim'}:${row.stripe_session_id}`,
      customerId: row.stripe_customer_id ?? null,
      subscriptionId: null,
    });
    const { data: updated } = await svc
      .from('launchpad_pending_purchases')
      .update({
        status: 'claimed',
        claimed_at: now,
        claimed_tenant_id: input.tenantId,
        updated_at: now,
      })
      .eq('id', row.id)
      .eq('status', 'paid')
      .is('claimed_at', null)
      .select('id')
      .maybeSingle();
    if (!updated) {
      outcomes.push({ session: row.stripe_session_id, skipped: 'already_claimed' });
      continue;
    }
    outcomes.push({ session: row.stripe_session_id, ...grant });
  }
  return { claimed: outcomes.filter((o) => !o.skipped && !o.error).length, outcomes };
}

export function monthlyCreditsForPlanKey(planKey: string | null): number | null {
  if (!planKey) return null;
  if (planKey === 'launch_pass_30d') return null;
  const ent = PLAN_ENTITLEMENTS[planKey as PlanKey];
  if (!ent) return null;
  return ent.aiCreditsMonthly;
}
