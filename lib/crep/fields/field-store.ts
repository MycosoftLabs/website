import { existsSync, readdirSync } from "fs"
import path from "path"

/** Same-origin bake the view plane already knows how to request. */
export const PUBLIC_FIELD_URL_PREFIX = "/assets/fields"

const FIELD_FILE_NAME = /^[A-Za-z0-9._-]+$/

export function configuredHttpBase(): string {
  return (process.env.ARRAYLAKE_FIELD_BASE || "").replace(/\/+$/, "")
}

export function configuredOutDir(): string {
  return (process.env.ARRAYLAKE_FIELD_OUT || "").replace(/[\\/]+$/, "")
}

/** Candidate bake directories. First dir with actual cubes wins. No secrets. */
export function candidateFieldDirs(cwd = process.cwd()): string[] {
  const out = configuredOutDir()
  const dirs = [
    out ? path.resolve(cwd, out) : "",
    path.join(cwd, "public", "assets", "fields"),
    path.join(cwd, "public", "data", "fields"),
    path.resolve(cwd, "..", "website", "public", "assets", "fields"),
    path.resolve(cwd, "..", "..", "website", "public", "assets", "fields"),
    "/opt/mycosoft/media/website/assets/fields",
  ]
  return [...new Set(dirs.filter((dir) => Boolean(dir)))]
}

function dirHasFieldCubes(dir: string): boolean {
  try {
    return readdirSync(dir).some((name) => {
      if (name.startsWith(".")) return false
      return existsSync(path.join(dir, name))
    })
  } catch {
    return false
  }
}

export function findLocalFieldStore(cwd = process.cwd()): string | null {
  for (const dir of candidateFieldDirs(cwd)) {
    if (existsSync(dir) && dirHasFieldCubes(dir)) return dir
  }
  return null
}

export function fieldStoreBound(cwd = process.cwd()): {
  httpBase: string
  localDir: string | null
  bound: boolean
} {
  const httpBase = configuredHttpBase()
  const localDir = findLocalFieldStore(cwd)
  return { httpBase, localDir, bound: Boolean(httpBase || localDir) }
}

export function safeFieldFileName(name: string): string | null {
  const base = name.replace(/^\/+/, "").split(/[\\/]/).pop() || ""
  if (!FIELD_FILE_NAME.test(base) || base === "." || base === "..") return null
  return base
}

/** Frame URLs go through the bound BFF so live/3010 do not depend on a static mount. */
export function fieldFrameBffUrl(dataset: string, variable: string, rel: string): string {
  if (/^https?:\/\//i.test(rel)) return rel
  const file = safeFieldFileName(rel)
  if (!file) return rel
  return `/api/crep/field/${encodeURIComponent(dataset)}/${encodeURIComponent(variable)}/${encodeURIComponent(file)}`
}
