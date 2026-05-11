"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import Image from "next/image"
import { encodeAssetUrl } from "@/lib/encode-asset-url"
import { cn } from "@/lib/utils"

interface InstantHeroVideoProps {
  mp4Src: string
  youtubeId?: string
  poster: string
  className?: string
  videoClassName?: string
  posterClassName?: string
  style?: CSSProperties
  youtubeIframeStyle?: CSSProperties
  showPoster?: boolean
  nasProbeTimeoutMs?: number
  mp4StartTimeoutMs?: number
}

export function InstantHeroVideo({
  mp4Src,
  youtubeId: _youtubeId,
  poster,
  className,
  videoClassName,
  posterClassName,
  style,
  youtubeIframeStyle: _youtubeIframeStyle,
  showPoster: shouldShowPoster = true,
  nasProbeTimeoutMs: _nasProbeTimeoutMs = 850,
  mp4StartTimeoutMs: _mp4StartTimeoutMs = 1400,
}: InstantHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mp4Ready, setMp4Ready] = useState(false)
  const encodedMp4 = encodeAssetUrl(mp4Src)
  const encodedPoster = encodeAssetUrl(poster)

  useEffect(() => {
    setMp4Ready(false)
  }, [encodedMp4])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const play = () => video.play().catch(() => {})
    play()
    const onTouch = () => play()
    document.addEventListener("touchstart", onTouch, { once: true })
    return () => document.removeEventListener("touchstart", onTouch)
  }, [encodedMp4])

  const showPoster = shouldShowPoster && !mp4Ready
  const mp4Visible = !shouldShowPoster || mp4Ready

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
          className={cn(
            "absolute inset-0 z-10 h-full w-full object-cover pointer-events-none transition-opacity duration-500",
            mp4Visible ? "opacity-100" : "opacity-0",
            videoClassName
          )}
        >
          <source src={encodedMp4} type="video/mp4" />
      </video>
    </div>
  )
}
