import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { getProduct } from '@/lib/launchpad/catalog';
import { ACTIVE_TENANT_COOKIE } from '@/lib/launchpad/tenant-context';
import {
  isStripeCheckoutSessionId,
  normalizeCheckoutEmail,
  publicCheckoutRateLimited,
} from '@/lib/launchpad/billing/public-checkout';
import {
  provisionPaidPublicPurchase,
  shouldAutoLoginAfterPurchase,
} from '@/lib/launchpad/billing/provision';

/**
 * POST { session_id } — turn a paid Stripe Checkout Session into a workspace.
 * session_id is the capability token from Stripe's return URL. Email comes
 * from Stripe, never from the body.
 *
 * Auto-login (magic-link redeem + cookies) runs ONLY when this purchase
 * created the auth user. A pre-existing email gets a real inbox magic link
 * and `loggedIn: false`. Never return actionLink on that branch.
 */

export const dynamic = 'force-dynamic';

const ONBOARDING = '/app/launchpad/onboarding';
const DASHBOARD = '/app/launchpad/dashboard';

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  if (publicCheckoutRateLimited([`activate:${ip}`])) {
    return NextResponse.json(
      { error: 'Too many attempts — wait a minute and try again.', code: 'rate_limited' },
      { status: 429 },
    );
  }

  let body: { session_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!isStripeCheckoutSessionId(sessionId)) {
    return NextResponse.json({ error: 'Invalid checkout session', code: 'invalid_session' }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Billing is not configured', code: 'stripe_unconfigured' }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: 'Checkout session not found', code: 'session_not_found' }, { status: 404 });
  }

  const paid = session.payment_status === 'paid' || session.status === 'complete';
  if (!paid) {
    return NextResponse.json({ error: 'Payment is not complete yet', code: 'not_paid' }, { status: 409 });
  }
  if (session.metadata?.lp_source && session.metadata.lp_source !== 'public_pricing') {
    return NextResponse.json({ error: 'Not a storefront session', code: 'not_storefront' }, { status: 404 });
  }

  const email = normalizeCheckoutEmail(
    session.customer_details?.email || session.customer_email || '',
  );
  const lookupKey = session.metadata?.lp_lookup_key ?? '';
  if (!email || !lookupKey || !getProduct(lookupKey)) {
    return NextResponse.json({ error: 'Session is missing billing identity', code: 'incomplete_session' }, { status: 422 });
  }

  let svc;
  try {
    svc = createLaunchpadServiceClient();
  } catch {
    return NextResponse.json({ error: 'Provision service is not configured', code: 'service_unconfigured' }, { status: 503 });
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

  const provisioned = await provisionPaidPublicPurchase(svc, {
    stripeSessionId: session.id,
    eventId: `activate:${session.id}`,
    email,
    lookupKey,
    company: session.metadata?.lp_company ?? null,
    contactName: session.metadata?.lp_contact_name ?? null,
    customerId,
    subscriptionId,
  });
  if (!provisioned.ok || !provisioned.email) {
    return NextResponse.json(
      { error: provisioned.error || 'Could not provision workspace', code: provisioned.code || 'provision_failed' },
      { status: 500 },
    );
  }

  const origin = request.nextUrl.origin;
  const created = shouldAutoLoginAfterPurchase(provisioned);

  if (!created) {
    await svc.auth.signInWithOtp({
      email: provisioned.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${origin}${ONBOARDING}`,
      },
    });
    return NextResponse.json({
      ok: true,
      provisioned: true,
      alreadyClaimed: Boolean(provisioned.alreadyClaimed),
      created: false,
      tenantId: provisioned.tenantId,
      email: provisioned.email,
      loggedIn: false,
      nextStep: 'onboarding',
      redirectTo: `/login?redirectTo=${encodeURIComponent(ONBOARDING)}`,
      dashboardPath: DASHBOARD,
      note: 'This email already has an account. Sign in to claim the purchase.',
    });
  }

  const { data: link, error: linkError } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: provisioned.email,
    options: { redirectTo: `${origin}${ONBOARDING}` },
  });
  if (linkError || !link.properties?.hashed_token) {
    return NextResponse.json(
      {
        ok: true,
        provisioned: true,
        alreadyClaimed: Boolean(provisioned.alreadyClaimed),
        created: true,
        tenantId: provisioned.tenantId,
        email: provisioned.email,
        loggedIn: false,
        nextStep: 'onboarding',
        redirectTo: ONBOARDING,
        dashboardPath: DASHBOARD,
        code: 'magic_link_failed',
        note: 'Workspace is ready. Sign in with the Stripe email to continue.',
      },
      { status: 200 },
    );
  }

  const sessionClient = await createClient();
  const { error: otpError } = await sessionClient.auth.verifyOtp({
    type: 'email',
    token_hash: link.properties.hashed_token,
  });

  if (!otpError && provisioned.tenantId) {
    (await cookies()).set(ACTIVE_TENANT_COOKIE, provisioned.tenantId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return NextResponse.json({
    ok: true,
    provisioned: true,
    alreadyClaimed: Boolean(provisioned.alreadyClaimed),
    created: true,
    tenantId: provisioned.tenantId,
    email: provisioned.email,
    loggedIn: !otpError,
    nextStep: 'onboarding',
    redirectTo: otpError ? `/login?redirectTo=${encodeURIComponent(ONBOARDING)}` : ONBOARDING,
    dashboardPath: DASHBOARD,
  });
}
