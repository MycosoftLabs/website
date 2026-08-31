/**
 * Legacy HMAC smoke runner (tiny check pack).
 *
 * Production local orchestrator (MYCA + subagents):
 *   services/launchpad-myca-harness  →  python -m launchpad_myca_harness once
 *
 * Prerequisites:
 *   1. LAUNCHPAD_ENABLED=1 locally
 *   2. Owner/admin POST /api/fusarium/launchpad/local-agent/enroll
 *   3. Save returned agent.id + hmac_key into env (never commit)
 *
 * Usage:
 *   $env:LP_AGENT_ID="..."
 *   $env:LP_AGENT_HMAC_KEY="..."
 *   npx tsx scripts/launchpad/run-local-agent.ts
 *
 * Security: read-only OS facts only; no remote shell; no credential harvest;
 * payload has no raw logs/configs/captures.
 */

import { createHash, createHmac } from 'crypto';
import { existsSync } from 'fs';
import { homedir, platform as nodePlatform, release, tmpdir } from 'os';

function detailHash(detail: unknown): string {
  return createHash('sha256').update(JSON.stringify(detail)).digest('hex');
}

function sign(hmacKey: string, timestampSec: number, rawBody: string): string {
  return createHmac('sha256', hmacKey).update(`${timestampSec}.${rawBody}`).digest('hex');
}

interface CheckResult {
  check_id: string;
  check_version: string;
  observed_at: string;
  result: 'pass' | 'fail' | 'indeterminate' | 'not_applicable';
  summary: string;
  detail_hash: string;
  mapped_controls?: string[];
}

function runChecks(): CheckResult[] {
  const now = new Date().toISOString();
  const plat = nodePlatform();
  const rel = release();
  const inventoryDetail = { platform: plat, release: rel, arch: process.arch };
  const diskEncDetail = { probed: false };
  const homeWritable = existsSync(homedir());
  const tmpOk = existsSync(tmpdir());

  return [
    {
      check_id: 'os.inventory',
      check_version: '1.0.0',
      observed_at: now,
      result: 'pass',
      summary: `Host reports ${plat} ${rel} (${process.arch}).`,
      detail_hash: detailHash(inventoryDetail),
      mapped_controls: ['3.4.1'],
    },
    {
      check_id: 'disk.encryption',
      check_version: '1.0.0',
      observed_at: now,
      result: 'indeterminate',
      summary: 'Disk encryption status not determined by this read-only MVP pack.',
      detail_hash: detailHash(diskEncDetail),
      mapped_controls: ['3.13.16'],
    },
    {
      check_id: 'local.paths',
      check_version: '1.0.0',
      observed_at: now,
      result: homeWritable && tmpOk ? 'pass' : 'fail',
      summary: 'Local home/temp path presence check completed.',
      detail_hash: detailHash({ homeWritable, tmpOk }),
    },
  ];
}

async function main() {
  const agentId = process.env.LP_AGENT_ID?.trim();
  const hmacKey = process.env.LP_AGENT_HMAC_KEY?.trim();
  const url =
    process.env.LP_AGENT_RESULTS_URL?.trim() ||
    'http://localhost:3010/api/fusarium/launchpad/local-agent/results';

  if (!agentId || !hmacKey) {
    console.error('Set LP_AGENT_ID and LP_AGENT_HMAC_KEY from enroll response (never commit).');
    process.exit(2);
  }

  const results = runChecks();
  const rawBody = JSON.stringify({ results });
  const timestampSec = Math.floor(Date.now() / 1000);
  const signature = sign(hmacKey, timestampSec, rawBody);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LP-Agent-Id': agentId,
      'X-LP-Timestamp': String(timestampSec),
      'X-LP-Signature': signature,
    },
    body: rawBody,
  });
  const text = await res.text();
  console.log(`Results HTTP ${res.status}: ${text.slice(0, 2000)}`);
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
