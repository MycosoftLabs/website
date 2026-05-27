const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

async function collect(page) {
  return page.evaluate(() => {
    const debug = window.__crep_marker_debug || null;
    return {
      dom: {
        event: document.querySelectorAll('[data-marker="event"]').length,
        fungal: document.querySelectorAll('[data-marker="fungal"]').length,
        allMaplibreMarkers: document.querySelectorAll(".maplibregl-marker").length,
        markerRoots: document.querySelectorAll('[data-map-marker-root="1"]').length,
      },
      debug,
      mapMarkerDebug: window.__map_marker_debug || null,
      renderDebug: window.__crep_render_debug || null,
      ui: {
        nature: document.body.innerText.match(/Nature:\s*(\d+)/)?.[1] ?? null,
        observations: document.body.innerText.match(/(\d+)\s*OBSERVATIONS/i)?.[1] ?? null,
        events: document.body.innerText.match(/(\d+)\s*EVENTS/i)?.[1] ?? null,
      },
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const screenshotDir = path.join(process.cwd(), "screenshots", "earth-marker-pan-test-v2");
  fs.mkdirSync(screenshotDir, { recursive: true });

  await page.goto("http://localhost:3010/natureos/earth-simulator", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  // Allow full CREP data hydration before pan
  await page.waitForTimeout(25000);
  const before = await collect(page);
  await page.screenshot({ path: path.join(screenshotDir, "01-before-pan-loaded.png") });

  const map = page.locator(".maplibregl-canvas").first();
  const box = await map.boundingBox();
  if (!box) throw new Error("Map canvas not found");

  let cx = box.x + box.width / 2;
  let cy = box.y + box.height / 2;

  const panSamples = [];
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i < 16; i++) {
    await page.mouse.move(cx + i * 40, cy + (i % 2 === 0 ? 15 : -15), { steps: 4 });
    await page.waitForTimeout(100);
    panSamples.push({ step: i, ...(await collect(page)) });
  }
  await page.mouse.up();
  await page.waitForTimeout(3000);
  const after = await collect(page);
  await page.screenshot({ path: path.join(screenshotDir, "02-after-pan.png") });

  const out = { before, panSamples, after };
  fs.writeFileSync(path.join(screenshotDir, "results.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
