"use client"

/**
 * Neuromorphic Input component
 * Text input with inset neuromorphic styling.
 * Date: Feb 18, 2026
 */

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react"

const INPUT_BASE =
  "w-full px-4 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"

export interface NeuInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  labelId?: string
}

export const NeuInput = forwardRef<HTMLInputElement, NeuInputProps>(
  ({ error, label, labelId, id, className = "", ...props }, ref) => {
    const inputId = id ?? labelId

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${INPUT_BASE} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="text-xs text-red-500 mt-1"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

NeuInput.displayName = "NeuInput"

export interface NeuTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
  labelId?: string
}

export const NeuTextarea = forwardRef<HTMLTextAreaElement, NeuTextareaProps>(
  ({ error, label, labelId, id, className = "", ...props }, ref) => {
    const inputId = id ?? labelId

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`${INPUT_BASE} resize-none ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="text-xs text-red-500 mt-1"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

NeuTextarea.displayName = "NeuTextarea"
