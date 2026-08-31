import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createHash } from 'crypto';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { getProduct } from '@/lib/launchpad/catalog';
import {
  grantCatalogProductToTenant,
  monthlyCreditsForPlanKey,
} from '@/lib/launchpad/billing/grants';
import {
  markPendingPurchasePaid,
  normalizeCheckoutEmail,
} from '@/lib/launchpad/billing/public-checkout';
import { provisionPaidPublicPurchase } from '@/lib/launchpad/billing/provision';

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
        const lpSource = session.metadata?.lp_source;
        if (!lookupKey) {
          outcome = svcOutcome({ handled: false, reason: 'not a launchpad session (no lp metadata)' });
          break;
        }
        const product = getProduct(lookupKey);
        if (!product) {
          outcome = svcOutcome({ handled: false, reason: `unknown lookup_key ${lookupKey}` });
          break;
        }

        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

        if (lpSource === 'public_pricing' && !tenantId) {
          const stripeEmail = normalizeCheckoutEmail(
            session.customer_details?.email || session.customer_email || '',
          );
          if (!stripeEmail) {
            outcome = svcOutcome({
              handled: false,
              reason: 'public_pricing session has no Stripe email — cannot stage a claimable purchase',
            });
            break;
          }
          await markPendingPurchasePaid(svc, {
            stripeSessionId: session.id,
            stripeCustomerId: customerId,
            email: stripeEmail,
            lookupKey: product.lookupKey,
            planKey: product.planKey ?? session.metadata?.lp_plan_key ?? null,
            billing: product.billing,
            kind: product.kind,
            company: session.metadata?.lp_company ?? null,
            contactName: session.metadata?.lp_contact_name ?? null,
            jobTitle: session.metadata?.lp_job_title ?? null,
            companySize: session.metadata?.lp_company_size ?? null,
            applyReason: session.metadata?.lp_apply_reason ?? null,
          });
          const provisioned = await provisionPaidPublicPurchase(svc, {
            stripeSessionId: session.id,
            eventId: event.id,
            email: stripeEmail,
            lookupKey: product.lookupKey,
            company: session.metadata?.lp_company ?? null,
            contactName: session.metadata?.lp_contact_name ?? null,
            customerId,
            subscriptionId,
          });
          outcome = svcOutcome({
            handled: true,
            pending: true,
            provisioned: provisioned.ok,
            tenantId: provisioned.tenantId ?? null,
            kind: product.kind,
            note: provisioned.ok
              ? 'Workspace provisioned. Buyer activates login via session_id on welcome.'
              : provisioned.error || 'Paid. Activate/claim can provision later.',
          });
          break;
        }

        if (!tenantId) {
          outcome = svcOutcome({ handled: false, reason: 'not a launchpad session (no lp_tenant_id)' });
          break;
        }

        const granted = await grantCatalogProductToTenant(svc, {
          tenantId,
          product,
          lookupKey: product.lookupKey,
          eventId: event.id,
          customerId,
          subscriptionId,
        });
        outcome = svcOutcome({ handled: true, ...granted });
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
        const monthly = monthlyCreditsForPlanKey(subRow.plan_key);
        if (monthly == null) {
          outcome = svcOutcome({
            handled: true,
            credits: 0,
            note:
              subRow.plan_key === 'launch_pass_30d'
                ? 'Launch Pass is one-time; monthly_grant does not apply (credits granted at pass purchase).'
                : `unrecognized_plan_key:${subRow.plan_key ?? 'null'} — refusing to invent a credit grant`,
          });
          break;
        }
        const { data: alreadyGranted } = await svc
          .from('launchpad_credit_ledger')
          .select('id')
          .eq('tenant_id', subRow.tenant_id)
          .eq('reason', 'monthly_grant')
          .filter('ref->>invoice', 'eq', invoice.id)
          .maybeSingle();
        if (alreadyGranted) {
          outcome = svcOutcome({ handled: true, credits: 0, replay: true, invoice: invoice.id });
          break;
        }
        await svc.from('launchpad_credit_ledger').insert({
          tenant_id: subRow.tenant_id,
          delta: monthly,
          reason: 'monthly_grant',
          ref: { event: event.id, invoice: invoice.id },
        });
        outcome = svcOutcome({ handled: true, credits: monthly, invoice: invoice.id });
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
