import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const routePath = fileURLToPath(new URL("../route.ts", import.meta.url))
const source = readFileSync(routePath, "utf8")

test("commercial classification capability is statically U-only", () => {
  assert.match(source, /const ACCREDITED_LEVEL = "U" as const/)
  assert.match(source, /authorized: false/)
  assert.match(source, /maxSelectableLevel: ACCREDITED_LEVEL/)
  assert.match(source, /accreditedLevel: ACCREDITED_LEVEL/)
  assert.match(source, /reason: "commercial_unclassified_boundary"/)
})

test("owner login cannot elevate classification capability", () => {
  assert.match(source, /requireFusariumOwner/)
  assert.doesNotMatch(source, /authorized: true/)
  assert.doesNotMatch(source, /maxSelectableLevel:\s*"(?:CUI|SECRET|TS_SCI)"/)
  assert.doesNotMatch(source, /subject:/)
})
