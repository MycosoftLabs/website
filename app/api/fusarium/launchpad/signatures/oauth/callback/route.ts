import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { createClient } from '@/lib/supabase/server';
import { isLaunchpadEnabled } from '@/lib/launchpad/flags';
import { custodyReady } from '@/lib/launchpad/ai/connections';
import { exchangeOauthCode, storeTenantOauthTokens } from '@/lib/launchpad/signatures/docusign';
import { parseOauthState } from '../route';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'lp_docusign_oauth';

function appBase(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010').replace(
    /\/$/,
    '',
  );
}

export async function GET(request: NextRequest) {
  const dest = `${appBase()}/app/launchpad/signatures`;
  if (!isLaunchpadEnabled()) {
    return NextResponse.redirect(`${dest}?docusign=disabled`);
  }
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = (await cookies()).get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${dest}?docusign=state_mismatch`);
  }
  const parsed = parseOauthState(state);
  if (!parsed) return NextResponse.redirect(`${dest}?docusign=state_expired`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${dest}?docusign=auth_required`);

  if (!custodyReady()) {
    return NextResponse.redirect(`${dest}?docusign=kms_unconfigured`);
  }

  try {
    const tokens = await exchangeOauthCode(code);
    await storeTenantOauthTokens({
      tenantId: parsed.tenantId,
      createdBy: user.id,
      ...tokens,
    });
    const svc = createLaunchpadServiceClient();
    await appendAuditEvent(svc, parsed.tenantId, user.id, {
      action: 'signature.docusign.connected',
      entity: 'launchpad_docusign_connections',
      actorType: 'user',
    });
  } catch {
    return NextResponse.redirect(`${dest}?docusign=exchange_failed`);
  }
  (await cookies()).delete(STATE_COOKIE);
  return NextResponse.redirect(`${dest}?docusign=connected`);
}
