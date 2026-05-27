const { chromium } = require("playwright");

async function snap(page) {
  return page.evaluate(() => ({
    dom: {
      event: document.querySelectorAll('[data-marker="event"]').length,
      fungal: document.querySelectorAll('[data-marker="fungal"]').length,
      all: document.querySelectorAll(".maplibregl-marker").length,
    },
    debug: window.__crep_marker_debug,
  }));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("http://localhost:3010/natureos/earth-simulator", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(25000);
  const before = await snap(page);
  const map = page.locator(".maplibregl-canvas").first();
  const box = await map.boundingBox();
  if (!box) throw new Error("no map");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const zoomSamples = [];
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, i % 2 === 0 ? -500 : 500);
    await page.waitForTimeout(350);
    zoomSamples.push(await snap(page));
  }
  await page.waitForTimeout(2500);
  const after = await snap(page);
  console.log(JSON.stringify({ before, zoomSamples, after }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
