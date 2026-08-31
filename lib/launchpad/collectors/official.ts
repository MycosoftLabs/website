/**
 * Official federal collectors — SAM + SBIR.gov (DSIP-class) + Grants.gov.
 * Never invents rows. Never scrapes DSIP. Never routes through MAS GrantAgent.
 */

import type { NormalizedOpportunity } from '@/lib/launchpad/radar/types';
import { collectSamOpportunitiesSafe, resolveSamApiKeyFromEnv } from './sam';
import { collectSbirOpportunitiesSafe } from './sbir';
import { collectGrantsGovOpportunitiesSafe } from './grants-gov';

export interface SourceReport {
  ok: boolean;
  count: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export interface OfficialCollectResult {
  records: NormalizedOpportunity[];
  sources: {
    sam: SourceReport;
    sbir: SourceReport;
    grants_gov: SourceReport;
  };
}

export async function collectOfficialRadarSources(opts?: {
  limit?: number;
}): Promise<OfficialCollectResult> {
  const limit = opts?.limit ?? 25;
  const [sam, sbir, grants] = await Promise.all([
    collectSamOpportunitiesSafe({ apiKey: resolveSamApiKeyFromEnv(), limit }),
    collectSbirOpportunitiesSafe({ limit }),
    collectGrantsGovOpportunitiesSafe({ limit }),
  ]);

  const records: NormalizedOpportunity[] = [];
  const sources: OfficialCollectResult['sources'] = {
    sam: { ok: false, count: 0 },
    sbir: { ok: false, count: 0 },
    grants_gov: { ok: false, count: 0 },
  };

  if (sam.ok && sam.skipped) {
    sources.sam = { ok: true, count: 0, skipped: true, reason: 'sam_not_configured' };
  } else if (!sam.ok) {
    sources.sam = { ok: false, count: 0, error: sam.error };
  } else {
    sources.sam = { ok: true, count: sam.records.length };
    records.push(...sam.records);
  }

  if (!sbir.ok) {
    sources.sbir = { ok: false, count: 0, error: sbir.error };
  } else {
    sources.sbir = { ok: true, count: sbir.records.length };
    records.push(...sbir.records);
  }

  if (!grants.ok) {
    sources.grants_gov = { ok: false, count: 0, error: grants.error };
  } else {
    sources.grants_gov = { ok: true, count: grants.records.length };
    records.push(...grants.records);
  }

  return { records, sources };
}
