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

function orderedHomeHeroCanonicalPaths(): string[] {
  const env = process.env.NEXT_PUBLIC_HOME_HERO_MP4?.trim()
  const defaults = [
    "/assets/homepage/Mycosoft Background.mp4",
    "/assets/homepage/MycosoftBackground.mp4",
    "/assets/homepage/mycosoft-background.mp4",
    "/assets/homepage/hero.mp4",
  ]
  const out: string[] = []
  const seen = new Set<string>()
  const add = (p: string) => {
    if (!p || !p.startsWith("/")) return
    if (seen.has(p)) return
    seen.add(p)
    out.push(p)
  }
  if (env) add(env)
  for (const p of defaults) add(p)
  return out
}

/**
 * Homepage hero: `NEXT_PUBLIC_HOME_HERO_MP4` first (exact NAS filename), then common aliases.
 * Appends known-good NAS clips last so a 0-byte or missing homepage file still plays real video.
 */
export function homeHeroVideoSources(): string[] {
  const primary = mergeMp4SourceGroups(...orderedHomeHeroCanonicalPaths())
  if (process.env.NEXT_PUBLIC_VIDEO_ALLOW_MUSHROOM_FALLBACK === "false") {
    return primary
  }
  return mergeWithNasFallbacks([primary])
}

/**
 * Device page hero: optional `NEXT_PUBLIC_HYPHAE_HERO_MP4`, then `defaultCanonical`
 * (typically `hero.mp4` on NAS), then alternate filename. Same mushroom fallback flag as homepage.
 */
export function hyphaeHeroVideoSources(defaultCanonical: string): string[] {
  const env = process.env.NEXT_PUBLIC_HYPHAE_HERO_MP4?.trim()
  const paths: string[] = []
  const seen = new Set<string>()
  const add = (p: string) => {
    if (!p || !p.startsWith("/")) return
    if (seen.has(p)) return
    seen.add(p)
    paths.push(p)
  }
  if (env) add(env)
  add(defaultCanonical)
  add("/assets/hyphae1/Hyphae 1 Hero.mp4")
  add("/assets/hyphae1/hero.mp4")
  const primary = mergeMp4SourceGroups(...paths)
  if (process.env.NEXT_PUBLIC_VIDEO_ALLOW_MUSHROOM_FALLBACK === "false") {
    return primary
  }
  return mergeWithNasFallbacks([primary])
}

/** Known-good NAS clips when a hero/canonical file is 0 bytes or missing */
export const NAS_HD_FALLBACK_MP4 = "/assets/mushroom1/mushroom 1 walking.mp4"
export const NAS_SECONDARY_FALLBACK_MP4 = "/assets/mushroom1/waterfall 1.mp4"

/**
 * Append Mushroom1 “known-good” clips after primaries when empty/missing files should still show video.
 * Opt out with `NEXT_PUBLIC_VIDEO_ALLOW_MUSHROOM_FALLBACK=false`.
 */
export function mergeWithNasFallbacks(...primaryGroups: string[][]): string[] {
  return mergeVideoSources(
    ...primaryGroups,
    assetMp4Sources(NAS_HD_FALLBACK_MP4),
    assetMp4Sources(NAS_SECONDARY_FALLBACK_MP4)
  )
}
