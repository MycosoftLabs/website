/**
 * Local bind/contract probe. Never prints secrets.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const outDir = resolve(root, "itdx/integration/.browser-proof")
mkdirSync(outDir, { recursive: true })

function loadEnv(path) {
  const env = {}
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  } catch { /* optional */ }
  return env
}

const env = {
  ...loadEnv("D:/Users/admin2/Desktop/MYCOSOFT/CODE/MAS/mycosoft-mas/.credentials.local"),
  ...loadEnv("D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/.env.local"),
  ...loadEnv(resolve(root, ".env.local")),
}

async function hit(url, init = {}) {
  const started = Date.now()
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) })
    const text = await response.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* html or binary */ }
    return { url, status: response.status, ms: Date.now() - started, json, preview: text.replace(/\s+/g, " ").slice(0, 160) }
  } catch (error) {
    return { url, status: 0, ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) }
  }
}

const rows = []
function row(surface, bind, verdict, extra = {}) {
  const item = { surface, bind, verdict, ...extra }
  rows.push(item)
  console.log(`${verdict} ${surface} ${bind}${extra.note ? " · " + extra.note : ""}`)
}

const formspaceHtml = await hit("http://127.0.0.1:8766/formspace.html")
row(
  "FormSpace observatory HTML",
  "http://127.0.0.1:8766/formspace.html",
  formspaceHtml.status === 200 && /FORM SPACE|FormSpace/i.test(formspaceHtml.preview || "") ? "PASS" : "FAIL",
  { http: formspaceHtml.status, note: "loopback desktop launcher" },
)

const atlas = await hit("http://127.0.0.1:8766/api/form-atlas")
const counts = atlas.json?.counts || {}
row(
  "FormSpace recorded atlas",
  "http://127.0.0.1:8766/api/form-atlas",
  atlas.status === 200 && counts.forms === 41 && counts.form_states === 1706 && counts.form_observations === 1600 ? "PASS" : "FAIL",
  { http: atlas.status, counts, note: "synthetic recorded pack" },
)

const formspace = await hit("http://127.0.0.1:8766/api/formspace")
row(
  "FormSpace recorded run",
  "http://127.0.0.1:8766/api/formspace",
  formspace.status === 200 && /BUNDLED_RECORDED_RUN|model_sha256/.test(JSON.stringify(formspace.json || formspace.preview || "")) ? "PASS" : "FAIL",
  { http: formspace.status, origin: formspace.json?.origin, note: "no mock substitution" },
)

const unauth = await hit("http://127.0.0.1:8765/api/health")
row(
  "ITDX 8765 unauthenticated health",
  "http://127.0.0.1:8765/api/health",
  unauth.status === 403 ? "PASS" : "FAIL",
  { http: unauth.status, note: "Bearer required" },
)

const token = env.ITDX_BACKEND_TOKEN || ""
const auth = await hit("http://127.0.0.1:8765/api/health", { headers: { Authorization: "Bearer " + token } })
row(
  "ITDX 8765 Bearer health",
  "http://127.0.0.1:8765/api/health",
  token.length >= 32 && auth.status === 200 && auth.json?.status === "ok" ? "PASS" : "FAIL",
  { http: auth.status, version: auth.json?.version, transport: auth.json?.transport, note: "token loaded from env, not printed" },
)

const mas = await hit("http://192.168.0.188:8001/health")
row(
  "MAS orchestrator",
  "http://192.168.0.188:8001/health",
  mas.status === 200 ? "PASS" : "FAIL",
  { http: mas.status, status: mas.json?.status, note: "real LAN bind" },
)

const nlm = await hit("http://192.168.0.188:8001/api/nlm/health")
row(
  "NLM contract",
  "http://192.168.0.188:8001/api/nlm/health",
  nlm.status === 200 ? (nlm.json?.model_loaded === true ? "PASS" : "UNQUALIFIED") : "FAIL",
  { http: nlm.status, model_loaded: nlm.json?.model_loaded, model: nlm.json?.model || nlm.json?.name, note: "weights not loaded ⇒ UNQUALIFIED" },
)

const avani = await hit("http://192.168.0.188:8001/api/avani/health")
const decisions = avani.json?.decisions ?? avani.json?.decision_count ?? avani.json?.count
row(
  "MYCA / AVANI contract",
  "http://192.168.0.188:8001/api/avani/health",
  avani.status === 200 ? "UNQUALIFIED" : "FAIL",
  { http: avani.status, agent: avani.json?.name || avani.json?.status, decisions, note: "not 7-role Task 8; local FormSpace uses 3 advisory templates" },
)

const mindex = await hit("http://192.168.0.189:8000/health")
row(
  "MINDEX API",
  "http://192.168.0.189:8000/health",
  mindex.status === 200 && /healthy|ok/i.test(JSON.stringify(mindex.json || mindex.preview || "")) ? "PASS" : "FAIL",
  { http: mindex.status, note: "real 189:8000, no mock" },
)

const site = await hit("http://127.0.0.1:3010/fusarium/itdx")
row(
  "Fusarium ITDX route",
  "http://127.0.0.1:3010/fusarium/itdx",
  site.status === 200 || site.status === 307 || site.status === 308 ? "PASS" : "FAIL",
  { http: site.status, note: "owner gate expected before browser rehearsal" },
)

const proof = {
  generated: new Date().toISOString(),
  tree: "website-itdx-codex-v13",
  publish: false,
  sandbox_deploy: false,
  rows,
}
writeFileSync(resolve(outDir, "contracts.json"), JSON.stringify(proof, null, 2))
const failed = rows.filter((item) => item.verdict === "FAIL").length
console.log(`CONTRACTS pass=${rows.filter((item) => item.verdict === "PASS").length} unqualified=${rows.filter((item) => item.verdict === "UNQUALIFIED").length} fail=${failed}`)
process.exit(failed ? 1 : 0)
