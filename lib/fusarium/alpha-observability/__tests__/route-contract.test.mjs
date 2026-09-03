import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const routeUrl = new URL("../../../../app/api/fusarium/alpha-observability/route.ts", import.meta.url)
const panelUrl = new URL("../../../../components/fusarium/stack-inventory/alpha-observability-panel.tsx", import.meta.url)
const pageUrl = new URL("../../../../components/fusarium/stack-inventory/stack-inventory-page.tsx", import.meta.url)

test("alpha observability is owner gated before database or service reads", async () => {
  const source = await readFile(routeUrl, "utf8")
  const gate = source.indexOf("const auth = await requireOwner()")
  assert.ok(gate >= 0)
  assert.ok(gate < source.indexOf("createAdminClient()"))
  assert.ok(gate < source.indexOf("Promise.all(["))
})

test("alpha observability distinguishes measured, unavailable, and synthetic evidence", async () => {
  const source = await readFile(routeUrl, "utf8")
  assert.match(source, /state: synthetic \? "synthetic"/)
  assert.match(source, /not a broker subscription/)
  assert.match(source, /providers without ledger writes are not estimated/)
  assert.match(source, /no benchmark run or credit consumption was performed/)
})

test("alpha observability bounds reads and never caches the snapshot", async () => {
  const source = await readFile(routeUrl, "utf8")
  assert.match(source, /PROBE_TIMEOUT_MS = 3_000/)
  assert.match(source, /\.limit\(2_000\)/)
  assert.match(source, /Math\.min\(168, Math\.max\(1/)
  assert.match(source, /"Cache-Control": "no-store"/)
})

test("Stack Inventory renders the live evidence panel with completion-safe refresh", async () => {
  const [panel, page] = await Promise.all([readFile(panelUrl, "utf8"), readFile(pageUrl, "utf8")])
  assert.match(page, /<AlphaObservabilityPanel \/>/)
  assert.match(panel, /\/api\/fusarium\/alpha-observability\?hours=24/)
  assert.match(panel, /document\.visibilityState === "hidden"/)
  assert.match(panel, /setInterval\(\(\) => void refresh\(\), REFRESH_MS\)/)
  assert.match(panel, /No live state is inferred/)
})
