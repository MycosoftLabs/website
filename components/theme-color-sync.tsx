"use client"

import { useLayoutEffect } from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"

const THEME_COLOR_DARK = "#0a0a0a"
const THEME_COLOR_LIGHT = "#ffffff"

/**
 * Keeps <meta name="theme-color"> in sync with next-themes resolved appearance.
 * Root layout viewport uses prefers-color-scheme only; that disagrees when the user
 * picks light/dark explicitly or when system and stored theme differ.
 *
 * This updates the tag in place and never removes one. That is not a style
 * preference — it is the whole point of the file.
 *
 * The root layout exports `viewport.themeColor`, so React owns that <meta> as a
 * hoistable and keeps a fiber pointing straight at the node. Removing it left
 * that fiber holding a detached element, and the next route transition ran
 * `stateNode.parentNode.removeChild(stateNode)` against a null parent. That
 * throws inside commitDeletionEffectsOnFiber, which aborts the commit, which
 * kills the navigation — the URL changed while the previous page stayed on
 * screen. Because this component lives in the root layout, that broke every
 * link on the site, and the only reason pages appeared to work was the
 * full-page-reload fallback in navigation-click-rescue papering over it.
 *
 * Mutating `content` gets the same result and leaves React's DOM ownership
 * intact. Re-running on pathname keeps the colour correct when React recreates
 * its metadata for a new route.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()
  const pathname = usePathname()

  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    if (resolvedTheme === "light") root.style.colorScheme = "light"
    else if (resolvedTheme === "dark") root.style.colorScheme = "dark"
    else root.style.removeProperty("color-scheme")

    const color = resolvedTheme === "light" ? THEME_COLOR_LIGHT : THEME_COLOR_DARK
    const existing = document.querySelectorAll('meta[name="theme-color"]')
    if (existing.length > 0) {
      // Includes any React put there. Setting content is safe; detaching is not.
      existing.forEach((n) => n.setAttribute("content", color))
      return
    }
    const meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    meta.setAttribute("content", color)
    document.head.appendChild(meta)
  }, [resolvedTheme, pathname])

  return null
}
