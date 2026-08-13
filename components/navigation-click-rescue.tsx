"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

/**
 * Watchdog for the "first click does nothing" App Router bug.
 *
 * THE BUG (live since at least Apr 2026; reproducible on ANY in-page <Link>,
 * on every route, not just the FUSARIUM/Launchpad surfaces where it is most
 * visible): clicking a Link updates the URL, the destination's RSC payload
 * arrives with HTTP 200 and is NOT aborted, `usePathname()` commits the new
 * path within ~600 ms — and the PAGE SEGMENT never swaps. The layout, header
 * and router state all move to /devices while <main> keeps rendering /about,
 * indefinitely. A second click re-runs the navigation and it renders.
 *
 * Commit 1525d8bc worked around it for the header and footer by swapping
 * <Link> for plain <a>, making all chrome navigation a hard load. That left
 * every in-page link — device cards, CTAs, sensing tiles, the whole Launchpad
 * surface — still broken, and left this component an empty stub.
 *
 * ROOT CAUSE: not found. Ruled out here: the root template.tsx (removing it
 * changes nothing), a stale service worker (none registered), an aborted RSC
 * fetch (it completes 200), an overlay swallowing the click (audited all 109
 * interactive elements on /defense/fusarium), and router state failing to
 * commit (usePathname does update). The stale part is strictly the rendered
 * page segment, which points at the client Router Cache rather than anything
 * this repo owns.
 *
 * WHAT THIS DOES: watches the one thing that must be true after a committed
 * navigation — the page content changed. `usePathname()` tells us React
 * committed a new route; if <main>'s content is byte-identical AND the same
 * DOM node a full deadline later, the segment is stuck and we hard-navigate.
 *
 * Healthy navigations disarm on the first poll, so they keep their prefetch
 * and instant transition; the hard reload is paid only when the SPA path has
 * demonstrably failed. Worst case on a false positive is a correct page that
 * loaded the slow way.
 */

/** How long a real segment swap may take before we call it stuck. Dev compiles
 *  the route on first visit (measured 1–11 s on this repo), so it gets more
 *  rope; in production the payload is prebuilt and past ~3.5 s is a hang. */
const COMMIT_DEADLINE_MS = process.env.NODE_ENV === "development" ? 12_000 : 3_500
const POLL_MS = 250

/** One rescue per destination — a hard load always renders, so if we somehow
 *  come back to the same URL, do not reload again and risk a loop. */
const RESCUE_MARKER = "__navRescueTarget"

/** Cheap content fingerprint of the rendered page. */
function pageSignature(): { node: Element | null; text: string } {
  const main = document.querySelector("main")
  const node = main?.firstElementChild ?? null
  // innerText (not textContent) so hidden/unmounted branches do not mask a real
  // change; capped because we only need "did this change at all".
  const text = (main instanceof HTMLElement ? main.innerText : main?.textContent) ?? ""
  return { node, text: text.slice(0, 400) }
}

export function NavigationClickRescue() {
  // usePathname only — useSearchParams would drag a Suspense-boundary
  // requirement into the global shell for no benefit here.
  const pathname = usePathname()
  const prevPathRef = useRef<string | null>(null)
  const beforeRef = useRef<{ node: Element | null; text: string } | null>(null)
  const deadlineRef = useRef<number>(0)

  // Capture what the page looked like BEFORE this route committed, so the poll
  // below has something to compare against.
  if (typeof window !== "undefined" && prevPathRef.current !== pathname) {
    if (prevPathRef.current !== null) {
      beforeRef.current = pageSignature()
      deadlineRef.current = Date.now() + COMMIT_DEADLINE_MS
    }
    prevPathRef.current = pathname ?? null
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    // A plain poll rather than a history.pushState patch: the app router keeps
    // its own reference to the native pushState and calls that directly, so a
    // wrapper installed here is never invoked (verified). Polling looks only at
    // outcomes, so it is mechanism-agnostic.
    const timer = window.setInterval(() => {
      const before = beforeRef.current
      if (!before) return

      const now = pageSignature()
      // Content moved — the segment swapped. Stand down.
      if (now.node !== before.node || now.text !== before.text) {
        beforeRef.current = null
        return
      }
      if (Date.now() < deadlineRef.current) return

      beforeRef.current = null
      const target = window.location.pathname
      try {
        if (window.sessionStorage.getItem(RESCUE_MARKER) === target) return
        window.sessionStorage.setItem(RESCUE_MARKER, target)
      } catch {
        /* private mode / storage disabled — proceed without the guard */
      }
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[nav-rescue] page segment never swapped for ${target} — hard navigating.`,
        )
      }
      // replace(), not assign(): the failed navigation is already in the
      // history stack, so assign() would leave the user needing two Backs to
      // undo one forward move.
      window.location.replace(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      )
    }, POLL_MS)

    return () => window.clearInterval(timer)
  }, [])

  // A successful render clears the one-shot marker, so a later failure on the
  // same URL can still be rescued.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(RESCUE_MARKER) === window.location.pathname) {
        window.sessionStorage.removeItem(RESCUE_MARKER)
      }
    } catch {
      /* ignore */
    }
  }, [pathname])

  return null
}
