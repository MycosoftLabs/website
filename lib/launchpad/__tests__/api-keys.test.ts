/**
 * Tenant API key mint / parse unit tests (no DB).
 * Full RPC/BFF coverage needs Supabase migration + session.
 */

import {
  hashApiKey,
  isLaunchpadApiKeyFormat,
  mintApiKeyPlaintext,
  parseScopes,
  extractBearerToken,
} from '../api-keys';

describe('launchpad api-keys', () => {
  test('mint produces lp_ prefix, stable SHA-256 hash, and usable prefix', () => {
    const minted = mintApiKeyPlaintext();
    expect(isLaunchpadApiKeyFormat(minted.plaintext)).toBe(true);
    expect(minted.plaintext.startsWith('lp_')).toBe(true);
    expect(minted.prefix).toBe(minted.plaintext.slice(0, 12));
    expect(minted.hash).toHaveLength(64);
    expect(hashApiKey(minted.plaintext)).toBe(minted.hash);
    expect(hashApiKey(minted.plaintext + 'x')).not.toBe(minted.hash);
  });

  test('parseScopes keeps only allowed enum values', () => {
    expect(parseScopes(['ingest', 'nope', 'admin', 1, null])).toEqual(['ingest', 'admin']);
    expect(parseScopes('ingest')).toEqual([]);
    expect(parseScopes([])).toEqual([]);
  });

  test('extractBearerToken accepts Bearer header or rejects junk', () => {
    expect(extractBearerToken('Bearer lp_abc')).toBe('lp_abc');
    expect(extractBearerToken('bearer lp_abc')).toBe('lp_abc');
    expect(extractBearerToken('lp_abc')).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken('Bearer ')).toBeNull();
  });
});
