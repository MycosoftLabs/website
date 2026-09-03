import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { rewriteFusariumTwinNavigationTarget } from "../../navigation-rewrite.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const twinRoot = join(hostRoot, "..", "..", "apps", "twins", "ancestry")
const natureosSource = "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\WEBSITE\\website"
const dash = join(hostRoot, "app", "fusarium", "(dashboard)", "life-database")
const compatibilityDash = join(hostRoot, "app", "fusarium", "(dashboard)", "ancestry")

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

test("Life Database Fusarium subtree remounts the NatureOS routes", () => {
  const routes = [
    join(dash, "page.tsx"),
    join(dash, "layout.tsx"),
    join(dash, "database", "page.tsx"),
    join(dash, "explorer", "page.tsx"),
    join(dash, "phylogeny", "page.tsx"),
    join(dash, "tools", "page.tsx"),
    join(dash, "species", "[id]", "page.tsx"),
    join(dash, "species", "name", "[name]", "page.tsx"),
    join(dash, "taxonomy", "[rank]", "[name]", "page.tsx"),
  ]
  for (const path of routes) assert.equal(existsSync(path), true, path)
  const layout = readFileSync(join(dash, "layout.tsx"), "utf8")
  const home = readFileSync(join(dash, "page.tsx"), "utf8")
  const adapter = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "ancestry", "ancestry-mount.tsx"),
    "utf8",
  )
  const compatibilityHome = readFileSync(join(compatibilityDash, "page.tsx"), "utf8")
  const catalog = readFileSync(join(hostRoot, "components", "fusarium", "fusarium-catalog.ts"), "utf8")
  assert.match(layout, /FusariumAncestryLinkRewriter/)
  assert.match(home, /FusariumLifeDatabaseMount/)
  assert.match(adapter, /life-database-home/)
  assert.doesNotMatch(adapter, /natureos\/ancestry\/(?:explorer\/)?page/)
  const fusariumHome = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "ancestry", "life-database-home.tsx"),
    "utf8",
  )
  assert.match(fusariumHome, /FUSARIUM BIOLOGICAL INTELLIGENCE/)
  assert.match(fusariumHome, /\/fusarium\/life-database\/database/)
  assert.match(fusariumHome, /label: "Species Explorer"/)
  assert.match(fusariumHome, /label: "Tools"/)
  assert.match(fusariumHome, /label: "Database"/)
  assert.doesNotMatch(fusariumHome, /Taxon coverage by kingdom|Research &amp; literature|Species Index|Genetic Database/)
  assert.doesNotMatch(fusariumHome, /All-Life Ancestry|Start Exploring|Back to NatureOS/)
  const tools = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "ancestry", "life-database-tools.tsx"),
    "utf8",
  )
  const explorer = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "ancestry", "life-database-explorer.tsx"),
    "utf8",
  )
  const database = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "ancestry", "life-database-records.tsx"),
    "utf8",
  )
  const profile = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "ancestry", "life-database-profile.tsx"),
    "utf8",
  )
  assert.match(tools, /PhylogeneticTreeTool/)
  assert.match(tools, /SequenceAlignmentTool/)
  assert.match(tools, /GenomeAnnotationTool/)
  assert.match(tools, /id="phylogeny"/)
  assert.match(tools, /Browse source records/)
  assert.doesNotMatch(tools, /href="\/fusarium\/life-database\/phylogeny"/)
  assert.doesNotMatch(tools, /Ancestry Tools|Tool Resources/)
  for (const source of [fusariumHome, tools, explorer, database, profile]) {
    assert.match(source, /data-fusarium-life-database/)
    assert.doesNotMatch(source, /from "@\/app\/natureos\/ancestry/)
    assert.doesNotMatch(source, /Species Not Found|No species were found/)
  }
  assert.match(explorer, /\/api\/fusarium\/life-database/)
  assert.match(database, /\/api\/fusarium\/life-database/)
  assert.match(profile, /coverage gap, not proof of biological absence/)
  assert.match(profile, /Evidence, licenses, and upstream lineage/)
  assert.match(compatibilityHome, /redirect\("\/fusarium\/life-database"\)/)
  assert.match(catalog, /id: "ancestry", title: "Life Database", href: "\/fusarium\/life-database"/)
  assert.doesNotMatch(home, /FusariumWorkspace/)
  assert.match(readFileSync(join(libDir, "manifest.ts"), "utf8"), /ANCESTRY_FUSARIUM_ROUTE = "\/fusarium\/life-database"/)
})

test("Fusarium Life Database APIs stay owner-gated and keep MINDEX credentials server-side", () => {
  const catalogApi = readFileSync(
    join(hostRoot, "app", "api", "fusarium", "life-database", "route.ts"),
    "utf8",
  )
  const profileApi = readFileSync(
    join(hostRoot, "app", "api", "fusarium", "life-database", "[id]", "route.ts"),
    "utf8",
  )
  const ancestryApi = readFileSync(join(hostRoot, "app", "api", "ancestry", "route.ts"), "utf8")
  const mindexFetch = readFileSync(join(hostRoot, "lib", "mindex-open-fetch.ts"), "utf8")
  const profileSource = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "ancestry", "life-database-profile.tsx"),
    "utf8",
  )

  assert.match(catalogApi, /requireOwner\(\)/)
  assert.match(catalogApi, /getAncestryCatalog\(request\)/)
  assert.match(profileApi, /requireOwner\(\)/)
  assert.match(profileApi, /Promise\.allSettled/)
  assert.match(profileApi, /searchParams\.get\("enrich"\) === "0"/)
  assert.match(profileSource, /enrich=0/)
  assert.match(profileSource, /Loading linked genetics, chemistry, observations, and research/)
  assert.match(profileApi, /genetics[\s\S]*genomes[\s\S]*compounds[\s\S]*observations/)
  assert.match(mindexFetch, /fetchMindexWithAuthRetry/)
  assert.match(ancestryApi, /sp\.set\("rank", rankParam\)/)
  assert.match(ancestryApi, /source_state: "unavailable"/)
  assert.doesNotMatch(catalogApi + profileApi, /process\.env\.(?:MINDEX_API_KEY|MINDEX_INTERNAL_API_KEY)/)
})

test("Ancestry navigation stays inside the canonical Life Database subtree", () => {
  const origin = "http://127.0.0.1:8012"
  assert.equal(
    rewriteFusariumTwinNavigationTarget("/natureos/ancestry", origin),
    "/fusarium/life-database",
  )
  assert.equal(
    rewriteFusariumTwinNavigationTarget("/natureos/ancestry/species/name/Amanita?tab=genome#locus", origin),
    "/fusarium/life-database/species/name/Amanita?tab=genome#locus",
  )
  assert.equal(
    rewriteFusariumTwinNavigationTarget("http://127.0.0.1:8012/natureos/ancestry/tools", origin),
    "http://127.0.0.1:8012/fusarium/life-database/tools",
  )
  assert.equal(
    rewriteFusariumTwinNavigationTarget("/natureos/ancestry-old", origin),
    "/natureos/ancestry-old",
  )
  assert.equal(
    rewriteFusariumTwinNavigationTarget("https://example.com/natureos/ancestry", origin),
    "https://example.com/natureos/ancestry",
  )

  const rewriter = readFileSync(
    join(hostRoot, "components", "fusarium", "twins", "fusarium-twin-surface.tsx"),
    "utf8",
  )
  assert.match(rewriter, /MutationObserver/)
  assert.match(rewriter, /window\.history\.pushState = pushState/)
  assert.match(rewriter, /window\.history\.replaceState = replaceState/)
})

test("forty-five ancestry payload files stay byte-identical across source, twin, and host", () => {
  const files = walkFiles(twinRoot)
  assert.equal(files.length, 45)
  for (const rel of files) {
    const expected = sha256(join(natureosSource, rel))
    assert.equal(sha256(join(twinRoot, rel)), expected, `twin drifted ${rel}`)
    assert.equal(sha256(join(hostRoot, rel)), expected, `host drifted ${rel}`)
  }
})
