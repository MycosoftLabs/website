import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(here, "..", "field-store.ts")
const compiledDir = mkdtempSync(join(tmpdir(), "crep-field-store-"))
const compiledPath = join(compiledDir, "field-store.mjs")
const source = readFileSync(sourcePath, "utf8")
writeFileSync(compiledPath, ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText)
const store = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

test("BFF bind does not require ARRAYLAKE_FIELD_BASE when a local bake exists", () => {
  const root = mkdtempSync(join(tmpdir(), "arraylake-bake-"))
  const bake = join(root, "public", "assets", "fields")
  mkdirSync(bake, { recursive: true })
  writeFileSync(join(bake, ".keep"), "")
  try {
    const found = store.findLocalFieldStore(root)
    assert.equal(found, bake)
    assert.equal(store.fieldStoreBound(root).bound, true)
    assert.equal(store.fieldFrameBffUrl("era5", "t2m", "frame-0.png"), "/api/crep/field/era5/t2m/frame-0.png")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("missing required store stays unbound-capable and rejects unsafe files", () => {
  const root = mkdtempSync(join(tmpdir(), "arraylake-empty-"))
  try {
    assert.equal(store.findLocalFieldStore(root), null)
    assert.equal(store.safeFieldFileName(".."), null)
    assert.equal(store.safeFieldFileName("ok-frame.webp"), "ok-frame.webp")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
