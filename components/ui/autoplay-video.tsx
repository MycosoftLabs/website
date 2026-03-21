"use client"

/**
 * AutoplayVideo - Hero/background videos that start instantly, no poster flash.
 * No poster, preload=auto, programmatic play for iOS. Use for hero sections.
 * Created: Feb 10, 2026
 */
import { useRef, useEffect, type CSSProperties } from "react"

interface AutoplayVideoProps {
  src: string
  className?: string
  style?: CSSProperties
  /** Encode URL (for paths with spaces). Default true for /assets/ paths */
  encodeSrc?: boolean
}

export function AutoplayVideo({ src, className = "", style, encodeSrc = true }: AutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isDev = process.env.NODE_ENV === "development"
  const resolvedSrc = isDev && src.startsWith("/assets/") ? `https://mycosoft.com${src}` : src
  const safeSrc = encodeSrc ? encodeURI(resolvedSrc) : resolvedSrc

  useEffect(() => {
    const v = videoRef.current
    if (v) {
      v.play().catch(() => {})
      const handler = () => v.play().catch(() => {})
      document.addEventListener("touchstart", handler, { once: true })
      return () => document.removeEventListener("touchstart", handler)
    }
  }, [safeSrc])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className={className}
      style={style}
    >
      <source src={safeSrc} type="video/mp4" />
    </video>
  )
}
