/**
 * Build ordered MP4 URL lists for NAS-mounted assets: try `name-web.mp4` before `name.mp4`
 * so production can serve smaller encodes while keeping full files as fallback.
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
      if (u && !seen.has(u)) {
        seen.add(u)
        out.push(u)
      }
    }
  }
  return out
}
