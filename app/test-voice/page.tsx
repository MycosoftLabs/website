"use client"

import { useEffect, useState, type ComponentType } from "react"

function VoiceTestLoading() {
  return (
    <div
      className="min-h-dvh bg-zinc-950 text-white p-4 flex items-center justify-center"
      suppressHydrationWarning
    >
      <p className="text-zinc-400 text-sm" suppressHydrationWarning>
        Loading MYCA Voice Test…
      </p>
    </div>
  )
}

/**
 * Mount voice test UI only after client hydration.
 * Avoids SSR/client mismatch (and Cursor browser data-cursor-ref injection on SSR HTML).
 */
export default function VoiceTestPage() {
  const [Client, setClient] = useState<ComponentType | null>(null)

  useEffect(() => {
    let cancelled = false
    void import("./VoiceTestPageClient").then((mod) => {
      if (!cancelled) setClient(() => mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!Client) return <VoiceTestLoading />
  return <Client />
}
