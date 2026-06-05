import { chromium } from "../node_modules/playwright/index.mjs";

const durationMs = Number(process.env.CODEX_EARTH_SOAK_MS || 10 * 60 * 1000);
const stepMs = Number(process.env.CODEX_EARTH_SOAK_STEP_MS || 30 * 1000);
const url =
  process.env.CODEX_EARTH_SOAK_URL ||
  "http://localhost:3010/natureos/earth-simulator?lat=32.7157&lng=-117.1611&zoom=10&_codex_long_freeze_soak=1";

const fatalLogPatterns = [
  /removeChild/i,
  /Should not already be working/i,
  /Unhandled Runtime Error/i,
  /pageerror/i,
];

function isFatalLog(entry) {
  return fatalLogPatterns.some((pattern) => pattern.test(entry.text || ""));
}

function isKnownNonBlockingSilencedError(entry) {
  const msg = entry?.msg || entry?.text || "";
  const stack = entry?.stack || "";
  return (
    /Cannot read properties of undefined \(reading 'get'\)/i.test(msg) &&
    /maplibre-gl/i.test(stack) &&
    /continuePlacement|_updatePlacement/i.test(stack)
  );
}

async function withTimeout(label, promise, timeoutMs = 8000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(path, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const started = Date.now();
    const response = await fetch(`http://localhost:3010${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { parseError: text.slice(0, 200) };
    }
    return { ok: response.ok, status: response.status, ms: Date.now() - started, json };
  } catch (error) {
    return { ok: false, status: 0, ms: timeoutMs, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function clickByText(page, needle) {
  const before = await page.evaluate(() => (window.__codexProbeClicks || []).length);
  const target = await page.evaluate((needle) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const button = buttons.find((b) => String(b.textContent || "").includes(needle));
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return {
      text: String(button.textContent || "").trim().slice(0, 80),
      x: Math.round(rect.left + Math.max(8, Math.min(rect.width / 2, rect.width - 8))),
      y: Math.round(rect.top + Math.max(8, Math.min(rect.height / 2, rect.height - 8))),
      disabled: Boolean(button.disabled),
    };
  }, needle);
  if (!target || target.disabled) return { needle, clicked: false, target, before, after: before };
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => (window.__codexProbeClicks || []).length);
  return { needle, clicked: after > before, target, before, after };
}

async function collectState(page, label) {
  return withTimeout(
    `collectState:${label}`,
    page.evaluate((label) => {
      const map = window.__crep_map;
      const hover = document.querySelector('[data-testid="crep-hover-preview"]');
      const eagleTiles = Array.from(document.querySelectorAll("video, img")).filter((el) => {
        const rect = el.getBoundingClientRect();
        const text = String(el.closest("section,div")?.textContent || "");
        return rect.width > 20 && rect.height > 20 && /EAGLE|camera|Caltrans|CCTV/i.test(text);
      });
      return {
        label,
        at: new Date().toISOString(),
        readyState: document.readyState,
        map: map
          ? {
              zoom: Number(map.getZoom?.()?.toFixed?.(2) ?? map.getZoom?.()),
              center: map.getCenter?.(),
              moving: map.isMoving?.(),
              loaded: map.loaded?.(),
              styleLoaded: map.isStyleLoaded?.(),
              layerCount: map.getStyle?.()?.layers?.length ?? null,
            }
          : null,
        ui: {
          hoverText: hover?.textContent?.trim()?.slice(0, 180) || null,
          deviceMarkers: document.querySelectorAll('[data-marker="device"]').length,
          speciesMarkers: document.querySelectorAll('[data-marker="fungal"]').length,
          eventMarkers: document.querySelectorAll('[data-marker="event"]').length,
          eagleMediaCount: eagleTiles.length,
          probeClicks: (window.__codexProbeClicks || []).length,
        },
        debug: {
          marker: window.__map_marker_debug ?? null,
          silencedErrors: window.__crepSilencedErrors ?? null,
          interaction: window.__crep_map_interaction_state ?? null,
          resourceGovernor: window.__crep_resourceGovernor ?? null,
          devicesClick: window.__crep_device_marker_click ?? null,
        },
      };
    }, label),
    8000,
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const logs = [];
const failures = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    logs.push({ type: message.type(), text: message.text().slice(0, 800), at: new Date().toISOString() });
  }
});
page.on("pageerror", (error) => {
  logs.push({ type: "pageerror", text: String(error).slice(0, 1200), at: new Date().toISOString() });
});
page.on("requestfailed", (request) => {
  const url = request.url();
  if (/localhost:3010/.test(url)) {
    logs.push({
      type: "requestfailed",
      text: `${request.method()} ${url} ${request.failure()?.errorText || ""}`.slice(0, 800),
      at: new Date().toISOString(),
    });
  }
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

const started = Date.now();
let iteration = 0;
let lastFatalCount = 0;

while (Date.now() - started < durationMs) {
  iteration += 1;
  const elapsedMs = Date.now() - started;

  try {
    for (let y = 260; y <= 740; y += 120) {
      for (let x = 600; x <= 1180; x += 145) {
        await page.mouse.move(x, y, { steps: 4 });
        await page.waitForTimeout(40);
      }
    }
    if (iteration % 3 === 0) {
      await page.mouse.wheel(0, -260);
      await page.waitForTimeout(350);
      await page.mouse.wheel(0, 220);
      await page.waitForTimeout(350);
    }
    if (iteration % 4 === 0) {
      await page.mouse.move(910, 500);
      await page.mouse.down();
      await page.mouse.move(830, 500, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(450);
    }
  } catch (error) {
    failures.push({ kind: "interaction", iteration, error: error instanceof Error ? error.message : String(error) });
  }

  const clickChecks = [];
  if (iteration % 2 === 0) {
    for (const label of ["MYCA", "NATURE"]) {
      try {
        clickChecks.push(await withTimeout(`click:${label}`, clickByText(page, label), 5000));
      } catch (error) {
        failures.push({ kind: "click", iteration, label, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const [devicesApi, eagleApi, state] = await Promise.all([
    fetchJson("/api/earth-simulator/devices", 5000),
    fetchJson("/api/eagle/sources?bbox=-117.35,32.50,-116.90,32.95&limit=12", 5000),
    collectState(page, `iteration-${iteration}`).catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    })),
  ]);

  const fatalLogs = logs.filter(isFatalLog);
  const newFatalLogs = fatalLogs.slice(lastFatalCount);
  lastFatalCount = fatalLogs.length;
  if (newFatalLogs.length) {
    failures.push({ kind: "fatalLog", iteration, logs: newFatalLogs });
  }
  const blockingSilencedErrors = (state?.debug?.silencedErrors || []).filter(
    (entry) => !isKnownNonBlockingSilencedError(entry),
  );
  if (blockingSilencedErrors.length) {
    failures.push({ kind: "silencedErrors", iteration, errors: blockingSilencedErrors });
  }
  if (clickChecks.some((check) => check.clicked === false)) {
    failures.push({ kind: "clickNotObserved", iteration, clickChecks });
  }

  const deviceStatuses = Array.isArray(devicesApi.json?.devices)
    ? devicesApi.json.devices.map((d) => `${d.id}:${d.status}:${d.source}`).join(",")
    : "none";
  const eagleCount = Array.isArray(eagleApi.json?.sources)
    ? eagleApi.json.sources.length
    : Array.isArray(eagleApi.json?.features)
      ? eagleApi.json.features.length
      : Number(eagleApi.json?.count || 0);

  console.log(
    JSON.stringify({
      progress: true,
      iteration,
      elapsed_s: Math.round(elapsedMs / 1000),
      map: state.map || state.error,
      ui: state.ui || null,
      devices_ms: devicesApi.ms,
      devices: deviceStatuses,
      eagle_ms: eagleApi.ms,
      eagleCount,
      clickChecks,
      fatalLogs: fatalLogs.length,
      newFatalLogs,
      failures: failures.length,
    }),
  );

  const remainingStep = Math.max(0, stepMs - (Date.now() - started - elapsedMs));
  if (remainingStep > 0) await page.waitForTimeout(remainingStep);
}

const finalState = await collectState(page, "final").catch((error) => ({
  error: error instanceof Error ? error.message : String(error),
}));
const fatalLogs = logs.filter(isFatalLog);
const finalSilencedErrors = finalState?.debug?.silencedErrors || [];
const summary = {
  ok: failures.length === 0 && fatalLogs.length === 0,
  duration_s: Math.round((Date.now() - started) / 1000),
  iterations: iteration,
  finalState,
  fatalLogs,
  knownNonBlockingSilencedErrors: finalSilencedErrors.filter(isKnownNonBlockingSilencedError),
  blockingSilencedErrors: finalSilencedErrors.filter((entry) => !isKnownNonBlockingSilencedError(entry)),
  failures,
  recentLogs: logs.slice(-80),
};
console.log(JSON.stringify({ summary }, null, 2));

await browser.close();
