/**
 * Standalone runner for the score-engine vector suite.
 *
 * The repo's jest install is currently broken (jest-runtime/jest-mock version
 * mismatch: `clearMocksOnScope is not a function` — pre-existing). This runner
 * shims the tiny slice of the jest API the vector file uses and executes the
 * SAME test file, so there is exactly one set of assertions.
 *
 *   node_modules/.bin/tsx scripts/launchpad/run-score-vectors.ts
 *
 * Once jest is repaired, `jest lib/launchpad/scoring` runs the identical file.
 */

import assert from 'node:assert/strict';

type Fn = () => void | Promise<void>;
const failures: string[] = [];
let passed = 0;
const pending: Array<{ name: string; fn: Fn }> = [];

(globalThis as Record<string, unknown>).describe = (_name: string, fn: Fn) => { fn(); };
(globalThis as Record<string, unknown>).test = (name: string, fn: Fn) => { pending.push({ name, fn }); };

function expect(actual: unknown) {
  return {
    toBe: (e: unknown) => assert.strictEqual(actual, e),
    toEqual: (e: unknown) => assert.deepStrictEqual(actual, e),
    toHaveLength: (n: number) => assert.strictEqual((actual as { length: number }).length, n),
    toContain: (e: unknown) => assert.ok((actual as unknown[]).includes(e as never), `expected to contain ${String(e)}`),
    toBeGreaterThanOrEqual: (n: number) => assert.ok((actual as number) >= n, `${String(actual)} < ${n}`),
  };
}
(globalThis as Record<string, unknown>).expect = expect;

async function main() {
  await import('../../lib/launchpad/scoring/__tests__/vectors.test');
  for (const t of pending) {
    try {
      await t.fn();
      passed++;
      console.log(`  PASS  ${t.name}`);
    } catch (err) {
      failures.push(t.name);
      console.error(`  FAIL  ${t.name}`);
      console.error(`        ${(err as Error).message.split('\n').slice(0, 4).join('\n        ')}`);
    }
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

main();
