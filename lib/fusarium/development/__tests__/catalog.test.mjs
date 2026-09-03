import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const catalog = fs.readFileSync(path.join(root, "lib/fusarium/development/catalog.ts"), "utf8")
const view = fs.readFileSync(path.join(root, "components/fusarium/development/development-workspace.tsx"), "utf8")
const toolkit = fs.readFileSync(path.join(root, "lib/fusarium/development/toolkit.ts"), "utf8")

test("all three Development routes are dedicated", () => {
  for (const surface of ["functions", "sdk", "shell"]) {
    const route = fs.readFileSync(path.join(root, `app/fusarium/(dashboard)/${surface}/page.tsx`), "utf8")
    assert.match(route, new RegExp(`surface="${surface}"`))
  }
})

test("catalog separates source, unbound, and locked records", () => {
  for (const state of ["source-present", "unbound", "locked"]) assert.match(catalog, new RegExp(`state: "${state}"`))
  assert.match(catalog, /Simulation output is never operational observation evidence/)
  assert.match(catalog, /UI profiles never grant command authority/)
})

test("Cloud Shell exposes no command execution path", () => {
  assert.match(view, /This page cannot execute a command/)
  assert.match(view, /LOCKED \/ UNAVAILABLE/)
  assert.doesNotMatch(view, /fetch\(/)
  assert.doesNotMatch(view, /WebSocket/)
  assert.doesNotMatch(view, /EventSource/)
  assert.doesNotMatch(view, /child_process/)
})

test("development views retain search and Fusarium navigation", () => {
  assert.match(view, /Back to Fusarium/)
  assert.match(view, /aria-live="polite"/)
  assert.match(view, /Search \{meta.title\}/)
})

test("Functions validates bounded local JSON without execution", () => {
  assert.match(view, /JSON and request-shape validator/)
  assert.match(view, /never executes a function, sends a request, uploads input, or persists content/)
  assert.match(toolkit, /DEVELOPMENT_JSON_LIMIT = 65_536/)
  assert.match(toolkit, /DEVELOPMENT_MAX_DEPTH = 16/)
  assert.match(toolkit, /DEVELOPMENT_MAX_KEYS = 1_000/)
  assert.match(toolkit, /JSON\.parse\(text\)/)
  assert.doesNotMatch(toolkit, /fetch\(/)
  assert.doesNotMatch(toolkit, /eval\(/)
  assert.doesNotMatch(toolkit, /Function\(/)
})

test("SDK generator is derived from mounted contracts and does not publish", () => {
  for (const schema of ["fusarium-sensing-scope/v1", "fusarium-device-observations/v1", "mycosoft.mechanical.sequence.v1", "mycosoft.gandha.dataset.v1"]) assert.match(toolkit, new RegExp(schema.replaceAll("/", "\\/")))
  assert.match(view, /Contract and example generator/)
  assert.match(view, /Nothing is installed, published, executed, fetched, or sent/)
  assert.match(toolkit, /generateSdkArtifact/)
  assert.doesNotMatch(toolkit, /npm publish/)
  assert.doesNotMatch(toolkit, /pip upload/)
})
