import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const twinRoot = join(hostRoot, "..", "..", "apps", "twins", "biology-simulator")
const natureosSource = "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\WEBSITE\\website"
const fusariumPage = join(hostRoot, "app", "fusarium", "(dashboard)", "biology-simulator", "page.tsx")
const mountAdapter = join(hostRoot, "components", "fusarium", "twins", "biology-simulator", "biology-simulator-mount.tsx")
const workbench = join(hostRoot, "components", "fusarium", "twins", "biology-simulator", "biology-simulation-workbench.tsx")

const PAYLOAD_FILES = [
  ["app/natureos/biology-simulator/page.tsx", "b2940e35b96e0aaacad105d92218c29cb30efd20e1687f7c72cf36199c54b075"],
  ["components/natureos/apps/biology-simulator/biology-simulator-landing.tsx", "b979b2ff09d8c8b729c10354123d058ab207a3e9268925ad658071ebcaea326d"],
  ["components/natureos/apps/biology-simulator/biology-simulator-unreal-panel.tsx", "bc8b12caf2a33870a3ba808d737535e7fdc2f0fd65d48487c901e76cb8ece74e"],
  ["components/ui/badge.tsx", "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120"],
  ["components/ui/card.tsx", "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d"],
  ["lib/mindex-base-url.ts", "732fe27af1e9fa72035612c5a414c31902779f12647f9394595b6b28ced18794"],
  ["lib/utils.ts", "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3"],
  ["lib/server/mindex-proxy-request.ts", "2e0e0085991492f327cf063466851a8800541ad5fe4bb782369f61a6c02e66e5"],
  ["lib/services/species-mapping.ts", "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93"],
  ["lib/utils/index.ts", "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043"],
]

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

test("Biology Simulator Fusarium workbench exists and does not use the slug workspace", () => {
  assert.equal(existsSync(fusariumPage), true)
  assert.equal(existsSync(mountAdapter), true)
  assert.equal(existsSync(workbench), true)
  const page = readFileSync(fusariumPage, "utf8")
  const adapter = readFileSync(mountAdapter, "utf8")
  assert.match(page, /FusariumBiologySimulatorMount/)
  assert.doesNotMatch(page, /FusariumWorkspace/)
  assert.match(adapter, /BiologySimulationWorkbench/)
  assert.match(readFileSync(workbench, "utf8"), /href="\/fusarium"/)
  assert.match(readFileSync(workbench, "utf8"), /not live telemetry/i)
  assert.match(readFileSync(join(libDir, "manifest.ts"), "utf8"), /BIOLOGY_SIMULATOR_FUSARIUM_ROUTE = "\/fusarium\/biology-simulator"/)
})

test("ten payload files stay byte-identical across source, twin, and host", () => {
  assert.equal(PAYLOAD_FILES.length, 10)
  for (const [rel, expected] of PAYLOAD_FILES) {
    assert.equal(sha256(join(natureosSource, rel)), expected, `source drifted ${rel}`)
    assert.equal(sha256(join(twinRoot, rel)), expected, `twin drifted ${rel}`)
    assert.equal(sha256(join(hostRoot, rel)), expected, `host drifted ${rel}`)
  }
})
