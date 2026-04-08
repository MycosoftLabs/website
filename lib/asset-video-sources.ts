/**
 * Build ordered MP4 URL lists for NAS-mounted assets.
 *
 * Prefer `-web` first when present for faster start-to-play; fall back to the
 * full file if the smaller variant is missing on NAS.
 */

export function webVariantPath(canonicalMp4Path: string): string {
  if (!canonicalMp4Path.endsWith(".mp4")) return canonicalMp4Path
  if (canonicalMp4Path.endsWith("-web.mp4")) return canonicalMp4Path
  return `${canonicalMp4Path.slice(0, -4)}-web.mp4`
}

export function assetMp4Sources(canonicalPath: string): string[] {
  const web = webVariantPath(canonicalPath)
  if (web === canonicalPath) return [canonicalPath]
  return [web, canonicalPath]
}

export function mergeVideoSources(...groups: (string[] | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const g of groups) {
    if (!g) continue
    for (const u of g) {
      if (typeof u !== "string" || !u || seen.has(u)) continue
      seen.add(u)
      out.push(u)
    }
  }
  return out
}

/** One canonical path → [path-web, path] merged with other paths in order. */
export function mergeMp4SourceGroups(...canonicalPaths: string[]): string[] {
  if (!canonicalPaths.length) return []
  return mergeVideoSources(...canonicalPaths.map((p) => assetMp4Sources(p)))
}
