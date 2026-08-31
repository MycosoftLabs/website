/**
 * Proves client-side navigation actually works across the public site.
 *
 * The failure this guards against is specific and was invisible to every check
 * that only looked at HTTP status: a crash during React's commit aborts the
 * route transition, so the URL updates while the previous page stays on screen.
 * Every route still returns 200 the whole time. The only way to catch it is to
 * click a link in a real browser and then ask what is actually rendered.
 *
 * For each hop it asserts three things:
 *   - the JS context survived, so it was a soft navigation and not a reload
 *   - the rendered content is the destination, not the page we came from
 *   - nothing threw during the transition
 *
 *   node scripts/launchpad/verify-navigation.mjs [baseURL]
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3011';

/** [start route, link selector, text that must appear, text that must be gone] */
const HOPS = [
  ['/fusarium/launchpad/pricing', 'a[href*="/checkout?plan=core"]', 'Set up your workspace', 'Transparent pricing'],
  ['/fusarium/launchpad/pricing', 'a[href*="/checkout?plan=partner"]', 'Set up your workspace', 'Transparent pricing'],
  ['/defense/fusarium', 'a[href*="/fusarium/launchpad"]', 'Launchpad', null],
  ['/fusarium/launchpad', 'a[href*="/launchpad/pricing"]', 'Transparent pricing', null],
];

const browser = await chromium.launch();
let pass = 0;
let fail = 0;

for (const [from, selector, mustAppear, mustVanish] of HOPS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: BASE });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));

  try {
    await page.goto(from, { waitUntil: 'load', timeout: 240_000 });
    await page.waitForTimeout(2500);

    // :visible matters — the header nav holds collapsed dropdown copies of these
    // same hrefs, and picking one of those just times out waiting to be clickable.
    const link = page.locator(`${selector}:visible`).first();
    if (!(await link.count())) {
      console.log(`SKIP  ${from} -> ${selector}  (link not present)`);
      await ctx.close();
      continue;
    }

    await page.evaluate(() => { window.__soft = 'yes'; });
    await link.click();
    await page.waitForTimeout(5000);

    // Reading the page can land mid-navigation — Playwright then throws
    // "execution context was destroyed" and the hop looks like a failure when
    // nothing is wrong. In dev that happens whenever the destination route is
    // still compiling. Retry until the document settles.
    //
    // This does not hide a real hard reload: the marker lives on window, so a
    // full document load wipes it, and `soft` still reports false below.
    const probe = () => page.evaluate(() => ({
      soft: window.__soft === 'yes',
      url: location.pathname + location.search,
      text: document.body.innerText,
    }));

    let r = null;
    let lastErr = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        r = await probe();
        break;
      } catch (e) {
        lastErr = e;
        await page.waitForLoadState('load', { timeout: 60_000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }
    }
    if (!r) throw lastErr;

    const appeared = r.text.includes(mustAppear);
    const vanished = mustVanish ? !r.text.includes(mustVanish) : true;
    const ok = r.soft && appeared && vanished && errors.length === 0;
    ok ? pass++ : fail++;

    console.log(`${ok ? 'PASS' : 'FAIL'}  ${from}`);
    console.log(`        -> ${r.url}`);
    console.log(`        soft nav: ${r.soft ? 'yes' : 'NO (full reload)'} | destination rendered: ${appeared ? 'yes' : 'NO'}` +
                `${mustVanish ? ` | previous page gone: ${vanished ? 'yes' : 'NO'}` : ''}` +
                ` | errors: ${errors.length ? errors[0] : 'none'}`);
  } catch (e) {
    fail++;
    console.log(`FAIL  ${from} — ${String(e).split('\n')[0].slice(0, 110)}`);
  }
  await ctx.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
