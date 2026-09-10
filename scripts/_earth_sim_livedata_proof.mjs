import { chromium } from "playwright";

const url = process.env.EARTH_SIM_URL || "http://localhost:3010/natureos/earth-simulator";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const fieldGets = [];
page.on("response", (res) => {
  const u = res.url();
  if (u.includes("/api/crep/field/era5/t2m")) {
    fieldGets.push({ url: u, status: res.status(), ok: res.ok() });
  }
});

const result = {
  pageStatus: null,
  liveDataVisible: false,
  chipOn: false,
  before: null,
  after: null,
  after2s: null,
  fieldGets,
  error: null,
};

try {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  result.pageStatus = resp?.status() ?? null;
  result.title = await page.title();
  await page.waitForSelector(".crep-dashboard-root, [data-testid='earth-sim-live-data'], canvas.maplibregl-canvas", { timeout: 60_000 }).catch(() => null);
  await page.waitForTimeout(4000);
  result.liveDataVisible = (await page.locator('[data-testid="earth-sim-live-data"]').count()) > 0;
  result.bodySnippet = (await page.locator("body").innerText()).slice(0, 400);
  result.before = await page.evaluate(() => {
    const map = window.__crep_map;
    if (!map || typeof map.getStyle !== "function") return { ready: false, reason: "no __crep_map" };
    const style = map.getStyle() || {};
    const sources = Object.keys(style.sources || {}).filter((id) => id.startsWith("crep-field-era5-t2m-src-"));
    return { ready: true, zoom: map.getZoom?.(), sourceCount: sources.length, sources };
  });

  const chip = page.locator('[data-testid="earth-sim-live-data-filters"] button').filter({ hasText: /2 m Temperature|t2m|ERA5/i }).first();
  result.chipCount = await page.locator('[data-testid="earth-sim-live-data-filters"] button').count();
  result.chipTexts = (await page.locator('[data-testid="earth-sim-live-data-filters"] button').allTextContents()).slice(0, 12);

  if (await chip.count()) {
    await chip.click({ force: true });
    await page.waitForTimeout(6000);
    result.chipOn = (await chip.textContent() || "").includes("On");
    result.after = await page.evaluate(() => {
      const map = window.__crep_map;
      if (!map || typeof map.getStyle !== "function") return { ready: false, reason: "no __crep_map" };
      const style = map.getStyle() || {};
      const sources = Object.keys(style.sources || {}).filter((id) => id.startsWith("crep-field-era5-t2m-src-"));
      const layers = (style.layers || [])
        .filter((l) => String(l.id || "").startsWith("crep-field-era5-t2m-lyr-"))
        .map((l) => ({ id: l.id, opacity: map.getPaintProperty?.(l.id, "raster-opacity") }));
      return {
        ready: true,
        zoom: map.getZoom?.(),
        sourceCount: sources.length,
        sources,
        layers,
        hasSrc0: Boolean(map.getSource?.("crep-field-era5-t2m-src-0")),
        liveData: window.__crep_live_data || null,
        allSources: Object.keys(style.sources || {}).filter((id) => id.includes("field") || id.includes("aerosol") || id.includes("era5")),
      };
    });
    await page.waitForTimeout(1500);
    result.after2s = await page.evaluate(() => {
      const map = window.__crep_map;
      if (!map) return { ready: false };
      const style = map.getStyle() || {};
      const layers = (style.layers || [])
        .filter((l) => String(l.id || "").startsWith("crep-field-era5-t2m-lyr-"))
        .map((l) => map.getPaintProperty?.(l.id, "raster-opacity"));
      return {
        ready: true,
        opacities: layers,
        sourceCount: Object.keys(style.sources || {}).filter((id) => id.startsWith("crep-field-era5-t2m-src-")).length,
      };
    });
  } else {
    result.error = "ERA5 temperature chip not found";
  }
} catch (err) {
  result.error = err instanceof Error ? err.message : String(err);
} finally {
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
if (!result.after?.hasSrc0 && (result.after?.sourceCount || 0) < 1) {
  process.exitCode = 2;
}
