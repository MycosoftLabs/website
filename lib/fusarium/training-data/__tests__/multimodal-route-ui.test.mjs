import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..", "..", "..", "..")
const read = (...parts) => readFileSync(join(root, ...parts), "utf8")

test("the owner-gated catalog route validates and exposes inert multimodal summaries", () => {
  const route = read("app", "api", "fusarium", "training-data", "sources", "route.ts")
  assert.match(route, /requireOwner\(\)/)
  assert.match(route, /validateMultimodalSourceRegistryV1/)
  assert.match(route, /MULTIMODAL_SOURCE_CANDIDATES\.map/)
  assert.match(route, /providerChecksumCount/)
  assert.match(route, /locatorAvailable/)
  assert.doesNotMatch(route, /url:\s*reference\.url|doi:\s*reference\.doi/)
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/)
})

test("the shared source panel is read-only and keeps every operational action closed", () => {
  const panel = read("components", "fusarium", "sensing", "multimodal-source-catalog.tsx")
  assert.match(panel, /Nothing listed here is downloaded, installed, licensed, approved, or accepted for training/)
  assert.match(panel, /All transfer, rights, version, checksum, size, destination, validation, and human-approval gates remain closed/)
  assert.match(panel, /cannot download, train, promote a model, write storage, or contact a device/)
  assert.doesNotMatch(panel, /href=|download=|Math\.random|localStorage|sessionStorage/)
  assert.doesNotMatch(panel, /fetch\([^)]*(POST|PUT|PATCH|DELETE)/)
})

test("each target sensing application mounts only its own filtered source catalog", () => {
  const mounts = [
    ["components/fusarium/sensing/gandha-dashboard.tsx", "GANDHA"],
    ["components/fusarium/sensing/bluesight-dashboard.tsx", "BlueSight"],
    ["components/fusarium/fci/fci-dashboard.tsx", "FCI"],
    ["components/fusarium/sensing/thermal-dashboard.tsx", "Thermal"],
    ["components/fusarium/sensing/mechanical-dashboard.tsx", "Tactus — Mechanical"],
  ]
  for (const [path, application] of mounts) {
    const source = read(...path.split("/"))
    assert.match(source, /MultimodalSourceCatalog/)
    assert.ok(source.includes(`<MultimodalSourceCatalog application="${application}" />`))
  }
})
