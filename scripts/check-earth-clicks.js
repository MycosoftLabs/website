const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.goto("http://localhost:3010/natureos/earth-simulator", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-marker="fungal"]').length > 0 ||
      document.querySelectorAll('[data-marker="event"]').length > 0,
    { timeout: 30000 },
  ).catch(() => null);
  await page.waitForTimeout(1500);

  const fungalCount = await page.locator('[data-marker="fungal"] button').count();
  const eventCount = await page.locator('[data-marker="event"] [role="button"]').count();

  let fungalPopupCount = 0;
  let eventPopupCount = 0;
  let selectedAfterFungal = null;
  let selectedAfterEvent = null;
  let selectedImmediatelyAfterEvent = null;
  let markerDebug = null;
  let clickDebug = null;
  let lastMapMarkerClick = null;
  let markerPopupDebug = null;
  let mapPopupDebug = null;
  let popupClassCounts = null;
  let fallbackWidgetCounts = null;

  if (fungalCount > 0) {
    const maxFungalAttempts = Math.min(10, fungalCount);
    for (let i = 0; i < maxFungalAttempts; i += 1) {
      await page.locator('[data-marker="fungal"] button').nth(i).click({ force: true });
      await page.waitForTimeout(120);
      selectedAfterFungal = await page.evaluate(() => (window).__crep_selected_debug ?? null);
      if (selectedAfterFungal?.selectedFungalId) break;
    }
    await page.waitForTimeout(700);
    fungalPopupCount = await page.locator(".maplibregl-popup").count();
    selectedAfterFungal = await page.evaluate(() => (window).__crep_selected_debug ?? null);
  }

  if (eventCount > 0) {
    await page.locator('[data-marker="event"] [role="button"]').first().click({ force: true });
    await page.waitForTimeout(25);
    selectedImmediatelyAfterEvent = await page.evaluate(() => (window).__crep_selected_debug ?? null);
    await page.waitForTimeout(700);
    eventPopupCount = await page.locator(".maplibregl-popup").count();
    selectedAfterEvent = await page.evaluate(() => (window).__crep_selected_debug ?? null);
  }

  markerDebug = await page.evaluate(() => (window).__map_marker_debug ?? null);
  clickDebug = await page.evaluate(() => (window).__crep_click_debug ?? null);
  lastMapMarkerClick = await page.evaluate(() => (window).__last_map_marker_click ?? null);
  markerPopupDebug = await page.evaluate(() => (window).__marker_popup_debug ?? null);
  mapPopupDebug = await page.evaluate(() => {
    const map = (window).__crep_map ?? null;
    if (!map) return null;
    const popups = Array.isArray(map._popups) ? map._popups : [];
    return {
      popupCount: popups.length,
      openStates: popups.slice(0, 5).map((popup) => {
        try {
          return popup?.isOpen?.() ?? null;
        } catch {
          return null;
        }
      }),
    };
  });
  popupClassCounts = await page.evaluate(() => ({
    popup: document.querySelectorAll(".maplibregl-popup").length,
    popupContent: document.querySelectorAll(".maplibregl-popup-content").length,
    popupTip: document.querySelectorAll(".maplibregl-popup-tip").length,
    mapboxPopup: document.querySelectorAll(".mapboxgl-popup").length,
    mapboxPopupContent: document.querySelectorAll(".mapboxgl-popup-content").length,
  }));
  fallbackWidgetCounts = await page.evaluate(() => ({
    eventSelectedWidgets: document.querySelectorAll("div").length
      ? Array.from(document.querySelectorAll("div")).filter((el) => el.textContent?.includes("Event Selected")).length
      : 0,
    natureSelectedWidgets: document.querySelectorAll("div").length
      ? Array.from(document.querySelectorAll("div")).filter((el) => el.textContent?.includes("Nature Observation")).length
      : 0,
  }));

  console.log(JSON.stringify({ fungalCount, eventCount, fungalPopupCount, eventPopupCount, selectedAfterFungal, selectedImmediatelyAfterEvent, selectedAfterEvent, markerDebug, clickDebug, lastMapMarkerClick, markerPopupDebug, mapPopupDebug, popupClassCounts, fallbackWidgetCounts, pageErrors, consoleErrors }));
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
