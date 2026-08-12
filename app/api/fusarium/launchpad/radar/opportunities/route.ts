import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';

/**
 * Opportunities — read-only over the centrally-ingested global table.
 * Empty until Cursor's collectors ship; the UI says so honestly rather than
 * showing sample rows as if they were live federal data.
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

  return NextResponse.json({
    opportunities: data ?? [],
    collectorsLive: (data ?? []).length > 0,
  });
}
