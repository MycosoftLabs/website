"use client"

/**
 * Neuromorphic Modal component
 * Accessible modal with backdrop and focus trap.
 * Date: Feb 18, 2026
 */

import {
  useEffect,
  useRef,
  type ReactNode,
  type KeyboardEvent,
} from "react"
import { X } from "lucide-react"

export interface NeuModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  id?: string
}

export function NeuModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  id = "neu-modal",
}: NeuModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !modalRef.current) return
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== "Tab") return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    const el = modalRef.current
    el.addEventListener("keydown", onKeyDown)
    return () => el.removeEventListener("keydown", onKeyDown)
  }, [open])

  useEffect(() => {
    function onEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) {
      window.addEventListener("keydown", onEscape)
      return () => window.removeEventListener("keydown", onEscape)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 neu-modal-backdrop transition-all duration-300 opacity-100 visible"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 p-6 rounded-3xl transition-all duration-300 neu-raised opacity-100 visible scale-100"
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id={`${id}-title`}
            className="text-lg font-semibold text-gray-700 dark:text-gray-200"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="neu-raised neu-btn neu-focus p-2 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" aria-hidden />
          </button>
        </div>
        {description && (
          <p
            id={`${id}-description`}
            className="text-sm text-gray-500 dark:text-gray-400 mb-6"
          >
            {description}
          </p>
        )}
        {children}
        {footer && <div className="flex gap-3 mt-6">{footer}</div>}
      </div>
    </>
  )
}
