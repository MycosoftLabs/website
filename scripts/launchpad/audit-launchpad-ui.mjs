/**
 * Walks every Launchpad route in a real browser, in both themes, and reports
 * what a person would actually see.
 *
 * Static checks keep missing the failures that matter here: a control nobody can
 * label, a dropdown that renders white-on-white, an empty state that says
 * nothing about what to do next, a page claiming a capability the backend has
 * not got. Every one of those returns HTTP 200.
 *
 *   node scripts/launchpad/audit-launchpad-ui.mjs [baseURL]
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3010';

const PUBLIC_ROUTES = [
  '/fusarium/launchpad',
  '/fusarium/launchpad/pricing',
  '/fusarium/launchpad/checkout?plan=core&billing=monthly',
  '/fusarium/launchpad/checkout?item=fus_launchpad_advisory_30',
  '/fusarium/launchpad/welcome',
  '/fusarium/launchpad/trust',
  '/fusarium/launchpad/legal/terms',
  '/fusarium/launchpad/legal/privacy',
  '/fusarium/launchpad/legal/aup',
  '/fusarium/launchpad/legal/non-cui',
  '/fusarium/launchpad/get-started',
  '/fusarium/launchpad/founding-50',
];

const APP_ROUTES = [
  '/app/launchpad/dashboard', '/app/launchpad/admin', '/app/launchpad/onboarding',
  '/app/launchpad/tasks', '/app/launchpad/readiness/scope', '/app/launchpad/readiness/controls',
  '/app/launchpad/readiness/score', '/app/launchpad/readiness/poam', '/app/launchpad/readiness/ssp',
  '/app/launchpad/readiness/tier1', '/app/launchpad/readiness/closure', '/app/launchpad/readiness/reports',
  '/app/launchpad/evidence', '/app/launchpad/documents', '/app/launchpad/signatures',
  '/app/launchpad/training', '/app/launchpad/opportunities', '/app/launchpad/proposals',
  '/app/launchpad/origin-graph', '/app/launchpad/partner-mesh', '/app/launchpad/advisory',
  '/app/launchpad/resources', '/app/launchpad/enclave', '/app/launchpad/local-agent',
  '/app/launchpad/company', '/app/launchpad/company/formation', '/app/launchpad/company/registrations',
  '/app/launchpad/company/clearance-readiness', '/app/launchpad/billing',
  '/app/launchpad/learn', '/app/launchpad/learn/glossary', '/app/launchpad/learn/walkthroughs',
  '/app/launchpad/settings/api', '/app/launchpad/settings/audit', '/app/launchpad/settings/keys',
  '/app/launchpad/settings/integrations', '/app/launchpad/settings/data-boundary',
  '/app/launchpad/settings/export',
];

const browser = await chromium.launch();

// A dev-admin cookie gets past the site gate. It does NOT satisfy requireTenant,
// so app pages render their unauthenticated state — itself worth auditing.
const ctxSeed = await browser.newContext({ baseURL: BASE });
await ctxSeed.request
  .post('/api/auth/local-dev-session', { data: { redirectTo: '/app/launchpad/dashboard' } })
  .catch(() => {});
const cookies = await ctxSeed.cookies();
await ctxSeed.close();

async function auditOne(route, theme) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    colorScheme: theme,
    baseURL: BASE,
  });
  await ctx.addCookies(cookies);
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 110)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/OuterLayoutRouter|unique "key"/.test(m.text())) {
      errors.push('console: ' + m.text().slice(0, 90));
    }
  });

  let status = 0;
  try {
    const resp = await page.goto(route, { waitUntil: 'load', timeout: 180_000 });
    status = resp ? resp.status() : 0;
    await page.waitForTimeout(8000);
  } catch (e) {
    await ctx.close();
    return { route, theme, status: 0, fatal: String(e).split('\n')[0].slice(0, 90) };
  }

  let r;
  try {
    r = await page.evaluate(() => {
    // A server redirect can land mid-navigation, leaving no body to read.
    const main = document.querySelector('main') || document.body;
    if (!main) return null;
    const txt = main.innerText || '';
    const q = (s) => Array.from(main.querySelectorAll(s));

    const controls = q('input:not([type=hidden]), select, textarea');
    const unlabelled = controls.filter((c) => {
      if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) return false;
      if (c.id && document.querySelector('label[for="' + CSS.escape(c.id) + '"]')) return false;
      if (c.closest('label')) return false;
      return c.type !== 'checkbox' && c.type !== 'radio';
    }).length;

    let sameColour = 0;
    for (const el of q('select, textarea, input, button, a')) {
      const s = getComputedStyle(el);
      if (s.color === s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') sameColour++;
    }

    // A full-width glass button whose inner control keeps its intrinsic width
    // leaves a visible ghost plate behind it.
    const ghost = q('.myco-glass-button').filter((b) => {
      const w = b.getBoundingClientRect().width;
      const inner = b.querySelector('button, a');
      return inner && Math.abs(inner.getBoundingClientRect().width - w) > 12;
    }).length;

    return {
      chars: txt.length,
      h1: (document.querySelector('h1') ? document.querySelector('h1').textContent : '').trim().slice(0, 60),
      hasH1: !!document.querySelector('h1'),
      unlabelled,
      sameColour,
      ghost,
      textPrimary: q('[class*="text-primary"]').length,
      // Measured contrast, not class names. A bare text-slate-400 is fine on a
      // permanently dark strip and unreadable on a white card, and only the
      // computed colours can tell those apart.
      lowContrast: (() => {
        const lum = (c) => {
          const m = c.match(/[\d.]+/g);
          if (!m || m.length < 3) return null;
          const [r, g, b] = m.slice(0, 3).map(Number).map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const bgOf = (el) => {
          let n = el;
          while (n && n !== document.documentElement) {
            const b = getComputedStyle(n).backgroundColor;
            if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b;
            n = n.parentElement;
          }
          return getComputedStyle(document.body).backgroundColor;
        };
        let bad = 0;
        for (const el of q('p, span, div, li, td, th, label, a')) {
          if (!el.textContent || !el.textContent.trim()) continue;
          if (el.children.length) continue;
          const st = getComputedStyle(el);
          const size = parseFloat(st.fontSize) || 16;
          const lf = lum(st.color);
          const lb = lum(bgOf(el));
          if (lf === null || lb === null) continue;
          const ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
          const large = size >= 24 || (size >= 18.66 && parseInt(st.fontWeight, 10) >= 700);
          if (ratio < (large ? 3 : 4.5)) bad++;
        }
        return bad;
      })(),
      glassButtons: q('.myco-glass-button').length,
      // Same negation trap as certClaim: these pages promise they will "never
      // show sample data", and flagging that sentence is worse than useless.
      fakeClaims: /lorem ipsum|sample data|demo data|placeholder data|John Doe|Jane Doe|Acme Corp(?!oration)/i.test(txt) &&
        !/(never|not|no|without)[^.]{0,120}(sample|demo|placeholder) data/i.test(txt),
      // Only an ASSERTION counts. The readiness pages carry disclaimers that
      // legitimately contain the phrase ("nothing here states that you are CMMC
      // compliant"), and flagging those just trains you to ignore the check.
      certClaim: /(is|are) (CMMC )?(certified|compliant)/i.test(txt) &&
        !/(not|nothing|never|no)[^.]{0,160}(is|are) (CMMC )?(certified|compliant)/i.test(txt),
      deadEnd: /\bno (data|records|results|items|rows)\b/i.test(txt) && q('a[href], button').length === 0,
      bodyScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
    };
  });

  } catch (e) {
    r = null;
  }
  await ctx.close();
  if (!r) return { route, theme, status, skipped: 'document unavailable (redirect?)' };
  return { route, theme, status, ...r, errors: errors.slice(0, 2) };
}

// Warm every route first. In dev each route compiles on first hit, so a cold
// visit reports an empty page and sometimes a 500 that has nothing to do with
// the UI — noise that buries the real findings.
const ALL = [...PUBLIC_ROUTES, ...APP_ROUTES];
{
  const warm = await browser.newContext({ baseURL: BASE });
  await warm.addCookies(cookies);
  const wp = await warm.newPage();
  for (const route of ALL) {
    try {
      await wp.goto(route, { waitUntil: 'load', timeout: 180_000 });
      await wp.waitForTimeout(1200);
    } catch {}
  }
  await warm.close();
  console.log('warm-up done (' + ALL.length + ' routes compiled)');
}

const rows = [];
for (const route of ALL) {
  for (const theme of ['dark', 'light']) {
    rows.push(await auditOne(route, theme));
  }
}

const problems = [];
for (const r of rows) {
  const p = [];
  if (r.fatal) {
    p.push('LOAD FAILED: ' + r.fatal);
  } else if (r.skipped) {
    // redirects are expected for the legacy URLs; not a defect
  } else {
    if (r.status >= 400) p.push('HTTP ' + r.status);
    if (r.chars < 120) p.push('near-empty page (' + r.chars + ' chars)');
    if (!r.hasH1) p.push('no <h1>');
    if (r.unlabelled) p.push(r.unlabelled + ' control(s) with no label');
    if (r.sameColour) p.push(r.sameColour + ' element(s) text-on-own-colour');
    if (r.ghost) p.push(r.ghost + ' ghost button artifact(s)');
    if (r.textPrimary) p.push(r.textPrimary + ' off-accent text-primary');
    if (r.lowContrast > 2) p.push(r.lowContrast + ' text node(s) under WCAG AA contrast');
    if (r.fakeClaims) p.push('MOCK/SAMPLE DATA SMELL');
    if (r.certClaim) p.push('CERTIFICATION CLAIM');
    if (r.deadEnd) p.push('empty state with no next action');
    if (r.bodyScrollX) p.push('horizontal body scroll');
    if (r.errors && r.errors.length) p.push('error: ' + r.errors[0]);
  }
  if (p.length) problems.push({ route: r.route, theme: r.theme, issues: p });
}

console.log('\n=== AUDIT: ' + rows.length + ' page-loads across ' +
  (PUBLIC_ROUTES.length + APP_ROUTES.length) + ' routes, both themes ===\n');

const byRoute = new Map();
for (const p of problems) {
  if (!byRoute.has(p.route)) byRoute.set(p.route, []);
  byRoute.get(p.route).push(p.theme + ': ' + p.issues.join(' | '));
}
if (!byRoute.size) console.log('  no issues found\n');
for (const [route, lines] of byRoute) {
  console.log('  ' + route);
  for (const l of lines) console.log('      ' + l);
}
console.log('\n' + byRoute.size + ' routes with issues, ' +
  (rows.length - problems.length) + ' clean page-loads\n');

await browser.close();
