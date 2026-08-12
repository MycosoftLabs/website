import { NextRequest, NextResponse } from 'next/server';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { isLaunchpadEnabled } from '@/lib/launchpad/flags';
import {
  deriveAgentHmacKey,
  getAgentRootSecret,
  replayFingerprint,
  verifyAgentSignature,
} from '@/lib/launchpad/agent/hmac';

/**
 * Local Assurance Agent result intake — HMAC-signed.
 * tenant_id ALWAYS from agent row; never from payload.
 */
export const dynamic = 'force-dynamic';

const RESULT_VALUES = new Set(['pass', 'fail', 'indeterminate', 'not_applicable']);

/** In-memory replay cache for this process (best-effort; DB uniqueness preferred long-term). */
const recentReplays = new Map<string, number>();

function pruneReplays(nowSec: number) {
  for (const [k, exp] of recentReplays) {
    if (exp < nowSec) recentReplays.delete(k);
  }
}

export async function POST(request: NextRequest) {
  if (!isLaunchpadEnabled()) {
    return NextResponse.json({ error: 'Not found', code: 'launchpad_disabled' }, { status: 404 });
  }

  const root = getAgentRootSecret();
  if (!root) {
    return NextResponse.json({ error: 'agent root secret not configured' }, { status: 503 });
  }

  const agentId = request.headers.get('x-lp-agent-id') ?? '';
  const timestamp = request.headers.get('x-lp-timestamp') ?? '';
  const signature = request.headers.get('x-lp-signature') ?? '';
  if (!agentId || !timestamp || !signature) {
    return NextResponse.json(
      { error: 'missing X-LP-Agent-Id / X-LP-Timestamp / X-LP-Signature' },
      { status: 401 },
    );
  }

  const rawBody = await request.text();
  const hmacKey = deriveAgentHmacKey(root, agentId);
  const verified = verifyAgentSignature({
    hmacKey,
    timestampHeader: timestamp,
    signatureHeader: signature,
    rawBody,
  });
  if (verified.ok === false) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const fp = replayFingerprint(agentId, verified.timestampSec, signature.trim().toLowerCase());
  const nowSec = Math.floor(Date.now() / 1000);
  pruneReplays(nowSec);
  if (recentReplays.has(fp)) {
    return NextResponse.json({ error: 'replay rejected' }, { status: 401 });
  }
  recentReplays.set(fp, nowSec + 600);

  let body: { results?: unknown };
  try {
    body = JSON.parse(rawBody) as { results?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!Array.isArray(body.results) || body.results.length === 0) {
    return NextResponse.json({ error: 'results array required' }, { status: 400 });
  }
  if (body.results.length > 100) {
    return NextResponse.json({ error: 'max 100 results per request' }, { status: 413 });
  }

  try {
    const svc = createLaunchpadServiceClient();
    const { data: agent, error: aErr } = await svc
      .from('launchpad_local_agents')
      .select('id, tenant_id, status')
      .eq('id', agentId)
      .maybeSingle();

    if (aErr || !agent) {
      return NextResponse.json({ error: 'unknown agent' }, { status: 401 });
    }
    if (agent.status !== 'enrolled' && agent.status !== 'active') {
      return NextResponse.json({ error: 'agent revoked or expired' }, { status: 401 });
    }

    const rows: Array<Record<string, unknown>> = [];
    const rejected: Array<{ index: number; error: string }> = [];

    body.results.forEach((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        rejected.push({ index, error: 'invalid result object' });
        return;
      }
      const r = raw as Record<string, unknown>;
      if (typeof r.check_id !== 'string' || !r.check_id.trim()) {
        rejected.push({ index, error: 'check_id required' });
        return;
      }
      if (typeof r.result !== 'string' || !RESULT_VALUES.has(r.result)) {
        rejected.push({ index, error: 'invalid result' });
        return;
      }
      if (typeof r.observed_at !== 'string') {
        rejected.push({ index, error: 'observed_at required' });
        return;
      }
      if (typeof r.summary !== 'string' || r.summary.length > 280) {
        rejected.push({ index, error: 'summary must be one short sentence (≤280 chars)' });
        return;
      }
      // Reject if payload tries to smuggle raw logs / configs
      if ('raw' in r || 'logs' in r || 'config' in r || 'capture' in r) {
        rejected.push({ index, error: 'raw logs/configs/captures are prohibited' });
        return;
      }

      rows.push({
        tenant_id: agent.tenant_id,
        agent_id: agent.id,
        check_id: r.check_id.trim(),
        check_version: typeof r.check_version === 'string' ? r.check_version : null,
        result: r.result,
        summary: r.summary.trim(),
        detail_hash: typeof r.detail_hash === 'string' ? r.detail_hash : null,
        mapped_controls: Array.isArray(r.mapped_controls) ? r.mapped_controls.map(String) : [],
        observed_at: r.observed_at,
      });
    });

    if (rows.length) {
      const { error: iErr } = await svc.from('launchpad_local_check_results').insert(rows);
      if (iErr) {
        return NextResponse.json({ error: iErr.message }, { status: 500 });
      }
      await svc
        .from('launchpad_local_agents')
        .update({ status: 'active', last_seen_at: new Date().toISOString() })
        .eq('id', agent.id)
        .eq('tenant_id', agent.tenant_id);
    }

    return NextResponse.json({
      ok: true,
      inserted: rows.length,
      rejected,
      note: 'Results may set state_source=agent_check in UI flows but never auto-flip implemented.',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'intake failed';
    if (message.includes('service client unavailable')) {
      return NextResponse.json({ error: 'service role not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
