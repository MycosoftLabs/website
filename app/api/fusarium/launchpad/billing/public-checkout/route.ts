import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getProduct } from '@/lib/launchpad/catalog';

/**
 * PUBLIC Stripe checkout — the storefront path.
 *
 * The sibling route at ../checkout is for an EXISTING customer upgrading from
 * inside the workspace: it calls requireTenant(), so an anonymous visitor on
 * the pricing page can never reach it. That gap is why every plan CTA used to
 * dead-end in a lead form. This route is that missing piece and nothing more.
 *
 * SECURITY
 * - The caller sends a lookup_key, never a price id and never an amount. The
 *   key is whitelisted against lib/launchpad/catalog.ts and the price is
 *   resolved from Stripe at runtime, so a tampered request cannot invent a
 *   cheaper price or a product we do not sell.
 * - No tenant exists yet, so nothing here touches tenant data. The webhook
 *   records a pending purchase and the buyer claims it after signing up,
 *   matched on their VERIFIED auth email — never on a value from this body.
 * - Entitlements are granted only by the verified webhook. The redirect back
 *   from Stripe proves nothing and grants nothing.
 * - Its own switch, deliberately NOT LAUNCHPAD_ENABLED: sales can open while
 *   the authenticated workspace stays closed, and checkout can be killed
 *   without taking the app down.
 *
 * Card data never touches this server — Stripe's hosted page collects it.
 */

export const dynamic = 'force-dynamic';

/** Crude in-process throttle. This endpoint is unauthenticated and creates
 *  Stripe objects, so it is a scraping target. A real limiter (Upstash/KV)
 *  belongs here before high traffic; this stops casual abuse in the meantime. */
const RECENT = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (RECENT.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  RECENT.set(key, hits);
  if (RECENT.size > 5_000) RECENT.clear(); // bound memory
  return hits.length > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  if (process.env.LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED !== '1') {
    return NextResponse.json(
      {
        error: 'Online checkout is not open yet.',
        code: 'public_checkout_disabled',
      },
      { status: 503 },
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Billing is not configured in this environment', code: 'stripe_unconfigured' },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts — wait a minute and try again.', code: 'rate_limited' },
      { status: 429 },
    );
  }

  let body: {
    lookupKey?: unknown;
    email?: unknown;
    company?: unknown;
    name?: unknown;
    embedded?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist: unknown keys are rejected, and no price/amount is accepted.
  const product = getProduct(typeof body.lookupKey === 'string' ? body.lookupKey : '');
  if (!product) {
    return NextResponse.json({ error: 'Unknown product', code: 'unknown_product' }, { status: 400 });
  }

  // Email is OPTIONAL on purpose. Stripe's hosted page collects and verifies it
  // itself, so requiring it here would mean a form standing between "I want
  // this plan" and a card field — which is the exact dead end this route
  // exists to remove. If we already know it, prefill; otherwise Stripe asks.
  const rawEmail = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
  const email = rawEmail && EMAIL_RE.test(rawEmail) ? rawEmail : '';
  const company = typeof body.company === 'string' ? body.company.trim().slice(0, 200) : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
  // Embedded mode returns a client_secret to mount Stripe's payment widget
  // inside our own page (account fields above, card fields below, one submit).
  const embedded = body.embedded === true;

  const stripe = new Stripe(secretKey);

  const prices = await stripe.prices.list({ lookup_keys: [product.lookupKey], limit: 1 });
  const price = prices.data[0];
  if (!price) {
    return NextResponse.json(
      {
        error: `No Stripe price carries lookup_key "${product.lookupKey}" in this mode.`,
        code: 'price_not_provisioned',
      },
      { status: 503 },
    );
  }

  // Metadata carries billing identity ONLY — never readiness data, never CUI.
  const metadata: Record<string, string> = {
    lp_source: 'public_pricing',
    lp_lookup_key: product.lookupKey,
    lp_kind: product.kind,
    ...(product.planKey ? { lp_plan_key: product.planKey } : {}),
    ...(company ? { lp_company: company } : {}),
    ...(name ? { lp_contact_name: name } : {}),
  };

  const origin = request.nextUrl.origin;
  const isSubscription = product.billing !== 'one_time';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      // Every payment method enabled on the Stripe account appears here —
      // card, Apple Pay, Google Pay, Link, Cash App Pay, PayPal, bank debit.
      // Which ones show is a Dashboard setting, not a code change, so turning
      // one on never requires a deploy.
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata,
      ...(isSubscription ? { subscription_data: { metadata } } : {}),
      ...(embedded
        ? {
            ui_mode: 'embedded' as const,
            // Embedded sessions use return_url, not success/cancel.
            return_url: `${origin}/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}`,
          }
        : {
            success_url: `${origin}/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/fusarium/launchpad/pricing?checkout=cancelled`,
          }),
    });

    return NextResponse.json(
      embedded
        ? { ok: true, clientSecret: session.client_secret }
        : { ok: true, url: session.url },
    );
  } catch (e) {
    // Never leak Stripe internals to an anonymous caller.
    console.error('[launchpad/public-checkout] session create failed:', (e as Error).message);
    return NextResponse.json(
      { error: 'Could not start checkout. Please try again.', code: 'checkout_failed' },
      { status: 502 },
    );
  }
}
