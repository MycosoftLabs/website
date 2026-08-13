import { CATALOG } from '../catalog';
import {
  isPublicCheckoutLookupKey,
  normalizeCheckoutEmail,
  PUBLIC_CHECKOUT_LOOKUP_KEYS,
  stripeModeForProduct,
  verifiedAuthEmail,
  publicCheckoutProduct,
} from '../billing/public-checkout';
import { monthlyCreditsForPlanKey } from '../billing/grants';
import { isLaunchpadEnabled, isLaunchpadPublicCheckoutEnabled } from '../flags';

describe('public checkout catalog whitelist', () => {
  test('includes every plan, the launch pass, all credit packs, and all advisory SKUs', () => {
    expect(PUBLIC_CHECKOUT_LOOKUP_KEYS).toEqual(
      expect.arrayContaining([
        'fus_launchpad_launch_pass',
        'fus_launchpad_core_monthly',
        'fus_launchpad_core_annual',
        'fus_launchpad_ops_monthly',
        'fus_launchpad_ops_annual',
        'fus_launchpad_origin_monthly',
        'fus_launchpad_origin_annual',
        'fus_launchpad_partner_monthly',
        'fus_launchpad_partner_annual',
        'fus_launchpad_credits_100',
        'fus_launchpad_credits_500',
        'fus_launchpad_credits_2000',
        'fus_launchpad_advisory_15',
        'fus_launchpad_advisory_30',
        'fus_launchpad_advisory_60',
        'fus_launchpad_advisory_90',
      ]),
    );
    expect(PUBLIC_CHECKOUT_LOOKUP_KEYS).toHaveLength(CATALOG.length);
  });

  test('rejects unknown lookup keys and never accepts a raw price id', () => {
    expect(isPublicCheckoutLookupKey('price_123')).toBe(false);
    expect(isPublicCheckoutLookupKey('fus_launchpad_founding_pass')).toBe(false);
    expect(publicCheckoutProduct('not-a-sku')).toBeNull();
    expect(publicCheckoutProduct('fus_launchpad_partner_monthly')?.kind).toBe('plan');
  });

  test('subscription vs payment follows catalog kind, not a client amount', () => {
    expect(stripeModeForProduct(publicCheckoutProduct('fus_launchpad_core_monthly')!)).toBe(
      'subscription',
    );
    expect(stripeModeForProduct(publicCheckoutProduct('fus_launchpad_launch_pass')!)).toBe('payment');
    expect(stripeModeForProduct(publicCheckoutProduct('fus_launchpad_credits_500')!)).toBe('payment');
    expect(stripeModeForProduct(publicCheckoutProduct('fus_launchpad_advisory_30')!)).toBe('payment');
  });
});

describe('public checkout identity', () => {
  test('normalizes and rejects bad emails', () => {
    expect(normalizeCheckoutEmail('  Founder@Example.COM ')).toBe('founder@example.com');
    expect(normalizeCheckoutEmail('not-an-email')).toBeNull();
    expect(normalizeCheckoutEmail({ email: 'x@y.com' })).toBeNull();
  });

  test('claim identity requires a verified auth email — not a request-body value', () => {
    expect(verifiedAuthEmail({ email: 'a@b.com' })).toBeNull();
    expect(verifiedAuthEmail({ email: 'a@b.com', email_confirmed_at: '2026-08-13T00:00:00Z' })).toBe(
      'a@b.com',
    );
  });
});

describe('kill switches are independent', () => {
  const prevApp = process.env.LAUNCHPAD_ENABLED;
  const prevStore = process.env.LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED;

  afterEach(() => {
    if (prevApp === undefined) delete process.env.LAUNCHPAD_ENABLED;
    else process.env.LAUNCHPAD_ENABLED = prevApp;
    if (prevStore === undefined) delete process.env.LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED;
    else process.env.LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED = prevStore;
  });

  test('storefront can be on while the workspace is off', () => {
    process.env.LAUNCHPAD_ENABLED = '0';
    process.env.LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED = '1';
    expect(isLaunchpadEnabled()).toBe(false);
    expect(isLaunchpadPublicCheckoutEnabled()).toBe(true);
  });

  test('public checkout fails closed when unset', () => {
    delete process.env.LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED;
    expect(isLaunchpadPublicCheckoutEnabled()).toBe(false);
  });
});

describe('monthly grant honesty', () => {
  test('Launch Pass does not invent a monthly credit grant', () => {
    expect(monthlyCreditsForPlanKey('launch_pass_30d')).toBeNull();
    expect(monthlyCreditsForPlanKey('not_a_plan')).toBeNull();
    expect(monthlyCreditsForPlanKey('core')).toBe(100);
    expect(monthlyCreditsForPlanKey('partner_mesh_pro')).toBe(1200);
  });
});
