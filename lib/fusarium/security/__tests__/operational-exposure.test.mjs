import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, "..", "..", "..", "..")
const read = (...parts) => readFileSync(join(appRoot, ...parts), "utf8")

const protectedOperationalRoutes = [
  ["app", "api", "fusarium", "route.ts"],
  ["app", "api", "fusarium", "bluesight", "evidence", "route.ts"],
  ["app", "api", "fusarium", "compound-analyser", "inspect", "route.ts"],
  ["app", "api", "fusarium", "device-capabilities", "route.ts"],
  ["app", "api", "fusarium", "device-observations", "route.ts"],
  ["app", "api", "fusarium", "dispersal", "route.ts"],
  ["app", "api", "fusarium", "gcs", "[[...path]]", "route.ts"],
  ["app", "api", "fusarium", "growth-analytics", "analyze", "route.ts"],
  ["app", "api", "fusarium", "hardware-portfolio", "route.ts"],
  ["app", "api", "fusarium", "nlm", "status", "route.ts"],
  ["app", "api", "fusarium", "risk-zones", "route.ts"],
  ["app", "api", "fusarium", "sensing-telemetry", "route.ts"],
  ["app", "api", "fusarium", "species", "route.ts"],
  ["app", "api", "fusarium", "threats", "route.ts"],
]

test("every operational Fusarium API boundary requires the server-verified owner", () => {
  for (const parts of protectedOperationalRoutes) {
    const source = read(...parts)
    assert.match(source, /import \{ requireOwner \} from ["']@\/lib\/auth\/api-auth["']/, parts.join("/"))
    assert.match(source, /const auth = await requireOwner\(\)[\s\S]*if \(auth\.error\) return auth\.error/, parts.join("/"))
  }
})

test("connector-backed handlers authenticate before parsing input or making an upstream request", () => {
  for (const parts of [
    ["app", "api", "fusarium", "route.ts"],
    ["app", "api", "fusarium", "dispersal", "route.ts"],
    ["app", "api", "fusarium", "nlm", "status", "route.ts"],
    ["app", "api", "fusarium", "risk-zones", "route.ts"],
    ["app", "api", "fusarium", "species", "route.ts"],
    ["app", "api", "fusarium", "threats", "route.ts"],
  ]) {
    const source = read(...parts)
    for (const match of source.matchAll(/export async function (?:GET|POST)[^{]*\{/g)) {
      const handler = source.slice(match.index, source.indexOf("\n}", match.index) + 2)
      const gate = handler.indexOf("await requireOwner()")
      const input = [handler.indexOf("request.json()"), handler.indexOf("new URL(request.url)"), handler.indexOf("await readJson(")]
        .filter((index) => index >= 0)
      assert.ok(gate >= 0, `${parts.join("/")} handler is missing the owner gate`)
      if (input.length) assert.ok(gate < Math.min(...input), `${parts.join("/")} performs work before authentication`)
    }
  }
})

test("public commercial surfaces stay outside the operational owner gate", () => {
  const accessRoutes = read("lib", "access", "routes.ts")
  assert.match(accessRoutes, /path: ['"]\/fusarium\/launchpad['"], gate: AccessGate\.PUBLIC/)
  assert.match(accessRoutes, /MIDDLEWARE_PUBLIC_EXCEPTIONS[\s\S]*['"]\/fusarium\/launchpad['"]/)
  assert.doesNotMatch(read("app", "fusarium", "launchpad", "layout.tsx"), /requireOwner/)
  assert.doesNotMatch(read("app", "api", "fusarium", "classification", "authorization", "route.ts"), /requireOwner/)
})
