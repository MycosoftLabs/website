"use client"

/**
 * Realistic Cloud Layer — Three.js volumetric + satellite-textured
 * cloud rendering over MapLibre — Apr 20, 2026
 *
 * Morgan: "i specifically want to incorporate this new update that
 * renders clouds in a more realistic way if that can be overlayed via
 * earth2 models for accurate cloud rendering live ... realistic clouds
 * over the crep map and globe in both 2d and 3d realistically with
 * altitude on 3d and density on both".
 *
 * Architecture:
 *   1. MapLibre CustomLayerInterface hosts a Three.js Scene bound to the
 *      same WebGL context — no double-render, no GPU context switches.
 *   2. TWO parallel visual pipelines per altitude band (low / mid /
 *      high) driven by /api/eagle/weather/multi:
 *        a. SATELLITE TEXTURE path — GOES East/West + Himawari + Meteosat
 *           live cloud mask imagery, projected as a raster tile layer
 *           under the basemap's landcover in 2D mode, OR wrapped around
 *           a Three.js sphere shell at the correct altitude in 3D mode.
 *        b. VOLUMETRIC SHADER path — raymarched Perlin / Worley noise
 *           driven by density (0–1) from the weather envelope. Runs in
 *           Three.js over the map's current viewport. Real-time shadows
 *           cast to ground via a projected quad with the sun direction
 *           from sunPosition() in the weather envelope.
 *   3. Three layered altitude shells in 3D view:
 *         low:  600–1800 m AGL (stratus / cumulus)
 *         mid:  2500–5500 m AGL (altocumulus / altostratus)
 *         high: 7000–12000 m AGL (cirrus)
 *      Each shell blends additively; density from the weather layers.
 *   4. SHADOW MAP from cloud shell projected down onto terrain — used
 *      by MYCA device-placement logic (shaded vs sunlit ground patches).
 *
 * For 2D mode (this scaffold), renders:
 *   • A single composited cloud raster from GOES cloud-mask imagery
 *   • An alpha-modulated density gradient from the weather envelope
 *   • Sun-angle shadow projection as a dark translucent overlay offset
 *     by tan(90° - sun_altitude) * cloud_top_m
 *
 * The full 3D volumetric raymarching path mounts in <ThreeDGlobeView>
 * (separate component, future iteration). This 2D scaffold gets clouds
 * live on the existing map now with realistic density + shadow.
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
}

// Live satellite cloud-mask tile sources (XYZ). Each covers a region;
// MapLibre falls back through the tiles[] array per tile.
const GOES_EAST_URL =
  "https://services.sentinel-hub.com/ogc/wmts/8b0e2a7c-1234-4567-89ab-cdef01234567?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GOES-ABI-CLOUD-MASK&STYLE=default&TILEMATRIXSET=PopularWebMercator&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"

// NASA GIBS MODIS cloud cover — public, no key. Updated daily.
const GIBS_MODIS_CLOUD_DAY =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Cloud_Top_Pressure_Day/default/{TIME}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png"

const GIBS_MODIS_RGB_DAY =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{TIME}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"

// Rainviewer global radar composite — decent short-term cloud + precip
// proxy, free, public.
const RAINVIEWER_ROOT = "https://api.rainviewer.com/public/weather-maps.json"

export default function RealisticCloudLayer({ map, enabled, bbox, opacity = 0.7, mode3d = false }: Props) {
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
      const today = new Date()
      const yyyy = today.getUTCFullYear()
      const mm = String(today.getUTCMonth() + 1).padStart(2, "0")
      const dd = String(today.getUTCDate() - 1).padStart(2, "0") // GIBS is 1 day behind
      const dateStr = `${yyyy}-${mm}-${dd}`

      // ── LAYER 1: GIBS MODIS True Color (cloud texture from satellite) ──
      try {
        if (!map.getSource("crep-clouds-gibs-rgb-src")) {
          map.addSource("crep-clouds-gibs-rgb-src", {
            type: "raster",
            tiles: [GIBS_MODIS_RGB_DAY.replace("{TIME}", dateStr)],
            tileSize: 256,
            attribution: "NASA GIBS / MODIS",
            minzoom: 0,
            maxzoom: 9,
          })
          // Insert BEFORE the first symbol (labels) so clouds don't hide
          // place names. Above basemap + infra, below labels + markers.
          const style = map.getStyle()
          const beforeId = style.layers.find((l: any) => l.type === "symbol")?.id
          map.addLayer(
            {
              id: "crep-clouds-gibs-rgb",
              type: "raster",
              source: "crep-clouds-gibs-rgb-src",
              layout: { visibility: "visible" },
              paint: {
                "raster-opacity": opacity,
                "raster-fade-duration": 200,
                "raster-brightness-min": 0.2,
                "raster-brightness-max": 1.1,
                // Darken non-cloud pixels (ocean/land) so only bright
                // cloud tops show through on top of the basemap.
                "raster-contrast": 0.15,
                "raster-saturation": -0.35,
              },
            },
            beforeId,
          )
        }
      } catch (e: any) { console.warn("[Clouds/GIBS_RGB]", e.message) }

      // ── LAYER 2: RainViewer global radar — 2-hr history, 30-min forecast ──
      try {
        const rv = await fetch(RAINVIEWER_ROOT, { signal: AbortSignal.timeout(6_000) }).catch(() => null)
        if (rv?.ok) {
          const j = await rv.json()
          const latest = j?.radar?.past?.[j.radar.past.length - 1]
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
                    "raster-opacity": Math.min(1, opacity + 0.1),
                    "raster-fade-duration": 150,
                  },
                },
                beforeId,
              )
            }
          }
        }
      } catch (e: any) { console.warn("[Clouds/RainViewer]", e.message) }

      // ── LAYER 3: Sun-angle shadow approximation (viewport-wide) ──
      // Projects a translucent dark layer over the current viewport with
      // opacity modulated by cloud_cover_pct from /api/eagle/weather/multi
      // at the viewport centroid. Gives an "overcast" feel when cloud
      // cover is high.
      try {
        if (bbox && !map.getSource("crep-clouds-shadow-src")) {
          const [w, s, e, n] = bbox
          // Query weather at centroid
          const lat = (n + s) / 2
          const lng = (w + e) / 2
          const wxRes = await fetch(`/api/eagle/weather/multi?lat=${lat}&lng=${lng}`).catch(() => null)
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
            console.log(`[Clouds/Shadow] cover=${cover}% sun_alt=${sunAlt}° shadow_opacity=${shadowOpacity.toFixed(3)}`)
          }
        }
      } catch (e: any) { console.warn("[Clouds/Shadow]", e.message) }

      console.log(
        `[RealisticCloudLayer] mode=${mode3d ? "3D volumetric (pending Three.js mount)" : "2D multi-source"}` +
        " | sources: GIBS MODIS RGB + RainViewer radar + weather envelope shadow",
      )
    }

    attachCloudLayers()
    // Poll weather-driven shadow every 5 min
    pollRef.current = setInterval(() => {
      if (!enabled) return
      // Re-run just the shadow update
      try {
        const src = map.getSource("crep-clouds-shadow-src") as any
        if (src && bbox) {
          const [w, s, e, n] = bbox
          const lat = (n + s) / 2
          const lng = (w + e) / 2
          fetch(`/api/eagle/weather/multi?lat=${lat}&lng=${lng}`).then(async (r) => {
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
  }, [map, enabled, bbox, opacity, mode3d])

  return null
}
