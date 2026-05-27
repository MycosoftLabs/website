/**
 * Earth Simulator Pass 2 browser verification (read-only)
 */
import { chromium } from "@playwright/test";

const URL = "http://localhost:3010/natureos/earth-simulator";

async function getChipState(page, labelRe) {
  const btn = page.locator("button[aria-pressed]").filter({ hasText: labelRe }).first();
  if ((await btn.count()) === 0) return { found: false, pressed: null };
  return { found: true, pressed: (await btn.getAttribute("aria-pressed")) === "true" };
}

async function flySanDiego(page) {
  const metroToggle = page.getByRole("button", { name: /Show US metro fly-to buttons/i });
  await metroToggle.click({ timeout: 15_000 });
  await page.getByRole("button", { name: "San Diego + Tijuana" }).click({ timeout: 10_000 });
}

async function openIntelTab(page) {
  const rightPanel = page.locator('[data-panel="right"]').first();
  await rightPanel.locator("button").nth(1).click({ timeout: 10_000 });
}

async function readViewportIntelPanel(page) {
  const header = page.locator("text=VIEWPORT INTELLIGENCE").first();
  await header.waitFor({ state: "visible", timeout: 20_000 });
  const panel = header.locator("xpath=ancestor::div[contains(@class,'space-y')][1]");
  return panel.innerText();
}

async function readMarkerDebug(page) {
  return page.evaluate(() => {
    const d = window.__crep_marker_debug || {};
    return {
      mapZoom: d.mapZoom ?? 0,
      hasMapBounds: !!d.hasMapBounds,
      visible: d.visibleFungalObservations ?? 0,
      stored: d.fungalObservations ?? 0,
      rendered: d.renderedFungalForMap ?? 0,
      natureFiltersEnabled: d.natureFiltersEnabled,
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = {};

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.reload({ waitUntil: "networkidle", timeout: 120_000 }).catch(() => page.waitForTimeout(4000));
    await page.waitForTimeout(5000);

    const ecm = await getChipState(page, /EcM/i);
    const am = await getChipState(page, /^AM$|AM Fungi/i);
    results.check1 = {
      ecmFound: ecm.found,
      ecmPressed: ecm.pressed,
      amFound: am.found,
      amPressed: am.pressed,
      pass: ecm.found && ecm.pressed === true && am.found && am.pressed === false,
    };

    await flySanDiego(page);

    let debug = { mapZoom: 0, visible: 0, stored: 0, rendered: 0, hasMapBounds: false };
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(1000);
      debug = await readMarkerDebug(page);
      if (debug.mapZoom >= 10 && debug.hasMapBounds && debug.visible > 120) break;
      if (debug.mapZoom >= 10 && debug.hasMapBounds && debug.stored > 120 && i >= 50) break;
    }

    results.check2 = {
      zoom: debug.mapZoom,
      visible: debug.visible,
      stored: debug.stored,
      rendered: debug.rendered,
      hasMapBounds: debug.hasMapBounds,
      pass: debug.mapZoom >= 10 && debug.visible > 120,
    };

    await openIntelTab(page);
    let panelText = "";
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      try {
        panelText = await readViewportIntelPanel(page);
        if (/San Diego/i.test(panelText)) break;
      } catch {
        /* retry */
      }
    }

    results.check3 = {
      hasSanDiego: /San Diego/i.test(panelText),
      hasMindex: /MINDEX/i.test(panelText),
      hasSources: /Sources:/i.test(panelText),
      jurisdictionLine: panelText.split("\n").find((l) => /San Diego|California|United States/i.test(l)) || "",
      pass: /San Diego/i.test(panelText) && !/MINDEX/i.test(panelText) && !/Sources:/i.test(panelText),
    };
  } catch (err) {
    results.error = String(err?.message || err);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
  const allPass = results.check1?.pass && results.check2?.pass && results.check3?.pass;
  const reason = [];
  if (!results.check1?.pass) reason.push("EcM/AM chips");
  if (!results.check2?.pass)
    reason.push(
      `nature counts (z=${results.check2?.zoom}, visible=${results.check2?.visible}, stored=${results.check2?.stored}, rendered=${results.check2?.rendered})`
    );
  if (!results.check3?.pass) reason.push("Viewport Intelligence");
  console.log(allPass ? "VERDICT: READY_FOR_DEPLOY" : `VERDICT: BLOCKED — ${reason.join("; ")}`);
  process.exit(allPass ? 0 : 1);
}

main();
