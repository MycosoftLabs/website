/**
 * Launchpad operator allowlist.
 *
 * Site `super_admin` does NOT silently own every tenant. These emails may
 * call /api/fusarium/launchpad/admin/* after a real Supabase session is
 * proven. Tenant membership is still required for ordinary workspace routes.
 */

import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isLaunchpadEnabled } from '@/lib/launchpad/flags';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';

export const LAUNCHPAD_OPERATOR_EMAILS = ['morgan@mycosoft.org', 'admin@mycosoft.org'] as const;

export function normalizeOperatorEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function isLaunchpadOperatorEmail(email: string | null | undefined): boolean {
  const n = normalizeOperatorEmail(email);
  return (LAUNCHPAD_OPERATOR_EMAILS as readonly string[]).includes(n);
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function requireLaunchpadOperator(): Promise<
  | { user: User; email: string; error?: never }
  | { user?: never; email?: never; error: NextResponse }
> {
  if (!isLaunchpadEnabled()) {
    return { error: err(404, 'launchpad_disabled', 'Not found') };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user || authError) {
    return { error: err(401, 'auth_required', 'Authentication required') };
  }

  const email = normalizeOperatorEmail(user.email);
  if (!isLaunchpadOperatorEmail(email)) {
    return { error: err(403, 'operator_required', 'Launchpad operator access required') };
  }

  return { user, email };
}

export function launchpadOperatorServiceClient() {
  return createLaunchpadServiceClient();
}
