"use client"

/**
 * UnifiedMYCAFAB - Mar 2, 2026
 * Fixes GitHub Issue #10: NatureOS Chat/Voice bubble button layering conflict.
 *
 * Single floating container in bottom-right with proper z-index.
 * Stacks Chat and Voice buttons vertically to prevent overlap.
 * All floating elements use z-[9998]; modals use z-[9999].
 */

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const MYCAFloatingButton = dynamic(
  () => import("./MYCAFloatingButton").then((m) => ({ default: m.MYCAFloatingButton })),
  { ssr: false }
)

const PersonaPlexWidget = dynamic(
  () => import("@/components/voice/PersonaPlexWidget").then((m) => ({ default: m.PersonaPlexWidget })),
  { ssr: false }
)

const PAGES_WITH_OWN_VOICE = ["/search", "/test-voice"]

interface UnifiedMYCAFABProps {
  title?: string
  getContextText?: () => string
  showVoice?: boolean
}

export function UnifiedMYCAFAB({
  title = "MYCA",
  getContextText,
  showVoice = true,
}: UnifiedMYCAFABProps) {
  const pathname = usePathname()
  const hideVoice = !showVoice || PAGES_WITH_OWN_VOICE.some((p) => pathname?.startsWith(p))

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9998] flex flex-col-reverse items-end gap-2",
        "pointer-events-none [&>*]:pointer-events-auto"
      )}
      aria-label="MYCA Chat and Voice"
    >
      {/* Chat button - always shown when FAB is shown */}
      <MYCAFloatingButton
        title={title}
        getContextText={getContextText}
        embedded
      />

      {/* Voice button - only when voice enabled and not on pages with own mic */}
      {!hideVoice && (
        <PersonaPlexWidget
          position="bottom-right"
          showMonitor={true}
          serverUrl={process.env.NEXT_PUBLIC_PERSONAPLEX_WS_URL || "ws://localhost:8999/api/chat"}
          voicePrompt="NATURAL_F2.pt"
          embedded
        />
      )}
    </div>
  )
}
