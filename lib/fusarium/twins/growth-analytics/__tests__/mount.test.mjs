import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const twinRoot = join(hostRoot, "..", "..", "apps", "twins", "growth-analytics")
const configuredNatureosSource = process.env.NATUREOS_SOURCE_ROOT?.trim()
const natureosSource = configuredNatureosSource ? resolve(configuredNatureosSource) : null
const fusariumPage = join(hostRoot, "app", "fusarium", "(dashboard)", "growth-analytics", "page.tsx")
const mountAdapter = join(hostRoot, "components", "fusarium", "twins", "growth-analytics", "growth-analytics-mount.tsx")
const evidenceWorkbench = join(hostRoot, "components", "fusarium", "twins", "growth-analytics", "growth-evidence-workbench.tsx")
const analysisRoute = join(hostRoot, "app", "api", "fusarium", "growth-analytics", "analyze", "route.ts")
const truthBoundary = join(hostRoot, "components", "fusarium", "twins", "growth-analytics", "growth-analytics-truth-boundary.tsx")

const PAYLOAD_FILES = [
  ["app/apps/growth-analytics/page.tsx", "ef82bc814911ea4376a4f86d3bd4cffbc12b72b679f4f2c39867e2e24cdd2361"],
  ["app/natureos/growth-analytics/page.tsx", "82790cbb8abd6d4eedbf28b76dd7ec6a17ec99f9354ed0a0ca7d7eaed812e59a"],
  ["components/natureos/tool-context.tsx", "c7a95fcbede2982dfac63f92913820de44a02e441bb0de897dacf011d933682f"],
  ["components/natureos/tool-viewport.tsx", "cbc234ef3035a37848e94194aa70c6eb15210f430d70fdee1cb4eda91a72ea65"],
  ["components/natureos/tools/growth-analytics-embed.tsx", "3320bb39dd9b4aa70f508b2676c88af52bf88be1f9f1b900a77667c3bb9d2733"],
  ["components/ui/badge.tsx", "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120"],
  ["components/ui/button.tsx", "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e"],
  ["components/ui/card.tsx", "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d"],
  ["components/ui/progress.tsx", "98271448650669d39d317bdbd418e5bfb2546cd03fa016d0758b744d26136fcb"],
  ["components/ui/scroll-area.tsx", "8dc1de92f3cde30161e7f9528527cca317ac194b55a94df4ee82c5e3006bb85a"],
  ["components/ui/select.tsx", "6c5c9d35a4a66abb4b7f06aa8e75769b8a70c3c85fcbd333c8482f078a9f41f0"],
  ["components/ui/slider.tsx", "12ed0cea472f6514ab656fd92cdb7dcb28d5866433c75f71ff0c51bc46acb5f3"],
  ["components/ui/tabs.tsx", "ab463f98c625384d162fd97a534078d03b4f4c4c5ef218b1488f2fb07df7c7aa"],
  ["lib/natureos-activity.ts", "8e0a088d8ce33c35db55de6ccfc32a628b9e2e603e06652605505dd4e225c282"],
  ["lib/utils.ts", "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3"],
  ["lib/services/species-mapping.ts", "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93"],
  ["lib/utils/index.ts", "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043"],
]

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

test("Growth Analytics Fusarium remount exists and does not use the slug workspace", () => {
  assert.equal(existsSync(fusariumPage), true)
  assert.equal(existsSync(mountAdapter), true)
  assert.equal(existsSync(evidenceWorkbench), true)
  assert.equal(existsSync(analysisRoute), true)
  const page = readFileSync(fusariumPage, "utf8")
  const adapter = readFileSync(mountAdapter, "utf8")
  assert.match(page, /FusariumGrowthAnalyticsMount/)
  assert.doesNotMatch(page, /FusariumWorkspace/)
  assert.match(adapter, /from "@\/app\/natureos\/growth-analytics\/page"/)
  assert.match(adapter, /GrowthEvidenceWorkbench/)
  assert.match(adapter, /GrowthAnalyticsTruthBoundary/)
  assert.match(adapter, /\[&_\[data-slot=tabs-list\]\]:max-w-full/)
  assert.match(adapter, /\[&_\[data-slot=tabs-list\]\]:overflow-x-auto/)
  assert.match(readFileSync(evidenceWorkbench, "utf8"), /Observed growth analysis/)
  assert.match(readFileSync(analysisRoute, "utf8"), /analyzeGrowthSeries/)
  const boundary = readFileSync(truthBoundary, "utf8")
  assert.match(boundary, /Providers are shown only when their records pass the local contract/)
  assert.match(boundary, /hidden=\{!ready\}/)
  assert.match(readFileSync(join(libDir, "manifest.ts"), "utf8"), /GROWTH_ANALYTICS_FUSARIUM_ROUTE = "\/fusarium\/growth-analytics"/)
})

test("seventeen payload files stay byte-identical across frozen twin and host", () => {
  assert.equal(PAYLOAD_FILES.length, 17)
  for (const [rel, expected] of PAYLOAD_FILES) {
    if (natureosSource) {
      assert.equal(existsSync(natureosSource), true, "NATUREOS_SOURCE_ROOT must resolve to an existing checkout")
      assert.equal(sha256(join(natureosSource, rel)), expected, `configured source drifted ${rel}`)
    }
    assert.equal(sha256(join(twinRoot, rel)), expected, `twin drifted ${rel}`)
    assert.equal(sha256(join(hostRoot, rel)), expected, `host drifted ${rel}`)
  }
})
