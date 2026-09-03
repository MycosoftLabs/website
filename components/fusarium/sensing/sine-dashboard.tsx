"use client"

import Link from "next/link"
import { ArrowLeft, ShieldAlert } from "lucide-react"
import { SineAcousticPlayer } from "@/components/sensing/sine-acoustic-player"
import { describeSensingScope } from "@/lib/fusarium/sensing-scope/contracts"
import { ConnectedSensingScopeSelector, useSensingScope } from "./sensing-scope-selector"
import { SineReplayWorkbench } from "./sine-replay-workbench"
import { TrainingSourceCatalog } from "./training-source-catalog"

/** Thin Fusarium mount of the complete SINE application. */
export function FusariumSineDashboard() {
  const { scope } = useSensingScope()
  return (
    <main className="fixed inset-0 z-[70] flex min-h-0 flex-col overflow-hidden bg-black" data-fusarium-app="sine" data-sensing-scope={scope.kind}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-400/15 bg-[#03070c] px-3 py-2">
        <Link href="/fusarium" className="inline-flex items-center gap-1 rounded-md border border-cyan-300/30 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Fusarium
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-[10px] text-amber-200"><ShieldAlert className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{describeSensingScope(scope)} · selection is carried to SINE; saved-audio records are not assumed to belong to it</span></div>
      </header>
      <ConnectedSensingScopeSelector compact defaultOpen={false} />
      <div className="min-h-0 flex-1 overflow-auto">
        <SineReplayWorkbench scope={scope} />
        <TrainingSourceCatalog />
        <SineAcousticPlayer embedded />
      </div>
    </main>
  )
}
