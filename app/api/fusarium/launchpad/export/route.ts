import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';

/**
 * Customer data export + deletion request.
 *
 * GET — assembles a real JSON export of the tenant's rows through the
 * SESSION-scoped client (RLS enforces membership on every table), returned as
 * a downloadable attachment. Each table read is isolated: a table that cannot
 * be read is exported as { error: 'unavailable' } and named in a top-level
 * omissions[] list — a partial export SAYS it is partial rather than failing
 * entirely or shipping silently incomplete.
 *
 * POST {action:'request_deletion'} — records a deletion REQUEST: an audit
 * event plus a task row in the tenant's own task list. Nothing is destroyed
 * here; a human operator confirms deletion out-of-band. No silent destruction.
 */

export const dynamic = 'force-dynamic';

/** Tenant-scoped tables included in the export, in workbook order. */
const TENANT_TABLES = [
  'launchpad_company_profiles',
  'launchpad_capability_profiles',
  'launchpad_control_states',
  'launchpad_score_snapshots',
  'launchpad_poam_items',
  'launchpad_evidence_index',
  'launchpad_generated_documents',
  'launchpad_closure_statements',
  'launchpad_enclave_references',
  'launchpad_clearance_readiness',
  'launchpad_tasks',
  'launchpad_training_assignments',
  'launchpad_tier1_records',
  'launchpad_registration_records',
  'launchpad_calendar_events',
  'launchpad_role_assignments',
  'launchpad_workbook_progress',
  'launchpad_bom_parts',
  'launchpad_bom_replacements',
  'launchpad_quarantine_events',
  'launchpad_proposal_workspaces',
  'launchpad_radar_alerts',
  'launchpad_ai_connections',
  'launchpad_ai_cost_ledger',
  'launchpad_audit_events',
] as const;

/**
 * Generated documents export METADATA columns only — deliberately no
 * `payload` and no `rendered_html`: document bodies are content, and the
 * export ships references and provenance (hashes, versions), not content.
 */
const DOCUMENT_METADATA_COLUMNS =
  'id, tenant_id, kind, title, status, rule_pack_version, template_version, content_hash, version, created_by, created_at, approved_by, approved_at';

/**
 * AI connections export columns — metadata only. The KMS envelope columns
 * (key_ciphertext, key_dek_wrapped) are unreadable by the session role via
 * column grants and must NEVER be selected: `*` here would error the read.
 * key_last4 is a display hint, not key material.
 */
const AI_CONNECTION_COLUMNS =
  'id, provider, mode, status, label, key_last4, scopes, last_verified_at, created_at, revoked_at';

export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const tables: Record<string, unknown[] | { error: 'unavailable' }> = {};
  const omissions: string[] = [];

  for (const table of TENANT_TABLES) {
    const columns =
      table === 'launchpad_generated_documents'
        ? DOCUMENT_METADATA_COLUMNS
        : table === 'launchpad_ai_connections'
          ? AI_CONNECTION_COLUMNS
          : '*';
    const base = ctx.supabase.from(table).select(columns).eq('tenant_id', ctx.tenantId);
    // Audit events keep chain order so the export is verifiable offline.
    const { data, error } =
      table === 'launchpad_audit_events' ? await base.order('seq', { ascending: true }) : await base;
    if (error) {
      // One unreadable table must not kill the export — mark it honestly.
      tables[table] = { error: 'unavailable' };
      omissions.push(table);
      continue;
    }
    tables[table] = data ?? [];
  }

  // Resource cards are GLOBAL vendor-directory reference data: the table has
  // no tenant_id column (RLS shows active rows to every authenticated user),
  // so a tenant predicate is impossible by schema. Included, filtered to
  // active, so the export is the complete picture of what the workspace shows.
  const { data: cards, error: cardsError } = await ctx.supabase
    .from('launchpad_resource_cards')
    .select('*')
    .eq('active', true);
  if (cardsError) {
    tables['launchpad_resource_cards'] = { error: 'unavailable' };
    omissions.push('launchpad_resource_cards');
  } else {
    tables['launchpad_resource_cards'] = cards ?? [];
  }

  const rowCounts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(tables)) {
    if (Array.isArray(rows)) rowCounts[name] = rows.length;
  }

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'data_export',
    entity: 'launchpad_tenants',
    entityId: ctx.tenantId,
    payload: { rowCounts, omissions },
  });

  const body = {
    exported_at: new Date().toISOString(),
    tenant_id: ctx.tenantId,
    banner: 'COMMERCIAL // NON-CUI',
    // A partial export must SAY it is partial: omissions names every table
    // that could not be read (each also carries { error: 'unavailable' }).
    partial: omissions.length > 0,
    omissions,
    tables,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="launchpad-export.json"',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: NextRequest) {
  const result = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (result.error) return result.error;
  const { ctx } = result;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action.trim().slice(0, 40) : '';
  if (action !== 'request_deletion') {
    return NextResponse.json({ error: "action must be 'request_deletion'" }, { status: 400 });
  }

  // Surface the request in the tenant's own task list so it is visible where
  // work happens — a human confirms before anything is destroyed.
  const { data: task, error: taskError } = await ctx.supabase
    .from('launchpad_tasks')
    .insert({
      tenant_id: ctx.tenantId,
      title: 'Tenant deletion request',
      detail:
        `Deletion of this workspace was requested by ${ctx.user.email}. ` +
        'A human operator must confirm before anything is destroyed. Export your data first if you have not already.',
      kind: 'general',
      status: 'open',
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  const taskCreated = !taskError && !!task;

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'deletion_requested',
    entity: 'launchpad_tenants',
    entityId: ctx.tenantId,
    payload: { requestedBy: ctx.user.email, taskCreated },
  });

  return NextResponse.json({
    ok: true,
    taskCreated,
    note:
      'Deletion request recorded on the append-only audit trail' +
      (taskCreated ? ' and added to your task list' : '') +
      '. A human operator confirms with you before anything is destroyed — nothing is deleted silently, and read/export access stays available in the meantime.',
  });
}
