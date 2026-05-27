const { chromium } = require("playwright");

async function snapshot(page) {
  return page.evaluate(() => ({
    debug: window.__crep_marker_debug,
    mapMarkerDebug: window.__map_marker_debug,
    renderDebug: window.__crep_render_debug,
    dom: {
      event: document.querySelectorAll('[data-marker="event"]').length,
      fungal: document.querySelectorAll('[data-marker="fungal"]').length,
      maplibre: document.querySelectorAll(".maplibregl-marker").length,
      roots: document.querySelectorAll('[data-map-marker-root="1"]').length,
    },
    ui: {
      natureHeader: document.body.innerText.match(/Nature:\s*(\d+)/)?.[1] ?? null,
      observations: document.body.innerText.match(/(\d+)\s*OBSERVATIONS/i)?.[1] ?? null,
      events: document.body.innerText.match(/(\d+)\s*EVENTS/i)?.[1] ?? null,
    },
  }));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const network = [];
  page.on("response", (r) => {
    const u = r.url();
    if (!u.includes("/api/")) return;
    if (/event|fungal|crep|oei|global/i.test(u)) {
      network.push({ path: u.replace(/^https?:\/\/[^/]+/, ""), status: r.status() });
    }
  });

  await page.goto("http://localhost:3010/natureos/earth-simulator", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  const timeline = [];
  for (const sec of [8, 20, 35]) {
    await page.waitForTimeout(sec === 8 ? 8000 : sec === 20 ? 12000 : 15000);
    timeline.push({ at: `${sec}s idle`, ...(await snapshot(page)) });
  }

  const map = page.locator(".maplibregl-canvas").first();
  const box = await map.boundingBox();
  let cx = box.x + box.width / 2;
  let cy = box.y + box.height / 2;

  // Rapid samples during continuous pan
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const panSamples = [];
  for (let i = 0; i < 12; i++) {
    await page.mouse.move(cx + i * 35, cy + i * 12, { steps: 3 });
    await page.waitForTimeout(120);
    panSamples.push({ step: i, ...(await snapshot(page)) });
  }
  await page.mouse.up();
  timeline.push({ phase: "pan-samples", samples: panSamples });
  timeline.push({ at: "after pan settle 3s", ...(await snapshot(page)) });

  console.log(JSON.stringify({ timeline, network }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
