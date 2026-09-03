import test from "node:test"
import assert from "node:assert/strict"
import { findFusariumApp } from "../../../../components/fusarium/fusarium-catalog.ts"

test("deep Fusarium routes retain their owning application title", () => {
  assert.equal(findFusariumApp("/fusarium/life-database/species/123")?.title, "Life Database")
  assert.equal(findFusariumApp("/fusarium/tools/source-health")?.title, "Tools Hub (all categories)")
  assert.equal(findFusariumApp("/fusarium/fungi-compute/session/live")?.title, "Fungi Compute")
})

test("Petri aliases resolve to the canonical application and overview owns only its exact path", () => {
  assert.equal(findFusariumApp("/fusarium/virtual-petri-dish2")?.title, "Virtual Petri Dish")
  assert.equal(findFusariumApp("/fusarium/petri-sim")?.title, "Virtual Petri Dish")
  assert.equal(findFusariumApp("/fusarium")?.title, "Overview")
  assert.equal(findFusariumApp("/fusarium/not-catalogued"), null)
})
