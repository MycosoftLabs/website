/**
 * Run SAM.gov collector → POST to Launchpad radar ingest.
 *
 * Usage (from website repo root):
 *   npx tsx scripts/launchpad/run-sam-collector.ts
 *
 * Env:
 *   SAM_API_KEY or DATA_GOV_API_KEY — optional; if unset, exits 0 with
 *     "SAM not configured / no federal source connected" (no mock awards).
 *   Bearer for ingest: tenant lp_… key (scope=ingest) preferred, or
 *     deprecated LAUNCHPAD_INGEST_TOKEN break-glass.
 *   LAUNCHPAD_INGEST_URL (optional; default local radar ingest)
 *
 * Does NOT invent opportunities.
 */

import {
  collectSamOpportunitiesSafe,
  resolveSamApiKeyFromEnv,
} from '../../lib/launchpad/collectors/sam';

async function main() {
  const collected = await collectSamOpportunitiesSafe({
    apiKey: resolveSamApiKeyFromEnv(),
    limit: Number(process.env.SAM_COLLECTOR_LIMIT ?? '25') || 25,
  });

  if (collected.ok && collected.skipped) {
    console.log(
      'SAM not configured / no federal source connected (SAM_API_KEY unset). ' +
        'Skipping collector — opportunities UI stays empty (no mock awards).',
    );
    process.exit(0);
  }
  if (!collected.ok) {
    console.error(collected.error);
    process.exit(1);
  }

  const records = collected.records;
  console.log(`Collected ${records.length} SAM notice(s) from official API`);

  if (records.length === 0) {
    console.log('Nothing to ingest (empty official page). Opportunities UI stays honest.');
    return;
  }

  const token =
    process.env.LAUNCHPAD_INGEST_BEARER?.trim() ||
    process.env.LAUNCHPAD_INGEST_TOKEN?.trim();
  if (!token) {
    console.error(
      'Have SAM records but no ingest bearer. Set a tenant lp_… key ' +
        '(LAUNCHPAD_INGEST_BEARER) or deprecated LAUNCHPAD_INGEST_TOKEN.',
    );
    process.exit(2);
  }
  const url =
    process.env.LAUNCHPAD_INGEST_URL?.trim() ||
    'http://localhost:3010/api/fusarium/launchpad/radar/ingest';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records }),
  });
  const text = await res.text();
  console.log(`Ingest HTTP ${res.status}: ${text.slice(0, 2000)}`);
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
