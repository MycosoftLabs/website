import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const hostRoot = join(here, "..", "..", "..", "..", "..")
const page = readFileSync(join(hostRoot, "app", "fusarium", "(dashboard)", "earth-simulator", "page.tsx"), "utf8")
const loader = readFileSync(join(hostRoot, "app", "dashboard", "crep", "CREPDashboardLoader.tsx"), "utf8")
const client = readFileSync(join(hostRoot, "app", "dashboard", "crep", "CREPDashboardClient.tsx"), "utf8")
const fieldRegistry = readFileSync(join(hostRoot, "lib", "crep", "fields", "registry.ts"), "utf8")
const fieldRoute = readFileSync(join(hostRoot, "app", "api", "crep", "field", "[...path]", "route.ts"), "utf8")

test("Fusarium Earth Simulator owns its home navigation", () => {
  assert.match(page, /homeHref="\/fusarium"/)
  assert.match(page, /homeLabel="FUSARIUM"/)
  assert.match(loader, /homeHref\?: string/)
  assert.match(client, /href=\{homeHref\}/)
  assert.match(client, /\{homeLabel\}/)
})

test("Fusarium Earth Simulator never caches the owner-gated shell", () => {
  assert.match(page, /export const dynamic = "force-dynamic"/)
  assert.match(page, /export const revalidate = 0/)
  assert.match(page, /export const fetchCache = "force-no-store"/)
  assert.doesNotMatch(page, /export const dynamic = "force-static"/)
})

test("Fusarium defers city-scale baked nature archives until zoom 5", () => {
  assert.match(page, /earthBakedNatureMinZoom=\{5\}/)
  assert.match(client, /mapZoom >= earthBakedNatureMinZoom/)
  assert.match(client, /BAKED_INAT_REGIONS\.filter/)
  assert.match(client, /boundsIntersectBbox\(mapBounds, BAKED_INAT_REGION_BBOX\[region\]/)
})

test("the shared CREP map state is never dereferenced as a React ref", () => {
  assert.match(client, /const \[mapRef, setMapRef\] = useState/)
  assert.doesNotMatch(client, /\bmapRef\.current\b/)
})

test("Arraylake field filters remain discoverable without fabricating frames", () => {
  assert.match(client, /for \(const d of FIELD_REGISTRY\)/)
  assert.doesNotMatch(client, /process\.env\.NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS === "1"/)
  assert.match(client, /dataStatus: "planned_real"/)
  assert.match(client, /No mock fallback/)
  assert.match(fieldRegistry, /every individual field defaults OFF/)
})

test("Arraylake field manifests prefer the Fusarium local bake before a configured remote base", () => {
  assert.match(fieldRoute, /LOCAL_PUBLIC_BASE = "\/assets\/fields"/)
  assert.match(fieldRoute, /readLocalManifest/)
  assert.match(fieldRoute, /storage: "local-public"/)
  assert.ok(fieldRoute.indexOf("const local = await readLocalManifest") < fieldRoute.indexOf("if (!BASE) return emptyManifest"))
  assert.match(fieldRoute, /frames: \[\]/)
  assert.match(fieldRoute, /NO MOCK DATA/)
})
