const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const network = [];
  page.on("response", (r) => {
    const u = r.url();
    if (/\/api\/(crep|oei|events|fungal)/i.test(u)) {
      network.push({ path: u.replace(/^https?:\/\/[^/]+/, ""), status: r.status() });
    }
  });
  await page.goto("http://localhost:3010/natureos/earth-simulator", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(20000);
  const debug = await page.evaluate(() => window.__crep_marker_debug);
  console.log("debug", JSON.stringify(debug, null, 2));
  console.log("network", JSON.stringify(network, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
