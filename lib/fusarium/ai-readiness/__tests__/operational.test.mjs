import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const definitions = fs.readFileSync(path.join(root, "lib/fusarium/ai-readiness/operational.ts"), "utf8")
const view = fs.readFileSync(path.join(root, "components/fusarium/ai-readiness/ai-operational-workspace.tsx"), "utf8")

test("four operational AI surfaces use dedicated read sources", () => {
  for (const surface of ["ai-studio", "workflows", "mas", "avani"]) assert.match(definitions, new RegExp(`${surface}:|"${surface}":`))
  for (const endpoint of ["/api/myca/live-activity", "/api/myca/workflows?executions=true", "/api/natureos/n8n/workflows-list", "/api/mas/health", "/api/mas/agents", "/api/avani/status", "/api/avani/rules"]) assert.match(definitions, new RegExp(endpoint.replace(/[?]/g, "\\?")))
})

test("operational view performs GET reads only", () => {
  assert.match(view, /fetch\(source\.endpoint/)
  assert.doesNotMatch(view, /method:\s*["']POST/)
  assert.doesNotMatch(view, /method:\s*["']PUT/)
  assert.doesNotMatch(view, /method:\s*["']DELETE/)
  assert.doesNotMatch(view, /\/api\/avani\/evaluate/)
})

test("workflow exports and MAS registry are not overstated", () => {
  assert.match(view, /Definitions, not runtime evidence/)
  assert.match(view, /Declared agents, not process proof/)
  assert.match(definitions, /Embedded policy is evidence, not accredited authority/)
  assert.match(view, /no placeholder activity was generated/i)
})

test("all four pages mount the operational workspace", () => {
  for (const surface of ["ai-studio", "workflows", "mas", "avani"]) {
    const page = fs.readFileSync(path.join(root, `app/fusarium/(dashboard)/${surface}/page.tsx`), "utf8")
    assert.match(page, /AiOperationalWorkspace/)
  }
})
