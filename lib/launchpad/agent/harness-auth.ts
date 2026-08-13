/**
 * Session-or-harness read gate for the local MYCA orchestrator.
 *
 * GET-only. POST/PATCH handlers must keep requireTenant() so an lp_ key
 * cannot mutate tasks, flip controls, or send DocuSign envelopes.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/launchpad/tenant-context';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { authorizeHarnessBearer } from '@/lib/launchpad/api-keys';

export type HarnessTenantContext = TenantContext & { viaApiKey: boolean };

export async function requireTenantOrHarnessRead(
  request: NextRequest,
): Promise<{ ctx: HarnessTenantContext; error?: never } | { ctx?: never; error: NextResponse }> {
  const session = await requireTenant();
  if (!session.error) {
    return { ctx: { ...session.ctx, viaApiKey: false } };
  }
  if (session.error.status !== 401) {
    return session;
  }

  try {
    const svc = createLaunchpadServiceClient();
    const key = await authorizeHarnessBearer(svc, request.headers.get('authorization'));
    if (!key) return session;

    const { data: tenant } = await svc
      .from('launchpad_tenants')
      .select('id, name, status')
      .eq('id', key.tenantId)
      .maybeSingle();
    if (!tenant) {
      return {
        error: NextResponse.json({ error: 'unknown tenant', code: 'tenant_required' }, { status: 403 }),
      };
    }
    const status = tenant.status as TenantContext['tenantStatus'];
    if (status === 'suspended') {
      return {
        error: NextResponse.json({ error: 'Tenant suspended', code: 'tenant_suspended' }, { status: 403 }),
      };
    }

    return {
      ctx: {
        user: { id: `api-key:${key.id}`, email: '' },
        tenantId: key.tenantId,
        tenantName: (tenant.name as string) ?? 'workspace',
        tenantStatus: status,
        role: 'readonly',
        supabase: svc,
        viaApiKey: true,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'harness auth failed';
    if (message.includes('service client unavailable')) {
      return {
        error: NextResponse.json(
          { error: 'service role not configured', code: 'service_role_missing' },
          { status: 503 },
        ),
      };
    }
    return session;
  }
}
