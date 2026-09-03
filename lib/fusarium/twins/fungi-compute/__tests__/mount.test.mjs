import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const twinRoot = join(hostRoot, "..", "..", "apps", "twins", "fungi-compute")
const natureosSource = "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\WEBSITE\\website"
const dash = join(hostRoot, "app", "fusarium", "(dashboard)", "fungi-compute")

function walkFiles(root) {
  const out = []
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name !== "CLONE_MANIFEST.json" && name !== "SOURCE.md") out.push(relative(root, full).replaceAll("\\", "/"))
    }
  }
  walk(root)
  return out.sort()
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

test("Fungi Compute Fusarium remount includes layout, page, and loading", () => {
  assert.equal(existsSync(join(dash, "page.tsx")), true)
  assert.equal(existsSync(join(dash, "layout.tsx")), true)
  assert.equal(existsSync(join(dash, "loading.tsx")), true)
  const page = readFileSync(join(dash, "page.tsx"), "utf8")
  assert.match(page, /FusariumFungiComputeDashboard/)
  assert.match(page, /truthful-dashboard/)
  const layout = readFileSync(join(dash, "layout.tsx"), "utf8")
  assert.match(layout, /href="\/fusarium"/)
  assert.match(layout, /Back to Fusarium/)
  assert.doesNotMatch(layout, /href="\/natureos"/)
  assert.match(readFileSync(join(dash, "loading.tsx"), "utf8"), /from "@\/app\/natureos\/fungi-compute\/loading"/)
  assert.doesNotMatch(page, /FusariumWorkspace/)
})

test("forty-two fungi-compute payload files stay byte-identical across source, twin, and host", () => {
  const files = walkFiles(twinRoot)
  assert.equal(files.length, 42)
  for (const rel of files) {
    const expected = sha256(join(natureosSource, rel))
    assert.equal(sha256(join(twinRoot, rel)), expected, `twin drifted ${rel}`)
    assert.equal(sha256(join(hostRoot, rel)), expected, `host drifted ${rel}`)
  }
})
