/**
 * DSIP / Grants.gov collector skeletons — Cursor P0 follow-ons (LP-081/082).
 * Intentionally unimplemented fetch: no mock federal data.
 */

import type { NormalizedOpportunity } from '@/lib/launchpad/radar/types';

export async function collectDsipOpportunities(_opts?: {
  apiKey?: string;
}): Promise<NormalizedOpportunity[]> {
  throw new Error(
    'DSIP collector not yet connected — refusing to invent opportunities. Wire official DSIP API next.',
  );
}

export async function collectGrantsGovOpportunities(_opts?: {
  apiKey?: string;
}): Promise<NormalizedOpportunity[]> {
  throw new Error(
    'Grants.gov collector not yet connected — refusing to invent opportunities. Wire official Grants.gov API next.',
  );
}
