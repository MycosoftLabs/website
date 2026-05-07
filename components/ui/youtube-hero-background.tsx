"use client"

interface YoutubeHeroBackgroundProps {
  videoId: string
  className?: string
}

/**
 * Disabled for hero sections.
 *
 * A YouTube iframe can still expose YouTube UI/branding from inside the
 * cross-origin player, even when controls are requested off. Hero videos must
 * render from first-party MP4/CDN sources so there is no visible YouTube chrome.
 */
export function YoutubeHeroBackground({ videoId, className }: YoutubeHeroBackgroundProps) {
  void videoId
  void className
  return null
}
