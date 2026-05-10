"use client"

import { useEffect } from "react"

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

function isHashOnlyNavigation(anchor: HTMLAnchorElement): boolean {
  if (!anchor.hash) return false
  const current = new URL(window.location.href)
  const target = new URL(anchor.href, window.location.href)
  return current.origin === target.origin && current.pathname === target.pathname && current.search === target.search
}

function releaseBackgroundVideos() {
  document.querySelectorAll("video").forEach((video) => {
    try {
      video.pause()
      video.removeAttribute("src")
      video.querySelectorAll("source").forEach((source) => source.removeAttribute("src"))
      video.load()
    } catch {
      // Best effort only. Navigation should never depend on media teardown.
    }
  })
}

export function NavigationClickRescue() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event) || event.defaultPrevented) return
      const target = event.target instanceof Element ? event.target : null
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return
      if (isHashOnlyNavigation(anchor)) return

      releaseBackgroundVideos()
    }

    document.addEventListener("click", handleClick, { capture: true })
    return () => document.removeEventListener("click", handleClick, { capture: true })
  }, [])

  return null
}
