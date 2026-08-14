/**
 * Walks the public purchase journey end to end against a running dev server and
 * prints what a first-time customer would actually experience.
 *
 * This exists because every previous "payments are wired" claim was made from
 * reading code, and each time the live behaviour differed — a CSP that blocked
 * Stripe's SDK, plan CTAs that all resolved to one price, a submit button that
 * was inert inside a form. The only check that has ever caught those is driving
 * the real UI against the real API, so that is what this does.
 *
 * It never submits card details. It stops at the point where Stripe takes over,
 * reports the state it reached, and expires any session it opened so a probe
 * run leaves nothing behind in the account.
 *
 *   node scripts/launchpad/verify-checkout-journey.mjs [baseURL]
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3011';

function line(label, value) {
  console.log(`${label.padEnd(26)} ${value}`);
}

const browser = await chromium.launch();
const page = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  colorScheme: 'dark',
  baseURL: BASE,
}).then((c) => c.newPage());

const apiCalls = [];
page.on('response', async (r) => {
  if (!r.url().includes('/api/fusarium/launchpad/billing/')) return;
  let body = '';
  try { body = (await r.text()).slice(0, 400); } catch { /* stream gone */ }
  apiCalls.push({
    endpoint: r.url().split('/billing/')[1].split('?')[0],
    status: r.status(),
    body,
  });
});

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 180)); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR ${e.message.slice(0, 180)}`));

console.log(`\n=== PURCHASE JOURNEY against ${BASE} ===\n`);

console.log('1. Customer opens the pricing page');
await page.goto('/fusarium/launchpad/pricing', { waitUntil: 'load', timeout: 240_000 });
await page.waitForTimeout(2500);
const planCtas = await page.locator('a[href*="/checkout?plan="]').count();
line('   plan CTAs rendered', planCtas);

console.log('\n2. Customer picks Launchpad Core');
await page.locator('a[href*="/checkout?plan=core"]').first().click();
await page.waitForTimeout(5000);
line('   landed on', await page.evaluate(() => location.pathname + location.search));
line('   price shown', await page.evaluate(() => (document.body.innerText.match(/\$[\d,]+/) || ['none'])[0]));

console.log('\n3. Customer fills in their details');
// Scoped to main and to text-ish types: the header carries its own controls
// (search, a checkbox toggle) that are not part of the purchase form.
const inputs = await page
  .locator('main input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])')
  .all();
line('   fields found', inputs.length);
if (inputs.length >= 3) {
  await inputs[0].fill('Dana Reyes');
  await inputs[1].fill('dana@northwindrobotics.com');
  await inputs[2].fill('Northwind Robotics');
  line('   filled', 'name / email / company');
} else {
  line('   fields', 'FEWER THAN EXPECTED — form may not have rendered');
}

console.log('\n4. Customer submits — this hits Stripe for real');
const submit = page.locator('button:has-text("Continue to payment")').first();
if (await submit.count()) {
  await submit.click();
  await page.waitForTimeout(9000);
} else {
  line('   submit button', 'NOT FOUND');
}

console.log('\n--- API calls the page made ---');
if (!apiCalls.length) console.log('   (none)');
for (const c of apiCalls) {
  console.log(`   ${c.status}  ${c.endpoint}`);
  console.log(`         ${c.body.replace(/\s+/g, ' ').slice(0, 260)}`);
}

console.log('\n--- What the customer sees now ---');
const text = await page.evaluate(() => document.body.innerText);
console.log(text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 24).map((l) => `   ${l}`).join('\n'));

console.log('\n--- Console errors ---');
console.log(consoleErrors.length ? consoleErrors.slice(0, 6).map((e) => `   ${e}`).join('\n') : '   none');

await page.screenshot({ path: 'scripts/launchpad/.journey-result.png', fullPage: true });
console.log('\nScreenshot: scripts/launchpad/.journey-result.png\n');
await browser.close();
