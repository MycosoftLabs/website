import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

const TABLES = [
  'launchpad_company_profiles',
  'launchpad_capability_profiles',
  'launchpad_registration_records',
  'launchpad_control_states',
  'launchpad_poam_items',
  'launchpad_evidence_index',
  'launchpad_generated_documents',
  'launchpad_training_assignments',
  'launchpad_tasks',
  'launchpad_tier1_records',
  'launchpad_closure_statements',
  'launchpad_enclave_references',
  'launchpad_bom_parts',
  'launchpad_proposal_workspaces',
  'launchpad_partner_consents',
] as const;

export async function GET() {
  const gate = await requireTenant({ roles: ['owner', 'admin'] });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const bundle: Record<string, unknown> = {
    tenantId: ctx.tenantId,
    tenantName: ctx.tenantName,
    exportedAt: new Date().toISOString(),
    classification: 'COMMERCIAL // NON-CUI',
  };
  for (const table of TABLES) {
    const { data } = await ctx.supabase.from(table).select('*').eq('tenant_id', ctx.tenantId);
    if (table === 'launchpad_generated_documents') {
      bundle[table] = (data ?? []).map((row) => {
        const copy = { ...row } as Record<string, unknown>;
        delete copy.rendered_html;
        return copy;
      });
    } else {
      bundle[table] = data ?? [];
    }
  }
  const { data: connections } = await ctx.supabase
    .from('launchpad_ai_connections')
    .select('id, provider, mode, status, display_prefix, created_at, revoked_at, kms_backend')
    .eq('tenant_id', ctx.tenantId);
  bundle.launchpad_ai_connections = connections ?? [];
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'settings.export',
    entity: 'launchpad_tenants',
    entityId: ctx.tenantId,
  });
  return NextResponse.json({
    export: bundle,
    note: 'AI provider secrets, enroll hashes, and generated HTML bodies are omitted. Audit chain is not rewritten.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ confirm?: string }>(request);
  if (!parsed.ok) return parsed.response;
  if (parsed.body.confirm !== ctx.tenantName) {
    return jsonError(400, 'confirm_required', 'POST confirm must equal the workspace name. Deletion is owner-only.');
  }
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'settings.deletion_requested',
    entity: 'launchpad_tenants',
    entityId: ctx.tenantId,
  });
  return NextResponse.json({
    ok: true,
    queued: true,
    note: 'Deletion request recorded on the hash chain. Operator confirmation is still required before destroying the tenant row. Export first.',
  });
}
