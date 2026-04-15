#!/usr/bin/env node
/**
 * Earth-2 + CREP API smoke test (Apr 15, 2026)
 * - MAS direct: health, /api/earth2/status, grid, wind
 * - Next proxy (optional): same via localhost if dev server is up
 *
 * Usage: node scripts/smoke-earth2-crep.mjs
 *    or: npm run test:earth2:smoke
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnvLocal() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const env = loadEnvLocal();
const MAS =
  process.env.MAS_API_URL ||
  env.MAS_API_URL ||
  "http://192.168.0.188:8001";
const MAS_BASE = MAS.replace(/\/$/, "");

/** Matches FastAPI `earth2_layers_grid` / Next grid route (`variable`, not `layer`) */
const GRID_Q =
  "variable=t2m&north=45&south=40&west=-75&east=-70&resolution=0.5&hours=0";
const WIND_Q =
  "north=45&south=40&west=-75&east=-70&resolution=0.5&hours=0";

const DEV_PORTS = [3010, 3020];

/** Blocks release: MAS up, CREP data path through Next when dev is running */
let criticalFail = 0;
let softWarn = 0;

function pass(name) {
  console.log(`  [PASS] ${name}`);
}
function fail(name, detail) {
  console.log(`  [FAIL] ${name}${detail ? `: ${detail}` : ""}`);
  criticalFail++;
}
function warn(name, detail) {
  console.log(`  [WARN] ${name}${detail ? `: ${detail}` : ""}`);
  softWarn++;
}
function skip(name, reason) {
  console.log(`  [SKIP] ${name} — ${reason}`);
}

async function fetchTile(url, opts = {}) {
  const ms = opts.timeoutMs ?? 120000;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: "image/png,image/*" },
    });
    const buf = new Uint8Array(await r.arrayBuffer());
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    const pngSig = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    return { ok: r.ok, status: r.status, contentType: ct, pngSig };
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url, opts = {}) {
  const ms = opts.timeoutMs ?? 30000;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: "application/json" },
    });
    const text = await r.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { _raw: text.slice(0, 200) };
    }
    return { ok: r.ok, status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

async function runMasDirect() {
  console.log("\n--- MAS direct (" + MAS_BASE + ") ---");

  const h = await fetchJson(`${MAS_BASE}/health`, { timeoutMs: 15000 });
  if (h.ok && h.body && typeof h.body.status === "string") pass("GET /health");
  else fail("GET /health", h.body?.detail || `status ${h.status}`);

  const st = await fetchJson(`${MAS_BASE}/api/earth2/status`, { timeoutMs: 20000 });
  if (st.ok && st.body) pass("GET /api/earth2/status");
  else fail("GET /api/earth2/status", st.body?.detail || `status ${st.status}`);

  const g = await fetchJson(`${MAS_BASE}/api/earth2/layers/grid?${GRID_Q}`, {
    timeoutMs: 60000,
  });
  if (g.ok && g.body && Array.isArray(g.body.grid)) pass("GET /api/earth2/layers/grid (t2m)");
  else if (g.status === 503 || g.status === 502)
    warn(
      "GET /api/earth2/layers/grid (MAS)",
      `status ${g.status} — VM Open-Meteo/Legion path may be down; Next.js still has its own grid fallback`
    );
  else fail("GET /api/earth2/layers/grid (MAS)", g.body?.detail || `status ${g.status}`);

  const w = await fetchJson(`${MAS_BASE}/api/earth2/layers/wind?${WIND_Q}`, {
    timeoutMs: 120000,
  });
  if (w.ok && w.body && Array.isArray(w.body.u) && Array.isArray(w.body.v))
    pass("GET /api/earth2/layers/wind");
  else if (w.status === 404)
    warn("GET /api/earth2/layers/wind", "404 — MAS may need latest earth2 routes or systemd restart");
  else warn("GET /api/earth2/layers/wind", w.body?.detail || `status ${w.status}`);

  const tile = await fetchTile(`${MAS_BASE}/api/earth2/tiles/t2m/3/2/3?hours=0`, {
    timeoutMs: 120000,
  });
  if (tile.ok && tile.pngSig && tile.contentType.includes("png"))
    pass("GET /api/earth2/tiles/t2m (PNG, hours=0)");
  else if (tile.status === 404 || tile.status === 503 || tile.status === 502)
    warn(
      "GET /api/earth2/tiles (MAS)",
      `status ${tile.status} — deploy latest MAS with /api/earth2/tiles or check Open-Meteo`,
    );
  else fail("GET /api/earth2/tiles (MAS)", `status ${tile.status} ct=${tile.contentType}`);
}

async function runNextProxy() {
  console.log("\n--- Next.js proxy (dev server must be running) ---");

  let tested = false;
  for (const port of DEV_PORTS) {
    const base = `http://127.0.0.1:${port}`;
    let ping;
    try {
      ping = await fetchJson(`${base}/api/earth2`, { timeoutMs: 8000 });
    } catch {
      console.log(`  (port ${port}: not reachable)`);
      continue;
    }

    tested = true;
    console.log(`  Using ${base}`);

    if (ping.ok) pass(`[${port}] GET /api/earth2`);
    else warn(`[${port}] GET /api/earth2`, `status ${ping.status} (non-fatal if grid routes work)`);

    const g = await fetchJson(`${base}/api/earth2/layers/grid?${GRID_Q}`, {
      timeoutMs: 90000,
    });
    if (g.ok && g.body && Array.isArray(g.body.grid))
      pass(`[${port}] GET /api/earth2/layers/grid`);
    else fail(`[${port}] GET /api/earth2/layers/grid`, g.body?.error || `status ${g.status}`);

    const w = await fetchJson(`${base}/api/earth2/layers/wind?${WIND_Q}`, {
      timeoutMs: 120000,
    });
    if (w.ok && w.body && Array.isArray(w.body.u) && Array.isArray(w.body.v))
      pass(`[${port}] GET /api/earth2/layers/wind`);
    else if (w.status === 503 && w.body?.available === false)
      warn(`[${port}] GET /api/earth2/layers/wind`, "503 — MAS wind unavailable (Next fallback)");
    else warn(`[${port}] GET /api/earth2/layers/wind`, `status ${w.status}`);

    const tile = await fetchTile(`${base}/api/earth2/tiles/tp/2/1/1?hours=6`, { timeoutMs: 120000 });
    if (tile.ok && tile.pngSig && tile.contentType.includes("png"))
      pass(`[${port}] GET /api/earth2/tiles (Next → MAS, PNG)`);
    else if (tile.status === 404 || tile.status === 503 || tile.status === 502)
      warn(`[${port}] GET /api/earth2/tiles`, `status ${tile.status} — MAS tiles route or upstream`);
    else warn(`[${port}] GET /api/earth2/tiles`, `status ${tile.status} ct=${tile.contentType}`);

    let page;
    try {
      page = await fetch(`${base}/dashboard/crep`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      page = null;
    }
    if (page && (page.status === 200 || page.status === 307 || page.status === 308))
      pass(`[${port}] GET /dashboard/crep (${page.status})`);
    else if (page) warn(`[${port}] GET /dashboard/crep`, `status ${page.status}`);
    else warn(`[${port}] GET /dashboard/crep`, "request failed");
    break;
  }

  if (!tested)
    skip("Next proxy checks", "start `npm run dev` (3010) or `npm run dev:crep` (3020)");
}

async function main() {
  console.log("Earth-2 CREP smoke test");
  console.log("MAS_API_URL:", MAS_BASE);

  await runMasDirect();
  await runNextProxy();

  console.log("\n--- Summary ---");
  if (criticalFail === 0) console.log("Critical checks: passed (MAS health/status + Next grid when dev is up).");
  else console.log(`Critical failures: ${criticalFail}`);
  if (softWarn > 0) console.log(`Warnings: ${softWarn}`);
  console.log("UI: open http://localhost:3010/dashboard/crep and toggle Earth-2 layers (Environment / layers panel).");

  process.exit(criticalFail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
