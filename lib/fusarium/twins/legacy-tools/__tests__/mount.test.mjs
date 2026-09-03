import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const twinsRoot = join(hostRoot, "..", "..", "apps", "twins")
const configuredNatureosSource = process.env.NATUREOS_SOURCE_ROOT?.trim()
const natureosSource = configuredNatureosSource ? resolve(configuredNatureosSource) : null
const mountAdapter = join(
  hostRoot,
  "components",
  "fusarium",
  "twins",
  "legacy-tools",
  "legacy-tools-mount.tsx",
)
const truthBoundary = join(
  hostRoot,
  "components",
  "fusarium",
  "twins",
  "legacy-tools",
  "legacy-tool-truth-boundary.tsx",
)
const physicsMountStyles = join(
  hostRoot,
  "components",
  "fusarium",
  "twins",
  "legacy-tools",
  "physics-sim-mount.module.css",
)
const manifestFile = join(libDir, "manifest.ts")

const COMMON_PAYLOADS = [
  ["components/natureos/tool-context.tsx", "c7a95fcbede2982dfac63f92913820de44a02e441bb0de897dacf011d933682f"],
  ["components/natureos/tool-viewport.tsx", "cbc234ef3035a37848e94194aa70c6eb15210f430d70fdee1cb4eda91a72ea65"],
  ["components/ui/badge.tsx", "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120"],
  ["components/ui/button.tsx", "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e"],
  ["components/ui/card.tsx", "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d"],
  ["components/ui/input.tsx", "e22babbd675db6e921fcde4c1f85435dcdeba2734b10b9f4013d3c9ca5332658"],
  ["components/ui/label.tsx", "d92f65d70ed214fb1be4215e4dd6aa07c38646b34711e45d19be2767a7d69cd2"],
  ["components/ui/tabs.tsx", "ab463f98c625384d162fd97a534078d03b4f4c4c5ef218b1488f2fb07df7c7aa"],
  ["lib/natureos-activity.ts", "8e0a088d8ce33c35db55de6ccfc32a628b9e2e603e06652605505dd4e225c282"],
  ["lib/utils.ts", "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3"],
  ["lib/services/species-mapping.ts", "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93"],
  ["lib/utils/index.ts", "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043"],
]

const PAYLOADS = {
  retrosynthesis: [
    ["app/apps/retrosynthesis/page.tsx", "4a4d791b1e965cdb9efb6096adc207a7b107eda63478d039fff94b9ef4e752ca"],
    ["app/natureos/tools/retrosynthesis/page.tsx", "a994d60119d6ee02c05209799b11303e48ffa800c75ae009d11975f1657d799c"],
    ["components/natureos/tools/retrosynthesis-embed.tsx", "859f139693fd8da5460ec942bd5b1035cefa5f9cad96feadfaf1ffd89ed1d32d"],
    ["components/ui/progress.tsx", "98271448650669d39d317bdbd418e5bfb2546cd03fa016d0758b744d26136fcb"],
    ["components/ui/select.tsx", "6c5c9d35a4a66abb4b7f06aa8e75769b8a70c3c85fcbd333c8482f078a9f41f0"],
    ...COMMON_PAYLOADS,
  ],
  "digital-twin": [
    ["app/natureos/tools/digital-twin/page.tsx", "aa26d005efdfe5a50c7bdd314547e05fbe0378d685fdfab407005641a04f63fa"],
    ["components/apps/digital-twin-content.tsx", "bd3950f0d87e0bffeea1f4b61051bc31db4ad16dd80373ca6045f9d54dfdc5d0"],
    ["components/natureos/tools/digital-twin-embed.tsx", "39b68b9595bf8cfe4648ebcd3f1d200634792197318c430ed38b6e7b531e0a73"],
    ["components/ui/switch.tsx", "85c64d155fad756c2002977b95ce3c495e5d88214563c674009c062ea5d29d3f"],
    ...COMMON_PAYLOADS,
  ],
  "physics-sim": [
    ["app/apps/physics-sim/page.tsx", "7a83d01318e0b6f6667237fc0484668602b2b89e04c2bab87965a0d373bca874"],
    ["app/natureos/tools/physics-sim/page.tsx", "7675b2611636b8364944d9149319da9254691e0643829d2e6ad14501e135d934"],
    ["components/natureos/tools/physics-sim-embed.tsx", "b8f7a118af95d7899b9dcf754eafbdfb7b2dfa7518134a4ab7b2d2a6dff1c83a"],
    ["components/ui/progress.tsx", "98271448650669d39d317bdbd418e5bfb2546cd03fa016d0758b744d26136fcb"],
    ["components/ui/select.tsx", "6c5c9d35a4a66abb4b7f06aa8e75769b8a70c3c85fcbd333c8482f078a9f41f0"],
    ["components/ui/slider.tsx", "12ed0cea472f6514ab656fd92cdb7dcb28d5866433c75f71ff0c51bc46acb5f3"],
    ...COMMON_PAYLOADS,
  ],
}

const ROUTES = {
  retrosynthesis: {
    page: join(hostRoot, "app", "fusarium", "(dashboard)", "tools", "retrosynthesis", "page.tsx"),
    mount: "FusariumRetrosynthesisMount",
    canonical: "data-fusarium-retrosynthesis-locked",
  },
  "digital-twin": {
    page: join(hostRoot, "app", "fusarium", "(dashboard)", "tools", "digital-twin", "page.tsx"),
    mount: "FusariumDigitalTwinMount",
    canonical: "FusariumDigitalTwinWorkspace",
  },
  "physics-sim": {
    page: join(hostRoot, "app", "fusarium", "(dashboard)", "tools", "physics-sim", "page.tsx"),
    mount: "FusariumPhysicsSimulatorMount",
    canonical: "NatureOSPhysicsSimPage",
  },
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

test("dedicated Fusarium routes keep legacy payloads protected while Retrosynthesis uses its safe local replacement", () => {
  const adapter = readFileSync(mountAdapter, "utf8")
  const boundary = readFileSync(truthBoundary, "utf8")
  assert.match(adapter, /FusariumTwinSurface/)
  assert.match(adapter, /FusariumLegacyToolTruthBoundary/)
  assert.match(boundary, /href="\/fusarium\/tools"/)
  assert.match(boundary, /Back to Tools Hub/)
  assert.match(boundary, /data-fusarium-legacy-tool/)
  assert.match(boundary, /UNBOUND \/ NOT PROBED/)
  assert.match(boundary, /SIMULATED/)
  assert.match(boundary, /CONTENT WITHHELD/)
  assert.match(boundary, /data-fusarium-unavailable-control/)
  assert.match(boundary, /hidden=\{!rewriteReady\}/)
  assert.match(boundary, /aria-hidden=\{rewriteReady \? undefined : "true"\}/)
  assert.match(boundary, /data-rewrite-ready=\{rewriteReady \? "true" : "false"\}/)
  assert.match(boundary, /rewrite\(payload\)[\s\S]*setRewriteReady\(true\)/)
  assert.doesNotMatch(boundary, /requestAnimationFrame/)
  assert.doesNotMatch(boundary, /setTimeout\(start/)
  assert.doesNotMatch(boundary, /href="\/natureos/)
  assert.match(adapter, /FusariumDigitalTwinWorkspace/)
  assert.doesNotMatch(adapter, /NatureOSDigitalTwinPage/)
  assert.match(adapter, /data-fusarium-retrosynthesis-locked/)
  assert.doesNotMatch(adapter, /NatureOSRetrosynthesisPage/)
  assert.match(adapter, /data-fusarium-physics-narrow-boundary/)

  const retrosynthesisPage = readFileSync(ROUTES.retrosynthesis.page, "utf8")
  assert.match(retrosynthesisPage, /RetrosynthesisEvidenceWorkbench as FusariumRetrosynthesisMount/)
  assert.doesNotMatch(retrosynthesisPage, /legacy-tools-mount/)

  for (const route of Object.values(ROUTES)) {
    assert.equal(existsSync(route.page), true)
    const page = readFileSync(route.page, "utf8")
    assert.match(page, new RegExp(route.mount))
    assert.doesNotMatch(page, /FusariumWorkspace/)
    assert.doesNotMatch(page, /\/natureos\//)
    assert.match(adapter, new RegExp(route.canonical))
  }
})

test("Fusarium Physics releases inherited narrow min-content without hiding overflow", () => {
  const adapter = readFileSync(mountAdapter, "utf8")
  const styles = readFileSync(physicsMountStyles, "utf8")

  assert.match(adapter, /physicsStyles\.physicsMount/)
  assert.match(styles, /@media \(max-width: 640px\)/)
  assert.match(styles, /flex-direction: column/)
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(styles, /white-space: normal/)
  assert.match(styles, /overflow-wrap: anywhere/)
  assert.doesNotMatch(styles, /overflow-x:\s*(?:hidden|clip)/)
})

test("Fusarium Digital Twin clears changed-device evidence and suppresses stale responses", () => {
  const workspace = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "legacy-tools", "fusarium-digital-twin-workspace.tsx"),
    "utf8",
  )
  assert.match(workspace, /abortRef\.current\?\.abort\(\)/)
  assert.match(workspace, /generationRef\.current !== generation/)
  assert.match(workspace, /deviceIdRef\.current\.trim\(\) !== requestedDeviceId/)
  assert.match(workspace, /payload\.device_id !== requestedDeviceId/)
  assert.match(workspace, /changeDeviceId[\s\S]*clearEvidence\(\)/)
  assert.match(workspace, /current_state !== null/)
  assert.match(workspace, /VALIDATED LIVE EVIDENCE/)
  assert.match(workspace, /VALIDATED STALE EVIDENCE/)
  assert.match(workspace, /exactIso\(readings\.timestamp\)/)
})

test("manifest keeps inherited chemistry locked while advertising the safe local replacement", () => {
  const manifest = readFileSync(manifestFile, "utf8")
  const boundary = readFileSync(truthBoundary, "utf8")
  const retrospective = readFileSync(join(hostRoot, "app", "apps", "retrosynthesis", "page.tsx"), "utf8")
  const digital = readFileSync(join(hostRoot, "components", "apps", "digital-twin-content.tsx"), "utf8")
  const physics = readFileSync(join(hostRoot, "app", "apps", "physics-sim", "page.tsx"), "utf8")

  assert.match(retrospective, /\/\/ Simulate API call/)
  assert.doesNotMatch(retrospective, /\bfetch\s*\(/)
  assert.match(boundary, /inherited NatureOS demonstration is not mounted/)
  assert.match(manifest, /truthMode: "LOCKED \/ CONTENT WITHHELD"/)
  assert.match(manifest, /providerState: "unavailable"/)
  assert.match(manifest, /replacementState: "available-local-evidence-review"/)
  assert.doesNotMatch(manifest, /ILLUSTRATIVE|not-probed/)
  assert.match(digital, /fetch\(`\/api\/natureos\/devices\/twin/)
  assert.match(boundary, /HTTP response alone does not prove identity/)
  assert.match(physics, /Math\.random\(\)/)
  assert.doesNotMatch(physics, /\bfetch\s*\(/)
  assert.match(boundary, /unseeded client-side random values/)
})

test("all 51 committed canonical payload files stay byte-identical across frozen twin and host", () => {
  assert.equal(Object.values(PAYLOADS).reduce((sum, files) => sum + files.length, 0), 51)

  for (const [appId, files] of Object.entries(PAYLOADS)) {
    const manifest = JSON.parse(
      readFileSync(join(twinsRoot, appId, "CLONE_MANIFEST.json"), "utf8"),
    )
    assert.equal(files.length, manifest.cloned_file_count)
    assert.deepEqual(manifest.missing_source_files, [])

    for (const [relativePath, expected] of files) {
      if (natureosSource) {
        assert.equal(existsSync(natureosSource), true, "NATUREOS_SOURCE_ROOT must resolve to an existing checkout")
        assert.equal(sha256(join(natureosSource, relativePath)), expected, `configured source drifted ${appId}:${relativePath}`)
      }
      assert.equal(sha256(join(twinsRoot, appId, relativePath)), expected, `twin drifted ${appId}:${relativePath}`)
      assert.equal(sha256(join(hostRoot, relativePath)), expected, `host drifted ${appId}:${relativePath}`)
    }
  }
})
