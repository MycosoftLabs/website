"use client"

import Link from "next/link"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { NeuCard, NeuCardContent, NeuBadge, NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"

/**
 * Shared shell for Launchpad legal documents while they await counsel.
 *
 * Per the master plan, terms/privacy/AUP/non-CUI policy REQUIRE professional
 * review before public launch. These pages therefore render the substantive
 * outline as an unmistakable DRAFT and the launch flag stays off until Morgan
 * flips it after counsel sign-off. Do not remove the draft banner in code —
 * remove it only by replacing the content with the counsel-approved text.
 */
export default function LegalDraft({
  title,
  sections,
}: {
  title: string
  sections: Array<[heading: string, body: string]>
}) {
  return (
    <NeuromorphicProvider>
      <div className="launchpad-glass-page min-h-dvh">
        <div className="bg-slate-950 text-center py-1.5 px-4">
          <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
            {COMMERCIAL_NON_CUI_BANNER}
          </span>
        </div>
        <div className="border-b border-border/50">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            <Link href="/fusarium/launchpad" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Launchpad
            </Link>
          </div>
        </div>
        <section className="py-14">
          <div className="container max-w-3xl mx-auto px-4">
            <div className="mb-8 rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold">DRAFT — NOT YET IN EFFECT.</span>{" "}
                This document is a working outline awaiting review by qualified counsel. It creates no
                agreement and no product access. The final version will be published, versioned, and
                require acceptance before Launchpad activation.
              </div>
            </div>
            <NeuBadge variant="default" className="mb-3">Launchpad Legal</NeuBadge>
            <h1 className="text-3xl md:text-4xl font-bold mb-8">{title}</h1>
            <NeuCard>
              <NeuCardContent className="pt-6 space-y-6">
                {sections.map(([h, b]) => (
                  <div key={h}>
                    <h2 className="font-semibold mb-1.5">{h}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b}</p>
                  </div>
                ))}
              </NeuCardContent>
            </NeuCard>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
