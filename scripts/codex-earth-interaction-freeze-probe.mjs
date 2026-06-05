import { chromium } from "playwright";

const url =
  process.argv[2] ||
  "http://localhost:3010/natureos/earth-simulator?lat=32.7157&lng=-117.1611&zoom=10&_codex_interaction_freeze_probe=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const logs = [];
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    logs.push({ type: message.type(), text: message.text().slice(0, 500) });
  }
});
page.on("pageerror", (error) => logs.push({ type: "pageerror", text: String(error).slice(0, 800) }));

function inspectScript(label) {
  return page.evaluate((label) => {
    const describe = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const chain = [];
      let node = element;
      for (let i = 0; node && i < 7; i += 1, node = node.parentElement) {
        const nodeStyle = getComputedStyle(node);
        const nodeRect = node.getBoundingClientRect();
        chain.push({
          tag: node.tagName,
          id: node.id || "",
          cls: String(node.className || "").slice(0, 180),
          text: (node.textContent || "").trim().slice(0, 80),
          pe: nodeStyle.pointerEvents,
          pos: nodeStyle.position,
          z: nodeStyle.zIndex,
          rect: {
            x: Math.round(nodeRect.x),
            y: Math.round(nodeRect.y),
            w: Math.round(nodeRect.width),
            h: Math.round(nodeRect.height),
          },
        });
      }
      return {
        tag: element.tagName,
        id: element.id || "",
        cls: String(element.className || "").slice(0, 220),
        text: (element.textContent || "").trim().slice(0, 100),
        pe: style.pointerEvents,
        pos: style.position,
        z: style.zIndex,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        },
        chain,
      };
    };

    const points = {
      leftNature: [145, 330],
      leftFilters: [190, 590],
      rightPanel: [1360, 430],
      rightEagle: [1350, 850],
      mapCenter: [800, 520],
      topCounts: [1120, 170],
      closeish: [1040, 210],
    };
    const topAt = Object.fromEntries(
      Object.entries(points).map(([key, [x, y]]) => [key, describe(document.elementFromPoint(x, y))])
    );

    const overlays = Array.from(document.querySelectorAll("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          tag: element.tagName,
          id: element.id || "",
          cls: String(element.className || "").slice(0, 180),
          text: (element.textContent || "").trim().slice(0, 80),
          pe: style.pointerEvents,
          pos: style.position,
          z: style.zIndex,
          opacity: style.opacity,
          display: style.display,
          visibility: style.visibility,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          },
        };
      })
      .filter((entry) => {
        const z = Number.parseInt(entry.z, 10);
        return (
          entry.display !== "none" &&
          entry.visibility !== "hidden" &&
          entry.pe !== "none" &&
          (entry.pos === "fixed" || entry.pos === "absolute" || Number.isFinite(z)) &&
          entry.rect.w > 250 &&
          entry.rect.h > 150
        );
      })
      .sort((a, b) => {
        const az = Number.parseInt(a.z, 10);
        const bz = Number.parseInt(b.z, 10);
        return (Number.isFinite(bz) ? bz : -1) - (Number.isFinite(az) ? az : -1);
      })
      .slice(0, 30);

    const counts = {
      popups: document.querySelectorAll(".maplibregl-popup").length,
      popupContents: document.querySelectorAll(".maplibregl-popup-content").length,
      markers: document.querySelectorAll(".maplibregl-marker").length,
      markerContents: document.querySelectorAll("[data-marker]").length,
      markerRoots: document.querySelectorAll("[data-marker-root]").length,
      fixedDialogs: document.querySelectorAll('[role="dialog"]').length,
      toast: document.querySelectorAll("[data-sonner-toast]").length,
    };

    return {
      label,
      ready: document.readyState,
      url: location.href,
      counts,
      topAt,
      overlays,
    };
  }, label);
}

async function clickAt(label, x, y) {
  await page.mouse.click(x, y);
  await page.waitForTimeout(800);
  return inspectScript(label);
}

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(3_000);

const result = [];
result.push(await inspectScript("t3"));
await page.waitForTimeout(12_000);
result.push(await inspectScript("t15"));
result.push(await clickAt("click-left-filter", 172, 570));
result.push(await clickAt("click-map-center", 800, 520));
await page.waitForTimeout(5_000);
result.push(await inspectScript("t21-after-clicks"));

console.log(JSON.stringify({ result, logs }, null, 2));
await browser.close();
