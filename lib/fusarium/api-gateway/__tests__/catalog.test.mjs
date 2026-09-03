import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const catalog = fs.readFileSync(path.join(root, "lib/fusarium/api-gateway/catalog.ts"), "utf8")
const view = fs.readFileSync(path.join(root, "components/fusarium/api-gateway/api-gateway.tsx"), "utf8")
const route = fs.readFileSync(path.join(root, "app/fusarium/(dashboard)/api/page.tsx"), "utf8")

test("API Gateway has a dedicated Fusarium route", () => {
  assert.match(route, /FusariumApiGateway/)
  assert.match(route, /API Gateway \| Fusarium/)
})

test("catalog separates passive, local, gated, and device-action contracts", () => {
  for (const state of ["passive-read", "local-analysis", "gated-write", "device-action"]) assert.match(catalog, new RegExp(`safety: "${state}"`))
  assert.match(catalog, /sourceState: "runtime-unbound"/)
  assert.match(catalog, /sourceState: "approval-gated"/)
})

test("surface only probes a fixed same-origin GET allowlist", () => {
  assert.match(view, /does not execute requests/)
  assert.match(view, /Mutation and device-action routes are documentation only/)
  assert.match(catalog, /API_HEALTH_CONTRACTS/)
  assert.match(view, /fetch\(contract\.path/)
  assert.match(view, /method: "GET"/)
  assert.match(view, /credentials: "same-origin"/)
  assert.match(view, /Timed out after 4 seconds/)
  assert.doesNotMatch(view, /method:\s*user/)
  assert.doesNotMatch(view, /URLSearchParams/)
  assert.doesNotMatch(view, /axios/)
})

test("filter controls are labelled and expose honest source language", () => {
  assert.match(view, /aria-label="API domain"/)
  assert.match(view, /aria-label="API safety"/)
  assert.match(view, /Search API catalog/)
  assert.match(view, /source inventory only/)
})
