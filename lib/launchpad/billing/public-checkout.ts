/**
 * Public (anonymous) Launchpad checkout helpers.
 *
 * Trust model differs from tenant checkout: no requireTenant(), no client
 * price IDs or amounts. Lookup keys are whitelisted against CATALOG.
 * Claim identity is the verified Supabase auth email — never a request body.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CATALOG,
  getProduct,
  type CatalogProduct,
  type ProductKind,
} from '@/lib/launchpad/catalog';
import { EMAIL_RE } from '@/lib/launchpad/validate';
import { isLaunchpadPublicCheckoutEnabled } from '@/lib/launchpad/flags';

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

export interface PendingPurchaseRow {
  stripe_session_id: string;
  stripe_customer_id: string | null;
  email: string;
  lookup_key: string;
  plan_key: string | null;
  billing: string;
  kind: string;
  company: string | null;
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
      status: 'paid',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_session_id' },
  );
}
