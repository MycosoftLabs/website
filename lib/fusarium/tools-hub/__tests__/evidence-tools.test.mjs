import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const lib = fs.readFileSync(path.join(root, "lib/fusarium/tools-hub/evidence-tools.ts"), "utf8")
const view = fs.readFileSync(path.join(root, "components/fusarium/tools-hub/evidence-tool-workspace.tsx"), "utf8")
const catalog = fs.readFileSync(path.join(root, "lib/fusarium/tools-hub/catalog.ts"), "utf8")

test("three evidence tools have dedicated Fusarium routes and catalog links", () => {
  for (const [slug, kind] of [["source-provenance", "provenance"], ["evidence-integrity", "integrity"], ["source-health", "health"]]) {
    const route = fs.readFileSync(path.join(root, `app/fusarium/(dashboard)/tools/${slug}/page.tsx`), "utf8")
    assert.match(route, new RegExp(`kind=\"${kind}\"`))
    assert.match(catalog, new RegExp(`href: \"/fusarium/tools/${slug}\"`))
  }
})

test("local evidence input is JSON-only and bounded to 256 KiB", () => {
  assert.match(lib, /MAX_EVIDENCE_BYTES = 256 \* 1024/)
  assert.match(view, /Only JSON files are accepted/)
  assert.match(view, /file\.size > MAX_EVIDENCE_BYTES/)
  assert.match(view, /processed in this browser/)
})

test("provenance inspection separates empty, stale, unavailable, partial, and error", () => {
  for (const state of ["empty", "stale", "unavailable", "partial", "error"]) assert.match(lib, new RegExp(`\"${state}\"`))
  assert.match(lib, /Source provenance/)
  assert.match(lib, /Authoritative time/)
  assert.match(lib, /Stable identity/)
})

test("integrity check uses canonical local SHA-256 and optional digest comparison", () => {
  assert.match(lib, /canonicalizeEvidence/)
  assert.match(view, /crypto\.subtle\.digest\("SHA-256"/)
  assert.match(view, /digest matches/)
  assert.match(view, /digest mismatch/)
})

test("source health is fixed same-origin GET-only and has no arbitrary executor", () => {
  assert.match(lib, /SOURCE_HEALTH_CONTRACTS/)
  assert.match(view, /fetch\(contract\.href, \{ method: \"GET\"/)
  assert.doesNotMatch(view, /method:\s*["']POST/)
  assert.doesNotMatch(view, /type=["']url/)
  assert.match(view, /arbitrary URL/)
  assert.match(view, /not probed/)
  assert.match(view, /non-JSON body; schema inspection stopped/)
})
