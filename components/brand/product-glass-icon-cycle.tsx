"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Curated Fusarium glass plates for hero/title oscillation.
 * Transparent-exterior only — solid black-canvas JPGs removed from the cycle.
 * Prefer Morgan's custom chrome plate (black canvas punched to alpha) first.
 * Cycle PNGs are cropped so opaque chrome touches bitmap edges.
 */
export const FUSARIUM_GLASS_CYCLE_FRAMES = [
  "/icons/mycosoft/glass/cycle/fusarium/custom-chrome-clear.png",
  "/icons/mycosoft/glass/cycle/fusarium/glass.png",
  "/icons/mycosoft/glass/cycle/fusarium/red.png",
  "/icons/mycosoft/glass/cycle/fusarium/white-clear.png",
  "/icons/mycosoft/glass/cycle/fusarium/frosted-black.png",
  "/icons/mycosoft/glass/cycle/fusarium/coral.png",
  "/icons/mycosoft/glass/cycle/fusarium/custom.png",
  "/icons/mycosoft/glass/cycle/fusarium/clear.png",
  "/icons/mycosoft/glass/cycle/fusarium/coral-dark.png",
  "/icons/mycosoft/glass/cycle/fusarium/frosted-black-alt.png",
  "/icons/mycosoft/glass/cycle/fusarium/custom-red-black.png",
  "/icons/mycosoft/glass/cycle/fusarium/frosted-black-chrome.png",
] as const

/**
 * NatureOS glass plates for hero/title oscillation.
 * Exterior canvas punched to transparent (no black/white square plates).
 * Swap or extend files under public/icons/mycosoft/glass/cycle/natureos/.
 */
export const NATUREOS_GLASS_CYCLE_FRAMES = [
  "/icons/mycosoft/glass/cycle/natureos/light.png",
  "/icons/mycosoft/glass/cycle/natureos/dark.png",
] as const

/**
 * MycoBrain glass plates for device-page title oscillation.
 * Built from glass/light + glass/dark (transparent exterior, cropped to chrome).
 * Extend under public/icons/mycosoft/glass/cycle/mycobrain/ with clear plates only.
 */
export const MYCOBRAIN_GLASS_CYCLE_FRAMES = [
  "/icons/mycosoft/glass/cycle/mycobrain/light.png",
  "/icons/mycosoft/glass/cycle/mycobrain/dark.png",
] as const

/**
 * NLM glass plates for Nature Learning Model hero title oscillation.
 * Built from glass/light + glass/dark (transparent exterior, cropped to chrome).
 * Extend under public/icons/mycosoft/glass/cycle/nlm/ with clear plates only.
 */
export const NLM_GLASS_CYCLE_FRAMES = [
  "/icons/mycosoft/glass/cycle/nlm/light.png",
  "/icons/mycosoft/glass/cycle/nlm/dark.png",
] as const

/**
 * FormSpace glass plates for FormSpace hero title oscillation.
 * Built from glass/light + glass/dark (transparent exterior, cropped to chrome).
 * Extend under public/icons/mycosoft/glass/cycle/formspace/ with clear plates only.
 */
export const FORMSPACE_GLASS_CYCLE_FRAMES = [
  "/icons/mycosoft/glass/cycle/formspace/light.png",
  "/icons/mycosoft/glass/cycle/formspace/dark.png",
] as const

/**
 * MYCA glass plates for /myca hero title oscillation.
 * Built from glass/light + glass/dark (transparent exterior, cropped to chrome).
 * Extend under public/icons/mycosoft/glass/cycle/myca/ with clear plates only.
 */
export const MYCA_GLASS_CYCLE_FRAMES = [
  "/icons/mycosoft/glass/cycle/myca/light.png",
  "/icons/mycosoft/glass/cycle/myca/dark.png",
] as const

export interface ProductGlassIconCycleProps {
  /** Ordered image URLs under /public (absolute site paths). */
  frames: readonly string[]
  /**
   * Optical square size — use `h-[1em] w-[1em]` inside an H1 so the box equals
   * the title font-size (same height as the FUSARIUM text box). Do not use 1cap.
   */
  className?: string
  /** Crossfade dwell per frame. Default 2.5s. */
  intervalMs?: number
  /** Crossfade duration. Default 700ms. */
  fadeMs?: number
  /** Static frame when prefers-reduced-motion (light theme). */
  reducedMotionLightIndex?: number
  /** Static frame when prefers-reduced-motion (dark theme). */
  reducedMotionDarkIndex?: number
  alt?: string
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return reduced
}

function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const read = () => setIsDark(root.classList.contains("dark"))
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

/**
 * Showcase glass product icon that crossfades through variant plates.
 * For page heroes / titles only — nav stays flat monochrome ProductIcon.
 * Images fill the square edge-to-edge (`object-cover` + overflow-hidden).
 */
export function ProductGlassIconCycle({
  frames,
  className,
  intervalMs = 2500,
  fadeMs = 700,
  reducedMotionLightIndex = 2,
  reducedMotionDarkIndex = 1,
  alt = "",
}: ProductGlassIconCycleProps) {
  const reducedMotion = usePrefersReducedMotion()
  const isDark = useIsDarkTheme()
  const [active, setActive] = useState(0)
  const list = frames.filter((src) => typeof src === "string" && src.length > 0)

  useEffect(() => {
    if (reducedMotion || list.length <= 1) return
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % list.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [reducedMotion, list.length, intervalMs])

  if (!list.length) return null

  const staticIndex = Math.min(
    Math.max(0, isDark ? reducedMotionDarkIndex : reducedMotionLightIndex),
    list.length - 1
  )
  const visibleIndex = reducedMotion ? staticIndex : active

  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden aspect-square leading-none",
        className
      )}
      aria-hidden={alt ? undefined : true}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
    >
      {list.map((src, index) => {
        const isActive = index === visibleIndex
        return (
          // eslint-disable-next-line @next/next/no-img-element -- local public cycle plates; alternate frames need simultaneous load
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            decoding="async"
            className={cn(
              "absolute inset-0 block h-full w-full object-cover pointer-events-none",
              isActive ? "opacity-100" : "opacity-0"
            )}
            style={{
              transition: reducedMotion
                ? undefined
                : `opacity ${fadeMs}ms ease-in-out`,
            }}
          />
        )
      })}
    </span>
  )
}
