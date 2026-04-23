/**
 * Follow-up to patch-mindex-localhost-fallbacks.mjs — insert the missing
 * `import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"`
 * line in any file that calls the function but doesn't import it.
 *
 * The earlier patcher had a test that never added the import because the
 * just-replaced symbol was already in the file string. This script guards
 * on the import line literally.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue
      walk(p, out)
    } else if (/\.(ts|tsx)$/.test(name.name)) out.push(p)
  }
  return out
}

const importLine = 'import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"\n'
let patched = 0

for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, "/")
  if (rel === "lib/mindex-base-url.ts") continue
  if (rel.startsWith("scripts/")) continue
  let s = fs.readFileSync(file, "utf8")
  if (!s.includes("resolveMindexServerBaseUrl(")) continue
  if (s.includes('from "@/lib/mindex-base-url"')) continue
  const m = s.match(/^import[^\n]*\n/m)
  if (!m) continue
  const idx = s.indexOf(m[0]) + m[0].length
  s = s.slice(0, idx) + importLine + s.slice(idx)
  fs.writeFileSync(file, s)
  patched++
  console.log("patched", rel)
}
console.log("total patched:", patched)
