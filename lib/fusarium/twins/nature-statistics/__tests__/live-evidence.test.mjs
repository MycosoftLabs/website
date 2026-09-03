import assert from "node:assert/strict"
import test from "node:test"
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const lib = fs.readFileSync(path.join(root, "lib/fusarium/twins/nature-statistics/live-evidence.ts"), "utf8")
const component = fs.readFileSync(path.join(root, "components/fusarium/twins/nature-statistics/nature-statistics-live-evidence.tsx"), "utf8")
const mount = fs.readFileSync(path.join(root, "components/fusarium/twins/nature-statistics/nature-statistics-mount.tsx"), "utf8")

test("extension is mounted after the immutable NatureOS view", () => {
  assert.match(mount, /<NatureStatisticsView \/>[\s\S]*<FusariumNatureStatisticsOperationalView \/>/)
  assert.match(mount, /data-nature-statistics-parity="natureos-primary"/)
})

test("uses only named same-origin read contracts", () => {
  for (const route of ["/api/environment/aqi", "/api/crep/viewport-environment", "/api/global-agents", "/api/mas/agents", "/api/natureos/population"]) assert.ok(component.includes(route))
  assert.doesNotMatch(component, /https?:\/\//)
  assert.doesNotMatch(component, /method:\s*["']POST/)
})

test("retains explicit evidence states and no fake quality score", () => {
  for (const state of ["live", "stale", "empty", "unbound", "error"]) assert.ok(lib.includes(`\"${state}\"`))
  assert.match(component, /no substitute score is invented/i)
  assert.match(component, /not a quality score/i)
})

test("location and local soil and water evidence are operator controlled", () => {
  assert.match(component, /Operator-selected viewport/)
  assert.match(component, /Import JSON/)
  assert.match(lib, /slice\(0, 24\)/)
})
