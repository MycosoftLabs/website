import { NextResponse } from 'next/server';
import { requireLaunchpadOperator } from '@/lib/launchpad/operator';
import { getPlatformHealth } from '@/lib/launchpad/integrations/platform';
import { resolveSamApiKeyFromEnv } from '@/lib/launchpad/collectors/sam';
import { calcomStatus } from '@/lib/launchpad/advisory/calcom';
import { docusignConfigStatus } from '@/lib/launchpad/signatures/docusign';
import {
  isLaunchpadEnabled,
  isLaunchpadPublicCheckoutEnabled,
  isWaitlistMode,
} from '@/lib/launchpad/flags';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireLaunchpadOperator();
  if (gate.error) return gate.error;

  const platform = await getPlatformHealth();
  const calcom = calcomStatus();
  const docusign = docusignConfigStatus();
  return NextResponse.json({
    ok: true,
    platform,
    flags: {
      launchpadEnabled: isLaunchpadEnabled(),
      publicCheckoutEnabled: isLaunchpadPublicCheckoutEnabled(),
      waitlistMode: isWaitlistMode(),
    },
    collectors: {
      samConfigured: Boolean(resolveSamApiKeyFromEnv()),
    },
    advisory: {
      calcomConfigured: calcom.configured,
      blockingReason: calcom.blockingReason,
    },
    signatures: {
      docusignConfigured: docusign.oauthClientConfigured || docusign.jwtReady,
      blockingReason: docusign.blockingReason,
    },
  });
}
