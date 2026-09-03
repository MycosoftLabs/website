"use client"

import { useMemo, useRef, useState } from "react"
import { FileAudio, Upload } from "lucide-react"
import { SpectrumVisual, WaveformVisual } from "./visuals"
import { sensingScopeContainsDevice, type SensingScope } from "@/lib/fusarium/sensing-scope/contracts"
import { sineReplayProvenance, sineReplaySamples, validateSineReplayEvidence, type SineReplayEvidence } from "@/lib/fusarium/sine-replay/contracts"

const MAX_FILE_BYTES = 2 * 1024 * 1024

export function SineReplayWorkbench({ scope }: { scope: SensingScope }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [evidence, setEvidence] = useState<SineReplayEvidence | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const samples = useMemo(() => evidence ? sineReplaySamples(evidence) : [], [evidence])
  const provenance = useMemo(() => evidence ? sineReplayProvenance(evidence) : undefined, [evidence])
  const scopeMatch = evidence ? sensingScopeContainsDevice(scope, evidence.deviceId) : null

  const importFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setEvidence(null)
      setIssues(["Replay files are limited to 2 MiB."])
      return
    }
    try {
      const result = validateSineReplayEvidence(JSON.parse(await file.text()))
      if (!result.ok) {
        setEvidence(null)
        setIssues(result.issues)
        return
      }
      setEvidence(result.value)
      setIssues([])
    } catch {
      setEvidence(null)
      setIssues(["The selected replay file is not valid JSON."])
    }
  }

  return <section className="border-b border-cyan-400/15 bg-[#03070c] p-3" data-sine-local-replay={evidence ? "ready" : "unbound"}>
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-cyan-400/20 bg-black/45 p-3 backdrop-blur-xl">
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Fusarium local evidence replay</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Acoustic waveform and spectrum</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">Import a bounded, versioned JSON capture. Values remain in this browser and are rendered as REPLAY evidence; no detector, model, device connection, or classification is implied.</p>
      </div>
      <div>
        <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} />
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-50"><Upload className="h-4 w-4" /> Import replay JSON</button>
      </div>
    </div>
    {issues.length ? <div role="alert" className="mb-3 rounded-lg border border-red-400/30 bg-red-950/35 p-3 text-xs text-red-100"><strong>Replay withheld</strong><ul className="mt-1 list-disc pl-5">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
    {scopeMatch === false ? <div role="status" className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-100">Imported device {evidence?.deviceId ?? "not supplied"} is outside the selected device scope. It remains available for offline inspection and is not presented as scoped telemetry.</div> : null}
    <div className="grid gap-3 lg:grid-cols-2">
      <WaveformVisual title="Supplied acoustic signal" subtitle={evidence ? `${evidence.sensorId} · ${evidence.samples.length} samples` : "Time-domain replay"} samples={samples} unit={evidence?.unit ?? "unknown"} state={evidence ? "ready" : "unbound"} provenance={provenance} />
      <SpectrumVisual title="Supplied acoustic spectrum" values={evidence?.samples ?? []} sampleRateHz={evidence?.sampleRateHz ?? 1} state={evidence ? "ready" : "unbound"} provenance={provenance} />
    </div>
    {!evidence ? <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><FileAudio className="h-4 w-4" /> The server-backed SINE library below remains separate; saved records are not assumed to match this scope.</div> : null}
  </section>
}
