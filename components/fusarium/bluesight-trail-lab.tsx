"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ADE20K_PXL_RECEIPT,
  OVERLAY_HZ_TARGET,
  PXL_DURATION_S,
  PXL_NATIVE_FRAMES,
  PXL_ORIGINAL_SHA256,
  PXL_SOURCE_FPS,
  TRAIL_AR_VIDEO_NAME,
  TRAIL_AR_VIDEO_PUBLIC,
  WEKA_FIXTURE_GOLDEN,
  ade20kAtTime,
  emptySession,
  hypothesizePath,
  improvePathWithTerrain,
  nativeFrameIndex,
  type ActorMode,
  type MathLogRow,
  type SensorBind,
  type TrailPath,
  type TrailSession,
} from "@/lib/fusarium/bluesight/trail-ar"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"
import { TRAIL_GLASS_PANEL, TrailGlassSection } from "@/components/fusarium/trail-glass-dock"
import { WekaCampaignPanel } from "@/components/fusarium/weka-campaign-panel"
import { extractHorizon, type HorizonLine } from "@/lib/fusarium/bluesight/horizon-line"
import { extractCorridor, smoothCorridor, type PathCorridor } from "@/lib/fusarium/bluesight/path-corridor"
import { paintTrailHud, videoContentRect } from "@/lib/fusarium/bluesight/trail-ar-hud"
import { emptyContactMemory, STEP_PLACE_MS, updateContactHud, type ContactHud, type ContactMemory } from "@/lib/fusarium/bluesight/trail-contact"
import { contourMaskIou, forgetStaleContours, refineInstanceContour, resetContourMemory } from "@/lib/fusarium/bluesight/trail-contours"
import { detectAndTrack, emptyLock, INSTANCE_CAP, type LockState } from "@/lib/fusarium/bluesight/trail-lock"
import { OVERHEAD_HOOKS, type FovBox } from "@/lib/fusarium/bluesight/trail-fov"
import { FUNGUS_LABEL_FALLBACK, fungusInFrame, fungusLitmusBox } from "@/lib/fusarium/bluesight/trail-litmus"
import { routeProgress } from "@/lib/fusarium/bluesight/trail-route"
import { nextSafeStep } from "@/lib/fusarium/bluesight/trail-next-step"
import { simChannelList, simulateAtTime, type SimFrame, type TrailMode } from "@/lib/fusarium/bluesight/trail-sim"
import {
  PAPER_FORMULA_MAP,
  decideTerrain,
  nlmBeliefFromRuntime,
  terrainState,
  type DecisionLoop,
  type NlmBelief,
} from "@/lib/fusarium/bluesight/formspace-nlm"

const VIDEO_CANDIDATES = [TRAIL_AR_VIDEO_PUBLIC, "/api/fusarium/bluesight-trail/video"]

export function BlueSightTrailLab({ surface }: { surface: "natureos" | "fusarium" }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const lastTimeRef = useRef(0)
  const tickCountRef = useRef(0)
  const hzWindowRef = useRef({ t: 0, n: 0, hz: 0 })
  const loggedFramesRef = useRef(new Set<string>())
  const pendingRowsRef = useRef<MathLogRow[]>([])
  const lastUiRef = useRef(0)
  const modeRef = useRef<TrailMode>("SIMULATION")
  const actorRef = useRef<ActorMode>("person")
  const nlmRef = useRef<NlmBelief>(nlmBeliefFromRuntime({ model_loaded: false }, { simChannels: true }))
  const loopRef = useRef(0)

  const [videoSrc, setVideoSrc] = useState(VIDEO_CANDIDATES[0])
  const [loopOn, setLoopOn] = useState(true)
  const [loopCount, setLoopCount] = useState(0)
  const [timeS, setTimeS] = useState(0)
  const [durationS, setDurationS] = useState(PXL_DURATION_S)
  const [actor, setActor] = useState<ActorMode>("person")
  const [mode, setMode] = useState<TrailMode>("SIMULATION")
  const [overlayHz, setOverlayHz] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [sensors, setSensors] = useState<SensorBind[]>([])
  const [gps, setGps] = useState<{ bind: string; lat: number | null; lon: number | null; detail: string } | null>(null)
  const [taxonomy, setTaxonomy] = useState<Record<string, string>>({})
  const [session, setSession] = useState<TrailSession>(() => emptySession(VIDEO_CANDIDATES[0], TRAIL_AR_VIDEO_NAME))
  const [logCount, setLogCount] = useState(0)
  const [arffPath, setArffPath] = useState<string>("")
  const [predArffPath, setPredArffPath] = useState<string>("")
  const [wekaMsg, setWekaMsg] = useState("not_yet_scored")
  const [error, setError] = useState("")
  const [nlmBind, setNlmBind] = useState("UNBOUND")
  const [nlmBelief, setNlmBelief] = useState<NlmBelief>(() =>
    nlmBeliefFromRuntime({ model_loaded: false }, { simChannels: true }),
  )
  const [decision, setDecision] = useState<DecisionLoop | null>(null)
  const [simFrame, setSimFrame] = useState<SimFrame>(() => simulateAtTime(0))
  const [dock, setDock] = useState({
    honesty: false,
    formspace: false,
    nlm: false,
    sensors: false,
    avani: false,
    weka: false,
    wekaCampaign: false,
    contact: false,
    path: false,
    contour: false,
    ade: false,
    loop: false,
  })
  const [contactHud, setContactHud] = useState<ContactHud | null>(null)
  const [pathSnap, setPathSnap] = useState({
    bearing: 0,
    length: 0,
    steps: 0,
    corridor: false,
    heading: null as number | null,
    vanish: false,
    horizon: false,
    boxes: 0,
  })
  const [fungusLabel, setFungusLabel] = useState(FUNGUS_LABEL_FALLBACK)
  const [loopRefine, setLoopRefine] = useState({
    loop: 0,
    box_scale: 1,
    plant_cap: 12,
    step_sway: 1,
    contour_iou: null as number | null,
  })
  const fovRef = useRef<FovBox[]>([])
  const lockRef = useRef<LockState>(emptyLock())
  const overheadRef = useRef<HTMLImageElement | null>(null)
  const lastSensorTickRef = useRef(0)
  const sampleRef = useRef<HTMLCanvasElement | null>(null)
  const corridorRef = useRef<PathCorridor | null>(null)
  const horizonRef = useRef<HorizonLine | null>(null)
  const contactMemRef = useRef<ContactMemory>(emptyContactMemory())
  const contactHudRef = useRef<ContactHud | null>(null)
  const prevContoursRef = useRef<[number, number][][]>([])

  const nativeFrame = nativeFrameIndex(timeS)
  const ade = useMemo(() => ade20kAtTime(timeS), [timeS])
  const simChannels = useMemo(() => (mode === "SIMULATION" ? simChannelList(simFrame) : []), [mode, simFrame])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    actorRef.current = actor
  }, [actor])
  useEffect(() => {
    nlmRef.current = nlmBelief
  }, [nlmBelief])
  useEffect(() => {
    loopRef.current = loopCount
  }, [loopCount])

  useEffect(() => {
    void fetch("/api/fusarium/bluesight-trail/sensors")
      .then((r) => r.json())
      .then((j) => setSensors(j.sensors ?? []))
      .catch(() => setSensors([]))
    void fetch("/api/fusarium/bluesight-trail/gps")
      .then((r) => r.json())
      .then(setGps)
      .catch(() => setGps({ bind: "UNBOUND", lat: null, lon: null, detail: "GPS probe failed" }))
    void fetch("/api/fusarium/bluesight-trail/math-log")
      .then((r) => r.json())
      .then((j) => {
        setLogCount(j.row_count ?? 0)
        setArffPath(j.arff_path ?? "")
        setPredArffPath(j.prediction_arff_path ?? "")
        setWekaMsg(j.score_status ?? "not_yet_scored")
      })
      .catch(() => undefined)
    void fetch("/api/fusarium/bluesight-trail/nlm")
      .then((r) => r.json())
      .then((j) => {
        setNlmBind(j.bind ?? "UNBOUND")
        const runtime = j.belief ?? j.runtime ?? {}
        setNlmBelief(
          nlmBeliefFromRuntime(
            {
              model_loaded: Boolean(j.belief?.model_loaded ?? runtime.model_loaded ?? j.bind === "BOUND"),
              weights_sha256: j.belief?.weights_sha256 ?? runtime.weights_sha256 ?? null,
              parameter_count: j.belief?.parameter_count ?? runtime.parameter_count ?? null,
              architecture_family: j.belief?.architecture_family ?? runtime.architecture_family ?? null,
            },
            { simChannels: modeRef.current === "SIMULATION" },
          ),
        )
      })
      .catch(() => setNlmBind("UNBOUND"))
    for (const q of ["tree", "plant", "rock", "earth"]) {
      void fetch(`/api/fusarium/bluesight-trail/taxonomy?q=${q}&kind=${q === "rock" ? "rock" : "plant"}`)
        .then((r) => r.json())
        .then((j) => setTaxonomy((prev) => ({ ...prev, [q]: j.label })))
        .catch(() => setTaxonomy((prev) => ({ ...prev, [q]: "unknown / not in MINDEX" })))
    }
    void fetch("/api/fusarium/bluesight-trail/taxonomy?q=Auricularia&kind=plant")
      .then((r) => r.json())
      .then((j) => {
        const hit = typeof j.label === "string" && !String(j.label).startsWith("unknown")
        setFungusLabel(
          hit
            ? { common: "elf ear / wood ear", taxon: j.label, source: "MINDEX/iNat" }
            : FUNGUS_LABEL_FALLBACK,
        )
      })
      .catch(() => setFungusLabel(FUNGUS_LABEL_FALLBACK))
    const img = new Image()
    img.onload = () => {
      overheadRef.current = img
    }
    let hook = 0
    img.onerror = () => {
      hook += 1
      if (hook < OVERHEAD_HOOKS.length) img.src = OVERHEAD_HOOKS[hook]
    }
    img.src = OVERHEAD_HOOKS[0]
  }, [])

  useEffect(() => {
    setNlmBelief((prev) =>
      nlmBeliefFromRuntime(
        {
          model_loaded: prev.model_loaded,
          weights_sha256: prev.weights_sha256,
          parameter_count: prev.parameter_count,
          architecture_family: prev.architecture_family,
        },
        { simChannels: mode === "SIMULATION" },
      ),
    )
  }, [mode])

  const flushLogs = useCallback(async () => {
    const rows = pendingRowsRef.current.splice(0, pendingRowsRef.current.length)
    if (!rows.length) return
    const res = await fetch("/api/fusarium/bluesight-trail/math-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, seed: "itdx-pxl-20260913-v16" }),
    })
    const json = await res.json()
    setLogCount(json.row_count ?? 0)
    setArffPath(json.arff_path ?? "")
    setPredArffPath(json.prediction_arff_path ?? "")
    setWekaMsg(json.score_status ?? "not_yet_scored")
  }, [])

  const logNativeFrame = useCallback(
    (path: TrailPath, measuredHz: number, loop: number, t: number, sim: SimFrame | null) => {
      const frame = nativeFrameIndex(t)
      const key = `${loop}-${frame}`
      if (loggedFramesRef.current.has(key)) return
      loggedFramesRef.current.add(key)
      const adeRow = ade20kAtTime(t)
      const currentActor = actorRef.current
      const belief = nlmRef.current
      const isSim = modeRef.current === "SIMULATION"
      const Ft = terrainState({
        actor: currentActor,
        video_time_s: t,
        earth: adeRow.classes.earth ?? 0,
        tree: adeRow.classes.tree ?? 0,
        rock: adeRow.classes.rock ?? 0,
        plant: adeRow.classes.plant ?? 0,
        bearing_deg: path.bearing_deg,
        ade_record: adeRow.record_id,
        nlm_sha: belief.weights_sha256,
        channel_source: isSim ? "simulation" : "absent",
      })
      const loopDecision = decideTerrain(belief, Ft)
      const row: MathLogRow = {
        schema: "itdx-trail-math-log/v1",
        live: false,
        forecast_p: null,
        at: new Date().toISOString(),
        loop,
        video_time_s: t,
        native_frame: frame,
        overlay_tick: tickCountRef.current,
        source_fps: PXL_SOURCE_FPS,
        overlay_hz_target: OVERLAY_HZ_TARGET,
        overlay_hz_measured: measuredHz,
        navigation_status: "HOLD",
        actor: currentActor,
        path_bearing_deg: path.bearing_deg,
        path_length_px: path.length_px,
        perimeter_px: path.perimeter_px,
        step_count: path.steps.length,
        ade20k: adeRow,
        detector_status: "SIDECAR_UNBOUND",
        detection_count: 0,
        formspace_cell: Ft.prototype_cell,
        novelty_r: Ft.novelty_r,
        elapsed_ell: Ft.elapsed_ell,
        avani: loopDecision.dt,
        nlm_weights_sha256: belief.weights_sha256,
        nlm_abstained: belief.abstained,
        sim: isSim,
        mode: modeRef.current,
        temperature_c: sim?.nlm.temperature_c.value,
        humidity_pct: sim?.nlm.humidity_pct.value,
        pressure_hpa: sim?.nlm.pressure_hpa.value,
        gas_resistance_ohm: sim?.nlm.gas_resistance_ohm.value,
        iaq: sim?.nlm.iaq.value,
        fci_strength: sim?.nlm.fci_strength.value,
        audio_level: sim?.nlm.audio_level.value,
        depth_m: sim?.depth_m.value,
        gps_lat: sim?.gps.lat,
        gps_lon: sim?.gps.lon,
      }
      pendingRowsRef.current.push(row)
      if (pendingRowsRef.current.length >= 15) void flushLogs()
      return loopDecision
    },
    [flushLogs],
  )

  useEffect(() => {
    let alive = true
    let raf = 0
    const tick = () => {
      if (!alive) return
      ;(window as Window & { __trailTick?: { n: number; cw: number; ch: number } }).__trailTick = {
        n: tickCountRef.current,
        cw: canvasRef.current?.width ?? 0,
        ch: canvasRef.current?.height ?? 0,
      }
      try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const box = boxRef.current
      if (video && canvas && box) {
        const cssW = box.clientWidth || video.clientWidth || 360
        const cssH = box.clientHeight || video.clientHeight || 640
        const dpr = window.devicePixelRatio || 1
        const fitted = videoContentRect(video, cssW, cssH)
        const bw = Math.max(2, Math.round(fitted.w * dpr))
        const bh = Math.max(2, Math.round(fitted.h * dpr))
        canvas.style.left = `${fitted.x}px`
        canvas.style.top = `${fitted.y}px`
        canvas.style.width = `${fitted.w}px`
        canvas.style.height = `${fitted.h}px`
        if (canvas.width !== bw) canvas.width = bw
        if (canvas.height !== bh) canvas.height = bh
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          const now = performance.now()
          hzWindowRef.current.n += 1
          if (now - hzWindowRef.current.t >= 500) {
            const hz = (hzWindowRef.current.n * 1000) / Math.max(1, now - hzWindowRef.current.t)
            hzWindowRef.current = { t: now, n: 0, hz }
          }
          tickCountRef.current += 1
          const t = video.currentTime || 0
          if (t + 0.35 < lastTimeRef.current) {
            loopRef.current += 1
            resetContourMemory()
            lockRef.current = emptyLock()
            corridorRef.current = null
            contactMemRef.current = emptyContactMemory()
            setLoopCount(loopRef.current)
            setLoopRefine((prev) => ({
              ...prev,
              loop: loopRef.current,
              box_scale: Math.max(0.7, 1 - loopRef.current * 0.08),
              plant_cap: Math.max(6, 12 - loopRef.current * 2),
              step_sway: Math.max(0.55, 1 - loopRef.current * 0.12),
            }))
          }
          lastTimeRef.current = t
          if (video.duration && Number.isFinite(video.duration)) setDurationS(video.duration)

          const vw = video.videoWidth || 1080
          const vh = video.videoHeight || 1920
          const tNorm = video.duration ? t / video.duration : t / PXL_DURATION_S
          const earth = ade20kAtTime(t).classes.earth
          const pathPx = improvePathWithTerrain(hypothesizePath(vw, vh, tNorm), earth)
          const isSim = modeRef.current === "SIMULATION"
          const sim = isSim ? simulateAtTime(t) : null
          const nextDecision = logNativeFrame(pathPx, hzWindowRef.current.hz, loopRef.current, t, sim)
          const rect = { x: 0, y: 0, w: fitted.w, h: fitted.h }
          const fungus = fungusLitmusBox(t, fungusLabel)
          const next = sim && !fungusInFrame(t) ? nextSafeStep(t, sim) : null

          if (!sampleRef.current) sampleRef.current = document.createElement("canvas")
          const sample = sampleRef.current
          const sw = 240
          const sh = 426
          if (sample.width !== sw) sample.width = sw
          if (sample.height !== sh) sample.height = sh
          const sctx = sample.getContext("2d", { willReadFrequently: true })
          let contours: { id: string; kind: string; pts: [number, number][] }[] = []
          if (sctx && video.videoWidth > 0 && video.readyState >= 1) {
            sctx.drawImage(video, 0, 0, sw, sh)
            const pixels = sctx.getImageData(0, 0, sw, sh)
            lockRef.current = detectAndTrack(pixels.data, sw, sh, t, lockRef.current)
            fovRef.current = lockRef.current.boxes
            if (fungus) fovRef.current = [fungus, ...fovRef.current.filter((b) => b.id !== fungus.id)]
            corridorRef.current = smoothCorridor(
              corridorRef.current,
              extractCorridor(pixels.data, sw, sh, corridorRef.current),
            )
            horizonRef.current = extractHorizon(pixels.data, sw, sh, horizonRef.current)
            const contactTick = updateContactHud(
              pixels.data,
              sw,
              sh,
              corridorRef.current,
              contactMemRef.current,
              now,
            )
            contactMemRef.current = contactTick.memory
            contactHudRef.current = contactTick.hud
            contours = fovRef.current.slice(0, INSTANCE_CAP).map((box) => ({
              id: box.id,
              kind: box.kind,
              pts: refineInstanceContour(pixels.data, sw, sh, box.id, box, loopRef.current).pts,
            }))
            forgetStaleContours(new Set(fovRef.current.map((box) => box.id)))
            const ious = contours
              .map((c, i) => contourMaskIou(c.pts, prevContoursRef.current[i] ?? []))
              .filter((v): v is number => v != null)
            if (ious.length) {
              const mean = ious.reduce((a, b) => a + b, 0) / ious.length
              setLoopRefine((prev) => ({ ...prev, contour_iou: mean }))
            }
            prevContoursRef.current = contours.map((c) => c.pts)
          }

          if (isSim && sim) {
            try {
              paintTrailHud(
                ctx,
                rect,
                { corridor: corridorRef.current, horizon: horizonRef.current, contours },
                sim,
                actorRef.current,
                next,
                fovRef.current,
                overheadRef.current,
                fungusInFrame(t),
                contactHudRef.current,
              )
            } catch {
              ctx.clearRect(0, 0, rect.w, rect.h)
            }
          } else {
            ctx.clearRect(0, 0, fitted.w, fitted.h)
            ctx.fillStyle = "rgba(3,19,28,0.82)"
            ctx.fillRect(rect.x + 10, rect.y + 10, rect.w - 20, 48)
            ctx.strokeStyle = "#ffb020"
            ctx.strokeRect(rect.x + 10, rect.y + 10, rect.w - 20, 48)
            ctx.fillStyle = "#ffd27a"
            ctx.font = "700 14px ui-monospace, Consolas, monospace"
            ctx.fillText("REAL · no live BFF bind · empty stays empty", rect.x + 22, rect.y + 40)
          }

          const overlayDbg = {
            t,
            canvas: { w: canvas.width, h: canvas.height, cssW: fitted.w, cssH: fitted.h, dpr },
            clocks: { objects: "raf", steps_place_ms: STEP_PLACE_MS, instance_cap: INSTANCE_CAP },
            nContours: contours.length,
            contours: contours.slice(0, 16).map((c) => {
              let sx = 0
              let sy = 0
              for (const [x, y] of c.pts) {
                sx += x
                sy += y
              }
              const n = c.pts.length || 1
              return { id: c.id, kind: c.kind, cx: sx / n, cy: sy / n, n: c.pts.length }
            }),
            corridor: corridorRef.current
              ? {
                  n: corridorRef.current.left.length,
                  left0: corridorRef.current.left[0],
                  right0: corridorRef.current.right[0],
                  leftN: corridorRef.current.left[corridorRef.current.left.length - 1],
                  rightN: corridorRef.current.right[corridorRef.current.right.length - 1],
                }
              : null,
            steps: (contactHudRef.current?.patches ?? []).map((p) => ({
              id: p.id,
              tone: p.tone,
              cx: p.quad.cx,
              cy: p.quad.cy,
              xCode: p.xCode,
            })),
          }
          ;(window as Window & { __trailOverlay?: typeof overlayDbg }).__trailOverlay = overlayDbg

          if (now - lastUiRef.current > 100) {
            lastUiRef.current = now
            setTimeS(t)
            setOverlayHz(hzWindowRef.current.hz)
            if (sim) setSimFrame(sim)
            if (nextDecision) setDecision(nextDecision)
            setContactHud(contactHudRef.current)
            setPathSnap({
              bearing: pathPx.bearing_deg,
              length: pathPx.length_px,
              steps: pathPx.steps.length,
              corridor: Boolean(corridorRef.current),
              heading: corridorRef.current?.heading_rad ?? null,
              vanish: Boolean(corridorRef.current?.vanish),
              horizon: Boolean(horizonRef.current),
              boxes: fovRef.current.length,
            })
          }
        }
      }
      } catch {
        /* keep the overlay loop alive — a single detect/paint throw must not freeze contours */
      } finally {
        if (alive) raf = window.requestAnimationFrame(tick)
      }
    }
    raf = window.requestAnimationFrame(tick)
    return () => {
      alive = false
      window.cancelAnimationFrame(raf)
    }
  }, [logNativeFrame])

  async function exportWeka() {
    await flushLogs()
    const res = await fetch("/api/fusarium/bluesight-trail/weka", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...session, loop_count: loopCount, duration_s: durationS }),
    })
    const json = await res.json()
    setArffPath(json.arff_path ?? arffPath)
    setWekaMsg(json.weka?.ran ? "weka_instances_loaded" : "not_yet_scored")
  }

  async function persistSession() {
    const next: TrailSession = {
      ...session,
      loop_count: loopCount,
      duration_s: durationS,
      video_sha256: PXL_ORIGINAL_SHA256,
    }
    setSession(next)
    await fetch("/api/fusarium/bluesight-trail/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
    await flushLogs()
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  function toggleDock(id: keyof typeof dock) {
    setDock((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-dvh bg-[#031018] text-zinc-100">
      <div className="border-b border-amber-400/50 bg-amber-500/15 px-4 py-2 text-xs sm:text-sm">
        <strong className="tracking-widest">{mode}</strong>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="font-mono">live: false</span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="tracking-widest">SYNTHETIC EXERCISE</span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="font-mono">forecast_p: null</span>
        <span className="mx-2 text-zinc-500">·</span>
        <span>
          {surface} Trail AR · {TRAIL_AR_VIDEO_NAME}
        </span>
        <span className="mx-2 text-zinc-500">·</span>
        <a href="/fusarium/itdx/v2" className="underline underline-offset-2">
          ITDX 2.0 board
        </a>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(280px,1fr)_minmax(320px,1fr)]">
        <section className="relative bg-black">
          <div ref={boxRef} className="relative mx-auto aspect-[9/16] w-full max-w-[520px] overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={videoSrc}
              className="absolute inset-0 z-0 h-full w-full object-contain"
              playsInline
              loop={loopOn}
              autoPlay
              muted
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => {
                const next = VIDEO_CANDIDATES.find((src) => src !== videoSrc)
                if (next) setVideoSrc(next)
                else setError("PXL clip failed to play. HEVC may need H.264 playback.")
              }}
            />
            <canvas
              ref={canvasRef}
              data-testid="trail-overlay-canvas"
              width={1080}
              height={1920}
              className="pointer-events-none absolute z-20"
              style={{ left: 0, top: 0, width: "100%", height: "100%" }}
            />
            <div
              data-testid="bluesight-trail-overhead-map"
              className="pointer-events-none absolute z-30 overflow-hidden rounded-lg border border-white/30 opacity-100"
              style={{
                width: "min(138px, 36%)",
                height: "min(138px, 36%)",
                right: 10,
                bottom: 12,
                backgroundColor: "#0c1418",
              }}
            >
              <img
                src="/fusarium/bluesight/trail-overhead.jpg?map=20260914-overhead"
                alt="Overhead trail corridor, red path only"
                className="h-full w-full max-w-none opacity-100"
                style={{
                  objectFit: "cover",
                  objectPosition: "39.8% 54%",
                  transform: "scale(3.8)",
                  transformOrigin: "39.8% 54%",
                }}
              />
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <polyline
                  fill="none"
                  stroke="#39ff6a"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  points={routeProgress(durationS ? timeS / durationS : 0)
                    .segment_pct.map(([x, y]) => `${x},${y}`)
                    .join(" ")}
                />
                <circle
                  cx={routeProgress(durationS ? timeS / durationS : 0).map_pct[0]}
                  cy={routeProgress(durationS ? timeS / durationS : 0).map_pct[1]}
                  r="3.4"
                  fill="#e8ff6a"
                  stroke="#111"
                  strokeWidth="0.6"
                />
              </svg>
              <span className="absolute left-2 top-1 font-mono text-[9px] text-white/75">ABOVE</span>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 z-30 font-mono text-[10px] text-cyan-100">
              loop {loopCount} · {timeS.toFixed(2)} / {durationS.toFixed(2)}s
              <br />
              source_fps {PXL_SOURCE_FPS} · overlay {overlayHz.toFixed(0)}/{OVERLAY_HZ_TARGET} Hz · frame {nativeFrame}/
              {PXL_NATIVE_FRAMES}
            </div>
          </div>
          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap">
            <GlassButton onClick={togglePlay}>{playing ? "Pause" : "Play"}</GlassButton>
            <GlassButton onClick={() => setMode((m) => (m === "SIMULATION" ? "REAL" : "SIMULATION"))}>
              Mode: {mode}
            </GlassButton>
            <GlassButton onClick={() => setActor((a) => (a === "person" ? "robot" : "person"))}>
              Actor: {actor}
            </GlassButton>
            <GlassButton onClick={() => setLoopOn((v) => !v)}>Loop {loopOn ? "on" : "off"}</GlassButton>
            <GlassButton onClick={() => void persistSession()}>Persist session</GlassButton>
          </div>
          {error ? <p className="px-3 pb-2 text-sm text-red-400">{error}</p> : null}
        </section>

        <aside className="max-h-[100dvh] overflow-y-auto border-t border-white/10 bg-black/25 p-4 backdrop-blur-xl lg:border-l lg:border-t-0">
          <div className={`${TRAIL_GLASS_PANEL} mb-3`}>
            <GlassChip>ITDX MATH CONSOLE</GlassChip>
            <p className="mt-2 font-mono text-xs text-zinc-300">
              {mode} · live: false · not a live COP
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Overlay interpolates at {OVERLAY_HZ_TARGET} Hz; the file is {PXL_SOURCE_FPS} fps / {PXL_NATIVE_FRAMES}{" "}
              frames / {PXL_DURATION_S}s.
            </p>
          </div>

          <TrailGlassSection
            id="honesty"
            title="Honesty / live flag"
            peek={`${mode} · live: false · forecast_p: null`}
            open={dock.honesty}
            onToggle={() => toggleDock("honesty")}
          >
            <p className="font-mono">
              {mode} · live: false · SYNTHETIC EXERCISE · forecast_p: null
            </p>
            <p>
              source_fps {PXL_SOURCE_FPS} · overlay {overlayHz.toFixed(1)}/{OVERLAY_HZ_TARGET} Hz · logged {logCount} frames
            </p>
            <p className="break-all text-[10px] text-zinc-500">video sha {PXL_ORIGINAL_SHA256}</p>
          </TrailGlassSection>

          <TrailGlassSection
            id="formspace"
            title="FormSpace"
            peek={`${mode} · live: false · F_t cell ${decision?.Ft.prototype_cell ?? "—"} · r ${decision?.Ft.novelty_r?.toFixed(3) ?? "—"}`}
            open={dock.formspace}
            onToggle={() => toggleDock("formspace")}
          >
            <p className="font-mono">
              F_t cell {decision?.Ft.prototype_cell ?? "—"} · r {decision?.Ft.novelty_r?.toFixed(3) ?? "—"} · ℓ{" "}
              {decision?.Ft.elapsed_ell?.toFixed(4) ?? "—"}
            </p>
            <p className="font-mono">
              earth {decision?.Ft.earth_pct ?? ade.classes.earth ?? "—"} · tree {decision?.Ft.tree_pct ?? ade.classes.tree ?? "—"} ·
              rock {decision?.Ft.rock_pct ?? ade.classes.rock ?? "—"} · plant {decision?.Ft.plant_pct ?? ade.classes.plant ?? "—"}
            </p>
            <p className="text-zinc-500">Appearance chart only. Not live terrain. {mode} · live: false.</p>
            <ul className="space-y-1 font-mono text-[10px] text-zinc-400">
              {PAPER_FORMULA_MAP.filter((row) => row.symbol.startsWith("F") || row.symbol.startsWith("ℓ") || row.symbol.startsWith("c(")).map(
                (row) => (
                  <li key={row.symbol}>
                    {row.paper}: {row.symbol} → {row.code}
                  </li>
                ),
              )}
            </ul>
          </TrailGlassSection>

          <TrailGlassSection
            id="nlm"
            title="NLM"
            peek={`${mode} · live: false · ${nlmBind} · ${nlmBelief.abstained ? "ABSTAIN" : "channels · p null"}`}
            open={dock.nlm}
            onToggle={() => toggleDock("nlm")}
          >
            <p className="font-mono">
              NLM {nlmBind} · loaded {String(nlmBelief.model_loaded)} · ollama {String(nlmBelief.bound_to_ollama)}
            </p>
            <p className="break-all font-mono text-[10px] text-zinc-500">weights {nlmBelief.weights_sha256 ?? "unbound"}</p>
            <p className="font-mono">
              b_t {nlmBelief.abstained ? "ABSTAIN (no pattern p)" : "channels present · p null"} · params{" "}
              {nlmBelief.parameter_count ?? "—"}
            </p>
            <p className="text-zinc-500">{nlmBelief.reason}</p>
          </TrailGlassSection>

          <TrailGlassSection
            id="sensors"
            title="Simulated channels / sensors"
            peek={
              mode === "SIMULATION"
                ? `${mode} · live: false · ${simChannels.length} sim channels · GPS sim`
                : `${mode} · live: false · empty real channels · GPS ${gps?.bind ?? "UNBOUND"}`
            }
            open={dock.sensors}
            onToggle={() => toggleDock("sensors")}
          >
            {mode === "SIMULATION" ? (
              <ul className="space-y-1 font-mono text-[10px] text-zinc-300">
                {simChannels.map((ch) => (
                  <li key={ch.id}>
                    {ch.label}: {ch.value.toFixed(ch.unit === "Ω" ? 0 : 2)} {ch.unit} · bounds {ch.lo}–{ch.hi} · source:{" "}
                    {ch.source}
                  </li>
                ))}
                <li>
                  GPS: {simFrame.gps.lat.toFixed(6)}, {simFrame.gps.lon.toFixed(6)} · source: simulation
                </li>
                <li className="text-zinc-500">{simFrame.gps.note}</li>
                <li className="text-zinc-500">YOLO26+SAHI: unbound · no real detections</li>
                <li className="text-zinc-500">forecast_p: null (188 did not emit p)</li>
              </ul>
            ) : (
              <ul className="space-y-1 font-mono text-[10px] text-zinc-300">
                <li>NLM 7 scalars: empty (no live BFF)</li>
                <li>Depth / ToF / LiDAR: empty</li>
                <li>IMU / VOC / BME / radar / WiFi Sense: empty</li>
                <li>
                  GPS EXIF: {gps?.bind ?? "UNBOUND"} · lat {gps?.lat ?? "null"} lon {gps?.lon ?? "null"}
                </li>
              </ul>
            )}
            <p className="mt-2 font-mono text-zinc-400">
              BFF GPS {gps?.bind ?? "UNBOUND"} · lat {gps?.lat ?? "null"} lon {gps?.lon ?? "null"}
            </p>
            <ul className="mt-1 space-y-1 font-mono text-[10px] text-zinc-400">
              {sensors.map((s) => (
                <li key={s.id}>
                  {s.label}: {s.bind}
                </li>
              ))}
            </ul>
          </TrailGlassSection>

          <TrailGlassSection
            id="avani"
            title="AVANI"
            peek={`${mode} · live: false · d_t ${decision?.dt ?? (mode === "SIMULATION" ? "REVIEW" : "PAUSE")}`}
            open={dock.avani}
            onToggle={() => toggleDock("avani")}
          >
            <p className="font-mono">
              d_t {decision?.dt ?? (mode === "SIMULATION" ? "REVIEW" : "PAUSE")} · a* {decision?.a_star ?? "HOLD"} · u_t none
            </p>
            <p className="text-zinc-500">
              Simulation stays REVIEW. Missing live BFF stays PAUSE. Not a live deny/pass gate.
            </p>
          </TrailGlassSection>

          <TrailGlassSection
            id="weka"
            title="WEKA"
            peek={`${mode} · live: false · ${wekaMsg}`}
            open={dock.weka}
            onToggle={() => toggleDock("weka")}
          >
            <p className="font-mono">trail score {wekaMsg} · logged {logCount}</p>
            <p className="text-zinc-500">
              Fixture golden (not this trail): {WEKA_FIXTURE_GOLDEN.correct_pixels}/{WEKA_FIXTURE_GOLDEN.labeled_pixels}
            </p>
            <GlassButton onClick={() => void exportWeka()}>Export WEKA ARFF</GlassButton>
            <p className="break-all font-mono text-[10px] text-zinc-500">
              Feature: {arffPath || ".data/trail-ar/weka/trail-ar-session.arff"}
            </p>
            <p className="break-all font-mono text-[10px] text-zinc-500">
              Prediction: {predArffPath || ".data/trail-ar/weka/trail-ar-predictions.arff"}
            </p>
            <p>
              WEKA rows tag <code>sim=true</code> in simulation. Prediction ARFF keeps p and actual as <code>?</code>. Do
              not train J48 as NLM. Trail score is <strong>not yet scored</strong>.
            </p>
          </TrailGlassSection>

          <WekaCampaignPanel
            open={dock.wekaCampaign}
            onToggle={() => toggleDock("wekaCampaign")}
          />

          <TrailGlassSection
            id="contact"
            title="Contact scores"
            peek={`${mode} · live: false · ${contactHud?.patches.length ?? 0} patches · depth ${contactHud?.depth_bind ?? "UNBOUND"}`}
            open={dock.contact}
            onToggle={() => toggleDock("contact")}
          >
            <p className="font-mono">
              {contactHud?.banner.line ?? "ANALYSING TERRAIN"} · {contactHud?.banner.search ?? "CONTACT SEARCH"} · pips{" "}
              {contactHud?.banner.pips ?? 0}
            </p>
            <p className="font-mono">
              source {contactHud?.source ?? "path-mask-flow"} · depth {contactHud?.depth_bind ?? "UNBOUND"} · swing{" "}
              {contactHud?.swing ?? "—"}
            </p>
            <ul className="space-y-1 font-mono text-[10px]">
              {(contactHud?.patches ?? []).map((patch) => (
                <li key={patch.id}>
                  {patch.foot}
                  {patch.slot} {patch.tone} {patch.meters.toFixed(2)}m · {patch.label}
                  {patch.xCode ? ` · ${patch.xCode}` : ""}
                </li>
              ))}
            </ul>
            <p className="text-zinc-500">Path-mask flow on the replay. Not a live COP. {mode} · live: false.</p>
          </TrailGlassSection>

          <TrailGlassSection
            id="path"
            title="Path / contour"
            peek={`${mode} · live: false · corridor ${pathSnap.corridor ? "on" : "off"} · heading ${pathSnap.heading?.toFixed(2) ?? "—"}`}
            open={dock.path}
            onToggle={() => toggleDock("path")}
          >
            <p className="font-mono">
              bearing {pathSnap.bearing.toFixed(1)}° · length {pathSnap.length.toFixed(0)}px · steps {pathSnap.steps}
            </p>
            <p className="font-mono">
              corridor {pathSnap.corridor ? "frame-luma-edge" : "off"} · vanish {String(pathSnap.vanish)} · horizon{" "}
              {String(pathSnap.horizon)}
            </p>
            <p className="text-zinc-500">Image-space pathway hypothesis. Not metric footholds. {mode} · live: false.</p>
          </TrailGlassSection>

          <TrailGlassSection
            id="contour"
            title="Contour"
            peek={`${mode} · live: false · iou ${loopRefine.contour_iou?.toFixed(3) ?? "—"} · boxes ${pathSnap.boxes}`}
            open={dock.contour}
            onToggle={() => toggleDock("contour")}
          >
            <p className="font-mono">
              mean mask IoU {loopRefine.contour_iou?.toFixed(3) ?? "—"} · boxes {pathSnap.boxes} · box_scale{" "}
              {loopRefine.box_scale.toFixed(2)}
            </p>
            <p className="text-zinc-500">Replay contours only. Not a live instance lock. {mode} · live: false.</p>
          </TrailGlassSection>

          <TrailGlassSection
            id="ade"
            title="ADE20K receipt"
            peek={`${mode} · live: false · ${ade.record_id} · t≈${ade.t}s`}
            open={dock.ade}
            onToggle={() => toggleDock("ade")}
          >
            <p className="font-mono">
              {ade.record_id} · t≈{ade.t}s · {ade.nav}
            </p>
            <ul className="font-mono text-zinc-300">
              {Object.entries(ade.classes).map(([name, pct]) => (
                <li key={name}>
                  {name} {pct}% · ID {taxonomy[name] || "unknown / not in MINDEX"}
                </li>
              ))}
            </ul>
            <p className="text-zinc-500">Laptop table ({ADE20K_PXL_RECEIPT.length} times). Appearance classes, not species.</p>
          </TrailGlassSection>

          <TrailGlassSection
            id="loop"
            title="Loop refine"
            peek={`${mode} · live: false · loop ${loopCount} · plant_cap ${loopRefine.plant_cap}`}
            open={dock.loop}
            onToggle={() => toggleDock("loop")}
          >
            <p className="font-mono">
              loop {loopCount} · box_scale {loopRefine.box_scale.toFixed(2)} · plant_cap {loopRefine.plant_cap} · step_sway{" "}
              {loopRefine.step_sway.toFixed(2)}
            </p>
            <p className="text-zinc-500">Replay loop counters. {mode} · live: false.</p>
          </TrailGlassSection>
        </aside>
      </div>
    </div>
  )
}
