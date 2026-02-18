/**
 * ObservationEarthPortal - Feb 2026
 *
 * A portal modal using CesiumJS for real satellite imagery (same as Earth Simulator).
 * Opens immediately showing a loading state, starts Cesium the moment we have
 * both the DOM container and the first observation coordinate.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  X, MapPin, Globe, Calendar, User, Leaf, Dna, FlaskConical,
  ChevronRight, ExternalLink, Loader2, ZoomIn, ZoomOut, RotateCcw, Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LocationResult } from "./LocationWidget"
import { useSearchContext } from "@/components/search/SearchContextProvider"

// ─── Cesium loader (cached after first load) ──────────────────────────────────
async function loadCesiumJS(): Promise<any> {
  if ((window as any).Cesium) return (window as any).Cesium

  if (!document.querySelector('link[href*="cesium"]')) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/cesium@1.115.0/Build/Cesium/Widgets/widgets.css"
    document.head.appendChild(link)
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://unpkg.com/cesium@1.115.0/Build/Cesium/Cesium.js"
    script.onload = () => resolve()
    script.onerror = () => {
      const s2 = document.createElement("script")
      s2.src = "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Cesium.js"
      s2.onload = () => resolve()
      s2.onerror = reject
      document.head.appendChild(s2)
    }
    document.head.appendChild(script)
  })

  ;(window as any).CESIUM_BASE_URL = "https://unpkg.com/cesium@1.115.0/Build/Cesium/"
  return (window as any).Cesium
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ObservationEarthPortalProps {
  observation?: LocationResult
  observations?: LocationResult[]
  observationsLoading?: boolean
  title?: string
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ObservationEarthPortal({
  observation,
  observations: _observations,
  observationsLoading = false,
  title,
  onClose,
}: ObservationEarthPortalProps) {
  const obsArray: LocationResult[] = _observations?.length
    ? _observations
    : observation ? [observation] : []

  // ── ALL hooks must be called unconditionally (Rules of Hooks) ─────────────
  const [mounted,     setMounted]     = useState(false)
  const [selIdx,      setSelIdx]      = useState(0)
  const [cesiumOk,    setCesiumOk]    = useState(false)
  const [cesiumError, setCesiumError] = useState<string | null>(null)
  const [loadingMsg,  setLoadingMsg]  = useState("Loading Earth Simulator…")

  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef    = useRef<any>(null)
  const initKey      = useRef(0)   // increment to re-init after obs arrive
  const ctx          = useSearchContext()

  const obs = obsArray[Math.min(selIdx, Math.max(0, obsArray.length - 1))] ?? null

  // Mount flag (SSR safe)
  useEffect(() => { setMounted(true) }, [])

  // Scroll lock + Escape key
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [mounted, onClose])

  // ── Main Cesium init — runs when we have container + first observation ─────
  useEffect(() => {
    if (!mounted) return
    if (!containerRef.current) return
    if (!obs) return   // wait until first observation is available

    let destroyed = false
    setCesiumOk(false)
    setCesiumError(null)
    setLoadingMsg("Loading satellite imagery…")

    const init = async () => {
      try {
        const Cesium = await loadCesiumJS()
        if (destroyed) return

        Cesium.Ion.defaultAccessToken = undefined
        setLoadingMsg("Initialising globe…")

        const viewer = new Cesium.Viewer(containerRef.current!, {
          baseLayerPicker:         false,
          imageryProvider:         false,
          vrButton:                false,
          geocoder:                false,
          homeButton:              false,
          infoBox:                 true,
          sceneModePicker:         false,
          selectionIndicator:      false,
          timeline:                false,
          animation:               false,
          fullscreenButton:        false,
          navigationHelpButton:    false,
          shouldAnimate:           false,
          requestRenderMode:       false,   // always render — ensures pins & imagery show
          creditContainer: document.createElement("div"),
        })

        viewerRef.current = viewer

        // Camera: Google Earth-style controls
        // Left drag = rotate/orbit, Right drag = zoom, Scroll = zoom, Middle = pan
        const ctrl = viewer.scene.screenSpaceCameraController
        ctrl.enableRotate    = true   // Left-click drag to orbit the globe
        ctrl.enableTilt      = true   // Ctrl + left-drag to tilt
        ctrl.enableLook      = false
        ctrl.enableTranslate = true   // Middle-click drag to pan
        ctrl.enableZoom      = true   // Right-click drag + scroll to zoom

        // Double-click zooms in ×4
        viewer.screenSpaceEventHandler.setInputAction(
          (event: any) => {
            const cartesian = viewer.scene.pickPosition(event.position)
            viewer.camera.flyTo({
              destination: cartesian || Cesium.Cartesian3.fromDegrees(obs.lng, obs.lat, 2000),
              orientation: { heading: viewer.camera.heading, pitch: viewer.camera.pitch, roll: 0 },
              duration: 0.6,
            })
          },
          Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
        )

        // Satellite imagery
        try {
          const esri = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
          )
          viewer.imageryLayers.addImageryProvider(esri)
        } catch {
          try {
            const ne = await Cesium.TileMapServiceImageryProvider.fromUrl(
              Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
            )
            viewer.imageryLayers.addImageryProvider(ne)
          } catch { /* no imagery — that's ok */ }
        }

        if (destroyed) { viewer.destroy(); return }

        // Add all observation pins
        obsArray.forEach((o, i) => {
          if (!o.lat || !o.lng) return
          const isFirst = i === 0
          const color   = isFirst
            ? Cesium.Color.fromCssColorString("#22c55e")
            : Cesium.Color.fromCssColorString("#0ea5e9")

          viewer.entities.add({
            id: `obs-${o.id}`,
            position: Cesium.Cartesian3.fromDegrees(o.lng, o.lat, 50),
            point: {
              pixelSize:   isFirst ? 14 : 9,
              color,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            label: {
              text: o.commonName || o.speciesName,
              font: "bold 12px system-ui",
              fillColor:   Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style:         Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -18),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000),
              show: isFirst,
            },
            description: `
              <div style="padding:12px;font-family:system-ui;background:#0f1117;color:#fff;border-radius:8px;min-width:200px">
                <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#22c55e">${o.commonName || o.speciesName}</p>
                <p style="margin:0 0 4px;font-style:italic;color:#9ca3af;font-size:12px">${o.speciesName}</p>
                ${o.observer    ? `<p style="margin:4px 0;font-size:12px">👤 ${o.observer}</p>` : ""}
                ${o.observedAt  ? `<p style="margin:4px 0;font-size:12px">📅 ${new Date(o.observedAt).toLocaleDateString()}</p>` : ""}
                <p style="margin:4px 0;font-size:11px;color:#6b7280">${o.lat.toFixed(5)}°, ${o.lng.toFixed(5)}°</p>
                ${o.imageUrl    ? `<img src="${o.imageUrl}" style="width:100%;border-radius:6px;margin-top:8px">` : ""}
              </div>
            `,
          })
        })

        // Fly to observation — use flyToBoundingSphere to center exactly on the pin (fixes north offset)
        const center = Cesium.Cartesian3.fromDegrees(obs.lng, obs.lat, 0)
        const sphere = new Cesium.BoundingSphere(center, 100)
        await viewer.camera.flyToBoundingSphere(sphere, {
          duration: 1.5,
          offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), 1500),
        })

        // Auto-select the first/clicked observation so its picture and details are shown (like icon was tapped)
        const firstEntity = viewer.entities.getById(`obs-${obs.id}`)
        if (firstEntity) viewer.selectedEntity = firstEntity

        if (destroyed) return
        setCesiumOk(true)
        setLoadingMsg("")
      } catch (err) {
        if (!destroyed) {
          setCesiumError((err as Error).message || "Failed to load globe")
          setLoadingMsg("")
        }
      }
    }

    void init()

    return () => {
      destroyed = true
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
      setCesiumOk(false)
    }
  // Re-run only when the first observation ID changes (obs arrives or changes)
  }, [mounted, obs?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── When more observations stream in, add their pins ─────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = (window as any).Cesium
    if (!viewer || !Cesium || !cesiumOk || obsArray.length <= 1) return

    obsArray.forEach((o, i) => {
      if (!o.lat || !o.lng) return
      if (viewer.entities.getById(`obs-${o.id}`)) return  // already added

      viewer.entities.add({
        id: `obs-${o.id}`,
        position: Cesium.Cartesian3.fromDegrees(o.lng, o.lat, 50),
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromCssColorString("#0ea5e9"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        description: `
          <div style="padding:12px;font-family:system-ui;background:#0f1117;color:#fff;border-radius:8px">
            <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#22c55e">${o.commonName || o.speciesName}</p>
            <p style="margin:4px 0;font-size:11px;color:#6b7280">${o.lat.toFixed(5)}°, ${o.lng.toFixed(5)}°</p>
          </div>
        `,
      })
    })
  }, [cesiumOk, obsArray.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera controls (kept stable with ref) ────────────────────────────────
  const flyToSelected = useCallback((altitude = 1500) => {
    const viewer = viewerRef.current
    const Cesium = (window as any).Cesium
    if (!viewer || !Cesium || !obs) return
    const center = Cesium.Cartesian3.fromDegrees(obs.lng, obs.lat, 0)
    const sphere = new Cesium.BoundingSphere(center, 50)
    viewer.camera.flyToBoundingSphere(sphere, {
      duration: 1,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), altitude),
    })
    const entity = viewer.entities.getById(`obs-${obs.id}`)
    if (entity) viewer.selectedEntity = entity
  }, [obs?.id, obs?.lat, obs?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const openInEarthSimulator = useCallback(() => {
    if (!obs) return
    window.open(
      `/(dashboard)/earth-simulator/earth2-rtx?lat=${obs.lat}&lng=${obs.lng}&species=${encodeURIComponent(obs.speciesName)}`,
      "_blank"
    )
  }, [obs?.lat, obs?.lng, obs?.speciesName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-widget navigation
  const goToSpecies   = useCallback(() => { if (obs?.speciesName) ctx.emit("navigate-to-species", { name: obs.speciesName }) }, [ctx, obs?.speciesName])
  const goToChemistry = useCallback(() => { if (obs?.speciesName) { ctx.setQuery(obs.speciesName); ctx.emit("navigate-to-species", { name: obs.speciesName }) } }, [ctx, obs?.speciesName])
  const goToGenetics  = useCallback(() => { if (obs?.speciesName) ctx.emit("navigate-to-species", { name: obs.speciesName }) }, [ctx, obs?.speciesName])

  // ── SSR guard — ONLY early-return, all hooks above ────────────────────────
  if (!mounted) return null

  const waitingForObs = obsArray.length === 0 && observationsLoading
  const noObs         = obsArray.length === 0 && !observationsLoading

  const dateStr = obs?.observedAt
    ? new Date(obs.observedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null

  const modal = (
    <AnimatePresence>
      <motion.div
        key="earth-portal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          key="earth-panel"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 28, stiffness: 340 }}
          className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-[#060d1a] overflow-hidden shadow-2xl"
          style={{ height: "min(90vh, 720px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-[#060d1a]/95 to-transparent">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-500/15 rounded-lg">
                <Globe className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  {title || obs?.commonName || obs?.speciesName || "Earth Observation"}
                </h2>
                <p className="text-[10px] text-teal-300 font-mono">
                  {waitingForObs
                    ? "Searching iNaturalist for field observations…"
                    : obs
                      ? `Earth Simulator · ${obs.lat.toFixed(5)}°, ${obs.lng.toFixed(5)}°${obsArray.length > 1 ? ` · sighting ${selIdx + 1}/${obsArray.length}` : ""}`
                      : "No geotagged observations found"
                  }
                </p>
              </div>
              {obs?.isToxic && (
                <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">⚠️ Toxic</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost" size="sm"
                className="h-7 text-[10px] text-teal-400 hover:bg-teal-500/10 gap-1"
                onClick={openInEarthSimulator}
                disabled={!obs}
              >
                <ExternalLink className="h-3 w-3" /> Full App
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Globe area ───────────────────────────────────────────────── */}
          <div className="absolute inset-0">
            {/* Overlay: loading / waiting / no results */}
            {(loadingMsg || cesiumError || waitingForObs || noObs) && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#060d1a] gap-4">
                {cesiumError ? (
                  <>
                    <Globe className="h-10 w-10 text-red-400 opacity-60" />
                    <p className="text-sm text-red-400">{cesiumError}</p>
                    <p className="text-xs text-muted-foreground">Check network — satellite imagery needs internet</p>
                  </>
                ) : noObs ? (
                  <>
                    <Globe className="h-10 w-10 text-teal-400/40" />
                    <p className="text-sm text-teal-300">No geotagged observations found</p>
                    <p className="text-xs text-muted-foreground">iNaturalist has no field sightings with GPS for this species</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                    <p className="text-sm text-teal-300">
                      {waitingForObs ? "Searching iNaturalist for field observations…" : loadingMsg}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {waitingForObs ? "Globe will appear as soon as sightings are found" : "Satellite imagery from ESRI World Imagery"}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Cesium canvas — always in DOM so init can attach */}
            <div
              ref={containerRef}
              className="w-full h-full"
              style={{ background: "#060d1a" }}
            />
          </div>

          {/* ── Camera controls ──────────────────────────────────────────── */}
          {cesiumOk && obs && (
            <div className="absolute right-4 top-14 z-20 flex flex-col gap-1.5">
              {[
                { icon: ZoomIn,    label: "Zoom in",     fn: () => flyToSelected(2000)  },
                { icon: ZoomOut,   label: "Zoom out",    fn: () => flyToSelected(25000) },
                { icon: RotateCcw, label: "Reset view",  fn: () => flyToSelected(8000)  },
                { icon: Navigation,label: "Street level",fn: () => flyToSelected(500)   },
              ].map(({ icon: Icon, label, fn }) => (
                <button
                  key={label}
                  onClick={fn}
                  title={label}
                  className="w-8 h-8 rounded-lg bg-black/70 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          {/* ── Multi-observation navigator ───────────────────────────────── */}
          {obsArray.length > 1 && cesiumOk && (
            <div className="absolute bottom-36 right-4 z-20 flex items-center gap-1.5 bg-black/70 rounded-lg px-2 py-1.5 border border-white/10">
              <button
                disabled={selIdx === 0}
                onClick={() => setSelIdx(i => i - 1)}
                className="text-white/60 hover:text-white disabled:opacity-30 px-1 text-xs"
              >◀</button>
              <span className="text-[10px] text-teal-300 font-mono min-w-[3.5rem] text-center">
                {selIdx + 1} / {obsArray.length}
              </span>
              <button
                disabled={selIdx === obsArray.length - 1}
                onClick={() => setSelIdx(i => i + 1)}
                className="text-white/60 hover:text-white disabled:opacity-30 px-1 text-xs"
              >▶</button>
            </div>
          )}

          {/* ── Observation details card ──────────────────────────────────── */}
          {cesiumOk && obs && (
            <div className="absolute bottom-4 left-4 z-20">
              <div className="rounded-xl border border-white/10 bg-[#060d1a]/92 backdrop-blur-md p-4 space-y-3 max-w-[270px]">
                <div className="flex items-start gap-3">
                  {obs.imageUrl ? (
                    <img
                      src={obs.imageUrl}
                      alt={obs.speciesName}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-teal-900/40 border border-teal-500/20 flex items-center justify-center text-2xl shrink-0">
                      🍄
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{obs.commonName || obs.speciesName}</p>
                    <p className="text-[10px] text-muted-foreground italic leading-tight">{obs.speciesName}</p>
                    <p className="text-[9px] text-teal-400/70 mt-0.5">
                      {obsArray.length} sighting{obsArray.length !== 1 ? "s" : ""} on map
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {obs.observer && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">Found by <span className="text-white">{obs.observer}</span></span>
                    </div>
                  )}
                  {dateStr && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{dateStr}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="font-mono text-[10px]">
                      {obs.lat.toFixed(5)}°, {obs.lng.toFixed(5)}°
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-white/6 space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Explore in search</p>
                  {[
                    { icon: Leaf,         label: "Species widget",  color: "text-green-400  hover:bg-green-500/10",  fn: goToSpecies   },
                    { icon: FlaskConical, label: "View compounds",  color: "text-purple-400 hover:bg-purple-500/10", fn: goToChemistry },
                    { icon: Dna,          label: "View genetics",   color: "text-blue-400   hover:bg-blue-500/10",   fn: goToGenetics  },
                  ].map(({ icon: Icon, label, color, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      className={cn("flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 transition-colors text-left w-full", color)}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      {label}
                      <ChevronRight className="h-3 w-3 ml-auto" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}

export default ObservationEarthPortal
