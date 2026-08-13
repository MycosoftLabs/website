import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capExceeded, entitlementDenied, jsonError, readJson } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { domesticContentEstimate, screenBomPart } from '@/lib/launchpad/origin/screen';

export const dynamic = 'force-dynamic';

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
    .select(
      'id, assembly, part_number, description, quantity, unit_cost, manufacturer, supplier, country_of_origin, origin_confidence, prototype_only, flags, created_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return jsonError(500, 'load_failed', 'Could not load BOM');
  const parts = data ?? [];
  return NextResponse.json({
    parts,
    lineCount: parts.length,
    lineLimit: derived.entitlements.bomLineLimit,
    domesticContent: domesticContentEstimate(
      parts.map((p) => ({
        countryOfOrigin: p.country_of_origin as string | undefined,
        quantity: p.quantity as number | undefined,
        unitCost: p.unit_cost as number | undefined,
      })),
    ),
    note:
      parts.length === 0
        ? 'No BOM lines yet. Origin Graph does not invent federal supply data.'
        : 'Section 889 flags are for customer review. Launchpad does not certify domestic content.',
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
  const { count } = await ctx.supabase
    .from('launchpad_bom_parts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId);
  const used = count ?? 0;
  const limit = derived.entitlements.bomLineLimit;
  if (used >= limit) {
    return capExceeded('bomLineLimit', derived.planKey, used, limit, `BOM line limit (${limit}) reached.`);
  }
  const parsed = await readJson<{
    assembly?: string;
    partNumber?: string;
    description?: string;
    quantity?: number;
    unitCost?: number;
    manufacturer?: string;
    supplier?: string;
    countryOfOrigin?: string;
    prototypeOnly?: boolean;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const flags = screenBomPart({
    partNumber: parsed.body.partNumber,
    description: parsed.body.description,
    manufacturer: parsed.body.manufacturer,
    supplier: parsed.body.supplier,
    countryOfOrigin: parsed.body.countryOfOrigin,
  });
  const { data, error } = await ctx.supabase
    .from('launchpad_bom_parts')
    .insert({
      tenant_id: ctx.tenantId,
      assembly: parsed.body.assembly ?? null,
      part_number: parsed.body.partNumber ?? null,
      description: parsed.body.description ?? null,
      quantity: typeof parsed.body.quantity === 'number' ? parsed.body.quantity : null,
      unit_cost: typeof parsed.body.unitCost === 'number' ? parsed.body.unitCost : null,
      manufacturer: parsed.body.manufacturer ?? null,
      supplier: parsed.body.supplier ?? null,
      country_of_origin: parsed.body.countryOfOrigin ?? null,
      prototype_only: Boolean(parsed.body.prototypeOnly),
      flags,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record BOM line');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'bom.line.created',
    entity: 'launchpad_bom_parts',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id, flags });
}
