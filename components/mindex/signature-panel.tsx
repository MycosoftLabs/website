"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { CheckCircle2, Copy, Fingerprint, KeyRound, Loader2, Shield, TriangleAlert, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface SignaturePanelProps {
  className?: string
}

interface VerifyResponse {
  valid: boolean
  record_id?: string
  device_id?: string
  user_id?: string
  timestamp?: string
  error?: string
  details?: string
  code?: string
}

interface RecordResponse {
  record_id: string
  data_hash: string
  prev_hash: string | null
  signature: string
  timestamp: string
  device_id?: string
  user_id?: string
  payload: unknown
  public_key?: string
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

function shortHash(value: string | null | undefined): string {
  if (!value) return "null"
  return value.length > 18 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value
}

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

export function SignaturePanel({ className }: SignaturePanelProps) {
  const [recordId, setRecordId] = useState("")

  const id = recordId.trim()
  const verifyUrl = id ? `/api/mindex/verify/${encodeURIComponent(id)}` : null
  const recordUrl = id ? `/api/mindex/integrity/record/${encodeURIComponent(id)}` : null

  const verify = useSWR<VerifyResponse>(verifyUrl, fetcher, { refreshInterval: 30_000 })
  const record = useSWR<RecordResponse>(recordUrl, fetcher)

  const state = useMemo(() => {
    if (!id) return "idle" as const
    if (verify.isLoading || record.isLoading) return "loading" as const
    if (verify.error || record.error) return "error" as const
    return verify.data?.valid ? ("verified" as const) : ("invalid" as const)
  }, [id, verify.isLoading, record.isLoading, verify.error, record.error, verify.data?.valid])

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-purple-400" />
          Signature Verification
        </CardTitle>
        <CardDescription>
          Verify Ed25519 signatures for MINDEX integrity records (Schnorr/ECDSA panels included as roadmap placeholders).
        </CardDescription>

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            placeholder="Record ID"
            className="font-mono"
          />
          <Button
            variant="outline"
            onClick={() => {
              void verify.mutate()
              void record.mutate()
            }}
            disabled={!id || state === "loading"}
          >
            {state === "loading" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              state === "idle" && "border-white/10 bg-white/5 text-white/70",
              state === "loading" && "border-white/10 bg-white/5 text-white/70",
              state === "verified" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
              state === "invalid" && "border-red-500/40 bg-red-500/10 text-red-200",
              state === "error" && "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            {state === "idle"
              ? "Enter a record ID"
              : state === "loading"
                ? "Verifying…"
                : state === "verified"
                  ? "Ed25519 verified"
                  : state === "invalid"
                    ? "Invalid signature"
                    : "Verification unavailable"}
            {state === "verified" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {state === "invalid" ? <XCircle className="h-3.5 w-3.5" /> : null}
            {state === "error" ? <TriangleAlert className="h-3.5 w-3.5" /> : null}
          </div>

          {verify.data?.timestamp ? (
            <span className="text-xs text-muted-foreground">timestamp {new Date(verify.data.timestamp).toISOString()}</span>
          ) : null}
        </div>

        <Tabs defaultValue="ed25519" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="ed25519">Ed25519</TabsTrigger>
            <TabsTrigger value="schnorr">Schnorr</TabsTrigger>
            <TabsTrigger value="ecdsa">ECDSA</TabsTrigger>
          </TabsList>

          <TabsContent value="ed25519" className="mt-4">
            {!id ? (
              <div className="text-sm text-muted-foreground">
                Enter a record ID to fetch the record + verify its Ed25519 signature server-side.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-white/10 bg-black/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-purple-300" />
                      Public key
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-mono text-xs break-all">{record.data?.public_key ?? "—"}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!record.data?.public_key}
                      onClick={() => copyToClipboard(record.data?.public_key ?? "")}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-black/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-purple-300" />
                      Signature
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-mono text-xs break-all">{record.data?.signature ?? "—"}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!record.data?.signature}
                      onClick={() => copyToClipboard(record.data?.signature ?? "")}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>

                <div className="md:col-span-2">
                  <Separator className="bg-white/10 my-1" />
                  <div className="grid gap-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">data_hash</span>
                      <span className="font-mono" title={record.data?.data_hash}>
                        {shortHash(record.data?.data_hash)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">prev_hash</span>
                      <span className="font-mono" title={record.data?.prev_hash ?? "null"}>
                        {shortHash(record.data?.prev_hash ?? null)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">device_id</span>
                      <span className="font-mono">{record.data?.device_id ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">user_id</span>
                      <span className="font-mono">{record.data?.user_id ?? "—"}</span>
                    </div>
                  </div>
                </div>

                {(verify.error || record.error) && (
                  <div className="md:col-span-2 text-xs text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-md px-3 py-2">
                    {(verify.error?.message || record.error?.message) ?? "Verification unavailable"}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schnorr" className="mt-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-medium">Schnorr signatures (roadmap)</div>
              <div className="text-sm text-muted-foreground mt-1">
                This UI slot is reserved for Schnorr verification once MINDEX exposes Schnorr-signed anchors (e.g., for Bitcoin Taproot
                workflows). We’ll wire it to the same verification UX pattern as Ed25519.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ecdsa" className="mt-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-medium">ECDSA (roadmap)</div>
              <div className="text-sm text-muted-foreground mt-1">
                This UI slot is reserved for ECDSA verification once the backend exposes ECDSA key material and signatures (e.g., legacy
                chain integrations). The dashboard will support side-by-side verification across algorithms.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

