import { NextRequest, NextResponse } from 'next/server';
import {
  lookupPublicCheckoutSession,
  publicCheckoutRateLimited,
} from '@/lib/launchpad/billing/public-checkout';

/**
 * GET /api/fusarium/launchpad/billing/session/:id
 *
 * Read-only confirmation for `/fusarium/launchpad/welcome?session_id=`.
 * Does not grant entitlements. Secrets (client_secret, payment methods) are
 * never returned. Identity for claim is still the verified auth email, not
 * this payload.
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  if (publicCheckoutRateLimited([`session:${ip}`])) {
    return NextResponse.json(
      { error: 'Too many attempts — wait a minute and try again.', code: 'rate_limited' },
      { status: 429 },
    );
  }

  const { id } = await context.params;
  const result = await lookupPublicCheckoutSession(id);
  if ('error' in result) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }

  return NextResponse.json({
    paid: result.paid,
    email: result.email,
    lookupKey: result.lookupKey,
    planName: result.planName,
    claimed: result.claimed,
    kind: result.kind,
    company: result.company,
  });
}
