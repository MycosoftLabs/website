/**
 * Verify Stripe lookup keys for the Launchpad catalog (read-only).
 * Does not create products. Prints lookup_key + price id + live/test mode.
 *
 *   npx tsx scripts/launchpad/verify-stripe-lookup-keys.ts
 */

import Stripe from 'stripe';
import { CATALOG } from '../../lib/launchpad/catalog';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error('STRIPE_SECRET_KEY missing');
    process.exit(2);
  }
  const mode = key.startsWith('sk_live_') ? 'live' : key.startsWith('sk_test_') ? 'test' : 'unknown';
  const stripe = new Stripe(key);
  let found = 0;
  const missing: string[] = [];
  for (const product of CATALOG) {
    const listed = await stripe.prices.list({ lookup_keys: [product.lookupKey], limit: 1 });
    if (listed.data.length > 0) {
      found += 1;
      const p = listed.data[0];
      console.log(`OK ${product.lookupKey} ${p.id} active=${p.active}`);
    } else {
      missing.push(product.lookupKey);
      console.log(`MISSING ${product.lookupKey}`);
    }
  }
  console.log(`mode=${mode} catalog=${CATALOG.length} found=${found} missing=${missing.length}`);
  if (missing.length) {
    console.error(`Missing lookup keys: ${missing.join(', ')}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
