"use client"

/**
 * Neuromorphic Badge component
 * Supports default, primary, success, warning, error, info variants.
 * Date: Feb 18, 2026
 */

import { type ReactNode } from "react"

export type NeuBadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"

export interface NeuBadgeProps {
  variant?: NeuBadgeVariant
  children: ReactNode
  icon?: ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<NeuBadgeVariant, string> = {
  default: "text-gray-600 dark:text-gray-300 neu-raised-sm",
  primary:
    "text-white bg-gradient-to-br from-purple-600 to-purple-700 shadow-md",
  success:
    "text-white bg-gradient-to-br from-green-500 to-green-600 shadow-md",
  warning:
    "text-white bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-md",
  error:
    "text-white bg-gradient-to-br from-red-500 to-red-600 shadow-md",
  info:
    "text-white bg-gradient-to-br from-blue-500 to-blue-600 shadow-md",
}

export function NeuBadge({
  variant = "default",
  children,
  icon,
  className = "",
}: NeuBadgeProps) {
  const baseClass = "px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5"
  const variantClass = VARIANT_CLASSES[variant]

  return (
    <span className={`${baseClass} ${variantClass} ${className}`}>
      {icon}
      {children}
    </span>
  )
}
