import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createHash } from 'crypto';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { getProduct, LAUNCH_PASS_DAYS } from '@/lib/launchpad/catalog';

/**
 * Launchpad's OWN Stripe webhook — deliberately separate from the legacy
 * /api/stripe/webhooks endpoint and secret. Launchpad events never touch
 * `profiles.subscription_tier`; entitlements land on launchpad_subscriptions.
 *
 * Contract (stripe_product_catalog.json implementation_requirements):
 *  - signature verified with STRIPE_LAUNCHPAD_WEBHOOK_SECRET;
 *  - event id + payload hash persisted BEFORE processing; conflict = replay
 *    → 200 and skip (idempotent, out-of-order-safe);
 *  - tenant id ONLY from verified session/subscription metadata;
 *  - every service-role write carries an explicit tenant filter;
 *  - failed payment → grace, never destruction;
 */

export const dynamic = 'force-dynamic';

const GRACE_DAYS = 14;

function svcOutcome(o: Record<string, unknown>) {
  return o;
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_LAUNCHPAD_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 });
  }
  const stripe = new Stripe(secretKey);

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const svc = createLaunchpadServiceClient();

  // Idempotency: insert-first; a conflict means we already processed this event.
  const payloadHash = createHash('sha256').update(payload).digest('hex');
  const { data: inserted } = await svc
    .from('launchpad_stripe_events')
    .upsert(
      { stripe_event_id: event.id, type: event.type, payload_hash: payloadHash },
      { onConflict: 'stripe_event_id', ignoreDuplicates: true },
    )
    .select('stripe_event_id');
  if (!inserted || inserted.length === 0) {
    return NextResponse.json({ ok: true, replay: true });
  }

  let outcome: Record<string, unknown> = { handled: false };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.lp_tenant_id;
        const lookupKey = session.metadata?.lp_lookup_key;
        if (!tenantId || !lookupKey) {
          outcome = svcOutcome({ handled: false, reason: 'not a launchpad session (no lp metadata)' });
          break;
        }
        const product = getProduct(lookupKey);
        if (!product) {
          outcome = svcOutcome({ handled: false, reason: `unknown lookup_key ${lookupKey}` });
          break;
        }

        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

        if (product.kind === 'pass') {
          // No cap, no cohort counter — a paid pass is always granted. Replay
          // safety comes from the stripe_events idempotency check above and the
          // per-tenant upsert below, not from a scarcity gate.
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
          // Included credits, granted once per event (ledger is insert-only; replays are blocked above).
          await svc.from('launchpad_credit_ledger').insert({
            tenant_id: tenantId, delta: 100, reason: 'launch_pass_grant', ref: { event: event.id },
          });
          outcome = svcOutcome({ handled: true, granted: 'launch_pass_30d' });
          break;
        }

        if (product.kind === 'credits' && product.creditQuantity) {
          await svc.from('launchpad_credit_ledger').insert({
            tenant_id: tenantId, delta: product.creditQuantity, reason: 'pack_purchase',
            ref: { event: event.id, lookupKey },
          });
          outcome = svcOutcome({ handled: true, credits: product.creditQuantity });
          break;
        }

        if (product.kind === 'plan' && product.planKey) {
          await svc.from('launchpad_subscriptions').upsert(
            {
              tenant_id: tenantId,
              stripe_customer_id: customerId,
              stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
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
          outcome = svcOutcome({ handled: true, plan: product.planKey });
          break;
        }

        outcome = svcOutcome({ handled: true, note: `no grant path for kind=${product.kind}` });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.lp_tenant_id;
        if (!tenantId) {
          outcome = svcOutcome({ handled: false, reason: 'not a launchpad subscription' });
          break;
        }
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
        const periodEnd = sub.items.data[0]?.current_period_end;
        await svc.from('launchpad_subscriptions').upsert(
          {
            tenant_id: tenantId,
            stripe_subscription_id: sub.id,
            status,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id' },
        );
        await svc
          .from('launchpad_tenants')
          .update({
            status: status === 'active' || status === 'trialing' ? 'active' : 'read_export',
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenantId);
        outcome = svcOutcome({ handled: true, status });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) {
          outcome = svcOutcome({ handled: false, reason: 'no customer on invoice' });
          break;
        }
        const { data: subRow } = await svc
          .from('launchpad_subscriptions')
          .select('tenant_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        if (!subRow) {
          outcome = svcOutcome({ handled: false, reason: 'customer not a launchpad tenant' });
          break;
        }
        const graceUntil = new Date();
        graceUntil.setUTCDate(graceUntil.getUTCDate() + GRACE_DAYS);
        await svc
          .from('launchpad_subscriptions')
          .update({ status: 'grace', grace_until: graceUntil.toISOString(), updated_at: new Date().toISOString() })
          .eq('tenant_id', subRow.tenant_id);
        await svc
          .from('launchpad_tenants')
          .update({ status: 'grace', updated_at: new Date().toISOString() })
          .eq('id', subRow.tenant_id);
        outcome = svcOutcome({ handled: true, grace_until: graceUntil.toISOString() });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) { outcome = svcOutcome({ handled: false }); break; }
        const { data: subRow } = await svc
          .from('launchpad_subscriptions')
          .select('tenant_id, plan_key')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        if (!subRow) { outcome = svcOutcome({ handled: false, reason: 'not a launchpad tenant' }); break; }
        await svc
          .from('launchpad_subscriptions')
          .update({ status: 'active', grace_until: null, updated_at: new Date().toISOString() })
          .eq('tenant_id', subRow.tenant_id);
        await svc
          .from('launchpad_tenants')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', subRow.tenant_id);
        // Monthly included credits on each paid invoice for recurring plans.
        const plan = subRow.plan_key ? getProduct(`fus_launchpad_${
          subRow.plan_key === 'contractor_ops' ? 'ops' :
          subRow.plan_key === 'origin_graph' ? 'origin' :
          subRow.plan_key === 'partner_mesh_pro' ? 'partner' : 'core'}_monthly`) : null;
        const { PLAN_ENTITLEMENTS } = await import('@/lib/launchpad/catalog');
        const ent = subRow.plan_key ? PLAN_ENTITLEMENTS[subRow.plan_key as keyof typeof PLAN_ENTITLEMENTS] : null;
        if (ent && plan) {
          await svc.from('launchpad_credit_ledger').insert({
            tenant_id: subRow.tenant_id, delta: ent.aiCreditsMonthly, reason: 'monthly_grant',
            ref: { event: event.id, invoice: invoice.id },
          });
        }
        outcome = svcOutcome({ handled: true, credits: ent?.aiCreditsMonthly ?? 0 });
        break;
      }

      default:
        outcome = svcOutcome({ handled: false, reason: `unhandled type ${event.type}` });
    }
  } catch (err) {
    outcome = svcOutcome({ handled: false, error: (err as Error).message });
  }

  await svc
    .from('launchpad_stripe_events')
    .update({ outcome })
    .eq('stripe_event_id', event.id);

  return NextResponse.json({ ok: true, outcome });
}
