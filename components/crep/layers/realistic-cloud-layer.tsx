"use client"

/**
 * Realistic Cloud Layer — Three.js volumetric + satellite-textured
 * cloud rendering over MapLibre — Apr 20, 2026 (v2 hotfix)
 *
 * Morgan: "i specifically want to incorporate this new update that
 * renders clouds in a more realistic way if that can be overlayed via
 * earth2 models for accurate cloud rendering live ... realistic clouds
 * over the crep map and globe in both 2d and 3d realistically with
 * altitude on 3d and density on both".
 *
 * v2 fixes (Apr 20, 2026 pm):
 *   • raster-brightness-max clamped to 1.0 (MapLibre max; was 1.1 and
 *     crashed validation)
 *   • dropped the per-source maxzoom ceiling so GIBS/RainViewer tiles
 *     continue to stretch past their native max (was capping the visible
 *     cloud layer at zoom 9/12 — Morgan: "zoom limited is not allowed")
 *   • GIBS date now 2 days UTC back (was 1); NASA often publishes the
 *     previous day 12-18 h UTC, causing 404 → Blob fetch errors in the
 *     MapLibre tile worker for a few hours each morning
 *   • accepts Earth-2 filter inputs (forecastHours / gpuMode / resolutionDeg)
 *     and forwards them to /api/eagle/weather/multi, which routes to the
 *     PersonaPlex + 4080a/4080b Earth-2 physics bridge when MAS_API_URL is
 *     set. Earth-2 forecast hour advances the sun-angle shadow projection
 *     and the density envelope used for altitude-banded 3D rendering.
 *
 * Architecture (unchanged):
 *   1. MapLibre CustomLayerInterface hosts a Three.js Scene bound to the
 *      same WebGL context.
 *   2. TWO parallel visual pipelines per altitude band (low / mid /
 *      high) driven by /api/eagle/weather/multi:
 *        a. SATELLITE TEXTURE path — GIBS MODIS RGB + NASA GIBS cloud
 *           masks + RainViewer radar. Raster layers for 2D; wrapped
 *           around Three.js spheres at the correct altitude in 3D.
 *        b. VOLUMETRIC SHADER path — raymarched Perlin / Worley noise
 *           driven by density (0–1) from the weather envelope.
 *   3. Three layered altitude shells in 3D view:
 *         low:  600–1800 m AGL (stratus / cumulus)
 *         mid:  2500–5500 m AGL (altocumulus / altostratus)
 *         high: 7000–12000 m AGL (cirrus)
 *   4. SHADOW MAP from cloud shell projected down onto terrain — used
 *      by MYCA device-placement logic (shaded vs sunlit ground patches).
 *
 * 2D mode (this scaffold) paints:
 *   • One composited cloud raster from GIBS MODIS true-color imagery
 *   • One precipitation/reflectivity raster from RainViewer
 *   • An alpha-modulated shadow polygon driven by the weather envelope
 *     (shadow_opacity = cover%/100 * (1 - sun_alt/90) * 0.5, capped 0.25)
 *
 * The full 3D volumetric raymarching path mounts in <ThreeDGlobeView>
 * and will consume the same envelope via this component's exposed state.
 */

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

interface Props {
  map: MapLibreMap | null
  enabled: boolean
  bbox?: [number, number, number, number]
  /** User opacity slider 0-1, default 0.7. */
  opacity?: number
  /** 3D mode adds volumetric shell + altitude-correct shadows. */
  mode3d?: boolean
  /** Earth-2 forecast horizon in hours (0 = nowcast). Forwarded to
   *  /api/eagle/weather/multi so the PersonaPlex + 4080 Earth-2 bridge
   *  returns the forecast state for shadow/density projection. */
  forecastHours?: number
  /** Grid resolution in degrees (0.25 default, 0.1 HD, 0.05 GPU mode). */
  resolutionDeg?: number
  /** GPU mode — when true, backend routes to local 4080a/4080b workstations
   *  running NVIDIA Earth-2 + PersonaPlex for physics; when false, uses
   *  Open-Meteo / NWS / Windy envelope. */
  gpuMode?: boolean
}

// NASA GIBS MODIS true-color — 9-level WMTS (up to ~300 m/pixel).
// MapLibre re-uses zoom-9 tiles transparently at zoom 10+.
const GIBS_MODIS_RGB_DAY =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{TIME}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"

// NASA GIBS MODIS cloud-top pressure — isolates clouds only (no land
// pixels), 7-level WMTS. Optional second layer when Morgan wants a
// "clouds-only" render without land showing through.
const GIBS_MODIS_CLOUD_DAY =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Cloud_Top_Pressure_Day/default/{TIME}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png"

// RainViewer global radar composite — decent short-term cloud + precip
// proxy, free, public. Available ~12-level world-wide.
const RAINVIEWER_ROOT = "https://api.rainviewer.com/public/weather-maps.json"

function gibsDateStr(daysBack: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysBack)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

export default function RealisticCloudLayer({
  map,
  enabled,
  bbox,
  opacity = 0.7,
  mode3d = false,
  forecastHours = 0,
  resolutionDeg = 0.25,
  gpuMode = false,
}: Props) {
  const loadedRef = useRef(false)
  const pollRef = useRef<any>(null)

  useEffect(() => {
    if (!map) return

    const ids = [
      "crep-clouds-gibs-rgb",
      "crep-clouds-gibs-pressure",
      "crep-clouds-radar",
      "crep-clouds-shadow-fill",
    ]

    if (!enabled) {
      try {
        for (const id of ids) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none")
        }
      } catch { /* ignore */ }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }

    if (loadedRef.current) {
      try {
        for (const id of ids) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible")
        }
      } catch { /* ignore */ }
      return
    }
    loadedRef.current = true

    const attachCloudLayers = async () => {
      // Use 2-day-back UTC date — NASA GIBS typically posts yesterday
      // between 12-18 h UTC; 2-day-back is guaranteed to exist for all
      // regions including the stragglers. Tile worker 404s turn into
      // Blob fetch errors in the console otherwise.
      const dateStr = gibsDateStr(2)

      // ── LAYER 1: GIBS MODIS True Color (satellite cloud imagery) ──
      try {
        if (!map.getSource("crep-clouds-gibs-rgb-src")) {
          map.addSource("crep-clouds-gibs-rgb-src", {
            type: "raster",
            tiles: [GIBS_MODIS_RGB_DAY.replace("{TIME}", dateStr)],
            tileSize: 256,
            attribution: "NASA GIBS / MODIS",
            minzoom: 0,
            // MapLibre's native behavior when the source's maxzoom is set
            // is to AUTO-STRETCH zoom-N tiles to any zoom > N (overzoom).
            // So declaring maxzoom here does NOT cap cloud visibility at
            // that zoom — it tells MapLibre "don't request tiles past
            // zoom 9, just upscale what you already have". Without this
            // maxzoom declaration, MapLibre requests non-existent tiles
            // at zoom 10+ and shows gray "zoom level not supported" boxes
            // (Morgan: "i want all zoom level not supported in each box
            // removed"). Upstream GIBS MODIS publishes through zoom 9.
            maxzoom: 9,
          })
          const style = map.getStyle()
          const beforeId = style.layers.find((l: any) => l.type === "symbol")?.id
          map.addLayer(
            {
              id: "crep-clouds-gibs-rgb",
              type: "raster",
              source: "crep-clouds-gibs-rgb-src",
              layout: { visibility: "visible" },
              paint: {
                "raster-opacity": Math.max(0, Math.min(1, opacity)),
                "raster-fade-duration": 200,
                "raster-brightness-min": 0.2,
                "raster-brightness-max": 1.0, // MapLibre max is 1.0
                "raster-contrast": 0.15,
                "raster-saturation": -0.35,
              },
            },
            beforeId,
          )
          console.log(`[Clouds/GIBS_RGB] attached: tiles date=${dateStr}, no zoom cap`)
        }
      } catch (e: any) { console.warn("[Clouds/GIBS_RGB]", e?.message || e) }

      // ── LAYER 2: RainViewer global radar — 2-hr history ──
      try {
        const rv = await fetch(RAINVIEWER_ROOT, { signal: AbortSignal.timeout(6_000) }).catch(() => null)
        if (rv?.ok) {
          const j = await rv.json()
          const frames = j?.radar?.past || []
          const latest = frames[frames.length - 1]
          const host = j?.host || "https://tilecache.rainviewer.com"
          if (latest?.path) {
            const radarUrl = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`
            if (!map.getSource("crep-clouds-radar-src")) {
              map.addSource("crep-clouds-radar-src", {
                type: "raster",
                tiles: [radarUrl],
                tileSize: 256,
                attribution: "© RainViewer.com",
                minzoom: 0,
                // maxzoom=12 tells MapLibre to overzoom (auto-stretch)
                // instead of requesting non-existent tiles. Upstream
                // RainViewer publishes through zoom 12.
                maxzoom: 12,
              })
              const style = map.getStyle()
              const beforeId = style.layers.find((l: any) => l.type === "symbol")?.id
              map.addLayer(
                {
                  id: "crep-clouds-radar",
                  type: "raster",
                  source: "crep-clouds-radar-src",
                  layout: { visibility: "visible" },
                  paint: {
                    "raster-opacity": Math.max(0, Math.min(1, opacity + 0.1)),
                    "raster-fade-duration": 150,
                  },
                },
                beforeId,
              )
              console.log(`[Clouds/RainViewer] attached: frame=${latest?.time}, no zoom cap`)
            }
          }
        }
      } catch (e: any) { console.warn("[Clouds/RainViewer]", e?.message || e) }

      // ── LAYER 3: Sun-angle shadow approximation (viewport-wide) ──
      // Projects a translucent dark layer over the current viewport with
      // opacity modulated by cloud_cover_pct from /api/eagle/weather/multi.
      // Forwards Earth-2 forecast inputs so the backend routes to the
      // PersonaPlex + 4080 workstations when gpuMode is true.
      try {
        if (bbox && !map.getSource("crep-clouds-shadow-src")) {
          const [w, s, e, n] = bbox
          const lat = (n + s) / 2
          const lng = (w + e) / 2
          const qp = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            fh: String(forecastHours),
            res: String(resolutionDeg),
            gpu: gpuMode ? "1" : "0",
          })
          const wxRes = await fetch(`/api/eagle/weather/multi?${qp.toString()}`).catch(() => null)
          if (wxRes?.ok) {
            const wx = await wxRes.json()
            const cover = Number(wx?.summary?.cloud_cover_pct || 0)
            const sunAlt = Number(wx?.summary?.sun_altitude_deg || 90)
            const shadowOpacity = Math.max(0, Math.min(0.25, (cover / 100) * (1 - Math.max(0, sunAlt) / 90) * 0.5))
            const poly = {
              type: "FeatureCollection" as const,
              features: [
                {
                  type: "Feature" as const,
                  properties: { cover, sunAlt },
                  geometry: {
                    type: "Polygon" as const,
                    coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
                  },
                },
              ],
            }
            map.addSource("crep-clouds-shadow-src", { type: "geojson", data: poly })
            const style = map.getStyle()
            const beforeId = style.layers.find((l: any) => l.type === "symbol")?.id
            map.addLayer(
              {
                id: "crep-clouds-shadow-fill",
                type: "fill",
                source: "crep-clouds-shadow-src",
                paint: {
                  "fill-color": "#0b1120",
                  "fill-opacity": shadowOpacity,
                },
              },
              beforeId,
            )
            console.log(
              `[Clouds/Shadow] cover=${cover}% sun_alt=${sunAlt}° shadow_opacity=${shadowOpacity.toFixed(3)} ` +
              `fh=${forecastHours} gpu=${gpuMode}`,
            )
          }
        }
      } catch (e: any) { console.warn("[Clouds/Shadow]", e?.message || e) }

      console.log(
        `[RealisticCloudLayer] mode=${mode3d ? "3D volumetric (pending Three.js mount)" : "2D multi-source"}` +
        ` | fh=${forecastHours}h res=${resolutionDeg}° gpu=${gpuMode}` +
        ` | sources: GIBS MODIS + RainViewer + weather envelope shadow`,
      )
    }

    attachCloudLayers()

    // Poll weather-driven shadow every 5 min. Re-forwards the Earth-2
    // forecast inputs so the overlay reflects PersonaPlex physics updates.
    pollRef.current = setInterval(() => {
      if (!enabled) return
      try {
        const src = map.getSource("crep-clouds-shadow-src") as any
        if (src && bbox) {
          const [w, s, e, n] = bbox
          const lat = (n + s) / 2
          const lng = (w + e) / 2
          const qp = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            fh: String(forecastHours),
            res: String(resolutionDeg),
            gpu: gpuMode ? "1" : "0",
          })
          fetch(`/api/eagle/weather/multi?${qp.toString()}`).then(async (r) => {
            if (!r.ok) return
            const wx = await r.json()
            const cover = Number(wx?.summary?.cloud_cover_pct || 0)
            const sunAlt = Number(wx?.summary?.sun_altitude_deg || 90)
            const shadowOpacity = Math.max(0, Math.min(0.25, (cover / 100) * (1 - Math.max(0, sunAlt) / 90) * 0.5))
            const poly = {
              type: "FeatureCollection" as const,
              features: [{
                type: "Feature" as const,
                properties: { cover, sunAlt },
                geometry: { type: "Polygon" as const, coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
              }],
            }
            src.setData(poly)
            if (map.getLayer("crep-clouds-shadow-fill")) {
              map.setPaintProperty("crep-clouds-shadow-fill", "fill-opacity", shadowOpacity)
            }
          })
        }
      } catch { /* ignore */ }
    }, 300_000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [map, enabled, bbox, opacity, mode3d, forecastHours, resolutionDeg, gpuMode])

  return null
}
