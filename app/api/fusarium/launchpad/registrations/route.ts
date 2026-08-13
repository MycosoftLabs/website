import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { scanTextForBoundary } from '@/lib/launchpad/boundary/dlp';

/**
 * Registrations — portal-account inventory + company-ops workbook rows, all
 * over launchpad_registration_records (migration 20260811090100_launchpad_asa).
 *
 * Real columns: id, tenant_id, kind, label, status, renewal_at (date),
 * data (jsonb), updated_by, updated_at. The pinned response contract is
 * adapted onto them:
 *
 *   record_type -> kind:
 *     'portal'                     portal account inventory rows
 *     'formation:<step-id>'        formation workbook checklist steps
 *     'clearance:<step-id>'        clearance-readiness checklist steps
 *     'clearance-screen:<q-id>'    FOCI / export-control screening answers
 *   portal, identifier, owner_name, authorized_rep, owner_email (the login
 *   email), mfa_method, last_verified_at, notes -> keys inside `data` jsonb
 *   status, renewal_at -> real columns
 *
 * NEVER stored: passwords, secrets, API keys, EIN values, DUNS numbers,
 * SF-86 material. A shape guard refuses credential-looking values and the
 * data-boundary scanner runs on every write.
 */

export const dynamic = 'force-dynamic';

const PORTALS = [
  'Login.gov', 'SAM.gov', 'SPRS', 'DSIP', 'Grants.gov', 'NSPIRES',
  'Research.gov', 'DIU', 'PIEE', 'DIBNet', 'other',
] as const;

const MFA_METHODS = [
  'authenticator_app', 'hardware_key', 'piv_cac', 'sms', 'phone_call', 'none_yet', 'other',
] as const;

// One whitelist serves all record types: portal lifecycle states, workbook
// step states (complete/pending), and screening answers (yes/no).
const STATUSES = [
  'active', 'in_progress', 'not_started', 'expired', 'retired', 'unknown',
  'complete', 'pending', 'yes', 'no',
] as const;

const RECORD_TYPE_RE =
  /^(portal|formation:[a-z0-9-]{1,40}|clearance:[a-z0-9-]{1,40}|clearance-screen:[a-z0-9-]{1,40})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PASSWORD_MSG =
  'Never store passwords or secrets here — use your password manager. ' +
  'Launchpad records the login email, owner, and MFA method only.';

/**
 * Credential shape guard. Emails pass; UEI/CAGE-style identifiers pass
 * (dots/dashes are not counted as a character class); password-shaped values
 * (no spaces, >=12 chars, 3+ character classes) and known key prefixes fail.
 */
function looksLikeSecret(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (EMAIL_RE.test(s)) return false;
  if (/-----BEGIN/.test(s)) return true;
  if (/\b(sk|pk|rk|ghp|gho|glpat|xox[a-z]?|pplx|AIza|AKIA|eyJ)[A-Za-z0-9_.-]{10,}/.test(s)) return true;
  if (!/\s/.test(s) && s.length >= 12) {
    let classes = 0;
    if (/[a-z]/.test(s)) classes += 1;
    if (/[A-Z]/.test(s)) classes += 1;
    if (/\d/.test(s)) classes += 1;
    if (/[^A-Za-z0-9._-]/.test(s)) classes += 1;
    if (classes >= 3) return true;
  }
  return false;
}

interface RegistrationRow {
  id: string;
  kind: string;
  label: string;
  status: string;
  renewal_at: string | null;
  data: Record<string, unknown> | null;
  updated_at: string;
}

function toRecord(row: RegistrationRow) {
  const d = (row.data ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : null);
  return {
    id: row.id,
    record_type: row.kind,
    label: row.label,
    portal: str('portal'),
    identifier: str('identifier'),
    owner_name: str('owner_name'),
    authorized_rep: str('authorized_rep'),
    owner_email: str('owner_email'),
    mfa_method: str('mfa_method'),
    status: row.status,
    last_verified_at: str('last_verified_at'),
    renewal_at: row.renewal_at,
    notes: str('notes'),
    updated_at: row.updated_at,
  };
}

/**
 * Validate + normalize the jsonb data fields shared by POST and PATCH.
 * Returns only the keys present in the body so PATCH can merge.
 */
function parseDataFields(
  body: Record<string, unknown>,
): { error: NextResponse; data?: never } | { error?: never; data: Record<string, string> } {
  const data: Record<string, string> = {};

  if (typeof body.portal === 'string' && body.portal) {
    if (!(PORTALS as readonly string[]).includes(body.portal)) {
      return { error: jsonError(400, 'validation_error', 'Unknown portal') };
    }
    data.portal = body.portal;
  }

  if (typeof body.identifier === 'string' && body.identifier.trim()) {
    const identifier = body.identifier.trim().slice(0, 120);
    if (/^\d{2}-?\d{7}$/.test(identifier) || /^\d{9}$/.test(identifier)) {
      return {
        error: jsonError(400, 'blocked_identifier',
          'That looks like an EIN or DUNS number. EIN values stay in your own systems, and DUNS is retired — use your UEI (issued by SAM.gov).'),
      };
    }
    if (looksLikeSecret(identifier)) return { error: jsonError(400, 'blocked_secret', PASSWORD_MSG) };
    data.identifier = identifier;
  }

  for (const key of ['owner_name', 'authorized_rep'] as const) {
    const camel = key === 'owner_name' ? 'ownerName' : 'authorizedRep';
    const raw = body[camel] ?? body[key];
    if (typeof raw === 'string' && raw.trim()) {
      const v = raw.trim().slice(0, 120);
      if (looksLikeSecret(v)) return { error: jsonError(400, 'blocked_secret', PASSWORD_MSG) };
      data[key] = v;
    }
  }

  const emailRaw = body.ownerEmail ?? body.owner_email;
  if (typeof emailRaw === 'string' && emailRaw.trim()) {
    const email = emailRaw.trim().slice(0, 200);
    if (looksLikeSecret(email)) return { error: jsonError(400, 'blocked_secret', PASSWORD_MSG) };
    if (!EMAIL_RE.test(email)) {
      return { error: jsonError(400, 'validation_error', 'Login email must be an email address (never a password).') };
    }
    data.owner_email = email;
  }

  const mfaRaw = body.mfaMethod ?? body.mfa_method;
  if (typeof mfaRaw === 'string' && mfaRaw) {
    if (!(MFA_METHODS as readonly string[]).includes(mfaRaw)) {
      return { error: jsonError(400, 'validation_error', 'Unknown MFA method') };
    }
    data.mfa_method = mfaRaw;
  }

  const verifiedRaw = body.lastVerifiedAt ?? body.last_verified_at;
  if (typeof verifiedRaw === 'string' && verifiedRaw) {
    if (!DATE_RE.test(verifiedRaw)) {
      return { error: jsonError(400, 'validation_error', 'last verified date must be YYYY-MM-DD') };
    }
    data.last_verified_at = verifiedRaw.slice(0, 10);
  }

  if (typeof body.notes === 'string' && body.notes.trim()) {
    const notes = body.notes.trim().slice(0, 1000);
    if (looksLikeSecret(notes)) return { error: jsonError(400, 'blocked_secret', PASSWORD_MSG) };
    data.notes = notes;
  }

  const dlp = scanTextForBoundary(JSON.stringify(data));
  if (dlp.blocked) {
    return { error: jsonError(400, 'boundary_blocked', 'Payload failed the data-boundary scan — remove identifiers, keys, or marked material.') };
  }
  return { data };
}

export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const { data, error } = await ctx.supabase
    .from('launchpad_registration_records')
    .select('id, kind, label, status, renewal_at, data, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .order('updated_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load registration records');

  return NextResponse.json({ records: ((data ?? []) as RegistrationRow[]).map(toRecord) });
}

export async function POST(request: NextRequest) {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  const parsed = await readJson<Record<string, unknown>>(request);
  if (!('body' in parsed)) return parsed.response;
  const body = parsed.body;

  const recordType = typeof body.recordType === 'string' ? body.recordType : '';
  if (!RECORD_TYPE_RE.test(recordType)) {
    return jsonError(400, 'validation_error', 'recordType must be portal, formation:<step>, clearance:<step>, or clearance-screen:<question>');
  }

  const fields = parseDataFields(body);
  if (fields.error) return fields.error;

  if (recordType === 'portal' && !fields.data.portal) {
    return jsonError(400, 'validation_error', 'portal is required for portal account records');
  }

  const status = typeof body.status === 'string' && (STATUSES as readonly string[]).includes(body.status)
    ? body.status
    : 'unknown';

  const renewalAt = typeof body.renewalAt === 'string' && DATE_RE.test(body.renewalAt)
    ? body.renewalAt.slice(0, 10)
    : null;

  const label = typeof body.label === 'string' && body.label.trim()
    ? body.label.trim().slice(0, 200)
    : fields.data.portal
      ? `${fields.data.portal} account`
      : recordType;
  if (looksLikeSecret(label)) return jsonError(400, 'blocked_secret', PASSWORD_MSG);

  const { data: row, error } = await ctx.supabase
    .from('launchpad_registration_records')
    .insert({
      tenant_id: ctx.tenantId,
      kind: recordType,
      label,
      status,
      renewal_at: renewalAt,
      data: fields.data,
      updated_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !row) return jsonError(500, 'create_failed', 'Could not record registration');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'registration.recorded',
    entity: 'launchpad_registration_records',
    entityId: row.id,
    payload: { recordType, status },
  });

  return NextResponse.json({ ok: true, id: row.id });
}

export async function PATCH(request: NextRequest) {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  const parsed = await readJson<Record<string, unknown>>(request);
  if (!('body' in parsed)) return parsed.response;
  const body = parsed.body;

  const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : '';
  if (!id) return jsonError(400, 'id_required', 'id required');

  const { data: existing, error: readErr } = await ctx.supabase
    .from('launchpad_registration_records')
    .select('id, kind, data')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle();
  if (readErr) return jsonError(500, 'load_failed', 'Could not load record');
  if (!existing) return jsonError(404, 'not_found', 'Record not found');

  const fields = parseDataFields(body);
  if (fields.error) return fields.error;

  const patch: Record<string, unknown> = {
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  };
  if (Object.keys(fields.data).length > 0) {
    patch.data = { ...((existing.data as Record<string, unknown>) ?? {}), ...fields.data };
  }
  if (typeof body.status === 'string') {
    if (!(STATUSES as readonly string[]).includes(body.status)) {
      return jsonError(400, 'validation_error', 'invalid status');
    }
    patch.status = body.status;
  }
  if ('renewalAt' in body) {
    if (body.renewalAt === null || body.renewalAt === '') patch.renewal_at = null;
    else if (typeof body.renewalAt === 'string' && DATE_RE.test(body.renewalAt)) patch.renewal_at = body.renewalAt.slice(0, 10);
    else return jsonError(400, 'validation_error', 'renewal date must be YYYY-MM-DD');
  }
  if (typeof body.label === 'string' && body.label.trim()) {
    const label = body.label.trim().slice(0, 200);
    if (looksLikeSecret(label)) return jsonError(400, 'blocked_secret', PASSWORD_MSG);
    patch.label = label;
  }

  const { error } = await ctx.supabase
    .from('launchpad_registration_records')
    .update(patch)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return jsonError(500, 'update_failed', 'Could not update record');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'registration.updated',
    entity: 'launchpad_registration_records',
    entityId: id,
    payload: { recordType: existing.kind, status: patch.status ?? null },
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: NextRequest) {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!UUID_RE.test(id)) return jsonError(400, 'id_required', 'id required');

  const { data: existing } = await ctx.supabase
    .from('launchpad_registration_records')
    .select('id, kind')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle();
  if (!existing) return jsonError(404, 'not_found', 'Record not found');

  const { error } = await ctx.supabase
    .from('launchpad_registration_records')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return jsonError(500, 'delete_failed', 'Could not delete record');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'registration.deleted',
    entity: 'launchpad_registration_records',
    entityId: id,
    payload: { recordType: existing.kind },
  });

  return NextResponse.json({ ok: true });
}
