import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import {
  API_KEY_SCOPES,
  createApiKeyViaRpc,
  listApiKeysMeta,
  mapApiKeyRpcError,
  parseScopes,
  revokeApiKeyViaRpc,
  type ApiKeyScope,
} from '@/lib/launchpad/api-keys';

/**
 * Tenant API key management.
 * GET  — list metadata (prefix, name, scopes); never hashes
 * POST — create (plaintext returned once)
 * DELETE ?id= — revoke (also DELETE /keys/[id])
 *
 * Note: project tsconfig has strictNullChecks off, so result unions are
 * accessed via explicit failure helpers rather than control-flow narrowing.
 */
export const dynamic = 'force-dynamic';

function failMessage(result: { ok: boolean; error?: string }, fallback: string): string {
  return typeof result.error === 'string' && result.error.length > 0 ? result.error : fallback;
}

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;

  const listed = await listApiKeysMeta(ctx.supabase, ctx.tenantId);
  if (listed.ok) {
    return NextResponse.json({
      keys: listed.keys,
      scopes: API_KEY_SCOPES,
      note: 'Hashes are never returned. Create returns plaintext once.',
    });
  }

  return NextResponse.json(
    {
      error: failMessage(listed, 'list failed'),
      code: 'list_failed',
      keys: [],
      hint: 'Apply migration 20260812120000_launchpad_api_keys.sql if the table is missing.',
    },
    { status: 503 },
  );
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;

  let body: { name?: string; scopes?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name required', code: 'name_required' }, { status: 400 });
  }

  const scopes = parseScopes(body.scopes);
  if (scopes.length === 0) {
    return NextResponse.json(
      { error: 'scopes required', code: 'scopes_required', allowed: API_KEY_SCOPES },
      { status: 400 },
    );
  }

  const created = await createApiKeyViaRpc(ctx.supabase, ctx.tenantId, name, scopes as ApiKeyScope[]);
  if (created.ok) {
    return NextResponse.json({
      ok: true,
      id: created.id,
      keyPrefix: created.keyPrefix,
      scopes: created.scopes,
      createdAt: created.createdAt,
      /** Shown once — store securely; not retrievable later. */
      plaintextKey: created.plaintextKey,
      warning: 'Copy plaintextKey now. It will not be shown again.',
    });
  }

  return mapApiKeyRpcError(failMessage(created, 'create failed'), 'create');
}

export async function DELETE(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;

  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json(
      { error: 'id query param required', code: 'id_required' },
      { status: 400 },
    );
  }

  const revoked = await revokeApiKeyViaRpc(gate.ctx.supabase, id);
  if (revoked.ok) {
    return NextResponse.json({ ok: true, id, revoked: true });
  }
  return mapApiKeyRpcError(failMessage(revoked, 'revoke failed'), 'revoke');
}
