import { chromium } from "../node_modules/playwright/index.mjs";

const url =
  "http://localhost:3010/natureos/earth-simulator?lat=32.56289&lng=-117.13570&zoom=14&_codex_click_probe=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const logs = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    logs.push({ type: message.type(), text: message.text().slice(0, 260) });
  }
});
page.on("pageerror", (error) => {
  logs.push({ type: "pageerror", text: String(error).slice(0, 600) });
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
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

await page.waitForTimeout(40000);

const before = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"))
    .map((button, index) => {
      const rect = button.getBoundingClientRect();
      return {
        index,
        text: String(button.textContent || button.getAttribute("aria-label") || button.title || "")
          .trim()
          .slice(0, 70),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        disabled: button.disabled,
        className: String(button.className).slice(0, 140),
      };
    })
    .filter((button) => button.w > 0 && button.h > 0);

  const at = (x, y) => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName,
      text: String(element.textContent || "").trim().slice(0, 80),
      className: String(element.className || "").slice(0, 180),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      pointerEvents: getComputedStyle(element).pointerEvents,
      position: getComputedStyle(element).position,
      zIndex: getComputedStyle(element).zIndex,
    };
  };

  return {
    buttons,
    points: {
      leftPanel: at(180, 520),
      rightPanel: at(1370, 520),
      mapCenter: at(800, 520),
      topControls: at(1400, 130),
    },
    debug: {
      mapInteraction: window.__crep_map_interaction_state ?? null,
      resourceGovernor: window.__crep_resourceGovernor ?? null,
      mapMarker: window.__map_marker_debug ?? null,
      eagleCameraCounts: window.__crep_eagle_camera_counts ?? null,
      eagleEventCounts: window.__crep_eagle_event_counts ?? null,
    },
  };
});

const pickButton = (predicate) => before.buttons.find((button) => button.w > 5 && button.h > 5 && predicate(button));
const clickTargets = [
  pickButton((button) => button.text.includes("ALL OFF")),
  pickButton((button) => button.text.includes("AM Fungi")),
  pickButton((button) => button.text.includes("Birds")),
  pickButton((button) => button.text.includes("Eagle Eye") || button.text.includes("MYCA")),
].filter(Boolean);

for (const target of clickTargets) {
  await page.mouse.click(target.x + Math.min(12, Math.max(2, target.w / 2)), target.y + Math.min(12, Math.max(2, target.h / 2)));
  await page.waitForTimeout(450);
}

const after = await page.evaluate((clickedTargets) => {
  return {
    clickedTargets,
    probeClicks: window.__codexProbeClicks ?? [],
    debug: {
      mapInteraction: window.__crep_map_interaction_state ?? null,
      resourceGovernor: window.__crep_resourceGovernor ?? null,
      mapMarker: window.__map_marker_debug ?? null,
      lastMarkerClick: window.__map_marker_click_debug ?? null,
      eagleCameraCounts: window.__crep_eagle_camera_counts ?? null,
      eagleEventCounts: window.__crep_eagle_event_counts ?? null,
    },
    allButtons: Array.from(document.querySelectorAll("button"))
      .filter((button) => /ALL|AM Fungi|Birds|Eagle Eye|MYCA/i.test(button.textContent || ""))
      .map((button) => ({
        text: String(button.textContent || "").trim().slice(0, 100),
        className: String(button.className).slice(0, 160),
      })),
  };
}, clickTargets);

console.log(JSON.stringify({ before, after, logs: logs.slice(-40) }, null, 2));
await browser.close();
