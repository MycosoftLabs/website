import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = fileURLToPath(new URL("..", import.meta.url))
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-data-fusion-tests-"))
const moduleNames = ["contracts", "deep-links", "scenario", "provider", "fabric-contract"]

for (const name of moduleNames) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts
    .transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(
      /from\s+["']\.\/(contracts|deep-links|scenario)["']/g,
      'from "./$1.mjs"',
    )
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

export async function loadDataFusionModules() {
  const [contracts, deepLinks, scenario, provider, fabricContract] = await Promise.all(
    moduleNames.map((name) => import(pathToFileURL(join(compiledDir, `${name}.mjs`)).href)),
  )
  return { contracts, deepLinks, scenario, provider, fabricContract }
}

export function cleanupCompiledModules() {
  rmSync(compiledDir, { recursive: true, force: true })
}
