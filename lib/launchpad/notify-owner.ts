/**
 * Owner ops notifications for Launchpad signup / payment.
 * Uses existing SMTP mailer. Never invents a personal address —
 * prefers explicit notify env, else the configured owner mailbox.
 */

import { sendEmail, verifyEmailConfig, type EmailResult } from '@/lib/email/mailer';

const FALLBACK_OWNER = 'morgan@mycosoft.org';

/** Address Morgan (ops) should receive Launchpad signup/payment alerts. */
export function launchpadOwnerNotifyAddress(): string {
  const candidates = [
    process.env.LAUNCHPAD_OWNER_NOTIFY_EMAIL,
    process.env.DEPLOY_NOTIFY_EMAIL,
    process.env.NOTIFY_EMAIL,
    process.env.OWNER_NOTIFY_EMAIL,
    process.env.ALERT_EMAIL,
  ];
  for (const raw of candidates) {
    const v = (raw ?? '').trim();
    if (v.includes('@')) return v.toLowerCase();
  }
  return FALLBACK_OWNER;
}

export interface OwnerNotifyResult {
  attempted: boolean;
  sent: boolean;
  to: string;
  error?: string;
}

async function notifyOwner(subject: string, text: string, html: string): Promise<OwnerNotifyResult> {
  const to = launchpadOwnerNotifyAddress();
  const cfg = await verifyEmailConfig();
  if (!cfg.valid) {
    return {
      attempted: true,
      sent: false,
      to,
      error: cfg.error || 'SMTP not configured',
    };
  }
  const result: EmailResult = await sendEmail({ to, subject, text, html });
  return {
    attempted: true,
    sent: Boolean(result.success),
    to,
    error: result.success ? undefined : result.error,
  };
}

export async function notifyOwnerLaunchpadSignup(input: {
  tenantId: string;
  companyName: string;
  userId: string;
  userEmail: string | null;
}): Promise<OwnerNotifyResult> {
  const subject = `[Launchpad] New workspace: ${input.companyName}`;
  const text = [
    'A new FUSARIUM Launchpad workspace was created.',
    `Company: ${input.companyName}`,
    `Tenant: ${input.tenantId}`,
    `User id: ${input.userId}`,
    `User email: ${input.userEmail || '(none)'}`,
    `At: ${new Date().toISOString()}`,
  ].join('\n');
  const html = `<h2>New Launchpad workspace</h2><pre>${text.replace(/</g, '&lt;')}</pre>`;
  return notifyOwner(subject, text, html);
}

export async function notifyOwnerLaunchpadPayment(input: {
  eventType: string;
  eventId: string;
  tenantId?: string | null;
  email?: string | null;
  planKey?: string | null;
  lookupKey?: string | null;
  credits?: number | null;
  note?: string | null;
}): Promise<OwnerNotifyResult> {
  const subject = `[Launchpad] Payment event: ${input.eventType}`;
  const text = [
    'A Launchpad Stripe event completed entitlement/credit handling.',
    `Event type: ${input.eventType}`,
    `Event id: ${input.eventId}`,
    `Tenant: ${input.tenantId || '(none)'}`,
    `Buyer email: ${input.email || '(none)'}`,
    `Plan: ${input.planKey || '(none)'}`,
    `Lookup key: ${input.lookupKey || '(none)'}`,
    `Credits granted: ${input.credits ?? '(n/a)'}`,
    `Note: ${input.note || ''}`,
    `At: ${new Date().toISOString()}`,
  ].join('\n');
  const html = `<h2>Launchpad payment</h2><pre>${text.replace(/</g, '&lt;')}</pre>`;
  return notifyOwner(subject, text, html);
}
