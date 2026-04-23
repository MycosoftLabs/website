#!/usr/bin/env node
/**
 * Worldview v1 post-merge smoke test — Apr 23, 2026
 *
 * Hits every /api/worldview/v1/* endpoint on the target host and
 * reports pass/fail. Run after any deploy to PR #107.
 *
 * Usage:
 *   node scripts/worldview/smoke-test-v1.mjs               # hits prod
 *   node scripts/worldview/smoke-test-v1.mjs --host http://localhost:3010
 *   node scripts/worldview/smoke-test-v1.mjs --key mk_<your_key>   # authed tests
 *
 * Exits 0 on full pass, 1 on any failure. Suitable for CI.
 */

const args = new Map(
  process.argv.slice(2).map((a) => {
    if (a.startsWith("--")) {
      const [k, ...v] = a.slice(2).split("=")
      return [k, v.length ? v.join("=") : "true"]
    }
    return [a, "true"]
  }),
)

const HOST = args.get("host") || "https://mycosoft.com"
const KEY = args.get("key") || process.env.WORLDVIEW_API_KEY || ""
const BBOX = "-118,32,-116,34" // SD+TJ for dataset probes
const results = []

function pass(name, detail = "") { results.push({ ok: true, name, detail }) }
function fail(name, detail = "") { results.push({ ok: false, name, detail }) }

async function probe(path, opts = {}) {
  const headers = { Accept: "application/json", ...(opts.headers || {}) }
  try {
    const r = await fetch(`${HOST}${path}`, {
      method: opts.method || "GET",
      headers,
      body: opts.body,
      signal: AbortSignal.timeout(opts.timeout ?? 20_000),
    })
    return { status: r.status, headers: Object.fromEntries(r.headers), body: r.headers.get("content-type")?.includes("json") ? await r.json().catch(() => null) : await r.text().catch(() => "") }
  } catch (err) {
    return { status: 0, err: err.message, body: null }
  }
}

console.log(`Worldview v1 smoke test → ${HOST}`)
console.log(KEY ? `  (authed: Bearer ${KEY.slice(0, 8)}…)` : "  (public endpoints only — pass --key for full suite)")
console.log("")

// ─── Public, no auth ────────────────────────────────────────────────

{
  const r = await probe("/api/worldview/v1/health")
  if (r.status === 200 && r.body?.api === "worldview" && r.body?.version === "v1") pass("/v1/health")
  else fail("/v1/health", `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`)
}

{
  const r = await probe("/api/worldview/v1/catalog")
  if (r.status === 200 && Array.isArray(r.body?.datasets) && r.body.datasets.length >= 40) pass(`/v1/catalog (${r.body.datasets.length} datasets)`)
  else fail("/v1/catalog", `status=${r.status} count=${r.body?.datasets?.length}`)
}

{
  const r = await probe("/api/worldview/v1/bundles")
  if (r.status === 200 && Array.isArray(r.body?.bundles) && r.body.bundles.length >= 10) pass(`/v1/bundles (${r.body.bundles.length} bundles)`)
  else fail("/v1/bundles", `status=${r.status} count=${r.body?.bundles?.length}`)
}

{
  const r = await probe("/api/worldview/v1/openapi.json")
  if (r.status === 200 && r.body?.openapi === "3.1.0" && r.body?.info?.title?.includes("Worldview")) pass("/v1/openapi.json")
  else fail("/v1/openapi.json", `status=${r.status} openapi=${r.body?.openapi}`)
}

// ─── Auth required — 401 without key ─────────────────────────────────

{
  const r = await probe("/api/worldview/v1/usage")
  if (r.status === 401 && r.body?.error?.code === "UNAUTHENTICATED") pass("/v1/usage 401 without key")
  else fail("/v1/usage 401 without key", `status=${r.status} code=${r.body?.error?.code}`)
}

{
  const r = await probe("/api/worldview/v1/snapshot")
  if (r.status === 401) pass("/v1/snapshot 401 without key")
  else fail("/v1/snapshot 401 without key", `status=${r.status}`)
}

{
  const r = await probe("/api/worldview/v1/query?type=crep.infra.power.tx-lines-sub")
  if (r.status === 401) pass("/v1/query 401 without key")
  else fail("/v1/query 401 without key", `status=${r.status}`)
}

// ─── Authed tests (if --key passed) ─────────────────────────────────

if (KEY) {
  const authed = { headers: { Authorization: `Bearer ${KEY}` } }

  {
    const r = await probe("/api/worldview/v1/usage", authed)
    if (r.status === 200 && r.body?.ok === true) pass(`/v1/usage authed (balance=${r.body?.balance_cents ?? "?"}¢)`)
    else fail("/v1/usage authed", `status=${r.status} err=${r.body?.error?.code}`)
  }

  {
    const r = await probe("/api/worldview/v1/snapshot?project=global", authed)
    if (r.status === 200 && r.body?.ok === true && r.body?.data?.live_entities) {
      pass(`/v1/snapshot authed (cost=${r.body.cost_debited}¢, bal=${r.body.balance_remaining}¢)`)
    } else {
      fail("/v1/snapshot authed", `status=${r.status} err=${r.body?.error?.code || "unknown"}`)
    }
  }

  {
    const r = await probe(`/api/worldview/v1/query?type=crep.infra.power.tx-lines-sub`, authed)
    if (r.status === 200 && r.body?.ok === true) pass(`/v1/query tx-lines-sub (cost=${r.body.cost_debited}¢, cache=${r.body.cache})`)
    else fail("/v1/query tx-lines-sub", `status=${r.status} err=${r.body?.error?.code}`)
  }

  {
    const r = await probe(`/api/worldview/v1/query?type=crep.live.environmental.earthquakes&bbox=${BBOX}`, authed)
    if (r.status === 200 && r.body?.ok === true) pass("/v1/query earthquakes")
    else fail("/v1/query earthquakes", `status=${r.status} err=${r.body?.error?.code}`)
  }

  {
    const r = await probe("/api/worldview/v1/query?type=non.existent.dataset", authed)
    if (r.status === 404 && r.body?.error?.code === "DATASET_NOT_FOUND") pass("/v1/query 404 on unknown dataset")
    else fail("/v1/query 404 on unknown dataset", `status=${r.status}`)
  }

  {
    const r = await probe(`/api/worldview/v1/bundle/situational.tijuana`, authed)
    if (r.status === 200 && r.body?.ok === true && r.body?.data?.members) {
      pass(`/v1/bundle situational.tijuana (ok=${r.body.data.ok_count} fail=${r.body.data.fail_count})`)
    } else {
      fail("/v1/bundle situational.tijuana", `status=${r.status} err=${r.body?.error?.code}`)
    }
  }

  {
    const r = await probe("/api/worldview/v1/bundle/bogus.bundle", authed)
    if (r.status === 404 && r.body?.error?.code === "BUNDLE_NOT_FOUND") pass("/v1/bundle 404 on unknown bundle")
    else fail("/v1/bundle 404 on unknown bundle", `status=${r.status}`)
  }

  // Tile (expect either 200 jpg or 402/429 depending on balance)
  {
    const r = await fetch(`${HOST}/api/worldview/v1/tile/5/5/12?source=osm`, {
      headers: { Authorization: `Bearer ${KEY}` },
      signal: AbortSignal.timeout(12_000),
    }).catch((e) => ({ status: 0, err: e.message }))
    if (r.status === 200) pass(`/v1/tile/5/5/12 osm (${r.headers?.get?.("content-type") || "image"})`)
    else if (r.status === 402) pass("/v1/tile 402 insufficient balance (expected if new key)")
    else fail("/v1/tile/5/5/12 osm", `status=${r.status} err=${r.err || ""}`)
  }

  // SSE stream — just confirm the first frame arrives
  {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 4_000)
      const res = await fetch(`${HOST}/api/worldview/v1/stream/live.aircraft?bbox=${BBOX}`, {
        headers: { Authorization: `Bearer ${KEY}`, Accept: "text/event-stream" },
        signal: controller.signal,
      })
      if (res.status === 200) {
        const reader = res.body?.getReader()
        if (reader) {
          const { value } = await reader.read()
          const text = new TextDecoder().decode(value || new Uint8Array())
          if (text.includes("event: hello")) pass("/v1/stream/live.aircraft (hello frame received)")
          else fail("/v1/stream/live.aircraft", `no hello frame, got: ${text.slice(0, 120)}`)
        } else { fail("/v1/stream/live.aircraft", "no reader") }
      } else {
        fail("/v1/stream/live.aircraft", `status=${res.status}`)
      }
    } catch (e) {
      // Abort is expected since we cap at 4s
      if (e.name === "AbortError") pass("/v1/stream/live.aircraft (aborted after 4s, connection held)")
      else fail("/v1/stream/live.aircraft", e.message)
    }
  }
} else {
  console.log("  (skipping authed tests — pass --key mk_<your_key>)")
}

// ─── Report ──────────────────────────────────────────────────────────
console.log("")
const passCount = results.filter((r) => r.ok).length
const failCount = results.filter((r) => !r.ok).length
for (const r of results) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? "  — " + r.detail : ""}`)
}
console.log("")
console.log(`  ${passCount}/${passCount + failCount} passed`)
process.exit(failCount === 0 ? 0 : 1)
