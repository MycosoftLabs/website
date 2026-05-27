import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const URL = process.env.EARTH_SIM_QA_URL || "http://localhost:3010/natureos/earth-simulator";
const REPORT_DIR = path.resolve("docs/reports");
const REPORT_PATH = path.join(REPORT_DIR, "earth-simulator-local-regression-qa.json");
const SCREENSHOT_PATH = path.join(REPORT_DIR, "earth-simulator-local-regression-qa.png");

function nowIso() {
  return new Date().toISOString();
}

async function waitForMap(page) {
  await page.waitForFunction(() => {
    const map = window.__crep_map;
    return Boolean(map && typeof map.getSource === "function" && typeof map.getZoom === "function");
  }, { timeout: 90_000 });
}

async function chipState(page, label) {
  const locator = page.locator("button[aria-pressed]").filter({ hasText: label }).first();
  if ((await locator.count()) === 0) return { found: false, pressed: null, text: "" };
  return {
    found: true,
    pressed: (await locator.getAttribute("aria-pressed")) === "true",
    text: ((await locator.innerText().catch(() => "")) || "").trim(),
  };
}

async function clickChip(page, label) {
  const locator = page.locator("button[aria-pressed]").filter({ hasText: label }).first();
  const found = (await locator.count()) > 0;
  if (!found) return { label: String(label), found: false, ms: null, pressed: null };
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const start = performance.now();
  await locator.click({ timeout: 10_000 });
  const ms = Math.round(performance.now() - start);
  return {
    label: String(label),
    found: true,
    ms,
    pressed: (await locator.getAttribute("aria-pressed")) === "true",
  };
}

async function sourceCount(page, sourceId) {
  return page.evaluate((id) => {
    const map = window.__crep_map;
    const source = map?.getSource?.(id);
    const data = source?._data || source?.serialize?.()?.data || null;
    return {
      exists: Boolean(source),
      count: Array.isArray(data?.features) ? data.features.length : 0,
    };
  }, sourceId);
}

async function mapSnapshot(page) {
  return page.evaluate(() => {
    const map = window.__crep_map;
    const bounds = map?.getBounds?.();
    return {
      zoom: Number(map?.getZoom?.() || 0),
      center: map?.getCenter?.() ? { lng: map.getCenter().lng, lat: map.getCenter().lat } : null,
      bounds: bounds ? {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      } : null,
      markerDebug: window.__crep_marker_debug || null,
      eagleCounts: window.__crep_eagle_camera_counts || null,
      layers: typeof window.__crep_layers === "function" ? window.__crep_layers() : null,
    };
  });
}

async function jumpTo(page, lng, lat, zoom) {
  await page.evaluate(({ lng, lat, zoom }) => {
    window.dispatchEvent(new CustomEvent("crep:flyto", { detail: { lng, lat, zoom, label: "QA San Diego" } }));
  }, { lng, lat, zoom });
  await page.waitForTimeout(1800);
}

function sumCounts(counts) {
  if (!counts || typeof counts !== "object") return 0;
  return Object.values(counts).reduce((total, value) => total + Number(value || 0), 0);
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const report = {
    generatedAt: nowIso(),
    url: URL,
    checks: {},
    console: [],
    pageErrors: [],
  };

  page.on("console", (msg) => {
    const text = msg.text();
    if (/Failed to load resource|401|404|502|net::ERR/i.test(text)) {
      report.console.push({ type: msg.type(), text: text.slice(0, 400) });
    }
  });
  page.on("pageerror", (error) => {
    report.pageErrors.push(String(error?.message || error));
  });

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await waitForMap(page);
    await page.waitForTimeout(4000);

    report.checks.initial = await mapSnapshot(page);
    report.checks.bootChips = {
      ecm: await chipState(page, /EcM Fungi/i),
      am: await chipState(page, /AM Fungi/i),
      fungi: await chipState(page, /^Fungi$/i),
      plants: await chipState(page, /^Plants$/i),
      birds: await chipState(page, /^Birds$/i),
      mammals: await chipState(page, /^Mammals$/i),
      opacity55: await chipState(page, /^55$/i),
    };

    report.checks.clicks = [];
    report.checks.clicks.push(await clickChip(page, /AM Fungi/i));
    report.checks.clicks.push(await clickChip(page, /EcM Fungi/i));
    report.checks.clicks.push(await clickChip(page, /^Plants$/i));
    report.checks.clicks.push(await clickChip(page, /^Birds$/i));
    report.checks.clicks.push(await clickChip(page, /^Mammals$/i));
    report.checks.afterClicks = await mapSnapshot(page);

    await jumpTo(page, -117.12, 32.66, 11.5);
    for (let i = 0; i < 20; i += 1) {
      const snapshot = await mapSnapshot(page);
      const cameraTotal = sumCounts(snapshot.eagleCounts);
      const markerDebug = snapshot.markerDebug || {};
      if (
        snapshot.zoom >= 11 &&
        Number(markerDebug.mapZoom || 0) >= 11 &&
        cameraTotal >= 20
      ) break;
      await page.waitForTimeout(1000);
    }

    report.checks.sanDiego = await mapSnapshot(page);
    report.checks.sources = {
      eagle: await sourceCount(page, "crep-eagle-cams"),
      cctv: await sourceCount(page, "crep-cctv"),
      liveAircraft: await sourceCount(page, "crep-live-aircraft"),
      liveVessels: await sourceCount(page, "crep-live-vessels"),
      liveSats: await sourceCount(page, "crep-live-satellites"),
    };

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });

    const boot = report.checks.bootChips;
    const clickPass = report.checks.clicks.every((item) => item.found && item.ms != null && item.ms <= 1200);
    const cameraCount = Math.max(
      report.checks.sources.eagle.count,
      report.checks.sources.cctv.count,
      sumCounts(report.checks.sanDiego.eagleCounts),
    );
    const markerDebug = report.checks.sanDiego.markerDebug || {};
    report.pass = Boolean(
      boot.ecm.found &&
      boot.ecm.pressed === true &&
      boot.am.found &&
      boot.am.pressed === false &&
      boot.opacity55.found &&
      boot.opacity55.pressed === true &&
      clickPass &&
      report.checks.sanDiego.zoom >= 11 &&
      cameraCount >= 20 &&
      (Number(markerDebug.visibleFungalObservations || markerDebug.renderedFungalForMap || 0) >= 20 ||
        Number(markerDebug.fungalObservations || 0) >= 100) &&
      report.pageErrors.length === 0
    );
    report.verdict = report.pass ? "LOCAL_QA_PASS" : "LOCAL_QA_BLOCKED";
  } catch (error) {
    report.pass = false;
    report.verdict = "LOCAL_QA_BLOCKED";
    report.error = String(error?.stack || error?.message || error);
  } finally {
    await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  console.log(JSON.stringify({
    pass: report.pass,
    verdict: report.verdict,
    report: REPORT_PATH,
    screenshot: SCREENSHOT_PATH,
    error: report.error || null,
    pageErrors: report.pageErrors.length,
    consoleSignals: report.console.length,
    clickMs: report.checks.clicks?.map((item) => ({ label: item.label, ms: item.ms, pressed: item.pressed })) || [],
    cameraSources: report.checks.sources || null,
    sanDiegoZoom: report.checks.sanDiego?.zoom || null,
  }, null, 2));

  process.exit(report.pass ? 0 : 1);
}

main();
