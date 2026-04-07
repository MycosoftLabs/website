"use client"

import { useLayoutEffect } from "react"
import { useTheme } from "next-themes"

const THEME_COLOR_DARK = "#0a0a0a"
const THEME_COLOR_LIGHT = "#ffffff"

/**
 * Keeps <meta name="theme-color"> in sync with next-themes resolved appearance.
 * Root layout viewport uses prefers-color-scheme only; that disagrees when the user
 * picks light/dark explicitly or when system and stored theme differ.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    if (resolvedTheme === "light") root.style.colorScheme = "light"
    else if (resolvedTheme === "dark") root.style.colorScheme = "dark"
    else root.style.removeProperty("color-scheme")

    const color = resolvedTheme === "light" ? THEME_COLOR_LIGHT : THEME_COLOR_DARK
    document.querySelectorAll('meta[name="theme-color"]').forEach((n) => n.remove())
    const meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    meta.setAttribute("content", color)
    document.head.appendChild(meta)
  }, [resolvedTheme])

  return null
}
