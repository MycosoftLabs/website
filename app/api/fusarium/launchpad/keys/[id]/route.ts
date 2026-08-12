import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { mapApiKeyRpcError, revokeApiKeyViaRpc } from '@/lib/launchpad/api-keys';

/**
 * DELETE /api/fusarium/launchpad/keys/:id — revoke (owner/admin).
 * Same semantics as DELETE /keys?id=:id.
 */
export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;

  const { id } = await context.params;
  const keyId = typeof id === 'string' ? id.trim() : '';
  if (!keyId) {
    return NextResponse.json({ error: 'id required', code: 'id_required' }, { status: 400 });
  }

  const revoked = await revokeApiKeyViaRpc(gate.ctx.supabase, keyId);
  if (!revoked.ok) {
    return mapApiKeyRpcError(revoked.error, 'revoke');
  }
  return NextResponse.json({ ok: true, id: keyId, revoked: true });
}
