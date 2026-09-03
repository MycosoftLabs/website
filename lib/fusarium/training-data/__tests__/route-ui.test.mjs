import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..", "..", "..", "..")
const read = (...parts) => readFileSync(join(root, ...parts), "utf8")

test("the training-source catalog is owner-gated and read-only", () => {
  const route = read("app", "api", "fusarium", "training-data", "sources", "route.ts")
  assert.match(route, /requireOwner\(\)/)
  assert.ok(route.indexOf("requireOwner()") < route.indexOf("TRAINING_SOURCE_CANDIDATES\.map"))
  assert.match(route, /validateTrainingSourceRegistryV1/)
  assert.match(route, /Cache-Control.*no-store/)
  assert.doesNotMatch(route, /attachmentAccessClaim/)
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/)
})

test("SINE shows the supplied registry as a fail-closed acquisition inventory", () => {
  const dashboard = read("components", "fusarium", "sensing", "sine-dashboard.tsx")
  const catalog = read("components", "fusarium", "sensing", "training-source-catalog.tsx")
  assert.match(dashboard, /TrainingSourceCatalog/)
  assert.match(catalog, /\/api\/fusarium\/training-data\/sources/)
  assert.match(catalog, /8 acquisition gates remain closed/)
  assert.match(catalog, /not downloaded, licensed, installed, approved, or accepted for training/)
  assert.match(catalog, /window\.location\.hash === "#sine-training-source-heading"/)
  assert.doesNotMatch(catalog, /href=.*attachment|download=|fetch\([^)]*attachment/)
  assert.doesNotMatch(catalog, /Math\.random/)
})
