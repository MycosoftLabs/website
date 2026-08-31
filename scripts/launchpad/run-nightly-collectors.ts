/**
 * Nightly federal collectors. Official sources only.
 * SAM needs a key. SBIR.gov and Grants.gov are keyless.
 *
 * Usage (website repo root):
 *   npx tsx scripts/launchpad/run-nightly-collectors.ts
 */

import { collectOfficialRadarSources } from '../../lib/launchpad/collectors/official';

async function postCollect(): Promise<number> {
  const token =
    process.env.LAUNCHPAD_INGEST_BEARER?.trim() || process.env.LAUNCHPAD_INGEST_TOKEN?.trim();
  if (!token) {
    console.log('Official sources ran locally but no ingest bearer — not posting. Set LAUNCHPAD_INGEST_BEARER.');
    return 2;
  }
  const url =
    process.env.LAUNCHPAD_COLLECT_URL?.trim() ||
    process.env.LAUNCHPAD_INGEST_URL?.trim() ||
    'https://mycosoft.com/api/fusarium/launchpad/radar/collect';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const text = await res.text();
  console.log(`Collect HTTP ${res.status}: ${text.slice(0, 500)}`);
  return res.ok ? 0 : 1;
}

async function main() {
  console.log('Launchpad nightly collectors — official SAM + SBIR.gov + Grants.gov. No mock awards.');

  const collected = await collectOfficialRadarSources({
    limit: Number(process.env.SAM_COLLECTOR_LIMIT ?? '25') || 25,
  });
  console.log(JSON.stringify(collected.sources));
  if (collected.sources.sam.skipped) {
    console.log('SAM not configured (SAM_API_KEY unset). SBIR.gov + Grants.gov still run.');
  }
  if (collected.records.length === 0) {
    console.log('Official sources returned an empty page. Opportunities UI stays honest.');
    process.exit(0);
  }
  const code = await postCollect();
  process.exit(code === 1 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
