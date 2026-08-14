/**
 * Provision a paid public-checkout purchase: auth user + tenant + entitlements.
 * Called from the verified Stripe webhook and from /billing/activate.
 * Identity is Stripe session email — never a request-body email.
 *
 * Paying does not prove inbox ownership. Callers MUST gate auto-login on
 * `userWasCreated === true` (see shouldAutoLoginAfterPurchase).
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
  /** True only when this purchase created the auth user. Never infer from email match. */
  userWasCreated?: boolean;
  granted?: Record<string, unknown>;
  error?: string;
  code?: string;
}

export interface EnsuredUser {
  id: string;
  created: boolean;
}

const LIST_PAGE_SIZE = 200;
const LIST_PAGE_CAP = 1000;

type AuthAdminWithEmailLookup = {
  getUserByEmail?: (email: string) => Promise<{
    data: { user?: { id: string } | null } | null;
    error: { message?: string } | null;
  }>;
  listUsers: (params: { page: number; perPage: number }) => Promise<{
    data: { users?: Array<{ id: string; email?: string | null }> };
    error: { message?: string } | null;
  }>;
  createUser: (attrs: {
    email: string;
    email_confirm: boolean;
    user_metadata: Record<string, unknown>;
  }) => Promise<{
    data: { user?: { id: string } | null };
    error: { message?: string } | null;
  }>;
};

function authAdmin(svc: SupabaseClient): AuthAdminWithEmailLookup {
  return svc.auth.admin as unknown as AuthAdminWithEmailLookup;
}

/** Auto-login is allowed only when this purchase created the auth user. */
export function shouldAutoLoginAfterPurchase(
  result: Pick<ProvisionResult, 'userWasCreated'>,
): boolean {
  return result.userWasCreated === true;
}

/**
 * Find an auth user by email. Uses getUserByEmail when the client exposes it;
 * otherwise pages the Admin list until found or exhausted. Never stops at 200.
 */
export async function findUserIdByEmail(
  svc: SupabaseClient,
  email: string,
): Promise<string | null> {
  const admin = authAdmin(svc);
  if (typeof admin.getUserByEmail === 'function') {
    const { data, error } = await admin.getUserByEmail(email);
    if (!error && data?.user?.id) return data.user.id;
  }

  for (let page = 1; page <= LIST_PAGE_CAP; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: LIST_PAGE_SIZE });
    if (error) return null;
    const users = data.users ?? [];
    const match = users.find((u) => normalizeCheckoutEmail(u.email ?? '') === email);
    if (match) return match.id;
    if (users.length < LIST_PAGE_SIZE) return null;
  }
  return null;
}

export async function ensureUser(
  svc: SupabaseClient,
  email: string,
  name: string,
): Promise<EnsuredUser> {
  const existing = await findUserIdByEmail(svc, email);
  if (existing) return { id: existing, created: false };

  const { data, error } = await authAdmin(svc).createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: name || undefined,
      lp_source: 'public_checkout_provision',
    },
  });
  if (!error && data.user?.id) {
    return { id: data.user.id, created: true };
  }

  const again = await findUserIdByEmail(svc, email);
  if (again) {
    return { id: again, created: await createdByThisCheckoutFlow(svc, again) };
  }
  throw new Error(error?.message || 'could not create auth user');
}

/** True when webhook/activate raced createUser for this same new checkout. */
async function createdByThisCheckoutFlow(svc: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await svc.auth.admin.getUserById(userId);
  const source = (data.user?.user_metadata as { lp_source?: unknown } | undefined)?.lp_source;
  if (source !== 'public_checkout_provision') return false;
  const createdAt = data.user?.created_at ? Date.parse(data.user.created_at) : 0;
  return createdAt > 0 && Date.now() - createdAt < 15 * 60 * 1000;
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
    .select('status, claimed_tenant_id, provisioned_user_id, company, contact_name, user_was_created')
    .eq('stripe_session_id', input.stripeSessionId)
    .maybeSingle();

  const companyName = (input.company || pending?.company || 'Launchpad workspace').trim().slice(0, 120);
  const contactName = (input.contactName || pending?.contact_name || '').trim();

  const ensured = await ensureUser(svc, email, contactName);
  const userWasCreated = ensured.created || pending?.user_was_created === true;
  const userId = ensured.id;

  if (pending?.status === 'claimed' && pending.claimed_tenant_id) {
    if (ensured.created) {
      await svc
        .from('launchpad_pending_purchases')
        .update({ user_was_created: true, updated_at: new Date().toISOString() })
        .eq('stripe_session_id', input.stripeSessionId);
    }
    return {
      ok: true,
      alreadyClaimed: true,
      tenantId: pending.claimed_tenant_id,
      userId: pending.provisioned_user_id ?? userId,
      email,
      userWasCreated,
    };
  }

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
  const claimedPatch: Record<string, unknown> = {
    status: 'claimed',
    claimed_at: now,
    claimed_tenant_id: tenantId,
    provisioned_user_id: userId,
    updated_at: now,
  };
  if (ensured.created) claimedPatch.user_was_created = true;
  await svc.from('launchpad_pending_purchases').update(claimedPatch).eq('stripe_session_id', input.stripeSessionId);

  return { ok: true, userId, tenantId, email, granted, userWasCreated };
}
