"use client"

/**
 * GlobalVoiceButton - Feb 17, 2026
 *
 * ONE persistent floating voice button shown on all pages EXCEPT pages
 * that already render their own mic UI (search page, test-voice page).
 *
 * This is the ONLY global mic. Pages that need their own use their own.
 * Never shows more than one mic button at a time anywhere.
 */

import { usePathname } from "next/navigation"
import { FloatingVoiceButton } from "./VoiceButton"

/**
 * Pages with their own mic UI — GlobalVoiceButton hides on all of these.
 * Uses startsWith so /search?q=... and /search/... are also suppressed.
 */
const PAGES_WITH_OWN_MIC = [
  "/search",
  "/test-voice",
]

export function GlobalVoiceButton() {
  const pathname = usePathname()

  if (PAGES_WITH_OWN_MIC.some((p) => pathname?.startsWith(p))) {
    return null
  }

  return <FloatingVoiceButton showTranscript={false} showStatus={false} />
}
