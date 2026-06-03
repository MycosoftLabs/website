import path from "node:path"

export function getCrepRuntimeCacheDir() {
  const configured = process.env.CREP_RUNTIME_CACHE_DIR
  if (configured?.trim()) return path.resolve(configured)

  if (process.env.NODE_ENV === "development") {
    const base = process.env.LOCALAPPDATA || process.env.TEMP || path.resolve(process.cwd(), "..")
    return path.join(base, "Mycosoft", "website-runtime-cache")
  }

  return path.resolve(process.cwd(), "var", "cache")
}
