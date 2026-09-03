import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../../../..")
const ids = ["devices", "mycobrain", "sporebase", "crep", "mindex", "storage", "containers", "monitoring", "partner-mesh", "adapters", "settings"]
const catalog = fs.readFileSync(path.join(root, "lib/fusarium/platform-operations/catalog.ts"), "utf8")
const workspace = fs.readFileSync(path.join(root, "components/fusarium/platform-operations/platform-operation-workspace.tsx"), "utf8")

test("all infrastructure and platform routes have dedicated pages", () => {
  for (const id of ids) {
    const route = fs.readFileSync(path.join(root, `app/fusarium/(dashboard)/${id}/page.tsx`), "utf8")
    assert.match(route, /PlatformOperationWorkspace/)
    assert.match(route, new RegExp(`platformOperation\\(\"${id}\"\\)`))
  }
})

test("every route has distinct title, summary, boundary, reads, and navigation", () => {
  for (const id of ids) assert.match(catalog, new RegExp(`${id.replace("-", "\\-")}[:\"]`))
  assert.ok((catalog.match(/boundary:/g) ?? []).length >= ids.length)
  assert.ok((catalog.match(/contracts:/g) ?? []).length >= ids.length)
  assert.ok((catalog.match(/links:/g) ?? []).length >= ids.length)
})

test("infrastructure is organized as a Fusarium-native end-to-end flow", () => {
  for (const label of ["DirtNet Field Fabric", "MINDEX Evidence Fabric", "MYCA / MAS Coordination", "Nature Learning Model", "Earth / CREP Mission Picture", "Protected Platform Fabric"]) {
    assert.match(catalog, new RegExp(label.replace(/[+]/g, "\\$&")))
  }
  for (const title of ["DirtNet Operations", "DirtNet Edge Nodes", "DirtNet Bioaerosol Nodes", "Protected Data Fabric", "Compute Fabric", "Mission Assurance"]) {
    assert.match(catalog, new RegExp(`title: "${title}"`))
  }
  assert.match(workspace, /FUSARIUM_INFRASTRUCTURE_FLOW\.map/)
  assert.match(workspace, /intended responsibility and data direction only/)
  assert.match(workspace, /does not assert a live connection/)
})

test("workspace only performs same-origin GET reads and exposes honest states", () => {
  assert.match(workspace, /fetch\(contract\.endpoint/)
  assert.match(workspace, /Accept: \"application\/json\"/)
  assert.doesNotMatch(workspace, /method:\s*[\"'](?:POST|PUT|PATCH|DELETE)/)
  for (const state of ["available", "empty", "unavailable"]) assert.match(workspace, new RegExp(state))
  assert.match(workspace, /Empty is not an all-clear/)
  assert.match(workspace, /No operational state is inferred/)
})

test("sensitive values and mutating controls are excluded", () => {
  assert.match(workspace, /token\|secret\|password\|key\|cookie\|authorization/i)
  assert.doesNotMatch(workspace, /Start container|Restart service|Register device|Invite partner/)
  assert.match(catalog, /No hardware contact is initiated here/)
  assert.match(catalog, /does not contact Palantir, Lattice, Platform One/)
})
