import { billingReadyDeployOk, evaluateBillingReady } from '../billing/ready';

describe('billing ready fail-closed', () => {
  test('Launchpad off is deploy-ok even without webhook secret', () => {
    const env = { LAUNCHPAD_ENABLED: '0' } as NodeJS.ProcessEnv;
    expect(evaluateBillingReady(env).ready).toBe(true);
    expect(billingReadyDeployOk(env)).toBe(true);
  });

  test('Launchpad on without webhook secret fails closed', () => {
    const env = {
      LAUNCHPAD_ENABLED: '1',
      STRIPE_SECRET_KEY: 'set',
    } as NodeJS.ProcessEnv;
    const r = evaluateBillingReady(env);
    expect(r.ready).toBe(false);
    expect(r.launchpadWebhookSecretSet).toBe(false);
    expect(billingReadyDeployOk(env)).toBe(false);
  });

  test('Launchpad on with Stripe secret + webhook secret is ready', () => {
    const env = {
      LAUNCHPAD_ENABLED: '1',
      STRIPE_SECRET_KEY: 'set',
      STRIPE_LAUNCHPAD_WEBHOOK_SECRET: 'set',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'set',
    } as NodeJS.ProcessEnv;
    const r = evaluateBillingReady(env);
    expect(r.ready).toBe(true);
    expect(r.launchpadEnabled).toBe(true);
    expect(r.launchpadWebhookSecretSet).toBe(true);
  });
});
