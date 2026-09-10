import { chromium } from "playwright";

const origin = process.env.EARTH_SIM_ORIGIN || "http://localhost:3010";
const url = process.env.EARTH_SIM_URL || `${origin}/natureos/earth-simulator`;
const BATCH = 1;

const catalog = await (await fetch(`${origin}/api/crep/field/_catalog`)).json();
const fields = [];
for (const dataset of catalog.datasets || []) {
  for (const variable of dataset.variables || []) {
    const manifest = await (await fetch(`${origin}/api/crep/field/${dataset.id}/${variable.key}`)).json();
    fields.push({
      dataset: dataset.id,
      variable: variable.key,
      render: variable.render,
      bff: `/api/crep/field/${dataset.id}/${variable.key}`,
      baked: Boolean(manifest.baked),
      frames: Array.isArray(manifest.frames) ? manifest.frames.length : 0,
    });
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];

async function readyGlobe() {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector('[data-testid="earth-sim-live-data-filters"] button, canvas.maplibregl-canvas', { timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__crep_map?.getStyle), { timeout: 60_000 });
  await page.waitForTimeout(5000);
}

async function probeField(pfx) {
  return page.evaluate((id) => {
    const style = window.__crep_map?.getStyle?.() || {};
    const sources = Object.keys(style.sources || {}).filter((sid) => sid.startsWith(`${id}-src-`));
    const wind = Boolean(document.querySelector(`canvas[class*="crep-wind-${id.replace("crep-field-", "")}"]`));
    return { sources: sources.length, windCanvas: wind };
  }, pfx);
}

try {
  await readyGlobe();
  for (let n = 0; n < fields.length; n++) {
    if (n > 0 && n % BATCH === 0) await readyGlobe();
    const field = fields[n];
    const pfx = `crep-field-${field.dataset}-${field.variable}`;
    const used = page.locator(`[data-crep-layer-toggle="${pfx}"]`).first();
    const row = {
      layer: `${field.dataset}/${field.variable}`,
      source: field.bff,
      baked: field.baked,
      frames: field.frames,
      render: field.render,
      chipFound: (await used.count()) > 0,
      draw: false,
      sources: 0,
      windCanvas: false,
      emptyHonest: field.baked === false && field.frames === 0,
    };
    if (!row.chipFound) {
      results.push({ ...row, error: "chip missing" });
      continue;
    }
    try {
      await used.click({ force: true, timeout: 8_000 });
    } catch (err) {
      results.push({ ...row, error: err instanceof Error ? err.message : String(err) });
      await readyGlobe();
      continue;
    }
    let probe = await probeField(pfx);
    for (let i = 0; i < 8 && field.baked && !(field.render === "wind" ? probe.windCanvas : probe.sources > 0); i++) {
      await page.waitForTimeout(500);
      probe = await probeField(pfx);
    }
    row.sources = probe.sources;
    row.windCanvas = probe.windCanvas;
    row.draw = field.render === "wind" ? probe.windCanvas || probe.sources > 0 : probe.sources > 0;
    results.push(row);
    await used.click({ force: true });
    await page.waitForTimeout(250);
  }

  const aerosolChip = page.locator('[data-crep-layer-toggle="aerosolParticulate"]').first();
  if (await aerosolChip.count()) {
    const aq = await fetch(`${origin}/api/crep/environment/air-quality`).then((r) => ({ ok: r.ok })).catch(() => ({ ok: false }));
    await aerosolChip.click({ force: true });
    await page.waitForTimeout(2000);
    const aerosol = await page.evaluate(() => Boolean(window.__crep_map?.getStyle?.()?.sources?.["fusarium-aerosol-particulate"]));
    results.push({
      layer: "aerosolParticulate",
      source: "/api/crep/environment/air-quality",
      baked: aq.ok,
      frames: 0,
      render: "points",
      chipFound: true,
      draw: aerosol,
      sources: aerosol ? 1 : 0,
      windCanvas: false,
      emptyHonest: aq.ok && !aerosol,
    });
  }
} catch (err) {
  results.push({ error: err instanceof Error ? err.message : String(err) });
} finally {
  await browser.close();
}

const summary = {
  url,
  catalogBound: catalog.base_configured === true,
  layers: results,
  drawn: results.filter((r) => r.draw).map((r) => r.layer),
  emptyHonest: results.filter((r) => r.emptyHonest && !r.draw).map((r) => r.layer),
  failed: results.filter((r) => r.baked && !r.draw && !r.emptyHonest && !r.error).map((r) => r.layer),
};
console.log(JSON.stringify(summary, null, 2));
if (summary.failed.length || results.some((r) => r.error)) process.exitCode = 2;
