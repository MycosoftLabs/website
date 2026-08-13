import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capText, jsonError, looksLikeSecret, parseIsoDate, readJson } from '@/lib/launchpad/http';
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
  if (parsed.ok === false) return parsed.response;
  const kind = typeof parsed.body.kind === 'string' ? parsed.body.kind : '';
  const label = capText(parsed.body.label, 200);
  if (!(KINDS as readonly string[]).includes(kind) || !label) {
    return jsonError(400, 'validation_error', 'kind (allowed enum) and label required');
  }
  const data = parsed.body.data && typeof parsed.body.data === 'object' ? parsed.body.data : {};
  const keys = Object.keys(data);
  if (keys.length > 40) {
    return jsonError(400, 'validation_error', 'Registration data has too many keys');
  }
  for (const key of keys) {
    if (key.length > 80) return jsonError(400, 'validation_error', 'Registration data key too long');
    if (BLOCKED.some((b) => key.toLowerCase().includes(b))) {
      return jsonError(400, 'blocked_field', `Field "${key}" is not stored. Portal passwords, DUNS, and EINs stay in customer systems.`);
    }
    const value = data[key];
    if (typeof value === 'string') {
      if (value.length > 500) return jsonError(400, 'validation_error', `Field "${key}" exceeds 500 characters`);
      if (looksLikeSecret(value)) {
        return jsonError(400, 'blocked_field', `Field "${key}" looks like a secret and is not stored.`);
      }
    } else if (value != null && typeof value !== 'number' && typeof value !== 'boolean') {
      return jsonError(400, 'validation_error', `Field "${key}" must be a string, number, or boolean`);
    }
  }
  const blob = JSON.stringify(data);
  if (blob.length > 8000) return jsonError(400, 'validation_error', 'Registration payload too large');
  const dlp = scanTextForBoundary(blob);
  if (dlp.blocked) return jsonError(400, 'boundary_blocked', 'Registration payload failed the data-boundary scan.');
  if ('login_password' in data || 'password' in data || 'duns' in data) {
    return jsonError(400, 'blocked_field', 'Passwords and DUNS numbers are not stored.');
  }
  const renewal = parseIsoDate(parsed.body.renewalAt);
  if (renewal.ok === false) {
    return jsonError(400, 'validation_error', 'renewalAt must be a valid ISO date');
  }
  const { data: row, error } = await ctx.supabase
    .from('launchpad_registration_records')
    .insert({
      tenant_id: ctx.tenantId,
      kind,
      label,
      status: capText(parsed.body.status, 80) || 'unknown',
      renewal_at: renewal.iso,
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
