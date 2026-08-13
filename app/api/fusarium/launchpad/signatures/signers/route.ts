import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { data, error } = await gate.ctx.supabase
    .from('launchpad_signer_roles')
    .select('id, name, email, title, is_authorized_official, mfa_confirmed_at, created_at')
    .eq('tenant_id', gate.ctx.tenantId)
    .order('created_at', { ascending: true });
  if (error) return jsonError(500, 'load_failed', 'Could not load signer roles');
  const { data: officials } = await gate.ctx.supabase
    .from('launchpad_authorized_officials')
    .select('id, name, email, title, mfa_confirmed_at')
    .eq('tenant_id', gate.ctx.tenantId);
  return NextResponse.json({
    signers: data ?? [],
    authorizedOfficials: officials ?? [],
    note: 'Mycosoft is never the affirming official. Register the humans who actually sign.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (gate.error) return gate.error;
  const parsed = await readJson<{
    name?: string;
    email?: string;
    title?: string;
    isAuthorizedOfficial?: boolean;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const name = typeof parsed.body.name === 'string' ? parsed.body.name.trim().slice(0, 200) : '';
  const email = typeof parsed.body.email === 'string' ? parsed.body.email.trim().slice(0, 320).toLowerCase() : '';
  if (!name || !email || !email.includes('@')) {
    return jsonError(400, 'validation_error', 'name and email required');
  }
  const { data, error } = await gate.ctx.supabase
    .from('launchpad_signer_roles')
    .insert({
      tenant_id: gate.ctx.tenantId,
      name,
      email,
      title: typeof parsed.body.title === 'string' ? parsed.body.title.trim().slice(0, 120) : null,
      is_authorized_official: Boolean(parsed.body.isAuthorizedOfficial),
      created_by: gate.ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) {
    if (error?.code === '23505') return jsonError(409, 'duplicate_signer', 'That email is already registered');
    return jsonError(500, 'create_failed', 'Could not save signer');
  }
  await appendAuditEvent(gate.ctx.supabase, gate.ctx.tenantId, gate.ctx.user.id, {
    action: 'signature.signer.added',
    entity: 'launchpad_signer_roles',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
