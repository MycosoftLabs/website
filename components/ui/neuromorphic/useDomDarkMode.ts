"use client"

/**
 * Matches NeuromorphicProvider: dark mode when <html> has class "dark".
 */

import { useSyncExternalStore } from "react"

function subscribeHtmlDarkClass(onStoreChange: () => void) {
  const root = document.documentElement
  const observer = new MutationObserver(() => onStoreChange())
  observer.observe(root, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

function getSnapshotHtmlIsDark(): boolean {
  return document.documentElement.classList.contains("dark")
}

export function useDomDarkMode(): boolean {
  return useSyncExternalStore(subscribeHtmlDarkClass, getSnapshotHtmlIsDark, () => false)
}
