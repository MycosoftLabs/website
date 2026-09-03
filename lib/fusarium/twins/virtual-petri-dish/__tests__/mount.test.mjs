import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const twinRoot = join(hostRoot, "..", "..", "apps", "twins", "virtual-petri-dish")
const natureosSource = "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\WEBSITE\\website"
const dash = join(hostRoot, "app", "fusarium", "(dashboard)")

const PAYLOAD_FILES = [
  ["lib/natureos-activity.ts", "8e0a088d8ce33c35db55de6ccfc32a628b9e2e603e06652605505dd4e225c282"],
  ["lib/utils.ts", "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3"],
  ["app/natureos/petri-sim/page.tsx", "c2d19a2d371f41a878c09985c83e0971616bb3ea4ace5388d5123eb72020e9f6"],
  ["app/natureos/virtual-petri-dish/page.tsx", "3729b8f1ff38008ecb67f1e5d93f995ed058c5c2a456f250a945790d39af8724"],
  ["app/natureos/virtual-petri-dish2/page.tsx", "203004f9ba165936b56aa1f1d7a6792eaa15648bf57318830f19e3db7f60dc7a"],
  ["components/apps/mycelium-simulator.tsx", "f5852f3cb9d58b003232da5cd172689b4baf522ec25d7fd869c0c109b4e081f9"],
  ["components/natureos/tool-context.tsx", "c7a95fcbede2982dfac63f92913820de44a02e441bb0de897dacf011d933682f"],
  ["components/natureos/tool-viewport.tsx", "cbc234ef3035a37848e94194aa70c6eb15210f430d70fdee1cb4eda91a72ea65"],
  ["components/petri-dish-v2/petri-dish-app.tsx", "ab12f3221674078d2425943e2236b483670b4b85dcd908a4d6d2a2e59f2068ef"],
  ["components/petri-dish-v2/types.ts", "a1ab25e7bdd1b627744a769413112cfb3bd82861089ef6ef96483d4e0e028d65"],
  ["components/petri-dish-v2/viewer.tsx", "c6ef51233ac5cc56a53500b72529fd47ce8736d2a2b418f776e8be9b3f735964"],
  ["components/ui/badge.tsx", "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120"],
  ["components/ui/button.tsx", "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e"],
  ["components/ui/card.tsx", "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d"],
  ["components/ui/dialog.tsx", "3b0c6f7b863b9e02ab9d62fa66153a634dc26df2578c18bf56ca4fa0fc88dd4d"],
  ["components/ui/label.tsx", "d92f65d70ed214fb1be4215e4dd6aa07c38646b34711e45d19be2767a7d69cd2"],
  ["components/ui/scroll-area.tsx", "8dc1de92f3cde30161e7f9528527cca317ac194b55a94df4ee82c5e3006bb85a"],
  ["components/ui/select.tsx", "6c5c9d35a4a66abb4b7f06aa8e75769b8a70c3c85fcbd333c8482f078a9f41f0"],
  ["components/ui/separator.tsx", "4e291f794c76ffe1f9c59ae922fc17eeff33cd25b5eb9dc8e22fdf7daf352203"],
  ["components/ui/slider.tsx", "12ed0cea472f6514ab656fd92cdb7dcb28d5866433c75f71ff0c51bc46acb5f3"],
  ["components/natureos/tools/petri-dish-embed.tsx", "dc5e10da2705553b6e6026461c2edf0a9399e851cefa093f157233ea0f6622ae"],
  ["components/natureos/tools/petri-dish-v2-embed.tsx", "e9a51445e3f9555705741d6a0932525eb5dfcb2e97749ea0752ae07fe6c354d3"],
  ["lib/bluesight/api.ts", "f5f8761f369b3672641072a14d7a23bf63e2234d6405d21f02bf413afbecae02"],
  ["lib/bluesight/types.ts", "8e788056cd767b3812b533dc08d925367976fd1f8edf7d6eae02e6fc45e544dc"],
  ["lib/petri-dish-v2/petri-api.ts", "802d212478047de9974b42b75c42c4839e355d81340f427ae33aaff5f8e39b3a"],
  ["lib/petri-dish-v2/rest-engine-worker.ts", "2401258d8a616ed18aeaff7b83aa096604923e528c4bd758b639954ec34fda40"],
  ["lib/services/species-mapping.ts", "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93"],
  ["lib/utils/index.ts", "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043"],
]

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

test("Virtual Petri Dish primary and alias mounts exist", () => {
  assert.equal(existsSync(join(dash, "virtual-petri-dish", "page.tsx")), true)
  assert.equal(existsSync(join(dash, "virtual-petri-dish2", "page.tsx")), true)
  assert.equal(existsSync(join(dash, "petri-sim", "page.tsx")), true)
  const primary = readFileSync(join(dash, "virtual-petri-dish", "page.tsx"), "utf8")
  const alias = readFileSync(join(dash, "petri-sim", "page.tsx"), "utf8")
  assert.match(primary, /FusariumVirtualPetriDishMount/)
  assert.doesNotMatch(primary, /FusariumWorkspace/)
  assert.match(alias, /redirect\("\/fusarium\/virtual-petri-dish"\)/)
  assert.doesNotMatch(alias, /\/natureos\/virtual-petri-dish/)
})

test("Fusarium repairs the Petri layout without changing the NatureOS payload", () => {
  const mountPath = join(
    hostRoot,
    "components",
    "fusarium",
    "twins",
    "virtual-petri-dish",
    "virtual-petri-dish-mount.tsx",
  )
  const stylePath = join(
    hostRoot,
    "components",
    "fusarium",
    "twins",
    "virtual-petri-dish",
    "virtual-petri-dish-mount.module.css",
  )
  const mount = readFileSync(mountPath, "utf8")
  const styles = readFileSync(stylePath, "utf8")

  assert.match(mount, /data-fusarium-petri-layout/)
  assert.match(mount, /virtual-petri-dish-mount\.module\.css/)
  assert.match(styles, /grid-template-columns/)
  assert.match(styles, /petri-codepen-button-demo-reset/)
  assert.match(styles, /min-height: 2\.75rem/)
  assert.match(styles, /min-width: 2\.75rem/)
  assert.match(styles, /max-width: 52rem/)
  assert.match(styles, /:global\(\.dark\)/)
})

test("twenty-eight payload files stay byte-identical across source, twin, and host", () => {
  assert.equal(PAYLOAD_FILES.length, 28)
  for (const [rel, expected] of PAYLOAD_FILES) {
    assert.equal(sha256(join(natureosSource, rel)), expected, `source drifted ${rel}`)
    assert.equal(sha256(join(twinRoot, rel)), expected, `twin drifted ${rel}`)
    assert.equal(sha256(join(hostRoot, rel)), expected, `host drifted ${rel}`)
  }
})
