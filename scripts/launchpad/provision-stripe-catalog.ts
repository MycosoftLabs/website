/**
 * Idempotent Stripe test-mode product/price provision by lookup_key.
 *
 * Usage:
 *   $env:STRIPE_SECRET_KEY="sk_test_..."   # never commit
 *   npx tsx scripts/launchpad/provision-stripe-catalog.ts
 *
 * Creates missing products/prices from lib/launchpad/catalog.ts CATALOG.
 * Does not flip LAUNCHPAD_ENABLED. Live keys require Morgan + counsel gate.
 */

import Stripe from 'stripe';
import { CATALOG } from '../../lib/launchpad/catalog';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error('Set STRIPE_SECRET_KEY (test mode first). Refusing to run.');
    process.exit(2);
  }
  if (key.startsWith('sk_live_') && process.env.ALLOW_STRIPE_LIVE_PROVISION !== '1') {
    console.error('Live key detected. Set ALLOW_STRIPE_LIVE_PROVISION=1 only after Morgan go.');
    process.exit(2);
  }

  const stripe = new Stripe(key);
  let created = 0;
  let existing = 0;

  for (const product of CATALOG) {
    const listed = await stripe.prices.list({
      lookup_keys: [product.lookupKey],
      expand: ['data.product'],
    });
    if (listed.data.length > 0) {
      existing += 1;
      console.log(`OK exists ${product.lookupKey} → ${listed.data[0].id}`);
      continue;
    }

    const stripeProduct = await stripe.products.create({
      name: product.name,
      metadata: {
        lp_plan_key: product.planKey ?? '',
        lp_kind: product.kind,
        catalog_version: '1.0',
      },
      ...(product.kind === 'pass' ? { tax_code: 'txcd_10103000' } : {}),
    });

    const priceParams: Stripe.PriceCreateParams = {
      product: stripeProduct.id,
      currency: 'usd',
      unit_amount: product.unitAmount,
      lookup_key: product.lookupKey,
      metadata: {
        lp_lookup_key: product.lookupKey,
        lp_kind: product.kind,
      },
    };
    if (product.billing === 'month' || product.billing === 'year') {
      priceParams.recurring = { interval: product.billing };
    }

    const price = await stripe.prices.create(priceParams);
    created += 1;
    console.log(`CREATED ${product.lookupKey} → product ${stripeProduct.id} price ${price.id}`);
  }

  console.log(`Done. created=${created} existing=${existing}`);
  console.log('Next: register webhook https://<host>/api/fusarium/launchpad/stripe/webhook');
  console.log(
    'Events: checkout.session.completed, customer.subscription.updated|deleted, invoice.paid|payment_failed',
  );
  console.log('Store signing secret as STRIPE_LAUNCHPAD_WEBHOOK_SECRET (env only).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
