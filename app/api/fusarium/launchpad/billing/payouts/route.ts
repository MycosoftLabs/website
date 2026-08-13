import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { jsonError } from '@/lib/launchpad/http';
import { requireTenant } from '@/lib/launchpad/tenant-context';

/**
 * Stripe account payout posture — names and booleans only, no secrets.
 * Live charges can succeed while payouts_enabled is false (funds sit at Stripe).
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant({ roles: ['owner', 'admin'], allowPaidOnboarding: true });
  if (gate.error) return gate.error;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return jsonError(503, 'stripe_unconfigured', 'Billing is not configured in this environment');
  }
  const stripe = new Stripe(secretKey);
  try {
    const account = await stripe.accounts.retrieve();
    const requirements = account.requirements;
    return NextResponse.json({
      livemode: !secretKey.startsWith('sk_test_'),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      details_submitted: Boolean(account.details_submitted),
      currently_due_count: requirements?.currently_due?.length ?? 0,
      past_due_count: requirements?.past_due?.length ?? 0,
      disabled_reason: requirements?.disabled_reason ?? null,
      note:
        account.payouts_enabled
          ? 'Payouts are enabled on this Stripe account.'
          : 'Charges may succeed while payouts are blocked until identity/bank verification clears.',
    });
  } catch (e) {
    console.error('[launchpad/payouts] retrieve failed:', (e as Error).message);
    return jsonError(502, 'stripe_account_unavailable', 'Could not read Stripe account posture');
  }
}
