import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const catalog = fs.readFileSync(path.join(root, "lib/fusarium/tools-hub/catalog.ts"), "utf8")
const component = fs.readFileSync(path.join(root, "components/fusarium/tools-hub/tools-hub.tsx"), "utf8")
const route = fs.readFileSync(path.join(root, "app/fusarium/(dashboard)/tools/page.tsx"), "utf8")

test("Tools Hub has a dedicated Fusarium route", () => {
  assert.match(route, /FusariumToolsHub/)
  assert.match(route, /Tools Hub \| Fusarium/)
})

test("catalog routes every mounted tool to Fusarium with no remaining legacy-only record", () => {
  assert.match(catalog, /href: "\/fusarium\/virtual-petri-dish"/)
  assert.match(catalog, /href: "\/fusarium\/gandha"/)
  assert.match(catalog, /href: "\/fusarium\/tools\/retrosynthesis"/)
  assert.match(catalog, /href: "\/fusarium\/tools\/digital-twin"/)
  assert.match(catalog, /href: "\/fusarium\/tools\/physics-sim"/)
  assert.doesNotMatch(catalog, /availability: "legacy-only"/)
  assert.doesNotMatch(catalog, /href: "\/natureos\//)

  for (const routeName of ["retrosynthesis", "digital-twin", "physics-sim"]) {
    assert.equal(
      fs.existsSync(path.join(root, "app/fusarium/(dashboard)/tools", routeName, "page.tsx")),
      true,
      `${routeName} route must exist before catalog activation`,
    )
  }
})

test("surface exposes filtering, truthful states, and Fusarium return navigation", () => {
  assert.match(component, /Search tools/)
  assert.match(component, /aria-pressed/)
  assert.match(component, /source unbound/)
  assert.match(component, /Back to Fusarium/)
  assert.match(component, /A working page is not evidence/)
})

test("catalog includes environmental intelligence and defensive tool families", () => {
  for (const category of ["operations", "environment", "intelligence", "defense", "cyber-defense", "evidence"]) {
    assert.match(catalog, new RegExp(`category: "${category}"`))
  }
  assert.match(catalog, /No scanning beyond approved inventory/)
  assert.match(catalog, /No targeting, effect planning/)
})

test("environmental tracking stays non-human, evidence-led, and non-actuating", () => {
  assert.match(catalog, /Environmental Object Tracker/)
  assert.match(catalog, /Human identification is disabled/)
  assert.match(catalog, /No weapons cueing or autonomous pursuit/)
  assert.match(catalog, /Multi-Sensor Track Fusion/)
})
