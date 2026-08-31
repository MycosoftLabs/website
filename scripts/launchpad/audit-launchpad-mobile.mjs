/**
 * The same Launchpad routes at phone width.
 *
 * Desktop auditing misses the failures that only exist at 375px: a table that
 * pushes the whole page sideways, a tap target too small to hit reliably, text
 * clipped by a fixed-width container. None of it shows up in a type-check, and
 * none of it shows up at 1440px either.
 *
 *   node scripts/launchpad/audit-launchpad-mobile.mjs [baseURL]
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3010';

const ROUTES = [
  '/fusarium/launchpad',
  '/fusarium/launchpad/pricing',
  '/fusarium/launchpad/checkout?plan=core&billing=monthly',
  '/fusarium/launchpad/welcome',
  '/fusarium/launchpad/trust',
  '/app/launchpad/dashboard',
  '/app/launchpad/admin',
  '/app/launchpad/onboarding',
  '/app/launchpad/readiness/controls',
  '/app/launchpad/readiness/poam',
  '/app/launchpad/opportunities',
  '/app/launchpad/company',
  '/app/launchpad/partner-mesh',
  '/app/launchpad/billing',
  '/app/launchpad/advisory',
  '/app/launchpad/documents',
  '/app/launchpad/settings/keys',
];

const browser = await chromium.launch();

const seed = await browser.newContext({ baseURL: BASE });
await seed.request
  .post('/api/auth/local-dev-session', { data: { redirectTo: '/app/launchpad/dashboard' } })
  .catch(() => {});
const cookies = await seed.cookies();
await seed.close();

// Warm first: a cold route reports an empty page, not a layout problem.
{
  const warm = await browser.newContext({ baseURL: BASE });
  await warm.addCookies(cookies);
  const wp = await warm.newPage();
  for (const r of ROUTES) {
    try {
      await wp.goto(r, { waitUntil: 'load', timeout: 180_000 });
      await wp.waitForTimeout(900);
    } catch {}
  }
  await warm.close();
  console.log('warm-up done (' + ROUTES.length + ' routes)');
}

const problems = [];

for (const route of ROUTES) {
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    baseURL: BASE,
  });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  try {
    await page.goto(route, { waitUntil: 'load', timeout: 180_000 });
    await page.waitForTimeout(6000);
  } catch (e) {
    problems.push({ route, issues: ['LOAD FAILED: ' + String(e).split('\n')[0].slice(0, 80)] });
    await ctx.close();
    continue;
  }

  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;

    // Which elements actually push the page sideways.
    const overflowing = [];
    if (doc.scrollWidth > vw + 4) {
      for (const el of document.querySelectorAll('main *')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0) continue;
        if (b.right > vw + 4 || b.left < -4) {
          const style = getComputedStyle(el);
          // Something inside its own scroll container is fine.
          let scrollable = false;
          let n = el.parentElement;
          while (n && n !== document.body) {
            const o = getComputedStyle(n).overflowX;
            if (o === 'auto' || o === 'scroll') { scrollable = true; break; }
            n = n.parentElement;
          }
          if (!scrollable && style.position !== 'fixed') {
            overflowing.push(
              el.tagName.toLowerCase() +
                (el.className && typeof el.className === 'string'
                  ? '.' + el.className.split(/\s+/).slice(0, 2).join('.')
                  : '') +
                ' (right=' + Math.round(b.right) + ')',
            );
          }
        }
      }
    }

    // Interactive things too small to hit. 44px is the usual floor.
    const small = [];
    for (const el of document.querySelectorAll('main button, main a[href], main select, main input[type=checkbox]')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      const st = getComputedStyle(el);
      if (st.display === 'inline' || st.visibility === 'hidden') continue;
      if (b.height < 32 || b.width < 32) {
        const t = (el.textContent || '').trim().slice(0, 24) || el.tagName.toLowerCase();
        small.push(t + ' (' + Math.round(b.width) + 'x' + Math.round(b.height) + ')');
      }
    }

    // Tables that will be unusable without a scroll parent.
    const tables = [];
    for (const t of document.querySelectorAll('main table')) {
      const p = t.parentElement;
      const o = p ? getComputedStyle(p).overflowX : '';
      if (t.getBoundingClientRect().width > vw + 4 && o !== 'auto' && o !== 'scroll') {
        tables.push('table w=' + Math.round(t.getBoundingClientRect().width));
      }
    }

    return {
      pageWidth: doc.scrollWidth,
      viewport: vw,
      overflowing: Array.from(new Set(overflowing)).slice(0, 4),
      small: Array.from(new Set(small)).slice(0, 6),
      tables,
      chars: (document.querySelector('main') || document.body).innerText.length,
    };
  });

  const issues = [];
  if (r.chars < 120) issues.push('near-empty (' + r.chars + ' chars)');
  if (r.pageWidth > r.viewport + 4) {
    issues.push('page scrolls sideways (' + r.pageWidth + 'px > ' + r.viewport + 'px)');
    if (r.overflowing.length) issues.push('  caused by: ' + r.overflowing.join(', '));
  }
  if (r.small.length) issues.push(r.small.length + ' tap target(s) under 32px: ' + r.small.join(', '));
  if (r.tables.length) issues.push('table overflows with no scroll parent: ' + r.tables.join(', '));
  if (issues.length) problems.push({ route, issues });

  await ctx.close();
}

console.log('\n=== MOBILE AUDIT (375x812) — ' + ROUTES.length + ' routes ===\n');
if (!problems.length) console.log('  no issues found\n');
for (const p of problems) {
  console.log('  ' + p.route);
  for (const i of p.issues) console.log('      ' + i);
}
console.log('\n' + problems.length + ' routes with issues, ' + (ROUTES.length - problems.length) + ' clean\n');

await browser.close();
