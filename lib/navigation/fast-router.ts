/**
 * Fast client navigations for search flows — View Transitions when available,
 * otherwise immediate router.push with scroll disabled for snappier UX.
 */

export interface MinimalAppRouter {
  push: (href: string, options?: { scroll?: boolean }) => void
}

declare global {
  interface Document {
    startViewTransition?: (callback: () => void | Promise<void>) => {
      finished: Promise<void>
      ready: Promise<void>
      updateCallbackDone: Promise<void>
      skipTransition: () => void
    }
  }
}

export function pushSearchRoute(router: MinimalAppRouter, href: string): void {
  const run = () => {
    router.push(href, { scroll: false })
  }
  if (typeof document !== "undefined" && typeof document.startViewTransition === "function") {
    document.startViewTransition(run)
  } else {
    run()
  }
}
