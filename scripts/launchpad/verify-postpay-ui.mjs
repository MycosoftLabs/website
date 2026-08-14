/**
 * Checks the post-payment surfaces in a real browser, in both themes.
 *
 * These are the screens between "card accepted" and "inside the workspace", so
 * the failures that matter here are not crashes — they are a control nobody can
 * label, a consent pointing at a document that does not exist, a dropdown that
 * renders white-on-white, or a page claiming access it has not been granted.
 * None of that shows up in a type-check or a status code.
 *
 *   node scripts/launchpad/verify-postpay-ui.mjs [baseURL]
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3012';
let pass = 0;
let fail = 0;

function check(name, ok, detail = '') {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch();

async function open(path, theme = 'dark') {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    colorScheme: theme,
    baseURL: BASE,
  });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 140)));
  await page.goto(path, { waitUntil: 'load', timeout: 300_000 });
  await page.waitForTimeout(3500);
  return { ctx, page, errors };
}

// ---------------------------------------------------------------- checkout
console.log('\n=== CHECKOUT — richer intake ===');
{
  const { ctx, page, errors } = await open('/fusarium/launchpad/checkout?plan=core&billing=monthly');

  const f = await page.evaluate(() => {
    const inMain = (sel) => [...document.querySelectorAll(`main ${sel}`)];
    const controls = inMain('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea');
    const labels = inMain('label');
    // Every control needs an accessible name, or a screen reader announces
    // "edit text" and a click on the label text does nothing.
    const unlabelled = controls.filter((c) => {
      if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) return false;
      if (c.id && document.querySelector(`label[for="${CSS.escape(c.id)}"]`)) return false;
      return !c.closest('label');
    }).map((c) => c.name || c.id || c.tagName);
    const sel = document.querySelector('main select');
    const selStyle = sel ? getComputedStyle(sel) : null;
    return {
      controlCount: controls.length,
      labelCount: labels.length,
      unlabelled,
      hasSelect: !!sel,
      selectOptions: sel ? [...sel.options].map((o) => o.value).filter(Boolean) : [],
      selectGlass: sel ? sel.className.includes('myco-glass-field') : false,
      selectBg: selStyle?.backgroundColor,
      selectColor: selStyle?.color,
      textareas: inMain('textarea').length,
      textareaGlass: inMain('textarea').every((t) => t.className.includes('myco-glass-field')),
      textPrimary: inMain('[class*="text-primary"]').length,
    };
  });

  check('all 5 new fields + 3 original present', f.controlCount >= 8, `${f.controlCount} controls`);
  check('every control has an accessible name', f.unlabelled.length === 0,
    f.unlabelled.length ? `unlabelled: ${f.unlabelled.join(', ')}` : '');
  check('company-size select present', f.hasSelect);
  check('select carries the six enum values',
    ['solo', '2-10', '11-50', '51-200', '201-1000', '1000+'].every((v) => f.selectOptions.includes(v)),
    f.selectOptions.join('|'));
  check('select is glass-themed (dark-mode dropdown fix)', f.selectGlass, `bg ${f.selectBg}`);
  check('both textareas glass-themed', f.textareas >= 2 && f.textareaGlass, `${f.textareas} textareas`);
  check('no off-accent text-primary', f.textPrimary === 0);
  check('no page errors', errors.length === 0, errors[0] || '');

  // The reason field is the one required addition — the button must respect it.
  const controls = await page.locator('main input:not([type=checkbox]), main select, main textarea').all();
  await controls[0].fill('Dana Reyes');
  await controls[1].fill('dana@northwindrobotics.com');
  await controls[2].fill('Northwind Robotics');
  await controls[3].fill('COO');
  await page.locator('main select').selectOption('11-50');
  await page.waitForTimeout(400);
  const blockedShort = await page.locator('main button[type=submit]').isDisabled().catch(() => null);
  check('submit blocked while "why" is empty', blockedShort === true);

  const reason = page.locator('main textarea').first();
  await reason.fill('We need a commercial CMMC readiness workspace for our team.');
  await page.waitForTimeout(500);
  const enabled = await page.locator('main button[type=submit]').isEnabled().catch(() => null);
  check('submit enabled once "why" is filled', enabled === true);

  // Client should refuse controlled-data wording before spending a round trip.
  await reason.fill('We handle ITAR technical data and need this workspace.');
  await page.waitForTimeout(400);
  await page.locator('main button[type=submit]').click().catch(() => {});
  await page.waitForTimeout(1200);
  const refusedText = await page.evaluate(() => document.body.innerText);
  check('controlled-data wording is refused client-side',
    /export-controlled|ITAR|controlled/i.test(refusedText) && !/clientSecret/.test(refusedText));

  // ...and the refusal must clear once they fix it, not linger.
  await reason.fill('We need a commercial readiness workspace for our team.');
  await page.waitForTimeout(600);
  const afterFix = await page.evaluate(() => document.body.innerText);
  check('refusal clears after the text is corrected',
    !/must not go in this form|do not submit cui/i.test(afterFix));

  await ctx.close();
}

// ------------------------------------------------------- non-CUI policy page
console.log('\n=== NON-CUI POLICY — the fourth consent document ===');
{
  const { ctx, page, errors } = await open('/fusarium/launchpad/legal/non-cui');
  const t = await page.evaluate(() => document.body.innerText);
  check('page exists and renders', t.length > 400, `${t.length} chars`);
  check('carries the DRAFT banner like the other three', /DRAFT\s*—?\s*NOT YET IN EFFECT/i.test(t));
  check('states Launchpad is outside the CUI boundary', /outside any CUI boundary|not FedRAMP/i.test(t));
  check('does not claim Mycosoft is CMMC compliant',
    !/is (CMMC )?(certified|compliant)/i.test(t) && /pursuing/i.test(t));
  check('no page errors', errors.length === 0, errors[0] || '');
  await ctx.close();
}

// --------------------------------------------------------------- welcome
console.log('\n=== WELCOME — honest without a session ===');
{
  const { ctx, page, errors } = await open('/fusarium/launchpad/welcome');
  const t = await page.evaluate(() => document.body.innerText);
  check('renders without a session_id', t.length > 200);
  check('claims no access it has not been granted',
    !/you'?re all set|access granted|workspace is ready/i.test(t));
  check('no page errors', errors.length === 0, errors[0] || '');
  await ctx.close();
}

// ------------------------------------------------- light-mode contrast sweep
console.log('\n=== LIGHT MODE — the theme that keeps breaking ===');
{
  const { ctx, page, errors } = await open('/fusarium/launchpad/checkout?plan=core&billing=monthly', 'light');
  const bad = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('main select, main textarea, main input')) {
      const s = getComputedStyle(el);
      // Same colour for text and background is the white-on-white failure.
      if (s.color === s.backgroundColor) out.push((el.id || el.tagName) + ':same-colour');
    }
    return out;
  });
  check('no control renders text on its own colour', bad.length === 0, bad.join(', '));
  check('no page errors in light mode', errors.length === 0, errors[0] || '');
  await ctx.close();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
