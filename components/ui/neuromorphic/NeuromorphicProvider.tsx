"use client"

/**
 * NeuromorphicProvider – wraps children with neuromorphic theme
 * Integrates with next-themes for dark/light mode.
 * Date: Feb 18, 2026
 */

import { useTheme } from "next-themes"
import { type ReactNode } from "react"
import "./neuromorphic-styles.css"

export interface NeuromorphicProviderProps {
  children: ReactNode
  className?: string
  /** Optional: force dark mode regardless of theme */
  forceDark?: boolean
  /** When resolvedTheme is undefined (SSR/hydration), assume this. Must match layout defaultTheme. */
  ssrFallback?: "light" | "dark"
}

export function NeuromorphicProvider({
  children,
  className = "",
  forceDark,
  ssrFallback = "dark",
}: NeuromorphicProviderProps) {
  const { resolvedTheme } = useTheme()
  // During SSR/hydration, resolvedTheme is undefined. Default to dark to match layout defaultTheme and avoid flash.
  const isDark = forceDark ?? (resolvedTheme === undefined ? ssrFallback === "dark" : resolvedTheme === "dark")
  const wrapperClass = `neuromorphic-page ${isDark ? "neuromorphic-dark" : ""} ${className}`.trim()

  return (
    <div className={wrapperClass} suppressHydrationWarning>
      {children}
    </div>
  )
}
