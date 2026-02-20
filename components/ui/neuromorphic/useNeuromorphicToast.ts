"use client"
/**
 * Toast notifications for Neuromorphic UI test page
 * Date: Feb 18, 2026
 */

import { useCallback, useState } from "react"

export type ToastType = "success" | "error" | "warning" | "info"

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message: string
  exiting?: boolean
}

const TOAST_DURATION = 4000

function generateId(prefix = "neu"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`
}

export function useNeuromorphicToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((type: ToastType, title: string, message: string) => {
    const id = generateId("toast")
    setToasts((prev) => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      )
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 300)
    }, TOAST_DURATION)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  return { toasts, show, dismiss }
}
