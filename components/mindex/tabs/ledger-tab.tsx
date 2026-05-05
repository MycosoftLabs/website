"use client"

import { Wallet } from "lucide-react"
import { GlassCard } from "@/components/ui/glowing-border"
import { LedgerPanel } from "@/components/mindex/ledger-panel"
import { OrdinalsViewer } from "@/components/mindex/ordinals-viewer"
import { LiveAnchorStream } from "@/components/mindex/tabs/live-anchor-stream"

export function LedgerSection() {
  return (
    <div className="space-y-6">
      <GlassCard color="cyan">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-cyan-400" />
          Live anchor tail
        </h3>
        <p className="text-sm text-gray-400 mb-3">
          Decorative block viz removed — this panel binds to MINDEX <span className="font-mono">ledger.anchor</span> via SSE
          only.
        </p>
        <LiveAnchorStream />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <LedgerPanel />
        <OrdinalsViewer />
      </div>
    </div>
  )
}
