/**
 * YouTube hero backgrounds — video IDs from https://www.youtube.com/@Mycosoft
 * Set NEXT_PUBLIC_* env vars (11-char id or full watch/embed URL).
 */

const YOUTUBE_ID = /^[\w-]{11}$/

export function normalizeYoutubeVideoId(input: string | undefined | null): string | null {
  if (!input?.trim()) return null
  const s = input.trim()
  if (YOUTUBE_ID.test(s)) return s
  try {
    const u = s.includes("://") ? new URL(s) : new URL(`https://${s}`)
    if (u.hostname.replace(/^www\./, "") === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]
      return YOUTUBE_ID.test(id) ? id : null
    }
    const v = u.searchParams.get("v")
    if (v && YOUTUBE_ID.test(v)) return v
    const embed = u.pathname.match(/\/embed\/([\w-]{11})/)
    if (embed?.[1]) return embed[1]
    const shorts = u.pathname.match(/\/shorts\/([\w-]{11})/)
    if (shorts?.[1]) return shorts[1]
  } catch {
    /* ignore */
  }
  return null
}

/** iframe embed URL (nocookie host, muted autoplay loop). */
export function youtubeHeroEmbedSrc(videoId: string, useNoCookie = true): string {
  const origin = useNoCookie ? "https://www.youtube-nocookie.com" : "https://www.youtube.com"
  const q = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: videoId,
    controls: "0",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
    enablejsapi: "0",
    fs: "0",
    disablekb: "1",
  })
  return `${origin}/embed/${videoId}?${q.toString()}`
}

export function youtubeHeroThumbnailUrl(videoId: string, quality: "maxresdefault" | "hqdefault" = "hqdefault"): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`
}

export function homeHeroYoutubeId(): string | null {
  return normalizeYoutubeVideoId(process.env.NEXT_PUBLIC_HOME_HERO_YOUTUBE_ID)
}

export function devicesPortalHeroYoutubeId(): string | null {
  return normalizeYoutubeVideoId(process.env.NEXT_PUBLIC_DEVICES_HERO_YOUTUBE_ID)
}
