/**
 * Guardian command-request BFF — proxies MAS 188 `POST /api/guardian/commands/request`.
 *
 * This is a REQUEST path, never an execution path. The website asks Guardian
 * whether an operator-initiated action may proceed; Guardian returns
 * `allowed | requires_approval | denied` plus a durable, correlated record.
 * The website never performs the underlying device action, and never renders a
 * request as a completed change.
 *
 * SECURITY: `actor` is taken from the authenticated session, NOT from the
 * request body. A client-supplied actor would let a caller attribute a
 * security action to someone else, which would poison the audit trail this
 * control exists to produce. `correlation_id` is likewise minted server-side.
 *
 * @date July 26, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-auth';
import { masFetch, masBase } from '@/lib/security/soc/mas-bff';

export const dynamic = 'force-dynamic';

/** Actions the UI may request. Anything else is rejected before it reaches MAS. */
const ALLOWED_ACTIONS = new Set([
  'device.restart',
  'device.isolate',
  'device.upgrade',
  'device.logs',
  'client.block',
  'client.unblock',
  'client.reconnect',
  'client.set_bandwidth',
]);

/** Policy classes MAS understands; the UI must declare the risk it is asking for. */
const ALLOWED_POLICY_CLASSES = new Set(['read', 'low_impact', 'disruptive', 'high_risk']);

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  if (!masBase()) {
    return NextResponse.json(
      { error: 'MAS not configured', state: 'unavailable', decision: null },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const action = String(body.action ?? '');
  const policyClass = String(body.policy_class ?? '');
  const reason = String(body.reason ?? '').trim();
  const target = (body.target ?? null) as Record<string, unknown> | null;

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: `Unsupported action: ${action || '(none)'}`, decision: null }, { status: 400 });
  }
  if (!ALLOWED_POLICY_CLASSES.has(policyClass)) {
    return NextResponse.json({ error: `Unsupported policy_class: ${policyClass || '(none)'}`, decision: null }, { status: 400 });
  }
  // A reason is mandatory: it is the operator's justification in the audit
  // record, and Guardian/HITL review is meaningless without it.
  if (reason.length < 8) {
    return NextResponse.json({ error: 'A reason of at least 8 characters is required.', decision: null }, { status: 400 });
  }

  const correlationId = crypto.randomUUID();

  const res = await masFetch('/api/guardian/commands/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actor: auth.user.email,          // session-derived — never client-supplied
      reason,
      target: target ?? {},
      action,
      policy_class: policyClass,
      correlation_id: correlationId,
    }),
    timeoutMs: 10000,
  });

  if (!res.ok) {
    // Fail closed: an unreachable or erroring Guardian is NOT permission.
    return NextResponse.json(
      {
        state: 'unavailable',
        decision: null,
        correlation_id: correlationId,
        reason: res.status === 0 ? 'Guardian unreachable — request not recorded.' : `Guardian returned HTTP ${res.status}.`,
        durable_recorded: false,
        executable: false,
      },
      { status: 502 },
    );
  }

  const d = res.body ?? {};
  return NextResponse.json({
    state: 'healthy',
    decision: d.decision ?? null,
    correlation_id: d.correlation_id ?? correlationId,
    run_id: d.run_id ?? null,
    reason: d.reason ?? null,
    durable_recorded: Boolean(d.durable_recorded),
    // `executable` is Guardian's word on whether the action may actually run.
    // The UI must not imply anything happened when this is false.
    executable: Boolean(d.executable),
    requested_action: action,
    source: 'MAS 188 /api/guardian/commands/request',
  });
}
