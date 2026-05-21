import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "MYCA Voice Test | Mycosoft",
  description: "PersonaPlex voice-to-voice test harness for MYCA",
}

/** Never statically prerender — voice UI is client-only. */
export const dynamic = "force-dynamic"

export default function TestVoiceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="contents" suppressHydrationWarning>
      {children}
    </div>
  )
}
