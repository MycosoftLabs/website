"use client"

/**
 * Neuromorphic Button component
 * Supports default (raised), primary, success, and loading variants.
 * Date: Feb 18, 2026
 */

import { forwardRef, type ButtonHTMLAttributes } from "react"
import { Loader2 } from "lucide-react"

export type NeuButtonVariant = "default" | "primary" | "success" | "warning" | "error" | "info"

export interface NeuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeuButtonVariant
  isLoading?: boolean
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<NeuButtonVariant, string> = {
  default:
    "neu-raised text-gray-600 dark:text-gray-300",
  primary:
    "text-white bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg",
  success:
    "text-white bg-gradient-to-br from-green-500 to-green-600 shadow-lg",
  warning:
    "text-white bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg",
  error:
    "text-white bg-gradient-to-br from-red-500 to-red-600 shadow-lg",
  info:
    "text-white bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg",
}

export const NeuButton = forwardRef<HTMLButtonElement, NeuButtonProps>(
  (
    {
      variant = "default",
      isLoading = false,
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClass =
      "neu-btn neu-focus py-3 px-6 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
    const variantClass = VARIANT_CLASSES[variant]
    const widthClass = fullWidth ? "w-full" : ""

    return (
      <button
        ref={ref}
        type="button"
        className={`${baseClass} ${variantClass} ${widthClass} ${className}`}
        disabled={disabled ?? isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden />
        ) : null}
        <span>{children}</span>
      </button>
    )
  }
)

NeuButton.displayName = "NeuButton"
