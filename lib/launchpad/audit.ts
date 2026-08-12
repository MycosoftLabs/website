/**
 * FUSARIUM Launchpad — audit event helper.
 *
 * Appends to the per-tenant hash-chained ledger (launchpad_audit_events).
 * The chain fields (seq / prev_hash / hash) are computed by a database trigger
 * under an advisory lock — whatever we send for them is overwritten, and
 * UPDATE/DELETE are revoked from every role including service_role.
 *
 * Callers pass the SESSION-scoped client from requireTenant() so RLS proves
 * tenant membership on insert. Audit failures are logged but never break the
 * user action: the action itself remains the source of truth; the ledger is
 * the trail.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export interface AuditInput {
  action: string; // e.g. 'control.state.changed'
  entity?: string; // table/type, e.g. 'launchpad_control_states'
  entityId?: string;
  /** Arbitrary detail — hashed, never stored raw, so no payload can smuggle content. */
  payload?: unknown;
  actorType?: 'user' | 'service' | 'system';
}

export function hashPayload(payload: unknown): string | null {
  if (payload === undefined || payload === null) return null;
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function appendAuditEvent(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string | null,
  input: AuditInput,
): Promise<void> {
  const { error } = await supabase.from('launchpad_audit_events').insert({
    tenant_id: tenantId,
    actor_user_id: userId,
    actor_type: input.actorType ?? 'user',
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entityId ?? null,
    payload_hash: hashPayload(input.payload),
    // seq/prev_hash/hash are trigger-computed; placeholders satisfy NOT NULL
    // on the insert payload shape but are overwritten before write.
    prev_hash: 'PENDING',
    hash: 'PENDING',
  });
  if (error) {
    console.error(`[launchpad/audit] append failed (${input.action}):`, error.message);
  }
}
