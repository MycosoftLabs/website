/**
 * Local smoke for tenant API key mint/hash helpers (no Jest / no DB).
 * Usage: npx tsx scripts/launchpad/run-api-keys-smoke.ts
 */

import {
  extractBearerToken,
  hashApiKey,
  isLaunchpadApiKeyFormat,
  mintApiKeyPlaintext,
  parseScopes,
} from '../../lib/launchpad/api-keys';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  FAIL  ${msg}`);
    failed += 1;
  } else {
    console.log(`  PASS  ${msg}`);
  }
}

const minted = mintApiKeyPlaintext();
assert(isLaunchpadApiKeyFormat(minted.plaintext), 'minted key matches lp_ format');
assert(minted.prefix === minted.plaintext.slice(0, 12), 'prefix is first 12 chars');
assert(minted.hash.length === 64, 'sha256 hex length 64');
assert(hashApiKey(minted.plaintext) === minted.hash, 'hashApiKey matches mint hash');
assert(hashApiKey(`${minted.plaintext}x`) !== minted.hash, 'hash changes on mutation');
assert(parseScopes(['ingest', 'nope', 'admin']).join(',') === 'ingest,admin', 'parseScopes filters');
assert(extractBearerToken('Bearer lp_abc') === 'lp_abc', 'extractBearerToken');
assert(extractBearerToken('lp_abc') === null, 'extractBearerToken rejects bare token');

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('api-keys smoke: all passed');
