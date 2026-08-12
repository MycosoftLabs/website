import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { getProduct, FOUNDING_PASS_CAP } from '@/lib/launchpad/catalog';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';

/**
 * Launchpad checkout — hosted Stripe Checkout by lookup_key.
 *
 * Price IDs are resolved AT RUNTIME from the lookup_key, so test and live
 * modes differ only by env keys (Cursor's live-provisioning handoff). Only
 * billing identity + tenant id travel in metadata — no readiness data, ever.
 * Entitlements are granted exclusively by the verified webhook; the redirect
 * back from Stripe proves nothing and grants nothing.
 */

export async function POST(request: NextRequest) {
  const result = await requireTenant({ roles: ['owner', 'admin'], write: false });
  if (result.error) return result.error;
  const { ctx } = result;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Billing is not configured in this environment', code: 'stripe_unconfigured' },
      { status: 503 },
    );
  }

  let body: { lookupKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const product = getProduct(String(body.lookupKey ?? ''));
  if (!product) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });

  // Founding pass soft gate at checkout time (the webhook re-verifies under lock).
  if (product.planKey === 'founding_pass_30d') {
    const svc = createLaunchpadServiceClient();
    const { count } = await svc
      .from('launchpad_founding_pass_claims')
      .select('tenant_id', { count: 'exact', head: true });
    if ((count ?? 0) >= FOUNDING_PASS_CAP) {
      return NextResponse.json(
        { error: 'The Founding 50 cohort is full', code: 'founding_pass_sold_out' },
        { status: 409 },
      );
    }
  }

  const stripe = new Stripe(secretKey);

  // Resolve the price at runtime by lookup_key.
  const prices = await stripe.prices.list({ lookup_keys: [product.lookupKey], limit: 1 });
  const price = prices.data[0];
  if (!price) {
    return NextResponse.json(
      {
        error: `No Stripe price carries lookup_key "${product.lookupKey}" in this mode. Provision the catalog first (docs/launchpad/handoffs/03-stripe-live-provisioning.md).`,
        code: 'price_not_provisioned',
      },
      { status: 503 },
    );
  }

  const origin = request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: product.billing === 'one_time' ? 'payment' : 'subscription',
    line_items: [{ price: price.id, quantity: 1 }],
    customer_email: ctx.user.email || undefined,
    success_url: `${origin}/app/launchpad/billing?status=success`,
    cancel_url: `${origin}/app/launchpad/billing?status=cancelled`,
    // Tenant binding for the webhook — metadata only, no readiness data.
    metadata: { lp_tenant_id: ctx.tenantId, lp_lookup_key: product.lookupKey },
    ...(product.billing !== 'one_time'
      ? { subscription_data: { metadata: { lp_tenant_id: ctx.tenantId, lp_lookup_key: product.lookupKey } } }
      : {}),
  });

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'billing.checkout.created',
    entity: 'stripe.checkout.session',
    entityId: session.id,
    payload: { lookupKey: product.lookupKey, mode: session.mode, livemode: session.livemode },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
