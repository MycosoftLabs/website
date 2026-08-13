/**
 * Nightly federal collectors. Honest-empty when a source has no key.
 * Never invents SAM/DSIP/Grants rows.
 *
 * Usage (website repo root):
 *   npx tsx scripts/launchpad/run-nightly-collectors.ts
 */

import {
  collectSamOpportunitiesSafe,
  resolveSamApiKeyFromEnv,
} from '../../lib/launchpad/collectors/sam';

async function ingest(records: unknown[]): Promise<number> {
  const token =
    process.env.LAUNCHPAD_INGEST_BEARER?.trim() || process.env.LAUNCHPAD_INGEST_TOKEN?.trim();
  if (!token) {
    console.log('Have official records but no ingest bearer — not posting. Set LAUNCHPAD_INGEST_BEARER.');
    return 2;
  }
  const url =
    process.env.LAUNCHPAD_INGEST_URL?.trim() ||
    'http://localhost:3010/api/fusarium/launchpad/radar/ingest';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });
  const text = await res.text();
  console.log(`Ingest HTTP ${res.status}: ${text.slice(0, 500)}`);
  return res.ok ? 0 : 1;
}

async function main() {
  console.log('Launchpad nightly collectors — official sources only, no mock awards.');

  const collected = await collectSamOpportunitiesSafe({
    apiKey: resolveSamApiKeyFromEnv(),
    limit: Number(process.env.SAM_COLLECTOR_LIMIT ?? '25') || 25,
  });
  if (collected.ok && collected.skipped) {
    console.log(
      'SAM not configured / no federal source connected (SAM_API_KEY unset). Skipping — opportunities stay empty.',
    );
  } else if (!collected.ok) {
    console.error(collected.error);
    process.exit(1);
  } else if (collected.records.length === 0) {
    console.log('SAM returned an empty official page. Opportunities UI stays honest.');
  } else {
    const code = await ingest(collected.records);
    if (code === 1) process.exit(1);
  }

  if (!(process.env.DSIP_API_KEY ?? '').trim()) {
    console.log('DSIP not configured / no federal source connected. Skipping (honest-empty).');
  } else {
    console.log('DSIP key present but collector client is not wired yet — refusing to invent rows.');
  }

  if (!(process.env.GRANTS_GOV_API_KEY ?? '').trim()) {
    console.log('Grants.gov not configured / no federal source connected. Skipping (honest-empty).');
  } else {
    console.log('Grants.gov key present but collector client is not wired yet — refusing to invent rows.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
