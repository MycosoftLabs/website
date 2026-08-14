/**
 * FUSARIUM Launchpad — requireTenant(), the requireAdmin() analog for the
 * multi-tenant commercial workspace.
 *
 * Derivation order (tenant_id NEVER comes from a request body):
 *   1. Runtime flag — LAUNCHPAD_ENABLED off means the app does not exist (404).
 *   2. Session user from the cookie-bound Supabase client (Supabase Auth only;
 *      the local-dev owner cookie is deliberately NOT honored here — Launchpad
 *      data is RLS-enforced and needs a real session).
 *   3. Active-tenant cookie `lp_tenant`, validated against launchpad_memberships
 *      THROUGH THE SESSION CLIENT: RLS itself proves membership, so a forged
 *      cookie simply matches zero rows.
 *   4. No cookie: exactly one membership → use it; several → 409 so the page
 *      layer can show a picker; none → 403 tenant_required (onboarding).
 *   5. tenantStatus gates writes: 'grace' warns, 'read_export' blocks mutations,
 *      'suspended' blocks everything.
 *
 * The returned `supabase` client is SESSION-scoped — every downstream query
 * runs under RLS. Do not swap it for the service client in user-facing routes.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isLaunchpadEnabled, isLaunchpadPublicCheckoutEnabled } from '@/lib/launchpad/flags';

export type TenantRole = 'owner' | 'admin' | 'member' | 'readonly';
export type TenantStatus = 'active' | 'grace' | 'read_export' | 'suspended';

export const ACTIVE_TENANT_COOKIE = 'lp_tenant';

export interface TenantContext {
  user: { id: string; email: string };
  tenantId: string;
  tenantName: string;
  tenantStatus: TenantStatus;
  role: TenantRole;
  /** Session-scoped client — RLS enforces everything done with it. */
  supabase: SupabaseClient;
}

export interface RequireTenantOptions {
  /** Restrict to specific roles (RLS enforces again at the DB). */
  roles?: TenantRole[];
  /** Set true on mutating routes so grace/read_export/suspended are enforced. */
  write?: boolean;
  /** Allow a signed-in user with no tenant yet (onboarding + tenant creation). */
  allowNoTenant?: boolean;
  /**
   * Allow session routes when the workspace flag is off IF public checkout is
   * on — paid buyers must still onboard/claim. Does not open the rest of the app.
   */
  allowPaidOnboarding?: boolean;
}

type MembershipRow = {
  tenant_id: string;
  role: TenantRole;
  launchpad_tenants: { id: string; name: string; status: TenantStatus } | null;
};

export interface TenantMembershipChoice {
  id: string;
  name: string;
}

function membershipChoices(memberships: MembershipRow[]): TenantMembershipChoice[] {
  return memberships.map((m) => ({
    id: m.tenant_id,
    name: m.launchpad_tenants?.name ?? '',
  }));
}

const err = (status: number, code: string, message: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: message, code, ...extra }, { status });

export async function requireTenant(
  opts: RequireTenantOptions = {},
): Promise<{ ctx: TenantContext; error?: never } | { ctx?: never; error: NextResponse }> {
  if (!isLaunchpadEnabled()) {
    if (!(opts.allowPaidOnboarding && isLaunchpadPublicCheckoutEnabled())) {
      return { error: err(404, 'launchpad_disabled', 'Not found') };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user || authError) {
    return { error: err(401, 'auth_required', 'Authentication required') };
  }

  // Memberships visible to this session (RLS: own rows, or all if owner/admin).
  const { data: rawRows, error: mErr } = await supabase
    .from('launchpad_memberships')
    .select('tenant_id, role, launchpad_tenants ( id, name, status )')
    .eq('user_id', user.id)
    .eq('status', 'active');
  const rows = rawRows as MembershipRow[] | null;

  if (mErr) {
    return { error: err(500, 'membership_lookup_failed', 'Could not resolve workspace membership') };
  }
  const memberships = (rows ?? []).filter((r) => r.launchpad_tenants);

  if (memberships.length === 0) {
    if (opts.allowNoTenant) {
      return {
        ctx: {
          user: { id: user.id, email: user.email ?? '' },
          tenantId: '',
          tenantName: '',
          tenantStatus: 'active',
          role: 'owner',
          supabase,
        },
      };
    }
    return { error: err(403, 'tenant_required', 'No Launchpad workspace — complete onboarding first') };
  }

  // Resolve the active tenant: cookie if it matches a real membership, else
  // the only membership, else demand a selection.
  const cookieTenant = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value;
  let membership = cookieTenant
    ? memberships.find((m) => m.tenant_id === cookieTenant)
    : undefined;
  if (!membership) {
    if (memberships.length === 1) membership = memberships[0];
    else {
      return {
        error: err(409, 'tenant_selection_required', 'Select a workspace', {
          memberships: membershipChoices(memberships),
        }),
      };
    }
  }

  const tenant = membership.launchpad_tenants!;

  if (tenant.status === 'suspended') {
    return { error: err(403, 'tenant_suspended', 'This workspace is suspended') };
  }
  if (opts.write && tenant.status === 'read_export') {
    return {
      error: err(
        403,
        'read_export_mode',
        'This workspace is in read/export mode — new changes are disabled until billing is resolved. Your data remains exportable.',
      ),
    };
  }
  if (opts.roles && !opts.roles.includes(membership.role)) {
    return { error: err(403, 'insufficient_role', `Requires role: ${opts.roles.join(' or ')}`) };
  }
  if (opts.write && membership.role === 'readonly') {
    return { error: err(403, 'insufficient_role', 'Read-only members cannot make changes') };
  }

  return {
    ctx: {
      user: { id: user.id, email: user.email ?? '' },
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantStatus: tenant.status,
      role: membership.role,
      supabase,
    },
  };
}
