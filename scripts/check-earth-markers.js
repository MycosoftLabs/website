const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

async function run() {
  const headless = process.env.PW_HEADLESS !== "0";
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const logs = [];
  const screenshotDir = path.join(process.cwd(), "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });

  page.on("console", (message) => {
    logs.push(`console:${message.type()}:${message.text()}`);
  });
  page.on("pageerror", (error) => {
    logs.push(`pageerror:${error.message}`);
  });

  await page.goto("http://localhost:3010/natureos/earth-simulator", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  async function sample(label) {
    const result = await page.evaluate(() => {
      const debug = window.__crep_marker_debug || null;
      const map = window.__crep_map || null;
      const mapContainer = map?.getContainer?.() || null;
      const canvasContainer = map?.getCanvasContainer?.() || null;
      const markerSelector = '[data-map-marker-root="1"],[data-marker="event"],[data-marker="fungal"]';
      const inCanvasContainer = canvasContainer ? canvasContainer.querySelectorAll(markerSelector).length : -1;
      const inCanvasShadow = canvasContainer?.shadowRoot ? canvasContainer.shadowRoot.querySelectorAll(markerSelector).length : -1;
      const canvasContainerChildCount = canvasContainer ? canvasContainer.children.length : -1;
      const canvasContainerChildren = canvasContainer
        ? Array.from(canvasContainer.children).slice(0, 12).map((el) => ({
            tag: el.tagName,
            className: el.className,
            dataMarker: el.getAttribute("data-marker"),
            dataRoot: el.getAttribute("data-map-marker-root"),
          }))
        : [];
      const mapContainerChildCount = mapContainer ? mapContainer.children.length : -1;
      const mapContainerChildren = mapContainer
        ? Array.from(mapContainer.children).slice(0, 20).map((el) => ({
            tag: el.tagName,
            className: el.className,
            dataMarker: el.getAttribute("data-marker"),
            dataRoot: el.getAttribute("data-map-marker-root"),
          }))
        : [];
      return {
        event: document.querySelectorAll('[data-marker="event"]').length,
        fungal: document.querySelectorAll('[data-marker="fungal"]').length,
        allMarkers: document.querySelectorAll(".maplibregl-marker").length,
        markerRoots: document.querySelectorAll('[data-map-marker-root="1"]').length,
        inCanvasContainer,
        inCanvasShadow,
        canvasContainerChildCount,
        canvasContainerChildren,
        mapContainerChildCount,
        mapContainerChildren,
        mapDebug: window.__map_component_debug || null,
        mapMarkerDebug: window.__map_marker_debug || null,
        renderDebug: window.__crep_render_debug || null,
        debug,
      };
    });
    logs.push(`${label}:${JSON.stringify(result)}`);
    await page.screenshot({
      path: path.join(screenshotDir, `${label}.png`),
      fullPage: true,
    });
    console.log(
      `${label} event=${result.event} fungal=${result.fungal} allMarkers=${result.allMarkers} markerRoots=${result.markerRoots} inCanvas=${result.inCanvasContainer} inShadow=${result.inCanvasShadow}`,
    );
    console.log(
      `${label} canvasChildren=${result.canvasContainerChildCount} ${JSON.stringify(result.canvasContainerChildren)}`,
    );
    console.log(
      `${label} mapChildren=${result.mapContainerChildCount} ${JSON.stringify(result.mapContainerChildren)}`,
    );
    if (result.debug) {
      console.log(`${label} debug=${JSON.stringify(result.debug)}`);
    }
    if (result.mapDebug) {
      console.log(`${label} mapDebug=${JSON.stringify(result.mapDebug)}`);
    }
    if (result.mapMarkerDebug) {
      console.log(`${label} mapMarkerDebug=${JSON.stringify(result.mapMarkerDebug)}`);
    }
    if (result.renderDebug) {
      console.log(`${label} renderDebug=${JSON.stringify(result.renderDebug)}`);
    }
  }

  await page.waitForTimeout(5000);
  await sample("earth-persist-t05");
  await page.waitForTimeout(3000);
  await sample("earth-persist-t08");
  await page.waitForTimeout(3000);
  await sample("earth-persist-t11");

  const map = page.locator(".crep-map-container").first();
  await map.hover();
  await page.mouse.wheel(0, -1200);
  await page.waitForTimeout(2000);
  await sample("earth-persist-zoom-in-t13");
  await page.waitForTimeout(4000);
  await sample("earth-persist-zoom-in-t17");

  await page.mouse.wheel(0, 1600);
  await page.waitForTimeout(2000);
  await sample("earth-persist-zoom-out-t19");
  await page.waitForTimeout(4000);
  await sample("earth-persist-zoom-out-t23");

  fs.writeFileSync(path.join(screenshotDir, "earth-persist-log.txt"), `${logs.join("\n")}\n`, "utf8");
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
