import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capExceeded, entitlementDenied, jsonError } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import {
  buildStoredFlags,
  domesticContentByCost,
  isRedFlagged,
  substitutionNoteFrom,
} from '@/lib/launchpad/origin/bom-screening';

/**
 * Origin Graph BOM — CRUD over launchpad_bom_parts + summary.
 *
 * Metadata only (part identifiers, supplier names, origin, cost): no uploads,
 * no documents, no supplier credentials — the table has nowhere to put them.
 * Screening flags are recomputed server-side on every write from the PUBLIC
 * prohibited-source reference; they are review flags for the customer, never
 * a legal determination, and nothing here certifies domestic content.
 *
 * Contract:
 *   GET    -> { parts: [...], summary: { totalParts, domesticPct, flaggedCount } }
 *   POST   { description, partNumber?, assembly?, manufacturer?, supplier?,
 *            countryOfOrigin?, quantity?, unitCost?, prototypeOnly?, substitutionNote? }
 *   PATCH  { id, ...same optional fields }  (substitutionNote: null clears the note)
 *   DELETE { id }
 */

export const dynamic = 'force-dynamic';

const SELECT =
  'id, assembly, part_number, description, quantity, unit_cost, manufacturer, supplier, country_of_origin, origin_confidence, prototype_only, flags, created_at';

function str(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

/** Parse the JSON body exactly like the canonical evidence route: try/catch,
 * then manual per-field validation — no generic helper, no union narrowing. */
async function parseBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.originGraph) {
    return entitlementDenied('originGraph', derived.planKey, 'Origin Graph is not on this plan.');
  }
  const { data, error } = await ctx.supabase
    .from('launchpad_bom_parts')
    .select(SELECT)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(25000);
  if (error) return jsonError(500, 'load_failed', 'Could not load BOM');
  const parts = data ?? [];
  const domestic = domesticContentByCost(parts);
  return NextResponse.json({
    parts,
    summary: {
      totalParts: parts.length,
      domesticPct: domestic.domesticPct,
      flaggedCount: parts.filter((p) => isRedFlagged(p.flags)).length,
    },
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.originGraph) {
    return entitlementDenied('originGraph', derived.planKey, 'Origin Graph is not on this plan.');
  }

  // Server-side plan cap — count before insert, never trust the client.
  const { count } = await ctx.supabase
    .from('launchpad_bom_parts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId);
  const used = count ?? 0;
  const limit = derived.entitlements.bomLineLimit;
  if (used >= limit) {
    return capExceeded(
      'bomLineLimit',
      derived.planKey,
      used,
      limit,
      `Your plan includes ${limit} BOM lines and all are in use — upgrade to add more. Existing lines are untouched.`,
    );
  }

  const b = await parseBody(request);
  if (!b) return jsonError(400, 'invalid_json', 'Invalid JSON');

  const description = str(b.description, 300);
  if (!description) return jsonError(400, 'validation_error', 'Part name (description) required');
  const line = {
    description,
    partNumber: str(b.partNumber, 120),
    assembly: str(b.assembly, 120),
    manufacturer: str(b.manufacturer, 200),
    supplier: str(b.supplier, 200),
    countryOfOrigin: str(b.countryOfOrigin, 80),
  };
  const note = str(b.substitutionNote, 1000);
  const flags = buildStoredFlags(line, note);

  const { data, error } = await ctx.supabase
    .from('launchpad_bom_parts')
    .insert({
      tenant_id: ctx.tenantId,
      assembly: line.assembly,
      part_number: line.partNumber,
      description: line.description,
      quantity: num(b.quantity),
      unit_cost: num(b.unitCost),
      manufacturer: line.manufacturer,
      supplier: line.supplier,
      country_of_origin: line.countryOfOrigin,
      prototype_only: Boolean(b.prototypeOnly),
      flags,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record BOM line');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'bom.line.created',
    entity: 'launchpad_bom_parts',
    entityId: data.id,
    payload: { description, flagged: isRedFlagged(flags) },
  });
  return NextResponse.json({ ok: true, id: data.id, flags });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.originGraph) {
    return entitlementDenied('originGraph', derived.planKey, 'Origin Graph is not on this plan.');
  }

  const b = await parseBody(request);
  if (!b) return jsonError(400, 'invalid_json', 'Invalid JSON');
  const id = typeof b.id === 'string' ? b.id : '';
  if (!id) return jsonError(400, 'id_required', 'id required');

  const { data: existing, error: readErr } = await ctx.supabase
    .from('launchpad_bom_parts')
    .select(SELECT)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle();
  if (readErr) return jsonError(500, 'load_failed', 'Could not load BOM line');
  if (!existing) return jsonError(404, 'not_found', 'BOM line not found');

  // Merge: provided keys win (validated), absent keys keep their stored value.
  const merged = {
    description: 'description' in b ? str(b.description, 300) : (existing.description as string | null),
    partNumber: 'partNumber' in b ? str(b.partNumber, 120) : (existing.part_number as string | null),
    assembly: 'assembly' in b ? str(b.assembly, 120) : (existing.assembly as string | null),
    manufacturer: 'manufacturer' in b ? str(b.manufacturer, 200) : (existing.manufacturer as string | null),
    supplier: 'supplier' in b ? str(b.supplier, 200) : (existing.supplier as string | null),
    countryOfOrigin: 'countryOfOrigin' in b ? str(b.countryOfOrigin, 80) : (existing.country_of_origin as string | null),
  };
  if (!merged.description) return jsonError(400, 'validation_error', 'Part name (description) required');

  // Screening flags are recomputed; the customer's substitution note is
  // preserved unless the request explicitly sets or clears it.
  const note = 'substitutionNote' in b ? str(b.substitutionNote, 1000) : substitutionNoteFrom(existing.flags);
  const flags = buildStoredFlags(merged, note);

  const { error } = await ctx.supabase
    .from('launchpad_bom_parts')
    .update({
      description: merged.description,
      part_number: merged.partNumber,
      assembly: merged.assembly,
      manufacturer: merged.manufacturer,
      supplier: merged.supplier,
      country_of_origin: merged.countryOfOrigin,
      quantity: 'quantity' in b ? num(b.quantity) : (existing.quantity as number | null),
      unit_cost: 'unitCost' in b ? num(b.unitCost) : (existing.unit_cost as number | null),
      prototype_only: 'prototypeOnly' in b ? Boolean(b.prototypeOnly) : Boolean(existing.prototype_only),
      flags,
    })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return jsonError(500, 'update_failed', 'Could not update BOM line');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'bom.line.updated',
    entity: 'launchpad_bom_parts',
    entityId: id,
    payload: { flagged: isRedFlagged(flags), noteSet: 'substitutionNote' in b },
  });
  return NextResponse.json({ ok: true, id, flags });
}

export async function DELETE(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;

  let id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id) {
    const body = await request.json().catch(() => null);
    if (body && typeof body.id === 'string') id = body.id;
  }
  if (!id) return jsonError(400, 'id_required', 'id required');

  const { error } = await ctx.supabase
    .from('launchpad_bom_parts')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return jsonError(500, 'delete_failed', 'Could not remove BOM line');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'bom.line.deleted',
    entity: 'launchpad_bom_parts',
    entityId: id,
  });
  return NextResponse.json({ ok: true, id });
}
