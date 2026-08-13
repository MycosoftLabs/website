/**
 * Capture real screenshots of every Launchpad tour page.
 *
 *   node scripts/launchpad/capture-tour-screens.mjs [--base http://localhost:3010]
 *
 * - Auths via POST /api/auth/local-dev-session (dev-only; the route refuses in prod).
 * - Forces dark mode (localStorage theme + colorScheme emulation).
 * - Writes PNGs to public/assets/launchpad/tour/<slug>.png — the gitignored
 *   asset pipeline; the tour collapses previews gracefully when absent, and
 *   deploys sync assets the usual way.
 * - Page list mirrors TOUR_SLIDES in components/launchpad/app-tour.tsx
 *   (slug = href minus /app/launchpad/, slashes → dashes). KEEP IN SYNC.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:3010';

const HREFS = [
  '/app/launchpad/dashboard',
  '/app/launchpad/tasks',
  '/app/launchpad/readiness/scope',
  '/app/launchpad/readiness/controls',
  '/app/launchpad/readiness/score',
  '/app/launchpad/readiness/poam',
  '/app/launchpad/readiness/tier1',
  '/app/launchpad/readiness/ssp',
  '/app/launchpad/evidence',
  '/app/launchpad/documents',
  '/app/launchpad/training',
  '/app/launchpad/opportunities',
  '/app/launchpad/proposals',
  '/app/launchpad/origin-graph',
  '/app/launchpad/local-agent',
  '/app/launchpad/resources',
  '/app/launchpad/enclave',
  '/app/launchpad/partner-mesh',
  '/app/launchpad/advisory',
  '/app/launchpad/company',
  '/app/launchpad/billing',
  '/app/launchpad/settings/integrations',
  '/app/launchpad/settings/keys',
  '/app/launchpad/settings/data-boundary',
  '/app/launchpad/settings/export',
  '/app/launchpad/settings/audit',
];

const slug = (href) => href.replace('/app/launchpad/', '').replace(/\//g, '-') || 'dashboard';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = resolve(repoRoot, 'public', 'assets', 'launchpad', 'tour');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'dark',
  baseURL: BASE,
});
await context.addInitScript(() => {
  try { localStorage.setItem('theme', 'dark'); } catch {}
});

// Dev-only session — the shared cookie jar authenticates every page visit.
const auth = await context.request.post('/api/auth/local-dev-session');
if (!auth.ok()) {
  console.error(`local-dev-session failed (${auth.status()}) — is the dev server up and NODE_ENV=development?`);
  await browser.close();
  process.exit(1);
}

const page = await context.newPage();
let ok = 0;
const failed = [];

for (const href of HREFS) {
  const name = slug(href);
  try {
    // Dev-server first compiles are slow; give each page a generous window.
    await page.goto(href, { waitUntil: 'load', timeout: 180_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1200); // let fetches paint
    await page.screenshot({ path: resolve(outDir, `${name}.png`) });
    ok++;
    console.log(`ok   ${name}`);
  } catch (e) {
    failed.push(name);
    console.error(`FAIL ${name}: ${String(e).slice(0, 160)}`);
  }
}

await browser.close();
console.log(`\n${ok}/${HREFS.length} captured → ${outDir}${failed.length ? `\nfailed: ${failed.join(', ')}` : ''}`);
process.exit(failed.length ? 2 : 0);
