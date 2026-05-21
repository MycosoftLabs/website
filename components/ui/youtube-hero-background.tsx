"use client"

import type { CSSProperties } from "react"
import { youtubeHeroEmbedSrc } from "@/lib/hero-youtube"
import { cn } from "@/lib/utils"

interface YoutubeHeroBackgroundProps {
  videoId: string
  className?: string
  style?: CSSProperties
  iframeStyle?: CSSProperties
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
  style,
  iframeStyle,
  onLoad,
}: YoutubeHeroBackgroundProps) {
  if (!videoId) return null

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden bg-black pointer-events-none", className)}
      style={style}
      aria-hidden="true"
    >
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
          width: "max(160vw, 284vh)",
          height: "max(90vw, 160vh)",
          transform: "translate3d(-50%, -50%, 0)",
          ...iframeStyle,
        }}
      />
    </div>
  )
}
