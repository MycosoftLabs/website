"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { rewriteFusariumTwinNavigationTarget } from "@/lib/fusarium/twins/navigation-rewrite.mjs"

interface FusariumTwinSurfaceProps {
  children: ReactNode
}

/**
 * Restores the NatureOS theme/provider boundary required by cloned app CSS,
 * while keeping the application inside Fusarium's own operator chrome.
 */
export function FusariumTwinSurface({ children }: FusariumTwinSurfaceProps) {
  return (
    <NeuromorphicProvider>
      <FusariumTwinNavigationBoundary>{children}</FusariumTwinNavigationBoundary>
    </NeuromorphicProvider>
  )
}

export function FusariumTwinNavigationBoundary({ children }: FusariumTwinSurfaceProps) {
  const router = useRouter()
  const boundaryRef = useRef<HTMLDivElement>(null)
  const [navigationReady, setNavigationReady] = useState(false)

  useEffect(() => {
    const boundary = boundaryRef.current
    if (!boundary) return
    setNavigationReady(false)

    const origin = window.location.origin

    function rewriteAnchor(anchor: HTMLAnchorElement) {
      const href = anchor.getAttribute("href")
      if (!href) return
      const rewritten = rewriteFusariumTwinNavigationTarget(href, origin)
      if (typeof rewritten === "string" && rewritten !== href) anchor.setAttribute("href", rewritten)
    }

    function rewriteAnchors(root: ParentNode) {
      if (root instanceof HTMLAnchorElement) rewriteAnchor(root)
      for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) rewriteAnchor(anchor)
    }

    let observer: MutationObserver | null = null
    let rewriteTimer: number | null = null
    let firstFrame: number | null = null
    let secondFrame: number | null = null
    let cancelled = false

    const startRewriting = () => {
      if (cancelled) return
      rewriteAnchors(boundary)
      observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.target instanceof HTMLAnchorElement) {
          rewriteAnchor(record.target)
        }
        for (const node of record.addedNodes) {
          if (node instanceof Element) rewriteAnchors(node)
        }
      }
      })
      observer.observe(boundary, {
        attributes: true,
        attributeFilter: ["href"],
        childList: true,
        subtree: true,
      })
      setNavigationReady(true)
    }

    // The immutable twins contain nested client components. Rewriting their
    // server-rendered anchors before those components hydrate causes React to
    // discard the corrected DOM and restore the original NatureOS links.
    // Wait for two paint frames plus a short hydration grace period, then keep subsequent
    // client-rendered anchors inside the Fusarium subtree with the observer.
    const scheduleRewriting = () => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          rewriteTimer = window.setTimeout(startRewriting, 250)
        })
      })
    }
    scheduleRewriting()

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState
    const pushState: History["pushState"] = function (data, unused, url) {
      return originalPushState.call(
        window.history,
        data,
        unused,
        rewriteFusariumTwinNavigationTarget(url, origin),
      )
    }
    const replaceState: History["replaceState"] = function (data, unused, url) {
      return originalReplaceState.call(
        window.history,
        data,
        unused,
        rewriteFusariumTwinNavigationTarget(url, origin),
      )
    }
    window.history.pushState = pushState
    window.history.replaceState = replaceState

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href) return
      const rewritten = rewriteFusariumTwinNavigationTarget(href, origin)
      if (typeof rewritten !== "string" || rewritten === href) return
      anchor.setAttribute("href", rewritten)
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      // Next Link owns a target-level click handler whose immutable `href`
      // prop still contains the NatureOS route even after the DOM attribute is
      // corrected. Capture at the Fusarium boundary and stop that handler from
      // routing out of the twin before pushing the canonical local target.
      event.stopPropagation()
      router.push(rewritten)
    }

    function onAuxClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a")
      const href = anchor?.getAttribute("href")
      if (!anchor || !href) return
      const rewritten = rewriteFusariumTwinNavigationTarget(href, origin)
      if (typeof rewritten === "string" && rewritten !== href) anchor.setAttribute("href", rewritten)
    }

    boundary.addEventListener("click", onClick, true)
    boundary.addEventListener("auxclick", onAuxClick, true)
    return () => {
      cancelled = true
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
      if (rewriteTimer !== null) window.clearTimeout(rewriteTimer)
      observer?.disconnect()
      boundary.removeEventListener("click", onClick, true)
      boundary.removeEventListener("auxclick", onAuxClick, true)
      if (window.history.pushState === pushState) window.history.pushState = originalPushState
      if (window.history.replaceState === replaceState) window.history.replaceState = originalReplaceState
    }
  }, [router])

  return (
    <div
      ref={boundaryRef}
      className="natureos-glass-page min-h-full w-full bg-[#eef4f8] text-slate-950 dark:bg-[#0A1929] dark:text-white"
      data-fusarium-twin-surface
      data-navigation-ready={navigationReady ? "true" : "false"}
      hidden={!navigationReady}
      aria-hidden={navigationReady ? undefined : "true"}
    >
      {children}
    </div>
  )
}
