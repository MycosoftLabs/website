import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';

/**
 * Launchpad Stripe Customer Portal. Separate from NatureOS /api/stripe/portal.
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

  const { data: sub } = await ctx.supabase
    .from('launchpad_subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  const customerId = typeof sub?.stripe_customer_id === 'string' ? sub.stripe_customer_id : '';
  if (!customerId) {
    return NextResponse.json(
      { error: 'This workspace has no Stripe customer yet. Complete a checkout first.', code: 'no_customer' },
      { status: 404 },
    );
  }

  const origin = request.nextUrl.origin;
  const stripe = new Stripe(secretKey);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/app/launchpad/billing`,
  });

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'billing.portal.created',
    entity: 'stripe.billing_portal.session',
    entityId: session.id,
    payload: { livemode: session.livemode },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
