"use client"

import { GitBranch, Lock } from "lucide-react"
import { GlassCard } from "@/components/ui/glowing-border"
import { DataBlockViz } from "@/components/ui/data-block-viz"
import { PixelGridViz, MerklePixelTree } from "@/components/ui/pixel-grid-viz"
import { HashChainVisualizer } from "@/components/mindex/hash-chain-visualizer"
import { MerkleTreeViz } from "@/components/mindex/merkle-tree-viz"
import { SignaturePanel } from "@/components/mindex/signature-panel"
import { CryptoMonitor } from "@/components/mindex/crypto-monitor"

export function CryptographySection() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard color="purple">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-400" />
            Hash Visualization
          </h3>
          <div className="flex justify-center">
            <PixelGridViz rows={8} cols={16} pixelSize={10} colorScheme="purple" animated />
          </div>
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-cyan-400" />
            Merkle Tree
          </h3>
          <MerklePixelTree depth={3} />
        </GlassCard>
      </div>

      <GlassCard color="purple">
        <h3 className="text-lg font-semibold text-white mb-4">Cryptographic Blocks</h3>
        <DataBlockViz maxBlocks={8} blockSize={55} colorScheme="purple" orientation="horizontal" animated showLabels />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <HashChainVisualizer />
        <MerkleTreeViz />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SignaturePanel />
        <CryptoMonitor />
      </div>
    </div>
  )
}
