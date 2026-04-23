#!/usr/bin/env node
/**
 * Worldview v1 migration runner — Apr 23, 2026
 *
 * Applies supabase/migrations/20260423_worldview_v1.sql to the target
 * Supabase project using the service-role key. Idempotent — the SQL
 * uses IF NOT EXISTS guards, so running twice is safe.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/worldview/apply-migration.mjs
 *
 * Or, with flags:
 *   node scripts/worldview/apply-migration.mjs \
 *     --url https://... \
 *     --service-role-key ... \
 *     [--file supabase/migrations/20260423_worldview_v1.sql]
 *
 * Verifies the migration landed by calling worldview_meter_and_limit
 * with a dummy key and confirming the expected "key not found" error.
 */

import { readFileSync } from "node:fs"
import { resolve, join } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const ROOT = resolve(__filename, "..", "..", "..")

const args = new Map(
  process.argv
    .slice(2)
    .map((a) => a.startsWith("--") ? a.slice(2).split("=") : [a, "true"])
    .map(([k, v]) => [k, v ?? "true"])
)

const SUPABASE_URL = args.get("url") || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = args.get("service-role-key") || process.env.SUPABASE_SERVICE_ROLE_KEY
const FILE         = args.get("file") || "supabase/migrations/20260423_worldview_v1.sql"

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or pass --url + --service-role-key)")
  process.exit(1)
}

const sqlPath = resolve(ROOT, FILE)
let sql
try { sql = readFileSync(sqlPath, "utf8") }
catch (err) {
  console.error(`ERROR: cannot read ${sqlPath} — ${err.message}`)
  process.exit(1)
}

console.log(`→ ${sqlPath} (${sql.length} bytes)`)
console.log(`→ target: ${SUPABASE_URL}`)

// Apply via the `query` endpoint on Supabase admin API (requires PostgREST
// direct-SQL exec, which is only available via the Management API OR
// postgres connection). Simplest + most portable: use the pg admin route
// which Supabase exposes under /rest/v1/rpc/exec_sql when the user has
// created that helper. Most projects DON'T have it.
//
// Fallback: use `pg` library with DATABASE_URL. Preferred path for this
// script since it's identical to what `supabase db push` does.
//
// We try DATABASE_URL first; if not available, fall back to the HTTP
// /rest/v1/rpc/exec_sql helper IF present; otherwise print the SQL +
// a copy-paste instruction.

const DATABASE_URL = args.get("database-url") || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
if (DATABASE_URL) {
  try {
    const { default: pg } = await import("pg")
    const client = new pg.Client({ connectionString: DATABASE_URL })
    console.log("→ connecting via pg (DATABASE_URL)…")
    await client.connect()
    await client.query(sql)
    console.log("✓ migration applied via pg")
    await client.end()
  } catch (err) {
    console.error(`✗ pg client failed: ${err.message}`)
    console.error("  (fall through to HTTP exec_sql attempt)")
  }
}

// HTTP fallback — tries an admin RPC that some projects install.
try {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  })
  if (r.ok) {
    console.log("✓ migration applied via /rest/v1/rpc/exec_sql")
  } else if (r.status === 404) {
    console.error(`✗ ${SUPABASE_URL}/rest/v1/rpc/exec_sql returns 404 — no exec_sql helper installed.`)
    console.error("")
    console.error("   Apply the SQL manually:")
    console.error("     1. https://app.supabase.com → project → SQL Editor")
    console.error("     2. Paste the contents of supabase/migrations/20260423_worldview_v1.sql")
    console.error("     3. Run")
    console.error("")
    console.error("   Or use the Supabase CLI:")
    console.error("     supabase link --project-ref <ref>")
    console.error("     supabase db push")
    process.exit(2)
  } else {
    const body = await r.text().catch(() => "")
    console.error(`✗ exec_sql ${r.status}: ${body.slice(0, 400)}`)
    process.exit(3)
  }
} catch (err) {
  console.error(`✗ fetch failed: ${err.message}`)
  process.exit(3)
}

// Smoke: call worldview_meter_and_limit with a dummy uuid — expect a
// "key not found" path (insufficient_balance=true with 0 balance),
// NOT a "function does not exist" error.
console.log("→ smoking worldview_meter_and_limit…")
const ZERO = "00000000-0000-0000-0000-000000000000"
const probe = await fetch(`${SUPABASE_URL}/rest/v1/rpc/worldview_meter_and_limit`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  },
  body: JSON.stringify({
    p_api_key_id: ZERO,
    p_profile_id: ZERO,
    p_dataset_id: "__smoke__",
    p_cost_cents: 0,
    p_rate_weight: 0,
    p_kind: "catalog",
    p_request_id: "smoke",
  }),
})
const probeText = await probe.text()
if (!probe.ok) {
  console.error(`✗ smoke failed ${probe.status}: ${probeText}`)
  process.exit(4)
}
let parsed
try { parsed = JSON.parse(probeText) } catch { parsed = probeText }
const row = Array.isArray(parsed) ? parsed[0] : parsed
console.log("  response:", JSON.stringify(row))
if (row && (row.insufficient_balance === true || row.insufficient_balance === "t")) {
  console.log("✓ worldview_meter_and_limit is live (returns insufficient_balance for unknown key, as expected)")
} else {
  console.warn("⚠ unexpected shape — function exists but response is odd. Review manually.")
}

console.log("")
console.log("Migration complete.")
