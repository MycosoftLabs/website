/**
 * One-shot: replace MINDEX || "http://localhost:8000" patterns with resolveMindexServerBaseUrl().
 * Run: node scripts/patch-mindex-localhost-fallbacks.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const skip = new Set([
  "lib/mindex-base-url.ts",
  "scripts/patch-mindex-localhost-fallbacks.mjs",
])

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

const patterns = [
  [
    /const MINDEX_API_URL = process\.env\.MINDEX_API_URL \|\| "http:\/\/localhost:8000"/g,
    'const MINDEX_API_URL = resolveMindexServerBaseUrl()',
  ],
  [
    /const MINDEX_API = process\.env\.MINDEX_API_URL \|\| "http:\/\/localhost:8000"/g,
    'const MINDEX_API = resolveMindexServerBaseUrl()',
  ],
  [
    /const MINDEX_BASE = process\.env\.MINDEX_API_URL \|\| "http:\/\/localhost:8000"/g,
    'const MINDEX_BASE = resolveMindexServerBaseUrl()',
  ],
  [
    /const MINDEX = process\.env\.MINDEX_API_URL \|\| "http:\/\/localhost:8000"/g,
    'const MINDEX = resolveMindexServerBaseUrl()',
  ],
  [
    /const MINDEX_API_URL = process\.env\.MINDEX_API_BASE_URL \|\| "http:\/\/localhost:8000"/g,
    'const MINDEX_API_URL = resolveMindexServerBaseUrl()',
  ],
  [
    /const MINDEX_API_URL = process\.env\.MINDEX_API_URL \|\| process\.env\.MINDEX_API_BASE_URL \|\| "http:\/\/localhost:8000"/g,
    'const MINDEX_API_URL = resolveMindexServerBaseUrl()',
  ],
]

const importLine = 'import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"\n'

function rel(p) {
  return path.relative(root, p).replace(/\\/g, "/")
}

let n = 0
for (const file of walk(root)) {
  const r = rel(file)
  if (skip.has(r)) continue
  let s = fs.readFileSync(file, "utf8")
  if (!s.includes("localhost:8000")) continue
  // Only MINDEX-related lines (not MAS hook)
  if (r.includes("useAgentMemory")) continue
  let changed = false
  for (const [re, rep] of patterns) {
    const next = s.replace(re, rep)
    if (next !== s) {
      s = next
      changed = true
    }
  }
  if (!changed) continue
  if (!s.includes("resolveMindexServerBaseUrl")) {
    // insert after first import block
    const firstImport = s.indexOf("import ")
    if (firstImport === -1) continue
    const lineEnd = s.indexOf("\n", firstImport)
    s = s.slice(0, lineEnd + 1) + importLine + s.slice(lineEnd + 1)
  }
  fs.writeFileSync(file, s)
  n++
  console.log("patched", r)
}
console.log("done", n, "files")
