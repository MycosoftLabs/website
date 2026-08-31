import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/launchpad/http';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { claimPaidPurchasesForVerifiedEmail } from '@/lib/launchpad/billing/grants';
import { verifiedAuthEmail } from '@/lib/launchpad/billing/public-checkout';
import { requireTenant } from '@/lib/launchpad/tenant-context';

/**
 * Claim paid public-checkout purchases onto the caller's workspace.
 *
 * Identity is the verified Supabase auth email. The request body is ignored
 * for email — a caller cannot claim someone else's purchase by posting it.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  void request;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, 'auth_required', 'Authentication required');

  const email = verifiedAuthEmail(user);
  if (!email) {
    return jsonError(
      403,
      'email_unverified',
      'Confirm your account email before claiming a purchase.',
    );
  }

  const gate = await requireTenant({
    allowNoTenant: true,
    allowPaidOnboarding: true,
  });
  if (gate.error) return gate.error;
  if (!gate.ctx.tenantId) {
    return jsonError(
      403,
      'tenant_required',
      'Create a workspace first, then claim. Onboarding also claims automatically.',
    );
  }

  let svc;
  try {
    svc = createLaunchpadServiceClient();
  } catch {
    return jsonError(503, 'service_unconfigured', 'Claim service is not configured');
  }

  const result = await claimPaidPurchasesForVerifiedEmail(svc, {
    tenantId: gate.ctx.tenantId,
    verifiedEmail: email,
    eventIdPrefix: 'claim',
  });
  return NextResponse.json({
    ok: true,
    claimed: result.claimed,
    outcomes: result.outcomes,
    note: 'Matched on verified auth email only. Request body email is never used.',
  });
}
