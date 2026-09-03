import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..", "..", "..", "..")
const read = (...parts) => readFileSync(join(root, ...parts), "utf8")
const route = read("app", "api", "fusarium", "bluesight", "evidence", "route.ts")
const dashboard = read("components", "fusarium", "sensing", "bluesight-dashboard.tsx")

test("local endpoint validates bounded JSON and has no external or persistence seam", () => {
  assert.match(route, /export async function POST/)
  assert.match(route, /BLUESIGHT_EVIDENCE_MAX_BYTES/)
  assert.match(route, /validateBlueSightEvidence/)
  assert.doesNotMatch(route, /\bfetch\s*\(|process\.env|writeFile|database|prisma|supabase|mindex/i)
  assert.doesNotMatch(route, /export async function (?:PUT|PATCH|DELETE)/)
})

test("BlueSight exposes import, filters, replay controls, provenance, and correlation boundaries", () => {
  for (const marker of ["Import replay", "Replay timeline", "Cross-modality correlation", "Evidence boundary", "No device-bound", "SensingScopeSelector"]) assert.match(dashboard, new RegExp(marker))
  assert.match(dashboard, /\/api\/fusarium\/bluesight\/evidence/)
  assert.doesNotMatch(dashboard, /\/api\/psathyrella|Math\.random|sendCommand|dispatchCommand/)
  assert.match(dashboard, /state: "unbound"/)
})
