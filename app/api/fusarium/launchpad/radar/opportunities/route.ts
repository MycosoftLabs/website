import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { resolveSamApiKeyFromEnv } from '@/lib/launchpad/collectors/sam';

/**
 * Opportunities — read-only over the centrally-ingested global table.
 * Empty until real collectors ingest official notices; never mock federal data.
 * When SAM_API_KEY is unset, report honest "SAM not configured" status.
 */
export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const { data, error } = await ctx.supabase
    .from('launchpad_opportunities')
    .select('id, source, source_id, title, agency, instrument, posted_at, due_at, timezone, naics, set_asides, official_url')
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) return NextResponse.json({ error: 'Could not load opportunities' }, { status: 500 });

  const rows = data ?? [];
  const samConfigured = Boolean(resolveSamApiKeyFromEnv());
  const sources = {
    sam: samConfigured
      ? { configured: true as const, status: 'connected' as const }
      : {
          configured: false as const,
          status: 'sam_not_configured' as const,
          message: 'SAM not configured / no federal source connected',
        },
  };

  return NextResponse.json({
    opportunities: rows,
    collectorsLive: rows.length > 0,
    sources,
    note:
      rows.length === 0
        ? samConfigured
          ? 'No opportunities ingested yet from configured sources.'
          : 'SAM not configured / no federal source connected. No mock awards.'
        : undefined,
  });
}
