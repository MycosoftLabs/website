"use client"

import { youtubeHeroEmbedSrc } from "@/lib/hero-youtube"
import { cn } from "@/lib/utils"

interface YoutubeHeroBackgroundProps {
  videoId: string
  className?: string
  onLoad?: () => void
}

/**
 * Background-only YouTube renderer for mirrored hero videos.
 * The iframe is oversized and clipped so native YouTube chrome sits outside
 * the visible viewport, while pointer events stay disabled to prevent controls.
 */
export function YoutubeHeroBackground({
  videoId,
  className,
  onLoad,
}: YoutubeHeroBackgroundProps) {
  if (!videoId) return null

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black pointer-events-none", className)} aria-hidden="true">
      <iframe
        title=""
        aria-hidden="true"
        tabIndex={-1}
        src={youtubeHeroEmbedSrc(videoId)}
        loading="eager"
        onLoad={onLoad}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute left-1/2 top-1/2 border-0 pointer-events-none"
        style={{
          width: "max(142vw, 252vh)",
          height: "max(80vw, 142vh)",
          transform: "translate3d(-50%, -50%, 0)",
        }}
      />
    </div>
  )
}
