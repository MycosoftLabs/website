/**
 * Localhost-only: attach a real Supabase session for morgan@mycosoft.org
 * so Launchpad RLS (requireTenant) can resolve the seeded workspace.
 *
 * The mycosoft_local_dev_admin cookie is enough for site chrome. It is
 * deliberately not enough for Launchpad data. This helper mints a normal
 * session via generateLink + verifyOtp and writes the cookies onto the
 * caller's response. Never call this outside isLocalDevAuthEnabled().
 */

import { createClientForRedirect } from '@/lib/supabase/server';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';

export const LOCAL_DEV_LAUNCHPAD_EMAIL = 'morgan@mycosoft.org';

export async function attachLocalDevLaunchpadSupabaseSession(
  request: Request,
  response: {
    cookies: {
      set: (name: string, value: string, options?: Record<string, unknown>) => void;
    };
  },
): Promise<{ attached: boolean; reason?: string }> {
  if (process.env.NODE_ENV !== 'development') {
    return { attached: false, reason: 'not_development' };
  }

  let admin;
  try {
    admin = createLaunchpadServiceClient();
  } catch {
    return { attached: false, reason: 'supabase_admin_unconfigured' };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: LOCAL_DEV_LAUNCHPAD_EMAIL,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return { attached: false, reason: error?.message || 'generate_link_failed' };
  }

  const sessionClient = createClientForRedirect(request, response);
  const first = await sessionClient.auth.verifyOtp({
    type: 'email',
    token_hash: tokenHash,
  });
  if (!first.error) return { attached: true };

  const second = await sessionClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  });
  if (!second.error) return { attached: true };

  return { attached: false, reason: second.error?.message || first.error.message };
}
