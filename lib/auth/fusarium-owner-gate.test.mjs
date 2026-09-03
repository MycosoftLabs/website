import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const gate = await readFile(new URL("./fusarium-owner-gate.ts", import.meta.url), "utf8")
const apiAuth = await readFile(new URL("./api-auth.ts", import.meta.url), "utf8")

test("Fusarium owner gate does not treat local-dev cookies as proof", () => {
  assert.match(apiAuth, /requireFusariumOwner/)
  assert.match(apiAuth, /Local-dev admin cookies are not owner proof/)
  const fnStart = apiAuth.indexOf("export async function requireFusariumOwner")
  const fnEnd = apiAuth.indexOf("export function fusariumOperationalDeniedResponse")
  const body = apiAuth.slice(fnStart, fnEnd)
  assert.doesNotMatch(body, /LOCAL_DEV_ADMIN_COOKIE/)
  assert.doesNotMatch(body, /verifyLocalDevAdminSession/)
})

test("operator app paths do not collide with Launchpad or civilian login", () => {
  assert.match(gate, /\/fusarium\/app/)
  assert.match(gate, /\/fusarium\/login/)
  assert.doesNotMatch(gate, /pathname === "\/login"/)
})
