import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import {
  assertPublicCheckoutEnabled,
  isPublicCheckoutLookupKey,
  maskEmail,
  normalizeCheckoutEmail,
  publicCheckoutDisabledResponse,
  publicCheckoutProduct,
  publicCheckoutRateLimited,
  stripeModeForProduct,
  upsertGuestCheckoutSession,
} from '@/lib/launchpad/billing/public-checkout';

/**
 * PUBLIC Stripe checkout — anonymous storefront.
 *
 * Deliberately separate from ../checkout (requireTenant owner/admin).
 * Do not relax auth on the tenant route.
 *
 * Request: { lookupKey, email, company? }
 * Lookup keys are whitelisted against lib/launchpad/catalog.ts (plans, launch
 * pass, every credit pack, every advisory SKU). Never accept a price ID or amount.
 * Kill switch: LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED — not LAUNCHPAD_ENABLED.
 */

export const dynamic = 'force-dynamic';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function originFrom(request: NextRequest): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(
    /\/$/,
    '',
  );
  if (env) return env;
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!assertPublicCheckoutEnabled()) {
    const d = publicCheckoutDisabledResponse();
    return NextResponse.json({ error: d.error, code: d.code }, { status: d.status });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return jsonError(503, 'stripe_unconfigured', 'Billing is not configured in this environment');
  }

  const parsed = await readJson<{ lookupKey?: unknown; email?: unknown; company?: unknown }>(
    request,
  );
  if (parsed.ok === false) return parsed.response;

  const lookupKey = typeof parsed.body.lookupKey === 'string' ? parsed.body.lookupKey.trim() : '';
  if (!lookupKey || !isPublicCheckoutLookupKey(lookupKey)) {
    return jsonError(400, 'unknown_product', 'Unknown product');
  }
  const product = publicCheckoutProduct(lookupKey);
  if (!product) return jsonError(400, 'unknown_product', 'Unknown product');

  const email = normalizeCheckoutEmail(parsed.body.email);
  if (!email) {
    return jsonError(400, 'email_required', 'A valid email is required to start checkout');
  }
  const company =
    typeof parsed.body.company === 'string' ? parsed.body.company.trim().slice(0, 200) : '';

  const ip = clientIp(request);
  if (publicCheckoutRateLimited([`ip:${ip}`, `email:${email}`])) {
    return jsonError(429, 'rate_limited', 'Too many attempts — wait a minute and try again.');
  }

  const stripe = new Stripe(secretKey);
  const prices = await stripe.prices.list({ lookup_keys: [product.lookupKey], limit: 1 });
  const price = prices.data[0];
  if (!price) {
    return jsonError(
      503,
      'price_not_provisioned',
      `No Stripe price carries lookup_key "${product.lookupKey}" in this mode.`,
    );
  }

  const metadata: Record<string, string> = {
    lp_source: 'public_pricing',
    lp_lookup_key: product.lookupKey,
    lp_kind: product.kind,
    lp_billing: product.billing,
    ...(product.planKey ? { lp_plan_key: product.planKey } : {}),
    ...(company ? { lp_company: company } : {}),
  };

  const origin = originFrom(request);
  const mode = stripeModeForProduct(product);

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: email,
      success_url: `${origin}/fusarium/launchpad/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/fusarium/launchpad/pricing`,
      metadata,
      ...(mode === 'subscription' ? { subscription_data: { metadata } } : {}),
    });

    try {
      const svc = createLaunchpadServiceClient();
      await upsertGuestCheckoutSession(svc, {
        stripe_session_id: session.id,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        email,
        lookup_key: product.lookupKey,
        plan_key: product.planKey ?? null,
        billing: product.billing,
        kind: product.kind,
        company: company || null,
        status: 'checkout_created',
      });
    } catch (storeErr) {
      console.error(
        '[launchpad/public-checkout] guest session store failed (webhook remains source of truth):',
        (storeErr as Error).message,
      );
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    console.error('[launchpad/public-checkout] session create failed:', (e as Error).message);
    return jsonError(502, 'checkout_failed', 'Could not start checkout. Please try again.');
  }
}

/** Welcome-page confirmation. Retrieves Stripe session. Grants nothing. */
export async function GET(request: NextRequest) {
  if (!assertPublicCheckoutEnabled()) {
    const d = publicCheckoutDisabledResponse();
    return NextResponse.json({ error: d.error, code: d.code }, { status: d.status });
  }
  const ip = clientIp(request);
  if (publicCheckoutRateLimited([`ip:${ip}:get`])) {
    return jsonError(429, 'rate_limited', 'Too many attempts — wait a minute and try again.');
  }
  const sessionId = request.nextUrl.searchParams.get('session_id') ?? '';
  if (!sessionId.startsWith('cs_')) {
    return jsonError(400, 'session_required', 'session_id required');
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return jsonError(503, 'stripe_unconfigured', 'Billing is not configured in this environment');
  }
  const stripe = new Stripe(secretKey);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.lp_source !== 'public_pricing') {
      return jsonError(404, 'not_found', 'Checkout session not found');
    }
    const lookupKey = session.metadata.lp_lookup_key ?? '';
    const product = publicCheckoutProduct(lookupKey);
    const email =
      session.customer_details?.email ||
      session.customer_email ||
      '';
    return NextResponse.json({
      ok: true,
      paid: session.payment_status === 'paid' || session.status === 'complete',
      status: session.status,
      paymentStatus: session.payment_status,
      lookupKey: product?.lookupKey ?? lookupKey,
      kind: product?.kind ?? session.metadata.lp_kind ?? null,
      planKey: product?.planKey ?? session.metadata.lp_plan_key ?? null,
      emailMasked: email ? maskEmail(email.toLowerCase()) : null,
      livemode: session.livemode,
      note: 'Confirmation only. Entitlements are granted by the webhook + claim against your verified auth email.',
    });
  } catch {
    return jsonError(404, 'not_found', 'Checkout session not found');
  }
}
