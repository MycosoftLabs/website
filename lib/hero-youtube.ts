/**
 * YouTube hero backgrounds — https://www.youtube.com/@Mycosoft
 * Set NEXT_PUBLIC_* to override (11-char id or full watch/embed URL).
 */

const YOUTUBE_ID = /^[\w-]{11}$/

/** Canonical marketing heroes on the public channel (env overrides per key). */
export const PLATFORM_DEFAULT_HERO_YOUTUBE = {
  home: "6lrvQIfRazs",
  hyphae1: "SUcga8cMXbw",
  sporebase: "Gc3FUxi6Q1k",
  about: "Z5pC9lEceKM",
} as const

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

/** Parent origin for embed `origin=` — reduces some player chrome / cross-origin quirks when set. */
function youtubeEmbedParentOrigin(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!raw) return undefined
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`)
    return u.origin
  } catch {
    return undefined
  }
}

/**
 * iframe embed URL (nocookie host, muted autoplay loop).
 * Best-effort to limit intrusions: no controls, no kb, no fullscreen param, captions off,
 * `rel=0` (related from same channel only), optional `origin` when public site URL is set.
 * YouTube may still show some end-screen UI; we cannot fully disable it in iframe-only mode.
 */
export function youtubeHeroEmbedSrc(videoId: string, useNoCookie = true): string {
  const host = useNoCookie ? "https://www.youtube-nocookie.com" : "https://www.youtube.com"
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
    cc_load_policy: "0",
    enablejsapi: "0",
    fs: "0",
    disablekb: "1",
  })
  const parent = youtubeEmbedParentOrigin()
  if (parent) q.set("origin", parent)
  return `${host}/embed/${videoId}?${q.toString()}`
}

export function youtubeHeroThumbnailUrl(videoId: string, quality: "maxresdefault" | "hqdefault" = "hqdefault"): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`
}

export function homeHeroYoutubeId(): string {
  return (
    normalizeYoutubeVideoId(process.env.NEXT_PUBLIC_HOME_HERO_YOUTUBE_ID) ??
    PLATFORM_DEFAULT_HERO_YOUTUBE.home
  )
}

export function hyphae1HeroYoutubeId(): string {
  return (
    normalizeYoutubeVideoId(process.env.NEXT_PUBLIC_HYPHAE1_HERO_YOUTUBE_ID) ??
    PLATFORM_DEFAULT_HERO_YOUTUBE.hyphae1
  )
}

export function sporebaseHeroYoutubeId(): string {
  return (
    normalizeYoutubeVideoId(process.env.NEXT_PUBLIC_SPOREBASE_HERO_YOUTUBE_ID) ??
    PLATFORM_DEFAULT_HERO_YOUTUBE.sporebase
  )
}

export function aboutHeroYoutubeId(): string {
  return (
    normalizeYoutubeVideoId(process.env.NEXT_PUBLIC_ABOUT_HERO_YOUTUBE_ID) ??
    PLATFORM_DEFAULT_HERO_YOUTUBE.about
  )
}

export function devicesPortalHeroYoutubeId(): string | null {
  return normalizeYoutubeVideoId(process.env.NEXT_PUBLIC_DEVICES_HERO_YOUTUBE_ID)
}
