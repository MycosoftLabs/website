import { chromium } from "../node_modules/playwright/index.mjs";

const url =
  "http://localhost:3010/natureos/earth-simulator?lat=32.7157&lng=-117.1611&zoom=11&_codex_sd_freeze_stress=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const logs = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    logs.push({ type: message.type(), text: message.text().slice(0, 500) });
  }
});
page.on("pageerror", (error) => {
  logs.push({ type: "pageerror", text: String(error).slice(0, 800) });
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.evaluate(() => {
  window.__codexProbeClicks = [];
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      window.__codexProbeClicks.push({
        at: Date.now(),
        tag: target?.tagName ?? "",
        text: String(target?.textContent ?? "").trim().slice(0, 80),
        cls: String(target?.className ?? "").slice(0, 160),
      });
    },
    true,
  );
});

await page.waitForTimeout(12_000);

const project = async (lng, lat) =>
  page.evaluate(
    ({ lng, lat }) => {
      const map = window.__crep_map;
      if (!map?.project) return null;
      const p = map.project([lng, lat]);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    },
    { lng, lat },
  );

const devicePoints = (
  await Promise.all([
    project(-117.161087, 32.715736),
    project(-117.085833, 32.640278),
    project(-117.1357, 32.56289),
  ])
).filter(Boolean);

for (let round = 0; round < 4; round += 1) {
  for (const point of devicePoints) {
    await page.mouse.move(point.x, point.y, { steps: 8 });
    await page.waitForTimeout(180);
    await page.mouse.move(point.x + 28, point.y + 18, { steps: 5 });
    await page.waitForTimeout(120);
  }
  for (let y = 260; y <= 730; y += 90) {
    for (let x = 590; x <= 1160; x += 120) {
      await page.mouse.move(x, y, { steps: 4 });
      await page.waitForTimeout(45);
    }
  }
}

await page.mouse.move(1120, 870, { steps: 8 });
await page.waitForTimeout(2_500);

const clickByText = async (needle) => {
  const target = await page.evaluate((needle) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const button = buttons.find((b) => String(b.textContent || "").includes(needle));
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return {
      text: String(button.textContent || "").trim().slice(0, 80),
      x: Math.round(rect.x + Math.min(14, rect.width / 2)),
      y: Math.round(rect.y + Math.min(14, rect.height / 2)),
      disabled: button.disabled,
    };
  }, needle);
  if (!target || target.disabled) return { needle, clicked: false, target };
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(350);
  return { needle, clicked: true, target };
};

const clickResults = [];
clickResults.push(await clickByText("MYCA"));
clickResults.push(await clickByText("DEVICES"));
clickResults.push(await clickByText("AM"));
clickResults.push(await clickByText("Birds"));

if (devicePoints[2]) {
  await page.mouse.click(devicePoints[2].x, devicePoints[2].y);
  await page.waitForTimeout(900);
}

const state = await page.evaluate(() => {
  const at = (x, y) => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName,
      text: String(element.textContent || "").trim().slice(0, 100),
      className: String(element.className || "").slice(0, 180),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      pointerEvents: getComputedStyle(element).pointerEvents,
      zIndex: getComputedStyle(element).zIndex,
    };
  };
  const map = window.__crep_map;
  const hover = document.querySelector('[data-testid="crep-hover-preview"]');
  return {
    url: location.href,
    readyState: document.readyState,
    hoverText: hover?.textContent?.trim() || null,
    probeClicks: window.__codexProbeClicks || [],
    map: map
      ? {
          zoom: Number(map.getZoom?.()?.toFixed?.(2) ?? map.getZoom?.()),
          center: map.getCenter?.(),
          moving: map.isMoving?.(),
          layerCount: map.getStyle?.()?.layers?.length ?? null,
          devicesLayer: Boolean(map.getLayer?.("crep-mycosoft-devices-core")),
          devicesSourceFeatures:
            map.getSource?.("crep-mycosoft-devices")?._data?.features?.length ?? null,
        }
      : null,
    debug: {
      mapInteraction: window.__crep_map_interaction_state ?? null,
      resourceGovernor: window.__crep_resourceGovernor ?? null,
      mapMarker: window.__map_marker_debug ?? null,
      lastMarkerClick: window.__map_marker_click_debug ?? null,
      silencedErrors: window.__crepSilencedErrors ?? null,
      deviceClick: window.__crep_device_marker_click ?? null,
    },
    points: {
      leftPanel: at(350, 520),
      rightPanel: at(1370, 520),
      mapCenter: at(800, 520),
      psathyrella: at(1020, 700),
    },
    visibleDeviceWidget: Boolean(
      document.body.textContent?.includes("Psathyrella Aquatic MycoBrain Buoy"),
    ),
  };
});

const fatalLogPatterns = [
  /removeChild/i,
  /Should not already be working/i,
  /pageerror/i,
  /Cannot read properties of undefined \(reading 'get'\)/i,
];
const fatalLogs = logs.filter((entry) => fatalLogPatterns.some((pattern) => pattern.test(entry.text)));

console.log(
  JSON.stringify(
    {
      ok: fatalLogs.length === 0 && clickResults.every((r) => r.clicked),
      clickResults,
      state,
      fatalLogs,
      logs: logs.slice(-60),
    },
    null,
    2,
  ),
);

await browser.close();
