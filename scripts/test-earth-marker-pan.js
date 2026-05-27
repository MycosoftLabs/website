const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

async function collect(page) {
  return page.evaluate(() => {
    const debug = window.__crep_marker_debug || null;
    const markerSelector =
      '[data-map-marker-root="1"],[data-marker="event"],[data-marker="fungal"]';
    return {
      dom: {
        event: document.querySelectorAll('[data-marker="event"]').length,
        fungal: document.querySelectorAll('[data-marker="fungal"]').length,
        allMaplibreMarkers: document.querySelectorAll(".maplibregl-marker").length,
        markerRoots: document.querySelectorAll('[data-map-marker-root="1"]').length,
        markerSelectorTotal: document.querySelectorAll(markerSelector).length,
      },
      debug,
      mapMarkerDebug: window.__map_marker_debug || null,
      renderDebug: window.__crep_render_debug || null,
      mapDebug: window.__map_component_debug || null,
    };
  });
}

async function run() {
  const headless = process.env.PW_HEADLESS !== "0";
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const screenshotDir = path.join(process.cwd(), "screenshots", "earth-marker-pan-test");
  fs.mkdirSync(screenshotDir, { recursive: true });
  const results = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") results.push({ type: "console-error", text: msg.text() });
  });
  page.on("pageerror", (err) => results.push({ type: "pageerror", text: err.message }));

  await page.goto("http://localhost:3010/natureos/earth-simulator", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  // Wait for CREP dashboard to hydrate and data to load
  await page.waitForTimeout(8000);

  const before = await collect(page);
  results.push({ phase: "before-pan", ...before });
  await page.screenshot({ path: path.join(screenshotDir, "01-before-pan.png") });

  const map = page.locator(".crep-map-container canvas, .maplibregl-canvas").first();
  const box = await map.boundingBox();
  if (!box) throw new Error("Map canvas not found");

  let cx = box.x + box.width / 2;
  let cy = box.y + box.height / 2;

  // Pan sequence: drag right, then down, then left
  const pans = [
    { dx: 280, dy: 0, label: "pan-right" },
    { dx: 0, dy: 220, label: "pan-down" },
    { dx: -320, dy: 0, label: "pan-left" },
  ];

  for (const pan of pans) {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + pan.dx, cy + pan.dy, { steps: 18 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const during = await collect(page);
    results.push({ phase: `during-${pan.label}`, ...during });
    await page.screenshot({
      path: path.join(screenshotDir, `02-during-${pan.label}.png`),
    });
    cx += pan.dx;
    cy += pan.dy;
  }

  await page.waitForTimeout(2000);
  const after = await collect(page);
  results.push({ phase: "after-pan-settle", ...after });
  await page.screenshot({ path: path.join(screenshotDir, "03-after-pan-settle.png") });

  // Second pan burst to stress flicker
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 400, cy - 180, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const midBurst = await collect(page);
  results.push({ phase: "mid-burst-pan", ...midBurst });
  await page.waitForTimeout(2500);
  const afterBurst = await collect(page);
  results.push({ phase: "after-burst-settle", ...afterBurst });
  await page.screenshot({ path: path.join(screenshotDir, "04-after-burst.png") });

  const outPath = path.join(screenshotDir, "results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nSaved screenshots + ${outPath}`);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
