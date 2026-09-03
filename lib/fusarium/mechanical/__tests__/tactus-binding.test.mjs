import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "tactus-binding.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-tactus-binding-"))
const compiledPath = join(compiledDir, "tactus-binding.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText)
const tactus = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

test("a Tactus UI route is not a connected hardware claim", () => {
  const unbound = tactus.bindApprovedTactusService({ uiRouteExists: true })
  assert.equal(unbound.state, "unbound")
  assert.equal(unbound.connected, false)
  assert.equal(unbound.motionAuthorized, false)
  assert.equal(unbound.contactedHardware, false)
})

test("only the approved Elephant Robotics contract can become ready, never connected by discovery", () => {
  const discovered = tactus.bindApprovedTactusService({
    contractId: tactus.APPROVED_TACTUS_CONTRACT_ID,
    manufacturer: tactus.APPROVED_TACTUS_MANUFACTURER,
    model: tactus.APPROVED_TACTUS_MODEL,
  })
  assert.equal(discovered.state, "discovered")
  assert.equal(discovered.connected, false)

  const ready = tactus.bindApprovedTactusService({
    contractId: tactus.APPROVED_TACTUS_CONTRACT_ID,
    manufacturer: tactus.APPROVED_TACTUS_MANUFACTURER,
    model: tactus.APPROVED_TACTUS_MODEL,
    readinessVerified: true,
    serialObserved: true,
    identityVerified: true,
  })
  assert.equal(ready.state, "ready")
  assert.equal(ready.connected, false)
  assert.equal(ready.motionAuthorized, false)
  assert.equal(ready.contactedHardware, false)
})
