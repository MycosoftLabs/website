"use client"

/**
 * Petri Dish v2 — tools, compounds preview, MINDEX species search, ledger, worker-driven steps,
 * recording, AI segment hook, mobile-first layout.
 * Date: May 02, 2026
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { PetriViewer } from "@/components/petri-dish-v2/viewer"
import type { PetriStateSnapshot } from "@/components/petri-dish-v2/types"
import { COMPOUND_LABELS } from "@/components/petri-dish-v2/types"
import {
  petriHealth,
  petriPause,
  petriReset,
  petriState,
  petriStep,
} from "@/lib/petri-dish-v2/petri-api"
import { createPetriRestWorker } from "@/lib/petri-dish-v2/rest-engine-worker"
import { canvasToModelInput, segmentFrameRgb } from "@/lib/petri-dish-v2/ai-tracker"
import { startCanvasRecording } from "@/lib/petri-dish-v2/recording"
import { FlaskConical, Menu, Pause, Play, RotateCcw, Video, Wand2 } from "lucide-react"

interface SpeciesHit {
  id?: string
  scientific_name?: string
  name?: string
  title?: string
  kingdom?: string
}

function renderFrameToCanvas(snapshot: PetriStateSnapshot | null): HTMLCanvasElement | null {
  if (!snapshot) return null
  const c = document.createElement("canvas")
  c.width = 128
  c.height = 128
  const ctx = c.getContext("2d")
  if (!ctx) return null
  ctx.fillStyle = `rgb(${Math.floor(40 + snapshot.mean_sugar * 80)},${Math.floor(
    30 + snapshot.mean_nitrogen * 60
  )},${Math.floor(20 + (snapshot.chemistry_means[5] ?? 0) * 40)})`
  ctx.fillRect(0, 0, 128, 128)
  for (const t of snapshot.tips.filter((x) => x.alive)) {
    const px = (t.x / 128) * 128
    const py = (t.y / 128) * 128
    ctx.fillStyle = `rgba(20,90,30,${0.2 + t.energy * 0.6})`
    ctx.fillRect(px, py, 2, 2)
  }
  return c
}

export function PetriDishV2App() {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const [health, setHealth] = useState<unknown>(null)
  const [snapshot, setSnapshot] = useState<PetriStateSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [paused, setPaused] = useState(false)
  const [autoRun, setAutoRun] = useState(false)
  const [ledger, setLedger] = useState<string[]>([])
  const [timeline, setTimeline] = useState<PetriStateSnapshot[]>([])
  const [speciesQuery, setSpeciesQuery] = useState("Pleurotus")
  const [speciesHits, setSpeciesHits] = useState<SpeciesHit[]>([])
  const [speciesLoading, setSpeciesLoading] = useState(false)
  const [compareNote, setCompareNote] = useState<string | null>(null)
  const [segInfo, setSegInfo] = useState<string | null>(null)
  const [preview, setPreview] = useState<number[]>(() => {
    const a = new Array(18).fill(0)
    a[16] = 7
    a[17] = 37
    return a
  })

  const pushLedger = useCallback((line: string) => {
    setLedger((prev) => [...prev.slice(-200), line])
  }, [])

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const h = await petriHealth()
      setHealth(h)
      const s = await petriState()
      setSnapshot(s)
      setPaused(!!s.paused)
      pushLedger(`frame=${s.frame} tips=${s.tip_count}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [pushLedger])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const workerRef = useRef<Worker | null>(null)
  useEffect(() => {
    if (!autoRun || paused) return
    const w = createPetriRestWorker()
    workerRef.current = w
    const id = window.setInterval(() => {
      w.postMessage({
        type: "step",
        origin: window.location.origin,
        n: 2,
      })
    }, 120)
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === "snapshot" && ev.data.ok) {
        try {
          const s = JSON.parse(ev.data.body) as PetriStateSnapshot
          setSnapshot(s)
        } catch {
          /* ignore */
        }
      }
    }
    w.addEventListener("message", onMsg)
    return () => {
      window.clearInterval(id)
      w.removeEventListener("message", onMsg)
      w.terminate()
      workerRef.current = null
    }
  }, [autoRun, paused])

  const onStep = async () => {
    setBusy(true)
    setError(null)
    try {
      const s = await petriStep(1)
      setSnapshot(s)
      setTimeline((t) => [...t.slice(-500), s])
      pushLedger(`step frame=${s.frame}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onReset = async () => {
    setBusy(true)
    setError(null)
    try {
      const s = await petriReset()
      setSnapshot(s)
      setTimeline([])
      pushLedger("reset")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onPauseToggle = async () => {
    setBusy(true)
    try {
      const s = await petriPause(!paused)
      setSnapshot(s)
      setPaused(!!s.paused)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const searchSpecies = async () => {
    const q = speciesQuery.trim()
    if (q.length < 2) {
      setSpeciesHits([])
      return
    }
    setSpeciesLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/search/unified?q=${encodeURIComponent(q)}&types=species&limit=15`
      )
      const json = (await res.json()) as { results?: { species?: SpeciesHit[] } }
      setSpeciesHits(json.results?.species ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSpeciesLoading(false)
    }
  }

  const onRecord = () => {
    const el = canvasHostRef.current?.querySelector("canvas")
    if (!el) {
      setCompareNote("No WebGL canvas yet — start simulation first.")
      return
    }
    const rec = startCanvasRecording(
      el,
      (blob) => {
        const url = URL.createObjectURL(blob)
        pushLedger(`recording saved blob size=${blob.size}`)
        const a = document.createElement("a")
        a.href = url
        a.download = `petri-v2-${Date.now()}.webm`
        a.click()
        URL.revokeObjectURL(url)
      },
      (err) => setCompareNote(err.message)
    )
    window.setTimeout(() => rec.stop(), 8000)
    pushLedger("recording 8s…")
  }

  const onAiSegment = async () => {
    const c = renderFrameToCanvas(snapshot)
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    setSegInfo("Running segmentation…")
    try {
      const rgb = canvasToModelInput(ctx, 256)
      const out = await segmentFrameRgb(rgb, snapshot?.frame ?? 0)
      const n = Array.isArray(out.tracks) ? out.tracks.length : 0
      setSegInfo(`tracks=${n} backend=${String(out.metrics?.inference_backend ?? "?")}`)
      pushLedger(`ai_segment tracks=${n}`)
    } catch (e) {
      setSegInfo(e instanceof Error ? e.message : String(e))
    }
  }

  const showStats = useMemo(
    () => typeof window !== "undefined" && window.location.search.includes("petriStats=1"),
    []
  )

  const tools = (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <Button type="button" variant="secondary" className="min-h-[44px] justify-start" onClick={() => void onStep()} disabled={busy}>
        Step once
      </Button>
      <Button type="button" variant="secondary" className="min-h-[44px] justify-start" onClick={() => void onReset()} disabled={busy}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset seed
      </Button>
      <Button type="button" variant="secondary" className="min-h-[44px] justify-start" onClick={() => void onPauseToggle()} disabled={busy}>
        {paused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
        {paused ? "Resume" : "Pause"}
      </Button>
      <Button
        type="button"
        variant={autoRun ? "default" : "outline"}
        className="min-h-[44px] justify-start"
        onClick={() => setAutoRun((v) => !v)}
      >
        Worker auto-step
      </Button>
      <Separator />
      <Button type="button" variant="outline" className="min-h-[44px] justify-start" onClick={onRecord}>
        <Video className="h-4 w-4 mr-2" />
        Record 8s WebM
      </Button>
      <Button type="button" variant="outline" className="min-h-[44px] justify-start" onClick={() => void onAiSegment()}>
        <Wand2 className="h-4 w-4 mr-2" />
        AI segment (proxy)
      </Button>
    </div>
  )

  const compoundPanel = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Sliders tint agar preview (full reaction-diffusion coupling is engine-side on Sandbox).
      </p>
      {COMPOUND_LABELS.map((label, i) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{label}</span>
            <span className="text-muted-foreground">{(preview[i] ?? 0).toFixed(2)}</span>
          </div>
          <Slider
            value={[preview[i] ?? 0]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(v) => {
              setPreview((p) => {
                const n = [...p]
                n[i] = v[0] ?? 0
                return n
              })
            }}
            className="py-1"
          />
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs">pH (preview)</Label>
        <Slider
          value={[preview[16] ?? 7]}
          min={4}
          max={9}
          step={0.05}
          onValueChange={(v) =>
            setPreview((p) => {
              const n = [...p]
              n[16] = v[0] ?? 7
              return n
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Temp °C (preview)</Label>
        <Slider
          value={[preview[17] ?? 37]}
          min={4}
          max={45}
          step={0.5}
          onValueChange={(v) =>
            setPreview((p) => {
              const n = [...p]
              n[17] = v[0] ?? 37
              return n
            })
          }
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/15">
            <FlaskConical className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">Virtual Petri Dish v2</h2>
            <p className="text-sm text-muted-foreground">
              Rust engine via MAS · MINDEX species search · Seg service proxy
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs max-w-[220px] truncate">
            {health ? JSON.stringify(health).slice(0, 80) : "health…"}
          </Badge>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden min-h-[44px] min-w-[44px]" aria-label="Open tools">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80dvh]">
              <SheetHeader>
                <SheetTitle>Tools & compounds</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(80dvh-5rem)] mt-4">
                <div className="space-y-6 pb-8">
                  {tools}
                  <Separator />
                  {compoundPanel}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="hidden lg:flex lg:col-span-2 flex-col gap-3 border rounded-lg p-3 bg-card/40">
          {tools}
        </aside>

        <main className="lg:col-span-7 space-y-3">
          <div ref={canvasHostRef}>
            <PetriViewer snapshot={snapshot} previewCompounds={preview} showStats={showStats} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-[44px]" onClick={() => void refresh()} disabled={busy}>
              Refresh state
            </Button>
            <Button className="min-h-[44px]" variant="secondary" onClick={() => void onStep()} disabled={busy}>
              Step
            </Button>
          </div>
          {compareNote ? <p className="text-xs text-muted-foreground">{compareNote}</p> : null}
          {segInfo ? <p className="text-xs text-cyan-600/90">{segInfo}</p> : null}
          <div className="rounded-lg border p-3 bg-muted/30">
            <h3 className="text-sm font-medium mb-2">MyceliumSeg compare</h3>
            <p className="text-xs text-muted-foreground">
              Side-by-side calibration uses real dataset frames from your MINDEX assets. Open the validation panel below on the full lab page, or point asset paths in MINDEX — no placeholder imagery is shipped here.
            </p>
          </div>
        </main>

        <aside className="lg:col-span-3 flex flex-col gap-3 border rounded-lg p-3 bg-card/40 min-h-[200px]">
          <h3 className="text-sm font-medium">Species (MINDEX)</h3>
          <div className="flex gap-2">
            <Input
              value={speciesQuery}
              onChange={(e) => setSpeciesQuery(e.target.value)}
              className="text-base min-h-[44px]"
              placeholder="Search species…"
            />
            <Button type="button" className="min-h-[44px] shrink-0" onClick={() => void searchSpecies()} disabled={speciesLoading}>
              Go
            </Button>
          </div>
          <ScrollArea className="h-48 border rounded-md">
            <ul className="p-2 space-y-1 text-sm">
              {speciesHits.length === 0 ? (
                <li className="text-muted-foreground text-xs">No results (query ≥2 chars)</li>
              ) : (
                speciesHits.map((h, idx) => (
                  <li key={`${h.id ?? idx}`} className="rounded px-2 py-1 hover:bg-muted/80">
                    <span className="font-medium">{h.scientific_name ?? h.name ?? h.title ?? "—"}</span>
                    {h.kingdom ? <span className="text-muted-foreground text-xs ml-1">({h.kingdom})</span> : null}
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>

          <Separator />

          <h3 className="text-sm font-medium">Event ledger</h3>
          <ScrollArea className="h-40 border rounded-md">
            <pre className="p-2 text-[11px] leading-relaxed whitespace-pre-wrap">
              {(snapshot?.events_tail ?? []).concat(ledger).slice(-40).join("\n")}
            </pre>
          </ScrollArea>

          <h3 className="text-sm font-medium">Timeline</h3>
          <p className="text-xs text-muted-foreground">{timeline.length} frames buffered (client)</p>
        </aside>

        <div className="hidden lg:block lg:col-span-12 border rounded-lg p-3 bg-card/30 max-h-[420px] overflow-hidden">
          <ScrollArea className="h-[380px] pr-3">{compoundPanel}</ScrollArea>
        </div>
      </div>

      <div className="lg:hidden border rounded-lg p-3">
        <h3 className="text-sm font-medium mb-2">Compounds (preview)</h3>
        <ScrollArea className="h-64">{compoundPanel}</ScrollArea>
      </div>
    </div>
  )
}
