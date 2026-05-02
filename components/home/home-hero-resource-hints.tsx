import { primaryHomeHeroPosterPath } from "@/lib/asset-video-sources"
import { encodeAssetUrl } from "@/lib/encode-asset-url"

/**
 * Preload only the hero still image. We intentionally do **not** `<link rel="preload">`
 * the full-screen MP4: it is hundreds of MB and competes with Next.js RSC requests during
 * client navigations (causing lag and first-click failures from the homepage).
 * The `<video>` element still loads the file in parallel with normal priority.
 */
export function HomeHeroResourceHints() {
  const posterHref = encodeAssetUrl(primaryHomeHeroPosterPath())
  return posterHref ? (
    <link rel="preload" href={posterHref} as="image" fetchPriority="high" />
  ) : null
}
