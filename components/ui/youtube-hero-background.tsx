"use client"

import { cn } from "@/lib/utils"
import { youtubeHeroEmbedSrc } from "@/lib/hero-youtube"

interface YoutubeHeroBackgroundProps {
  videoId: string
  className?: string
}

/**
 * Full-viewport muted looping YouTube embed (Privacy Enhanced / nocookie).
 * Parent should add gradient overlays; keep pointer-events-none on wrapper.
 */
export function YoutubeHeroBackground({ videoId, className }: YoutubeHeroBackgroundProps) {
  const src = youtubeHeroEmbedSrc(videoId, true)
  return (
    <iframe
      title="Background video"
      src={src}
      allow="autoplay; encrypted-media; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      loading="eager"
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 border-0",
        "h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2",
        className
      )}
    />
  )
}
