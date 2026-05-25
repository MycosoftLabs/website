"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { PetriViewer, type PetriVisualProfile } from "@/components/petri-dish-v2/viewer"
import type { PetriAction, PetriStateSnapshot, SpeciesGroup } from "@/components/petri-dish-v2/types"
import { COMPOUND_LABELS } from "@/components/petri-dish-v2/types"
import { petriAction, petriHealth, petriPause, petriReset, petriState, petriStep } from "@/lib/petri-dish-v2/petri-api"
import { createPetriRestWorker } from "@/lib/petri-dish-v2/rest-engine-worker"
import type { BlueSightObservation } from "@/lib/bluesight/types"
import { bluesightLatestObservation } from "@/lib/bluesight/api"
import { FlaskConical, Microscope, Pause, Play, RotateCcw, Timer } from "lucide-react"

type FungiType = "mushroom" | "mold" | "mildew" | "mycorrhizae" | "yeast" | "lichen" | "truffle"
type ToolMode = "Swab" | "Scalpel" | "Pipette" | "Probe"

const TAXA: Record<SpeciesGroup, string[]> = {
  Fungi: [
    "Pleurotus ostreatus",
    "Ganoderma lucidum",
    "Aspergillus niger",
    "Penicillium chrysogenum",
    "Erysiphe necator",
    "Saccharomyces cerevisiae",
    "Tuber melanosporum",
    "Rhizophagus irregularis",
  ],
  Bacteria: ["Bacillus subtilis", "Escherichia coli", "Pseudomonas fluorescens"],
  Viruses: ["Norovirus", "Adenovirus", "Hepatitis C virus"],
  Protista: ["Dictyostelium discoideum", "Amoeba proteus"],
  "Plant/Pollen": ["Mixed grass pollen", "Pine pollen", "Cellulose plant debris"],
  Archaea: ["Halobacterium salinarum", "Sulfolobus solfataricus"],
}

const PIPETTE_COMPOUNDS = [
  "glucose",
  "oxygen",
  "water",
  "antibiotic",
  "antifungal",
  "antiviral",
  "enzyme_mix",
  "cellulase",
  "laccase",
  "oil_exudate",
  "peroxide",
] as const

const AGAR_TYPES = {
  transparent: "Transparent Agar",
  charcoal: "Charcoal Agar",
  blood: "Blood Agar",
  dextrose: "Dextrose Pine Wood Agar",
  feces: "Feces Agar",
  maltExtract: "Malt Extract Agar (MEA)",
  fungalAgar: "Fungal Agar",
  sabouraud: "Sabouraud Dextrose Agar",
} as const

type AgarType = keyof typeof AGAR_TYPES

function visualProfileFor(group: SpeciesGroup, fungiType: FungiType): PetriVisualProfile {
  if (group === "Fungi") {
    if (fungiType === "mold") return "mold"
    if (fungiType === "mildew") return "mildew"
    return "mycelium"
  }
  if (group === "Bacteria") return "bacteria"
  if (group === "Viruses") return "virus"
  if (group === "Protista") return "protista"
  if (group === "Plant/Pollen") return "pollen"
  return "archaea"
}

function snapshotLog(snapshot: PetriStateSnapshot | null, local: string[]) {
  const engineLines = snapshot?.events_tail?.slice(-14) ?? []
  const fallback = snapshot
    ? [`frame=${snapshot.frame} tips=${snapshot.tip_count} organisms=${snapshot.organism_count}`]
    : ["Waiting for local engine state..."]
  return [...fallback, ...engineLines, ...local].slice(-28)
}

export function PetriDishV2App() {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const experimentIdRef = useRef(`petri-v2-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  const [health, setHealth] = useState<unknown>(null)
  const [snapshot, setSnapshot] = useState<PetriStateSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [paused, setPaused] = useState(true)
  const [autoRun, setAutoRun] = useState(false)
  const [localLog, setLocalLog] = useState<string[]>([])
  const [speciesGroup, setSpeciesGroup] = useState<SpeciesGroup>("Fungi")
  const [fungiType, setFungiType] = useState<FungiType>("mushroom")
  const [taxon, setTaxon] = useState(TAXA.Fungi[0])
  const [tool, setTool] = useState<ToolMode>("Swab")
  const [pipetteCompound, setPipetteCompound] = useState<(typeof PIPETTE_COMPOUNDS)[number]>("antifungal")
  const [pipetteDose, setPipetteDose] = useState(0.45)
  const [pipetteRadius, setPipetteRadius] = useState(22)
  const [agarType, setAgarType] = useState<AgarType>("charcoal")
  const [virtualHours, setVirtualHours] = useState(0)
  const [blueSightEnabled, setBlueSightEnabled] = useState(false)
  const [blueSightObservation, setBlueSightObservation] = useState<BlueSightObservation | null>(null)
  const [preview, setPreview] = useState<number[]>(() => {
    const a = new Array(18).fill(0)
    a[0] = 0.35
    a[5] = 0.22
    a[16] = 7
    a[17] = 24
    return a
  })

  const visualProfile = visualProfileFor(speciesGroup, fungiType)
  const taxaOptions = TAXA[speciesGroup]

  const pushLog = useCallback((line: string) => {
    setLocalLog((prev) => [...prev.slice(-40), line])
  }, [])

  const hasTissue = (snapshot?.tip_count ?? 0) > 0 || (snapshot?.organism_count ?? 0) > 0

  const buildBlueSightPreview = useCallback((state: PetriStateSnapshot | null): BlueSightObservation => {
    const detections = (state?.organisms ?? []).slice(0, 14).map((organism, index) => {
      const cx = (organism.x / 128) * 650
      const cy = (organism.y / 128) * 650
      const r = Math.max(5, organism.radius * 4)
      return {
        detection_id: `sahi-${state?.frame ?? 0}-${organism.id}`,
        class_name: organism.class === "fungi" ? "mycelium" : organism.class,
        confidence: Math.max(0.58, Math.min(0.96, 0.72 + organism.biomass * 0.18)),
        bbox_xyxy: [cx - r, cy - r, cx + r, cy + r] as [number, number, number, number],
        centroid_xy: [cx, cy] as [number, number],
        linked_entity: {
          type: "simulation-organism",
          id: `organism-${organism.id}`,
          taxon_id: organism.species_id,
        },
        attributes: {
          detector: "YOLO26 preview",
          slicer: "SAHI",
          source: "simulation truth projection",
        },
      }
    })
    return {
      schema: "mycosoft.bluesight.observation.v1",
      profile: "petri",
      run_id: experimentIdRef.current,
      frame_id: `local-${state?.frame ?? 0}`,
      timestamp: new Date().toISOString(),
      source: "screen_capture",
      detections,
      tracks: detections.map((detection) => ({
        track_id: `track-${detection.linked_entity?.id ?? detection.detection_id}`,
        class_name: detection.class_name,
        status: "updated",
        confidence: detection.confidence,
        centroid_xy: detection.centroid_xy,
        last_seen_ts: new Date().toISOString(),
      })),
      reconciliation: {
        matched_sim_entities: detections.length,
        unmatched_visual_entities: 0,
        visual_truth_disagreement_score: detections.length ? 0.08 : 0,
        sensor_disagreement_score: 0,
      },
      model_health: {
        model_name: "YOLO26 + SAHI",
        model_version: "preview-truth-projection",
        runtime: "browser",
        provider: "BlueSight",
        healthy: true,
        fps: blueSightEnabled ? 4 : 0,
        latency_ms: 42,
        notes: state && detections.length > 0 ? "Preview observation active for Petri v2." : "Waiting for visible tissue.",
      },
      scene_summary: detections.length > 0 ? `Tracking ${detections.length} visible Petri entities.` : "BlueSight armed; place tissue to begin tracking.",
      metadata: {
        yolo: "YOLO26",
        slicer: "SAHI",
        route: "/natureos/virtual-petri-dish2",
      },
    }
  }, [blueSightEnabled])

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const h = await petriHealth()
      setHealth(h)
      const s = await petriState()
      setSnapshot(s)
      setPaused(!!s.paused)
      setVirtualHours(Math.floor((s.frame ?? 0) / 24))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const first = TAXA[speciesGroup][0]
    setTaxon(first)
    pushLog(`taxon group set to ${speciesGroup}`)
  }, [pushLog, speciesGroup])

  useEffect(() => {
    if (!autoRun || paused) return
    const worker = createPetriRestWorker()
    const id = window.setInterval(() => {
      worker.postMessage({ type: "step", origin: window.location.origin, n: 3 })
    }, 180)
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === "snapshot" && ev.data.ok) {
        try {
          const s = JSON.parse(ev.data.body) as PetriStateSnapshot
          setSnapshot(s)
          setVirtualHours(Math.floor((s.frame ?? 0) / 24))
        } catch {
          /* ignore malformed worker payloads */
        }
      }
    }
    worker.addEventListener("message", onMsg)
    return () => {
      window.clearInterval(id)
      worker.removeEventListener("message", onMsg)
      worker.terminate()
    }
  }, [autoRun, paused])

  useEffect(() => {
    if (!blueSightEnabled) return
    setBlueSightObservation(buildBlueSightPreview(snapshot))
    const runId = experimentIdRef.current
    const interval = window.setInterval(async () => {
      const obs = await bluesightLatestObservation("petri", runId)
      setBlueSightObservation(obs ?? buildBlueSightPreview(snapshot))
    }, 2000)
    return () => window.clearInterval(interval)
  }, [blueSightEnabled, buildBlueSightPreview, snapshot])

  const onStep = async () => {
    if (!hasTissue) {
      pushLog("place tissue with Swab or Scalpel to start")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const s = await petriStep(4, true)
      setSnapshot(s)
      setVirtualHours(Math.floor((s.frame ?? 0) / 24))
      pushLog(`manual step frame=${s.frame}`)
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
      setVirtualHours(0)
      setPaused(true)
      setAutoRun(false)
      setBlueSightObservation(null)
      pushLog("seed reset")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onPauseToggle = async () => {
    if (paused && !hasTissue) {
      pushLog("place tissue with Swab or Scalpel to start")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const s = await petriPause(!paused)
      setSnapshot(s)
      setPaused(!!s.paused)
      setAutoRun(!s.paused)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const dishPointFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(127, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 128)),
      y: Math.max(0, Math.min(127, ((event.clientY - rect.top) / Math.max(1, rect.height)) * 128)),
    }
  }

  const sendPetriAction = async (action: PetriAction) => {
    setBusy(true)
    setError(null)
    try {
      const s = await petriAction(action)
      setSnapshot(s)
      setVirtualHours(Math.floor((s.frame ?? 0) / 24))
      if (action.type === "inoculate") {
        setPaused(false)
        setAutoRun(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleDishClick = (event: PointerEvent<HTMLDivElement>) => {
    const point = dishPointFromEvent(event)
    if (tool === "Pipette") {
      const index = pipetteCompound === "antifungal" ? 13 : pipetteCompound === "oxygen" ? 5 : pipetteCompound === "cellulase" ? 7 : pipetteCompound === "laccase" ? 6 : 0
      setPreview((prev) => {
        const next = [...prev]
        next[index] = Math.min(1, (next[index] ?? 0) + pipetteDose * 0.35)
        return next
      })
      pushLog(`pipette ${pipetteCompound} dose=${pipetteDose.toFixed(2)} radius=${pipetteRadius}`)
      void sendPetriAction({ type: "pipette", compound: pipetteCompound, x: point.x, y: point.y, dose: pipetteDose, radius: pipetteRadius })
      return
    }
    if (tool === "Probe") {
      pushLog(`probe ${taxon}: biomass=${snapshot?.tip_count ?? "sim"} local fields sampled`)
      void sendPetriAction({ type: "probe", x: point.x, y: point.y })
      return
    }
    pushLog(`${tool.toLowerCase()} placed ${taxon}`)
    void sendPetriAction({
      type: "inoculate",
      tool: tool as "Swab" | "Scalpel",
      taxonId: taxon,
      group: speciesGroup,
      visualProfile,
      x: point.x,
      y: point.y,
      radius: tool === "Swab" ? 18 : 9,
    })
  }

  const consoleLines = useMemo(() => snapshotLog(snapshot, localLog), [localLog, snapshot])

  return (
    <div className="petri-app-frame flex w-full min-w-0 flex-col gap-4 overflow-x-hidden rounded-3xl border p-3 xl:flex-row xl:p-4">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-4 overflow-hidden">
        <div className="petri-canvas-glass flex w-full max-w-[650px] items-center justify-center overflow-hidden rounded-2xl border p-2">
          <div
            ref={canvasHostRef}
            className="petri-dish-stage relative aspect-square w-full overflow-hidden rounded-xl"
            onPointerDown={handleDishClick}
          >
            <div className={`petri-agar-layer petri-agar-${agarType}`} aria-hidden="true" />
            <PetriViewer snapshot={snapshot} previewCompounds={preview} visualProfile={visualProfile} />
            <div className="petri-dish-button-shadow" aria-hidden="true" />
            <div className="petri-dish-hover-glass" aria-hidden="true" />
          </div>
        </div>

        <Card className="petri-console-glass w-full max-w-[650px]">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Console</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="petri-console-log h-32 rounded-b-lg">
              <div className="space-y-1 p-3 font-mono text-xs">
                {consoleLines.map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="petri-controls-glass w-full min-w-0 shrink-0 gap-0 py-0 xl:w-80">
        <div className="petri-controls-topbar">
          <CardTitle className="text-sm font-semibold tracking-tight">Controls</CardTitle>
          <div className="petri-controls-status">
            <span className="petri-mindex-status" data-live={!!health} data-checking={!health && !error}>
              <span className="petri-mindex-led" aria-hidden="true" />
              <span>MINDEX</span>
            </span>
            <Badge variant="outline" className="petri-hour-badge">
              <Timer className="mr-1 h-3 w-3" />
              {virtualHours}h
            </Badge>
          </div>
        </div>

        <CardContent className="space-y-4 overflow-visible pt-0">
          <div className="petri-playback-row relative flex h-[5rem] items-center justify-center overflow-visible">
            <div className="petri-codepen-button-demo">
              <div className="button-wrap">
                <button
                  type="button"
                  aria-pressed={autoRun && !paused}
                  disabled={busy}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    void onPauseToggle()
                  }}
                >
                  <span>{autoRun && !paused ? "Pause" : "Start"}</span>
                </button>
                <div className="button-shadow" />
              </div>
            </div>
            <div className="petri-codepen-button-demo petri-codepen-button-demo-reset absolute right-0 top-1/2 -translate-y-1/2">
              <div className="button-wrap">
                <button type="button" aria-label="Reset simulation" disabled={busy} onClick={() => void onReset()}>
                  <span>
                    <RotateCcw className="h-[1em] w-[1em]" />
                  </span>
                </button>
                <div className="button-shadow" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="petri-control-layer-card petri-control-layer-card-top space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Species Group</Label>
              <Select value={speciesGroup} onValueChange={(value) => setSpeciesGroup(value as SpeciesGroup)}>
                <SelectTrigger className="petri-glass-select-trigger h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(TAXA).map((group) => (
                    <SelectItem key={group} value={group} className="text-xs">
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {speciesGroup === "Fungi" ? (
              <div className="space-y-2">
                <Label className="text-xs">Fungi Type</Label>
                <Select value={fungiType} onValueChange={(value) => setFungiType(value as FungiType)}>
                  <SelectTrigger className="petri-glass-select-trigger h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["mushroom", "mold", "mildew", "mycorrhizae", "yeast", "lichen", "truffle"] as FungiType[]).map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-xs">Sub Species / Taxon</Label>
              <Select value={taxon} onValueChange={setTaxon}>
                <SelectTrigger className="petri-glass-select-trigger h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxaOptions.map((item) => (
                    <SelectItem key={item} value={item} className="text-xs">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="petri-control-layer-card space-y-3">
            <Label className="text-xs">Tools</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["Swab", "Scalpel", "Pipette", "Probe"] as ToolMode[]).map((mode) => (
                <div key={mode} className="petri-codepen-button-demo petri-codepen-button-demo-rect" data-active={tool === mode}>
                  <div className="button-wrap">
                    <button
                      type="button"
                      aria-pressed={tool === mode}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setTool(mode)
                        pushLog(`tool selected: ${mode}`)
                      }}
                    >
                      <span>{mode}</span>
                    </button>
                    <div className="button-shadow" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="petri-control-layer-card space-y-2">
            <Label className="text-xs">MYCA Eyes / BlueSight</Label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={blueSightEnabled}
                onChange={(event) => setBlueSightEnabled(event.target.checked)}
              />
              Enable BlueSight
            </label>
            {blueSightObservation ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px]">
                <div>Model: {blueSightObservation.model_health?.model_name ?? "YOLO26 + SAHI"}</div>
                <div>Status: {blueSightObservation.model_health?.notes ?? blueSightObservation.scene_summary}</div>
                <div>Detections: {blueSightObservation.detections.length}</div>
                <div>Tracks: {blueSightObservation.tracks.length}</div>
                <div>Matched: {blueSightObservation.reconciliation.matched_sim_entities}</div>
                <div>Disagreement: {blueSightObservation.reconciliation.visual_truth_disagreement_score.toFixed(3)}</div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">No BlueSight observation yet.</p>
            )}
          </div>

          {tool === "Pipette" ? (
            <div className="petri-control-layer-card petri-control-layer-card-sliders space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Pipette Compound</Label>
                <Select value={pipetteCompound} onValueChange={(value) => setPipetteCompound(value as typeof pipetteCompound)}>
                  <SelectTrigger className="petri-glass-select-trigger h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPETTE_COMPOUNDS.map((compound) => (
                      <SelectItem key={compound} value={compound} className="text-xs">
                        {compound.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label className="text-xs">Dose</Label>
                  <span className="text-muted-foreground">{pipetteDose.toFixed(2)}</span>
                </div>
                <Slider value={[pipetteDose]} min={0.05} max={1} step={0.05} onValueChange={(value) => setPipetteDose(value[0] ?? 0.45)} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label className="text-xs">Radius</Label>
                  <span className="text-muted-foreground">{pipetteRadius}px</span>
                </div>
                <Slider value={[pipetteRadius]} min={6} max={64} step={1} onValueChange={(value) => setPipetteRadius(value[0] ?? 22)} />
              </div>
            </div>
          ) : null}

          <div className="petri-control-layer-card space-y-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-3 w-3" />
              <Label className="text-xs">Agar Type</Label>
            </div>
            <Select value={agarType} onValueChange={(value) => setAgarType(value as AgarType)}>
              <SelectTrigger className="petri-glass-select-trigger h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AGAR_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="petri-control-layer-card petri-control-layer-card-sliders space-y-3">
            {COMPOUND_LABELS.slice(0, 8).map((label, index) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{label}</span>
                  <span className="text-muted-foreground">{(preview[index] ?? 0).toFixed(2)}</span>
                </div>
                <Slider
                  value={[preview[index] ?? 0]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(value) =>
                    setPreview((prev) => {
                      const next = [...prev]
                      next[index] = value[0] ?? 0
                      return next
                    })
                  }
                />
              </div>
            ))}
          </div>

          <Button type="button" variant="secondary" className="h-8 w-full text-xs" disabled={busy} onClick={() => void onStep()}>
            Step once
          </Button>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="flex w-full min-w-0 shrink-0 flex-col gap-4 xl:w-64">
        <Card className="petri-controls-glass gap-0 py-0">
          <div className="petri-controls-topbar">
            <CardTitle className="text-sm font-semibold tracking-tight">Selected Taxon</CardTitle>
          </div>
          <CardContent className="space-y-3 pt-0 text-xs">
            <div className="flex items-center gap-2">
              <Microscope className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">{taxon}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <span>Group</span>
              <span className="text-right text-foreground">{speciesGroup}</span>
              <span>Profile</span>
              <span className="text-right text-foreground">{visualProfile}</span>
              <span>Growth</span>
              <span className="text-right text-foreground">{speciesGroup === "Viruses" ? "host dependent" : speciesGroup === "Fungi" ? "filament" : "colony"}</span>
            </div>
            <Badge variant="outline" className="w-full justify-center text-[10px]">
              validated sandbox v1
            </Badge>
          </CardContent>
        </Card>

        <Card className="petri-controls-glass gap-0 py-0">
          <div className="petri-controls-topbar">
            <CardTitle className="text-sm font-semibold tracking-tight">Simulation Metrics</CardTitle>
          </div>
          <CardContent className="space-y-2 pt-0 text-xs">
            <div className="flex justify-between"><span>Frame</span><span>{snapshot?.frame ?? "fallback"}</span></div>
            <div className="flex justify-between"><span>Active tips</span><span>{snapshot?.tip_count ?? 48}</span></div>
            <div className="flex justify-between"><span>Organisms</span><span>{snapshot?.organism_count ?? 18}</span></div>
            <div className="flex justify-between"><span>Entropy</span><span>{(snapshot?.world?.complexity.alivenessEntropy ?? 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Biomass</span><span>{(snapshot?.world?.complexity.totalBiomass ?? 0).toFixed(1)}</span></div>
            <div className="flex justify-between"><span>Sugar</span><span>{(snapshot?.mean_sugar ?? preview[0] ?? 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Nitrogen</span><span>{(snapshot?.mean_nitrogen ?? 0.32).toFixed(2)}</span></div>
          </CardContent>
        </Card>

        <Card className="petri-controls-glass gap-0 py-0">
          <div className="petri-controls-topbar">
            <CardTitle className="text-sm font-semibold tracking-tight">Probe Inspector</CardTitle>
          </div>
          <CardContent className="space-y-2 pt-0 text-xs text-muted-foreground">
            <p>Use Probe, then click the dish to sample local organism and chemistry state.</p>
            <p className="text-foreground">Current tool: {tool}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
