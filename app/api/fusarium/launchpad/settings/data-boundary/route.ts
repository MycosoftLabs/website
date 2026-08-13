import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { filenameLooksDangerous, scanTextForBoundary } from '@/lib/launchpad/boundary/dlp';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { BLOCKED_DATA_CLASSES, COMMERCIAL_NON_CUI_BANNER } from '@/lib/launchpad/constants';
import { kmsBackendStatus } from '@/lib/launchpad/crypto/envelope';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { count } = await ctx.supabase
    .from('launchpad_quarantine_events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId);
  return NextResponse.json({
    banner: COMMERCIAL_NON_CUI_BANNER,
    blockedDataClasses: BLOCKED_DATA_CLASSES,
    kms: kmsBackendStatus(),
    quarantineCount: count ?? 0,
    scanners: {
      cloud: false,
      localAgentOnly: true,
      note: 'Red-team and network scanners stay on the Local Assurance Agent. Cloud receives sanitized structured results only.',
    },
    byoKeys:
      'Optional BYO AI provider keys are envelope-encrypted under a customer-scoped DEK. They are a policy carve-out vs hashed tenant API keys. Trust-page copy is drafted for Claude — do not treat the published “never stores secret values” line as covering BYO until that page is updated.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ text?: string; filename?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const text = typeof parsed.body.text === 'string' ? parsed.body.text : '';
  const filename = typeof parsed.body.filename === 'string' ? parsed.body.filename : '';
  if (filenameLooksDangerous(filename)) {
    await ctx.supabase.from('launchpad_quarantine_events').insert({
      tenant_id: ctx.tenantId,
      kind: 'filename',
      hits: [{ kind: 'sf86', excerpt: filename.slice(0, 40) }],
      actor_user_id: ctx.user.id,
    });
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'boundary.blocked',
      entity: 'launchpad_quarantine_events',
      payload: { kind: 'filename' },
    });
    return jsonError(409, 'boundary_blocked', 'Filename indicates prohibited material (SF-86 or packet capture). Quarantine event recorded; content was not stored.');
  }
  const result = scanTextForBoundary(text);
  if (result.blocked) {
    await ctx.supabase.from('launchpad_quarantine_events').insert({
      tenant_id: ctx.tenantId,
      kind: result.hits[0]?.kind ?? 'pattern',
      hits: result.hits,
      actor_user_id: ctx.user.id,
    });
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'boundary.blocked',
      entity: 'launchpad_quarantine_events',
      payload: { kinds: result.hits.map((h) => h.kind) },
    });
    return jsonError(409, 'boundary_blocked', 'Content failed the data-boundary scan. Quarantine event recorded; payload was not stored.', {
      hits: result.hits.map((h) => ({ kind: h.kind })),
    });
  }
  return NextResponse.json({ ok: true, blocked: false });
}
