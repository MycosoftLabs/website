/**
 * Provision a paid public-checkout purchase: auth user + tenant + entitlements.
 * Called from the verified Stripe webhook and from /billing/activate.
 * Identity is Stripe session email — never a request-body email.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProduct } from '@/lib/launchpad/catalog';
import { grantCatalogProductToTenant } from '@/lib/launchpad/billing/grants';
import { normalizeCheckoutEmail } from '@/lib/launchpad/billing/public-checkout';

export interface ProvisionResult {
  ok: boolean;
  alreadyClaimed?: boolean;
  userId?: string;
  tenantId?: string;
  email?: string;
  granted?: Record<string, unknown>;
  error?: string;
  code?: string;
}

async function findUserIdByEmail(svc: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return null;
  const match = (data.users ?? []).find((u) => normalizeCheckoutEmail(u.email ?? '') === email);
  return match?.id ?? null;
}

async function ensureUser(svc: SupabaseClient, email: string, name: string): Promise<string> {
  const existing = await findUserIdByEmail(svc, email);
  if (existing) return existing;

  const { data, error } = await svc.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: name || undefined,
      lp_source: 'public_checkout_provision',
    },
  });
  if (error || !data.user) {
    const again = await findUserIdByEmail(svc, email);
    if (again) return again;
    throw new Error(error?.message || 'could not create auth user');
  }
  return data.user.id;
}

export async function provisionPaidPublicPurchase(
  svc: SupabaseClient,
  input: {
    stripeSessionId: string;
    eventId: string;
    email: string;
    lookupKey: string;
    company: string | null;
    contactName: string | null;
    customerId: string | null;
    subscriptionId: string | null;
  },
): Promise<ProvisionResult> {
  const email = normalizeCheckoutEmail(input.email);
  if (!email) {
    return { ok: false, error: 'Stripe session has no email', code: 'email_missing' };
  }
  const product = getProduct(input.lookupKey);
  if (!product) {
    return { ok: false, error: 'Unknown product', code: 'unknown_product' };
  }

  const { data: pending } = await svc
    .from('launchpad_pending_purchases')
    .select('status, claimed_tenant_id, provisioned_user_id, company, contact_name')
    .eq('stripe_session_id', input.stripeSessionId)
    .maybeSingle();

  if (pending?.status === 'claimed' && pending.claimed_tenant_id) {
    return {
      ok: true,
      alreadyClaimed: true,
      tenantId: pending.claimed_tenant_id,
      userId: pending.provisioned_user_id ?? undefined,
      email,
    };
  }

  const companyName = (input.company || pending?.company || 'Launchpad workspace').trim().slice(0, 120);
  const contactName = (input.contactName || pending?.contact_name || '').trim();

  const userId = await ensureUser(svc, email, contactName);

  const { data: membership } = await svc
    .from('launchpad_memberships')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let tenantId = membership?.tenant_id as string | undefined;
  if (!tenantId) {
    const { data: created, error: rpcError } = await svc.rpc('launchpad_create_tenant_for_user', {
      p_user_id: userId,
      p_name: companyName.length >= 2 ? companyName : 'Launchpad workspace',
    });
    if (rpcError || !created) {
      return {
        ok: false,
        error: rpcError?.message || 'Could not create workspace',
        code: 'tenant_create_failed',
      };
    }
    tenantId = created as string;
  }

  const granted = await grantCatalogProductToTenant(svc, {
    tenantId,
    product,
    lookupKey: product.lookupKey,
    eventId: input.eventId,
    customerId: input.customerId,
    subscriptionId: input.subscriptionId,
  });

  const now = new Date().toISOString();
  await svc
    .from('launchpad_pending_purchases')
    .update({
      status: 'claimed',
      claimed_at: now,
      claimed_tenant_id: tenantId,
      provisioned_user_id: userId,
      updated_at: now,
    })
    .eq('stripe_session_id', input.stripeSessionId);

  return { ok: true, userId, tenantId, email, granted };
}
