/**
 * Public (anonymous) Launchpad checkout helpers.
 *
 * Trust model differs from tenant checkout: no requireTenant(), no client
 * price IDs or amounts. Lookup keys are whitelisted against CATALOG.
 * Claim identity is the verified Supabase auth email — never a request body.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  CATALOG,
  getProduct,
  type CatalogProduct,
  type ProductKind,
} from '@/lib/launchpad/catalog';
import { EMAIL_RE } from '@/lib/launchpad/validate';
import { isLaunchpadPublicCheckoutEnabled } from '@/lib/launchpad/flags';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';

export { isLaunchpadPublicCheckoutEnabled };

export const PUBLIC_CHECKOUT_KINDS: readonly ProductKind[] = [
  'plan',
  'pass',
  'credits',
  'advisory',
];

export const PUBLIC_CHECKOUT_LOOKUP_KEYS: readonly string[] = CATALOG.filter((p) =>
  PUBLIC_CHECKOUT_KINDS.includes(p.kind),
).map((p) => p.lookupKey);

const LOOKUP_SET = new Set(PUBLIC_CHECKOUT_LOOKUP_KEYS);

export function isPublicCheckoutLookupKey(lookupKey: string): boolean {
  return LOOKUP_SET.has(lookupKey);
}

export function publicCheckoutProduct(lookupKey: string): CatalogProduct | null {
  if (!isPublicCheckoutLookupKey(lookupKey)) return null;
  return getProduct(lookupKey);
}

export function stripeModeForProduct(product: CatalogProduct): 'subscription' | 'payment' {
  return product.kind === 'plan' ? 'subscription' : 'payment';
}

export function normalizeCheckoutEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase().slice(0, 320);
  if (!email || !EMAIL_RE.test(email)) return null;
  return email;
}

export function verifiedAuthEmail(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
} | null | undefined): string | null {
  if (!user?.email) return null;
  const confirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
  if (!confirmed) return null;
  return normalizeCheckoutEmail(user.email);
}

export function publicCheckoutDisabledResponse(): { error: string; code: string; status: number } {
  return {
    error: 'Online checkout is not open yet.',
    code: 'public_checkout_disabled',
    status: 503,
  };
}

export function assertPublicCheckoutEnabled(): boolean {
  return isLaunchpadPublicCheckoutEnabled();
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const RATE_HITS = new Map<string, number[]>();

export function publicCheckoutRateLimited(keys: string[]): boolean {
  const now = Date.now();
  if (RATE_HITS.size > 8_000) RATE_HITS.clear();
  for (const key of keys) {
    if (!key) continue;
    const hits = (RATE_HITS.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    hits.push(now);
    RATE_HITS.set(key, hits);
    if (hits.length > RATE_MAX) return true;
  }
  return false;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const shown = local.slice(0, 1);
  return `${shown}***@${domain}`;
}

const STRIPE_SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]+$/;

export function isStripeCheckoutSessionId(id: string): boolean {
  return STRIPE_SESSION_ID_RE.test(id) && id.length >= 20 && id.length <= 256;
}

export type PublicCheckoutNextStep = 'pay' | 'activate' | 'onboarding' | 'dashboard';

export interface PublicSessionLookup {
  paid: boolean;
  email: string | null;
  lookupKey: string | null;
  planName: string | null;
  claimed: boolean;
  kind: string | null;
  company: string | null;
  contactName: string | null;
  jobTitle: string | null;
  companySize: string | null;
  companyWebsite: string | null;
  applyReason: string | null;
  intendedUse: string | null;
  accessReady: boolean;
  nextStep: PublicCheckoutNextStep;
  activatePath: '/api/fusarium/launchpad/billing/activate';
}

/**
 * Read-only status for the post-pay welcome page.
 * Does not grant entitlements. Session id is a capability token from Stripe's
 * redirect; we never take email from the query string for matching.
 */
export async function lookupPublicCheckoutSession(
  sessionId: string,
): Promise<PublicSessionLookup | { error: string; code: string; status: number }> {
  if (!isStripeCheckoutSessionId(sessionId)) {
    return { error: 'Invalid checkout session', code: 'invalid_session', status: 400 };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { error: 'Billing is not configured in this environment', code: 'stripe_unconfigured', status: 503 };
  }

  const stripe = new Stripe(secretKey);

  let paid = false;
  let email: string | null = null;
  let lookupKey: string | null = null;
  let kind: string | null = null;
  let company: string | null = null;
  let contactName: string | null = null;
  let jobTitle: string | null = null;
  let companySize: string | null = null;
  let companyWebsite: string | null = null;
  let applyReason: string | null = null;
  let intendedUse: string | null = null;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    paid = session.payment_status === 'paid' || session.status === 'complete';
    email = normalizeCheckoutEmail(
      session.customer_details?.email || session.customer_email || '',
    );
    lookupKey = session.metadata?.lp_lookup_key ?? null;
    kind = session.metadata?.lp_kind ?? null;
    company = session.metadata?.lp_company ?? null;
    contactName = session.metadata?.lp_contact_name ?? null;
    if (session.metadata?.lp_source && session.metadata.lp_source !== 'public_pricing') {
      return { error: 'Not a Launchpad storefront session', code: 'not_storefront', status: 404 };
    }
  } catch {
    return { error: 'Checkout session not found', code: 'session_not_found', status: 404 };
  }

  const product = lookupKey ? getProduct(lookupKey) : null;
  const planName = product?.name ?? null;
  if (product && !kind) kind = product.kind;

  let claimed = false;
  try {
    const svc = createLaunchpadServiceClient();
    const { data: pending } = await svc
      .from('launchpad_pending_purchases')
      .select(
        'status, claimed_at, company, contact_name, job_title, company_size, company_website, apply_reason, intended_use',
      )
      .eq('stripe_session_id', sessionId)
      .maybeSingle();
    claimed = pending?.status === 'claimed' || Boolean(pending?.claimed_at);
    if (!paid && pending?.status === 'paid') paid = true;
    if (!company && pending?.company) company = pending.company;
    contactName = pending?.contact_name ?? contactName;
    jobTitle = pending?.job_title ?? jobTitle;
    companySize = pending?.company_size ?? companySize;
    companyWebsite = pending?.company_website ?? companyWebsite;
    applyReason = pending?.apply_reason ?? applyReason;
    intendedUse = pending?.intended_use ?? intendedUse;
  } catch {
    // Table or service role missing: still return Stripe-backed paid/email.
  }

  const accessReady = paid && claimed;
  const nextStep: PublicCheckoutNextStep = !paid
    ? 'pay'
    : !claimed
      ? 'activate'
      : 'onboarding';

  return {
    paid,
    email,
    lookupKey,
    planName,
    claimed,
    kind,
    company,
    contactName,
    jobTitle,
    companySize,
    companyWebsite,
    applyReason,
    intendedUse,
    accessReady,
    nextStep,
    activatePath: '/api/fusarium/launchpad/billing/activate',
  };
}

export interface PendingPurchaseRow {
  stripe_session_id: string;
  stripe_customer_id: string | null;
  email: string;
  lookup_key: string;
  plan_key: string | null;
  billing: string;
  kind: string;
  company: string | null;
  contact_name?: string | null;
  job_title?: string | null;
  company_size?: string | null;
  company_website?: string | null;
  apply_reason?: string | null;
  intended_use?: string | null;
  status: 'checkout_created' | 'paid' | 'claimed';
  claimed_at?: string | null;
  claimed_tenant_id?: string | null;
}

export async function upsertGuestCheckoutSession(
  svc: SupabaseClient,
  row: Omit<PendingPurchaseRow, 'status'> & { status?: PendingPurchaseRow['status'] },
): Promise<void> {
  await svc.from('launchpad_pending_purchases').upsert(
    {
      stripe_session_id: row.stripe_session_id,
      stripe_customer_id: row.stripe_customer_id,
      email: row.email,
      lookup_key: row.lookup_key,
      plan_key: row.plan_key,
      billing: row.billing,
      kind: row.kind,
      company: row.company,
      contact_name: row.contact_name ?? null,
      job_title: row.job_title ?? null,
      company_size: row.company_size ?? null,
      company_website: row.company_website ?? null,
      apply_reason: row.apply_reason ?? null,
      intended_use: row.intended_use ?? null,
      status: row.status ?? 'checkout_created',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_session_id' },
  );
}

export async function markPendingPurchasePaid(
  svc: SupabaseClient,
  input: {
    stripeSessionId: string;
    stripeCustomerId: string | null;
    email: string;
    lookupKey: string;
    planKey: string | null;
    billing: string;
    kind: string;
    company: string | null;
    contactName?: string | null;
    jobTitle?: string | null;
    companySize?: string | null;
    companyWebsite?: string | null;
    applyReason?: string | null;
    intendedUse?: string | null;
  },
): Promise<void> {
  await svc.from('launchpad_pending_purchases').upsert(
    {
      stripe_session_id: input.stripeSessionId,
      stripe_customer_id: input.stripeCustomerId,
      email: input.email,
      lookup_key: input.lookupKey,
      plan_key: input.planKey,
      billing: input.billing,
      kind: input.kind,
      company: input.company,
      contact_name: input.contactName ?? null,
      job_title: input.jobTitle ?? null,
      company_size: input.companySize ?? null,
      company_website: input.companyWebsite ?? null,
      apply_reason: input.applyReason ?? null,
      intended_use: input.intendedUse ?? null,
      status: 'paid',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_session_id' },
  );
}
