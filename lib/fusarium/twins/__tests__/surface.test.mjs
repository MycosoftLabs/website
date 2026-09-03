import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  FUSARIUM_TWIN_ROUTE_MAP,
  rewriteFusariumTwinNavigationTarget,
} from "../navigation-rewrite.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const twinsLib = join(here, "..")
const hostRoot = join(twinsLib, "..", "..", "..")
const surfacePath = join(
  hostRoot,
  "components",
  "fusarium",
  "twins",
  "fusarium-twin-surface.tsx",
)

const mounts = [
  join(hostRoot, "components", "fusarium", "twins", "aerosol", "aerosol-mount.tsx"),
  join(hostRoot, "components", "fusarium", "twins", "ancestry", "ancestry-link-rewriter.tsx"),
  join(hostRoot, "components", "fusarium", "twins", "biology-simulator", "biology-simulator-mount.tsx"),
  join(hostRoot, "components", "fusarium", "twins", "compound-analyser", "compound-analyser-mount.tsx"),
  join(hostRoot, "components", "fusarium", "twins", "growth-analytics", "growth-analytics-mount.tsx"),
  join(hostRoot, "components", "fusarium", "twins", "nature-statistics", "nature-statistics-mount.tsx"),
  join(hostRoot, "components", "fusarium", "twins", "legacy-tools", "legacy-tools-mount.tsx"),
  join(hostRoot, "components", "fusarium", "twins", "virtual-petri-dish", "virtual-petri-dish-mount.tsx"),
  join(hostRoot, "app", "fusarium", "(dashboard)", "fungi-compute", "layout.tsx"),
]

test("all Fusarium twin mount families restore the NatureOS provider and scoped theme boundary", () => {
  const surface = readFileSync(surfacePath, "utf8")
  assert.match(surface, /<NeuromorphicProvider>/)
  assert.match(surface, /className="natureos-glass-page /)
  assert.match(surface, /data-fusarium-twin-surface/)

  for (const mount of mounts) {
    assert.match(readFileSync(mount, "utf8"), /FusariumTwinSurface/, mount)
  }
})

test("explicit same-origin twin routes stay in Fusarium and unmapped routes remain untouched", () => {
  const origin = "http://127.0.0.1:8012"
  assert.ok(FUSARIUM_TWIN_ROUTE_MAP.length >= 14)
  assert.equal(
    rewriteFusariumTwinNavigationTarget("/natureos/virtual-petri-dish?mode=lab#dish", origin),
    "/fusarium/virtual-petri-dish?mode=lab#dish",
  )
  assert.equal(
    rewriteFusariumTwinNavigationTarget("/natureos/biology-simulator", origin),
    "/fusarium/biology-simulator",
  )
  assert.equal(
    rewriteFusariumTwinNavigationTarget("/natureos/tools/retrosynthesis?mode=review#pathway", origin),
    "/fusarium/tools/retrosynthesis?mode=review#pathway",
  )
  assert.equal(
    rewriteFusariumTwinNavigationTarget("/natureos/tools/digital-twin", origin),
    "/fusarium/tools/digital-twin",
  )
  assert.equal(
    rewriteFusariumTwinNavigationTarget("/natureos/tools/physics-sim", origin),
    "/fusarium/tools/physics-sim",
  )
  assert.equal(rewriteFusariumTwinNavigationTarget("/natureos/tools", origin), "/fusarium/tools")
  assert.equal(rewriteFusariumTwinNavigationTarget("/natureos/tools/alchemy-lab", origin), "/natureos/tools/alchemy-lab")
  assert.equal(rewriteFusariumTwinNavigationTarget("/natureos/mindex", origin), "/fusarium/mindex")
  assert.equal(
    rewriteFusariumTwinNavigationTarget("https://example.com/natureos/fungi-compute", origin),
    "https://example.com/natureos/fungi-compute",
  )

  const surface = readFileSync(surfacePath, "utf8")
  assert.match(surface, /MutationObserver/)
  assert.match(surface, /window\.history\.pushState = pushState/)
  assert.match(surface, /window\.history\.replaceState = replaceState/)
})
