"use client"

/**
 * Neuromorphic Toggle / Switch component
 * Accessible switch with neuromorphic styling.
 * Date: Feb 18, 2026
 */

import { type ButtonHTMLAttributes } from "react"
import { Check } from "lucide-react"

export interface NeuToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean
  onChange?: (checked: boolean) => void
  label?: string
  id?: string
}

export function NeuToggle({
  checked,
  onChange,
  label,
  id = "neu-toggle",
  disabled,
  className = "",
  ...props
}: NeuToggleProps) {
  return (
    <div className="flex items-center justify-between">
      {label && (
        <label
          htmlFor={id}
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`neu-focus w-14 h-8 rounded-full relative transition-all ${checked ? "bg-gradient-to-br from-purple-600 to-purple-700" : "neu-inset"} ${className}`}
        {...props}
      >
        <span
          className="absolute top-1 w-6 h-6 rounded-full transition-all duration-300 neu-raised"
          style={{ left: checked ? "calc(100% - 28px)" : "4px" }}
          aria-hidden
        />
      </button>
    </div>
  )
}

export interface NeuCheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean
  onChange?: (checked: boolean) => void
  label?: string
  id?: string
}

export function NeuCheckbox({
  checked,
  onChange,
  label,
  id = "neu-checkbox",
  disabled,
  className = "",
  ...props
}: NeuCheckboxProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`neu-focus w-6 h-6 rounded-lg flex items-center justify-center transition-all ${checked ? "bg-gradient-to-br from-purple-600 to-purple-700" : "neu-inset"} ${className}`}
        {...props}
      >
        <Check
          className={`w-3.5 h-3.5 text-white transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}
          aria-hidden
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer"
        >
          {label}
        </label>
      )}
    </div>
  )
}
