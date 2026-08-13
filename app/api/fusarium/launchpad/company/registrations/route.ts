import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { scanTextForBoundary } from '@/lib/launchpad/boundary/dlp';

const KINDS = [
  'sam',
  'uei',
  'cage',
  'dsip',
  'grants_gov',
  'portal',
  'insurance',
  'formation',
  'clerky',
  'ein_path',
  'pulley',
  'other',
] as const;

const BLOCKED = ['password', 'duns', 'ssn', 'ein', 'secret'];

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_registration_records')
    .select('id, kind, label, status, renewal_at, data, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .order('updated_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load registration records');
  const records = data ?? [];
  return NextResponse.json({
    records,
    kinds: KINDS,
    note:
      records.length === 0
        ? 'No registration records yet. Store portal email, MFA method, owner, renewal — never a password or DUNS number.'
        : 'Login email only. Never passwords. Never DUNS.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    kind?: string;
    label?: string;
    status?: string;
    renewalAt?: string;
    data?: Record<string, unknown>;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const kind = typeof parsed.body.kind === 'string' ? parsed.body.kind : '';
  const label = typeof parsed.body.label === 'string' ? parsed.body.label.trim().slice(0, 200) : '';
  if (!(KINDS as readonly string[]).includes(kind) || !label) {
    return jsonError(400, 'validation_error', 'kind (allowed enum) and label required');
  }
  const data = parsed.body.data && typeof parsed.body.data === 'object' ? parsed.body.data : {};
  for (const key of Object.keys(data)) {
    if (BLOCKED.some((b) => key.toLowerCase().includes(b))) {
      return jsonError(400, 'blocked_field', `Field "${key}" is not stored. Portal passwords, DUNS, and EINs stay in customer systems.`);
    }
  }
  const blob = JSON.stringify(data);
  const dlp = scanTextForBoundary(blob);
  if (dlp.blocked) return jsonError(400, 'boundary_blocked', 'Registration payload failed the data-boundary scan.');
  if ('login_password' in data || 'password' in data || 'duns' in data) {
    return jsonError(400, 'blocked_field', 'Passwords and DUNS numbers are not stored.');
  }
  const { data: row, error } = await ctx.supabase
    .from('launchpad_registration_records')
    .insert({
      tenant_id: ctx.tenantId,
      kind,
      label,
      status: typeof parsed.body.status === 'string' ? parsed.body.status.slice(0, 80) : 'unknown',
      renewal_at: parsed.body.renewalAt || null,
      data,
      updated_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !row) return jsonError(500, 'create_failed', 'Could not record registration');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'registration.recorded',
    entity: 'launchpad_registration_records',
    entityId: row.id,
  });
  return NextResponse.json({ ok: true, id: row.id });
}
