import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import test from "node:test"

const require = createRequire(import.meta.url)
const config = require(fileURLToPath(new URL("../../../../next.config.js", import.meta.url)))

test("keeps the capitalized Fusarium runtime namespace distinct from lowercase device routes", async () => {
  assert.equal(config.experimental.caseSensitiveRoutes, true)
  const rewrites = await config.rewrites()
  assert.ok(rewrites.afterFiles.some((rewrite) => rewrite.source === "/api/Devices/:path*"))
  assert.ok(rewrites.afterFiles.some((rewrite) => rewrite.source === "/api/Devices"))
})

test("runs the lowercase Fusarium runtime only after local dynamic API routes", async () => {
  const rewrites = await config.rewrites()
  assert.equal(
    rewrites.afterFiles.some((rewrite) => rewrite.source === "/api/fusarium/:path*"),
    false,
  )
  assert.ok(rewrites.fallback.some((rewrite) => rewrite.source === "/api/fusarium/:path*"))
})
