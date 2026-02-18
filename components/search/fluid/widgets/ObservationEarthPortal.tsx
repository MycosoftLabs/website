/**
 * ObservationEarthPortal - Feb 2026
 *
 * A portal modal using the SAME CesiumJS globe as the Earth Simulator app
 * (real satellite imagery, full zoom/tilt like Google Earth).
 *
 * This is NOT a separate globe system — it loads CesiumJS from the same CDN,
 * uses the same imagery providers, and can share state with the Earth Simulator.
 *
 * When opened it:
 *   1. Loads/reuses the CesiumJS library (already cached if Earth Sim was visited)
 *   2. Creates a minimal Cesium Viewer focused on the observation location
 *   3. Flies the camera to lat/lng at a close zoom altitude
 *   4. Places glowing pins for all observation sites
 *   5. Shows a details card overlay with cross-widget links
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  X, MapPin, Globe, Calendar, User, Leaf, Dna, FlaskConical,
  ChevronRight, ExternalLink, Loader2, ZoomIn, ZoomOut, RotateCcw,
  Layers, Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LocationResult } from "./LocationWidget"
import { useSearchContext } from "@/components/search/SearchContextProvider"

// ─── Cesium loader — reuses the same script the Earth Simulator loads ─────────
async function loadCesiumJS(): Promise<any> {
  if ((window as any).Cesium) return (window as any).Cesium

  // Load CSS
  if (!document.querySelector('link[href*="cesium"]')) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/cesium@1.115.0/Build/Cesium/Widgets/widgets.css"
    document.head.appendChild(link)
  }

  // Load JS (same CDN as Earth Simulator)
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://unpkg.com/cesium@1.115.0/Build/Cesium/Cesium.js"
    script.onload = () => resolve()
    script.onerror = () => {
      // Fallback CDN
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

// ─── Main portal ──────────────────────────────────────────────────────────────

interface ObservationEarthPortalProps {
  observation?: LocationResult
  observations?: LocationResult[]
  title?: string
  onClose: () => void
}

export function ObservationEarthPortal({
  observation,
  observations: _observations,
  title,
  onClose,
}: ObservationEarthPortalProps) {
  const obsArray: LocationResult[] = _observations?.length
    ? _observations
    : observation
    ? [observation]
    : []

  // ── All hooks unconditionally (Rules of Hooks) ─────────────────────────────
  const [mounted,  setMounted]  = useState(false)
  const [selIdx,   setSelIdx]   = useState(0)
  const [cesiumOk, setCesiumOk] = useState(false)
  const [cesiumError, setCesiumError] = useState<string | null>(null)
  const [loadingMsg, setLoadingMsg] = useState("Loading Earth Simulator…")
  const cesiumContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const ctx = useSearchContext()

  const obs = obsArray[Math.min(selIdx, Math.max(0, obsArray.length - 1))] ?? null

  // ── Mount + scroll lock ───────────────────────────────────────────────────
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    const orig = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handler)
      document.body.style.overflow = orig
    }
  }, [mounted, onClose])

  // ── Initialize Cesium viewer when container is ready ─────────────────────
  useEffect(() => {
    if (!mounted || !cesiumContainerRef.current || !obs) return

    let destroyed = false

    const init = async () => {
      try {
        setLoadingMsg("Loading satellite imagery…")
        const Cesium = await loadCesiumJS()
        if (destroyed) return

        // Disable Ion token warning
        Cesium.Ion.defaultAccessToken = undefined

        setLoadingMsg("Initialising globe…")

        const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
          baseLayerPicker:        false,
          imageryProvider:        false,
          vrButton:               false,
          geocoder:               false,
          homeButton:             false,
          infoBox:                true,
          sceneModePicker:        false,
          selectionIndicator:     false,
          timeline:               false,
          animation:              false,
          fullscreenButton:       false,
          navigationHelpButton:   false,
          shouldAnimate:          false,
          requestRenderMode:      true,
          maximumRenderTimeChange: Infinity,
          creditContainer: document.createElement("div"), // hide credit banner
        })

        viewerRef.current = viewer

        // ── Camera behaviour: pan on drag, double-click/tap to zoom ──────────
        // Disable rotation & tilt so dragging moves the geographic position
        const ctrl = viewer.scene.screenSpaceCameraController
        ctrl.enableRotate    = false  // no spinning the globe
        ctrl.enableTilt      = false  // no angle changes on drag
        ctrl.enableLook      = false  // no free-look
        ctrl.enableTranslate = true   // panning (moving position) stays on
        ctrl.enableZoom      = true   // scroll-wheel / pinch zoom stays on

        // Double-click/double-tap zooms in (×4)
        viewer.screenSpaceEventHandler.setInputAction(
          (event: any) => {
            if (!event.position) return
            const cartesian = viewer.scene.pickPosition(event.position)
            if (!cartesian) return
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                obs.lng,
                obs.lat,
                Math.max(200, viewer.camera.positionCartographic.height / 4)
              ),
              orientation: { heading: viewer.camera.heading, pitch: viewer.camera.pitch, roll: 0 },
              duration: 0.6,
            })
          },
          Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
        )

        // ── Add satellite imagery (same chain as Earth Simulator) ──────────
        try {
          const esri = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
          )
          viewer.imageryLayers.addImageryProvider(esri)
        } catch {
          // Fallback to NaturalEarth
          const ne = await Cesium.TileMapServiceImageryProvider.fromUrl(
            Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
          )
          viewer.imageryLayers.addImageryProvider(ne)
        }

        if (destroyed) { viewer.destroy(); return }

        // ── Add observation pins ───────────────────────────────────────────
        obsArray.forEach((o, i) => {
          if (!o.lat || !o.lng) return
          const isSelected = i === selIdx
          const color = isSelected
            ? Cesium.Color.fromCssColorString("#22c55e")
            : Cesium.Color.fromCssColorString("#0ea5e9")

          viewer.entities.add({
            id: `obs-${o.id}`,
            position: Cesium.Cartesian3.fromDegrees(o.lng, o.lat, 50),
            point: {
              pixelSize: isSelected ? 14 : 9,
              color,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            label: {
              text: o.commonName || o.speciesName,
              font: "bold 12px system-ui",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -18),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000),
              show: isSelected,
            },
            description: `
              <div style="padding:12px;font-family:system-ui;background:#0f1117;color:#fff;border-radius:8px;min-width:200px">
                <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#22c55e">
                  ${o.commonName || o.speciesName}
                </p>
                <p style="margin:0 0 4px;font-style:italic;color:#9ca3af;font-size:12px">
                  ${o.speciesName}
                </p>
                ${o.observer ? `<p style="margin:4px 0;font-size:12px">👤 ${o.observer}</p>` : ""}
                ${o.observedAt ? `<p style="margin:4px 0;font-size:12px">📅 ${new Date(o.observedAt).toLocaleDateString()}</p>` : ""}
                <p style="margin:4px 0;font-size:11px;color:#6b7280">
                  ${o.lat.toFixed(5)}°, ${o.lng.toFixed(5)}°
                </p>
                ${o.imageUrl ? `<img src="${o.imageUrl}" style="width:100%;border-radius:6px;margin-top:8px">` : ""}
              </div>
            `,
          })
        })

        // ── Fly camera to the selected observation ─────────────────────────
        await viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            obs.lng,
            obs.lat,
            8000  // ~8 km altitude — you can see the landscape clearly
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch:   Cesium.Math.toRadians(-35), // slight tilt like Google Earth
            roll:    0,
          },
          duration: 2,
        })

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
    }
  }, [mounted, obs?.id, obs?.lat, obs?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cross-widget navigation ───────────────────────────────────────────────
  const goToSpecies = useCallback(() => {
    const name = obs?.speciesName
    if (name) ctx.emit("navigate-to-species", { name })
  }, [ctx, obs?.speciesName])

  const goToChemistry = useCallback(() => {
    const name = obs?.speciesName
    if (name) { ctx.setQuery(name); ctx.emit("navigate-to-species", { name }) }
  }, [ctx, obs?.speciesName])

  const goToGenetics = useCallback(() => {
    const name = obs?.speciesName
    if (name) ctx.emit("navigate-to-species", { name })
  }, [ctx, obs?.speciesName])

  // ── Cesium camera controls ─────────────────────────────────────────────────
  const flyToSelected = useCallback((altitude = 8000) => {
    const viewer = viewerRef.current
    if (!viewer || !obs) return
    const Cesium = (window as any).Cesium
    if (!Cesium) return
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(obs.lng, obs.lat, altitude),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-35), roll: 0 },
      duration: 1,
    })
  }, [obs])

  const openInEarthSimulator = useCallback(() => {
    if (!obs) return
    window.open(`/(dashboard)/earth-simulator/earth2-rtx?lat=${obs.lat}&lng=${obs.lng}&species=${encodeURIComponent(obs.speciesName)}`, "_blank")
  }, [obs])

  // ── Guard: all hooks above this line ─────────────────────────────────────
  if (!mounted || !obs) return null

  const dateStr = obs.observedAt
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
                  {title || obs.commonName || obs.speciesName}
                </h2>
                <p className="text-[10px] text-teal-300 font-mono">
                  Earth Simulator · {obs.lat.toFixed(5)}°, {obs.lng.toFixed(5)}°
                  {obsArray.length > 1 && (
                    <span className="ml-2 text-teal-400/60">
                      observation {selIdx + 1}/{obsArray.length}
                    </span>
                  )}
                </p>
              </div>
              {obs.isToxic && (
                <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
                  ⚠️ Toxic
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-teal-400 hover:bg-teal-500/10 gap-1"
                onClick={openInEarthSimulator}
                title="Open full Earth Simulator"
              >
                <ExternalLink className="h-3 w-3" />
                Full App
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Cesium Globe ─────────────────────────────────────────────── */}
          <div className="absolute inset-0">
            {/* Loading / error overlay */}
            {(loadingMsg || cesiumError) && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#060d1a] gap-4">
                {cesiumError ? (
                  <>
                    <Globe className="h-10 w-10 text-red-400 opacity-60" />
                    <p className="text-sm text-red-400">{cesiumError}</p>
                    <p className="text-xs text-muted-foreground">
                      Check network connection — satellite imagery requires internet access
                    </p>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                    <p className="text-sm text-teal-300">{loadingMsg}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Using same Earth Simulator satellite imagery
                    </p>
                  </>
                )}
              </div>
            )}
            {/* The Cesium canvas — same as Earth Simulator */}
            <div
              ref={cesiumContainerRef}
              className="w-full h-full"
              style={{ background: "#060d1a" }}
            />
          </div>

          {/* ── Camera controls ──────────────────────────────────────────── */}
          {cesiumOk && (
            <div className="absolute right-4 top-14 z-20 flex flex-col gap-1.5">
              {[
                { icon: ZoomIn,    label: "Zoom in",    fn: () => flyToSelected(2000) },
                { icon: ZoomOut,   label: "Zoom out",   fn: () => flyToSelected(25000) },
                { icon: RotateCcw, label: "Reset view", fn: () => flyToSelected(8000) },
                { icon: Navigation, label: "Street level", fn: () => flyToSelected(500) },
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
          {cesiumOk && (
            <div className="absolute bottom-4 left-4 z-20 w-68">
              <div className="rounded-xl border border-white/10 bg-[#060d1a]/92 backdrop-blur-md p-4 space-y-3 max-w-[270px]">
                {/* Photo + name */}
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
                  </div>
                </div>

                {/* Meta */}
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

                {/* Cross-widget links */}
                <div className="pt-1.5 border-t border-white/6 space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Explore in search</p>
                  {[
                    { icon: Leaf,        label: "Species widget",  color: "text-green-400  hover:bg-green-500/10",  fn: goToSpecies },
                    { icon: FlaskConical, label: "View compounds",  color: "text-purple-400 hover:bg-purple-500/10", fn: goToChemistry },
                    { icon: Dna,         label: "View genetics",   color: "text-blue-400   hover:bg-blue-500/10",   fn: goToGenetics },
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
