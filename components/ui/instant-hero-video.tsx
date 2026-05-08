"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import Image from "next/image"
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { cn } from "@/lib/utils"
import { YoutubeHeroBackground } from "@/components/ui/youtube-hero-background"

interface InstantHeroVideoProps {
  mp4Src: string
  youtubeId?: string
  poster: string
  className?: string
  videoClassName?: string
  posterClassName?: string
  style?: CSSProperties
  nasProbeTimeoutMs?: number
  mp4StartTimeoutMs?: number
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms)
  }
  return undefined
}

function sameOriginAsset(url: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const u = new URL(url, window.location.href)
    return u.origin === window.location.origin && u.pathname.startsWith("/assets/")
  } catch {
    return false
  }
}

export function InstantHeroVideo({
  mp4Src,
  youtubeId,
  poster,
  className,
  videoClassName,
  posterClassName,
  style,
  nasProbeTimeoutMs = 850,
  mp4StartTimeoutMs = 1400,
}: InstantHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [renderer, setRenderer] = useState<"mp4" | "youtube">("mp4")
  const [mp4Ready, setMp4Ready] = useState(false)
  const [youtubeReady, setYoutubeReady] = useState(false)
  const encodedMp4 = encodeAssetUrl(mp4Src)
  const encodedPoster = encodeAssetUrl(poster)

  useEffect(() => {
    setRenderer("mp4")
    setMp4Ready(false)
    setYoutubeReady(false)
  }, [encodedMp4, youtubeId])

  useEffect(() => {
    if (!youtubeId || !encodedMp4 || !sameOriginAsset(encodedMp4)) return
    let cancelled = false
    const signal = timeoutSignal(nasProbeTimeoutMs)

    fetch(encodedMp4, {
      method: "HEAD",
      cache: "no-store",
      signal,
    })
      .then((response) => {
        if (cancelled) return
        const length = response.headers.get("content-length")
        if (!response.ok || length === "0") setRenderer("youtube")
      })
      .catch(() => {
        if (!cancelled) setRenderer("youtube")
      })

    return () => {
      cancelled = true
    }
  }, [encodedMp4, nasProbeTimeoutMs, youtubeId])

  useEffect(() => {
    if (!youtubeId || renderer !== "mp4" || mp4Ready) return
    const timer = window.setTimeout(() => {
      if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        setRenderer("youtube")
      }
    }, mp4StartTimeoutMs)
    return () => window.clearTimeout(timer)
  }, [mp4Ready, mp4StartTimeoutMs, renderer, youtubeId])

  useEffect(() => {
    if (renderer !== "mp4") return
    const video = videoRef.current
    if (!video) return

    const play = () => video.play().catch(() => {})
    play()
    const onTouch = () => play()
    document.addEventListener("touchstart", onTouch, { once: true })
    return () => document.removeEventListener("touchstart", onTouch)
  }, [renderer, encodedMp4])

  const showPoster = renderer === "mp4" ? !mp4Ready : !youtubeReady

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black", className)} style={style}>
      <Image
        src={encodedPoster}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className={cn(
          "absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-500",
          showPoster ? "opacity-100" : "opacity-0",
          posterClassName
        )}
      />

      {renderer === "mp4" ? (
        <video
          key={encodedMp4}
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={encodedPoster}
          controls={false}
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onCanPlay={() => setMp4Ready(true)}
          onPlaying={() => setMp4Ready(true)}
          onError={() => {
            if (youtubeId) setRenderer("youtube")
          }}
          className={cn(
            "absolute inset-0 z-10 h-full w-full object-cover pointer-events-none transition-opacity duration-500",
            mp4Ready ? "opacity-100" : "opacity-0",
            videoClassName
          )}
        >
          <source src={encodedMp4} type="video/mp4" />
        </video>
      ) : youtubeId ? (
        <YoutubeHeroBackground
          videoId={youtubeId}
          onLoad={() => setYoutubeReady(true)}
          className={cn(
            "z-10 transition-opacity duration-500",
            youtubeReady ? "opacity-100" : "opacity-0",
            videoClassName
          )}
        />
      ) : null}
    </div>
  )
}
