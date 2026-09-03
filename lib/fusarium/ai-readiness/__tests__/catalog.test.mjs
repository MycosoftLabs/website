import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const catalog = fs.readFileSync(path.join(root, "lib/fusarium/ai-readiness/catalog.ts"), "utf8")
const view = fs.readFileSync(path.join(root, "components/fusarium/ai-readiness/ai-readiness-workspace.tsx"), "utf8")

test("all five AI routes are dedicated", () => {
  for (const surface of ["ai-studio", "nlm-training", "workflows", "mas", "avani"]) {
    const route = fs.readFileSync(path.join(root, `app/fusarium/(dashboard)/${surface}/page.tsx`), "utf8")
    if (surface === "nlm-training") assert.match(route, /NlmDashboard/)
    else assert.match(route, new RegExp(`surface="${surface}"`))
  }
})

test("catalog preserves source, unbound, locked, and quarantined states", () => {
  for (const state of ["source-present", "unbound", "locked", "quarantined"]) assert.match(catalog, new RegExp(`state: "${state}"`))
  assert.match(catalog, /no trained or deployed model/i)
  assert.match(catalog, /externalEffects=false/)
})

test("AVANI fallback cannot be mistaken for authorization", () => {
  assert.match(catalog, /allow_with_audit/)
  assert.match(catalog, /High-impact authorization must fail closed/)
  assert.match(catalog, /cannot authorize an action/)
})

test("readiness surfaces execute nothing", () => {
  assert.match(view, /performs no prompt, training job, workflow mutation, agent dispatch, external probe, or authorization decision/)
  assert.doesNotMatch(view, /fetch\(/)
  assert.doesNotMatch(view, /WebSocket/)
  assert.match(view, /Back to Fusarium/)
})

test("NLM dashboard uses a GET-only normalized status contract", () => {
  const route = fs.readFileSync(path.join(root, "app/api/fusarium/nlm/status/route.ts"), "utf8")
  const dashboard = fs.readFileSync(path.join(root, "components/fusarium/ai-readiness/nlm-dashboard.tsx"), "utf8")
  const status = fs.readFileSync(path.join(root, "lib/fusarium/nlm/status.ts"), "utf8")
  assert.match(route, /export async function GET/)
  assert.doesNotMatch(route, /export async function POST/)
  assert.match(status, /progress != null && progress >= 100/)
  assert.match(dashboard, /provider-reported unit/)
  assert.match(dashboard, /Training metrics do not prove/)
  assert.match(dashboard, /\/fusarium\/sine#sine-training-source-heading/)
  assert.match(dashboard, /Review source catalog/)
})
