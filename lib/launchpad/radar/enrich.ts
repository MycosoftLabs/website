/**
 * Cached radar enrichment via the metered router. Never a win-probability claim.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { routeCompletion } from '@/lib/launchpad/ai/router';

export async function enrichOpportunityIfNeeded(input: {
  supabase: SupabaseClient;
  tenantId: string;
  userId: string;
  opportunityId: string;
  title: string;
  agency: string | null;
  officialUrl: string;
}): Promise<{ text: string | null; creditsCharged: number; cached: boolean; error?: string }> {
  const cacheKey = createHash('sha256')
    .update(`${input.opportunityId}:${input.officialUrl}:${input.title}`)
    .digest('hex');
  const { data: existing } = await input.supabase
    .from('launchpad_radar_enrichment_cache')
    .select('summary')
    .eq('cache_key', cacheKey)
    .maybeSingle();
  if (existing?.summary) {
    return { text: existing.summary as string, creditsCharged: 0, cached: true };
  }

  const result = await routeCompletion({
    tenantId: input.tenantId,
    userId: input.userId,
    supabase: input.supabase,
    taskType: 'radar_enrichment',
    system:
      'Summarize a public federal solicitation for a small US contractor. Commercial only. Never claim a win probability or that an award is likely. No CUI.',
    user: `Title: ${input.title}\nAgency: ${input.agency ?? 'unknown'}\nURL: ${input.officialUrl}\nWrite 5 bullets of public facts only.`,
  });
  if (!result.ok || !result.text) {
    return { text: null, creditsCharged: 0, cached: false, error: result.error };
  }
  await input.supabase.from('launchpad_radar_enrichment_cache').upsert(
    {
      cache_key: cacheKey,
      opportunity_id: input.opportunityId,
      summary: result.text,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'cache_key' },
  );
  return { text: result.text, creditsCharged: result.creditsCharged, cached: false };
}
