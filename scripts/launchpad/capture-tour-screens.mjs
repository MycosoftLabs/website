/**
 * Capture real screenshots of every Launchpad tour page.
 *
 *   LP_SESSION_COOKIE='sb-<ref>-auth-token=<value>' \
 *     node scripts/launchpad/capture-tour-screens.mjs [--base http://localhost:3010]
 *
 * AUTH — read this before running.
 * The dev-admin cookie from /api/auth/local-dev-session authenticates the SITE
 * but NOT Launchpad: requireTenant() calls supabase.auth.getUser(), so without a
 * real Supabase session every workspace route 401s, the shell bounces to /login,
 * and you capture 30 identical "Loading workspace…" spinners. Ask me how I know.
 *
 * So: sign in to the app in a browser, copy the `sb-<project-ref>-auth-token`
 * cookie (DevTools → Application → Cookies), and pass it in LP_SESSION_COOKIE.
 * It is a live credential — pass it as an environment variable only. Never write
 * it to a file in this repo, never commit it, never paste it into a chat or a
 * handoff doc.
 *
 * - Also posts /api/auth/local-dev-session (dev-only) so the site chrome renders.
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
  '/app/launchpad/readiness/closure',
  '/app/launchpad/readiness/tier1',
  '/app/launchpad/readiness/ssp',
  '/app/launchpad/readiness/reports',
  '/app/launchpad/evidence',
  '/app/launchpad/documents',
  '/app/launchpad/signatures',
  '/app/launchpad/training',
  '/app/launchpad/opportunities',
  '/app/launchpad/proposals',
  '/app/launchpad/origin-graph',
  '/app/launchpad/local-agent',
  '/app/launchpad/resources',
  '/app/launchpad/enclave',
  '/app/launchpad/partner-mesh',
  '/app/launchpad/advisory',
  '/app/launchpad/learn',
  '/app/launchpad/learn/glossary',
  '/app/launchpad/learn/walkthroughs',
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

// Dev-only admin session — makes the site chrome render.
const auth = await context.request.post('/api/auth/local-dev-session');
if (!auth.ok()) {
  console.error(`local-dev-session failed (${auth.status()}) — is the dev server up and NODE_ENV=development?`);
  await browser.close();
  process.exit(1);
}

// Real Supabase session — what Launchpad's requireTenant() actually needs.
const sessionCookie = process.env.LP_SESSION_COOKIE;
if (!sessionCookie || !sessionCookie.includes('=')) {
  console.error(
    'LP_SESSION_COOKIE is required (format: sb-<project-ref>-auth-token=<value>).\n' +
    'Without it every Launchpad route 401s and you capture 30 loading spinners.\n' +
    'See the header of this file for how to obtain it safely.',
  );
  await browser.close();
  process.exit(1);
}
const eq = sessionCookie.indexOf('=');
await context.addCookies([{
  name: sessionCookie.slice(0, eq).trim(),
  value: sessionCookie.slice(eq + 1).trim(),
  url: BASE,
}]);

// Fail fast if the session is stale — better than a folder of spinners.
const probe = await context.request.get('/api/fusarium/launchpad/tenant');
if (!probe.ok()) {
  console.error(
    `Launchpad session check failed (${probe.status()}) — LP_SESSION_COOKIE is missing, expired, ` +
    'or belongs to a user with no workspace membership. Sign in again and copy a fresh cookie.',
  );
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

    // The shell resolves the tenant client-side, so `load` fires while the page
    // still reads "Loading workspace…". Capturing there produced a folder of
    // identical spinners. Wait for the shell to settle, then for real content.
    await page
      .waitForFunction(
        () => !/Loading workspace/i.test(document.body.innerText),
        { timeout: 120_000 },
      )
      .catch(() => {});
    await page
      .waitForSelector('main h1, main h2, main [role="alert"]', { timeout: 60_000 })
      .catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500); // let per-panel fetches paint

    // Never ship a spinner or a login screen as a "screenshot of this page".
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
    if (/Loading workspace/i.test(body) || /Sign in to Mycosoft/i.test(body)) {
      failed.push(name);
      console.error(`FAIL ${name}: page never left the loading/login state`);
      continue;
    }

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
