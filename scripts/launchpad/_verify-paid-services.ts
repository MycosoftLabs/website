/**
 * Proof for Launchpad paid-services invariants. No secrets. No mock awards.
 * Run: npx tsx scripts/launchpad/_verify-paid-services.ts
 */
import assert from 'node:assert/strict';
import { evaluateBillingReady, billingReadyDeployOk } from '../../lib/launchpad/billing/ready';
import {
  CREDIT_USD,
  MARKUP_FIRST_PARTY,
  MARKUP_THIRD_PARTY,
  estimateReserveCredits,
  quoteCredits,
} from '../../lib/launchpad/ai/price-book';
import { CATALOG } from '../../lib/launchpad/catalog';
import { PUBLIC_CHECKOUT_LOOKUP_KEYS, isPublicCheckoutLookupKey } from '../../lib/launchpad/billing/public-checkout';
import { monthlyCreditsForPlanKey } from '../../lib/launchpad/billing/grants';
import { saleBlockForProduct } from '../../lib/launchpad/billing/sale-gates';
import { calcomStatus } from '../../lib/launchpad/advisory/calcom';

function env(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return { ...overrides } as NodeJS.ProcessEnv;
}

assert.equal(evaluateBillingReady(env({ LAUNCHPAD_ENABLED: '0' })).ready, true);
assert.equal(
  evaluateBillingReady(env({ LAUNCHPAD_ENABLED: '1', STRIPE_SECRET_KEY: 'set' })).ready,
  false,
);
assert.equal(
  billingReadyDeployOk(
    env({
      LAUNCHPAD_ENABLED: '1',
      STRIPE_SECRET_KEY: 'set',
      STRIPE_LAUNCHPAD_WEBHOOK_SECRET: 'set',
    }),
  ),
  true,
);

assert.equal(MARKUP_THIRD_PARTY, 4);
assert.equal(MARKUP_FIRST_PARTY, 5);
assert.equal(CREDIT_USD, 0.2);
const noRow = quoteCredits({
  provider: 'unknown-vendor',
  model: 'mystery',
  inputUnits: 10,
  outputUnits: 10,
});
assert.equal(noRow.ok, false);
const myca = quoteCredits({
  provider: 'myca',
  model: 'nemotron',
  inputUnits: 1_000_000,
  outputUnits: 0,
});
assert.equal(myca.ok, true);
if (myca.ok) assert.equal(myca.markup, 5);

const reserved = estimateReserveCredits(
  { provider: 'openai', model: 'gpt-4o', inputUnits: 10, outputUnits: 10 },
  25,
);
assert.equal(reserved.ok, true);
if (reserved.ok) assert.equal(reserved.credits, 25);

assert.equal(PUBLIC_CHECKOUT_LOOKUP_KEYS.includes('fus_launchpad_envelope_send'), false);
assert.equal(isPublicCheckoutLookupKey('fus_launchpad_envelope_send'), false);
assert.equal(
  PUBLIC_CHECKOUT_LOOKUP_KEYS.length,
  CATALOG.filter((p) => p.kind !== 'envelope').length,
);
assert.ok(CATALOG.some((p) => p.lookupKey === 'fus_launchpad_envelope_send' && p.unitAmount === 1500));

assert.equal(monthlyCreditsForPlanKey('core'), 100);
assert.equal(monthlyCreditsForPlanKey('launch_pass_30d'), null);

const advisory = CATALOG.find((p) => p.lookupKey === 'fus_launchpad_advisory_15');
assert.ok(advisory);
const prev = {
  CALCOM_WEBHOOK_SECRET: process.env.CALCOM_WEBHOOK_SECRET,
  CALCOM_BOOKING_BASE_URL: process.env.CALCOM_BOOKING_BASE_URL,
  CALCOM_EVENT_TYPE_ADVISORY_15: process.env.CALCOM_EVENT_TYPE_ADVISORY_15,
};
delete process.env.CALCOM_WEBHOOK_SECRET;
delete process.env.CALCOM_BOOKING_BASE_URL;
delete process.env.CALCOM_EVENT_TYPE_ADVISORY_15;
assert.equal(calcomStatus().configured, false);
assert.ok(saleBlockForProduct(advisory));
if (prev.CALCOM_WEBHOOK_SECRET === undefined) delete process.env.CALCOM_WEBHOOK_SECRET;
else process.env.CALCOM_WEBHOOK_SECRET = prev.CALCOM_WEBHOOK_SECRET;
if (prev.CALCOM_BOOKING_BASE_URL === undefined) delete process.env.CALCOM_BOOKING_BASE_URL;
else process.env.CALCOM_BOOKING_BASE_URL = prev.CALCOM_BOOKING_BASE_URL;
if (prev.CALCOM_EVENT_TYPE_ADVISORY_15 === undefined) delete process.env.CALCOM_EVENT_TYPE_ADVISORY_15;
else process.env.CALCOM_EVENT_TYPE_ADVISORY_15 = prev.CALCOM_EVENT_TYPE_ADVISORY_15;

console.log('Launchpad paid-services invariants: ok');
