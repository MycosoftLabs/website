/**
 * Report Stripe live-account payout posture. Env var names only in logs.
 *
 *   npx tsx scripts/launchpad/report-stripe-payouts.ts
 */

import Stripe from 'stripe';

async function main() {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key) {
    console.log(JSON.stringify({ ok: false, code: 'stripe_unconfigured', livemode: null }));
    process.exit(2);
  }
  const stripe = new Stripe(key);
  const account = await stripe.accounts.retrieve();
  const report = {
    ok: true,
    livemode: !key.startsWith('sk_test_'),
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    currently_due_count: account.requirements?.currently_due?.length ?? 0,
    past_due_count: account.requirements?.past_due?.length ?? 0,
    disabled_reason: account.requirements?.disabled_reason ?? null,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: (e as Error).message }));
  process.exit(1);
});
