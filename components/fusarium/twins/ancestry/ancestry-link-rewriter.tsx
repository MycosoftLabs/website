"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { FusariumTwinSurface } from "@/components/fusarium/twins/fusarium-twin-surface"
import { rewriteFusariumTwinNavigationTarget } from "@/lib/fusarium/twins/navigation-rewrite.mjs"

interface FusariumAncestryLinkRewriterProps {
  children: ReactNode
}

/**
 * Fusarium-boundary adapter: cloned Ancestry pages still emit /natureos/ancestry
 * hrefs. Clicks are rewritten to /fusarium/ancestry so the subtree stays mounted
 * without editing the immutable snapshot.
 */
export function FusariumAncestryLinkRewriter({ children }: FusariumAncestryLinkRewriterProps) {
  const boundaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const boundary = boundaryRef.current
    if (!boundary) return

    const exactLabels = new Map([
      ["Ancestry", "Life Database"],
      ["NatureOS", "Fusarium"],
      ["Back to NatureOS", "Back to Fusarium"],
      ["NatureOS Ancestry", "Fusarium Life Database"],
    ])

    const rewriteBranding = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node: Node | null = walker.nextNode()
      while (node) {
        const original = node.nodeValue ?? ""
        const trimmed = original.trim()
        const replacement = exactLabels.get(trimmed)
        if (replacement) node.nodeValue = original.replace(trimmed, replacement)
        node = walker.nextNode()
      }
      if (root instanceof Element) {
        for (const anchor of [
          ...(root instanceof HTMLAnchorElement ? [root] : []),
          ...root.querySelectorAll<HTMLAnchorElement>("a[href]"),
        ]) {
          const href = anchor.getAttribute("href")
          if (!href) continue
          const rewritten = rewriteFusariumTwinNavigationTarget(href, window.location.origin)
          if (typeof rewritten === "string" && rewritten !== href) anchor.setAttribute("href", rewritten)
        }
        for (const element of [root, ...root.querySelectorAll<HTMLElement>("[aria-label], [title]")]) {
          for (const attribute of ["aria-label", "title"]) {
            const value = element.getAttribute(attribute)
            if (!value) continue
            const rewritten = value.replaceAll("NatureOS", "Fusarium").replace(/^Ancestry\b/, "Life Database")
            if (rewritten !== value) element.setAttribute(attribute, rewritten)
          }
        }
      }
    }

    let observer: MutationObserver | null = null
    let rewriteTimer: number | null = null
    let maintenanceTimer: number | null = null
    let firstFrame: number | null = null
    let secondFrame: number | null = null
    let cancelled = false

    const startRewriting = () => {
      if (cancelled) return
      rewriteBranding(boundary)
      observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "attributes") rewriteBranding(record.target)
          for (const node of record.addedNodes) rewriteBranding(node)
        }
      })
      observer.observe(boundary, { attributes: true, attributeFilter: ["href", "aria-label", "title"], childList: true, subtree: true })
      // Several immutable pages replace complete client subtrees after their
      // data reads settle. Keep the boundary canonical across those renders;
      // this only rewrites explicit same-origin Life Database navigation and
      // exact Fusarium branding labels.
      maintenanceTimer = window.setInterval(() => rewriteBranding(boundary), 500)
    }
    const scheduleRewriting = () => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          rewriteTimer = window.setTimeout(startRewriting, 250)
        })
      })
    }
    scheduleRewriting()

    return () => {
      cancelled = true
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
      if (rewriteTimer !== null) window.clearTimeout(rewriteTimer)
      if (maintenanceTimer !== null) window.clearInterval(maintenanceTimer)
      observer?.disconnect()
    }
  }, [])

  return (
    <FusariumTwinSurface>
      <div ref={boundaryRef} data-fusarium-life-database>
        {children}
      </div>
    </FusariumTwinSurface>
  )
}
