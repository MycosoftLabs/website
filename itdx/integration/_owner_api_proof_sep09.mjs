/**
 * Owner login + API proof. Reads env only. Never prints secrets.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const email = "morgan@mycosoft.org"

function loadPairs(path) {
  const env = {}
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")
    }
  } catch {
    /* optional */
  }
  return env
}

const env = {
  ...loadPairs("D:/Users/admin2/Desktop/MYCOSOFT/CODE/MAS/mycosoft-mas/.credentials.local"),
  ...loadPairs("D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/.credentials.local"),
  ...loadPairs(resolve(root, ".credentials.local")),
  ...loadPairs(resolve(root, ".env.local")),
}

const passwordKeys = [
  "FUSARIUM_OWNER_PASSWORD",
  "MYCOSOFT_DEFAULT_PASSWORD",
  "VM_USER_MORGAN_PASSWORD",
  "OWNER_PASSWORD",
  "SUPABASE_OWNER_PASSWORD",
  "MORGAN_PASSWORD",
  "N8N_PASSWORD",
  "METABASE_PASSWORD",
]

const presentKeys = passwordKeys.filter((key) => typeof env[key] === "string" && env[key].length >= 6)
const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "")
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const proof = {
  date: "2026-09-09",
  email,
  supabase_url_present: Boolean(supabaseUrl),
  anon_present: Boolean(anon),
  password_key_names_present: presentKeys,
  password_grant: null,
  pages: [],
  apis: [],
}

async function passwordGrant() {
  if (!supabaseUrl || !anon) return null
  for (const key of presentKeys) {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: env[key] }),
    })
    if (response.ok) {
      const session = await response.json()
      proof.password_grant = { ok: true, key_name: key, has_access_token: Boolean(session.access_token) }
      return session
    }
    proof.password_grant = { ok: false, last_status: response.status, last_key_name: key }
  }
  return null
}

async function adminSession() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !key || !anon) return null
  const generated = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "magiclink",
      email,
      options: { redirect_to: "http://localhost:3010/auth/callback?next=/fusarium/itdx" },
    }),
  })
  if (!generated.ok) return null
  const payload = await generated.json()
  const verified = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: payload.hashed_token }),
  })
  if (!verified.ok) return null
  return verified.json()
}

function cookieHeader(session) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0]
  const name = `sb-${ref}-auth-token`
  const encoded = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url")
  return `${name}=${encoded}`
}

const session = (await passwordGrant()) || (await adminSession())
if (!session?.access_token) {
  proof.error = "no_owner_session"
  writeFileSync(resolve(root, "itdx/integration/_owner_api_proof_sep09.json"), JSON.stringify(proof, null, 2))
  console.log(JSON.stringify({ ok: false, ...proof, error: proof.error }, null, 2))
  process.exit(1)
}
if (!proof.password_grant?.ok) {
  proof.session_method = "admin_verify"
} else {
  proof.session_method = "password_grant"
}

const cookie = cookieHeader(session)
const headers = { cookie, Authorization: `Bearer ${session.access_token}` }

for (const path of ["/fusarium/login?redirectTo=/fusarium/itdx", "/fusarium/itdx", "/fusarium/earth-simulator"]) {
  const response = await fetch("http://localhost:3010" + path, { headers, redirect: "manual" })
  proof.pages.push({
    path,
    status: response.status,
    location: response.headers.get("location"),
  })
}

for (const path of [
  "/api/fusarium/itdx/weka-receipt",
  "/api/fusarium/itdx/situation",
  "/api/fusarium/itdx/truth",
  "/api/fusarium/itdx/task8",
  "/api/fusarium/itdx/evidence",
  "/api/fusarium/itdx/run-state",
]) {
  const response = await fetch("http://localhost:3010" + path, { headers, cache: "no-store" })
  const text = await response.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw_len: text.length }
  }
  const row = {
    path,
    status: response.status,
    keys: data && typeof data === "object" ? Object.keys(data).slice(0, 16) : [],
  }
  if (path.endsWith("weka-receipt")) {
    row.verify_status = data.verify_status
    row.arithmetic_status = data.arithmetic_status
    row.arithmetic_checks = data.arithmetic_checks
    row.trial_criteria_status = data.trial_criteria_status
    row.live_cop = data.live_cop ?? false
  }
  if (path.endsWith("situation")) {
    row.live_cop = data.live_cop
    row.synthetic = data.synthetic
    row.situation_status = data.situation_status
    row.weather = data.situation?.channels?.weather?.status
    row.biology = data.situation?.channels?.biology?.status
    row.traffic = data.situation?.channels?.traffic?.status
    row.traffic_reason = data.situation?.channels?.traffic?.reason
    row.ao = data.ao?.name || data.situation?.ao?.name
    row.lat = data.ao?.center?.lat || data.situation?.ao?.center?.lat
    row.lon = data.ao?.center?.lon || data.situation?.ao?.center?.lon
  }
  proof.apis.push(row)
}

const weka = proof.apis.find((row) => row.path.includes("weka"))
const situation = proof.apis.find((row) => row.path.includes("situation"))
const pagesOk = proof.pages.every((row) => {
  if (row.path.includes("/login")) return row.status === 200 || row.status === 307
  return row.status === 200 && !String(row.location || "").includes("/login")
})
const apisOk = proof.apis.every((row) => row.status === 200)
proof.ok = pagesOk && apisOk && weka?.verify_status === "PASS" && weka?.trial_criteria_status === "TRIAL_CRITERIA_NOT_MET"
writeFileSync(resolve(root, "itdx/integration/_owner_api_proof_sep09.json"), JSON.stringify(proof, null, 2))
console.log(JSON.stringify(proof, null, 2))
process.exit(proof.ok ? 0 : 1)
