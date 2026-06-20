/**
 * Production audit: Earth Simulator at mycosoft.com
 * One-shot script — writes JSON report to stdout.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const URL = process.env.EARTH_SIM_AUDIT_URL || process.env.BASE_URL || "https://mycosoft.com/natureos/earth-simulator";
const OUT_DIR = join(process.cwd(), "tmp", "earth-simulator-audit");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const report = {
    url: URL,
    timestamp: new Date().toISOString(),
    pageLoad: {},
    uiElements: [],
    features: { working: [], broken: [], unknown: [] },
    networkFailures: [],
    consoleErrors: [],
    consoleWarnings: [],
    interactions: [],
    performance: {},
    screenshots: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const failedRequests = [];
  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText ?? "unknown",
    });
  });

  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) {
      failedRequests.push({
        url: res.url(),
        method: res.request().method(),
        status,
      });
    }
  });

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") report.consoleErrors.push(text.slice(0, 500));
    if (type === "warning") report.consoleWarnings.push(text.slice(0, 300));
  });

  page.on("pageerror", (err) => {
    report.consoleErrors.push(`PAGE_ERROR: ${err.message}`.slice(0, 500));
  });

  const navStart = Date.now();
  let response = null;
  try {
    response = await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  } catch (e) {
    report.pageLoad.error = String(e);
  }
  const domReadyMs = Date.now() - navStart;

  report.pageLoad.httpStatus = response?.status() ?? null;
  report.pageLoad.domContentLoadedMs = domReadyMs;

  // Wait for map or loading state to resolve
  await page.waitForTimeout(8000);

  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    report.pageLoad.networkIdleMs = Date.now() - navStart;
  } catch {
    report.pageLoad.networkIdleMs = null;
    report.pageLoad.networkIdleTimeout = true;
  }

  const totalMs = Date.now() - navStart;
  report.pageLoad.totalWaitMs = totalMs;

  // Initial screenshot
  const shot1 = join(OUT_DIR, "01-initial.png");
  await page.screenshot({ path: shot1, fullPage: false });
  report.screenshots.push({ file: shot1, label: "Initial after 8s wait" });

  const bodyText = await page.locator("body").innerText().catch(() => "");
  report.pageLoad.bodyTextSample = bodyText.slice(0, 2000);
  report.pageLoad.stillInitializing =
    /INITIALIZING|Loading|loading/i.test(bodyText) &&
    !/Earth Simulator/i.test(bodyText.slice(0, 500));

  // Collect visible UI via common selectors / aria / text
  const uiChecks = [
    { name: "Map canvas (Mapbox/Cesium)", selectors: ["canvas.mapboxgl-canvas", "canvas", ".mapboxgl-map", "#cesiumContainer", "[data-testid*='map']"] },
    { name: "Layer toggles / controls", selectors: ["[data-testid*='layer']", "button:has-text('Layer')", "[aria-label*='layer' i]", ".layer-control", "[class*='layer']"] },
    { name: "Environment panel", selectors: ["[data-testid*='environment']", ":text('Environment')", "[aria-label*='environment' i]"] },
    { name: "Emergency weather", selectors: [":text('Emergency')", ":text('Weather')", "[data-testid*='weather']", "[data-testid*='emergency']"] },
    { name: "Aircraft", selectors: [":text('Aircraft')", ":text('Aviation')", "[data-testid*='aircraft']", "[data-testid*='aviation']"] },
    { name: "Vessels", selectors: [":text('Vessel')", ":text('Maritime')", "[data-testid*='vessel']"] },
    { name: "Satellites", selectors: [":text('Satellite')", "[data-testid*='satellite']"] },
    { name: "Fungal layer", selectors: [":text('Fungal')", ":text('Fungi')", "[data-testid*='fungal']", "[data-testid*='fungi']"] },
    { name: "Devices / sensors", selectors: [":text('Device')", ":text('Sensor')", "[data-testid*='device']", "[data-testid*='sensor']"] },
    { name: "MYCA / AI chat", selectors: [":text('MYCA')", ":text('Ask MYCA')", "[data-testid*='myca']", "[data-testid*='chat']", "[aria-label*='chat' i]"] },
    { name: "NatureOS navigation", selectors: ["nav", "[role='navigation']", ":text('Earth Simulator')"] },
    { name: "Side panel / drawer", selectors: ["[role='dialog']", "aside", "[data-testid*='panel']", "[data-testid*='sidebar']"] },
  ];

  for (const check of uiChecks) {
    let found = false;
    let count = 0;
    for (const sel of check.selectors) {
      try {
        const loc = page.locator(sel).first();
        if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
          found = true;
          count = await page.locator(sel).count();
          break;
        }
      } catch {
        /* skip invalid selector */
      }
    }
    report.uiElements.push({ feature: check.name, visible: found, matchCount: count });
  }

  // Text-based feature scan
  const featureKeywords = [
    "Layer", "Environment", "Weather", "Aircraft", "Vessel", "Satellite",
    "Fungal", "Fungi", "Device", "Sensor", "MYCA", "CREP", "Earth",
    "Zoom", "Timeline", "Filter", "Search",
  ];
  report.visibleKeywords = featureKeywords.filter((k) =>
    new RegExp(k, "i").test(bodyText)
  );

  // Map canvas dimensions
  const canvasInfo = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll("canvas"));
    return canvases.map((c) => ({
      w: c.width,
      h: c.height,
      clientW: c.clientWidth,
      clientH: c.clientHeight,
      className: c.className?.slice?.(0, 80) ?? "",
    }));
  });
  report.performance.canvasElements = canvasInfo;
  report.features.working.push(
    ...(canvasInfo.some((c) => c.clientW > 100 && c.clientH > 100)
      ? ["Map canvas rendered with non-zero dimensions"]
      : [])
  );
  if (!canvasInfo.some((c) => c.clientW > 100)) {
    report.features.broken.push("No visible map canvas (>100px)");
  }

  // FPS sample via rAF over 2s
  const fpsSample = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (performance.now() - start < 2000) {
          requestAnimationFrame(tick);
        } else {
          resolve({ fps: Math.round((frames / 2) * 10) / 10, frames });
        }
      }
      requestAnimationFrame(tick);
    });
  });
  report.performance.estimatedFps = fpsSample;

  // Interactions
  async function tryClick(label, selectors) {
    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        if ((await el.count()) > 0 && (await el.isVisible())) {
          await el.click({ timeout: 3000 });
          await page.waitForTimeout(1500);
          report.interactions.push({ action: label, selector: sel, success: true });
          return true;
        }
      } catch (e) {
        report.interactions.push({ action: label, selector: sel, success: false, error: String(e).slice(0, 200) });
      }
    }
    return false;
  }

  // Zoom via mapbox controls or wheel
  try {
    const mapCanvas = page.locator("canvas.mapboxgl-canvas, canvas").first();
    if ((await mapCanvas.count()) > 0) {
      const box = await mapCanvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(1000);
        await page.mouse.wheel(0, 400);
        report.interactions.push({ action: "Map zoom wheel in/out", success: true });
      }
    } else {
      report.interactions.push({ action: "Map zoom wheel", success: false, error: "no canvas" });
    }
  } catch (e) {
    report.interactions.push({ action: "Map zoom wheel", success: false, error: String(e).slice(0, 200) });
  }

  await tryClick("Zoom in button", [
    "button[aria-label*='Zoom in' i]",
    ".mapboxgl-ctrl-zoom-in",
    "[title*='Zoom in' i]",
  ]);
  await tryClick("Layer toggle", [
    "button:has-text('Layer')",
    "[data-testid*='layer']",
    "label:has-text('Layer')",
  ]);
  await tryClick("Environment panel", [
    "button:has-text('Environment')",
    "[data-testid*='environment']",
  ]);
  await tryClick("Aircraft layer", [
    "button:has-text('Aircraft')",
    "label:has-text('Aircraft')",
    "[data-testid*='aircraft']",
  ]);
  await tryClick("Open side panel", [
    "button[aria-label*='panel' i]",
    "button[aria-label*='menu' i]",
    "[data-testid*='sidebar']",
  ]);

  const readAircraftCounters = async () => {
    const body = await page.locator("body").innerText().catch(() => "");
    const zoomMatch = body.match(/Z\s+([\d.]+)/);
    const planesMatch = body.match(/Planes:\s*(\d+)/);
    return {
      zoom: zoomMatch ? Number(zoomMatch[1]) : null,
      planes: planesMatch ? Number(planesMatch[1]) : null,
      hasZoomHint: /Zoom in for aircraft/i.test(body),
    };
  };

  const aircraftAtDefaultZoom = await readAircraftCounters();
  report.aircraftLod = { atDefaultZoom: aircraftAtDefaultZoom };
  if (aircraftAtDefaultZoom.zoom != null && aircraftAtDefaultZoom.zoom < 3.5) {
    if (aircraftAtDefaultZoom.hasZoomHint) {
      report.features.working.push("Aircraft zoom hint shown below z3.5");
    } else {
      report.features.broken.push("Aircraft zoom hint missing below z3.5");
    }
  }

  try {
    const mapCanvas = page.locator("canvas.mapboxgl-canvas, canvas").first();
    if ((await mapCanvas.count()) > 0) {
      const box = await mapCanvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        for (let i = 0; i < 8; i += 1) {
          await page.mouse.wheel(0, -500);
          await page.waitForTimeout(250);
        }
        await page.waitForTimeout(4000);
        const aircraftZoomedIn = await readAircraftCounters();
        report.aircraftLod.atZoom4Plus = aircraftZoomedIn;
        if (aircraftZoomedIn.zoom != null && aircraftZoomedIn.zoom >= 3.5) {
          if (aircraftZoomedIn.planes != null && aircraftZoomedIn.planes > 0) {
            report.features.working.push(`Aircraft visible at z${aircraftZoomedIn.zoom} (${aircraftZoomedIn.planes} planes)`);
          } else {
            report.features.unknown.push(`Aircraft layer empty at z${aircraftZoomedIn.zoom} (API may be empty)`);
          }
        }
      }
    }
  } catch (e) {
    report.aircraftLod.zoomInError = String(e).slice(0, 200);
  }

  const shot2 = join(OUT_DIR, "02-after-interactions.png");
  await page.screenshot({ path: shot2, fullPage: false });
  report.screenshots.push({ file: shot2, label: "After interactions" });

  // Dedupe network failures
  const seen = new Set();
  report.networkFailures = failedRequests.filter((r) => {
    const key = `${r.url}|${r.status ?? r.failure}`;
    if (seen.has(key)) return false;
    seen.add(key);
    // Ignore analytics / third-party noise optionally
    return true;
  }).slice(0, 80);

  // Classify API failures
  const apiFailures = report.networkFailures.filter(
    (r) =>
      r.url.includes("/api/") ||
      r.url.includes("192.168") ||
      r.url.includes("mindex") ||
      r.url.includes("mas") ||
      r.url.includes("crep") ||
      r.url.includes("earth")
  );
  report.apiFailures = apiFailures;

  report.consoleErrors = [...new Set(report.consoleErrors)].slice(0, 30);
  report.consoleWarnings = [...new Set(report.consoleWarnings)].slice(0, 20);

  // Feature working/broken heuristics
  for (const el of report.uiElements) {
    if (el.visible) report.features.working.push(el.feature);
    else report.features.unknown.push(el.feature);
  }
  if (/INITIALIZING CREP/i.test(bodyText) && totalMs > 10000) {
    report.features.broken.push("CREP stuck on INITIALIZING after extended wait");
  }
  if (report.consoleErrors.length > 0) {
    report.features.broken.push(`${report.consoleErrors.length} console error(s)`);
  }
  if (apiFailures.length > 0) {
    report.features.broken.push(`${apiFailures.length} API/network failure(s)`);
  }

  writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(JSON.stringify({ fatal: String(e) }));
  process.exit(1);
});
