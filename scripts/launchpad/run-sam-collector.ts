/**
 * Run SAM.gov collector → POST to Launchpad radar ingest.
 *
 * Usage (from website repo root):
 *   npx tsx scripts/launchpad/run-sam-collector.ts
 *
 * Required env:
 *   SAM_API_KEY or DATA_GOV_API_KEY
 *   LAUNCHPAD_INGEST_TOKEN
 *   LAUNCHPAD_INGEST_URL (optional; default http://localhost:3010/api/fusarium/launchpad/radar/ingest)
 *
 * Does NOT invent opportunities. Exits non-zero if keys missing or upstream fails.
 */

import {
  collectSamOpportunities,
  resolveSamApiKeyFromEnv,
} from '../../lib/launchpad/collectors/sam';

async function main() {
  const apiKey = resolveSamApiKeyFromEnv();
  if (!apiKey) {
    console.error('Missing SAM_API_KEY / DATA_GOV_API_KEY — refusing to invent federal data.');
    process.exit(2);
  }
  const token = process.env.LAUNCHPAD_INGEST_TOKEN?.trim();
  if (!token) {
    console.error('Missing LAUNCHPAD_INGEST_TOKEN');
    process.exit(2);
  }
  const url =
    process.env.LAUNCHPAD_INGEST_URL?.trim() ||
    'http://localhost:3010/api/fusarium/launchpad/radar/ingest';

  const records = await collectSamOpportunities({
    apiKey,
    limit: Number(process.env.SAM_COLLECTOR_LIMIT ?? '25') || 25,
  });
  console.log(`Collected ${records.length} SAM notice(s) from official API`);

  if (records.length === 0) {
    console.log('Nothing to ingest (empty official page). Opportunities UI stays honest.');
    return;
  }

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
