import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';

/**
 * Formation checklist reuses registration_records (kind=formation|clerky|ein_path|pulley).
 * EIN *values* are blocked on the registrations BFF.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data } = await ctx.supabase
    .from('launchpad_registration_records')
    .select('id, kind, label, status, renewal_at, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .in('kind', ['formation', 'clerky', 'ein_path', 'pulley', 'insurance']);
  const records = data ?? [];
  return NextResponse.json({
    records,
    checklist: [
      { key: 'entity', label: 'Entity formed (Clerky or counsel)' },
      { key: 'registered_agent', label: 'Registered agent' },
      { key: 'ein_path', label: 'EIN obtained — value stored in customer system, not here' },
      { key: 'ip_assignment', label: 'Founder IP assignment' },
      { key: 'board_records', label: 'Board / stockholder records' },
      { key: 'insurance', label: 'Insurance' },
      { key: 'cap_table', label: 'Cap table administrator (e.g. Pulley) — holdings not stored here' },
    ],
    note:
      records.length === 0
        ? 'No formation records yet. POST to /company/registrations with kind=formation|clerky|ein_path|pulley. EIN values and cap-table PII are not stored.'
        : undefined,
  });
}
