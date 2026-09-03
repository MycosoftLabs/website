import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const twinRoot = join(hostRoot, "..", "..", "apps", "twins", "compound-analyser")
const natureosSource = "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\WEBSITE\\website"
const fusariumPage = join(hostRoot, "app", "fusarium", "(dashboard)", "compound-analyser", "page.tsx")
const mountAdapter = join(hostRoot, "components", "fusarium", "twins", "compound-analyser", "compound-analyser-mount.tsx")

const PAYLOAD_FILES = [
  ["app/apps/compound-sim/page.tsx", "19df3f7a90443158bb202047c9d781c38dccbbedfe94b08c8242e88348e5d4d4"],
  ["app/natureos/compound-analyser/page.tsx", "ad72ae7a5fd60b8acb8b1f3541cdc4d47c5e2327f343a9941534747800f05cc6"],
  ["components/natureos/tool-context.tsx", "c7a95fcbede2982dfac63f92913820de44a02e441bb0de897dacf011d933682f"],
  ["components/natureos/tool-viewport.tsx", "cbc234ef3035a37848e94194aa70c6eb15210f430d70fdee1cb4eda91a72ea65"],
  ["components/natureos/tools/compound-sim-embed.tsx", "9bcf091e75e016a368f84e578435dc9522e43dca831b2324f4a318e689b6c4dc"],
  ["components/ui/badge.tsx", "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120"],
  ["components/ui/button.tsx", "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e"],
  ["components/ui/card.tsx", "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d"],
  ["components/ui/input.tsx", "e22babbd675db6e921fcde4c1f85435dcdeba2734b10b9f4013d3c9ca5332658"],
  ["components/ui/tabs.tsx", "ab463f98c625384d162fd97a534078d03b4f4c4c5ef218b1488f2fb07df7c7aa"],
  ["lib/natureos-activity.ts", "8e0a088d8ce33c35db55de6ccfc32a628b9e2e603e06652605505dd4e225c282"],
  ["lib/utils.ts", "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3"],
  ["lib/data/compounds.ts", "a14b57a20f0488f9aad38da0f80c9845201e33d3d5304a46083ced2309f05c11"],
  ["lib/services/species-mapping.ts", "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93"],
  ["lib/utils/index.ts", "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043"],
]

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

test("Compound Analyser Fusarium remount exists and does not use the slug workspace", () => {
  assert.equal(existsSync(fusariumPage), true)
  assert.equal(existsSync(mountAdapter), true)
  const page = readFileSync(fusariumPage, "utf8")
  const adapter = readFileSync(mountAdapter, "utf8")
  assert.match(page, /FusariumCompoundAnalyserMount/)
  assert.doesNotMatch(page, /FusariumWorkspace/)
  assert.match(adapter, /from "@\/app\/natureos\/compound-analyser\/page"/)
  assert.match(readFileSync(join(libDir, "manifest.ts"), "utf8"), /COMPOUND_ANALYSER_FUSARIUM_ROUTE = "\/fusarium\/compound-analyser"/)
})

test("fifteen payload files stay byte-identical across source, twin, and host", () => {
  assert.equal(PAYLOAD_FILES.length, 15)
  for (const [rel, expected] of PAYLOAD_FILES) {
    assert.equal(sha256(join(natureosSource, rel)), expected, `source drifted ${rel}`)
    assert.equal(sha256(join(twinRoot, rel)), expected, `twin drifted ${rel}`)
    assert.equal(sha256(join(hostRoot, rel)), expected, `host drifted ${rel}`)
  }
})
