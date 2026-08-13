import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capExceeded, entitlementDenied, jsonError, readJson } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { domesticContentEstimate } from '@/lib/launchpad/origin/screen';
import { originNeedsReplacement } from '@/lib/launchpad/origin/replace';

export const dynamic = 'force-dynamic';

/**
 * Validation-only input caps mirroring app/api/fusarium/launchpad/origin/bom/route.ts.
 * Returns `undefined` when a value is present but the wrong type / out of bounds
 * (callers turn that into a 400); absent/empty values become null.
 */
function cleanStr(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}
function cleanNum(v: unknown): number | null | undefined {
  if (v === undefined || v === null) return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
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
  if (parsed.ok === false) return parsed.response;
  const assembly = cleanStr(parsed.body.assembly, 120);
  const partNumber = cleanStr(parsed.body.partNumber, 120);
  const description = cleanStr(parsed.body.description, 300);
  const manufacturer = cleanStr(parsed.body.manufacturer, 200);
  const supplier = cleanStr(parsed.body.supplier, 200);
  const countryOfOrigin = cleanStr(parsed.body.countryOfOrigin, 80);
  const quantity = cleanNum(parsed.body.quantity);
  const unitCost = cleanNum(parsed.body.unitCost);
  if (
    assembly === undefined ||
    partNumber === undefined ||
    description === undefined ||
    manufacturer === undefined ||
    supplier === undefined ||
    countryOfOrigin === undefined ||
    quantity === undefined ||
    unitCost === undefined
  ) {
    return jsonError(400, 'validation_error', 'Invalid field: strings only for text fields; quantity/unitCost must be non-negative finite numbers');
  }
  const screened = originNeedsReplacement({
    partNumber: partNumber ?? undefined,
    description: description ?? undefined,
    manufacturer: manufacturer ?? undefined,
    supplier: supplier ?? undefined,
    countryOfOrigin: countryOfOrigin ?? undefined,
  });
  const flags = screened.flags;
  const { data, error } = await ctx.supabase
    .from('launchpad_bom_parts')
    .insert({
      tenant_id: ctx.tenantId,
      assembly,
      part_number: partNumber,
      description,
      quantity,
      unit_cost: unitCost,
      manufacturer,
      supplier,
      country_of_origin: countryOfOrigin,
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
  return NextResponse.json({ ok: true, id: data.id, flags, needsReplacementReview: screened.needsReplacementReview });
}
