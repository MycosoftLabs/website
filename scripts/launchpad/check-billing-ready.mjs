/**
 * Fail-closed Launchpad billing check. Boolean-only — never prints secret values.
 * Exit 1 when LAUNCHPAD_ENABLED is on and STRIPE_LAUNCHPAD_WEBHOOK_SECRET is absent.
 */
function envSet(name) {
  return Boolean((process.env[name] ?? '').trim());
}

const launchpadEnabled =
  process.env.LAUNCHPAD_ENABLED === '1' || process.env.LAUNCHPAD_ENABLED === 'true';
const webhookSet = envSet('STRIPE_LAUNCHPAD_WEBHOOK_SECRET');
const stripeSecretSet = envSet('STRIPE_SECRET_KEY');
const ready = !launchpadEnabled || (stripeSecretSet && webhookSet);

const report = {
  ready,
  launchpadEnabled,
  stripeSecretSet,
  launchpadWebhookSecretSet: webhookSet,
};

process.stdout.write(`${JSON.stringify(report)}\n`);
if (!ready) {
  process.stderr.write(
    'LAUNCHPAD_ENABLED is on but STRIPE_LAUNCHPAD_WEBHOOK_SECRET or STRIPE_SECRET_KEY is absent. Deploy aborted.\n',
  );
  process.exit(1);
}
