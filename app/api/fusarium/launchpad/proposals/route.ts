import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capExceeded, jsonError } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import {
  PORTAL_KEYS,
  seedChecklist,
  type ChecklistItem,
  type MatrixRow,
  type PortalKey,
} from '@/lib/launchpad/proposal-templates';

/**
 * Proposal workspaces over launchpad_proposal_workspaces.
 *
 * The row's jsonb carries the working structures:
 *   sections          → { portal, opportunity_ref, checklist: ChecklistItem[] }
 *   compliance_matrix → MatrixRow[]
 * References and task text only — never proposal content, uploads, or CUI.
 * `submitted_by_customer` is a customer-recorded fact: Launchpad never performs
 * binding submission on any government portal.
 */

const STATUSES = ['draft', 'in_review', 'authorized', 'submitted_by_customer', 'closed'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

interface SectionsMeta {
  portal?: PortalKey | null;
  opportunity_ref?: string | null;
  checklist?: ChecklistItem[];
}

/** sections defaults to '[]'::jsonb on legacy rows — only trust a plain object. */
function readMeta(sections: unknown): SectionsMeta {
  if (sections && typeof sections === 'object' && !Array.isArray(sections)) {
    return sections as SectionsMeta;
  }
  return {};
}

function sanitizeChecklist(raw: unknown): ChecklistItem[] | null {
  if (!Array.isArray(raw) || raw.length > 100) return null;
  const out: ChecklistItem[] = [];
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const r = entry as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim().slice(0, 64) : '';
    const label = typeof r.label === 'string' ? r.label.trim().slice(0, 400) : '';
    if (!id || !label) return null;
    out.push({
      id,
      label,
      done: r.done === true,
      done_at: typeof r.done_at === 'string' ? r.done_at.slice(0, 40) : null,
    });
  }
  return out;
}

function sanitizeMatrix(raw: unknown): MatrixRow[] | null {
  if (!Array.isArray(raw) || raw.length > 200) return null;
  const out: MatrixRow[] = [];
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const r = entry as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim().slice(0, 64) : '';
    const requirement = typeof r.requirement === 'string' ? r.requirement.trim().slice(0, 600) : '';
    if (!id || !requirement) return null;
    out.push({
      id,
      requirement,
      section: typeof r.section === 'string' ? r.section.trim().slice(0, 200) : '',
      status: r.status === 'addressed' ? 'addressed' : 'open',
    });
  }
  return out;
}

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const limit = derived.entitlements?.proposalWorkspaces ?? 0;
  const { data, error } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .select('id, opportunity_id, title, status, sections, created_at, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .order('updated_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load proposals');
  const workspaces = (data ?? []).map((row) => {
    const meta = readMeta(row.sections);
    return {
      id: row.id,
      title: row.title,
      opportunity_ref: meta.opportunity_ref ?? row.opportunity_id ?? null,
      portal: meta.portal ?? null,
      status: row.status,
      checklist: Array.isArray(meta.checklist) ? meta.checklist : [],
      created_at: row.created_at,
      opportunity_id: row.opportunity_id,
      updated_at: row.updated_at,
    };
  });
  return NextResponse.json({
    workspaces,
    limit,
    note:
      workspaces.length === 0
        ? limit === 0
          ? 'This plan includes 0 proposal workspaces. Upgrade to Contractor Ops or above.'
          : 'No proposal workspaces yet. Launchpad never performs binding submission.'
        : 'submitted_by_customer is a customer-recorded fact.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const limit = derived.entitlements?.proposalWorkspaces ?? 0;
  if (limit <= 0) {
    return capExceeded('proposalWorkspaces', derived.planKey, 0, 0, 'This plan includes 0 proposal workspaces.');
  }
  const { count } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId);
  const used = count ?? 0;
  if (used >= limit) {
    return capExceeded('proposalWorkspaces', derived.planKey, used, limit, `Proposal workspace cap (${limit}) reached.`);
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Invalid JSON');
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 300) : '';
  if (!title) return jsonError(400, 'validation_error', 'title required');
  const portal: PortalKey = (PORTAL_KEYS as readonly string[]).includes(String(body.portal))
    ? (body.portal as PortalKey)
    : 'other';
  const opportunityRef =
    typeof body.opportunityRef === 'string' ? body.opportunityRef.trim().slice(0, 200) : '';
  const opportunityId =
    typeof body.opportunityId === 'string' && UUID_RE.test(body.opportunityId)
      ? body.opportunityId
      : null;

  const { data, error } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .insert({
      tenant_id: ctx.tenantId,
      title,
      opportunity_id: opportunityId,
      sections: {
        portal,
        opportunity_ref: opportunityRef || null,
        checklist: seedChecklist(portal),
      },
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not create workspace');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'proposal.created',
    entity: 'launchpad_proposal_workspaces',
    entityId: data.id,
    payload: { title, portal, opportunityRefPresent: !!opportunityRef },
  });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Invalid JSON');
  }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return jsonError(400, 'id_required', 'id required');
  const status = typeof body.status === 'string' ? body.status : '';
  if (status && !(STATUSES as readonly string[]).includes(status)) {
    return jsonError(400, 'validation_error', 'invalid status');
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const changed: string[] = [];
  if (status) { patch.status = status; changed.push('status'); }
  if (typeof body.title === 'string') {
    const title = body.title.trim().slice(0, 300);
    if (!title) return jsonError(400, 'validation_error', 'title cannot be empty');
    patch.title = title;
    changed.push('title');
  }

  if (body.complianceMatrix !== undefined) {
    const matrix = sanitizeMatrix(body.complianceMatrix);
    if (matrix === null) return jsonError(400, 'validation_error', 'invalid complianceMatrix');
    patch.compliance_matrix = matrix;
    changed.push('compliance_matrix');
  }

  // Checklist / opportunity_ref live inside sections — merge with what exists
  // so a checklist toggle never clobbers portal or the reference.
  const touchesSections = body.checklist !== undefined || body.opportunityRef !== undefined;
  if (touchesSections) {
    const { data: row, error: rowErr } = await ctx.supabase
      .from('launchpad_proposal_workspaces')
      .select('sections')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .maybeSingle();
    if (rowErr || !row) return jsonError(404, 'not_found', 'Proposal workspace not found');
    const meta = readMeta(row.sections);
    if (body.checklist !== undefined) {
      const checklist = sanitizeChecklist(body.checklist);
      if (checklist === null) return jsonError(400, 'validation_error', 'invalid checklist');
      meta.checklist = checklist;
      changed.push('checklist');
    }
    if (body.opportunityRef !== undefined) {
      meta.opportunity_ref =
        typeof body.opportunityRef === 'string'
          ? body.opportunityRef.trim().slice(0, 200) || null
          : null;
      changed.push('opportunity_ref');
    }
    patch.sections = meta;
  }

  if (changed.length === 0) return jsonError(400, 'validation_error', 'nothing to update');

  const { error } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .update(patch)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return jsonError(500, 'update_failed', 'Could not update workspace');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'proposal.updated',
    entity: 'launchpad_proposal_workspaces',
    entityId: id,
    payload: { changed, status: status || undefined },
  });
  return NextResponse.json({ ok: true, id });
}
