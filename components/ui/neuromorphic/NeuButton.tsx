"use client"

/**
 * Neuromorphic Button component
 * Supports default (raised), primary, success, and loading variants.
 * Date: Feb 18, 2026
 */

import { forwardRef, type ButtonHTMLAttributes } from "react"
import { Loader2 } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"

export type NeuButtonVariant = "default" | "primary" | "success" | "warning" | "error" | "info"

export interface NeuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeuButtonVariant
  isLoading?: boolean
  fullWidth?: boolean
  asChild?: boolean
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
      asChild = false,
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
    const Comp: any = asChild ? Slot : "button"

    const buttonProps: Record<string, unknown> = {
      ref,
      className: `${baseClass} ${variantClass} ${widthClass} ${className}`,
      ...props,
    }
    if (!asChild) {
      // Default to "button" so a NeuButton dropped inside a form does not
      // submit it by accident — but let a caller opt into type="submit".
      // This used to be an unconditional assignment placed AFTER the props
      // spread, which silently overrode any type the caller passed: every
      // NeuButton inside a <form> was a dead button that could not submit.
      buttonProps.type = (props as { type?: string }).type ?? "button"
      buttonProps.disabled = disabled ?? isLoading
    }

    if (asChild) {
      return <Comp {...buttonProps}>{children}</Comp>
    }

    return (
      <Comp {...buttonProps}>
        {isLoading ? (
          <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden />
        ) : null}
        {/* inline-flex, not a plain inline span: Tailwind preflight sets
            `svg { display: block }`, so an icon passed as a child became a
            block box on its own line inside an inline span (label on line 1,
            arrow on line 2) even with white-space:nowrap. No `gap` here —
            call sites already space their icons with ml-2/mr-2. */}
        <span className="inline-flex items-center">{children}</span>
      </Comp>
    )
  }
)

NeuButton.displayName = "NeuButton"
