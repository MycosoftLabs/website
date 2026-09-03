import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const fusariumRoot = join(hostRoot, "..", "..")
const twinRoot = join(fusariumRoot, "apps", "twins", "nature-statistics")
const natureosSource = "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\WEBSITE\\website"
const fusariumPage = join(
  hostRoot,
  "app",
  "fusarium",
  "(dashboard)",
  "nature-statistics",
  "page.tsx",
)
const mountAdapter = join(
  hostRoot,
  "components",
  "fusarium",
  "twins",
  "nature-statistics",
  "nature-statistics-mount.tsx",
)
const natureosPage = join(hostRoot, "app", "natureos", "nature-statistics", "page.tsx")
const protectedShell = [
  join(hostRoot, "components", "fusarium", "fusarium-classification.tsx"),
  join(hostRoot, "app", "fusarium", "fusarium-operator.css"),
]
const slugWorkspace = join(hostRoot, "app", "fusarium", "(dashboard)", "[slug]", "page.tsx")

const PAYLOAD_FILES = [
  ["app/natureos/nature-statistics/page.tsx", "3af6d1812324a091e6b3913cf6d01dc212a94bff7499e53f296d1c46b488d8ee"],
  ["components/dashboard/header.tsx", "c7854593b922e546c14d01207f853ecd9059905b072682105745d46387032dba"],
  ["components/dashboard/shell.tsx", "dd3096f51a33178c36ba84fb8148f5bb58f841818c3a8dedf0be1dbe43eeab37"],
  ["components/natureos/nature-statistics-view.tsx", "9f56cf3c2d4174b6cf7b817dab50f5601a91c837a5e88cafc8f5514aa8b05fde"],
  ["components/ui/badge.tsx", "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120"],
  ["components/ui/button.tsx", "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e"],
  ["components/ui/card.tsx", "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d"],
  ["components/widgets/humans-machines-panel.tsx", "724ee03808cd3051fb62468fe6df857c190f5df9d38835c8e392fb57e875dd7f"],
  ["components/widgets/kingdom-stat-card.tsx", "1a2223d0f7031835c9996d6b2dcdd977629278a135a580bee18d48d9c3734506"],
  ["components/widgets/rolling-number.tsx", "7df2a096cf7625e87740b650aeeeb432c4813f2c19b60d4c7cc450784e2dcffe"],
  ["hooks/use-live-stats.ts", "a1be13ffb63c3414c3ba80dde08b10cc1d96911de4d38b64b6999e0b20a0a796"],
  ["hooks/use-mycobrain.ts", "30a9f5fbb86c21d72f11d42c6cb9c9010e06295b8b0c24d920d06c8f4d2e51e8"],
  ["lib/utils.ts", "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3"],
  ["lib/services/species-mapping.ts", "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93"],
  ["lib/utils/index.ts", "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043"],
]

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function readManifest() {
  return readFileSync(join(libDir, "manifest.ts"), "utf8")
}

test("Nature Statistics Fusarium route and adapter exist", () => {
  assert.equal(existsSync(fusariumPage), true)
  assert.equal(existsSync(mountAdapter), true)
  assert.equal(existsSync(natureosPage), true)
})

test("Fusarium page restores the working NatureOS Nature Statistics composition", () => {
  const page = readFileSync(fusariumPage, "utf8")
  const adapter = readFileSync(mountAdapter, "utf8")
  const sourcePage = readFileSync(natureosPage, "utf8")
  assert.match(page, /FusariumNatureStatisticsMount/)
  assert.doesNotMatch(page, /FusariumWorkspace/)
  assert.doesNotMatch(page, /runtime-binding/)
  assert.match(adapter, /function FusariumNatureStatisticsMount/)
  assert.match(adapter, /<FusariumTwinSurface>/)
  assert.match(adapter, /<NatureStatisticsView \/>/)
  assert.match(adapter, /FusariumNatureStatisticsOperationalView/)
  assert.match(adapter, /data-nature-statistics-parity="natureos-primary"/)
  assert.match(adapter, /data-layout="edge-to-edge-responsive-parity"/)
  assert.match(adapter, /Population: estimate feed/)
  assert.match(sourcePage, /return <NatureStatisticsView \/>/)
  assert.match(page, /return <FusariumNatureStatisticsMount \/>/)
})

test("fifteen payload files stay byte-identical across source, twin, and host", () => {
  assert.equal(PAYLOAD_FILES.length, 15)
  for (const [rel, expected] of PAYLOAD_FILES) {
    const sourcePath = join(natureosSource, rel)
    const twinPath = join(twinRoot, rel)
    const hostPath = join(hostRoot, rel)
    assert.equal(existsSync(sourcePath), true, `missing source ${rel}`)
    assert.equal(existsSync(twinPath), true, `missing twin ${rel}`)
    assert.equal(existsSync(hostPath), true, `missing host ${rel}`)
    const sourceHash = sha256(sourcePath)
    const twinHash = sha256(twinPath)
    const hostHash = sha256(hostPath)
    assert.equal(sourceHash, expected, `source drifted ${rel}`)
    assert.equal(twinHash, expected, `twin drifted ${rel}`)
    assert.equal(hostHash, expected, `host drifted ${rel}`)
  }
})

test("mount contract records the Fusarium route and does not invent live data", () => {
  const manifest = readManifest()
  assert.match(manifest, /NATURE_STATISTICS_FUSARIUM_ROUTE = "\/fusarium\/nature-statistics"/)
  assert.match(manifest, /\/api\/natureos\/live-stats/)
  assert.match(manifest, /\/api\/natureos\/population/)
  assert.equal((manifest.match(/path: "/g) || []).length, 15)
  const contract = readFileSync(join(libDir, "mount-contract.ts"), "utf8")
  assert.match(contract, /rendersClonedView: true/)
  assert.match(contract, /rendersOperationalView: false/)
  assert.match(contract, /addsInventedLiveData: false/)
  assert.match(contract, /usesEdgeToEdgeResponsiveLayout: true/)
  assert.match(contract, /labelsPopulationAsEstimate: true/)
})

test("global agent statistics GET cannot persist or queue external work", () => {
  const route = readFileSync(join(hostRoot, "app", "api", "global-agents", "route.ts"), "utf8")
  assert.doesNotMatch(route, /method:\s*["']POST["']/)
  assert.doesNotMatch(route, /recordMindexEtlImprovement/)
  assert.match(route, /GET is read-only/)
  assert.match(route, /state:\s*["']not_attempted["']/)
})

test("protected shared-shell files and slug workspace were not rewritten by this mount", () => {
  for (const path of protectedShell) {
    assert.equal(existsSync(path), true, path)
  }
  const slug = readFileSync(slugWorkspace, "utf8")
  assert.match(slug, /FusariumWorkspace/)
  assert.match(slug, /earth-simulator has an explicit route/)
})
