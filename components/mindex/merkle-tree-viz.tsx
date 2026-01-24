"use client"

import { useMemo, useState } from "react"
import * as d3 from "d3"
import { motion } from "framer-motion"
import { CheckCircle2, Copy, Loader2, Shield, TreeDeciduous, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { verifyMerkleProof, type MerkleProofStep } from "@/lib/mindex/crypto/merkle-tree"

interface MerkleProofResponse {
  date: string
  index: number
  leaf: string
  root: string
  proof: MerkleProofStep[]
}

interface MerkleTreeVizProps {
  className?: string
}

type VizNode = {
  id: string
  kind: "root" | "parent" | "leaf" | "sibling"
  hash: string
  isAccumulator: boolean
}

function shortHash(value: string): string {
  return value.length > 18 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value
}

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

function buildProofTree(data: MerkleProofResponse) {
  // Build an explicit binary tree where each level hashes (accumulator + sibling).
  let acc: d3.HierarchyNode<VizNode> = d3.hierarchy({
    id: "leaf",
    kind: "leaf",
    hash: data.leaf,
    isAccumulator: true,
  })

  const allNodes: VizNode[] = [acc.data]

  data.proof.forEach((step, i) => {
    const siblingNode = d3.hierarchy<VizNode>({
      id: `sibling-${i}`,
      kind: "sibling",
      hash: step.sibling,
      isAccumulator: false,
    })

    allNodes.push(siblingNode.data)

    const parentId = i === data.proof.length - 1 ? "root" : `parent-${i}`
    const parentKind: VizNode["kind"] = parentId === "root" ? "root" : "parent"

    // The proof step tells us where the sibling sits relative to the accumulator.
    const children = step.position === "left" ? [siblingNode, acc] : [acc, siblingNode]
    acc = d3.hierarchy<VizNode>({
      id: parentId,
      kind: parentKind,
      hash: parentId === "root" ? data.root : "sha256:…",
      isAccumulator: true,
    }, () => children)

    allNodes.push(acc.data)
  })

  // If proof is empty, root == leaf in this visualization context.
  if (data.proof.length === 0) {
    acc = d3.hierarchy({
      id: "root",
      kind: "root",
      hash: data.root,
      isAccumulator: true,
    }, () => [d3.hierarchy(allNodes[0])])
    allNodes.push(acc.data)
  }

  return { root: acc, nodes: allNodes }
}

export function MerkleTreeViz({ className }: MerkleTreeVizProps) {
  const [recordId, setRecordId] = useState("")
  const [date, setDate] = useState("")
  const [state, setState] = useState<{
    isLoading: boolean
    error: string | null
    data: MerkleProofResponse | null
  }>({ isLoading: false, error: null, data: null })

  async function loadProof() {
    const id = recordId.trim()
    if (!id) {
      setState((s) => ({ ...s, error: "Enter a record ID." }))
      return
    }

    const qs = new URLSearchParams()
    if (date.trim()) qs.set("date", date.trim())

    setState({ isLoading: true, error: null, data: null })
    try {
      const res = await fetch(`/api/mindex/integrity/proof/${encodeURIComponent(id)}?${qs.toString()}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as MerkleProofResponse
      setState({ isLoading: false, error: null, data })
    } catch (e) {
      setState({ isLoading: false, error: e instanceof Error ? e.message : String(e), data: null })
    }
  }

  const isValid = useMemo(() => {
    if (!state.data) return null
    return verifyMerkleProof(state.data.leaf, state.data.proof, state.data.root)
  }, [state.data])

  const layout = useMemo(() => {
    if (!state.data) return null

    const { root } = buildProofTree(state.data)
    const tree = d3.tree<VizNode>().nodeSize([64, 120])
    const laidOut = tree(root)

    const nodes = laidOut.descendants()
    const links = laidOut.links()

    const xExtent = d3.extent(nodes, (d) => d.x) as [number, number]
    const yExtent = d3.extent(nodes, (d) => d.y) as [number, number]

    const width = Math.max(560, (xExtent[1] - xExtent[0]) + 160)
    const height = Math.max(320, (yExtent[1] - yExtent[0]) + 160)

    return {
      nodes,
      links,
      width,
      height,
      viewBox: `${xExtent[0] - 80} ${yExtent[0] - 80} ${width} ${height}`,
    }
  }, [state.data])

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <TreeDeciduous className="h-5 w-5 text-purple-400" />
          Merkle Proof Visualizer
        </CardTitle>
        <CardDescription>
          Fetch a Merkle proof for a record and visualize the sibling path up to the Merkle root.
        </CardDescription>

        <div className="grid gap-2 md:grid-cols-[1fr_200px_auto]">
          <Input
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            placeholder="Record ID"
            className="font-mono"
          />
          <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD (optional)" className="font-mono" />
          <Button onClick={loadProof} disabled={state.isLoading}>
            {state.isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Load proof
          </Button>
        </div>

        {state.error ? (
          <div className="text-xs text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-md px-3 py-2">
            {state.error}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              isValid === null && "border-white/10 bg-white/5 text-white/70",
              isValid === true && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
              isValid === false && "border-red-500/40 bg-red-500/10 text-red-200",
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            {isValid === null ? "Awaiting proof" : isValid ? "Proof verified" : "Proof invalid"}
            {isValid === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {isValid === false ? <XCircle className="h-3.5 w-3.5" /> : null}
          </div>
          {state.data ? (
            <span className="text-xs text-muted-foreground">
              date {state.data.date} • leaf index {state.data.index} • steps {state.data.proof.length}
            </span>
          ) : null}
        </div>

        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="details" disabled={!state.data}>
              Details
            </TabsTrigger>
            <TabsTrigger value="raw" disabled={!state.data}>
              Raw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="mt-4">
            {layout ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 overflow-x-auto">
                <svg width="100%" height="380" viewBox={layout.viewBox} className="min-w-[640px]">
                  <defs>
                    <linearGradient id="mindexProofGlow" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(168, 85, 247, 0.55)" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0.55)" />
                    </linearGradient>
                  </defs>

                  {layout.links.map((link, i) => {
                    const isAccLink = Boolean(link.source.data.isAccumulator && link.target.data.isAccumulator)
                    return (
                      <path
                        key={i}
                        d={`M ${link.source.x} ${link.source.y} C ${link.source.x} ${(link.source.y + link.target.y) / 2} ${link.target.x} ${(link.source.y + link.target.y) / 2} ${link.target.x} ${link.target.y}`}
                        fill="none"
                        stroke={isAccLink ? "url(#mindexProofGlow)" : "rgba(255,255,255,0.12)"}
                        strokeWidth={isAccLink ? 2.5 : 1.25}
                      />
                    )
                  })}

                  {layout.nodes.map((node) => {
                    const isRoot = node.data.kind === "root"
                    const isSibling = node.data.kind === "sibling"
                    const stroke =
                      isRoot ? "rgba(168, 85, 247, 0.45)" : node.data.isAccumulator ? "rgba(16, 185, 129, 0.35)" : "rgba(255,255,255,0.15)"
                    const fill =
                      isRoot ? "rgba(168, 85, 247, 0.18)" : node.data.isAccumulator ? "rgba(16, 185, 129, 0.12)" : "rgba(255,255,255,0.06)"

                    return (
                      <g key={node.data.id} transform={`translate(${node.x},${node.y})`}>
                        <motion.circle
                          initial={{ r: 0 }}
                          animate={{ r: isRoot ? 16 : 12 }}
                          transition={{ duration: 0.35 }}
                          stroke={stroke}
                          strokeWidth={2}
                          fill={fill}
                        />
                        <text
                          x={0}
                          y={isRoot ? -24 : -20}
                          textAnchor="middle"
                          fontSize={10}
                          fill="rgba(255,255,255,0.7)"
                        >
                          {isRoot ? "root" : isSibling ? "sibling" : node.data.kind}
                        </text>
                        <text x={0} y={4} textAnchor="middle" fontSize={10} fill="rgba(216, 180, 254, 0.95)">
                          {shortHash(node.data.hash)}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Enter a record ID and load a proof to render the Merkle verification path.
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            {state.data ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-white/10 bg-black/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Root</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-mono text-xs break-all">{state.data.root}</div>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(state.data.root)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-black/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Leaf</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-mono text-xs break-all">{state.data.leaf}</div>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(state.data.leaf)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>

                <div className="md:col-span-2">
                  <Separator className="bg-white/10 my-2" />
                  <div className="text-xs text-muted-foreground mb-2">Proof steps</div>
                  <div className="space-y-2">
                    {state.data.proof.map((step, idx) => (
                      <div key={idx} className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-muted-foreground">
                            step {idx + 1} • sibling on <span className="font-mono">{step.position}</span>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => copyToClipboard(step.sibling)} title="Copy sibling hash">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="font-mono text-xs break-all mt-2">{step.sibling}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            {state.data ? (
              <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-purple-100/90">
                {JSON.stringify(state.data, null, 2)}
              </pre>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

