/**
 * Boolean-only Launchpad billing readiness.
 * Never returns secret values — only whether required names are set.
 */

function envSet(name: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean((env[name] ?? '').trim());
}

export interface BillingReady {
  ready: boolean;
  launchpadEnabled: boolean;
  publicCheckoutEnabled: boolean;
  stripeSecretSet: boolean;
  launchpadWebhookSecretSet: boolean;
  publishableKeySet: boolean;
}

export function evaluateBillingReady(env: NodeJS.ProcessEnv = process.env): BillingReady {
  const launchpadEnabled = env.LAUNCHPAD_ENABLED === '1' || env.LAUNCHPAD_ENABLED === 'true';
  const publicCheckoutEnabled =
    env.LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED === '1' ||
    env.LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED === 'true';
  const stripeSecretSet = envSet('STRIPE_SECRET_KEY', env);
  const launchpadWebhookSecretSet = envSet('STRIPE_LAUNCHPAD_WEBHOOK_SECRET', env);
  const publishableKeySet = envSet('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', env);
  const ready = !launchpadEnabled || (stripeSecretSet && launchpadWebhookSecretSet);
  return {
    ready,
    launchpadEnabled,
    publicCheckoutEnabled,
    stripeSecretSet,
    launchpadWebhookSecretSet,
    publishableKeySet,
  };
}

/** Fail-closed: Launchpad on without the Launchpad webhook secret must not deploy. */
export function billingReadyDeployOk(env: NodeJS.ProcessEnv = process.env): boolean {
  return evaluateBillingReady(env).ready;
}
