#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PRESETS = {
  "san-diego-border": [[-117.25, 32.45, -116.85, 32.75]],
  "california-border": [[-117.35, 32.45, -114.6, 32.9]],
  "arizona-border": [[-114.9, 31.25, -109.0, 32.9]],
  "new-mexico-border": [[-109.1, 31.25, -103.0, 32.3]],
  "texas-border": [[-106.7, 25.7, -97.0, 32.2]],
  "us-mx-border": [
    [-117.35, 32.45, -114.6, 32.9],
    [-114.9, 31.25, -109.0, 32.9],
    [-109.1, 31.25, -103.0, 32.3],
    [-106.7, 25.7, -97.0, 32.2],
  ],
};

function arg(name, fallback = null) {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function parseBboxes() {
  const preset = arg("preset");
  if (preset) {
    if (!PRESETS[preset]) {
      throw new Error(`Unknown preset "${preset}". Known presets: ${Object.keys(PRESETS).join(", ")}`);
    }
    return PRESETS[preset];
  }
  const bboxRaw = arg("bbox", "-117.25,32.45,-116.85,32.75");
  return bboxRaw.split(";").map((part) => {
    const nums = part.split(",").map((v) => Number(v.trim()));
    if (nums.length !== 4 || nums.some((v) => !Number.isFinite(v))) {
      throw new Error(`Invalid bbox "${part}". Expected west,south,east,north`);
    }
    return nums;
  });
}

function normalizeUrl(url, base) {
  if (!url || typeof url !== "string") return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

function isHls(url) {
  return /\.m3u8(?:[?#]|$)/i.test(url);
}

function isImage(url) {
  return /\.(?:jpe?g|png|webp|gif)(?:[?#]|$)/i.test(url) || /\/api\/eagle\/cam-image/i.test(url);
}

function safeProvider(source) {
  return String(source.provider || "unknown").toLowerCase();
}

async function timedFetch(url, init = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
    const elapsed_ms = Math.round(performance.now() - started);
    return { res, elapsed_ms };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(rawUrl, base, kind) {
  const url = normalizeUrl(rawUrl, base);
  if (!url) return { kind, status: "invalid_url", url: rawUrl || null };

  try {
    if (isHls(url)) {
      const { res, elapsed_ms } = await timedFetch(url, {
        headers: { Accept: "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*" },
      });
      const text = await res.text().catch(() => "");
      return {
        kind,
        url,
        status: res.ok && /#EXTM3U/i.test(text) ? "playable" : "bad_hls",
        http_status: res.status,
        content_type: res.headers.get("content-type"),
        elapsed_ms,
        bytes_sampled: text.length,
      };
    }

    if (isImage(url)) {
      const { res, elapsed_ms } = await timedFetch(url, {
        headers: { Accept: "image/*,*/*", Range: "bytes=0-4095" },
      });
      const contentType = res.headers.get("content-type") || "";
      return {
        kind,
        url,
        status: res.ok && /^image\//i.test(contentType) ? "playable" : "bad_image",
        http_status: res.status,
        content_type: contentType,
        elapsed_ms,
      };
    }

    const { res, elapsed_ms } = await timedFetch(url, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml,*/*" },
    }, 6_000);
    return {
      kind,
      url,
      status: res.ok ? "embed_reachable" : "embed_unreachable",
      http_status: res.status,
      content_type: res.headers.get("content-type"),
      elapsed_ms,
    };
  } catch (error) {
    return {
      kind,
      url,
      status: error?.name === "AbortError" ? "timeout" : "fetch_error",
      error: error?.message || String(error),
    };
  }
}

async function loadSources(base, bbox, limit, fast) {
  const params = new URLSearchParams({ bbox: bbox.join(","), limit: String(limit), live: "0" });
  if (fast) params.set("fast", "1");
  const url = `${base.replace(/\/$/, "")}/api/eagle/sources?${params}`;
  const { res, elapsed_ms } = await timedFetch(url, { headers: { Accept: "application/json" } }, 15_000);
  if (!res.ok) {
    throw new Error(`Eagle sources ${res.status} for ${url}`);
  }
  const json = await res.json();
  return { url, elapsed_ms, sources: Array.isArray(json.sources) ? json.sources : [] };
}

async function auditSource(source, base) {
  const provider = safeProvider(source);
  const checks = [];
  if (source.stream_url) checks.push(await checkUrl(source.stream_url, base, "stream_url"));
  if (source.media_url) checks.push(await checkUrl(source.media_url, base, "media_url"));
  if (!source.stream_url && !source.media_url && source.embed_url) {
    checks.push(await checkUrl(source.embed_url, base, "embed_url"));
  }

  const playable = checks.some((c) => c.status === "playable");
  const reachableEmbed = checks.some((c) => c.status === "embed_reachable");
  const metadataOnly = !source.stream_url && !source.media_url && Boolean(source.embed_url);
  const status = playable
    ? "playable"
    : metadataOnly && provider === "cbp"
      ? "metadata_only"
      : reachableEmbed
        ? "embed_only"
        : checks.length
          ? "failing"
          : "no_media";

  return {
    id: source.id,
    name: source.name,
    provider,
    lat: source.lat,
    lng: source.lng,
    status,
    has_stream_url: Boolean(source.stream_url),
    has_media_url: Boolean(source.media_url),
    has_embed_url: Boolean(source.embed_url),
    checks,
  };
}

function summarize(results) {
  const by_status = {};
  const by_provider = {};
  for (const row of results) {
    by_status[row.status] = (by_status[row.status] || 0) + 1;
    by_provider[row.provider] ||= {};
    by_provider[row.provider][row.status] = (by_provider[row.provider][row.status] || 0) + 1;
  }
  return { total: results.length, by_status, by_provider };
}

async function main() {
  const base = arg("base", "http://localhost:3010");
  const limit = Number(arg("limit", "160"));
  const fast = hasFlag("fast");
  const concurrency = Math.max(1, Number(arg("concurrency", "6")));
  const out = arg("out", `docs/reports/eagle-camera-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const bboxes = parseBboxes();

  const sourceMap = new Map();
  const loads = [];
  for (const bbox of bboxes) {
    const load = await loadSources(base, bbox, limit, fast);
    loads.push({ bbox, url: load.url, elapsed_ms: load.elapsed_ms, count: load.sources.length });
    for (const source of load.sources) {
      if (source?.id) sourceMap.set(String(source.id), source);
    }
  }

  const sources = Array.from(sourceMap.values());
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < sources.length) {
      const source = sources[cursor++];
      results.push(await auditSource(source, base));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length || 1) }, worker));
  results.sort((a, b) => String(a.provider).localeCompare(String(b.provider)) || String(a.id).localeCompare(String(b.id)));

  const report = {
    generated_at: new Date().toISOString(),
    base,
    bboxes,
    loads,
    summary: summarize(results),
    results,
    notes: [
      "This audit only checks public or already-configured Eagle Eye URLs.",
      "CBP BWT rows without stream_url/media_url are classified as metadata_only, not CCTV.",
      "Run this from MAS/MINDEX automation for scheduled audits; do not run it inside the Earth Simulator UI.",
    ],
  };

  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ out, summary: report.summary, loads }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
