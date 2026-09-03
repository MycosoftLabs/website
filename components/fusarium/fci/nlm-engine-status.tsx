"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { parseNlmEngineStatus } from "@/lib/fusarium/twins/fungi-compute/nlm-engine.mjs"

export function NlmEngineStatus({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState(() => parseNlmEngineStatus(null, 503))
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    void fetch("/api/fusarium/nlm/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => setStatus(parseNlmEngineStatus(await response.json().catch(() => null), response.status)))
      .catch(() => { if (!controller.signal.aborted) setStatus(parseNlmEngineStatus(null, 503)) })
      .finally(() => { if (!controller.signal.aborted) setChecking(false) })
    return () => controller.abort()
  }, [])
  return (
    <div className="rounded-lg border border-purple-500/25 bg-black/35 p-2 text-[9px]" data-fusarium-nlm-engine={status.state}>
      <div className="flex items-center justify-between"><b className="text-purple-300">Deployed NLM engine</b><Badge className="border-purple-500/30 bg-purple-500/10 text-[9px] text-purple-200">{checking ? "CHECKING" : status.engine.toUpperCase()}</Badge></div>
      {!compact ? <dl className="mt-2 grid grid-cols-2 gap-1"><dt className="text-slate-500">Training</dt><dd className="font-mono text-slate-300">{status.training}</dd><dt className="text-slate-500">Progress</dt><dd className="font-mono text-slate-300">{status.progress === null ? "Not supplied" : `${status.progress}%`}</dd><dt className="text-slate-500">Epoch</dt><dd className="font-mono text-slate-300">{status.epoch ?? "Not supplied"}</dd></dl> : null}
      <p className="mt-2 text-slate-500">{status.message} Engine readiness is not device inference.</p>
    </div>
  )
}
