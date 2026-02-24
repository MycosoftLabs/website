/**
 * useWebMCPProvider - February 17, 2026
 *
 * React hook to register WebMCP tools when navigator.modelContext is available.
 * Unregisters on unmount. Falls back to no-op when API unavailable.
 */

"use client"

import { useEffect, useRef } from "react"
import {
  isWebMCPAvailable,
  createUnifiedRegistration,
  type WebMCPCallbacks,
} from "@/lib/webmcp/provider"

/** Feature flag: set NEXT_PUBLIC_MYCA_WEBMCP_ENABLED=false to disable (staged rollout) */
const WEBMCP_ENABLED =
  typeof process === "undefined" || process.env?.NEXT_PUBLIC_MYCA_WEBMCP_ENABLED !== "false"

export function useWebMCPProvider(callbacks: WebMCPCallbacks): boolean {
  const available = WEBMCP_ENABLED && isWebMCPAvailable()
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!available) return

    const unregister = createUnifiedRegistration({
      get onRunSearch() {
        return callbacksRef.current.onRunSearch
      },
      get onFocusWidget() {
        return callbacksRef.current.onFocusWidget
      },
      get onAddNotepadItem() {
        return callbacksRef.current.onAddNotepadItem
      },
      get onReadPageContext() {
        return callbacksRef.current.onReadPageContext
      },
      get onNavigate() {
        return callbacksRef.current.onNavigate
      },
    })
    return unregister
  }, [available])

  return available
}
