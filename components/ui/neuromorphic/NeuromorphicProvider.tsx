"use client"

/**
 * NeuromorphicProvider – wraps children with neuromorphic theme
 * Dark/light follows the same signal as Tailwind: `class="dark"` on <html>.
 * (next-themes `resolvedTheme` stays undefined until hydration and was forcing
 * `neuromorphic-dark` + dark-only CSS on marketing pages in "light" mode.)
 * Date: Feb 18, 2026 · Updated Apr 06, 2026
 */

import { type ReactNode, useSyncExternalStore } from "react"
import "./neuromorphic-styles.css"

function subscribeHtmlDarkClass(onStoreChange: () => void) {
  const root = document.documentElement
  const observer = new MutationObserver(() => onStoreChange())
  observer.observe(root, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

function getSnapshotHtmlIsDark(): boolean {
  return document.documentElement.classList.contains("dark")
}

export interface NeuromorphicProviderProps {
  children: ReactNode
  className?: string
  /** Optional: force dark mode regardless of <html> class */
  forceDark?: boolean
  /**
   * @deprecated No longer used — theme follows <html class="dark">.
   * Kept for API compatibility with older call sites.
   */
  ssrFallback?: "light" | "dark"
}

export function NeuromorphicProvider({
  children,
  className = "",
  forceDark,
  ssrFallback: _ssrFallback,
}: NeuromorphicProviderProps) {
  const domDark = useSyncExternalStore(
    subscribeHtmlDarkClass,
    getSnapshotHtmlIsDark,
    () => false
  )
  const isDark = forceDark ?? domDark
  const wrapperClass = `neuromorphic-page ${isDark ? "neuromorphic-dark" : ""} ${className}`.trim()

  return (
    <div className={`${wrapperClass} w-full min-h-full`} suppressHydrationWarning>
      {children}
    </div>
  )
}
