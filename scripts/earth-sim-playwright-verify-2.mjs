/**
 * Earth Simulator Playwright verification #2 — May 25, 2026
 * (1) hard refresh EcM ON AM OFF
 * (2) fly San Diego, wait 60s for nature counts >120
 * (3) Viewport Intelligence: no MINDEX/Sources
 */
import { chromium } from "@playwright/test";

const URL = "http://127.0.0.1:3010/natureos/earth-simulator";

function parseCount(text) {
  const raw = String(text || "").replace(/,/g, "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

async function getNatureCount(page) {
  return page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll("span")).filter(
      (span) => span.textContent?.trim() === "VIEWPORT INTELLIGENCE",
    );
    const header = headers[0];
    if (!header) return { count: 0, method: "no-panel" };
    let panel = header.parentElement;
    for (let i = 0; i < 8 && panel; i += 1) {
      if (panel.className?.includes?.("space-y-2")) break;
      panel = panel.parentElement;
    }
    if (!panel) return { count: 0, method: "no-panel-root" };

    const labels = Array.from(panel.querySelectorAll("div")).filter(
      (d) => (d.textContent || "").trim().toLowerCase() === "nature",
    );
    for (const label of labels) {
      const box = label.closest(".rounded");
      const numEl = box?.querySelector(".font-bold");
      const num = Number(String(numEl?.textContent || "").replace(/,/g, ""));
      if (Number.isFinite(num)) return { count: num, method: "society-nature" };
    }
    return { count: 0, method: "no-nature-label" };
  });
}

async function getViewportIntelText(page) {
  return page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll("span")).filter(
      (span) => span.textContent?.trim() === "VIEWPORT INTELLIGENCE",
    );
    const header = headers[0];
    if (!header) return "";
    let panel = header.parentElement;
    for (let i = 0; i < 8 && panel; i += 1) {
      if (panel.className?.includes?.("space-y-2")) break;
      panel = panel.parentElement;
    }
    return panel?.innerText || header.parentElement?.innerText || "";
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const results = {
    step1_ecm_on: false,
    step1_am_off: false,
    step2_flew_sd: false,
    step2_nature_count: 0,
    step2_nature_gt_120: false,
    step3_no_mindex: false,
    step3_no_sources: false,
    errors: [],
  };

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });

    await page.waitForTimeout(8000);

    const ecmBtn = page.getByRole("button", { name: /EcM Fungi/i }).first();
    const amBtn = page.getByRole("button", { name: /AM Fungi/i }).first();
    await ecmBtn.waitFor({ state: "visible", timeout: 60_000 });
    await amBtn.waitFor({ state: "visible", timeout: 60_000 });

    results.step1_ecm_on = (await ecmBtn.getAttribute("aria-pressed")) === "true";
    results.step1_am_off = (await amBtn.getAttribute("aria-pressed")) === "false";

    const metroToggle = page.getByRole("button", {
      name: /Show US metro fly-to buttons/i,
    });
    await metroToggle.click({ timeout: 15_000 });
    await page.getByRole("button", { name: /San Diego \+ Tijuana/i }).click({
      timeout: 15_000,
    });
    results.step2_flew_sd = true;
    await page.waitForTimeout(4000);

    await page.locator('[role="tablist"] [value="intel"], [role="tablist"] button:nth-child(2)').first().click({
      timeout: 10_000,
    });
    await page.waitForSelector("text=VIEWPORT INTELLIGENCE", { timeout: 20_000 });

    let maxNature = 0;
    const started = Date.now();
    while (Date.now() - started < 60_000) {
      const nature = await getNatureCount(page);
      if (nature.count > maxNature) maxNature = nature.count;
      if (maxNature > 120) break;
      await page.waitForTimeout(2000);
    }

    results.step2_nature_count = maxNature;
    results.step2_nature_gt_120 = maxNature > 120;

    const intelText = await getViewportIntelText(page);
    results.step3_no_mindex = !/\bMINDEX\b/i.test(intelText);
    results.step3_no_sources = !/\bSources\b/i.test(intelText);
  } catch (err) {
    results.errors.push(String(err?.message || err));
  } finally {
    await browser.close();
  }

  const pass =
    results.step1_ecm_on &&
    results.step1_am_off &&
    results.step2_flew_sd &&
    results.step2_nature_gt_120 &&
    results.step3_no_mindex &&
    results.step3_no_sources &&
    results.errors.length === 0;

  console.log(JSON.stringify({ pass, verdict: pass ? "READY_FOR_DEPLOY" : "BLOCKED", ...results }, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
