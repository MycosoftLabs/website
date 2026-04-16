/**
 * Build ordered MP4 URL lists for NAS-mounted assets.
 *
 * Prefer `-web` first when present for faster start-to-play; fall back to the
 * full file if the smaller variant is missing on NAS.
 *
 * Asset policy:
 * - Large hero/device videos should resolve from `/assets/...` so production
 *   can serve them from the NAS bind mount.
 * - Small UI images can remain local repo assets or remote CDN images.
 * - Helper functions here should keep route URLs stable while allowing NAS
 *   filename aliases.
 *
 * NO FALLBACK VIDEOS — each page plays its intended video or nothing.
 * The mushroom/waterfall NAS fallbacks were removed per site-wide policy:
 * a missing homepage video must never render as a walking mushroom.
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
 * NO mushroom/waterfall fallback — only the homepage's own video plays here.
 */
export function homeHeroVideoSources(): string[] {
  return mergeMp4SourceGroups(...orderedHomeHeroCanonicalPaths())
}

interface DeviceHeroVideoOptions {
  envUrl?: string
  aliases?: string[]
  /** @deprecated kept for call-site compatibility; ignored. No fallback videos anywhere. */
  allowMushroomFallback?: boolean
}

/**
 * Generic NAS-first hero source builder for device pages.
 * Only returns the page's own canonical paths — never the mushroom fallback.
 */
export function deviceHeroVideoSources(
  defaultCanonical: string,
  options: DeviceHeroVideoOptions = {}
): string[] {
  const paths: string[] = []
  const seen = new Set<string>()
  const add = (p?: string) => {
    if (!p || !p.startsWith("/")) return
    if (seen.has(p)) return
    seen.add(p)
    paths.push(p)
  }

  add(options.envUrl?.trim())
  add(defaultCanonical)
  for (const alias of options.aliases || []) add(alias)

  return mergeMp4SourceGroups(...paths)
}

/**
 * Device page hero: optional `NEXT_PUBLIC_HYPHAE_HERO_MP4`, then `defaultCanonical`
 * (typically `hero.mp4` on NAS), then alternate filename. NO mushroom fallback.
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
  return mergeMp4SourceGroups(...paths)
}

/**
 * @deprecated No fallback videos anywhere on the site. Kept as a pass-through
 * for legacy call-sites that flatten multiple source groups into one list.
 * Returns the merged primary sources WITHOUT appending any fallback clips.
 */
export function mergeWithNasFallbacks(...primaryGroups: string[][]): string[] {
  return mergeVideoSources(...primaryGroups)
}
