"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Copy, Link2, Loader2, Shield, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { hashLink, hashPayload, verifyHashChain, type MINDEXRecord } from "@/lib/mindex/crypto/hash-chain"

interface HashChainVisualizerProps {
  className?: string
  /**
   * Optional preloaded records for visualization (e.g., from a server component).
   * If not provided, the user can load records by ID via the UI.
   */
  initialRecords?: MINDEXRecord[]
}

interface LoadedRecordState {
  records: MINDEXRecord[]
  isLoading: boolean
  error: string | null
}

function normalizeIdList(input: string): string[] {
  return input
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function fetchRecord(recordId: string): Promise<MINDEXRecord> {
  const res = await fetch(`/api/mindex/integrity/record/${encodeURIComponent(recordId)}`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function shortHash(value: string | null | undefined): string {
  if (!value) return "null"
  return value.length > 18 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value
}

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

export function HashChainVisualizer({ className, initialRecords }: HashChainVisualizerProps) {
  const [input, setInput] = useState("")
  const [state, setState] = useState<LoadedRecordState>({
    records: initialRecords ?? [],
    isLoading: false,
    error: null,
  })

  const ordered = useMemo(() => {
    const records = [...state.records]
    records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    return records
  }, [state.records])

  const chainResult = useMemo(() => {
    if (!ordered.length) return null
    return verifyHashChain(ordered)
  }, [ordered])

  const derived = useMemo(() => {
    return ordered.map((r) => {
      const computedDataHash = hashPayload(r.payload)
      const computedLink = hashLink(r.prev_hash ?? null, r.data_hash)
      const dataHashMatches = computedDataHash === r.data_hash
      return { record: r, computedDataHash, computedLink, dataHashMatches }
    })
  }, [ordered])

  async function onLoad() {
    const ids = normalizeIdList(input)
    if (!ids.length) {
      setState((s) => ({ ...s, error: "Enter one or more record IDs." }))
      return
    }

    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const records = await Promise.all(ids.map(fetchRecord))
      setState({ records, isLoading: false, error: null })
    } catch (e) {
      setState((s) => ({ ...s, isLoading: false, error: e instanceof Error ? e.message : String(e) }))
    }
  }

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Hash Chain Visualizer
          </CardTitle>
          <CardDescription>
            Load one or more MINDEX integrity records and verify the SHA-256 hash-chain linkage end-to-end.
          </CardDescription>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Record IDs (comma or newline separated)"
            className="font-mono"
          />
          <Button onClick={onLoad} disabled={state.isLoading}>
            {state.isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Load records
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
              !chainResult && "border-white/10 bg-white/5 text-white/70",
              chainResult?.valid && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
              chainResult && !chainResult.valid && "border-red-500/40 bg-red-500/10 text-red-200",
            )}
          >
            {!chainResult ? (
              <>
                <Loader2 className="h-3.5 w-3.5" />
                Load records to verify
              </>
            ) : chainResult.valid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Chain valid
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Chain invalid
              </>
            )}
          </div>

          {chainResult ? (
            <span className="text-xs text-muted-foreground">
              {ordered.length} record(s) • {chainResult.failures.length} failure(s)
            </span>
          ) : null}
        </div>

        <Tabs defaultValue="chain" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="chain">Chain</TabsTrigger>
            <TabsTrigger value="failures" disabled={!chainResult || chainResult.failures.length === 0}>
              Failures
            </TabsTrigger>
            <TabsTrigger value="raw" disabled={!ordered.length}>
              Raw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chain" className="mt-4">
            {ordered.length ? (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex items-stretch gap-3 pb-4">
                  {derived.map(({ record, computedDataHash, computedLink, dataHashMatches }, idx) => {
                    const prevExpected = idx > 0 ? derived[idx - 1]?.computedLink ?? null : null
                    const prevMatches = (record.prev_hash ?? null) === prevExpected

                    return (
                      <motion.div
                        key={record.record_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                        className={cn(
                          "min-w-[320px] rounded-xl border bg-background/40 backdrop-blur",
                          prevMatches && dataHashMatches
                            ? "border-emerald-500/20"
                            : "border-red-500/20",
                        )}
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">record_id</div>
                              <div className="font-mono text-sm break-all">{record.record_id}</div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                              onClick={() => copyToClipboard(record.record_id)}
                              title="Copy record_id"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>

                          <Separator className="bg-white/10" />

                          <div className="grid gap-2 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">timestamp</span>
                              <span className="font-mono">{new Date(record.timestamp).toISOString()}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">data_hash</span>
                              <span
                                className={cn("font-mono", dataHashMatches ? "text-emerald-200" : "text-red-200")}
                                title={record.data_hash}
                              >
                                {shortHash(record.data_hash)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">prev_hash</span>
                              <span
                                className={cn("font-mono", prevMatches ? "text-emerald-200" : "text-red-200")}
                                title={record.prev_hash ?? "null"}
                              >
                                {shortHash(record.prev_hash)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">link_hash</span>
                              <span className="font-mono text-purple-200/90" title={computedLink}>
                                {shortHash(computedLink)}
                              </span>
                            </div>
                          </div>

                          <Separator className="bg-white/10" />

                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                                prevMatches && dataHashMatches
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                  : "border-red-500/40 bg-red-500/10 text-red-200",
                              )}
                            >
                              {prevMatches && dataHashMatches ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Link OK
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Link mismatch
                                </>
                              )}
                            </div>

                            <Button asChild variant="ghost" size="sm">
                              <a href={`/api/mindex/verify/${encodeURIComponent(record.record_id)}`} target="_blank" rel="noreferrer">
                                Inspect
                                <Link2 className="h-4 w-4 ml-2" />
                              </a>
                            </Button>
                          </div>

                          {!dataHashMatches ? (
                            <div className="text-xs text-red-200/80">
                              data_hash mismatch: computed {shortHash(computedDataHash)} vs stored {shortHash(record.data_hash)}
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-muted-foreground">
                Enter record IDs above to render a real hash chain. This view uses the same SHA-256 linkage MINDEX verifies in production.
              </div>
            )}
          </TabsContent>

          <TabsContent value="failures" className="mt-4">
            {chainResult?.failures?.length ? (
              <div className="space-y-2">
                {chainResult.failures.map((f) => (
                  <div
                    key={`${f.record_id}-${f.reason}`}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm"
                  >
                    <div className="font-mono text-xs text-red-100 break-all">{f.record_id}</div>
                    <div className="text-xs text-red-200/90 mt-1">{f.reason}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No failures.</div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-purple-100/90">
              {JSON.stringify(ordered, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

