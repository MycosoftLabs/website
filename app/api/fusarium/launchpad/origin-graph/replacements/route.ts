import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

/**
 * Validation-only input caps mirroring app/api/fusarium/launchpad/origin/bom/route.ts.
 * Returns `undefined` when a value is present but not a string (callers turn
 * that into a 400); absent/empty values become null.
 */
function cleanStr(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_bom_replacements')
    .select(
      'id, bom_part_id, candidate_part_number, candidate_manufacturer, candidate_country, notes, created_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load replacements');
  return NextResponse.json({
    replacements: data ?? [],
    note:
      (data ?? []).length === 0
        ? 'No customer-authored replacement candidates yet. Launchpad does not invent substitute part numbers.'
        : 'Replacements are customer-recorded candidates, not certified equivalents.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    bomPartId?: string;
    candidatePartNumber?: string;
    candidateManufacturer?: string;
    candidateCountry?: string;
    notes?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const bomPartId = typeof parsed.body.bomPartId === 'string' ? parsed.body.bomPartId : '';
  if (!bomPartId) return jsonError(400, 'validation_error', 'bomPartId required');
  const candidatePartNumber = cleanStr(parsed.body.candidatePartNumber, 120);
  const candidateManufacturer = cleanStr(parsed.body.candidateManufacturer, 200);
  const candidateCountry = cleanStr(parsed.body.candidateCountry, 80);
  const notes = cleanStr(parsed.body.notes, 1000);
  if (
    candidatePartNumber === undefined ||
    candidateManufacturer === undefined ||
    candidateCountry === undefined ||
    notes === undefined
  ) {
    return jsonError(400, 'validation_error', 'candidatePartNumber/candidateManufacturer/candidateCountry/notes must be strings');
  }
  const { data: part } = await ctx.supabase
    .from('launchpad_bom_parts')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', bomPartId)
    .maybeSingle();
  if (!part) return jsonError(404, 'not_found', 'BOM line not in this tenant');
  const { data, error } = await ctx.supabase
    .from('launchpad_bom_replacements')
    .insert({
      tenant_id: ctx.tenantId,
      bom_part_id: bomPartId,
      candidate_part_number: candidatePartNumber,
      candidate_manufacturer: candidateManufacturer,
      candidate_country: candidateCountry,
      notes,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record replacement');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'bom.replacement.recorded',
    entity: 'launchpad_bom_replacements',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
