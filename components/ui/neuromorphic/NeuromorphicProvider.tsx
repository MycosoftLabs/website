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
}

export function NeuromorphicProvider({
  children,
  className = "",
  forceDark,
}: NeuromorphicProviderProps) {
  const { resolvedTheme } = useTheme()
  const isDark = forceDark ?? resolvedTheme === "dark"
  const wrapperClass = `neuromorphic-page ${isDark ? "neuromorphic-dark" : ""} ${className}`

  return <div className={wrapperClass}>{children}</div>
}
