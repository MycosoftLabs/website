/**
 * Build ordered MP4 URL lists for NAS-mounted assets.
 *
 * Keep the canonical source first to guarantee playback when optional `-web`
 * variants are missing or stale on NAS; browsers can still try `-web` as a
 * secondary source.
 */

export function webVariantPath(canonicalMp4Path: string): string {
  if (!canonicalMp4Path.endsWith(".mp4")) return canonicalMp4Path
  if (canonicalMp4Path.endsWith("-web.mp4")) return canonicalMp4Path
  return `${canonicalMp4Path.slice(0, -4)}-web.mp4`
}

export function assetMp4Sources(canonicalPath: string): string[] {
  const web = webVariantPath(canonicalPath)
  if (web === canonicalPath) return [canonicalPath]
  return [canonicalPath, web]
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

/** Known-good NAS clips when a hero/canonical file is 0 bytes or missing */
export const NAS_HD_FALLBACK_MP4 = "/assets/mushroom1/mushroom 1 walking.mp4"
export const NAS_SECONDARY_FALLBACK_MP4 = "/assets/mushroom1/waterfall 1.mp4"

/** Append HD fallbacks after primary `-web` chains so empty/missing originals still play */
export function mergeWithNasFallbacks(...primaryGroups: string[][]): string[] {
  return mergeVideoSources(
    ...primaryGroups,
    assetMp4Sources(NAS_HD_FALLBACK_MP4),
    assetMp4Sources(NAS_SECONDARY_FALLBACK_MP4)
  )
}
